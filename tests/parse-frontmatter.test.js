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

  it('parses inline arrays (the old parser stringified these)', () => {
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

  it('throws on malformed YAML rather than silently returning a partial object', () => {
    // js-yaml raises on bad indentation; the prebuild scripts intentionally
    // do not catch this so the build fails loudly on a corrupt content file.
    const md = '---\nbad: : :\n  : not yaml\n---\n';
    expect(() => parseFrontmatter(md)).toThrow();
  });
});
