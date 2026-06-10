import { describe, it, expect } from 'vitest';
import { sep } from 'node:path';
import { containedJoin } from '../scripts/lib/contain-path.mjs';

// #456: screenshotSrc values from frontmatter must not be able to direct
// writes outside public/. The helper is the single containment gate.
describe('containedJoin', () => {
  const base = `${sep}repo${sep}public`;

  it('resolves a normal asset path inside the base', () => {
    expect(containedJoin(base, '/images/projects/x-hero.png')).toBe(
      `${base}${sep}images${sep}projects${sep}x-hero.png`,
    );
  });

  it('rejects direct parent traversal', () => {
    expect(containedJoin(base, '/../secrets.txt')).toBeNull();
  });

  it('rejects traversal buried in a nested path', () => {
    expect(containedJoin(base, '/images/../../../etc/passwd')).toBeNull();
  });

  it('rejects the base directory itself', () => {
    expect(containedJoin(base, '/')).toBeNull();
    expect(containedJoin(base, '/images/..')).toBeNull();
  });

  it('accepts .. segments that stay inside the base after normalization', () => {
    expect(containedJoin(base, '/images/../fonts/a.woff2')).toBe(
      `${base}${sep}fonts${sep}a.woff2`,
    );
  });
});
