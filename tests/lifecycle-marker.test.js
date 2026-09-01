import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { relative, resolve } from 'path';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { STATUS_MARKER, stateMarkerClass } from '../src/lib/lifecycle-marker';

// The lifecycle marker vocabulary is shared by three surfaces: the homepage
// Builds row, the /projects/ card kicker, and the project detail page's STATUS
// cell. It used to be a copy-pasted literal per surface. These tests cover the
// module and, more importantly, guard against the copies coming back.

const SRC = resolve(__dirname, '../src');

describe('lifecycle marker vocabulary', () => {
  it('covers every status the projects collection can declare', () => {
    // Read the enum out of the schema rather than restating it, so a new
    // status fails here instead of shipping an unmapped mark.
    const config = readFileSync(resolve(SRC, 'content.config.ts'), 'utf-8');
    const enumMatch = config.match(
      /status:\s*z\.enum\(\[([^\]]*)\]\)/,
    );
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
