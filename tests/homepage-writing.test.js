import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Guards the homepage Writing block against the drift reported in #523. The
// block is intentionally a curated selection (not the full published set), so:
//   1. it must NOT assert a hardcoded post count that can fall behind the blog
//      collection (the old copy said "Three pieces" while five were published);
//   2. each curated link must resolve to a real built post, so a renamed or
//      unpublished post can't leave a dead homepage link.
// Reads the built dist/ HTML (`npm test` runs `astro build` first).

const DIST = resolve(__dirname, '../dist');

function setupDOM(rawHtml) {
  const safe = rawHtml.replace(/<script>[\s\S]*?<\/script>/g, '');
  document.documentElement.innerHTML = '';
  document.write(safe);
  document.close();
}

describe('homepage Writing block (#523)', () => {
  beforeEach(() => {
    setupDOM(readFileSync(resolve(DIST, 'index.html'), 'utf-8'));
  });

  it('does not hardcode a post count that can drift from the blog collection', () => {
    const list = document.querySelector('.writing-list');
    expect(list, '.writing-list missing').not.toBeNull();
    const prose = list.previousElementSibling?.textContent ?? '';
    // A literal "<N> pieces/posts" claim (e.g. the old "Three pieces") goes
    // stale as posts are published; the block is framed as a curated selection.
    expect(prose).not.toMatch(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(pieces|posts|essays|articles|stories)\b/i,
    );
  });

  it('links only to posts that exist in the built blog output', () => {
    const hrefs = [...document.querySelectorAll('.writing-list a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      const slug = href.replace(/^\/blog\//, '').replace(/\/$/, '');
      expect(
        existsSync(resolve(DIST, 'blog', slug, 'index.html')),
        `homepage Writing link ${href} should resolve to a built post`,
      ).toBe(true);
    }
  });
});
