// Three logo directions, built from the site's own geometry and type.
import { P, fonts, outline, svg, rect, pathEl } from './lib.mjs';

const L = 4; // grid line = 4 units on a 64 grid (1px at 16px favicon)

// ---------- Marks (64 × 64 unit space) ----------

/** A. Composition — the homepage/OG grid as a tile; NP sits in the cream field. */
export function markComposition({ withText = true, fieldFill = P.cream, textFill = P.ink, mono = false } = {}) {
  const c = mono ? monoPalette() : P;
  const out = [];
  out.push(rect(0, 0, 64, 64, fieldFill));
  out.push(rect(48, 0, 16, 44, c.red));
  out.push(rect(48, 48, 16, 16, c.blue));
  out.push(rect(0, 48, 24, 16, c.yellow));
  out.push(rect(28, 48, 16, 16, c.charcoal));
  out.push(rect(44, 0, L, 64, c.line)); // vertical line
  out.push(rect(0, 44, 64, L, c.line)); // horizontal line
  out.push(rect(24, 48, L, 16, c.line)); // divider between yellow and black
  if (withText) {
    const s = 24;
    const o = outline(fonts.cg600, 'NP', s);
    const bw = o.bbox.x2 - o.bbox.x1;
    const x = (44 - bw) / 2 - o.bbox.x1;
    const y = 22 + o.capHeight / 2;
    out.push(pathEl(o.d, textFill, x, y));
  }
  return out.join('\n');
}

/** B. Seal — the red plane carries the monogram; a structural strip of yellow/blue at right. */
export function markSeal({ withText = true, mono = false } = {}) {
  const c = mono ? monoPalette() : P;
  const out = [];
  out.push(rect(0, 0, 64, 64, c.red));
  out.push(rect(54, 0, 10, 30, c.yellow));
  out.push(rect(54, 34, 10, 30, c.blue));
  out.push(rect(50, 0, L, 64, c.line));
  out.push(rect(54, 30, 10, L, c.line));
  if (withText) {
    const s = 32;
    const o = outline(fonts.cg600, 'NP', s);
    const bw = o.bbox.x2 - o.bbox.x1;
    const x = (50 - bw) / 2 - o.bbox.x1;
    const y = 32 + o.capHeight / 2;
    out.push(pathEl(o.d, mono ? c.cream : P.cream, x, y));
  }
  return out.join('\n');
}

/** C. Rule — a single serif N against a ribbon of planes, wordmark-led. */
export function markRule({ withText = true, fieldFill = P.cream, textFill = P.ink, mono = false } = {}) {
  const c = mono ? monoPalette() : P;
  const out = [];
  out.push(rect(0, 0, 64, 64, fieldFill));
  out.push(rect(48, 0, 16, 24, c.red));
  out.push(rect(48, 28, 16, 16, c.yellow));
  out.push(rect(48, 48, 16, 16, c.blue));
  out.push(rect(44, 0, L, 64, c.line));
  out.push(rect(48, 24, 16, L, c.line));
  out.push(rect(48, 44, 16, L, c.line));
  if (withText) {
    const s = 44;
    const o = outline(fonts.cg600, 'N', s);
    const bw = o.bbox.x2 - o.bbox.x1;
    const x = (44 - bw) / 2 - o.bbox.x1;
    const y = 32 + o.capHeight / 2;
    out.push(pathEl(o.d, textFill, x, y));
  }
  return out.join('\n');
}

function monoPalette() {
  // One hue, tints by plane luminance: red/black → ink, blue → 72%, yellow → 26%.
  return { red: P.ink, ink: P.ink, charcoal: '#3b3935', line: P.ink, blue: '#5b5955', yellow: '#cfcbc0', cream: P.cream };
}

// ---------- Lockups ----------

/** Horizontal lockup: mark + name + eyebrow. */
export function horizontal(markBody, { dark = false, markSize = 64, gap = 22 } = {}) {
  const nameSize = 56;
  const name = outline(fonts.cg600, 'Nathan Payne', nameSize);
  const eye = outline(fonts.inter500, 'NATHANPAYNE.COM', 11.5, { tracking: 0.18 });
  const nameFill = dark ? P.cream : P.ink;
  const eyeFill = dark ? P.labelDark : P.label;
  const tx = markSize + gap;
  const nameW = name.bbox.x2 - name.bbox.x1;
  const w = tx + nameW + 4;
  const h = markSize;
  // Name cap top at ~9, baseline ~ 9+35 = 44; eyebrow baseline at 59.
  const body = [
    `  <g transform="scale(${markSize / 64})">`,
    markBody,
    `  </g>`,
    pathEl(name.d, nameFill, tx - name.bbox.x1, 9 + name.capHeight),
    pathEl(eye.d, eyeFill, tx - eye.bbox.x1, 61),
  ].join('\n');
  return { w: Math.ceil(w), h, body };
}

