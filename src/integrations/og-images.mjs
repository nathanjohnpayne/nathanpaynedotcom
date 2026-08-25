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
 */

import { readdir, mkdir, rm, stat } from 'node:fs/promises';
import { join, dirname, basename, resolve, sep } from 'node:path';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generateResumePdf, RESUME_PDF_FILENAME } from './resume-pdf.mjs';

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

  return {
    name: 'og-images',
    hooks: {
      'astro:config:done': ({ config }) => {
        siteUrl = config.site;
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
          browser = await chromium.launch();

          if (templatePaths.length > 0) {
            await renderOgImages({ browser, baseUrl, distDir, templatePaths, logger });
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
 * Screenshot every og-template page at 1200×630 (2× DPR) into dist/og/.
 * Extracted from the hook body so the hook can also drive the resume PDF
 * over the same browser and static server (#616).
 */
async function renderOgImages({ browser, baseUrl, distDir, templatePaths, logger }) {
  logger.info('Generating OG images...');

  // Create output directory
  const ogOutputDir = join(distDir, 'og');
  await mkdir(ogOutputDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });

  try {
    for (const templatePath of templatePaths) {
      const page = await context.newPage();
      const url = `${baseUrl}/og-templates/${templatePath}/`;
      await page.goto(url, { waitUntil: 'networkidle' });

      // Wait for fonts to load
      await page.evaluate(() => document.fonts.ready);

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
  } finally {
    await context.close();
  }
}
