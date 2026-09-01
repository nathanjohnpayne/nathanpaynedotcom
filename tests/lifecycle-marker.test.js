import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { STATUS_MARKER, stateMarkerClass } from '../src/lib/lifecycle-marker';

// The lifecycle marker vocabulary is shared by three surfaces: the homepage
// Builds row, the /projects/ card kicker, and the project detail page's STATUS
// cell. It used to be a copy-pasted literal per surface.
//
// This file covers the module's behaviour. The "no second copy in src/" guard
// that used to live here now runs from the registry in
// tests/helpers/single-source-guard.js, which applies it to all three shared
// modules through one implementation — and on a pipeline this copy did not
// have, since it neither stripped comment lines nor normalized path separators
// (#910). Keeping both would have been two guards to maintain and two places
// for them to diverge, in a change whose whole point is that there should be
// one.

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

});
