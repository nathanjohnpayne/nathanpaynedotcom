import { describe, expect, it } from 'vitest';
import { parseSitemapFrontmatter } from '../scripts/lib/sitemap-frontmatter.mjs';

describe('sitemap frontmatter parsing', () => {
  it('accepts CRLF frontmatter delimiters when deriving sitemap dates', () => {
    expect(
      parseSitemapFrontmatter('---\r\ntitle: CRLF Post\r\ndate: 2026-06-11\r\n---\r\n# CRLF Post\r\n'),
    ).toMatchObject({
      title: 'CRLF Post',
      date: new Date('2026-06-11T00:00:00.000Z'),
    });
  });
});
