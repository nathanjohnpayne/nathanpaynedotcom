import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { containedJoin } from '../scripts/lib/contain-path.mjs';
import { MUX_PLAYBACK_ID_PATTERN, isMuxPlaybackId } from '../scripts/lib/mux-playback-id.mjs';

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
    expect(containedJoin(base, '/images/../fonts/a.woff2')).toBe(`${base}${sep}fonts${sep}a.woff2`);
  });
});

// Both prebuild refreshers write to a frontmatter-supplied path, so both must
// go through containedJoin (#456). refresh-mux-gifs.mjs used a bare join().
describe('prebuild refreshers resolve screenshotSrc through containedJoin', () => {
  for (const script of ['scripts/refresh-hero-images.mjs', 'scripts/refresh-mux-gifs.mjs']) {
    it(script, () => {
      const src = readFileSync(resolve(__dirname, '..', script), 'utf-8');
      expect(src).toMatch(/containedJoin\(publicDir,\s*screenshotSrc\)/);
      expect(src).not.toMatch(/join\(publicDir,\s*screenshotSrc\)/);
    });
  }
});

describe('Mux playback IDs', () => {
  it.each(['wNCRY97981o2uDAJrJ3ExPeK379yldRRFJgUIgSYz00k', 'abc123'])('accepts %s', (id) => {
    expect(isMuxPlaybackId(id)).toBe(true);
  });

  it.each(['', '../x', 'a/b', 'a?b', 'a#b', 'a.b', 'a b', 'a%2F', null, 42])('rejects %s', (id) => {
    expect(isMuxPlaybackId(id)).toBe(false);
  });

  it('the refresher checks the ID before building the Mux URL', () => {
    const src = readFileSync(resolve(__dirname, '../scripts/refresh-mux-gifs.mjs'), 'utf-8');
    const body = src.slice(src.indexOf('async function main'));
    const check = body.indexOf('isMuxPlaybackId(muxPlaybackId)');
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(body.indexOf('muxGifUrl(muxPlaybackId)'));
  });

  it('the refresher trims the ID the way the schema does', () => {
    const src = readFileSync(resolve(__dirname, '../scripts/refresh-mux-gifs.mjs'), 'utf-8');
    expect(src).toMatch(/data\.muxPlaybackId\.trim\(\)/);
  });

  it('the content schema enforces the same pattern', () => {
    const config = readFileSync(resolve(__dirname, '../src/content.config.ts'), 'utf-8');
    expect(config).toContain(
      "import { MUX_PLAYBACK_ID_PATTERN } from '../scripts/lib/mux-playback-id.mjs'",
    );
    expect(config).toMatch(
      /muxPlaybackId: z\s*\.string\(\)\s*\.trim\(\)\s*\.regex\(MUX_PLAYBACK_ID_PATTERN/,
    );
    expect(MUX_PLAYBACK_ID_PATTERN.source).toBe('^[A-Za-z0-9]+$');
  });
});
