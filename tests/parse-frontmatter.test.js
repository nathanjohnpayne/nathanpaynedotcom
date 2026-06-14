import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';

// Unit tests for the prebuild-script frontmatter parser. Exercises forms
// that the previous hand-rolled parser silently mangled (#193, #64),
// plus the production-path forms the refresh-* scripts depend on.

describe('parseFrontmatter (scripts/lib/parse-frontmatter.mjs)', () => {
  it('returns null when no frontmatter block is present', () => {
    expect(parseFrontmatter('Just body, no frontmatter.\n')).toBeNull();
    expect(parseFrontmatter('')).toBeNull();
  });

  it('returns {} for a whitespace-only frontmatter block', () => {
    // The closing `---` must sit on its own line, so the minimal
    // empty form is `---\n\n---\n` (one blank line in between).
    expect(parseFrontmatter('---\n\n---\nBody\n')).toEqual({});
  });

  it('parses flat string fields the production callers depend on', () => {
    const md = [
      '---',
      'slug: "swipe-watch"',
      'heroRefresh: "github-social"',
      'githubUrl: "https://github.com/owner/repo"',
      'muxPlaybackId: "abc123"',
      'screenshotSrc: "/images/projects/swipe-watch-hero.gif"',
      '---',
      'Body',
    ].join('\n');
    const data = parseFrontmatter(md);
    expect(data).toEqual({
      slug: 'swipe-watch',
      heroRefresh: 'github-social',
      githubUrl: 'https://github.com/owner/repo',
      muxPlaybackId: 'abc123',
      screenshotSrc: '/images/projects/swipe-watch-hero.gif',
    });
  });

  it('parses single-quoted strings (the old parser dropped these)', () => {
    const md = "---\ntitle: 'Single Quotes'\n---\n";
    expect(parseFrontmatter(md)).toEqual({ title: 'Single Quotes' });
  });

  it('parses inline arrays as proper arrays (the old parser stringified the whole block)', () => {
    const md = '---\ntags: ["Consumer", "Streaming", "Vanilla JS"]\n---\n';
    const data = parseFrontmatter(md);
    expect(Array.isArray(data.tags)).toBe(true);
    expect(data.tags).toEqual(['Consumer', 'Streaming', 'Vanilla JS']);
  });

  it('parses nested objects (the old parser silently dropped these)', () => {
    const md = [
      '---',
      'metadata:',
      '  format: "Repository standard"',
      '  focus: "Agent governance"',
      '---',
    ].join('\n');
    const data = parseFrontmatter(md);
    expect(data.metadata).toEqual({
      format: 'Repository standard',
      focus: 'Agent governance',
    });
  });

  it('handles CRLF line endings in the frontmatter block', () => {
    const md = '---\r\nslug: "x"\r\nfoo: "bar"\r\n---\r\nBody\r\n';
    expect(parseFrontmatter(md)).toEqual({ slug: 'x', foo: 'bar' });
  });

  it('keeps every leaf scalar as a string under FAILSAFE_SCHEMA', () => {
    // FAILSAFE_SCHEMA resolves only !!str / !!seq / !!map, so bare
    // numbers, booleans, null, and ISO-like dates all parse as strings.
    // Preserves the legacy hand-rolled parser's contract for production
    // callers like `data.screenshotSrc.startsWith("/")`. Codex P2 catches
    // on PR #348 (numbers/booleans, then Date timestamps).
    const md = [
      '---',
      'count: 42',
      'enabled: true',
      'disabled: false',
      'lastUpdated: 2026-05-13',
      'name: "still a string"',
      '---',
    ].join('\n');
    const data = parseFrontmatter(md);
    expect(data.count).toBe('42');
    expect(data.enabled).toBe('true');
    expect(data.disabled).toBe('false');
    expect(data.lastUpdated).toBe('2026-05-13'); // NOT a Date object
    expect(data.name).toBe('still a string');
  });

  it('preserves array + object structure but strings inside them too', () => {
    const md = [
      '---',
      'tags: [1, 2, 3]', // inline array of bare scalars
      'metadata:',
      '  count: 5', // nested bare scalar
      '  flag: true',
      '---',
    ].join('\n');
    const data = parseFrontmatter(md);
    expect(Array.isArray(data.tags)).toBe(true);
    expect(data.tags).toEqual(['1', '2', '3']); // strings under FAILSAFE
    expect(typeof data.metadata).toBe('object');
    expect(data.metadata.count).toBe('5'); // strings under FAILSAFE
    expect(data.metadata.flag).toBe('true');
  });

  it('throws on malformed YAML rather than silently returning a partial object', () => {
    // js-yaml raises on bad indentation; the prebuild scripts intentionally
    // do not catch this so the build fails loudly on a corrupt content file.
    const md = '---\nbad: : :\n  : not yaml\n---\n';
    expect(() => parseFrontmatter(md)).toThrow();
  });
});
