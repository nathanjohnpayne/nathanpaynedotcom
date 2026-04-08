import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sitemapIndex = readFileSync(resolve(__dirname, '../dist/sitemap-index.xml'), 'utf-8');
const sitemap0 = readFileSync(resolve(__dirname, '../dist/sitemap-0.xml'), 'utf-8');

describe('Sitemap', () => {
  it('sitemap index references sitemap-0.xml', () => {
    expect(sitemapIndex).toContain('sitemap-0.xml');
  });

  it('includes the blog index route', () => {
    expect(sitemap0).toContain('<loc>https://nathanpayne.com/blog/</loc>');
  });

  it('includes the generated blog post route', () => {
    expect(sitemap0).toContain('<loc>https://nathanpayne.com/blog/six-prs-one-bug-agent-failure-modes/</loc>');
  });
});
