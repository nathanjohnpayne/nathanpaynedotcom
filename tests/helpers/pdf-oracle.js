import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Thin orchestration around two mature PDF implementations — Poppler and
 * MuPDF — used as independent oracles by the résumé PDF tests.
 *
 * ## Why external tools, and which one for what
 *
 * The regression these tests guard (#923) is that Chromium writes each printed
 * page's text into the PDF in PAINT order, so a CSS rule that changes paint
 * order silently reorders the document for everything that reads the file
 * rather than looks at it — ATS parsers, assistive tech, copy-paste — while
 * every pixel stays identical.
 *
 * That rules out the two obvious oracles and dictates the third:
 *
 * - Ordinary text extraction reconstructs reading order from glyph
 *   COORDINATES, so it reports the visual order and hides the defect. Poppler
 *   in its default mode does exactly that, and passes on the broken file.
 * - Page-image comparison likewise passes, because the pages are identical.
 * - `pdftotext -raw` emits text in CONTENT-STREAM order, which is the thing
 *   under test. It is the oracle for #923.
 *
 * The second regression (#925) is the opposite shape — the bullet markers were
 * present in the file but painted white, so they were invisible on paper.
 * That one is about rendered output, so MuPDF renders the pages and the test
 * looks for ink where a marker belongs.
 *
 * An earlier revision of this file decoded the PDF itself: object indexing,
 * stream inflation, page-tree traversal, `/ToUnicode` CMaps, one- and two-byte
 * font codes, `bfchar`/`bfrange`, graphics state, marked-content
 * `/ActualText`, inline images. It reached 677 lines and eleven rounds of
 * review, most of them finding new ways for it to be quietly wrong about
 * content. Owning a Chromium-specific partial PDF implementation to enforce
 * one invariant was the wrong trade; this module shells out instead.
 *
 * Application-specific normalization stays here. PDF parsing does not.
 */

/** Tools this module shells out to, and what each is the oracle for. */
const TOOLS = {
  pdftotext: 'Poppler — content-stream-order text extraction (#923)',
  pdfinfo: 'Poppler — page count',
  mutool: 'MuPDF — page rendering for marker visibility (#925)',
};

/**
 * Run a tool, failing with a diagnostic that names the missing binary rather
 * than an ENOENT — and never skipping the test, which would quietly drop the
 * coverage these assertions exist to provide.
 *
 * @param {keyof TOOLS} tool
 * @param {string[]} args
 * @param {{ encoding?: 'utf-8' | 'buffer' }} [options]
 * @returns {string}
 */
function run(tool, args, options = {}) {
  try {
    return execFileSync(tool, args, {
      encoding: options.encoding ?? 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        `${tool} is not installed, and the résumé PDF tests need it (${TOOLS[tool]}).\n` +
          `  macOS: brew install poppler mupdf-tools\n` +
          `  Debian/Ubuntu: apt-get install -y poppler-utils mupdf-tools\n` +
          `See docs/agents/testing-requirements.md § PDF test dependencies.`,
        { cause: error },
      );
    }
    throw error;
  }
}

/**
 * The PDF's text in **content-stream order** — the order it was written, not
 * the order it is read off the page.
 *
 * `-raw` is the whole point: without it Poppler sorts by position and the
 * ordering defect disappears.
 *
 * @param {string} pdfPath
 * @returns {string}
 */
export function pdfTextInEmissionOrder(pdfPath) {
  return run('pdftotext', ['-raw', pdfPath, '-']);
}

/**
 * @param {string} pdfPath
 * @returns {number}
 */
export function pdfPageCount(pdfPath) {
  const pages = run('pdfinfo', [pdfPath]).match(/^Pages:\s+(\d+)$/m);
  if (!pages) throw new Error(`pdfinfo reported no page count for ${pdfPath}`);
  return Number(pages[1]);
}

/** Render DPI. Fixed so the geometry below is stable. */
const DPI = 150;

/**
 * Bullet-marker geometry, derived from the two values the print stylesheet
 * pins rather than from measured pixel positions:
 *
 * - the page margin, `@page { margin: 0.6in }` (and `RESUME_PDF_MARGIN`);
 * - `--bullet-size: 0.36rem` = 5.76 CSS px, and CSS px are ¾ of a PDF point.
 *
 * The marker is pulled fully into the gutter by a negative left margin, so it
 * starts at the page margin — which is also where non-bullet text starts. That
 * is why the check below looks for SOLID ink rather than any ink: a glyph stem
 * is a stroke a pixel or two wide, a marker is a filled square.
 */
const MARKER_X = Math.round(0.6 * DPI);
const MARKER_SIZE = Math.round(((0.36 * 16 * 0.75) / 72) * DPI);

/**
 * Parse a binary PGM (`P5`) into `{ width, height, pixel(x, y) }`.
 *
 * MuPDF writes this directly, which is why the tests need no image library:
 * the format is a three-token ASCII header followed by one byte per pixel.
 *
 * @param {Buffer} buf
 */
function readPgm(buf) {
  const header = /^P5\s+(\d+)\s+(\d+)\s+(\d+)\s/.exec(buf.subarray(0, 64).toString('latin1'));
  if (!header) throw new Error('mutool did not produce a binary PGM');
  const [width, height, max] = [Number(header[1]), Number(header[2]), Number(header[3])];
  if (max !== 255) throw new Error(`unexpected PGM max value ${max}`);
  const offset = header[0].length;
  return { width, height, pixel: (x, y) => buf[offset + y * width + x] };
}

/**
 * How many bullet markers are actually **visible** on each rendered page.
 *
 * Counts solid-ink squares in the marker column: rows where the whole column
 * is dark, grouped into runs, keeping runs about as tall as the marker is
 * wide. A white marker — #925, where `printBackground: false` painted the
 * rectangles in white — contributes nothing, which is the point.
 *
 * @param {string} pdfPath
 * @returns {number[]} visible markers, one entry per page
 */
export function visibleMarkersPerPage(pdfPath) {
  const dir = mkdtempSync(join(tmpdir(), 'resume-pdf-'));
  try {
    run('mutool', [
      'draw',
      '-q',
      '-r',
      String(DPI),
      '-F',
      'pgm',
      '-o',
      join(dir, 'p%d.pgm'),
      pdfPath,
    ]);
    return readdirSync(dir)
      .filter((f) => f.endsWith('.pgm'))
      .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]))
      .map((file) => {
        const page = readPgm(readFileSync(join(dir, file)));
        // Inset by a pixel so antialiasing at the marker's edge cannot decide
        // the answer either way.
        const from = MARKER_X + 1;
        const to = MARKER_X + MARKER_SIZE - 1;
        const solidRows = [];
        for (let y = 0; y < page.height; y += 1) {
          let solid = true;
          for (let x = from; x < to && solid; x += 1) solid = page.pixel(x, y) < 100;
          if (solid) solidRows.push(y);
        }
        let markers = 0;
        let run = 0;
        for (let i = 0; i < solidRows.length; i += 1) {
          run = i > 0 && solidRows[i] === solidRows[i - 1] + 1 ? run + 1 : 1;
          // Count the run once, when it first gets tall enough to be a marker
          // rather than a stroke.
          if (run === MARKER_SIZE - 4) markers += 1;
        }
        return markers;
      });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Strip everything that only affects appearance, so an order comparison is
 * about order.
 *
 * Whitespace goes entirely: `-raw` reflects the emitted runs, so the same
 * sentence can extract with or without its spaces depending on whether it is
 * set in bold. Quotes and dashes fold to ASCII so an expected string can be
 * written in plain characters.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeForOrder(text) {
  return text
    .replace(/[‘’‚‛ʻʼʽ′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/\s+/g, '');
}
