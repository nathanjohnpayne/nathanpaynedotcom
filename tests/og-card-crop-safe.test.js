import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';

const ROOT = resolve(__dirname, '..');
const OG_CARD = resolve(ROOT, 'src/layouts/OgCard.astro');
const HOME_TEMPLATE = resolve(ROOT, 'src/pages/og-templates/home.astro');
const HOME_COPY = resolve(ROOT, 'src/content/site-copy/home.md');
const GLOBAL_CSS = resolve(ROOT, 'src/styles/global.css');

function cropSafeRule(selector) {
  const css = readFileSync(GLOBAL_CSS, 'utf-8');
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = css.match(new RegExp(`${escaped} \\{([^}]*)\\}`));
  expect(rule, `${selector} rule`).not.toBeNull();
  return rule[1];
}

// padding shorthand → [top, right, bottom, left] in px.
function paddingOf(body) {
  const parts = body
    .match(/padding:\s*([^;]+);/)[1]
    .trim()
    .split(/\s+/)
    .map((v) => parseInt(v, 10));
  const [t, r = t, b = t, l = r] = parts;
  return [t, r, b, l];
}

// Link previews crop and round the image differently (#1095): X at 2:1,
// LinkedIn messaging at ~1.8:1, iMessage with ~30px corners at this scale. A
// frame (#1090) or a gray mat (#1094) near the edge survives on some sides and
// not others, so the crop-safe card puts nothing that marks the edge there.
describe('OG card crop-safe variant', () => {
  it('lets OgCard opt into the crop-safe modifier', () => {
    const source = readFileSync(OG_CARD, 'utf-8');

    expect(source).toMatch(/cropSafe\?:\s*boolean;/);
    expect(source).toMatch(/'og-shell--crop-safe':\s*cropSafe/);
  });

  it('renders the homepage card crop-safe with a one-line tagline', () => {
    const source = readFileSync(HOME_TEMPLATE, 'utf-8');

    expect(source).toMatch(/^\s*cropSafe\s*$/m);
    // The tagline is `white-space: nowrap` inside an `overflow: hidden` box, so
    // a long one is clipped rather than wrapped. The build's rendered-fit gate
    // measures this for real (#1093); the cap is the cheap early warning.
    // The tagline is the named share-card variant in site copy (#1166), so the
    // cap applies to that field and the template must be what reads it.
    expect(source).toMatch(/description=\{shareImageDescription\}/);
    const tagline = parseFrontmatter(readFileSync(HOME_COPY, 'utf-8')).shareImageDescription;
    expect(tagline).toBeTruthy();
    expect(tagline.length).toBeLessThanOrEqual(55);
  });

  it('puts no stage margin, border or shadow at the image edge', () => {
    expect(paddingOf(cropSafeRule('.og-shell--crop-safe'))).toEqual([0, 0, 0, 0]);

    const card = cropSafeRule('.og-shell--crop-safe .og-card');
    expect(card).toMatch(/border:\s*0;/);
    expect(card).toMatch(/box-shadow:\s*none;/);
    expect(card).toMatch(/width:\s*1200px;/);
    expect(card).toMatch(/height:\s*630px;/);
  });

  it('keeps the text inside the safe zone every preview keeps', () => {
    // Wide-card crops take up to ~33px off a side; Slick Media's template puts
    // text at least ~70px in. The content cell starts at the image's left edge.
    const [, , , left] = paddingOf(cropSafeRule('.og-shell--crop-safe .og-content'));
    expect(left).toBeGreaterThanOrEqual(70);
  });
});
