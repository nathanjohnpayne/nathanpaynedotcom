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

// Resolve faces from their own name/OS2 metadata, never from the filename or the
// order Google Fonts happened to return. Every expected (family, weight) must be
// present exactly once or we stop: a wrong face here silently regenerates every
// master with the wrong typography.
const EXPECTED = {
  cg700: ['Cormorant Garamond', 700],
  cg600: ['Cormorant Garamond', 600],
  cg500: ['Cormorant Garamond', 500],
  cg400: ['Cormorant Garamond', 400],
  inter600: ['Inter', 600],
  inter500: ['Inter', 500],
  inter400: ['Inter', 400],
};
const SETUP = 'run scripts/brand/fetch-fonts.sh first (it downloads the Cormorant Garamond and Inter WOFFs into scripts/brand/.fonts).';
const woffs = fs.existsSync(fontsDir) ? fs.readdirSync(fontsDir).filter((f) => f.endsWith('.woff')) : [];
if (woffs.length === 0) throw new Error(`Fonts missing: ${SETUP}`);
const F = {};
for (const file of woffs) {
  const font = opentype.loadSync(path.join(fontsDir, file));
  // Google serves the family as e.g. "Cormorant Garamond Light SemiBold"; the
  // preferred-family name field (16) carries the bare family when present.
  const family = (font.names.preferredFamily?.en || font.names.fontFamily.en).replace(/ (Light|Medium|SemiBold|Bold)+$/, '');
  const weight = font.tables.os2.usWeightClass;
  const key = Object.keys(EXPECTED).find((k) => EXPECTED[k][0] === family && EXPECTED[k][1] === weight);
  if (!key) continue;
  if (F[key]) throw new Error(`Duplicate face for ${family} ${weight} in ${fontsDir} (${file}); clear the folder and ${SETUP}`);
  F[key] = font;
}
const missing = Object.keys(EXPECTED).filter((k) => !F[k]);
if (missing.length) {
  throw new Error(`Faces missing: ${missing.map((k) => EXPECTED[k].join(' ')).join(', ')}; ${SETUP}`);
}
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
