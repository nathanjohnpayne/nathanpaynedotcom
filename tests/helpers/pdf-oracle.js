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
 * - `.state-marker::before` = `calc(0.72em + 2px)` of the 7.5pt (10 CSS px)
 *   status kicker: 0.72em of mark plus its 1px border on each side. The rule
 *   sets `box-sizing: border-box` and restates the border in the width for
 *   that reason — the `*` reset does not match a pseudo-element, so without it
 *   a variant's own padding grew the box rather than eating into its fill
 *   (#959).
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
 * Nominal mark box, and the slack the classifier allows around it.
 *
 * Two sources of slack, both measured against the built file rather than
 * assumed: antialiasing puts the left edge on `MARKER_X` or `MARKER_X + 1`
 * depending on the fill, and `STATUS_MARK_SIZE` is a rounded derivation rather
 * than a measurement. Measured on the built résumé, all four variants:
 * 15×14 solid, 14×14 cored, 14×15 hollow, 14×13 half.
 *
 * There used to be a third, and one window per variant to carry it: the cored
 * mark rendered 17×17 because its `padding: 0.1em` grew the box, and the
 * detection window had to be wide enough to find it while every other variant
 * was held to a narrower one so it could not spend the same slack (#948, #958).
 * #959 made the box `border-box`, so the padding eats into the fill and all
 * four are one size again — and one window does again what two had to.
 *
 * The window is deliberately not wide enough to swallow a geometry change, in
 * either direction: `scale(1.25)` on a 14 px mark lands on 17 and `scaleY(0.8)`
 * lands on 11, and both miss it. Collapsing two windows into one is where that
 * symmetry is easy to lose — the first attempt kept detection's slack as
 * classification's on both bounds, which re-admitted the scaled mark #958 had
 * closed, and the second fixed the ceiling and left the floor a pixel loose
 * (Codex, PR #963). A mark that drifts out of it stops being found, which fails the signature
 * comparison rather than passing quietly — and the declarations themselves are
 * asserted against the emitted stylesheet in resume.test.js § print stylesheet.
 */
const MARK_MIN = STATUS_MARK_SIZE - 2;
const MARK_MAX = STATUS_MARK_SIZE + 2;

/**
 * How much of the middle row a lone dark run has to cover to be `solid`.
 *
 * `SHIPPED` is filled edge to edge and measures 100%. Counting runs alone
 * accepted a single narrow band as solid — a fill inset from transparent side
 * borders leaves exactly that, with the top and bottom rows still closing a
 * valid box (Codex, PR #958). The name of the signature is a claim about the
 * whole row, so it is checked against the whole row.
 */
const SOLID_MIN = 0.9;

/**
 * How much of a two-run mark's middle row the first run covers, per variant.
 *
 * Measured on the built résumé: 43% for the half-filled `EXPERIMENT` against 7%
 * for a hollow `PAUSED`. The half window is closed at both ends on purpose —
 * see `markSignature` — and the gap between `HOLLOW_MAX` and `HALF_MIN` is
 * where a drifted gradient lands, reported as `unrecognised` rather than
 * rounded to whichever variant is nearer.
 */
const HOLLOW_MAX = 1 / 5;
const HALF_MIN = 1 / 3;
const HALF_MAX = 2 / 3;

/**
 * How wide a run may be and still be read as a border rather than a fill, and
 * how much of the row a cored mark's centre band has to hold.
 *
 * Every signature but `solid` is border, something, border, and until #958's
 * review the something was the only part checked. That let a fill on the side
 * the classification did not look at pass as its unfilled neighbour: a
 * right-half gradient on a hollow mark leaves the left border thin and reads
 * `hollow`, and a thickened border on a cored one still yields three runs and
 * reads `cored`. So every run is now checked, not the deciding one.
 *
 * Measured edges on the built résumé are 1-2 px against boxes of 14-17, so a
 * quarter of the row is comfortably above them and well below any fill.
 */
const EDGE_MAX = 1 / 4;
const CORE_MIN = 1 / 2;

/**
 * Is every pixel across the mark column dark on this row?
 *
 * The width is the mark's, not the bullet's, and that is what makes this a
 * lifecycle-mark detector rather than a marker detector: a bullet is 9 device
 * px wide against the mark's 14, both starting at the page margin, so a
 * bullet's rows leave the last five columns on paper and never satisfy this.
 * Inset by a pixel at each edge, like `solidRuns`, so antialiasing at the
 * border cannot decide the answer.
 *
 * @param {ReturnType<typeof readPgm>} page
 * @param {number} y
 * @returns {boolean}
 */
function markRow(page, y) {
  if (y < 0 || y >= page.height) return false;
  for (let x = MARKER_X + 1; x < MARKER_X + STATUS_MARK_SIZE - 1; x += 1) {
    if (page.pixel(x, y) >= 100) return false;
  }
  return true;
}

/**
 * The dark span containing the mark column on one row, as `[from, to)`.
 *
 * Walks outward from inside the column rather than assuming an edge, because
 * the left edge lands on a different pixel for a filled mark than for a hollow
 * one and the cored variant is wider than both.
 *
 * @param {ReturnType<typeof readPgm>} page
 * @param {number} y
 * @returns {{ from: number, to: number }}
 */
function darkSpan(page, y) {
  let from = MARKER_X + 1;
  while (from > 0 && page.pixel(from - 1, y) < 100) from -= 1;
  let to = MARKER_X + STATUS_MARK_SIZE - 1;
  while (to < page.width && page.pixel(to, y) < 100) to += 1;
  return { from, to };
}

/**
 * The mark box opening at row `top`, or `null` if nothing closes into one.
 *
 * A mark is a rectangle, so it is found by requiring one: a fully-dark row that
 * opens it, a fully-dark row that closes it at a plausible height, and the same
 * horizontal extent on both. `SHIPPED` satisfies this with every row between
 * them dark too; the other three satisfy it with a top and bottom border and
 * paper in between. Bold text at the page margin can produce a stray fully-dark
 * row — the built résumé has one — and is rejected here because nothing closes
 * it.
 *
 * @param {ReturnType<typeof readPgm>} page
 * @param {number} top
 * @returns {{ top: number, bottom: number, from: number, to: number } | null}
 */
function markBoxAt(page, top) {
  const span = darkSpan(page, top);
  const width = span.to - span.from;
  if (width < MARK_MIN || width > MARK_MAX) return null;
  for (let height = MARK_MIN; height <= MARK_MAX; height += 1) {
    const bottom = top + height - 1;
    if (!markRow(page, bottom) || markRow(page, bottom + 1)) continue;
    const closing = darkSpan(page, bottom);
    if (Math.abs(closing.from - span.from) > 1 || Math.abs(closing.to - span.to) > 1) continue;
    return { top, bottom, from: span.from, to: span.to };
  }
  return null;
}

/**
 * Which of the four marks this box is painted as, read off its middle row.
 *
 * The CSS draws four signatures and they separate cleanly in ink, so the
 * classifier reads the signature rather than counting one of them:
 *
 * | Variant      | Middle row                    | Dark runs |
 * |--------------|-------------------------------|-----------|
 * | `SHIPPED`    | solid edge to edge            | 1         |
 * | `ARCHIVED`   | border, paper ring, fill, ring, border | 3  |
 * | `EXPERIMENT` | left half filled, then paper  | 2, first ~half |
 * | `PAUSED`     | border, paper, border         | 2, first thin |
 *
 * The two-run cases are told apart by how much of the row the first run
 * covers, and `EXPERIMENT` is bounded on **both** sides rather than given a
 * floor. A floor alone accepts a gradient that has drifted to any larger stop —
 * an 80% stop covers 57% of the box, measured, and would still have read as
 * "half", while the companion stylesheet assertion only required *a*
 * `linear-gradient` — so both checks passed on a mark that is no longer half
 * filled (Codex, PR #958). Measured on the built file: 43% for `EXPERIMENT`
 * against 7% for a hollow mark.
 *
 * A two-run mark that lands outside both windows is reported as
 * `unrecognised` rather than rounded to the nearer variant.
 *
 * **The half window is coarse on purpose, and it is not where the 50% stop is
 * pinned.** The gradient percentage does not map onto the box linearly enough
 * to bound tightly: measured, a 50% stop fills 43% of the box and an 80% stop
 * fills 57%, because the left border is inside the run and the fill's right
 * edge loses a pixel to antialiasing. A window tight enough to reject 80%
 * would sit within a pixel of the nominal value and could fail a required
 * check on a rendering difference. So the exact stop is asserted against the
 * emitted stylesheet in resume.test.js § print stylesheet, where it compares
 * exactly, and this window does the job a render check can do robustly:
 * telling a half-filled mark from a hollow, solid or cored one.
 *
 * @param {ReturnType<typeof readPgm>} page
 * @param {{ top: number, bottom: number, from: number, to: number }} box
 * @returns {'solid' | 'cored' | 'half' | 'hollow' | 'unrecognised'}
 */
function markSignature(page, box) {
  const middle = Math.round((box.top + box.bottom) / 2);
  const runs = [];
  let start = null;
  for (let x = box.from; x <= box.to; x += 1) {
    const dark = x < box.to && page.pixel(x, middle) < 100;
    if (dark && start === null) start = x;
    else if (!dark && start !== null) {
      runs.push(x - start);
      start = null;
    }
  }
  const width = box.to - box.from;
  const signature = read();
  // The cored variant is the one allowed to be larger than nominal, and only
  // because #959 makes it so. Everything else is held to the tight window, or
  // the slack that exists for one variant silently covers a size regression in
  // another (Codex, PR #958).
  // A classified mark still has to be the right size. Detection allows a few
  // pixels of slack for antialiasing and rounding; spending them on a
  // thickened border or a `transform` is not a mark (Codex, PR #958). One
  // window covers all four variants since #959.
  if (signature === 'unrecognised') return signature;
  const height = box.bottom - box.top + 1;
  const nominal = (n) => n >= MARK_MIN && n <= MARK_MAX;
  return nominal(width) && nominal(height) ? signature : 'unrecognised';

  function read() {
    const edge = (run) => run <= EDGE_MAX * width;
    if (runs.length === 1) return runs[0] / width >= SOLID_MIN ? 'solid' : 'unrecognised';
    if (runs.length === 3) {
      const cored = edge(runs[0]) && edge(runs[2]) && runs[1] >= CORE_MIN * width;
      return cored ? 'cored' : 'unrecognised';
    }
    if (runs.length === 2) {
      if (!edge(runs[1])) return 'unrecognised';
      const covered = runs[0] / width;
      if (covered >= HALF_MIN && covered <= HALF_MAX) return 'half';
      if (covered <= HOLLOW_MAX) return 'hollow';
    }
    return 'unrecognised';
  }
}

/**
 * How each lifecycle mark is actually **painted** on each rendered page
 * (#944, #957).
 *
 * Presence is not the invariant here; ink is. Three of the four marks are CSS
 * *backgrounds* — filled for `SHIPPED`, cored for `ARCHIVED`, half-filled for
 * `EXPERIMENT` — and only the 1px outline is a border, so a renderer that
 * drops backgrounds leaves every mark at the right size in the right place and
 * collapses four states into one, with nothing missing from the file. That is
 * the #925 shape and it needs the #925 answer: ask the rendered page for ink
 * rather than the file for rectangles.
 *
 * **Why this reports signatures rather than a count.** It used to count the
 * marks that ran solid edge to edge, which only `SHIPPED` does — so the
 * assertion built on it could only run while the page carried a `SHIPPED`
 * project, and specs/resume.md deliberately pins no lifecycle mix (#948, #957).
 * Classifying each mark instead removes the coupling completely: whatever
 * states the page holds, every mark owes its own signature, and a page of
 * nothing but hollow marks asserts that they are hollow rather than asserting
 * nothing. A renderer that drops the backgrounds turns every filled variant
 * hollow and fails — and on a page where every variant is *already* hollow it
 * changes nothing about the file, so passing is correct rather than vacuous.
 *
 * **What it still cannot fail on.** Two mechanisms paint those backgrounds
 * into the generated PDF — `printBackground: true` in the generator and
 * `print-color-adjust: exact` in `@media print` — and either alone suffices,
 * so removing just one leaves these signatures unchanged. This is an assertion
 * about the shipped file, not a guard for either property; the stylesheet rule
 * has its own assertion in resume.test.js § print stylesheet.
 *
 * @param {string} pdfPath
 * @returns {string[][]} one array of signatures per page, in reading order
 */
export function lifecycleMarkSignaturesPerPage(pdfPath) {
  return eachRenderedPage(pdfPath, (page) => {
    const signatures = [];
    for (let y = 0; y < page.height; y += 1) {
      if (!markRow(page, y) || markRow(page, y - 1)) continue;
      const box = markBoxAt(page, y);
      if (!box) continue;
      signatures.push(markSignature(page, box));
      y = box.bottom;
    }
    return signatures;
  });
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
