import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { EXPECTED_BLOG_EDITORIAL_ORDER } from './helpers/blog-editorial-order.js';
import { writeSanitizedDOM } from './helpers/dom.js';

const homepageHtml = readFileSync(resolve(__dirname, '../dist/index.html'), 'utf-8');
const blogIndexHtml = readFileSync(resolve(__dirname, '../dist/blog/index.html'), 'utf-8');
const blogPostHtml = readFileSync(
  resolve(__dirname, '../dist/blog/six-prs-one-bug-agent-failure-modes/index.html'),
  'utf-8',
);
const firebaseConfig = JSON.parse(readFileSync(resolve(__dirname, '../firebase.json'), 'utf-8'));

function setupDOM(html) {
  // Scripts are removed on a detached document and the doctype preserved by
  // the shared helper — see tests/helpers/dom.js for why both matter.
  writeSanitizedDOM(html);
}

function blogSlugFromHref(href) {
  return href?.replace(/^\/blog\//, '').replace(/\/$/, '');
}

describe('Blog Pages', () => {
  beforeEach(() => {
    setupDOM(homepageHtml);
  });

  it('homepage exposes a blog link in the connect panel', () => {
    // The Connect panel's path to the blog index moved in #972: it was a
    // "Blog" row in the Elsewhere social stack, which made that label wrong
    // for an on-site destination. It is now the index link on the Latest
    // Post footer's eyebrow row, carrying the Writing panel's label rather
    // than a second one for the same place.
    //
    // Scoped to that link, not to a[href="/blog/"]: the About panel carries
    // its own /blog/ link ("View all writing →", #619), so a bare href
    // selector identifies neither.
    const blogLink = document.querySelector('.blog-callout .ribbon-exit[href="/blog/"]');
    expect(blogLink, 'Connect panel has no path to the blog index').not.toBeNull();
    expect(blogLink.textContent.replace(/→/g, '').replace(/\s+/g, ' ').trim()).toBe(
      'View all writing',
    );
    expect(
      blogLink.closest('.ribbon-row'),
      'the index link is not on the Latest Post eyebrow row',
    ).not.toBeNull();
  });

  it('blog index page has canonical metadata and links to the generated post', () => {
    setupDOM(blogIndexHtml);

    const title = document.querySelector('title');
    const heading = document.querySelector('h1');
    const canonical = document.querySelector('link[rel="canonical"]');
    const postLink = document.querySelector('a[href="/blog/six-prs-one-bug-agent-failure-modes/"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');

    expect(title?.textContent).toBe('The AI-Augmented PM | Nathan Payne');
    expect(heading?.textContent).toBe('The AI-Augmented PM');
    expect(canonical?.getAttribute('href')).toBe('https://nathanpayne.com/blog/');
    expect(postLink).not.toBeNull();
    expect(ogTitle?.getAttribute('content')).toBe('The AI-Augmented PM | Nathan Payne');
    expect(twitterTitle?.getAttribute('content')).toBe('The AI-Augmented PM | Nathan Payne');
    // og:image carries a ?v=<hash> cache-busting query so social
    // platforms re-fetch the image after each deploy (see commit 49d2c39).
    // The base URL stays stable; only the query varies.
    expect(ogImage?.getAttribute('content')).toMatch(
      /^https:\/\/nathanpayne\.com\/og\/blog\.png\?v=[A-Za-z0-9_-]+$/,
    );
  });

  it('blog post page includes article metadata and screenshot embeds', () => {
    setupDOM(blogPostHtml);

    const canonical = document.querySelector('link[rel="canonical"]');
    const title = document.querySelector('title');
    const description = document.querySelector('meta[name="description"]');
    const ogType = document.querySelector('meta[property="og:type"]');
    const screenshots = [...document.querySelectorAll('.blog-figure img')];
    const localMdLink = document.querySelector('a[href$=".md"]:not([href^="https://"])');

    expect(title?.textContent).toBe('Six PRs, One Bug | Nathan Payne');
    expect(description?.getAttribute('content')).toBe(
      'The rule this billing parity bug violated sat in a design spec as prose, never as anything a review could check against.',
    );
    expect(canonical?.getAttribute('href')).toBe(
      'https://nathanpayne.com/blog/six-prs-one-bug-agent-failure-modes/',
    );
    expect(ogType?.getAttribute('content')).toBe('article');
    expect(screenshots).toHaveLength(4);
    expect(screenshots[0].getAttribute('src')).toContain('invoice-bug-01-editor-view.png');
    expect(localMdLink).toBeNull();
  });

  it('blog post structured data declares a BlogPosting entity', () => {
    setupDOM(blogPostHtml);

    const script = document.querySelector('script[type="application/ld+json"]');
    const jsonLd = JSON.parse(script.textContent);
    const posting = jsonLd['@graph'].find((entry) => entry['@type'] === 'BlogPosting');

    expect(posting).toBeDefined();
    expect(posting.headline).toBe('Six PRs, One Bug: What AI Agents Actually Get Wrong');
    expect(posting.description).toBe(
      'The rule this billing parity bug violated sat in a design spec as prose, never as anything a review could check against.',
    );
    expect(posting.image).toBe(
      'https://nathanpayne.com/og/blog/six-prs-one-bug-agent-failure-modes.png',
    );
    expect(posting.url).toBe('https://nathanpayne.com/blog/six-prs-one-bug-agent-failure-modes/');
    expect(posting.dateModified).toBe(posting.datePublished);
    expect(posting.inLanguage).toBe('en-US');
    expect(posting.isAccessibleForFree).toBe(true);
  });

  it('blog index structured data exposes the published posts as an ItemList', () => {
    setupDOM(blogIndexHtml);

    const script = document.querySelector('script[type="application/ld+json"]');
    const jsonLd = JSON.parse(script.textContent);
    const collectionPage = jsonLd['@graph'].find((entry) => entry['@type'] === 'CollectionPage');
    const itemList = jsonLd['@graph'].find((entry) => entry['@type'] === 'ItemList');

    expect(collectionPage.mainEntity['@id']).toBe('https://nathanpayne.com/blog/#itemlist');
    expect(itemList).toBeDefined();
    expect(itemList.itemListElement.length).toBeGreaterThan(0);
    expect(itemList.itemListElement.map((entry) => entry.item.url)).toEqual(
      EXPECTED_BLOG_EDITORIAL_ORDER.map((slug) => `https://nathanpayne.com/blog/${slug}/`),
    );
    expect(itemList.itemListElement[0]).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'BlogPosting',
        '@id': 'https://nathanpayne.com/blog/six-prs-one-bug-agent-failure-modes/',
        url: 'https://nathanpayne.com/blog/six-prs-one-bug-agent-failure-modes/',
        name: 'Six PRs, One Bug: What AI Agents Actually Get Wrong',
        datePublished: '2026-04-04T00:00:00.000Z',
      },
    });
    expect(itemList.itemListElement[0].item.description.length).toBeLessThanOrEqual(160);
  });

  it('renders category shelves and the featured label in editorial order', () => {
    setupDOM(blogIndexHtml);

    const cards = [...document.querySelectorAll('.post-card')];
    const slugs = cards.map((card) =>
      blogSlugFromHref(card.querySelector('.post-title a')?.getAttribute('href')),
    );
    const categories = cards.map((card) => card.querySelector('.post-meta')?.textContent.trim());
    const featureLabel = document.querySelector('.index-feature-cell__label');

    expect(slugs).toEqual(EXPECTED_BLOG_EDITORIAL_ORDER);
    expect(categories).toEqual([
      'Agent Systems',
      'Agent Systems',
      'Agent Systems',
      'Agent Systems',
      'Agent Systems',
      'Agent Systems',
      'Building This Site',
      'Building This Site',
    ]);
    expect(featureLabel?.textContent.trim()).toBe('Featured');
  });

  it('preserves parent segments when auditing nested post routes', () => {
    expect(blogSlugFromHref('/blog/series/entry/')).toBe('series/entry');
  });

  it('hosting deploys from dist/ so markdown source is excluded', () => {
    expect(firebaseConfig.hosting.public).toBe('dist');
  });
});
