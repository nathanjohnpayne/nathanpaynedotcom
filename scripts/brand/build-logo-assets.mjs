// Regenerates the NathanPayne.com logo system (SVG masters + PNG/ICO exports).
//
// One-off setup (none of this is a repo dependency):
//   scripts/brand/fetch-fonts.sh            # Cormorant Garamond + Inter WOFFs → scripts/brand/.fonts/
//   npm i --no-save opentype.js@1           # text → outlined paths
// Then:
//   node scripts/brand/build-logo-assets.mjs a public/images/brand
//
// Direction keys: a = Composition (shipped), b = Seal, c = Rule (the two unselected 2026-10 concepts).
// Rasterization uses sharp, which is already a dependency. See docs/brand-logo-usage.md.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { DIRECTIONS, iconSvg, horizontal, horizontalPlain, stacked, wordmark, svg } from './concepts.mjs';
import { P } from './lib.mjs';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const dirKey = process.argv[2] || 'a';
const OUT = process.argv[3];
if (!OUT) throw new Error('outDir required');
fs.mkdirSync(OUT, { recursive: true });
const D = DIRECTIONS[dirKey];

const TITLE = 'Nathan Payne';
const DESC_MARK = 'Monogram NP in a serif on a cream field, with red, yellow, black and blue planes divided by black lines, after the Mondrian grid of nathanpayne.com.';
const DESC_TILE = 'Cream field with red, yellow, black and blue planes divided by black lines, after the Mondrian grid of nathanpayne.com.';
const DESC_LOCKUP = 'The NP monogram tile beside the name Nathan Payne in a serif, with nathanpayne.com in small capitals.';
const DESC_WORD = 'The name Nathan Payne in a serif, with nathanpayne.com in small capitals.';

const files = {};
const write = (name, content) => { fs.writeFileSync(path.join(OUT, name), content); files[name] = content; };

// ---------- SVG masters ----------
const markBody = D.mark({});
const tileBody = D.small({});
const monoBody = D.mark({ mono: true });
const keyBody = markBody + `\n  <rect x="1" y="1" width="62" height="62" fill="none" stroke="${P.line}" stroke-width="2"/>`;

write('np-mark.svg', iconSvg(markBody, { title: `${TITLE} mark`, desc: DESC_MARK }));
write('np-mark-tile.svg', iconSvg(tileBody, { title: `${TITLE} tile`, desc: DESC_TILE }));
write('np-mark-keyline.svg', iconSvg(keyBody, { title: `${TITLE} mark, keyline`, desc: DESC_MARK + ' A thin black keyline frames the tile.' }));
write('np-mark-mono.svg', iconSvg(monoBody, { title: `${TITLE} mark, monochrome`, desc: DESC_MARK + ' One-color version: planes become tints of the ink.' }));

const H = horizontal(markBody); const HD = horizontal(markBody, { dark: true }); const HM = horizontal(monoBody);
const ST = stacked(markBody); const STD = stacked(markBody, { dark: true }); const STM = stacked(monoBody);
const W = wordmark(); const WD = wordmark({ dark: true });
write('np-lockup-horizontal.svg', svg({ ...H, title: `${TITLE} lockup`, desc: DESC_LOCKUP }));
write('np-lockup-horizontal-dark.svg', svg({ ...HD, title: `${TITLE} lockup, for dark backgrounds`, desc: DESC_LOCKUP }));
write('np-lockup-horizontal-mono.svg', svg({ ...HM, title: `${TITLE} lockup, monochrome`, desc: DESC_LOCKUP }));
write('np-lockup-stacked.svg', svg({ ...ST, title: `${TITLE} stacked lockup`, desc: DESC_LOCKUP }));
write('np-lockup-stacked-dark.svg', svg({ ...STD, title: `${TITLE} stacked lockup, for dark backgrounds`, desc: DESC_LOCKUP }));
write('np-lockup-stacked-mono.svg', svg({ ...STM, title: `${TITLE} stacked lockup, monochrome`, desc: DESC_LOCKUP }));
write('np-wordmark.svg', svg({ ...W, title: `${TITLE} wordmark`, desc: DESC_WORD }));
write('np-wordmark-dark.svg', svg({ ...WD, title: `${TITLE} wordmark, for dark backgrounds`, desc: DESC_WORD }));

// ---------- Raster helpers ----------
async function png(svgStr, { w, h, bg = null, name, pad = 0, fit = 'contain' }) {
  // Render the SVG at the target pixel size; librsvg scales vector exactly.
  const inner = { w: w - 2 * pad, h: h - 2 * pad };
  const m = /width="(\d+(?:\.\d+)?)" height="(\d+(?:\.\d+)?)"/.exec(svgStr);
  const sw = parseFloat(m[1]), sh = parseFloat(m[2]);
  const scale = Math.min(inner.w / sw, inner.h / sh);
  const rw = Math.round(sw * scale), rh = Math.round(sh * scale);
  const density = 72 * scale;
  const layer = await sharp(Buffer.from(svgStr), { density }).resize(rw, rh, { fit }).png().toBuffer();
  const base = sharp({ create: { width: w, height: h, channels: 4, background: bg || { r: 0, g: 0, b: 0, alpha: 0 } } });
  const buf = await base.composite([{ input: layer, left: Math.round((w - rw) / 2), top: Math.round((h - rh) / 2) }]).png({ compressionLevel: 9, palette: false }).toBuffer();
  fs.writeFileSync(path.join(OUT, name), buf);
  return buf;
}
const hex = (s) => ({ r: parseInt(s.slice(1, 3), 16), g: parseInt(s.slice(3, 5), 16), b: parseInt(s.slice(5, 7), 16), alpha: 1 });

