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
 *   6. Replaces Mermaid source blocks in built blog pages with inline SVG
 *   7. Renders the built /resume/ route to dist/Nathan-Payne-Resume.pdf,
 *      with its relative links rewritten to the configured `site` origin
 *      (see ./resume-pdf.mjs)
 *   8. Removes the og-templates/ directory from dist/ (not publicly served)
 *
 * Steps 6 and 7 ride along here rather than in their own integrations because
 * they reuse the same expensive headless Chromium. Keeping the passes together
 * also means the OG screenshots and resume PDF read the final static HTML.
 *
 * @see Issue #106 — Generate OG images at build time
 * @see Issue #616 — Downloadable resume PDF
 * @see Issue #683 — PDF links froze at the localhost render origin
 */

import { readdir, readFile, writeFile, mkdir, rm, stat } from 'node:fs/promises';
import { join, dirname, basename, resolve, sep } from 'node:path';
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { generateResumePdf, RESUME_PDF_FILENAME } from './resume-pdf.mjs';

const require = createRequire(import.meta.url);
const MERMAID_BUNDLE_PATH = require.resolve('mermaid/dist/mermaid.min.js');

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

          await renderMermaidDiagrams({ browser, distDir, logger });

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
 * Render every intermediate <pre class="mermaid"> in dist/blog to inline SVG.
 *
 * Markdown fences and sidebar frontmatter deliberately converge on the same
 * intermediate element, so this single build pass covers both paths. Mermaid
 * runs from the pinned local dependency inside the Chromium already used by
 * this integration; generated pages never load Mermaid or a third-party CDN.
 */
export async function renderMermaidDiagrams({ browser, distDir, logger }) {
  const blogDir = join(distDir, 'blog');
  let pagePaths;

  try {
    await stat(blogDir);
    pagePaths = (await findHtmlFiles(blogDir)).sort();
  } catch {
    logger.warn('No dist/blog directory found, skipping Mermaid rendering');
    return;
  }

  const diagramPages = [];
  for (const pagePath of pagePaths) {
    const htmlPath = join(blogDir, pagePath, 'index.html');
    const html = await readFile(htmlPath, 'utf8');
    const sourceBlocks = findMermaidSourceBlocks(html);
    if (sourceBlocks.length > 0) {
      diagramPages.push({ pagePath, htmlPath, html, sourceBlocks });
    }
  }

  if (diagramPages.length === 0) {
    logger.info('Rendered 0 Mermaid diagrams as static SVG');
    return;
  }

  const context = await browser.newContext();
  const rendererPage = await context.newPage();
  let diagramCount = 0;

  try {
    await rendererPage.addScriptTag({ path: MERMAID_BUNDLE_PATH });
    await rendererPage.evaluate(() => {
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        themeVariables: {
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
        },
      });
    });

    for (const { pagePath, htmlPath, html, sourceBlocks } of diagramPages) {
      const replacements = [];
      for (const [index, sourceBlock] of sourceBlocks.entries()) {
        const sourceMarkup = html.slice(sourceBlock.contentStart, sourceBlock.contentEnd);
        const source = JSDOM.fragment(sourceMarkup).textContent ?? '';
        const renderId = `mermaid-static-${diagramCount + 1}`;
        let svg;

        try {
          svg = await rendererPage.evaluate(
            async ({ id, definition }) => {
              const result = await window.mermaid.render(id, definition);
              return result.svg;
            },
            { id: renderId, definition: source },
          );
        } catch (error) {
          throw new Error(
            `Mermaid rendering failed for blog/${pagePath}/ diagram ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
            { cause: error },
          );
        }

        const fragment = JSDOM.fragment(svg);
        const renderedSvg = fragment.querySelector('svg');
        if (!renderedSvg) {
          throw new Error(`Mermaid returned no SVG for blog/${pagePath}/ diagram ${index + 1}`);
        }

        renderedSvg.classList.add('mermaid');
        renderedSvg.setAttribute('aria-hidden', 'true');
        renderedSvg.setAttribute('focusable', 'false');
        replacements.push({
          start: sourceBlock.start,
          end: sourceBlock.end,
          value: renderedSvg.outerHTML,
        });
        diagramCount += 1;
      }

      await writeFile(htmlPath, replaceRanges(html, replacements));
    }
  } finally {
    await context.close();
  }

  logger.info(`Rendered ${diagramCount} Mermaid diagrams as static SVG`);
}

/**
 * Locate the exact source ranges for the intermediate Mermaid elements without
 * parsing or reserializing the surrounding document. The plugin and sidebar
 * layout HTML-escape diagram definitions, so a literal closing pre tag safely
 * terminates each known intermediate block.
 */
function findMermaidSourceBlocks(html) {
  const blocks = [];
  const openingTagPattern = /<pre\b[^>]*>/gi;
  let openingMatch;

  while ((openingMatch = openingTagPattern.exec(html)) !== null) {
    const openingTag = openingMatch[0];
    const classMatch = openingTag.match(/\bclass\s*=\s*(["'])(.*?)\1/i);
    const classes = classMatch?.[2].split(/\s+/) ?? [];
    if (!classes.includes('mermaid')) continue;

    const closingTagPattern = /<\/pre\s*>/gi;
    closingTagPattern.lastIndex = openingTagPattern.lastIndex;
    const closingMatch = closingTagPattern.exec(html);
    if (closingMatch == null) {
      throw new Error('Mermaid source block is missing its closing </pre> tag');
    }

    blocks.push({
      start: openingMatch.index,
      contentStart: openingTagPattern.lastIndex,
      contentEnd: closingMatch.index,
      end: closingTagPattern.lastIndex,
    });
    openingTagPattern.lastIndex = closingTagPattern.lastIndex;
  }

  return blocks;
}

function replaceRanges(source, replacements) {
  let cursor = 0;
  let result = '';

  for (const replacement of replacements) {
    result += source.slice(cursor, replacement.start);
    result += replacement.value;
    cursor = replacement.end;
  }

  return result + source.slice(cursor);
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
