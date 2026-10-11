/**
 * og-images.mjs — Astro integration for build-time OG image generation
 *
 * Uses Playwright to screenshot OG template pages after astro build writes
 * static HTML to dist/. Each template lives under src/pages/og-templates/ and renders
 * the OgCard layout at 1200×630 with 2× DPR (2400×1260 output).
 *
 * The integration:
 *   1. Discovers all og-templates/ HTML files in the build output
 *   2. Spins up a local static file server
 *   3. Launches headless Chromium via Playwright
 *   4. Screenshots each template page
 *   5. Writes PNGs to dist/og/
 *   6. Renders the built /resume/ route to dist/Nathan-Payne-Resume.pdf,
 *      with its relative links rewritten to the configured `site` origin
 *      (see ./resume-pdf.mjs)
 *   7. Removes the og-templates/ directory from dist/ (not publicly served)
 *
 * The screenshot and PDF passes share the same expensive headless Chromium.
 *
 * @see Issue #106 — Generate OG images at build time
 * @see Issue #616 — Downloadable resume PDF
 * @see Issue #683 — PDF links froze at the localhost render origin
 * @see Issue #1250 — CI (Linux) and macOS rendered the PDF and OG cards differently
 */

import { readdir, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, dirname, basename, resolve, sep } from 'node:path';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { blockAnalytics, generateResumePdf, RESUME_PDF_FILENAME } from './resume-pdf.mjs';
import { BUILD_CHROMIUM_ARGS } from '../lib/build-chromium.mjs';

/**
 * Find all index.html files under a directory using flat recursive readdir.
 * Returns relative directory paths (e.g. "blog/my-post", ".") for each template.
 */
async function findHtmlFiles(dir) {
  const entries = await readdir(dir, { recursive: true });
  return entries
    .filter((f) => basename(f) === 'index.html')
    .map((f) => {
      const parent = dirname(f);
      return parent === '.' ? '.' : parent;
    });
}

/**
 * Resolve a request URL to a file path inside `root`, refusing anything
 * that would escape it (e.g. `/../../../etc/passwd` or its encoded form).
 * Returns null if the URL is malformed or resolves outside `root`.
 */
function resolveRequestPath(root, requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  } catch {
    return null;
  }

  let filePath = join(root, pathname === '/' ? 'index.html' : pathname);
  // If path doesn't end with a file extension, try index.html
  if (!filePath.match(/\.\w+$/)) {
    filePath = join(filePath, 'index.html');
  }

  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(filePath);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(resolvedRoot + sep)) {
    return null;
  }
  return resolvedPath;
}

/**
 * Serve static files from a directory. Minimal server for Playwright.
 */
export function serveStatic(root) {
  return new Promise((resolvePromise) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.png': 'image/png',
      '.woff2': 'font/woff2',
    };

    const server = createServer((req, res) => {
      const filePath = resolveRequestPath(root, req.url);
      if (!filePath) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      const ext = '.' + filePath.split('.').pop();
      const contentType = mimeTypes[ext] || 'application/octet-stream';

      const stream = createReadStream(filePath);
      stream.on('open', () => {
        res.writeHead(200, { 'Content-Type': contentType });
        stream.pipe(res);
      });
      stream.on('error', () => {
        res.writeHead(404);
        res.end('Not found');
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolvePromise({ server, port });
    });
  });
}

