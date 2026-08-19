import { describe, expect, it } from 'vitest';
import { parseSitemapFrontmatter } from '../scripts/lib/sitemap-frontmatter.mjs';

describe('sitemap frontmatter parsing', () => {
  it('accepts CRLF frontmatter delimiters when deriving sitemap dates', () => {
    // What this guards is the `\r?\n` in FRONTMATTER_RE: a CRLF-authored post
    // must still yield its title and date. The date's *runtime type* is not
    // part of that contract. js-yaml 4 implicitly coerced a bare `2026-06-11`
    // to a Date; js-yaml 5 leaves it a string (#640). The only consumer,
    // `toIsoDate()` in astro.config.mjs, accepts `string | number | Date` and
    // normalizes through `new Date(value)`, so the shipped sitemap lastmod is
    // identical either way. Asserting the string form records the parser's
    // actual contract rather than an incidental js-yaml typing behaviour;
    // adding coercion to the parser would be new production behaviour no
    // caller needs, and would reintroduce the implicit-typing class that
    // parse-frontmatter.mjs deliberately closed off with FAILSAFE_SCHEMA.
    const parsed = parseSitemapFrontmatter(
      '---\r\ntitle: CRLF Post\r\ndate: 2026-06-11\r\n---\r\n# CRLF Post\r\n',
    );
    expect(parsed).toMatchObject({
      title: 'CRLF Post',
      date: '2026-06-11',
    });
    // Representation-independent check that the value the sitemap actually
    // consumes survives the parse intact, however js-yaml chooses to type it.
    expect(new Date(parsed.date).toISOString()).toBe('2026-06-11T00:00:00.000Z');
  });
});
