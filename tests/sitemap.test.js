import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const sitemap = readFileSync(resolve(__dirname, '../sitemap.xml'), 'utf-8');

describe('Sitemap', () => {
  it('includes the blog index route', () => {
    expect(sitemap).toContain('<loc>https://nathanpayne.com/blog/</loc>');
  });

  it('includes the generated blog post route', () => {
    expect(sitemap).toContain('<loc>https://nathanpayne.com/blog/six-prs-one-bug-agent-failure-modes/</loc>');
  });
});