export default function ogImages() {
  // Captured at astro:config:done because astro:build:done does not receive
  // the resolved config, and the resume PDF needs the production origin to
  // absolutize its links (#683).
  let siteUrl;
  // Where the rendered card text is recorded for tests: the checkout's own
  // `.astro/` directory (gitignored), not dist/, so it is never deployed, and
  // not Astro's cacheDir, which lives in node_modules and is shared between
  // worktrees that symlink it.
  let recordDir;

  return {
    name: 'og-images',
    hooks: {
      'astro:config:done': ({ config }) => {
        siteUrl = config.site;
        recordDir = join(fileURLToPath(config.root), '.astro');
      },
      'astro:build:done': async ({ dir, logger }) => {
        // `dir` is a URL object. `dir.pathname` yields `/C:/path/...` on
        // Windows, which then breaks `path.join`. Convert via
        // `fileURLToPath` per Astro's documented cross-platform pattern.
        // See #173 (fix) and #171 (same fix applied to robots-sitemap).
        const distDir = fileURLToPath(dir);
        const ogTemplateDir = join(distDir, 'og-templates');

        // Check if og-templates/ templates exist in the build output. A build
        // without them still needs the resume PDF below, so this only skips
        // the screenshot pass — it no longer aborts the whole hook (#616).
        let templatePaths = [];
        try {
          await stat(ogTemplateDir);
          templatePaths = await findHtmlFiles(ogTemplateDir);
          if (templatePaths.length === 0) {
            logger.warn('No template HTML files found');
          }
        } catch {
          logger.warn('No og-templates/ templates found in build output, skipping OG generation');
        }

        // Start local server
        const { server, port } = await serveStatic(distDir);
        const baseUrl = `http://127.0.0.1:${port}`;

        let browser;
        try {
          // Launch Playwright
          const { chromium } = await import('playwright');
          browser = await chromium.launch({ args: BUILD_CHROMIUM_ARGS });

          if (templatePaths.length > 0) {
            await renderOgImages({
              browser,
              baseUrl,
              distDir,
              templatePaths,
              logger,
              manifestPath: join(recordDir, OG_CARD_MANIFEST),
            });
          }

          // Build-time resume PDF (#616) — reuses this browser and server.
          // Skipped silently if /resume/ isn't in this build.
          try {
            await stat(join(distDir, 'resume', 'index.html'));
          } catch {
            logger.warn('No dist/resume/index.html found, skipping resume PDF');
            return;
          }
          logger.info('Generating resume PDF...');
          await generateResumePdf({
            browser,
            baseUrl,
            siteUrl,
            outputPath: join(distDir, RESUME_PDF_FILENAME),
            logger,
          });
        } finally {
          await browser?.close();
          server.close();

          // Remove og-templates/ templates from dist — they are not public pages
          if (templatePaths.length > 0) {
            try {
              await rm(ogTemplateDir, { recursive: true, force: true });
              logger.info('Cleaned up og-templates/ templates from build output');
            } catch {
              logger.warn('Failed to clean up og-templates/ from build output');
            }
          }
        }
      },
    },
  };
}

/**
 * Rendered-fit check for an OG card (#1088). `.og-content` is
 * `overflow: hidden`, so a heading, description or tag line that runs long is
 * clipped silently rather than failing anything, and a character cap in the
 * template cannot see where a line wraps once the real fonts load. This
 * measures the card in the browser after `document.fonts.ready`;
 * `ogFitProblems` judges the result. Runs inside the page, so it must stay
 * self-contained.
 */
export function measureOgCard() {
  const content = document.querySelector('.og-content');
  if (!content) return null;
  const box = content.getBoundingClientRect();
  const children = [...content.children].map((el) => {
    const r = el.getBoundingClientRect();
    // Horizontal extent comes from the ink, not the block: an h1 or p
    // stretches to the full content width, so its own box can never show a
    // line running past the edge. A Range over the contents can (#1092).
    const range = document.createRange();
    range.selectNodeContents(el);
    const ink = range.getBoundingClientRect();
    return {
      className: String(el.className),
      top: r.top,
      bottom: r.bottom,
      inkLeft: ink.left,
      inkRight: ink.right,
    };
  });
  const meta = content.querySelector('.og-meta');
  let metaLines = 0;
  if (meta) {
    const metaStyle = getComputedStyle(meta);
    const lineHeight = parseFloat(metaStyle.lineHeight) || parseFloat(metaStyle.fontSize) * 1.2;
    metaLines = Math.round(meta.getBoundingClientRect().height / lineHeight);
  }
  return {
    box: { top: box.top, bottom: box.bottom, left: box.left, right: box.right },
    children,
    metaLines,
  };
}

// The least space a block may leave between itself and the clipping edge.
// Text closer than this reads as crammed against the next cell, and past
// zero it is cut off.
export const OG_MIN_CLEARANCE = 24;

// Where a side of `.og-content` is the image edge (top and left, on the
// full-bleed grid), text must also clear what link previews crop and round
// away: up to ~33px off a side on LinkedIn messaging, ~15px off the top on X,
// ~30px corners in iMessage, and Slick Media's ~70px side and ~55px
// top-and-bottom text inset (#1095, #1292). The right and bottom sides meet
// interior grid lines, so OG_MIN_CLEARANCE governs there.
export const OG_SAFE_ZONE = { top: 55, left: 70 };

/**
 * Judge a `measureOgCard` result. A card fits when every block keeps
 * `OG_MIN_CLEARANCE` from all four sides of `.og-content` (the edge that
 * clips; its ink, not its box, for left and right), and also `safeZone`
 * where that side is the image edge, and the tag line stays on one line.
 * Returns problems; empty = fits.
 */
