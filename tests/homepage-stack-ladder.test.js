import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { writeSanitizedDOM } from './helpers/dom.js';

// Guards the Selected Projects STACK degradation ladder (#930).
//
// The ribbon's usable width is set by the Mondrian square, and that square is
// sized from viewport HEIGHT — so one fixed list is one line on some desktops
// and two on others. The ladder ships all ten items and lets container queries
// drop the ones that will not fit.
//
// The fit itself was verified in a real browser (rung, rendered line count, and
// used width at 1024x768, 1280x700, 1440x900, 1503x1180, 1728x1005, 1920x1080,
// 2560x1330 — see the PR). What is checkable statically, and what actually
// drifts, is the pair the browser cannot re-derive: that the five rungs still
// fall out of the one DOM order, and that the CSS still expresses the ladder in
// rem against the ribbon's own container.

const DIST = resolve(__dirname, '../dist');
const SOURCE_CSS = readFileSync(resolve(__dirname, '../src/styles/global.css'), 'utf-8');

// Read the built stylesheet too: a rule the author wrote is not the same as a
// rule that survived Vite's minifier, and container queries are new enough here
// to be worth proving on both sides (the same reasoning as #640).
const astroDir = resolve(DIST, '_astro');
const builtCss = readFileSync(
  resolve(astroDir, readdirSync(astroDir).find((f) => f.endsWith('.css'))),
  'utf-8',
);

// Lightning CSS rewrites both halves of this feature into equivalent shorter
// forms: `container-type` + `container-name` collapse to the `container`
// shorthand, and `min-width:` becomes the range form `width>=`. Re-expanding
// them is pure re-serialization, so the dist assertions below still prove the
// authored rule survived the build rather than matching a looser pattern. Same
// reasoning as the aspect-ratio normalizer in tests/responsive-layout.js (#640).
function normalizeContainerSyntax(cssText) {
  return cssText
    .replace(/container:\s*([\w-]+)\s*\/\s*inline-size/g, 'container-name: $1; container-type: inline-size')
    .replace(/\(width>=\s*([\d.]+)em\)/g, '(min-width: $1em)');
}

const normalizedBuiltCss = normalizeContainerSyntax(builtCss);

// The rungs exactly as commissioned. Written out rather than generated, because
// generating them from the same array the page reads would assert nothing.
const EXPECTED_RUNGS = {
  10: [
    'TypeScript',
    'React',
    'Firebase',
    'Cloudflare Workers',
    'Playwright',
    'GitHub Actions',
    'Anthropic',
    'OpenAI',
    'Claude Code',
    'Codex',
  ],
  9: [
    'TypeScript',
    'React',
    'Firebase',
    'Cloudflare Workers',
    'GitHub Actions',
    'Anthropic',
    'OpenAI',
    'Claude Code',
    'Codex',
  ],
  8: [
    'TypeScript',
    'React',
    'Firebase',
    'Cloudflare Workers',
    'Anthropic',
    'OpenAI',
    'Claude Code',
    'Codex',
  ],
  7: ['TypeScript', 'React', 'Firebase', 'Anthropic', 'OpenAI', 'Claude Code', 'Codex'],
  6: ['TypeScript', 'React', 'Firebase', 'Anthropic', 'Claude Code', 'Codex'],
};

/** Every shipped item, in DOM order, with the shortest rung it survives to. */
function shippedItems() {
  return [...document.querySelectorAll('.stack-items .stack-item')].map((el) => ({
    label: el.textContent,
    tier: Number(el.getAttribute('data-stack-tier') ?? 6),
  }));
}

