import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';
import { DIST, readBuiltPage, writeSanitizedDOM } from './helpers/dom.js';
import {
  BOOK_TITLE,
  CAL_PROFILE_URL,
  CAL_USERNAME,
  bookingUrl,
  formatDurations,
} from '../src/lib/booking';

/**
 * /book/ — the site's own version of the Cal.com profile page
 * (specs/book-page.md).
 *
 * Two contracts matter more than the layout. The page is built from the
 * `booking` collection, so every card is compared against its entry rather
 * than against a pinned string: a renamed or re-described event type reaches
 * the page or fails here, never drifts. And Cal.com is a link-only recipient
 * (docs/privacy/inventory.md): the built page may name cal.com in anchors and
 * in the JSON-LD that repeats those anchors, and nowhere else. These
 * assertions read the BUILT HTML with scripts removed, which is what a
 * JS-disabled reader gets.
 */

const ROOT = resolve(__dirname, '..');
const BOOKING_DIR = resolve(ROOT, 'src/content/booking');

/** The collection, read from disk and ordered as the page orders it. */
const entries = readdirSync(BOOKING_DIR)
  .filter((name) => name.endsWith('.md'))
  .map((name) => {
    const data = parseFrontmatter(readFileSync(resolve(BOOKING_DIR, name), 'utf-8'));
    // parseFrontmatter keeps every scalar a string (FAILSAFE_SCHEMA).
    return {
      file: name,
      title: data.title,
      slug: data.slug,
      description: data.description,
      durations: data.durations.map(Number),
      where: data.where,
      order: Number(data.order),
    };
  })
  .sort((a, b) => a.order - b.order);

/**
 * The public event types the page may carry. Pinned on purpose, beside the
 * collection it mirrors: the Cal.com account also holds a hidden event type
 * with a private address, and the one thing a collection read from disk
 * cannot prove is that nobody added it. A new public event type is added in
 * both places.
 */
const PUBLIC_SLUGS = ['quick-intro', 'real-conversation', 'in-person'];

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();

describe('formatDurations', () => {
  it('names one, two, or several lengths the way the kicker says them', () => {
    expect(formatDurations([15])).toBe('15 min');
    expect(formatDurations([60, 90])).toBe('60 or 90 min');
    expect(formatDurations([60, 90, 120])).toBe('60, 90, or 120 min');
  });

  it('sorts shortest first and ignores a repeated length', () => {
    expect(formatDurations([120, 60, 90])).toBe('60, 90, or 120 min');
    expect(formatDurations([30, 30])).toBe('30 min');
  });

  it('refuses an event type with no length', () => {
    expect(() => formatDurations([])).toThrow();
  });
});

describe('booking URLs', () => {
  it('hang every URL off the one Cal.com username', () => {
    expect(CAL_PROFILE_URL).toBe(`https://cal.com/${CAL_USERNAME}`);
    expect(bookingUrl('quick-intro')).toBe(`${CAL_PROFILE_URL}/quick-intro`);
  });
});

describe('the booking collection', () => {
  it('holds exactly the public event types, each with what a card needs', () => {
    expect(entries.map((e) => e.slug).sort()).toEqual([...PUBLIC_SLUGS].sort());
    for (const entry of entries) {
      expect(entry.title, entry.file).toBeTruthy();
      expect(entry.description, entry.file).toBeTruthy();
      expect(entry.where, entry.file).toBeTruthy();
      expect(entry.durations.length, entry.file).toBeGreaterThan(0);
      expect(
        entry.durations.every((m) => Number.isInteger(m) && m > 0),
        entry.file,
      ).toBe(true);
    }
    // Orders are distinct, so the page order is not left to the filesystem.
    expect(new Set(entries.map((e) => e.order)).size).toBe(entries.length);
  });
});

