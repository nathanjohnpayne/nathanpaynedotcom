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
 *   6. Removes the og-templates/ directory from dist/ (not publicly served)
 *
 * @see Issue #106 — Generate OG images at build time
 */

import { readdir, mkdir, rm, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';

/**
 * Recursively find all index.html files under a directory.
 */
async function findHtmlFiles(dir, base = dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await findHtmlFiles(full, base));
    } else if (entry.name === 'index.html') {
      files.push(relative(base, dir));
    }
  }
  return files;
}

/**
 * Serve static files from a directory. Minimal server for Playwright.
 */
function serveStatic(root) {
  return new Promise((resolve) => {
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.png': 'image/png',
      '.woff2': 'font/woff2',
    };

    const server = createServer((req, res) => {
      let filePath = join(root, req.url === '/' ? 'index.html' : req.url);
      // If path doesn't end with a file extension, try index.html
      if (!filePath.match(/\.\w+$/)) {
        filePath = join(filePath, 'index.html');
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
      resolve({ server, port });
    });
  });
}

export default function ogImages() {
  return {
    name: 'og-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const distDir = dir.pathname;
        const ogTemplateDir = join(distDir, 'og-templates');

        // Check if og-templates/ templates exist in the build output
        try {
          await stat(ogTemplateDir);
        } catch {
          logger.warn('No og-templates/ templates found in build output, skipping OG generation');
          return;
        }

        logger.info('Generating OG images...');

        // Find all template pages
        const templatePaths = await findHtmlFiles(ogTemplateDir);
        if (templatePaths.length === 0) {
          logger.warn('No template HTML files found');
          return;
        }

        // Create output directory
        const ogOutputDir = join(distDir, 'og');
        await mkdir(ogOutputDir, { recursive: true });

        // Start local server
        const { server, port } = await serveStatic(distDir);
        const baseUrl = `http://127.0.0.1:${port}`;

        let browser;
        try {
          // Launch Playwright
          const { chromium } = await import('playwright');
          browser = await chromium.launch();
          const context = await browser.newContext({
            viewport: { width: 1200, height: 630 },
            deviceScaleFactor: 2,
          });

          for (const templatePath of templatePaths) {
            const page = await context.newPage();
            const url = `${baseUrl}/og-templates/${templatePath}/`;
            await page.goto(url, { waitUntil: 'networkidle' });

            // Wait for fonts to load
            await page.evaluate(() => document.fonts.ready);

            // Derive output path: og-templates/blog/slug → og/blog/slug.png
            // Special case: og-templates root pages (home, blog, projects)
            const outputName = templatePath === '.'
              ? 'home.png'
              : `${templatePath}.png`;

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
          await browser?.close();
          server.close();
        }

        // Remove og-templates/ templates from dist — they are not public pages
        try {
          await rm(ogTemplateDir, { recursive: true, force: true });
          logger.info('Cleaned up og-templates/ templates from build output');
        } catch {
          logger.warn('Failed to clean up og-templates/ from build output');
        }
      },
    },
  };
}
