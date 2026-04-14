/**
 * Post-build assertions on dist/robots.txt.
 *
 * `npm test` runs `astro build && vitest run`, so by the time these tests
 * execute the `robots-sitemap` integration has already rewritten
 * dist/robots.txt. These tests guarantee:
 *
 *   1. dist/robots.txt has exactly one `Sitemap:` line.
 *   2. The declared sitemap URL matches a file that actually exists in
 *      dist/ at its final served path.
 *   3. The `User-agent: *` + `Allow: /` rules authored in
 *      public/robots.txt survive the integration's rewrite.
 *
 * If any of these fail, #163-style drift has returned. See #164.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve(__dirname, '../dist');
const robotsPath = resolve(distDir, 'robots.txt');

// Loaded inside beforeAll so that running `vitest` directly without
// first running `astro build` surfaces a clear "build output missing"
// assertion failure instead of a raw ENOENT stack trace. `npm test`
// runs the build for you.
let robotsTxt;

const SITEMAP_LINE_RE = /^Sitemap:\s*(.+)$/gim;

function extractSitemaps(text) {
  const urls = [];
  for (const match of text.matchAll(SITEMAP_LINE_RE)) {
    urls.push(match[1].trim());
  }
  return urls;
}

describe('dist/robots.txt (post-build)', () => {
  beforeAll(() => {
    expect(
      existsSync(robotsPath),
      `Build output not found at ${robotsPath}. ` +
        `Run \`npm run build\` (or \`npm test\`, which runs it for you) ` +
        `before invoking vitest directly.`
    ).toBe(true);
    robotsTxt = readFileSync(robotsPath, 'utf-8');
  });

  it('has exactly one Sitemap: line', () => {
    const urls = extractSitemaps(robotsTxt);
    expect(urls).toHaveLength(1);
  });

  it('declares an absolute https URL under nathanpayne.com', () => {
    const [url] = extractSitemaps(robotsTxt);
    expect(url).toMatch(/^https:\/\/nathanpayne\.com\/sitemap[^\s]*\.xml$/);
  });

  it('declares a sitemap URL whose file exists in dist/', () => {
    const [url] = extractSitemaps(robotsTxt);
    // Strip the origin to derive a dist-relative path
    const path = url.replace(/^https:\/\/nathanpayne\.com\//, '');
    const onDisk = resolve(distDir, path);
    expect(
      existsSync(onDisk),
      `robots.txt declares ${url} but ${onDisk} does not exist. ` +
        `This is exactly the class of bug #163 diagnosed.`
    ).toBe(true);
  });

  it('preserves the User-agent: * rule from public/robots.txt', () => {
    expect(robotsTxt).toMatch(/^User-agent:\s*\*/m);
  });

  it('preserves the Allow: / rule from public/robots.txt', () => {
    expect(robotsTxt).toMatch(/^Allow:\s*\//m);
  });
});
