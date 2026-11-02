import { describe, it, expect, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';
import { DIST, builtPagePaths, readBuiltPage, writeSanitizedDOM } from './helpers/dom.js';
import { HOW_I_WRITE_PATH, HOW_I_WRITE_TITLE } from '../src/lib/how-i-write';

/**
 * /how-i-write/ (specs/how-i-write.md, #1494): the policy page on how the
 * posts and case studies are written, and the link to it beside Privacy on
 * every page.
 *
 * The copy is owner-approved verbatim, so these tests do not pin its wording:
 * they check that the built page renders the owning Markdown file, that the
 * two claims the page makes about the repository stay true (the workflow link
 * resolves to the file at a pinned commit, and every entry has a facts
 * ledger), and that every built page carries the link where the spec puts it.
 * Assertions read the BUILT HTML with scripts removed.
 */

const ROOT = resolve(__dirname, '..');
const COPY_FILE = resolve(ROOT, 'src/content/site-copy/how-i-write.md');
const copySource = readFileSync(COPY_FILE, 'utf-8');
const copy = parseFrontmatter(copySource);
/** The Markdown body: everything after the closing frontmatter fence. */
const body = copySource.replace(/^---\n[\s\S]*?\n---\n/, '').trim();

const text = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const meta = (selector) => document.querySelector(selector)?.getAttribute('content');
const graph = () =>
  JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
const node = (type) => graph().find((entry) => entry['@type'] === type);

/** Text as the reader sees it: quotes and apostrophes straightened, whitespace collapsed. */
const normalize = (value) =>
  value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * A Markdown source paragraph as the reader sees it. The only Markdown the
 * copy uses is strong emphasis and an inline HTML link, so the emphasis marks
 * are dropped and the HTML is read through the parser (textContent), never
 * stripped with a pattern.
 */
const sourceText = (paragraph) =>
  normalize(
    new DOMParser().parseFromString(paragraph.replace(/\*\*/g, ''), 'text/html').body.textContent,
  );

const WORKFLOW_LINK =
  /^https:\/\/github\.com\/nathanjohnpayne\/nathanpaynedotcom\/blob\/([0-9a-f]{40})\/docs\/blog-writing-workflow\.md$/;

describe('/how-i-write/ page (specs/how-i-write.md)', () => {
  beforeAll(() => {
    writeSanitizedDOM(readBuiltPage('how-i-write/index.html'));
  });

  it('is built at the path the constants name', () => {
    expect(HOW_I_WRITE_PATH).toBe('/how-i-write/');
    expect(existsSync(resolve(DIST, 'how-i-write/index.html'))).toBe(true);
  });

  it('titles the page, breadcrumb and headline "How I write"', () => {
    expect(HOW_I_WRITE_TITLE).toBe('How I write');
    expect(document.title).toBe('How I write | Nathan Payne');
    expect(text(document.querySelector('h1'))).toBe(HOW_I_WRITE_TITLE);
    expect(document.querySelectorAll('h1')).toHaveLength(1);
    const crumbs = document.querySelector('.breadcrumbs');
    expect(crumbs.querySelector('a').getAttribute('href')).toBe('/');
    expect(text(crumbs.querySelector('[aria-current="page"]'))).toBe(HOW_I_WRITE_TITLE);
  });

  it('renders every paragraph of the owning Markdown body, in order', () => {
    const expected = body.split(/\n{2,}/).map(sourceText);
    const rendered = [...document.querySelectorAll('.policy-copy > p')].map((p) =>
      normalize(p.textContent),
    );
    // Control: the body is real prose, not an empty file that trivially matches.
    expect(expected.length).toBeGreaterThanOrEqual(4);
    expect(rendered).toEqual(expected);
  });

  it('opens by naming what AI agents do (#1491)', () => {
    const first = text(document.querySelector('.policy-copy > p'));
    expect(first).toMatch(/^AI agents write most of the posts and case studies on this site\./);
  });

  it('links the public workflow pinned to a full commit SHA that contains it', () => {
    const links = [...document.querySelectorAll('.policy-copy a')].filter((a) =>
      WORKFLOW_LINK.test(a.getAttribute('href')),
    );
    expect(links, 'no pinned link to docs/blog-writing-workflow.md').toHaveLength(1);
    const [link] = links;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener');
    const sha = link.getAttribute('href').match(WORKFLOW_LINK)[1];
    // The commit must exist locally and hold the file. CI checks out with
    // full history (build-and-test.yml, fetch-depth: 0).
    expect(() =>
      execFileSync('git', ['cat-file', '-e', `${sha}:docs/blog-writing-workflow.md`], {
        cwd: ROOT,
        stdio: 'ignore',
      }),
    ).not.toThrow();
  });

  it('reads its metadata, deck and share card from the site-copy entry', () => {
    expect(meta('meta[name="description"]')).toBe(copy.description);
    expect(meta('meta[property="og:description"]')).toBe(copy.ogDescription);
    expect(meta('meta[name="twitter:description"]')).toBe(copy.ogDescription);
    expect(text(document.querySelector('.policy-header .deck'))).toBe(copy.ogDescription);
    expect(node('WebPage').description).toBe(copy.description);
    const ogCards = JSON.parse(readFileSync(resolve(ROOT, '.astro/og-cards.json'), 'utf-8'));
    expect(ogCards['how-i-write'].description).toBe(copy.ogDescription);
    expect(ogCards['how-i-write'].heading).toBe(HOW_I_WRITE_TITLE);
    expect(meta('meta[property="og:image"]')).toMatch(
      /^https:\/\/nathanpayne\.com\/og\/how-i-write\.png\?v=\d+$/,
    );
    expect(copy.ogDescription).not.toBe(copy.description);
  });

  it('carries a WebPage and a two-step BreadcrumbList', () => {
    const page = node('WebPage');
    expect(page.url).toBe('https://nathanpayne.com/how-i-write/');
    expect(page.author).toEqual({ '@id': 'https://nathanpayne.com/#person' });
    const crumbs = node('BreadcrumbList').itemListElement;
    expect(crumbs.map((c) => c.name)).toEqual(['Nathan Payne', HOW_I_WRITE_TITLE]);
    expect(crumbs[1].item).toBe('https://nathanpayne.com/how-i-write/');
  });

  it('is canonical, indexable and in the sitemap without a lastmod', () => {
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe(
      'https://nathanpayne.com/how-i-write/',
    );
    expect(document.querySelector('meta[name="robots"][content*="noindex"]')).toBeNull();
    const sitemap = readFileSync(resolve(DIST, 'sitemap-0.xml'), 'utf-8');
    const entry = sitemap.match(
      /<url>(?:(?!<\/url>)[\s\S])*nathanpayne\.com\/how-i-write\/[\s\S]*?<\/url>/,
    );
    expect(entry, '/how-i-write/ is not in the sitemap').not.toBeNull();
    expect(entry[0]).not.toContain('<lastmod>');
  });

  it('offers the homepage from its footer', () => {
    const hrefs = [...document.querySelectorAll('.site-footer__nav a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toContain('/');
  });
});

describe('every post and case study has a facts ledger (the page says so)', () => {
  const LEDGER_DIRS = ['plans', 'plans/759', 'plans/correctness-pass-2026-10-06'];
  // The same inventories the collections load (src/content.config.ts): `blog`
  // takes `**/*.md`, and `projects` takes `**/*.{md,mdx}`, as
  // tests/ai-use-stamp.test.js enumerates them.
  const entries = [
    ['src/content/blog', /\.md$/],
    ['src/content/projects', /\.mdx?$/],
  ].flatMap(([dir, pattern]) =>
    readdirSync(resolve(ROOT, dir), { recursive: true })
      .map(String)
      .filter((name) => pattern.test(name))
      .map((name) => `${dir}/${name}`),
  );

  it('finds the entries, drafts included', () => {
    // Control: the walk reaches both collections.
    expect(entries.some((e) => e.startsWith('src/content/blog/'))).toBe(true);
    expect(entries.some((e) => e.startsWith('src/content/projects/'))).toBe(true);
    expect(entries.length).toBeGreaterThanOrEqual(18);
  });

  it('pairs each entry with a <slug>-ledger.md under plans/', () => {
    const missing = entries.filter((entry) => {
      const slug = entry
        .split('/')
        .at(-1)
        .replace(/\.mdx?$/, '');
      return !LEDGER_DIRS.some((dir) => existsSync(resolve(ROOT, dir, `${slug}-ledger.md`)));
    });
    expect(
      missing,
      'The /how-i-write/ copy says every post and case study has a facts ledger. ' +
        'Add the ledger (docs/agents/blog-revision-process.md § The facts ledger) ' +
        'or change the sentence, with the owner approving the new copy.',
    ).toEqual([]);
  });
});

describe('the /how-i-write/ link beside Privacy on every page (specs/how-i-write.md § Links)', () => {
  const pages = builtPagePaths();

  it('reaches every built page', () => {
    expect(pages.length).toBeGreaterThan(20);
    const missing = pages.filter(
      (page) => !readFileSync(page, 'utf-8').includes(`href="${HOW_I_WRITE_PATH}"`),
    );
    expect(missing.map((page) => relative(DIST, page))).toEqual([]);
  });

  it('puts an icon named "How I write" just before the Privacy icon in every footer', () => {
    let footers = 0;
    for (const page of pages) {
      writeSanitizedDOM(readFileSync(page, 'utf-8'));
      for (const nav of document.querySelectorAll('.site-footer__nav')) {
        footers += 1;
        const where = relative(DIST, page);
        const icon = nav.querySelector(`a[href="${HOW_I_WRITE_PATH}"]`);
        expect(icon, `${where}: no footer link`).not.toBeNull();
        expect(icon.classList.contains('nav-button'), where).toBe(true);
        expect(icon.classList.contains('nav-button--icon'), where).toBe(true);
        expect(icon.getAttribute('aria-label'), where).toBe(HOW_I_WRITE_TITLE);
        expect(icon.getAttribute('title'), where).toBe(HOW_I_WRITE_TITLE);
        expect(text(icon), `${where}: icon-only`).toBe('');
        const svg = icon.querySelector('svg.nav-icon');
        expect(svg?.getAttribute('aria-hidden'), where).toBe('true');
        expect(svg.querySelectorAll('path')).toHaveLength(8);
        const next = icon.nextElementSibling;
        expect(next?.getAttribute('data-np-privacy-ui'), `${where}: Privacy follows`).toBe(
          'footer-link',
        );
        expect(next.nextElementSibling, `${where}: Privacy stays last`).toBeNull();
      }
    }
    expect(footers, 'the walk found no footers to check').toBeGreaterThan(5);
  });

  it('rides the homepage Connect line as a worded peer just before Privacy', () => {
    writeSanitizedDOM(readBuiltPage('index.html'));
    const link = document.querySelector('.availability-signal .availability-how-i-write');
    expect(link?.getAttribute('href')).toBe(HOW_I_WRITE_PATH);
    expect(link.classList.contains('p-link')).toBe(true);
    expect(link.querySelector('.link-arrow')).not.toBeNull();
    expect(link.textContent.replace('→', '').trim()).toBe(HOW_I_WRITE_TITLE);
    const items = [...document.querySelectorAll('.availability-signal .availability-item')];
    const at = items.findIndex((item) => item.contains(link));
    expect(items[at - 1].querySelector('.availability-resume')).not.toBeNull();
    expect(items[at + 1].querySelector('.availability-privacy')).not.toBeNull();
  });

  it('leads the words with the icon among the 404 destinations, just before Privacy', () => {
    writeSanitizedDOM(readBuiltPage('404.html'));
    const link = document.querySelector(`.project-actions a[href="${HOW_I_WRITE_PATH}"]`);
    expect(link?.classList.contains('nav-button')).toBe(true);
    expect(link.firstElementChild.matches('svg.nav-icon')).toBe(true);
    expect(text(link)).toBe(HOW_I_WRITE_TITLE);
    expect(link.nextElementSibling?.getAttribute('data-np-privacy-ui')).toBe('footer-link');
  });
});
