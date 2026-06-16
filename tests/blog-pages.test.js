import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const homepageHtml = readFileSync(resolve(__dirname, '../dist/index.html'), 'utf-8');
const blogIndexHtml = readFileSync(resolve(__dirname, '../dist/blog/index.html'), 'utf-8');
const blogPostHtml = readFileSync(
  resolve(__dirname, '../dist/blog/six-prs-one-bug-agent-failure-modes/index.html'),
  'utf-8',
);
const firebaseConfig = JSON.parse(readFileSync(resolve(__dirname, '../firebase.json'), 'utf-8'));

function setupDOM(html) {
  const safe = html.replace(
    /<script(?![^>]*type="application\/ld\+json")[^>]*>[\s\S]*?<\/script>/g,
    '',
  );
  document.documentElement.innerHTML = '';
  document.write(safe);
  document.close();
}

describe('Blog Pages', () => {
  beforeEach(() => {
    setupDOM(homepageHtml);
  });

  it('homepage exposes a blog link in the connect panel', () => {
    const blogLink = document.querySelector('a[href="/blog/"]');
    expect(blogLink).not.toBeNull();
    expect(blogLink.textContent).toContain('Blog');
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
      'A billing email bug took six AI-authored PRs to diagnose because every fix stayed local instead of reframing the serialization layer.',
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
      'A billing email bug took six AI-authored PRs to diagnose because every fix stayed local instead of reframing the serialization layer.',
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
    expect(itemList.itemListElement[0]).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'BlogPosting',
        '@id': 'https://nathanpayne.com/blog/two-blues-one-composition/',
        url: 'https://nathanpayne.com/blog/two-blues-one-composition/',
        name: 'Two Blues, One Composition: How a Design Critique Became a Forensics Exercise',
        datePublished: '2026-06-11T00:00:00.000Z',
      },
    });
    expect(itemList.itemListElement[0].item.description.length).toBeLessThanOrEqual(160);
  });

  it('hosting deploys from dist/ so markdown source is excluded', () => {
    expect(firebaseConfig.hosting.public).toBe('dist');
  });
});
