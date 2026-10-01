import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const OG_CARD = resolve(ROOT, 'src/layouts/OgCard.astro');
const HOME_TEMPLATE = resolve(ROOT, 'src/pages/og-templates/home.astro');
const GLOBAL_CSS = resolve(ROOT, 'src/styles/global.css');

// Safari's Start Page tiles crop OG images to ~1.67:1 and show them ~225pt
// wide. The homepage card uses the bleed variant so the crop trims colored
// blocks rather than the frame, and the name stays readable.
describe('OG card bleed variant', () => {
  it('lets OgCard opt into the bleed modifier', () => {
    const source = readFileSync(OG_CARD, 'utf-8');

    expect(source).toMatch(/bleed\?:\s*boolean;/);
    expect(source).toMatch(/'og-shell--bleed':\s*bleed/);
  });

  it('renders the homepage card as bleed with a one-line tagline', () => {
    const source = readFileSync(HOME_TEMPLATE, 'utf-8');

    expect(source).toMatch(/^\s*bleed\s*$/m);
    // The bleed tagline is `white-space: nowrap` inside an `overflow: hidden`
    // box, so a long one would be clipped silently rather than wrap. 60
    // characters fits the 1200px card at 30px Inter with room to spare.
    const tagline = source.match(/description="([^"]*)"/);
    expect(tagline).not.toBeNull();
    expect(tagline[1].length).toBeLessThanOrEqual(60);
  });

  it("keeps the bleed text inset deeper than Safari's side trim", () => {
    const css = readFileSync(GLOBAL_CSS, 'utf-8');
    const rule = css.match(/\.og-shell--bleed \.og-content \{([^}]*)\}/);
    expect(rule).not.toBeNull();

    // padding: top right bottom left — the 1200px card loses ~75px per side.
    const [, , , left] = rule[1]
      .match(/padding:\s*([^;]+);/)[1]
      .trim()
      .split(/\s+/);
    expect(parseInt(left, 10)).toBeGreaterThan(75);
  });
});
