/**
 * Smoke check: every og:image and twitter:image URL referenced by a
 * built HTML page resolves to a real asset in dist/.
 *
 * Existing SEO tests (tests/seo-metadata.test.js, tests/blog-pages.test.js)
 * assert that the OG tags are PRESENT and shaped correctly on specific
 * pages. They do NOT verify the URLs actually point at files that shipped.
 * That gap is what #163 exposed: the tags were fine on paper, the plumbing
 * behind them was not.
 *
 * This test walks dist/ for every index.html, parses each one, and for
 * each `<meta property="og:image">` and `<meta name="twitter:image">`
 * tag it resolves the referenced URL to a dist-relative path and asserts
 * the file is actually on disk.
 *
 * Rules enforced:
 *   - URL must be absolute (`https://nathanpayne.com/...`)
 *   - URL must resolve to a file that exists under dist/
 *   - Optional `?v=<hash>` cache-bust query strings are tolerated
 *     (see commit 49d2c39 for the rationale)
 *
 * If this test fails, either:
 *   (a) the page references an `og:image` URL that no file in dist/
 *       matches (broken pipeline — #163-class bug), or
 *   (b) you intentionally removed an OG image and forgot to update the
 *       page frontmatter / layout to stop referencing it.
 *
 * @see Issue #165 — Add SEO smoke checks for robots sitemap and OG image targets
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { JSDOM } from 'jsdom';

const distDir = resolve(__dirname, '../dist');
const SITE = 'https://nathanpayne.com';

/**
 * Walk a directory recursively and return every index.html file.
 */
function findIndexHtmlFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      results.push(...findIndexHtmlFiles(full));
    } else if (entry === 'index.html') {
      results.push(full);
    }
  }
  return results;
}

/**
 * Parse an HTML file and pull the content= value for each matching
 * meta selector. Returns an array of { tag, content } pairs.
 */
function extractImageMetas(htmlPath) {
  const html = readFileSync(htmlPath, 'utf-8');
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const out = [];
  for (const meta of doc.querySelectorAll(
    'meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"]',
  )) {
    const content = meta.getAttribute('content');
    if (content) {
      const which = meta.getAttribute('property') || meta.getAttribute('name');
      out.push({ tag: which, content });
    }
  }
  return out;
}

/**
 * Resolve an og:image / twitter:image URL to a path under dist/.
 * Returns null if the URL is not under the site origin OR if the
 * resolved path would escape the dist/ directory via path traversal.
 *
 * Uses the WHATWG URL parser (which normalizes `..` segments in the
 * pathname) and then double-checks containment with `path.relative`.
 * Belt and suspenders — see CodeRabbit review on #172.
 */
function urlToDistPath(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.origin !== SITE) return null;

  // Strip the leading slash from the pathname. Query string and
  // fragment are ignored — the ?v=<hash> cache-bust is intentional
  // and intentionally not matched against disk.
  const relPath = parsed.pathname.replace(/^\/+/, '');
  const resolved = resolve(distDir, relPath);

  // Containment check: `relative(distDir, resolved)` returns a path
  // that starts with `..` or is absolute if `resolved` escapes distDir.
  const relFromDist = relative(distDir, resolved);
  if (relFromDist.startsWith('..') || isAbsolute(relFromDist)) return null;

  return resolved;
}

// Discovered lazily inside beforeAll so the suite fails with a clear
// "build output missing" error rather than a readdir stack trace if
// someone runs vitest without first running `astro build`.
let htmlFiles = [];
let ogImageFindings = [];

describe('OG image targets (post-build)', () => {
  beforeAll(() => {
    expect(
      existsSync(distDir),
      `Build output not found at ${distDir}. ` +
        `Run \`npm run build\` (or \`npm test\`, which runs it for you) ` +
        `before invoking vitest directly.`,
    ).toBe(true);
    htmlFiles = findIndexHtmlFiles(distDir);
    ogImageFindings = htmlFiles.flatMap((htmlPath) =>
      extractImageMetas(htmlPath).map((meta) => ({ htmlPath, ...meta })),
    );
  });

  it('finds at least one built HTML page with an og:image tag', () => {
    // Sanity check: if the build collapses and produces zero pages with
    // og:image tags, something upstream is badly broken — we want a
    // noisy failure here, not an empty test suite passing.
    expect(htmlFiles.length).toBeGreaterThan(0);
    const ogImages = ogImageFindings.filter((f) => f.tag === 'og:image');
    expect(ogImages.length).toBeGreaterThan(0);
  });

  it('every page has an og:image tag', () => {
    const pagesWithoutOgImage = htmlFiles.filter((htmlPath) => {
      const metas = extractImageMetas(htmlPath);
      return !metas.some((m) => m.tag === 'og:image');
    });
    expect(
      pagesWithoutOgImage.map((p) => relative(distDir, p)),
      'These pages have no og:image meta tag. Add one to the page layout.',
    ).toEqual([]);
  });

  it('every og:image / og:image:secure_url / twitter:image URL is absolute https on nathanpayne.com', () => {
    const invalid = ogImageFindings.filter((f) => !f.content.startsWith(`${SITE}/`));
    expect(
      invalid.map((f) => ({
        page: relative(distDir, f.htmlPath),
        tag: f.tag,
        content: f.content,
      })),
      'These image tags are not absolute URLs under https://nathanpayne.com/.',
    ).toEqual([]);
  });

  it('every og:image / og:image:secure_url / twitter:image URL resolves to a file in dist/', () => {
    const broken = [];
    for (const finding of ogImageFindings) {
      const path = urlToDistPath(finding.content);
      if (!path) continue; // already covered by the absolute-URL test
      // Must exist AND be a regular file — a directory at the resolved
      // path would also pass existsSync and falsely satisfy the test.
      if (!existsSync(path) || !statSync(path).isFile()) {
        broken.push({
          page: relative(distDir, finding.htmlPath),
          tag: finding.tag,
          content: finding.content,
          expected: relative(distDir, path),
        });
      }
    }
    expect(
      broken,
      'These pages reference OG images that do not exist in dist/ ' +
        '(or resolve to a directory). This is the class of bug #163 ' +
        'diagnosed — verify the integration that generates OG images ' +
        'ran and wrote the expected filename.',
    ).toEqual([]);
  });

  it('og:image and twitter:image agree on the same URL within a page', () => {
    const mismatches = [];
    for (const htmlPath of htmlFiles) {
      const metas = extractImageMetas(htmlPath);
      const og = metas.find((m) => m.tag === 'og:image');
      const tw = metas.find((m) => m.tag === 'twitter:image');
      if (og && tw && og.content !== tw.content) {
        mismatches.push({
          page: relative(distDir, htmlPath),
          'og:image': og.content,
          'twitter:image': tw.content,
        });
      }
    }
    expect(mismatches, 'og:image and twitter:image should point at the same asset.').toEqual([]);
  });

  it('og:image:secure_url matches og:image when both are present', () => {
    const mismatches = [];
    for (const htmlPath of htmlFiles) {
      const metas = extractImageMetas(htmlPath);
      const og = metas.find((m) => m.tag === 'og:image');
      const secure = metas.find((m) => m.tag === 'og:image:secure_url');
      if (og && secure && og.content !== secure.content) {
        mismatches.push({
          page: relative(distDir, htmlPath),
          'og:image': og.content,
          'og:image:secure_url': secure.content,
        });
      }
    }
    expect(mismatches).toEqual([]);
  });
});