describe('Selected Projects STACK ladder (#930)', () => {
  beforeAll(() => {
    writeSanitizedDOM(readFileSync(resolve(DIST, 'index.html'), 'utf-8'));
  });

  it('ships every rung-10 item once, in order, inside the one ribbon', () => {
    const ribbons = document.querySelectorAll('.stack-ribbon .stack-items');
    expect(ribbons.length, 'STACK is a single ribbon on the homepage').toBe(1);
    expect(shippedItems().map((item) => item.label)).toEqual(EXPECTED_RUNGS[10]);
  });

  it.each([10, 9, 8, 7, 6])('renders the commissioned rung %i', (rung) => {
    const visible = shippedItems()
      .filter((item) => item.tier <= rung)
      .map((item) => item.label);

    expect(visible).toEqual(EXPECTED_RUNGS[rung]);
  });

  it('keeps every rung a subsequence of the one above it', () => {
    // This is the property that makes one DOM order enough. Without it a rung
    // could hold the right items in the wrong places, and each assertion above
    // would still pass on its own.
    const rungs = [10, 9, 8, 7, 6];
    for (let i = 1; i < rungs.length; i += 1) {
      const shorter = EXPECTED_RUNGS[rungs[i]];
      const longer = EXPECTED_RUNGS[rungs[i - 1]];
      let cursor = 0;
      for (const label of shorter) {
        cursor = longer.indexOf(label, cursor);
        expect(cursor, `${label} is out of order at rung ${rungs[i]}`).toBeGreaterThan(-1);
        cursor += 1;
      }
      expect(longer.length - shorter.length, 'rungs step by exactly one item').toBe(1);
    }
  });

  it('never hides the first item, so no separator is ever orphaned', () => {
    // The ` · ` separators are ::before pseudo-elements on every item but the
    // first. Hiding a leading item would leave the new first item drawing a
    // separator with nothing in front of it.
    expect(shippedItems()[0].tier).toBe(6);
    expect(SOURCE_CSS).toMatch(/\.stack-item:not\(:first-child\)::before \{\s*content: ' · ';/);
  });

  it('queries the line itself, not the viewport', () => {
    // A media query here would have to restate the Mondrian square's geometry —
    // which is driven by viewport height — and would still be wrong in the
    // stacked layout. The container has to be `.stack-items`, not its ribbon
    // wrapper: `em` in a container query resolves against the query container's
    // own font-size, and only `.stack-items` carries the font-size the items
    // are actually set in.
    expect(SOURCE_CSS).toMatch(
      /\n\.stack-items \{\s*container-type: inline-size;\s*container-name: stack;\s*\}/,
    );
    expect(normalizedBuiltCss).toMatch(/container-name:\s*stack/);
  });

  it('steps the tiers in on em thresholds, in ascending order', () => {
    // em, not px or rem. The stacked layout (<=1023px) re-sizes this line
    // fluidly and retunes its letter-spacing, so an absolute threshold that is
    // right on desktop admits a rung the larger stacked type cannot hold — it
    // put rung 9 on an iPad's 706px ribbon, which needs 721px, and wrapped.
    // In em the threshold moves with the type it is measuring.
    expect(SOURCE_CSS, 'thresholds must not be absolute').not.toMatch(
      /@container stack \(min-width:\s*[\d.]+(?:px|rem)\)/,
    );

    const thresholds = [
      ...normalizedBuiltCss.matchAll(/@container stack \(min-width:\s*([\d.]+)em\)/g),
    ].map((match) => Number.parseFloat(match[1]));

    expect(thresholds.length, 'one threshold per droppable tier').toBe(4);
    expect([...thresholds].sort((a, b) => a - b)).toEqual(thresholds);

    // Each threshold clears the rung it admits. Widths measured in the shipped
    // desktop typography, expressed in the item's own em — the desktop values
    // bind, because the stacked layout's tighter letter-spacing makes every
    // rung narrower in em than these.
    const measuredRungWidthsEm = { 7: 42.1, 8: 54.31, 9: 64.11, 10: 71.32 };
    [7, 8, 9, 10].forEach((rung, index) => {
      expect(thresholds[index], `rung ${rung} threshold must clear its own width`).toBeGreaterThan(
        measuredRungWidthsEm[rung],
      );
      // …without so much slack that it skips a rung that would have fit. The
      // top rung is the tight one: 72em admits it on the 787px ribbon of a
      // 1503x1180 window, this site's most common desktop viewport, where the
      // line itself measures 776px.
      expect(thresholds[index], `rung ${rung} threshold wastes a rung`).toBeLessThan(
        measuredRungWidthsEm[rung] + 1,
      );
    });
  });

  it('orders the queries after the rule they override', () => {
    // The `display: none` block and the `@container` rules that undo it have
    // equal specificity, so the tiers reappear on source order alone. Moving
    // the queries above the hiding rule collapses every viewport to rung 6 —
    // short rather than wrapped, so nothing would look broken enough to
    // notice. This is the assertion that notices.
    const hidesAt = SOURCE_CSS.indexOf("data-stack-tier='10'] {\n  display: none;");
    const firstQueryAt = SOURCE_CSS.indexOf('@container stack (');

    expect(hidesAt, 'the hiding rule should be findable').toBeGreaterThan(-1);
    expect(firstQueryAt, 'the container queries should be findable').toBeGreaterThan(-1);
    expect(firstQueryAt).toBeGreaterThan(hidesAt);
  });

  it('hides every droppable tier until its own query admits it', () => {
    const hidden = SOURCE_CSS.match(
      /((?:\.stack-item\[data-stack-tier='\d+'\],?\s*)+)\{\s*display: none;/,
    );
    expect(hidden, 'droppable tiers must start hidden').not.toBeNull();

    const hiddenTiers = [...hidden[1].matchAll(/data-stack-tier='(\d+)'/g)].map((m) => m[1]);
    expect(hiddenTiers).toEqual(['7', '8', '9', '10']);

    hiddenTiers.forEach((tier) => {
      expect(
        normalizedBuiltCss,
        `tier ${tier} is hidden with nothing to bring it back`,
      ).toMatch(new RegExp(`@container stack[^{]*\\{[^}]*data-stack-tier=.?${tier}.?\\]`));
    });
  });
});
