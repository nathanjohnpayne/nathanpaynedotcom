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
  // Remove scripts through the DOM rather than by regex (CodeQL
  // js/bad-tag-filter, js/incomplete-multi-character-sanitization), on a
  // detached DOMParser document so nothing executes on the way in. See
  // tests/connect-booking.test.js for the long form. JSON-LD is kept because it
  // is content, not behaviour.
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  for (const script of parsed.querySelectorAll('script:not([type="application/ld+json"])')) {
    script.remove();
  }
  document.documentElement.innerHTML = '';
  document.write(parsed.documentElement.outerHTML);
  document.close();
}

describe('Blog Pages', () => {
  beforeEach(() => {
    setupDOM(homepageHtml);
  });

  it('homepage exposes a blog link in the connect panel', () => {
    // Scoped to the Connect panel's social stack. The About panel now also
    // carries a /blog/ link ("View all writing →", #619), so a bare
    // a[href="/blog/"] selector no longer identifies this row.
    const blogLink = document.querySelector('.social-row--blog[href="/blog/"]');
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
        '@id': 'https://nathanpayne.com/blog/perfect-score-wrong-axis/',
        url: 'https://nathanpayne.com/blog/perfect-score-wrong-axis/',
        name: 'A Perfect Score on the Wrong Axis: 116 Review Findings, Zero Rejected, One Escape',
        datePublished: '2026-07-30T00:00:00.000Z',
      },
    });
    expect(itemList.itemListElement[0].item.description.length).toBeLessThanOrEqual(160);
  });

  it('hosting deploys from dist/ so markdown source is excluded', () => {
    expect(firebaseConfig.hosting.public).toBe('dist');
  });
});
