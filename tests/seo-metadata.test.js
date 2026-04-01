import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');

function setupDOM() {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();
}

describe('SEO Metadata', () => {
  beforeEach(() => {
    setupDOM();
  });

  describe('Open Graph tags', () => {
    it('og:type is present and set to website', () => {
      const meta = document.querySelector('meta[property="og:type"]');
      expect(meta).not.toBeNull();
      expect(meta.getAttribute('content')).toBe('website');
    });

    it('og:title is present', () => {
      const meta = document.querySelector('meta[property="og:title"]');
      expect(meta).not.toBeNull();
      expect(meta.getAttribute('content')).toBeTruthy();
    });

    it('og:description is present', () => {
      const meta = document.querySelector('meta[property="og:description"]');
      expect(meta).not.toBeNull();
      expect(meta.getAttribute('content')).toBeTruthy();
    });

    it('og:url is present', () => {
      const meta = document.querySelector('meta[property="og:url"]');
      expect(meta).not.toBeNull();
      expect(meta.getAttribute('content')).toBe('https://nathanpayne.com/');
    });

    it('og:image is present', () => {
      const meta = document.querySelector('meta[property="og:image"]');
      expect(meta).not.toBeNull();
      expect(meta.getAttribute('content')).toContain('https://nathanpayne.com/');
    });

    it('og:image:alt is present', () => {
      const meta = document.querySelector('meta[property="og:image:alt"]');
      expect(meta).not.toBeNull();
      expect(meta.getAttribute('content')).toBeTruthy();
    });
  });

  describe('Twitter Card tags', () => {
    it('twitter:card is set to summary_large_image', () => {
      const meta = document.querySelector('meta[name="twitter:card"]');
      expect(meta).not.toBeNull();
      expect(meta.getAttribute('content')).toBe('summary_large_image');
    });

    it('twitter:title is present', () => {
      const meta = document.querySelector('meta[name="twitter:title"]');
      expect(meta).not.toBeNull();
      expect(meta.getAttribute('content')).toBeTruthy();
    });

    it('twitter:description is present', () => {
      const meta = document.querySelector('meta[name="twitter:description"]');
      expect(meta).not.toBeNull();
      expect(meta.getAttribute('content')).toBeTruthy();
    });

    it('twitter:image is present', () => {
      const meta = document.querySelector('meta[name="twitter:image"]');
      expect(meta).not.toBeNull();
      expect(meta.getAttribute('content')).toContain('https://nathanpayne.com/');
    });
  });

  describe('Canonical URL', () => {
    it('canonical link is present and correct', () => {
      const link = document.querySelector('link[rel="canonical"]');
      expect(link).not.toBeNull();
      expect(link.getAttribute('href')).toBe('https://nathanpayne.com/');
    });
  });

  describe('JSON-LD Structured Data', () => {
    let jsonLd;

    beforeEach(() => {
      const script = document.querySelector('script[type="application/ld+json"]');
      expect(script).not.toBeNull();
      jsonLd = JSON.parse(script.textContent);
    });

    it('contains a @graph array', () => {
      expect(jsonLd['@graph']).toBeDefined();
      expect(Array.isArray(jsonLd['@graph'])).toBe(true);
    });

    it('includes a WebSite entity', () => {
      const webSite = jsonLd['@graph'].find((e) => e['@type'] === 'WebSite');
      expect(webSite).toBeDefined();
      expect(webSite.url).toBe('https://nathanpayne.com/');
    });

    it('includes a ProfilePage entity', () => {
      const profilePage = jsonLd['@graph'].find((e) => e['@type'] === 'ProfilePage');
      expect(profilePage).toBeDefined();
    });

    it('includes a Person entity with required properties', () => {
      const person = jsonLd['@graph'].find((e) => e['@type'] === 'Person');
      expect(person).toBeDefined();
      expect(person.name).toBe('Nathan Payne');
      expect(person.worksFor).toBeDefined();
      expect(person.worksFor.name).toBe('The Walt Disney Company');
      expect(person.sameAs).toBeDefined();
      expect(Array.isArray(person.sameAs)).toBe(true);
      expect(person.sameAs.length).toBeGreaterThan(0);
    });
  });
});
