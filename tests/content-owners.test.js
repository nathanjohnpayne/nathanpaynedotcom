import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { relative, resolve } from 'path';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { builtPagePaths, readBuiltPage, writeSanitizedDOM } from './helpers/dom.js';

/**
 * Named content owners for repeated descriptive copy (#1166).
 *
 * Each rendition of the site's own descriptive copy — page metadata, JSON-LD,
 * share-card text, cross-page introductions, availability, résumé highlights —
 * has one owner in src/content/, and every surface that renders it reads that
 * owner. The failure this guards against is not wrong copy but drift: an edit
 * that reaches one rendition and not the others. So each assertion compares a
 * built surface against the owning field, read straight from the content file,
 * rather than against a pinned string; and the last block fails if a template
 * retypes owned copy instead of reading it.
 */

const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'src');
const frontmatter = (path) => parseFrontmatter(readFileSync(resolve(ROOT, path), 'utf-8'));

const copy = {
  blog: frontmatter('src/content/site-copy/blog.md'),
  projects: frontmatter('src/content/site-copy/projects.md'),
  home: frontmatter('src/content/site-copy/home.md'),
  resume: frontmatter('src/content/site-copy/resume.md'),
};
const myself = frontmatter('src/content/myself/nathan-payne.md');
const experience = {
  'disney-ncp': frontmatter('src/content/experience/disney-ncp.md'),
  cnn: frontmatter('src/content/experience/cnn.md'),
};
const ogCards = JSON.parse(readFileSync(resolve(ROOT, '.astro/og-cards.json'), 'utf-8'));

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const meta = (selector) => document.querySelector(selector)?.getAttribute('content');
const graph = () =>
  JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
const node = (type) => graph().find((entry) => entry['@type'] === type);

/** The three description tags BaseLayout writes; og and twitter share one value. */
function expectMetaDescriptions(description, social = description) {
  expect(meta('meta[name="description"]'), 'meta description').toBe(description);
  expect(meta('meta[property="og:description"]'), 'og:description').toBe(social);
  expect(meta('meta[name="twitter:description"]'), 'twitter:description').toBe(social);
}

describe('homepage copy owners (#1166)', () => {
  it('reads one homepage description for every metadata surface', () => {
    writeSanitizedDOM(readBuiltPage('index.html'));
    expectMetaDescriptions(copy.home.description);
    expect(node('WebSite').description).toBe(copy.home.description);
    expect(node('ProfilePage').description).toBe(copy.home.description);
  });

  it('keeps the Person description and the share card as named variants', () => {
    writeSanitizedDOM(readBuiltPage('index.html'));
    expect(node('Person').description).toBe(copy.home.personDescription);
    expect(ogCards.home.description).toBe(copy.home.shareImageDescription);
    // The variants are only worth naming while they differ from the description.
    expect(copy.home.personDescription).not.toBe(copy.home.description);
    expect(copy.home.shareImageDescription).not.toBe(copy.home.description);
  });

  it('takes the Person name, location and profiles from the profile entry', () => {
    writeSanitizedDOM(readBuiltPage('index.html'));
    const person = node('Person');
    const { address } = myself;
    expect(person.name).toBe(myself.name);
    expect(person.homeLocation.name).toBe(
      `${address.locality}, ${address.regionName}, ${address.countryName}`,
    );
    expect(person.sameAs).toContain(`https://www.linkedin.com/in/${myself.linkedin}/`);
    expect(person.sameAs).toContain(`https://github.com/${myself.github}`);
  });

  it('introduces Selected Projects with the homepage rendition', () => {
    writeSanitizedDOM(readBuiltPage('index.html'));
    const intro = document.querySelector('[data-panel="projects"] .content-inner > p');
    expect(intro, 'no Selected Projects introduction on the homepage').not.toBeNull();
    expect(text(intro)).toBe(copy.projects.homepageDescription);
  });

  it('states the long availability statement in NOW, once', () => {
    // #969 counts statements; this pins which words the one statement uses.
    writeSanitizedDOM(readBuiltPage('index.html'));
    const now = text(document.querySelector('.about-block--now'));
    expect(now.split(myself.availability.long).length - 1).toBe(1);
  });

  it('dates the Context career lengths instead of counting back from today', () => {
    // Owner decision on #1166: fixed lengths cannot go stale once the period has
    // ended, where "the past ten years" and "the last five years" did.
    writeSanitizedDOM(readBuiltPage('index.html'));
    const context = [...document.querySelectorAll('.about-block')].find(
      (block) => text(block.querySelector('.about-label')) === 'Context',
    );
    expect(context, 'no Context block on the homepage').toBeDefined();
    const paragraph = text(context.querySelector('p'));
    expect(paragraph).toMatch(/^For ten years, I worked on/);
    expect(paragraph).toContain('spent five years leading the Native Client Platform');
    expect(paragraph).not.toMatch(/past ten years|last five years/);
  });
});

