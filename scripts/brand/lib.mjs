// Shared helpers: fonts → outlined path data, palette, SVG assembly.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// Not a repo dependency: install ad hoc with `npm i --no-save opentype.js@1` before regenerating.
const opentype = require('opentype.js');
const here = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.join(here, '.fonts');
if (!fs.existsSync(path.join(fontsDir, 'f7.woff'))) {
  throw new Error('Fonts missing: run scripts/brand/fetch-fonts.sh first (downloads Cormorant Garamond and Inter WOFFs from Google Fonts into scripts/brand/.fonts).');
}

export const P = {
  // 1930 register (homepage) — the brand's high-chroma planes
  red: '#da2418',
  yellow: '#f0c800',
  blue: '#0a5c9e',
  ink: '#11100d',
  charcoal: '#333333', // --accent-black: the homepage and OG card black plane, kept off the grid-line ink
  cream: '#f5f0e4',
  paper: '#ffffff',
  gray: '#dde1e5',
  line: '#1a1814',
  label: '#6b6861', // eyebrow on light; ~ink 62%
  labelDark: '#b9b3a4',
};

const F = {
  cg700: opentype.loadSync(path.join(fontsDir, 'f1.woff')),
  cg600: opentype.loadSync(path.join(fontsDir, 'f2.woff')),
  cg500: opentype.loadSync(path.join(fontsDir, 'f3.woff')),
  cg400: opentype.loadSync(path.join(fontsDir, 'f4.woff')),
  inter600: opentype.loadSync(path.join(fontsDir, 'f5.woff')),
  inter500: opentype.loadSync(path.join(fontsDir, 'f6.woff')),
  inter400: opentype.loadSync(path.join(fontsDir, 'f7.woff')),
};
export const fonts = F;

/** Outline `text` at `size`; returns {d, width, bbox} with baseline at y=0, origin x=0. tracking in em. */
export function outline(font, text, size, { tracking = 0 } = {}) {
  const glyphs = font.stringToGlyphs(text);
  let x = 0;
  const parts = [];
  const scale = size / font.unitsPerEm;
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const p = g.getPath(x, 0, size);
    parts.push(p.toPathData(3));
    x += g.advanceWidth * scale;
    if (i < glyphs.length - 1) {
      x += font.getKerningValue(g, glyphs[i + 1]) * scale;
      x += tracking * size;
    }
  }
  // bbox via a merged path
  const merged = font.getPath(text, 0, 0, size, { kerning: true, letterSpacing: tracking });
  const bb = merged.getBoundingBox();
  return { d: parts.join(' '), width: x, bbox: bb, capHeight: capHeight(font, size) };
}

export function capHeight(font, size) {
  const H = font.charToGlyph('H').getPath(0, 0, size).getBoundingBox();
  return -H.y1;
}

export function measure(font, text, size, opts) {
  return outline(font, text, size, opts).width;
}

export const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function svg({ w, h, body, title, desc, vb }) {
  const viewBox = vb || `0 0 ${w} ${h}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${w}" height="${h}" role="img" aria-labelledby="t d">\n  <title id="t">${esc(title)}</title>\n  <desc id="d">${esc(desc)}</desc>\n${body}\n</svg>\n`;
}

export const rect = (x, y, w, h, fill, extra = '') =>
  `  <rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}" fill="${fill}"${extra}/>`;
export const pathEl = (d, fill, tx = 0, ty = 0, extra = '') =>
  `  <path d="${d}" fill="${fill}" transform="translate(${r(tx)} ${r(ty)})"${extra}/>`;
const r = (n) => Math.round(n * 1000) / 1000;