/** Mark + name only, name optically centred on the mark (Google Workspace logo, small badges). */
export function horizontalPlain(markBody, { dark = false, markSize = 64, gap = 20 } = {}) {
  const name = outline(fonts.cg600, 'Nathan Payne', 58);
  const tx = markSize + gap;
  const nameW = name.bbox.x2 - name.bbox.x1;
  const baseline = 32 + name.capHeight / 2;
  // Cap-height centring puts the descender of "y" below the 64-unit mark. Grow the
  // viewport symmetrically so nothing clips and the pair stays centred (#1108).
  const padY = Math.ceil(Math.max(0, baseline + name.bbox.y2 - 64, -(baseline + name.bbox.y1)));
  const body = [
    `  <g transform="translate(0 ${padY})">`,
    `  <g transform="scale(${markSize / 64})">`,
    markBody,
    `  </g>`,
    pathEl(name.d, dark ? P.cream : P.ink, tx - name.bbox.x1, baseline),
    `  </g>`,
  ].join('\n');
  return { w: Math.ceil(tx + nameW + 4), h: markSize + 2 * padY, body };
}

/** Stacked lockup: mark above centered name and eyebrow. */
export function stacked(markBody, { dark = false, markSize = 96 } = {}) {
  const nameSize = 48;
  const name = outline(fonts.cg600, 'Nathan Payne', nameSize);
  const eye = outline(fonts.inter500, 'NATHANPAYNE.COM', 11, { tracking: 0.18 });
  const nameFill = dark ? P.cream : P.ink;
  const eyeFill = dark ? P.labelDark : P.label;
  const nameW = name.bbox.x2 - name.bbox.x1;
  const eyeW = eye.bbox.x2 - eye.bbox.x1;
  const w = Math.ceil(Math.max(nameW, markSize) + 8);
  const nameBase = markSize + 22 + name.capHeight;
  const eyeBase = nameBase + 24;
  const h = Math.ceil(eyeBase + 4);
  const body = [
    `  <g transform="translate(${(w - markSize) / 2} 0) scale(${markSize / 64})">`,
    markBody,
    `  </g>`,
    pathEl(name.d, nameFill, (w - nameW) / 2 - name.bbox.x1, nameBase),
    pathEl(eye.d, eyeFill, (w - eyeW) / 2 - eye.bbox.x1, eyeBase),
  ].join('\n');
  return { w, h, body };
}

/** Wordmark only. */
export function wordmark({ dark = false } = {}) {
  const name = outline(fonts.cg600, 'Nathan Payne', 56);
  const eye = outline(fonts.inter500, 'NATHANPAYNE.COM', 11.5, { tracking: 0.18 });
  const nameW = name.bbox.x2 - name.bbox.x1;
  const body = [
    pathEl(name.d, dark ? P.cream : P.ink, -name.bbox.x1 + 2, 9 + name.capHeight),
    pathEl(eye.d, dark ? P.labelDark : P.label, -eye.bbox.x1 + 2, 61),
  ].join('\n');
  return { w: Math.ceil(nameW + 6), h: 64, body };
}

export const DIRECTIONS = {
  a: { key: 'a', name: 'A · Composition', blurb: 'The homepage grid as a tile. NP sits in the cream field; red, yellow, charcoal and blue planes hold the right and bottom edges, exactly where the OG card puts them.', mark: markComposition, small: (o) => markComposition({ ...o, withText: false }) },
  b: { key: 'b', name: 'B · Seal', blurb: 'An evolution of today\'s red favicon. The red plane carries a larger NP; a single ink rule and a yellow/blue strip give it the site\'s structure.', mark: markSeal, small: (o) => markSeal(o) },
  c: { key: 'c', name: 'C · Rule', blurb: 'Wordmark-led. One serif N against a ribbon of the three planes; the name does the work, the mark is a margin note.', mark: markRule, small: (o) => markRule(o) },
};

export function iconSvg(body, { title, desc, size = 64 }) {
  return svg({ w: size, h: size, vb: '0 0 64 64', body, title, desc });
}
export { svg };
