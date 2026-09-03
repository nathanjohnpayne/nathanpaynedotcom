import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { writeSanitizedDOM } from './helpers/dom.js';

// Guards the About-panel section rhythm shipped for #659. The panel read as a
// single dense column because every eyebrow label sat nearly equidistant
// between the paragraph above it and the paragraph it introduced, and because
// the "View all writing" control was styled exactly like the five article
// links above it.
//
// The acceptance criteria were verified in a real browser (computed label
// margins and rendered line lengths at 1440x960 — see the PR). These tests are
// the regression guard for the parts that are checkable statically: the
// structure in the built HTML and the two rhythm properties in the stylesheet.

const DIST = resolve(__dirname, '../dist');
const CSS = readFileSync(resolve(__dirname, '../src/styles/global.css'), 'utf-8');

/** Resolve a rem-valued custom property from :root-adjacent CSS to pixels. */
function remProperty(name) {
  const match = CSS.match(new RegExp(`${name}:\\s*([\\d.]+)rem;`));
  expect(match, `${name} should be declared in rem`).not.toBeNull();
  return Number.parseFloat(match[1]) * 16;
}

describe('About panel section rhythm (#659)', () => {
  beforeEach(() => {
    writeSanitizedDOM(readFileSync(resolve(DIST, 'index.html'), 'utf-8'));
  });

  it('labels four sections, not five', () => {
    const labels = [...document.querySelectorAll('.panel--red .about-label')].map((el) =>
      el.textContent.trim(),
    );

    expect(labels).toEqual(['Context', 'Approach', 'Now', 'Writing']);
  });

  it('folds the résumé link into the end of NOW rather than onto its own line', () => {
    expect(document.querySelector('.about-block--resume')).toBeNull();

    const link = document.querySelector('.about-now-flow > .about-resume-link');
    expect(link, 'résumé link should close NOW inside its text flow').not.toBeNull();
    expect(link.getAttribute('href')).toBe('/resume/');

    // The link joins the last paragraph's line flow; the CSS that does it only
    // reaches the last paragraph, so a multi-paragraph now.md still sets
    // normally. An unlabelled line of its own read as a fifth section.
    expect(CSS).toMatch(/\.about-now-flow > p:last-of-type \{[^}]*display:\s*inline;/);
  });

  it('keeps the arrow on the two navigational exits and nowhere else', () => {
    const panel = document.querySelector('.panel--red');
    expect((panel.textContent.match(/→/g) || []).length).toBe(2);

    const owners = [...panel.querySelectorAll('.link-arrow')].map((arrow) =>
      arrow.closest('a')?.getAttribute('href'),
    );
    expect(owners.sort()).toEqual(['/blog/', '/resume/']);
  });

  it('gives "View all writing" a treatment it shares with no article link', () => {
    const all = document.querySelector('.writing-list__all');
    expect(all, '.writing-list__all missing').not.toBeNull();
    expect(all.getAttribute('href')).toBe('/blog/');

    const articleClasses = new Set(
      [...document.querySelectorAll('.writing-list__posts a')].flatMap((a) =>
        a.className.split(/\s+/).filter(Boolean),
      ),
    );
    const shared = all.className.split(/\s+/).filter((c) => c && articleClasses.has(c));

    expect(shared, '"View all writing" must not share a class with the article links').toEqual([]);
  });

  it('opens the space above each eyebrow label to at least 2.5x the space below', () => {
    const above = remProperty('--about-space-above-label');
    const below = remProperty('--about-space-below-label');

    // Asserted on the axis the criterion is written against: what a reader
    // sees is the margin PLUS the half-leading of both line boxes plus the
    // glyphs' unused ascent and descent. Leading contributes far more to the
    // small side than to the large one, so the bare margin ratio flatters the
    // rendered result — a 1.25rem/0.25rem pair reads 5:1 on margins and 2.3:1
    // on screen, which is how the first pass of #659 shipped a 1.67:1 gap
    // believing it was 3:1. These offsets are the leading contribution
    // measured in Chromium at 1440x960; they are stable for this pair of
    // fonts at these sizes, but NOT across a change to .about-block p's
    // line-height — half the paragraph's leading sits on each side of the
    // label, so raising it feeds straight into this ratio.
    //
    // The -0.25 / +1.0 are that feed, measured ink-to-ink in Chromium when
    // the leading went 1.5 -> 1.55 alongside the widening to 37rem. It lands
    // one-sided in the direction that hurts: the space below a label grew a
    // full pixel while the space above it shrank, taking this assertion from
    // 2.99 to 2.63 against a 2.5 floor. Per label the rendered ratios are
    // 4.29 (APPROACH), 3.00 (NOW) and 4.16 (WRITING) — NOW is the one to
    // watch. Anyone raising the leading again re-measures both constants
    // first; there is roughly one more step like this before the floor bites.
    const INK_ABOVE = 3.9 - 0.25;
    const INK_BELOW = 6.4 + 1.0;

    expect((above + INK_ABOVE) / (below + INK_BELOW)).toBeGreaterThanOrEqual(2.5);
  });

  it('declares the rhythm and measure tokens on the element that consumes them', () => {
    // Every consumer is .about-blocks or a descendant of it — .about-block,
    // .about-label, `.about-blocks .now-ribbon` — so the tokens travel with
    // the block that uses them. Declared a level up on .panel--red, lifting
    // .about-blocks out of the panel resolves all three to nothing and fails
    // silently in three directions: both measure caps revert to `none` and
    // their rules overshoot the prose, and the rhythm collapses to zero gaps.
    // A var() fallback would have rescued only the measure.
    const rule = CSS.match(/\n\.about-blocks \{([^}]*)\}/);
    expect(rule, '.about-blocks rule missing').not.toBeNull();

    for (const token of [
      '--about-space-above-label',
      '--about-space-below-label',
      '--about-measure',
    ]) {
      // `${token}:` matches the declaration and not the `var(${token})`
      // usages that also live in this rule body — a bare-name check passes
      // vacuously on `gap: var(--about-space-above-label)`.
      expect(rule[1], `${token} must be declared on .about-blocks`).toContain(`${token}:`);
    }
  });

  it('caps prose and rules at one shared measure', () => {
    // Declared in rem, not ch, because the cap is shared: `ch` resolves
    // against the using element's font-size, which is what left the hairlines
    // ~265px right of the prose they separate. 37rem averages 72.7 characters
    // per line where 33rem averaged 65.3; the browser check in the PR is what
    // pins the character count and the matching right edges, and it has to be
    // run with the About panel OPEN — about-focus gives the prose a 767px
    // column, the closed composition only 599px, and a measure read in the
    // closed state reports a bound that does not exist.
    //
    // The bound on this token is legibility, not layout: 41.25rem still fits
    // the panel, it just runs the average to 80.8 and the longest line to 93.
    expect(CSS).toMatch(/--about-measure:\s*37rem;/);
    expect(CSS).toMatch(/\.about-block \{[^}]*max-width:\s*var\(--about-measure\);/);
  });

  it('draws one horizontal rule, above LAST UPDATED, capped to the measure', () => {
    // Two rules 40px apart banded the exit link into a strip. The exit link
    // is differentiated by voice; the panel's one rule closes the content
    // before the timestamp, matching Community's and Builds' ribbons.
    expect(CSS).not.toMatch(/\.writing-list \.writing-list__all \{[^}]*border-top:/);
    expect(CSS).toMatch(/\.stack-ribbon,\n\.impact-ribbon,\n\.now-ribbon \{/);
    // The ribbon is a sibling of .about-block, so the block's cap does not
    // reach it — without this the rule overshoots the prose it closes.
    expect(CSS).toMatch(
      /\.about-blocks \.now-ribbon \{[^}]*max-width:\s*var\(--about-measure\);/,
    );
  });

  it('rests the panel links without an underline and takes it on hover', () => {
    const hoverRule = CSS.match(
      /\.writing-list \.writing-link:hover,[^{]*\{[^}]*text-decoration:\s*underline;[^}]*\}/,
    );
    expect(hoverRule, 'hover underline rule missing').not.toBeNull();

    // The resting state must not re-introduce one via the old selector.
    expect(CSS).not.toMatch(/\.writing-list \.p-name-link \{[^}]*text-decoration:\s*underline/);
  });
});