export function ogFitProblems(
  measurement,
  minClearance = OG_MIN_CLEARANCE,
  safeZone = OG_SAFE_ZONE,
) {
  if (!measurement) return ['no .og-content element to measure'];
  const { box, children, metaLines } = measurement;
  const floor = (side) => Math.max(minClearance, safeZone[side] ?? 0);
  const problems = [];
  const check = (name, side, distance) => {
    if (distance < floor(side))
      problems.push(
        `.${name} is ${Math.round(distance)}px from the ${side} edge (needs ${floor(side)})`,
      );
  };
  for (const child of children) {
    const name = child.className.split(' ')[0] || 'element';
    check(name, 'top', child.top - box.top);
    check(name, 'bottom', box.bottom - child.bottom);
    if (child.inkLeft !== undefined) {
      check(name, 'left', child.inkLeft - box.left);
      check(name, 'right', box.right - child.inkRight);
    }
  }
  if (metaLines > 1) problems.push(`.og-meta wraps to ${metaLines} lines`);
  return problems;
}

/**
 * Edge check for an OG card (#1292). Every card is full bleed: the grid fills
 * the image, with no stage padding, border or shadow, and the cells along
 * each edge are color fields. A frame or mat at the edge survives a crop on
 * some sides and not others (#1090, #1094), and a near-white edge cell reads
 * as a missing corner on a white page. This reads the rendered card;
 * `ogEdgeProblems` judges it. Runs inside the page, so it must stay
 * self-contained.
 */
export function measureOgEdges() {
  const shell = document.querySelector('.og-shell');
  const card = document.querySelector('.og-card');
  if (!shell || !card) return null;
  const px = (value) => parseFloat(value) || 0;
  const sides = ['Top', 'Right', 'Bottom', 'Left'];
  const shellStyle = getComputedStyle(shell);
  const cardStyle = getComputedStyle(card);
  const cardBox = card.getBoundingClientRect();
  const cells = [...card.children]
    .filter((el) => getComputedStyle(el).display !== 'none')
    .map((el) => {
      const r = el.getBoundingClientRect();
      return {
        className: String(el.className),
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        background: getComputedStyle(el).backgroundColor,
      };
    });
  return {
    viewport: { width: window.innerWidth, height: window.innerHeight },
    card: { left: cardBox.left, top: cardBox.top, right: cardBox.right, bottom: cardBox.bottom },
    shellPadding: sides.map((side) => px(shellStyle[`padding${side}`])),
    cardBorder: sides.map((side) => px(cardStyle[`border${side}Width`])),
    cardShadow: cardStyle.boxShadow,
    cells,
  };
}

// The share of each image edge that color cells must cover. Interior grid
// lines meeting the edge take the rest: three 9px lines on the bottom edge
// are 2.25% of it. A frame track along the edge covers none of it.
export const OG_EDGE_COVERAGE = 0.95;

// An edge cell at least this light in every channel reads as white.
const NEAR_WHITE = 248;

function parseColor(value) {
  const m = /rgba?\(([^)]+)\)/.exec(value ?? '');
  if (!m) return null;
  const [r, g, b, a = 1] = m[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  return { r, g, b, a };
}

/**
 * Judge a `measureOgEdges` result. Returns problems; empty = the card runs
 * full bleed with only color fields at its edges.
 */
export function ogEdgeProblems(measurement, coverage = OG_EDGE_COVERAGE) {
  if (!measurement) return ['no .og-shell or .og-card element to measure'];
  const { viewport, card, shellPadding, cardBorder, cardShadow, cells } = measurement;
  const problems = [];
  const near = (a, b) => Math.abs(a - b) < 0.5;
  if (
    !near(card.left, 0) ||
    !near(card.top, 0) ||
    !near(card.right, viewport.width) ||
    !near(card.bottom, viewport.height)
  ) {
    problems.push(
      `.og-card spans ${Math.round(card.left)},${Math.round(card.top)}–` +
        `${Math.round(card.right)},${Math.round(card.bottom)}, not the full ` +
        `${viewport.width}×${viewport.height} image`,
    );
  }
  if (shellPadding.some((v) => v !== 0)) problems.push('.og-shell has a stage margin (padding)');
  if (cardBorder.some((v) => v !== 0)) problems.push('.og-card has a border');
  if (cardShadow && cardShadow !== 'none') problems.push('.og-card has a box-shadow');

  const edges = [
    {
      side: 'top',
      length: viewport.width,
      on: (c) => near(c.top, 0),
      span: (c) => [c.left, c.right],
    },
    {
      side: 'bottom',
      length: viewport.width,
      on: (c) => near(c.bottom, viewport.height),
      span: (c) => [c.left, c.right],
    },
    {
      side: 'left',
      length: viewport.height,
      on: (c) => near(c.left, 0),
      span: (c) => [c.top, c.bottom],
    },
    {
      side: 'right',
      length: viewport.height,
      on: (c) => near(c.right, viewport.width),
      span: (c) => [c.top, c.bottom],
    },
  ];
  for (const { side, length, on, span } of edges) {
    const touching = cells.filter(on);
    const spans = touching
      .map((c) => span(c).map((v) => Math.min(Math.max(v, 0), length)))
      .sort((a, b) => a[0] - b[0]);
    let covered = 0;
    let reach = 0;
    for (const [start, end] of spans) {
      if (end > reach) {
        covered += end - Math.max(start, reach);
        reach = end;
      }
    }
    if (covered / length < coverage) {
      problems.push(
        `color cells cover ${Math.round((covered / length) * 100)}% of the ${side} edge ` +
          `(needs ${Math.round(coverage * 100)}%)`,
      );
    }
    for (const cell of touching) {
      const name =
        cell.className
          .split(' ')
          .filter((c) => c !== 'og-block')
          .pop() || 'element';
      const color = parseColor(cell.background);
      if (!color || color.a < 0.5) {
        problems.push(`.${name} on the ${side} edge has no solid background`);
      } else if (Math.min(color.r, color.g, color.b) >= NEAR_WHITE) {
        problems.push(`.${name} on the ${side} edge is near white (${cell.background})`);
      }
    }
  }
  return problems;
}

