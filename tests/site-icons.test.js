/**
 * Site icons and the OG card mark come from the logo system (#1110).
 *
 * The favicon, PNG favicon, Apple touch icon, and .ico keep their stable root
 * paths because browsers, bookmarks, and feed readers have them cached, so
 * they are copies of files in public/images/brand/ rather than links to it.
 * A copy can drift when the brand assets are regenerated; this suite fails
 * when one does, and when a head link or manifest icon stops resolving.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { JSDOM } from 'jsdom';

const ROOT = resolve(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const BRAND = join(PUBLIC, 'images/brand');
const DIST = join(ROOT, 'dist');

// Root path → the brand file it must be a byte-for-byte copy of.
const ROOT_COPIES = {
  'favicon.svg': 'np-mark.svg',
  'favicon-32x32.png': 'np-mark-32.png',
  'apple-touch-icon.png': 'np-mark-180.png',
  'favicon.ico': 'np-favicon.ico',
};

function distFile(href) {
  return join(DIST, decodeURIComponent(new URL(href, 'https://nathanpayne.com').pathname));
}

function pngSize(file) {
  const buf = readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('site icons', () => {
  it.each(Object.entries(ROOT_COPIES))('public/%s is a copy of brand/%s', (root, brand) => {
    expect(readFileSync(join(PUBLIC, root)).equals(readFileSync(join(BRAND, brand)))).toBe(true);
  });

  it('the .ico carries 16, 32, and 48 entries', () => {
    const ico = readFileSync(join(PUBLIC, 'favicon.ico'));
    const count = ico.readUInt16LE(4);
    const sizes = Array.from({ length: count }, (_, i) => ico.readUInt8(6 + 16 * i));
    expect(sizes.sort((a, b) => a - b)).toEqual([16, 32, 48]);
  });

  describe('built head', () => {
    const doc = new JSDOM(readFileSync(join(DIST, 'index.html'), 'utf-8')).window.document;
    const hrefs = (selector) =>
      [...doc.querySelectorAll(selector)].map((l) => l.getAttribute('href'));

    it('links the .ico, SVG, PNG, Apple touch icon, and manifest once each', () => {
      expect(hrefs('link[rel="icon"]').sort()).toEqual(
        ['/favicon-32x32.png', '/favicon.ico', '/favicon.svg'].sort(),
      );
      expect(hrefs('link[rel="apple-touch-icon"]')).toEqual(['/apple-touch-icon.png']);
      expect(hrefs('link[rel="manifest"]')).toEqual(['/site.webmanifest']);
    });

    it('every icon and manifest link resolves to a file in dist/', () => {
      for (const href of hrefs(
        'link[rel="icon"], link[rel="apple-touch-icon"], link[rel="manifest"]',
      )) {
        expect(existsSync(distFile(href)) && statSync(distFile(href)).isFile(), href).toBe(true);
      }
    });
  });

  describe('web app manifest', () => {
    const manifest = JSON.parse(readFileSync(join(PUBLIC, 'site.webmanifest'), 'utf-8'));

    it('points at the brand folder rather than copies', () => {
      expect(manifest.icons.map((i) => i.src)).toEqual([
        '/images/brand/np-mark-192.png',
        '/images/brand/np-mark-512.png',
      ]);
    });

    it.each(manifest.icons.map((i) => [i.src, i.sizes]))('%s is really %s', (src, sizes) => {
      const { width, height } = pngSize(distFile(src));
      expect(`${width}x${height}`).toBe(sizes);
    });
  });
});

describe('OG card mark', () => {
  const source = readFileSync(join(ROOT, 'src/layouts/OgCard.astro'), 'utf-8');

  it('inlines np-mark.svg from the brand folder, so Playwright needs no network', () => {
    expect(source).toMatch(/'images',\s*'brand',\s*'np-mark\.svg'/);
    expect(source).toMatch(
      /<div class="og-mark" aria-hidden="true"><Fragment set:html=\{npMark\} \/><\/div>/,
    );
  });

  it('sits outside .og-content, where the fit check and the heading cannot reach it', () => {
    const content = source.indexOf('<div class="og-content">');
    const contentEnd = source.indexOf('</div>', source.indexOf('{meta &&'));
    const mark = source.indexOf('<div class="og-mark"');
    expect(content).toBeGreaterThan(-1);
    expect(mark).toBeGreaterThan(contentEnd);
  });
});