describe('résumé copy owners (#1166)', () => {
  it('uses one description for metadata, JSON-LD and the share card', () => {
    writeSanitizedDOM(readBuiltPage('resume/index.html'));
    expectMetaDescriptions(copy.resume.description);
    expect(node('ProfilePage').description).toBe(copy.resume.description);
    expect(ogCards.resume.description).toBe(copy.resume.description);
  });

  it('takes the Person job title and address from the profile entry', () => {
    writeSanitizedDOM(readBuiltPage('resume/index.html'));
    const person = node('Person');
    expect(person.jobTitle).toBe(myself.title);
    expect(person.address).toEqual({
      '@type': 'PostalAddress',
      addressLocality: myself.address.locality,
      addressRegion: myself.address.region,
      addressCountry: myself.address.country,
    });
    const location = `${myself.address.locality}, ${myself.address.region}`;
    expect(text(document.querySelector('.resume-contact__location'))).toBe(location);
    const dt = [...document.querySelectorAll('.resume-canvas-meta dt')].find(
      (el) => text(el) === 'Location',
    );
    expect(text(dt.nextElementSibling)).toBe(location);
  });

  it('emits the same alumniOf list as the homepage', () => {
    writeSanitizedDOM(readBuiltPage('index.html'));
    const home = node('Person').alumniOf;
    writeSanitizedDOM(readBuiltPage('resume/index.html'));
    expect(node('Person').alumniOf).toEqual(home);
    expect(home).toEqual([
      { '@type': 'CollegeOrUniversity', name: 'George Mason University' },
      { '@type': 'Organization', name: experience['disney-ncp'].alumniOrganization },
    ]);
  });

  it('renders both availability renditions from the profile entry', () => {
    writeSanitizedDOM(readBuiltPage('resume/index.html'));
    const dt = [...document.querySelectorAll('.resume-canvas-meta dt')].find(
      (el) => text(el) === 'Availability',
    );
    expect(text(dt.nextElementSibling)).toBe(myself.availability.long);
    expect(text(document.querySelector('.resume-cta__lede'))).toBe(myself.availability.short);
  });

  it('renders each highlight card from its experience entry, in the selected order', () => {
    writeSanitizedDOM(readBuiltPage('resume/index.html'));
    const cards = [...document.querySelectorAll('.resume-highlight')];
    expect(cards.map(text)).toEqual([
      experience['disney-ncp'].highlights.ncpv3,
      experience['disney-ncp'].highlights['vega-os'],
      experience['disney-ncp'].highlights['pr-review-pipeline'],
      experience['disney-ncp'].highlights['device-intelligence'],
      experience.cnn.highlights['magic-wall'],
    ]);
    expect(cards.map((card) => card.className.match(/resume-highlight--(\w+)/)[1])).toEqual([
      'red',
      'yellow',
      'blue',
      'red',
      'yellow',
    ]);
  });

  it('introduces Projects and Writing with their résumé renditions', () => {
    writeSanitizedDOM(readBuiltPage('resume/index.html'));
    expect(text(document.querySelector('.resume-projects__desc'))).toBe(
      copy.projects.resumeDescription,
    );
    expect(text(document.querySelector('.resume-writing__lead strong'))).toBe(
      `${copy.blog.title}—`,
    );
    const blogLink = document.querySelector('.resume-writing__lead a');
    expect(blogLink.getAttribute('href')).toBe('/blog/');
    expect(blogLink.firstChild.textContent.trim()).toBe(myself.blog);
    expect(text(document.querySelector('.resume-writing__desc'))).toBe(copy.blog.resumeDescription);
  });

  it('titles each selected essay from its post, honoring resumeTitle', () => {
    writeSanitizedDOM(readBuiltPage('resume/index.html'));
    const links = [...document.querySelectorAll('.resume-writing__essays a')];
    expect(links.length).toBeGreaterThan(0);
    let overrides = 0;
    for (const link of links) {
      const id = link.getAttribute('href').match(/^\/blog\/([^/]+)\/$/)[1];
      const post = frontmatter(`src/content/blog/${id}.md`);
      if (post.resumeTitle) {
        overrides += 1;
        // Like seoTitle, a trim of the headline and never a different one
        // (specs/seo-metadata.md § Blog Title Hierarchy): every word it uses
        // comes from `title`.
        const words = (s) => s.toLowerCase().match(/[\p{L}\p{N}'’-]+/gu);
        const headline = new Set(words(post.title));
        for (const word of words(post.resumeTitle)) {
          expect(headline.has(word), `${id}: resumeTitle word "${word}" is not in title`).toBe(
            true,
          );
        }
      }
      expect(link.firstChild.textContent.trim(), id).toBe(post.resumeTitle ?? post.title);
    }
    // The control: the override path is exercised, not just the fallback.
    expect(overrides).toBeGreaterThan(0);
  });
});

describe('projects index copy owners (#1166)', () => {
  it('fills the description with the derived count and shares the social line with its card', () => {
    writeSanitizedDOM(readBuiltPage('projects/index.html'));
    const count = node('ItemList').itemListElement.length;
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    const word = words[count] ?? String(count);
    expect(copy.projects.description.startsWith('{count}')).toBe(true);
    const description = copy.projects.description.replace(
      '{count}',
      `${word[0].toUpperCase()}${word.slice(1)}`,
    );
    expectMetaDescriptions(description, copy.projects.ogDescription);
    expect(node('CollectionPage').description).toBe(description);
    expect(ogCards.projects.description).toBe(copy.projects.ogDescription);
  });
});

describe('publication copy owners (#1166)', () => {
  it('names and describes the RSS channel from the blog entry', () => {
    const feed = new DOMParser().parseFromString(readBuiltPage('rss.xml'), 'application/xml');
    const channel = feed.querySelector('channel');
    expect(channel.querySelector(':scope > title').textContent).toBe(copy.blog.title);
    expect(channel.querySelector(':scope > description').textContent).toBe(
      copy.blog.feedDescription,
    );
  });

  it('titles the feed-discovery link on every page with the publication name', () => {
    const pages = builtPagePaths();
    expect(pages.length).toBeGreaterThan(20);
    for (const page of pages) {
      const html = readFileSync(page, 'utf-8');
      const link = html.match(/<link rel="alternate" type="application\/rss\+xml"[^>]*>/);
      expect(link, `${relative(ROOT, page)} has no feed-discovery link`).not.toBeNull();
      expect(link[0]).toContain(`title="${copy.blog.title}"`);
    }
  });
});

describe('footer location (#1166)', () => {
  it('bylines every footer with the profile locality', () => {
    let footers = 0;
    for (const page of builtPagePaths()) {
      writeSanitizedDOM(readFileSync(page, 'utf-8'));
      for (const attribution of document.querySelectorAll('.site-footer__attribution')) {
        footers += 1;
        expect(
          text(attribution).endsWith(`· ${myself.address.locality}`),
          `${relative(ROOT, page)}: "${text(attribution)}"`,
        ).toBe(true);
      }
    }
    expect(footers, 'the walk found no footers to check').toBeGreaterThan(0);
  });
});

describe('owned copy is not retyped in templates (#1166)', () => {
  // Sentence-length values only: short ones such as the publication name are
  // quoted in documentation comments, and a name that drifts in a comment
  // renders nothing. The projects description is checked after its
  // placeholder, which is the only part a template could have copied.
  const owned = [
    ...Object.entries(copy).flatMap(([id, fields]) =>
      Object.entries(fields).map(([field, value]) => [
        `site-copy/${id}.${field}`,
        value.replace('{count} ', ''),
      ]),
    ),
    ['myself.availability.long', myself.availability.long],
    ['myself.availability.short', myself.availability.short],
    ...Object.entries(experience).flatMap(([id, entry]) =>
      Object.entries(entry.highlights).map(([key, value]) => [
        `experience/${id}.highlights.${key}`,
        value,
      ]),
    ),
  ].filter(([, value]) => value.length >= 35);

  const sources = findFilesRecursively(SRC, (f) => /\.(astro|ts|js|mjs)$/.test(f));

  it('finds every owned sentence only in its content file', () => {
    expect(owned.length).toBeGreaterThan(15);
    const offenders = [];
    for (const file of sources) {
      const body = readFileSync(file, 'utf-8');
      for (const [name, value] of owned) {
        if (body.includes(value)) offenders.push(`${relative(SRC, file)} retypes ${name}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('reaches the consumers, which read their owners', () => {
    // The control for the guard above: a zero-hit search proves nothing unless
    // the walk reaches the files that render this copy.
    const walked = sources.map((f) => relative(SRC, f));
    const consumers = {
      'pages/index.astro': /getSiteCopy\('home'\)/,
      'pages/resume.astro': /getSiteCopy\('resume'\)/,
      'pages/projects/index.astro': /getSiteCopy\('projects'\)/,
      'pages/rss.xml.ts': /getSiteCopy\('blog'\)/,
      'layouts/BaseLayout.astro': /getSiteCopy\('blog'\)/,
      'components/resume/WritingSection.astro': /getSiteCopy\('blog'\)/,
      'components/resume/ProjectsSection.astro': /getSiteCopy\('projects'\)/,
      'pages/og-templates/home.astro': /getSiteCopy\('home'\)/,
      'pages/og-templates/projects.astro': /getSiteCopy\('projects'\)/,
      'pages/og-templates/resume.astro': /getSiteCopy\('resume'\)/,
      'pages/og-templates/blog.astro': /getSiteCopy\('blog'\)/,
    };
    for (const [consumer, reads] of Object.entries(consumers)) {
      expect(walked, `the walk never reached ${consumer}`).toContain(consumer);
      expect(readFileSync(resolve(SRC, consumer), 'utf-8'), consumer).toMatch(reads);
    }
  });
});
