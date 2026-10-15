import { describe, it, expect, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { DIST, readBuiltPage, writeSanitizedDOM } from './helpers/dom.js';
import {
  BRAND_ASSET_DIR,
  BRAND_COLORS,
  BRAND_FAMILIES,
  BRAND_PAGE_PATH,
  BRAND_TITLE,
  brandAssetUrl,
  formatFamilyKicker,
} from '../src/lib/brand-assets';
import { MARK_FILL_TOKENS } from '../src/lib/og-mark';

/**
 * /brand/ — the download page for the logo system (specs/brand-page.md).
 *
 * The contract that matters most is completeness: the page lists every file
 * in public/images/brand/ exactly once and nothing that is not there. The
 * directory is read from disk, so a regenerated asset that is added, renamed
 * or dropped fails here until BRAND_FAMILIES agrees. The page assertions read
 * the BUILT HTML with scripts removed, which is what a JS-disabled reader
 * gets.
 */

const ROOT = resolve(__dirname, '..');
const BRAND_DIR = resolve(ROOT, 'public/images/brand');

/** Every file in the brand directory, dotfiles aside. */
const onDisk = readdirSync(BRAND_DIR)
  .filter((name) => !name.startsWith('.') && statSync(resolve(BRAND_DIR, name)).isFile())
  .sort();

const listed = BRAND_FAMILIES.flatMap((family) => family.files.map(({ file }) => file));

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();

describe('formatFamilyKicker', () => {
  it('names the formats in first-seen order, then the file count', () => {
    expect(
      formatFamilyKicker([
        { file: 'a.svg', label: 'SVG' },
        { file: 'a-32.png', label: 'PNG 32' },
        { file: 'a-64.png', label: 'PNG 64' },
      ]),
    ).toBe('SVG · PNG · 3 files');
    expect(formatFamilyKicker([{ file: 'a.ico', label: 'ICO' }])).toBe('ICO · 1 file');
  });

  it('refuses a family with no files', () => {
    expect(() => formatFamilyKicker([])).toThrow();
  });
});

describe('BRAND_FAMILIES (specs/brand-page.md requirements 1–3)', () => {
  it('lists every file in public/images/brand/ exactly once, and nothing else', () => {
    // Control: the directory read sees the logo system.
    expect(onDisk).toContain('np-mark.svg');
    expect(onDisk.length).toBeGreaterThan(40);
    const duplicates = listed.filter((file, i) => listed.indexOf(file) !== i);
    expect(duplicates, 'a file is listed in more than one place').toEqual([]);
    expect([...listed].sort()).toEqual(onDisk);
  });

  it('gives every family an id, copy, a preview of its own and labeled files', () => {
    const ids = BRAND_FAMILIES.map((family) => family.id);
    expect(new Set(ids).size, 'family ids repeat').toBe(ids.length);
    for (const family of BRAND_FAMILIES) {
      expect(family.id, family.title).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(family.title.trim(), family.id).not.toBe('');
      expect(family.description.trim(), family.id).not.toBe('');
      expect(family.preview.alt.trim(), family.id).not.toBe('');
      expect(
        family.files.map(({ file }) => file),
        `${family.id} previews a file it does not list`,
      ).toContain(family.preview.file);
      expect(family.preview.width, family.id).toBeGreaterThan(0);
      expect(family.preview.height, family.id).toBeGreaterThan(0);
      const labels = family.files.map(({ label }) => label);
      expect(new Set(labels).size, `${family.id} repeats a link label`).toBe(labels.length);
    }
  });

  it('records each SVG preview at its viewBox size', () => {
    for (const { id, preview } of BRAND_FAMILIES) {
      if (!preview.file.endsWith('.svg')) continue;
      const svg = readFileSync(resolve(BRAND_DIR, preview.file), 'utf-8');
      const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      expect(viewBox, `${preview.file} has no viewBox`).not.toBeNull();
      expect([preview.width, preview.height], id).toEqual([Number(viewBox[1]), Number(viewBox[2])]);
    }
  });

  it('builds every URL under /images/brand/', () => {
    expect(BRAND_ASSET_DIR).toBe('/images/brand/');
    expect(brandAssetUrl('np-mark.svg')).toBe('/images/brand/np-mark.svg');
  });
});

describe('BRAND_COLORS (requirement 4)', () => {
  it('lists only colors the mark is drawn in', () => {
    const mark = readFileSync(resolve(BRAND_DIR, 'np-mark.svg'), 'utf-8').toLowerCase();
    expect(BRAND_COLORS.length).toBeGreaterThan(0);
    for (const { name, hex } of BRAND_COLORS) {
      expect(hex, name).toMatch(/^#[0-9a-f]{6}$/);
      expect(mark, `${name} ${hex} is not a fill in np-mark.svg`).toContain(`fill="${hex}"`);
      expect(Object.keys(MARK_FILL_TOKENS), `${name} ${hex} has no palette token`).toContain(hex);
    }
  });
});

describe('/brand/ (specs/brand-page.md)', () => {
  let raw;

  beforeAll(() => {
    raw = readBuiltPage('brand/index.html');
    writeSanitizedDOM(raw);
  });

  it('opens on the headline and the share line', () => {
    expect(text(document.querySelector('.hero h1'))).toBe(BRAND_TITLE);
    expect(text(document.querySelector('.breadcrumb-current'))).toBe(BRAND_TITLE);
    const deck = document.querySelector('.hero .deck');
    expect(deck, 'no deck in the hero').not.toBeNull();
    const ogDescription = document
      .querySelector('meta[property="og:description"]')
      .getAttribute('content');
    expect(text(deck)).toBe(ogDescription);
  });

  it('renders one card per family, in order, from the family', () => {
    const cards = [...document.querySelectorAll('.brand-card')];
    expect(cards.length).toBe(BRAND_FAMILIES.length);
    cards.forEach((card, i) => {
      const family = BRAND_FAMILIES[i];
      expect(card.id).toBe(family.id);
      expect(text(card.querySelector('.post-meta')), family.id).toBe(
        formatFamilyKicker(family.files),
      );
      expect(text(card.querySelector('.post-title')), family.id).toBe(family.title);
      expect(text(card.querySelector('.post-desc')), family.id).toBe(family.description);

      const img = card.querySelector('.brand-preview img');
      expect(img, `${family.id} has no preview`).not.toBeNull();
      expect(img.getAttribute('src'), family.id).toBe(brandAssetUrl(family.preview.file));
      expect(img.getAttribute('alt'), family.id).toBe(family.preview.alt);
      expect(img.getAttribute('width'), family.id).toBe(String(family.preview.width));
      expect(img.getAttribute('height'), family.id).toBe(String(family.preview.height));
      expect(img.getAttribute('loading'), family.id).toBe(i === 0 ? 'eager' : 'lazy');
    });
  });

  it('offers every file as a same-origin download that names its family', () => {
    const cards = [...document.querySelectorAll('.brand-card')];
    cards.forEach((card, i) => {
      const family = BRAND_FAMILIES[i];
      const links = [...card.querySelectorAll('a.brand-download')];
      expect(links.length, family.id).toBe(family.files.length);
      links.forEach((link, j) => {
        const { file, label } = family.files[j];
        expect(link.getAttribute('href')).toBe(brandAssetUrl(file));
        expect(link.hasAttribute('download'), link.outerHTML).toBe(true);
        expect(link.hasAttribute('target'), link.outerHTML).toBe(false);
        expect(text(link)).toBe(label);
        // The visible label is part of the accessible name (WCAG 2.5.3).
        expect(link.getAttribute('aria-label')).toBe(`${family.title}, ${label}`);
      });
    });
  });

  it('links only files the build ships, and every one of them', () => {
    const hrefs = [...document.querySelectorAll('a.brand-download')].map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs.length).toBe(onDisk.length);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const href of hrefs) {
      const built = resolve(DIST, `.${href}`);
      expect(existsSync(built) && statSync(built).isFile(), `${href} is not in dist`).toBe(true);
    }
  });

  it('lists the palette with its hex values in the closing band', () => {
    const swatches = [...document.querySelectorAll('.brand-note .brand-swatch')];
    expect(swatches.map((s) => text(s.querySelector('.brand-swatch__name')))).toEqual(
      BRAND_COLORS.map(({ name }) => name),
    );
    swatches.forEach((swatch, i) => {
      const { hex } = BRAND_COLORS[i];
      expect(text(swatch.querySelector('.brand-swatch__hex'))).toBe(hex);
      expect(swatch.querySelector('.brand-swatch__chip').getAttribute('style')).toContain(hex);
    });
    const note = text(document.querySelector('.brand-note'));
    expect(note).toContain('Cormorant Garamond 600');
    expect(note).toContain('Inter 500');
    expect(note).toContain('clear space');
  });

  it('describes the families in JSON-LD, from the same list', () => {
    const graph = JSON.parse(
      document.querySelector('script[type="application/ld+json"]').textContent,
    )['@graph'];
    const page = graph.find((n) => n['@type'] === 'CollectionPage');
    const list = graph.find((n) => n['@type'] === 'ItemList');
    const crumbs = graph.find((n) => n['@type'] === 'BreadcrumbList');
    const pageUrl = `https://nathanpayne.com${BRAND_PAGE_PATH}`;
    expect(page.url).toBe(pageUrl);
    expect(page.mainEntity['@id']).toBe(list['@id']);
    expect(page.description).toBe(
      document.querySelector('meta[name="description"]').getAttribute('content'),
    );
    expect(list.name).toBe(BRAND_TITLE);
    expect(list.itemListElement.map((li) => li.position)).toEqual(
      BRAND_FAMILIES.map((_, i) => i + 1),
    );
    list.itemListElement.forEach((li, i) => {
      const family = BRAND_FAMILIES[i];
      expect(li.item).toEqual({
        '@type': 'ImageObject',
        '@id': `${pageUrl}#${family.id}`,
        contentUrl: `https://nathanpayne.com${brandAssetUrl(family.preview.file)}`,
        name: family.title,
        description: family.description,
      });
    });
    expect(crumbs.itemListElement.map((li) => li.name)).toEqual(['Nathan Payne', BRAND_TITLE]);
  });

  it('ships its own share card and alt text', () => {
    const image = document.querySelector('meta[property="og:image"]').getAttribute('content');
    expect(image).toMatch(/^https:\/\/nathanpayne\.com\/og\/brand\.png(\?|$)/);
    expect(existsSync(resolve(DIST, 'og/brand.png'))).toBe(true);
    const alt = document.querySelector('meta[property="og:image:alt"]').getAttribute('content');
    expect(alt).toContain(BRAND_TITLE);
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(
      'https://nathanpayne.com/brand/',
    );
  });

  it('leaves the sitemap entry undated', () => {
    const sitemap = readFileSync(resolve(DIST, 'sitemap-0.xml'), 'utf-8');
    const entry = sitemap.match(
      /<url>(?:(?!<\/url>)[\s\S])*nathanpayne\.com\/brand\/[\s\S]*?<\/url>/,
    );
    expect(entry, '/brand/ is not in the sitemap').not.toBeNull();
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
