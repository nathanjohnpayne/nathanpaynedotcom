import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const OG_CARD = resolve(ROOT, 'src/layouts/OgCard.astro');
const HOME_TEMPLATE = resolve(ROOT, 'src/pages/og-templates/home.astro');
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

// Safari's Start Page tiles crop OG images to ~1.67:1 and show them ~225pt
// wide; iMessage rounds their corners. The homepage card uses the crop-safe
// variant so neither crop reaches the frame or the text.
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
    const tagline = source.match(/description="([^"]*)"/);
    expect(tagline).not.toBeNull();
    expect(tagline[1].length).toBeLessThanOrEqual(55);
  });

  it('keeps a stage margin that clears rounded preview corners', () => {
    // A frame clears a rounded corner once the margin exceeds ~0.3× the
    // radius: ~30px (iMessage) and ~65px (Safari tile) at the 1200px scale.
    const [top, right, bottom, left] = paddingOf(cropSafeRule('.og-shell--crop-safe'));
    for (const side of [top, right, bottom, left]) {
      expect(side).toBeGreaterThanOrEqual(20);
    }
    // The card's 14px --canvas-shadow falls right and down; those margins hold
    // it and still leave gray beyond it for the corner to round.
    expect(right - 14).toBeGreaterThanOrEqual(20);
    expect(bottom - 14).toBeGreaterThanOrEqual(20);
  });

  it("keeps the text inset deeper than Safari's side trim", () => {
    // Safari trims ~75px off each side of the 1200px card; the text starts at
    // the stage margin plus the content inset.
    const [, , , margin] = paddingOf(cropSafeRule('.og-shell--crop-safe'));
    const [, , , inset] = paddingOf(cropSafeRule('.og-shell--crop-safe .og-content'));
    expect(margin + inset).toBeGreaterThan(75);
  });
});
