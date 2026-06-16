import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sitemapIndex = readFileSync(resolve(__dirname, '../dist/sitemap-index.xml'), 'utf-8');
const sitemap0 = readFileSync(resolve(__dirname, '../dist/sitemap-0.xml'), 'utf-8');

function sitemapEntryFor(url) {
  const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = sitemap0.match(new RegExp(`<url><loc>${escaped}</loc>(.*?)</url>`, 's'));
  return match?.[1] || '';
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

  it('uses the newest published post date for the blog index lastmod', () => {
    expect(sitemapEntryFor('https://nathanpayne.com/blog/')).toContain(
      '<lastmod>2026-06-11T00:00:00.000Z</lastmod>',
    );
  });

  it('uses content dates for blog post lastmod values', () => {
    expect(
      sitemapEntryFor('https://nathanpayne.com/blog/six-prs-one-bug-agent-failure-modes/'),
    ).toContain('<lastmod>2026-04-04T00:00:00.000Z</lastmod>');
  });

  it('does not invent lastmod values for pages without reliable content dates', () => {
    expect(sitemapEntryFor('https://nathanpayne.com/projects/')).not.toContain('<lastmod>');
    expect(sitemapEntryFor('https://nathanpayne.com/resume/')).not.toContain('<lastmod>');
  });
});
