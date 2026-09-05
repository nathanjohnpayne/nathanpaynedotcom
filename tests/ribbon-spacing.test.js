import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { readBuiltStylesheet } from './helpers/dom.js';

// Guards the space above each panel's closing ribbon (#929 follow-up).
//
// Four panels end the same way: a hairline, a small-caps label, and a line of
// values — STACK (or, under #984's build switch, DOMAINS), SCOPE, LATEST POST,
// and About's LAST UPDATED. They are built alike and were spaced by whatever
// happened to sit above them: Builds got ~19px from its CTA's margin-bottom and
// About ~20px from a flex gap, both by accident of their neighbours; Community
// and Connect got the 5px tight-label step, because the element above each has
// no bottom margin at all.
//
// The ribbon owns the space now, which is the part that matters and the part
// these assertions pin. Spacing it from the neighbour instead does not work:
// a margin-bottom there COLLAPSES with the ribbon's margin-top for ordinary
// block siblings, yielding the larger of the two rather than their sum. That
// first attempt measured 14.4px in Community and Connect and 19.4px in Builds,
// whose CTA is an inline-block and so does not collapse — the same declaration
// producing two different gaps is exactly the accident being removed.
//
// Measured at 1503x1180, 1024x768, and 390x844: all four render 20px.

const SOURCE_CSS = readFileSync(resolve(__dirname, '../src/styles/global.css'), 'utf-8');
const builtCss = readBuiltStylesheet();

/** The declared value of a custom property on :root. */
function token(name) {
  const match = SOURCE_CSS.match(new RegExp(`${name}:\\s*([^;]+);`));
  expect(match, `${name} should be declared`).not.toBeNull();
  return match[1].trim();
}

/**
 * The body of the rule whose selector list is exactly `selector`.
 *
 * Matching `\n.effort-list {` would also hit the last line of a grouped
 * selector like `.social-stack,\n.project-list,\n.effort-list {`, and report
 * that block's declarations as the standalone rule's. The whole point here is
 * which rule carries the margin, so the selector list has to match in full.
 */
function rule(selector) {
  // Comments are stripped first: they sit between rules and contain no braces,
  // so the selector capture runs straight through them and the match would be
  // the comment text plus the selector.
  const withoutComments = SOURCE_CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, selectors, body] of withoutComments.matchAll(
    /(?:^|\n|\})\s*([^{}@][^{}]*?)\s*\{([^}]*)\}/g,
  )) {
    if (selectors.trim() === selector) return body;
  }
  expect.fail(`no rule whose full selector list is exactly \`${selector}\``);
}

describe('space above each panel-closing ribbon', () => {
  it('matches the gap About produces, so all four agree', () => {
    // About sets this space with a flex gap on its container and cannot take a
    // margin without doubling it, so its value is the fixed point the other
    // three have to meet rather than a number chosen freely.
    expect(token('--ribbon-space-above')).toBe('1.25rem');
    expect(token('--about-space-above-label')).toBe('1.25rem');
  });

  it('gives all four ribbons the space, in one rule', () => {
    // .blog-callout was a byte-identical copy of this rule. Sharing the
    // selector list is what stops the fourth ribbon drifting from the other
    // three again.
    // .domains-ribbon joined the list in #984, when it was one of two footer
    // lines behind a build switch; #991 settled that on DOMAINS and .stack-ribbon
    // left the list with the branch. It stays in the SHARED rule rather than
    // taking one of its own, which is the drift this selector exists to prevent.
    const body = rule('.domains-ribbon,\n.impact-ribbon,\n.now-ribbon,\n.blog-callout');
    expect(body).toMatch(/margin-top:\s*var\(--ribbon-space-above\)/);
    expect(body).toMatch(/border-top:\s*1px solid var\(--rule\)/);
  });

  it('lets the ribbon own the gap rather than the element above it', () => {
    // A margin-bottom on the neighbour collapses with the ribbon's margin-top
    // for block siblings, so the pair yields the larger of the two and not
    // their sum — 14.4px in Community and Connect, 19.4px in Builds, from one
    // declaration. Nothing above a ribbon should be opening this gap.
    for (const selector of ['.effort-list', '.social-stack']) {
      expect(rule(selector), `${selector} should not re-open the gap`).not.toMatch(
        /margin-bottom:\s*var\(--ribbon-space-above\)/,
      );
    }
    // #975 retired .projects-index-cta with the button it sized; the Projects
    // exit is a .ribbon-exit on the ribbon row now. Asserting the rule is
    // absent rather than deleting the line: `rule()` returns undefined for a
    // selector that is not there, and `undefined` satisfies `.not.toMatch`,
    // so the old assertion would have kept passing over a deleted rule and
    // said nothing.
    expect(SOURCE_CSS, '.projects-index-cta should be gone from the stylesheet').not.toMatch(
      /\.projects-index-cta/,
    );

    // The override that restated the old shared value verbatim is gone: it read
    // as a difference and was not one.
    expect(SOURCE_CSS).not.toMatch(/\n\.impact-ribbon \{[^}]*margin-top/);
  });

  it('keeps About spacing its ribbon by flex gap, with no margin to double', () => {
    // About is the one panel whose ribbon is a flex child, so it takes the gap
    // from the container and explicitly zeroes the shared margin. Giving it the
    // token as well would add the two together.
    expect(rule('.about-blocks .now-ribbon')).toMatch(/margin-top:\s*0/);
    expect(token('--about-space-above-label')).toBe('1.25rem');
  });

  it('survives the build', () => {
    // The token has to resolve in the emitted CSS, not just the source: a
    // custom property referenced but never declared fails silently to nothing.
    expect(builtCss).toMatch(/--ribbon-space-above:\s*1\.25rem/);
    expect(builtCss).toMatch(/var\(--ribbon-space-above\)/);
  });
});
