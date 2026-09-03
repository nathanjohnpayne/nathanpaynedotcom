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

/** CSS pixels → rendered device pixels. CSS px are ¾ of a PDF point. */
const devicePx = (css) => Math.round(((css * 0.75) / 72) * DPI);

/**
 * Marker-column geometry, derived from the values the print stylesheet pins
 * rather than from measured pixel positions:
 *
 * - the page margin, `@page { margin: 0.6in }` (and `RESUME_PDF_MARGIN`);
 * - `--bullet-size: 0.36rem` = 5.76 CSS px;
 * - `.state-marker::before` = `0.72em` of the 7.5pt (10 CSS px) status kicker,
 *   plus its 1px border on each side. The border adds to the box because the
 *   `box-sizing: border-box` reset selects `*`, which does not match a
 *   pseudo-element.
 *
 * The bullet marker is pulled fully into the gutter by a negative left margin,
 * so it starts at the page margin — which is also where non-bullet text starts,
 * and where the lifecycle kicker's own mark starts. That is why the checks
 * below look for SOLID ink rather than any ink: a glyph stem is a stroke a
 * pixel or two wide, both marks are filled or bordered squares.
 *
 * **Two populations now share this column** (#944), and they are separated by
 * size: 9 device px for a bullet against 14 for a lifecycle mark. Measured on
 * the built file, bullets render 7–10 px tall and lifecycle marks 15–16, so
 * classifying each run by whichever nominal height it is nearer has about five
 * pixels of clearance on both sides. Before #944 this file had one population
 * and no bound, and an unbounded count silently reported 15 bullets for 11.
 */
const MARKER_X = Math.round(0.6 * DPI);
const MARKER_SIZE = devicePx(0.36 * 16);
const STATUS_MARK_SIZE = devicePx(0.72 * 10 + 2);

/** Runs at or above this height are lifecycle marks, below it are bullets. */
const MARK_SPLIT = (MARKER_SIZE + STATUS_MARK_SIZE) / 2;

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
 * Render every page to a greyscale bitmap and hand each one to `perPage`.
 *
 * @template T
 * @param {string} pdfPath
 * @param {(page: ReturnType<typeof readPgm>) => T} perPage
 * @returns {T[]} one entry per page, in page order
 */
function eachRenderedPage(pdfPath, perPage) {
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
      .map((file) => perPage(readPgm(readFileSync(join(dir, file)))));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Vertical runs of solid ink in the marker column, as `{ top, height }`.
 *
 * A row counts when every pixel across `width` is dark. Inset by a pixel at
 * each edge so antialiasing cannot decide the answer either way.
 *
 * @param {ReturnType<typeof readPgm>} page
 * @param {number} width  columns from the page margin that must all be dark
 */
function solidRuns(page, width) {
  const from = MARKER_X + 1;
  const to = MARKER_X + width - 1;
  const runs = [];
  let top = null;
  for (let y = 0; y <= page.height; y += 1) {
    let solid = y < page.height;
    for (let x = from; x < to && solid; x += 1) solid = page.pixel(x, y) < 100;
    if (solid && top === null) top = y;
    else if (!solid && top !== null) {
      runs.push({ top, height: y - top });
      top = null;
    }
  }
  // Anything shorter than this is a glyph stem crossing the column, not a mark.
  return runs.filter((r) => r.height >= MARKER_SIZE - 4);
}

/**
 * How many bullet markers are actually **visible** on each rendered page.
 *
 * A white marker — #925, where `printBackground: false` painted the rectangles
 * in white — contributes nothing, which is the point. Runs at or above
 * `MARK_SPLIT` are the lifecycle kicker's marks sharing the same column and are
 * not bullets; see the geometry note above.
 *
 * @param {string} pdfPath
 * @returns {number[]} visible bullet markers, one entry per page
 */
export function visibleMarkersPerPage(pdfPath) {
  return eachRenderedPage(
    pdfPath,
    (page) => solidRuns(page, MARKER_SIZE).filter((r) => r.height < MARK_SPLIT).length,
  );
}

/**
 * How many lifecycle marks are painted with their **fill** on each rendered
 * page (#944).
 *
 * Presence is not the invariant here; ink is. Three of the four marks are CSS
 * *backgrounds* — filled for `SHIPPED`, cored for `ARCHIVED`, half-filled for
 * `EXPERIMENT` — and only the 1px outline is a border, so a renderer that
 * drops backgrounds leaves every mark at the right size in the right place and
 * collapses four states into one, with nothing missing from the file. That is
 * the #925 shape again and it needs the #925 answer: ask the rendered page for
 * ink rather than the file for rectangles.
 *
 * **What this can and cannot fail on.** Two mechanisms paint those backgrounds
 * into the generated PDF — `printBackground: true` in the generator and
 * `print-color-adjust: exact` in the résumé's `@media print` — and either one
 * alone is sufficient, so removing just one leaves this count unchanged. It is
 * an end-state assertion about the shipped file, not a guard for either
 * property; the stylesheet rule is asserted directly in resume.test.js
 * § print stylesheet. Nor does it prove the four variants stay distinguishable
 * from one another — that was verified by rendering the page with the property
 * reverted to `economy`, which produced four identical outlines.
 *
 * Only `SHIPPED` runs dark across the mark's full width: `ARCHIVED` holds a
 * paper ring inside its border and `EXPERIMENT` leaves its right half blank,
 * so both fall to the same thin border rows a hollow `PAUSED` gives.
 *
 * @param {string} pdfPath
 * @returns {number[]} filled lifecycle marks, one entry per page
 */
export function filledLifecycleMarksPerPage(pdfPath) {
  return eachRenderedPage(
    pdfPath,
    (page) =>
      solidRuns(page, STATUS_MARK_SIZE).filter((r) => r.height >= STATUS_MARK_SIZE - 3).length,
  );
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