describe('/book/ (specs/book-page.md)', () => {
  let raw;

  beforeAll(() => {
    raw = readBuiltPage('book/index.html');
    writeSanitizedDOM(raw);
  });

  it('opens on the headline and the share line', () => {
    expect(text(document.querySelector('.hero h1'))).toBe(BOOK_TITLE);
    expect(text(document.querySelector('.breadcrumb-current'))).toBe(BOOK_TITLE);
    const deck = document.querySelector('.hero .deck');
    expect(deck, 'no deck in the hero').not.toBeNull();
    const ogDescription = document
      .querySelector('meta[property="og:description"]')
      .getAttribute('content');
    expect(text(deck)).toBe(ogDescription);
  });

  it('renders one card per entry, in order, from the entry', () => {
    const cards = [...document.querySelectorAll('.book-card')];
    expect(cards.length).toBe(entries.length);
    cards.forEach((card, i) => {
      const entry = entries[i];
      const url = bookingUrl(entry.slug);
      expect(text(card.querySelector('.post-meta')), entry.file).toBe(
        `${formatDurations(entry.durations)} · ${entry.where}`,
      );
      const title = card.querySelector('.post-title a');
      expect(text(title), entry.file).toBe(entry.title);
      expect(title.getAttribute('href'), entry.file).toBe(url);
      expect(text(card.querySelector('.post-desc')), entry.file).toBe(entry.description);
      const tag = card.querySelector('.tag-row a.tag');
      expect(tag.getAttribute('href'), entry.file).toBe(url);
      expect(text(tag), entry.file).toMatch(/^Pick a time/);
    });
  });

  it('opens every Cal.com link in a new tab with rel="noopener", as a plain href', () => {
    const links = [...document.querySelectorAll('a[href^="https://cal.com/"]')];
    // Two per card plus the profile link in the closing band.
    expect(links.length).toBe(entries.length * 2 + 1);
    for (const link of links) {
      expect(link.getAttribute('target'), link.outerHTML).toBe('_blank');
      expect(link.getAttribute('rel') || '', link.outerHTML).toContain('noopener');
    }
    const profile = document.querySelector('.booking-profile');
    expect(profile.getAttribute('href')).toBe(CAL_PROFILE_URL);
  });

  it('tags each card link with its event slug for the analytics event', () => {
    const tagged = [...document.querySelectorAll('.booking-event-type')];
    expect(tagged.length).toBe(entries.length * 2);
    for (const link of tagged) {
      const slug = link.getAttribute('data-event-type');
      expect(PUBLIC_SLUGS, link.outerHTML).toContain(slug);
      expect(link.getAttribute('href')).toBe(bookingUrl(slug));
    }
  });

  it('names only public event types, and never the hidden one', () => {
    // Every cal.com/nathanpayne/<slug> reference in the raw build, scripts
    // and JSON-LD included, is one of the public slugs.
    const pattern = new RegExp(`cal\\.com/${CAL_USERNAME}/([A-Za-z0-9_-]+)`, 'g');
    const found = [...raw.matchAll(pattern)].map((m) => m[1]);
    // Control: the scan sees the links the cards carry.
    expect(found.length).toBeGreaterThanOrEqual(entries.length * 2);
    expect(new Set(found)).toEqual(new Set(PUBLIC_SLUGS));
  });

  it('loads nothing from Cal.com: links only', () => {
    // The whole raw page, scripts included. The host may appear in exactly
    // three places: the href of an anchor, the url of a JSON-LD item that
    // repeats an anchor, and prose. Nothing else: no <script src>, <iframe>,
    // <link>, <img>, <object> or <embed> may point there, no other attribute
    // on any element may name it, and no inline script may name it, since an
    // embed loader would.
    const host = /cal\.com/i;
    // A URL to the host, wherever it sits in an attribute value.
    const hostUrl = /(?:^|[\s"'(,])(?:https?:)?\/\/(?:[\w-]+\.)*cal\.com(?:[/:?#]|$)/i;
    // Attributes the browser fetches or navigates. Any mention of the host in
    // one of these is a request; in any other attribute only a URL is.
    const URL_ATTRS = new Set([
      'src',
      'href',
      'srcset',
      'data',
      'action',
      'formaction',
      'poster',
      'ping',
      'cite',
      'manifest',
      'xlink:href',
    ]);
    const parsed = new DOMParser().parseFromString(raw, 'text/html');

    const attributeHits = [];
    for (const el of parsed.querySelectorAll('*')) {
      for (const attr of el.attributes) {
        const isHandler = attr.name.startsWith('on');
        const flagged =
          URL_ATTRS.has(attr.name) || isHandler ? host.test(attr.value) : hostUrl.test(attr.value);
        if (!flagged) continue;
        const isAnchorHref = el.tagName === 'A' && attr.name === 'href';
        if (!isAnchorHref) {
          attributeHits.push(`<${el.tagName.toLowerCase()} ${attr.name}="${attr.value}">`);
        }
      }
    }
    expect(attributeHits).toEqual([]);
    // Control for the attribute scan: the meta description names the host in
    // prose, which is allowed, and the scan saw it.
    const description = parsed.querySelector('meta[name="description"]').getAttribute('content');
    expect(host.test(description), 'the control sentence no longer names the host').toBe(true);
    expect(hostUrl.test(description)).toBe(false);
    expect(hostUrl.test('see https://cal.com/nathanpayne today')).toBe(true);

    const scripts = [...parsed.querySelectorAll('script:not([type="application/ld+json"])')];
    expect(scripts.filter((s) => host.test(s.textContent))).toEqual([]);
    expect(scripts.filter((s) => host.test(s.getAttribute('src') ?? ''))).toEqual([]);
    // Control for the inline-script scan: the page's own click script is
    // there to be scanned, so a zero-hit result means something.
    expect(
      scripts.filter((s) => s.textContent.includes('booking_event_type_clicked')).length,
      'the analytics click script is missing',
    ).toBe(1);

    // Controls for the attribute scan: the anchors are there, and the JSON-LD
    // repeats exactly their URLs.
    const anchorHrefs = [...parsed.querySelectorAll('a[href]')]
      .map((a) => a.getAttribute('href'))
      .filter((href) => host.test(href));
    expect(anchorHrefs.length).toBe(entries.length * 2 + 1);
    const ld = JSON.parse(parsed.querySelector('script[type="application/ld+json"]').textContent);
    const ldUrls = JSON.stringify(ld).match(/https:\/\/cal\.com\/[^"]*/g) ?? [];
    expect(ldUrls.length).toBe(entries.length * 2);
    for (const url of ldUrls) expect(anchorHrefs).toContain(url);
  });

  it('describes the cards in JSON-LD, from the same entries', () => {
    const graph = JSON.parse(
      document.querySelector('script[type="application/ld+json"]').textContent,
    )['@graph'];
    const page = graph.find((n) => n['@type'] === 'CollectionPage');
    const list = graph.find((n) => n['@type'] === 'ItemList');
    const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList');
    expect(page.url).toBe('https://nathanpayne.com/book/');
    expect(page.mainEntity['@id']).toBe(list['@id']);
    expect(page.description).toBe(
      document.querySelector('meta[name="description"]').getAttribute('content'),
    );
    expect(list.name).toBe(BOOK_TITLE);
    expect(list.itemListElement.map((li) => li.position)).toEqual(entries.map((_, i) => i + 1));
    list.itemListElement.forEach((li, i) => {
      expect(li.item).toEqual({
        '@type': 'WebPage',
        '@id': bookingUrl(entries[i].slug),
        url: bookingUrl(entries[i].slug),
        name: entries[i].title,
        description: entries[i].description,
      });
    });
    expect(crumbs.itemListElement.map((li) => li.name)).toEqual(['Nathan Payne', BOOK_TITLE]);
  });

  it('ships its own share card and alt text', () => {
    const image = document.querySelector('meta[property="og:image"]').getAttribute('content');
    expect(image).toMatch(/^https:\/\/nathanpayne\.com\/og\/book\.png(\?|$)/);
    expect(existsSync(resolve(DIST, 'og/book.png'))).toBe(true);
    const alt = document.querySelector('meta[property="og:image:alt"]').getAttribute('content');
    expect(alt).toContain(BOOK_TITLE);
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(
      'https://nathanpayne.com/book/',
    );
  });

  it('leaves the sitemap entry undated', () => {
    const sitemap = readFileSync(resolve(DIST, 'sitemap-0.xml'), 'utf-8');
    const entry = sitemap.match(
      /<url>(?:(?!<\/url>)[\s\S])*nathanpayne\.com\/book\/[\s\S]*?<\/url>/,
    );
    expect(entry, '/book/ is not in the sitemap').not.toBeNull();
    expect(entry[0]).not.toContain('<lastmod>');
  });

  it('offers the résumé and the homepage from the footer', () => {
    const hrefs = [...document.querySelectorAll('.site-footer__nav a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toContain('/resume/');
    expect(hrefs).toContain('/');
  });
});