// ---------- Mark PNGs ----------
const markSvg = files['np-mark.svg'], tileSvg = files['np-mark-tile.svg'];
const pngs = {};
for (const s of [16]) pngs[s] = await png(tileSvg, { w: s, h: s, name: `np-mark-${s}.png` });
for (const s of [32, 48, 64, 128, 180, 192, 256, 512, 1024]) pngs[s] = await png(markSvg, { w: s, h: s, name: `np-mark-${s}.png` });
await png(files['np-mark-mono.svg'], { w: 512, h: 512, name: 'np-mark-mono-512.png' });
await png(files['np-mark-keyline.svg'], { w: 512, h: 512, name: 'np-mark-keyline-512.png' });
// Alias, byte-identical to np-mark-180.png: the usage guide names it by job so the file is findable.
fs.copyFileSync(path.join(OUT, 'np-mark-180.png'), path.join(OUT, 'np-apple-touch-icon-180.png'));

// ---------- ICO (16 tile, 32, 48 with NP) ----------
function ico(entries) {
  const n = entries.length;
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(n, 4);
  const dir = Buffer.alloc(16 * n); let offset = 6 + 16 * n; const bufs = [];
  entries.forEach(({ size, buf }, i) => {
    dir.writeUInt8(size >= 256 ? 0 : size, i * 16); dir.writeUInt8(size >= 256 ? 0 : size, i * 16 + 1);
    dir.writeUInt8(0, i * 16 + 2); dir.writeUInt8(0, i * 16 + 3); dir.writeUInt16LE(1, i * 16 + 4); dir.writeUInt16LE(32, i * 16 + 6);
    dir.writeUInt32LE(buf.length, i * 16 + 8); dir.writeUInt32LE(offset, i * 16 + 12); offset += buf.length; bufs.push(buf);
  });
  return Buffer.concat([header, dir, ...bufs]);
}
fs.writeFileSync(path.join(OUT, 'np-favicon.ico'), ico([{ size: 16, buf: pngs[16] }, { size: 32, buf: pngs[32] }, { size: 48, buf: pngs[48] }]));

// ---------- Lockups ----------
const hl = files['np-lockup-horizontal.svg'], hd = files['np-lockup-horizontal-dark.svg'];
for (const w of [1600, 800]) {
  const h = Math.round(w * 0.3);
  await png(hl, { w, h, pad: Math.round(w * 0.05), bg: hex(P.paper), name: `np-lockup-horizontal-light-${w}.png` });
  await png(hd, { w, h, pad: Math.round(w * 0.05), bg: hex(P.ink), name: `np-lockup-horizontal-dark-${w}.png` });
  await png(hl, { w, h, pad: Math.round(w * 0.05), name: `np-lockup-horizontal-transparent-${w}.png` });
}
const sl = files['np-lockup-stacked.svg'], sd = files['np-lockup-stacked-dark.svg'];
await png(sl, { w: 1200, h: 1200, pad: 150, bg: hex(P.paper), name: 'np-lockup-stacked-light-1200.png' });
await png(sd, { w: 1200, h: 1200, pad: 150, bg: hex(P.ink), name: 'np-lockup-stacked-dark-1200.png' });
await png(sl, { w: 1200, h: 1200, pad: 150, name: 'np-lockup-stacked-transparent-1200.png' });
await png(files['np-wordmark.svg'], { w: 1600, h: 400, pad: 60, name: 'np-wordmark-transparent-1600.png' });

// ---------- Google Workspace organization logo: exactly 320×132, JPEG/PNG/GIF ----------
// Mark + name only (no eyebrow: at this size it would be 9px type).
const gw = horizontalPlain(markBody);
const gwCrop = svg({ ...gw, title: `${TITLE}`, desc: 'The NP monogram tile beside the name Nathan Payne.' });
write('np-google-workspace-lockup.svg', gwCrop);
await png(gwCrop, { w: 320, h: 132, pad: 10, bg: hex(P.paper), name: 'np-google-workspace-logo-320x132.png' });
await png(gwCrop, { w: 320, h: 132, pad: 10, name: 'np-google-workspace-logo-320x132-transparent.png' });
await png(gwCrop, { w: 640, h: 264, pad: 20, bg: hex(P.paper), name: 'np-google-workspace-logo-640x264.png' });

// ---------- Google Account profile picture: square, cropped to a circle in display ----------
await png(markSvg, { w: 720, h: 720, name: 'np-google-profile-720.png' });
await png(markSvg, { w: 1024, h: 1024, name: 'np-google-profile-1024.png' }); // alias of np-mark-1024.png, kept under the job name

// ---------- Social ----------
await png(hl, { w: 1200, h: 630, pad: 120, bg: hex(P.paper), name: 'np-social-1200x630.png' });
await png(sl, { w: 1080, h: 1080, pad: 160, bg: hex(P.paper), name: 'np-social-square-1080.png' });

// ---------- Report ----------
const report = fs.readdirSync(OUT).sort().map((f) => `${f}\t${fs.statSync(path.join(OUT, f)).size}`).join('\n');
console.log(report);
