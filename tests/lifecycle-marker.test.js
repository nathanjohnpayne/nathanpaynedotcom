import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { relative, resolve } from 'path';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { STATUS_MARKER, stateMarkerClass } from '../src/lib/lifecycle-marker';
import { readBuiltStylesheet } from './helpers/dom.js';
import { builtPrintBlocks, withoutPrintBlocks } from './helpers/print-css.js';

// The lifecycle marker vocabulary is shared by four surfaces: the homepage
// Builds row, the /projects/ card kicker, the project detail page's STATUS
// cell, and the résumé's Projects kicker (#944). It used to be a copy-pasted
// literal per surface. These tests cover the module and, more importantly,
// guard against the copies coming back.

const SRC = resolve(__dirname, '../src');

describe('lifecycle marker vocabulary', () => {
  it('covers every status the projects collection can declare', () => {
    // Read the enum out of the schema rather than restating it, so a new
    // status fails here instead of shipping an unmapped mark.
    const config = readFileSync(resolve(SRC, 'content.config.ts'), 'utf-8');
    const enumMatch = config.match(/status:\s*z\.enum\(\[([^\]]*)\]\)/);
    expect(enumMatch, 'could not find the project status enum').not.toBeNull();
    const statuses = [...enumMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(statuses.length).toBeGreaterThan(0);
    for (const status of statuses) {
      expect(Object.hasOwn(STATUS_MARKER, status), `no mark mapped for ${status}`).toBe(true);
    }
  });

  it('maps each status to its own modifier', () => {
    expect(STATUS_MARKER).toEqual({
      SHIPPED: 'shipped',
      ARCHIVED: 'archived',
      PAUSED: 'paused',
      EXPERIMENT: 'experiment',
      'IN PROGRESS': 'in-progress',
    });
    // ARCHIVED (cored ring) and PAUSED (bare outline) must stay distinct: the
    // whole reason the cored variant exists is that a closed history is not a
    // project merely set down.
    expect(STATUS_MARKER.ARCHIVED).not.toBe(STATUS_MARKER.PAUSED);
  });

  it('keeps each surface class list, then appends the mark', () => {
    expect(stateMarkerClass('SHIPPED', 'p-status')).toBe(
      'p-status state-marker state-marker--shipped',
    );
    expect(stateMarkerClass('ARCHIVED', 'post-meta', 'project-status')).toBe(
      'post-meta project-status state-marker state-marker--archived',
    );
    expect(stateMarkerClass('EXPERIMENT', 'metadata-strip__status')).toBe(
      'metadata-strip__status state-marker state-marker--experiment',
    );
  });

  it('falls through to the bare outline for an unmapped status', () => {
    // Not an error: an unknown status is "nothing is running yet", which the
    // bare `.state-marker` outline says correctly.
    expect(stateMarkerClass('SOMETHING NEW', 'p-status')).toBe('p-status state-marker');
    expect(stateMarkerClass('SHIPPED')).toBe('state-marker state-marker--shipped');
  });

  it('is the only place src/ declares a status→marker mapping', () => {
    // The residue guard. Every surface that shows lifecycle must import this
    // module; a second literal is how two surfaces start disagreeing about
    // what ARCHIVED looks like without failing a build.
    const offenders = findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f))
      .filter((f) => relative(SRC, f) !== 'lib/lifecycle-marker.ts')
      .filter((f) => /STATUS_MARKER\s*[:=]|state-marker--\$\{/.test(readFileSync(f, 'utf-8')))
      .map((f) => relative(SRC, f));
    expect(offenders, 'status→marker mapping duplicated outside lifecycle-marker.ts').toEqual([]);
  });

  it('every surface that renders a lifecycle status imports the shared helper', () => {
    // The control for the guard above: prove the search can find something.
    // A zero-hit assertion on "no duplicates" is worthless if the same walk
    // never reaches these files in the first place.
    const surfaces = [
      'pages/index.astro',
      'pages/projects/index.astro',
      'components/MetadataStrip.astro',
      'components/resume/ProjectsSection.astro',
    ];
    const walked = findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f)).map((f) =>
      relative(SRC, f),
    );
    for (const surface of surfaces) {
      expect(walked, `the residue walk never reached ${surface}`).toContain(surface);
      expect(
        readFileSync(resolve(SRC, surface), 'utf-8'),
        `${surface} does not import the shared marker vocabulary`,
      ).toMatch(/from '[./]*lib\/lifecycle-marker'/);
    }
  });
});