/**
 * Screenshot every og-template page at 1200×630 (2× DPR) into dist/og/.
 * Extracted from the hook body so the hook can also drive the resume PDF
 * over the same browser and static server (#616).
 */
/**
 * The text each card rendered, keyed by template path (`projects/<slug>`),
 * written to the checkout's `.astro/` directory after every build. The template HTML is
 * deleted from dist/ when the screenshots are done, so this is the only place
 * a test can check that a card shows what its frontmatter says (#1089).
 */
export const OG_CARD_MANIFEST = 'og-cards.json';

/** Runs inside the page, so it must stay self-contained. */
export function readOgCardText() {
  const text = (selector) => document.querySelector(selector)?.textContent.trim() ?? null;
  return {
    label: text('.og-label'),
    heading: text('.og-heading'),
    description: text('.og-description'),
    meta: text('.og-meta'),
  };
}

async function renderOgImages({ browser, baseUrl, distDir, templatePaths, logger, manifestPath }) {
  logger.info('Generating OG images...');

  // Create output directory
  const ogOutputDir = join(distDir, 'og');
  await mkdir(ogOutputDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });
  // The OG templates carry no analytics today; blocking anyway means a future
  // template built on BaseLayout cannot record build renders as visits.
  await blockAnalytics(context);

  const misfits = [];
  const cards = {};
  try {
    for (const templatePath of templatePaths) {
      const page = await context.newPage();
      const url = `${baseUrl}/og-templates/${templatePath}/`;
      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);

      // Fit is checked against the rendered card, after fonts, so wrapping
      // is real rather than estimated (#1088). Collected, then thrown once,
      // so one build reports every card that does not fit.
      const problems = [
        ...ogFitProblems(await page.evaluate(measureOgCard)),
        ...ogEdgeProblems(await page.evaluate(measureOgEdges)),
      ];
      if (problems.length > 0) misfits.push(`${templatePath}: ${problems.join('; ')}`);
      // POSIX key on every platform: recursive readdir returns native
      // separators, and the test looks cards up as `projects/<slug>`.
      cards[templatePath.split(sep).join('/')] = await page.evaluate(readOgCardText);

      // Derive output path: og-templates/blog/slug → og/blog/slug.png
      // Special case: og-templates root pages (home, blog, projects)
      const outputName = templatePath === '.' ? 'home.png' : `${templatePath}.png`;

      const outputPath = join(ogOutputDir, outputName);

      // Ensure parent directories exist
      const outputParent = join(outputPath, '..');
      await mkdir(outputParent, { recursive: true });

      await page.screenshot({ path: outputPath, type: 'png' });
      logger.info(`  ${outputName}`);
      await page.close();
    }

    logger.info(`Generated ${templatePaths.length} OG images`);
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(cards, null, 2)}\n`);
    if (misfits.length > 0) {
      throw new Error(
        `OG cards that do not fit their 1200×630 image once fonts load:\n  ${misfits.join('\n  ')}\n` +
          'A wrapped .og-meta needs fewer tags. A block crowding the left or right ' +
          'edge is a line too wide to wrap (nowrap, or one long word): shorten it. ' +
          'A block crowding the top or bottom means the content is too tall in total ' +
          '(it is centered, so the reported block may not be the long one): shorten ' +
          'the description or title. For a project card, edit its src/content/projects/ ' +
          'file, usually a shorter `ogDescription`. An edge problem (stage margin, ' +
          'border, shadow, uncovered or near-white edge) is a layout change in the ' +
          '`.og-*` styles in src/styles/global.css: every card runs full bleed (#1292).',
      );
    }
  } finally {
    await context.close();
  }
}
