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

  it('folds the résumé link into NOW instead of giving it its own section', () => {
    expect(document.querySelector('.about-block--resume')).toBeNull();

    const link = document.querySelector('.about-block--now .about-resume-link');
    expect(link, 'résumé link should close the NOW block').not.toBeNull();
    expect(link.getAttribute('href')).toBe('/resume/');
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

    expect(above / below).toBeGreaterThanOrEqual(2.5);
  });

  it('caps the paragraph measure so lines stop running to the panel edge', () => {
    // 56ch of Inter's "0" advance renders ~73 characters here; the browser
    // check in the PR is what pins the character count.
    expect(CSS).toMatch(/\.about-block p \{[^}]*max-width:\s*56ch;/);
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