/**
 * The vocabulary has to survive the printer too (#950).
 *
 * Three of the four marks ARE CSS backgrounds — filled for SHIPPED, cored for
 * ARCHIVED, half-filled for EXPERIMENT — and only the 1px outline is a border.
 * Chrome's print dialog leaves "Background graphics" OFF by default, so
 * without an explicit `print-color-adjust: exact` every state prints as the
 * empty square PAUSED uses: right size, right place, four states collapsed
 * into one.
 *
 * This is asserted against the emitted stylesheet rather than a rendered file
 * because no build artifact can decide it. The only printed output this repo
 * generates is the résumé PDF, and it is written with `printBackground: true`,
 * which paints the same fills on its own — so the file is identical whether or
 * not this rule exists (tests/helpers/pdf-oracle.js
 * § filledLifecycleMarksPerPage). The path the rule exists for is a reader
 * pressing Cmd-P, which produces nothing to read back.
 *
 * The effect itself was measured, not assumed: `/`, `/projects/` and the four
 * project detail pages were rendered to PDF with `printBackground: false`,
 * with and without the rule. The two rasters differ in exactly the six mark
 * squares whose fill is a background and are pixel-identical everywhere else,
 * across all 60 printed pages (3 + 3 + 16 + 11 + 10 + 17).
 */
describe('lifecycle marker — print fidelity', () => {
  it('pins the marks to print their fills, on every surface', () => {
    const block = builtPrintBlocks().find((b) => b.includes('state-marker'));
    expect(block, 'no @media print block sets anything on .state-marker').toBeTruthy();
    expect(block, 'the lifecycle marks are not pinned to print their fills').toMatch(
      /print-color-adjust:\s*exact/,
    );
  });

  it('scopes that rule to the mark itself, not to one surface and not to the page', () => {
    // Both halves matter, and they pull in opposite directions.
    //
    // Too narrow — `.resume-canvas .state-marker::before`, which is where this
    // rule lived from #944 until #950 — and the homepage Builds row, the
    // /projects/ card kicker and the detail page's STATUS cell keep collapsing
    // to one shape. That is the same failure the shared status→modifier module
    // above exists to prevent, in a different medium: one surface quietly
    // disagreeing with the others about what ARCHIVED looks like.
    //
    // Too wide — `exact` on a page, a shell or a wildcard — and it stops being
    // a property of the mark and becomes a print-cascade decision for pages
    // that have no print cascade, which is the cost #950 had to rule out
    // before unscoping. `print-color-adjust` affects the element it is set on,
    // so keeping the selector on the 0.72em mark is what bounds it.
    //
    // Every print block, not the first one that mentions the mark: a second,
    // narrower copy added later would sit behind the correct one and never be
    // reached by a `.find()`. That is how the duplicate this fix removed got
    // in — see the status→modifier residue guard above, same failure mode.
    const rules = builtPrintBlocks().flatMap((block) =>
      [...block.matchAll(/([^{}]*)\{[^{}]*print-color-adjust:\s*exact[^{}]*\}/g)]
        .map((m) => m[1].trim())
        .filter((sel) => sel.includes('state-marker')),
    );
    expect(rules, 'no @media print rule pins the marks to print their fills').toHaveLength(1);

    for (const selector of rules[0].split(',').map((sel) => sel.trim())) {
      // Exact, not a prefix. A pattern like /^\.state-marker[^\s]*::?before$/
      // reads as "starts with the primitive" and passes
      // `.state-marker.resume-entry__status::before` — a compound qualifier is
      // a per-surface narrowing with no descendant combinator to give it away,
      // so a whitespace-token count does not see it either. It also passes
      // `.state-marker--shipped::before`, which would print one state's fill
      // and leave the other three collapsed. Both are the regression this test
      // exists for. (Codex, #952.)
      //
      // Single colon: the minifier emits the legacy `:before` form.
      expect(
        selector,
        `${selector} is not the bare primitive — a qualifier here, whether an ` +
          'ancestor, a second class, or a --modifier, puts the mark back on one surface',
      ).toMatch(/^\.state-marker::?before$/);
    }
  });

  it('does not leak print-color-adjust into the screen cascade', () => {
    // The screen never needs it, and a copy outside @media print is how the
    // rule survives someone deleting the print block it was meant to live in.
    const screenCascade = withoutPrintBlocks(readBuiltStylesheet());
    // Control: a "no match" result means nothing unless the same string is
    // where the mark rules actually live.
    expect(screenCascade, 'the screen cascade does not declare .state-marker at all').toContain(
      '.state-marker',
    );
    expect(screenCascade, 'print-color-adjust on .state-marker escaped @media print').not.toMatch(
      /\.state-marker[^{}]*\{[^{}]*print-color-adjust/,
    );
  });
});
