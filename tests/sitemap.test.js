import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  effectiveModified,
  getBlogLastUpdated,
  lastUpdatedFor,
} from '../scripts/lib/blog-last-updated.mjs';
import { buildBlogLastmodMap } from '../scripts/lib/sitemap-lastmod.mjs';

const sitemapIndex = readFileSync(resolve(__dirname, '../dist/sitemap-index.xml'), 'utf-8');
const sitemap0 = readFileSync(resolve(__dirname, '../dist/sitemap-0.xml'), 'utf-8');

function sitemapEntryFor(url) {
  const loc = `<loc>${url}</loc>`;
  const locIndex = sitemap0.indexOf(loc);
  if (locIndex === -1) {
    throw new Error(`Missing sitemap entry for ${url}`);
  }

  const entryStart = sitemap0.lastIndexOf('<url>', locIndex);
  const entryEnd = sitemap0.indexOf('</url>', locIndex);
  if (entryStart === -1 || entryEnd === -1) {
    throw new Error(`Malformed sitemap entry for ${url}`);
  }

  return sitemap0.slice(entryStart, entryEnd + '</url>'.length);
}

describe('Sitemap', () => {
  it('sitemap index references sitemap-0.xml', () => {
    expect(sitemapIndex).toContain('sitemap-0.xml');
  });

  it('includes the blog index route', () => {
    expect(sitemap0).toContain('<loc>https://nathanpayne.com/blog/</loc>');
  });

  it('includes the generated blog post route', () => {
    expect(sitemap0).toContain(
      '<loc>https://nathanpayne.com/blog/six-prs-one-bug-agent-failure-modes/</loc>',
    );
  });

  // Blog lastmod values are the last body change from git history when that
  // is later than the frontmatter date (#1168, specs/last-updated.md). The
  // expected values are derived the same way rather than pinned, because
  // they move every time a post is edited; tests/last-updated.test.js checks
  // every post.
  it('uses the newest post value for the blog index lastmod', () => {
    const newest = [...buildBlogLastmodMap().entries()]
      .filter(([path]) => path !== '/blog/')
      .map(([, iso]) => iso)
      .sort()
      .at(-1);
    expect(sitemapEntryFor('https://nathanpayne.com/blog/')).toContain(
      `<lastmod>${newest}</lastmod>`,
    );
  });

  it('uses content-derived dates for blog post lastmod values', () => {
    const file = resolve(__dirname, '../src/content/blog/six-prs-one-bug-agent-failure-modes.md');
    const expected = effectiveModified(
      new Date('2026-04-04'),
      lastUpdatedFor(getBlogLastUpdated(), file),
    ).toISOString();
    expect(
      sitemapEntryFor('https://nathanpayne.com/blog/six-prs-one-bug-agent-failure-modes/'),
    ).toContain(`<lastmod>${expected}</lastmod>`);
  });

  it('does not invent lastmod values for pages without reliable content dates', () => {
    expect(sitemapEntryFor('https://nathanpayne.com/projects/')).not.toContain('<lastmod>');
    expect(sitemapEntryFor('https://nathanpayne.com/resume/')).not.toContain('<lastmod>');
  });
});
