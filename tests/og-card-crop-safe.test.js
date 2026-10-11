import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, resolve } from 'path';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';

const ROOT = resolve(__dirname, '..');
const OG_CARD = resolve(ROOT, 'src/layouts/OgCard.astro');
const OG_TEMPLATES = resolve(ROOT, 'src/pages/og-templates');
const HOME_TEMPLATE = resolve(OG_TEMPLATES, 'home.astro');
const HOME_COPY = resolve(ROOT, 'src/content/site-copy/home.md');
const GLOBAL_CSS = resolve(ROOT, 'src/styles/global.css');

function ruleBody(selector) {
  const css = readFileSync(GLOBAL_CSS, 'utf-8');
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rule = css.match(new RegExp(`^${escaped} \\{([^}]*)\\}`, 'm'));
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

function findAstroFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return findAstroFiles(full);
    return entry.endsWith('.astro') ? [full] : [];
  });
}

// Link previews crop and round the image differently (#1095): X at 2:1,
// LinkedIn messaging at ~1.8:1, iMessage with ~30px corners at this scale. A
// frame (#1090) or a gray mat (#1094) near the edge survives on some sides and
// not others, and the framed blog cards showed a lopsided mat on X (#1292). So
// every card puts nothing that marks the edge there. These pin the stylesheet;
// the build's edge check (ogEdgeProblems, tests/og-fit.test.js) judges every
// rendered card.
describe('OG card edges', () => {
  it('runs every card full bleed: no stage margin, border or shadow', () => {
    const shell = ruleBody('.og-shell');
    expect(shell).not.toMatch(/padding/);
    expect(shell).toMatch(/width:\s*1200px;/);
    expect(shell).toMatch(/height:\s*630px;/);

    const card = ruleBody('.og-card');
    expect(card).not.toMatch(/border/);
    expect(card).not.toMatch(/box-shadow/);
    expect(card).toMatch(/width:\s*1200px;/);
    expect(card).toMatch(/height:\s*630px;/);
    // No outer --line track: the first and last tracks are cells, not frame.
    const columns = card
      .match(/grid-template-columns:\s*([^;]+);/)[1]
      .trim()
      .split(/\s+/);
    const rows = card
      .match(/grid-template-rows:\s*([^;]+);/)[1]
      .trim()
      .split(/\s+/);
    for (const tracks of [columns, rows]) {
      expect(tracks[0]).not.toBe('var(--line)');
      expect(tracks.at(-1)).not.toBe('var(--line)');
    }
  });

  it('gives no card a variant that brings the frame back', () => {
    const css = readFileSync(GLOBAL_CSS, 'utf-8');
    const ogRules = [...css.matchAll(/^(\.og-[^{]*)\{([^}]*)\}/gm)];
    expect(ogRules.length).toBeGreaterThan(10);
    for (const [, selector, body] of ogRules) {
      expect(body, selector).not.toMatch(/box-shadow|border(-width)?:/);
      // The shell itself, or a modifier of it; descendants like the hero's
      // .og-content may pad, since padding inside a cell is not at the edge.
      if (/^\.og-shell(--[\w-]+)?$/.test(selector.trim()))
        expect(body, selector).not.toMatch(/padding/);
    }
  });

  it('keeps text inside the safe zone every preview keeps', () => {
    // Wide-card crops take up to ~33px off a side; Slick Media's template puts
    // text at least ~70px in and ~55px from the top. The content cell starts at
    // the image's top-left corner. The rendered fit check (OG_SAFE_ZONE) is the
    // authority; these are the targets it measures against.
    const [top, , , left] = paddingOf(ruleBody('.og-content'));
    expect(left).toBeGreaterThanOrEqual(70);
    expect(top).toBeGreaterThanOrEqual(55);
    const [, , , heroLeft] = paddingOf(ruleBody('.og-shell--hero .og-content'));
    expect(heroLeft).toBeGreaterThanOrEqual(70);
  });

  it('renders no near-white cell, which reads as a missing corner on a white page', () => {
    const source = readFileSync(OG_CARD, 'utf-8');
    expect(source).not.toMatch(/og-white|og-paper/);
    const css = readFileSync(GLOBAL_CSS, 'utf-8');
    const blockRules = [...css.matchAll(/^\.og-[\w-]+ \{([^}]*)\}/gm)].map((m) => m[1]);
    for (const body of blockRules) expect(body).not.toMatch(/background:\s*var\(--paper\)/);
  });
});

describe('OG card hero variant', () => {
  it('lets OgCard opt into the hero modifier', () => {
    const source = readFileSync(OG_CARD, 'utf-8');

    expect(source).toMatch(/hero\?:\s*boolean;/);
    expect(source).toMatch(/'og-shell--hero':\s*hero/);
  });

  it('is used by the homepage card alone', () => {
    const heroUsers = findAstroFiles(OG_TEMPLATES)
      .filter((file) => /^\s*hero\s*$/m.test(readFileSync(file, 'utf-8')))
      .map((file) => relative(OG_TEMPLATES, file));
    expect(heroUsers).toEqual(['home.astro']);
  });

  it('renders the homepage card with a one-line tagline', () => {
    const source = readFileSync(HOME_TEMPLATE, 'utf-8');

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
});
