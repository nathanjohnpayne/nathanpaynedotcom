import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve, join, relative } from 'path';
import { extractFrontmatter, parseFrontmatter } from '@astrojs/markdown-remark';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { writeSanitizedDOM } from './helpers/dom.js';

// Smoke tests for the content-collection-driven project detail pages.
// See specs/project-pages.md and issue #156.
//
// These tests read from the already-built dist/ directory — `npm test`
// runs `astro build && vitest run`, so dist/ is always fresh.

const DIST = resolve(__dirname, '../dist');
const CONTENT = resolve(__dirname, '../src/content/projects');

// Read source assertions through Astro's frontmatter parser so equivalent YAML
// spellings (for example, `1` and `1.0`) cannot disagree between the build and
// the test suite.
function parseProjectFrontmatter(markdown, label) {
  if (extractFrontmatter(markdown) == null) {
    throw new Error(`${label} is missing YAML frontmatter`);
  }

  const parsed = parseFrontmatter(markdown).frontmatter;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} frontmatter must be a YAML mapping`);
  }
  return parsed;
}

function readProjectFrontmatter(file) {
  return parseProjectFrontmatter(readFileSync(join(CONTENT, file), 'utf-8'), file);
}

// Rewrite interpolation-free template literals back to single-quoted strings.
// The three JS string delimiters are interchangeable for a literal containing
// no backslash, quote, newline, or `${`, so this is a pure re-serialization of
// minifier output — it does not widen what an assertion accepts. See #640.
function normalizeTemplateLiterals(code) {
  return code.replace(/`([^`\\\r\n'"]*)`/g, (match, body) =>
    body.includes('${') ? match : `'${body}'`,
  );
}

const projectSlugs = [
  'five-across',
  'mergepath',
  'override',
  'device-source-of-truth',
  'matchline',
  'swipe-watch',
  'friends-and-family-billing',
];

const canonicalProjectCards = [
  { title: 'Five Across', href: '/projects/five-across/' },
  { title: 'Mergepath', href: '/projects/mergepath/' },
  { title: 'Override', href: '/projects/override/' },
  { title: 'Device Source of Truth', href: '/projects/device-source-of-truth/' },
  { title: 'Matchline', href: '/projects/matchline/' },
  { title: 'Swipe Watch', href: '/projects/swipe-watch/' },
  { title: 'Friends & Family Billing', href: '/projects/friends-and-family-billing/' },
];

const homepageProjectDescriptions = [
  'Live multiplayer bingo that turns a group trip into a shared game—daily themed cards, offline-first marking, and a choreographed finale, live-operated through a nine-night cruise at sea.',
  'A deterministic repository standard that keeps humans and AI coding agents aligned—the enforcement layer underneath every other project on this site.',
  'A financial operating system for Broadway productions—models capitalization and investor returns, manages ownership, and shares a read-only deal room with backers instead of spreadsheet and PDF workflows.',
  'A single web application that tracks partner-device hardware, DRM, codec support, and operational readiness across Disney+, Hulu, and ESPN.',
  'A career CRM for one person running a serious job search—turns work history into structured, reusable evidence, maps it against specific job requirements, and generates applications grounded in demonstrated work.',
  'A swipe-based discovery experiment for Disney+ and Hulu that turns expressing taste into a game—built in vanilla JS across three days of one week.',
  'Cloud-synced shared-bill coordination for families and friend groups—turns recurring costs into clear annual invoices, payment tracking, and shareable summaries.',
];

// The canonical six-row Mondrian sequence from #733. Its geometry cycles, but
// accent placement is boundary-aware: later `grid-row--1` entries open with
// yellow + paper instead of placing red immediately after the closing red row.
// Expressed as one cycle plus a derivation so adding a project extends the
// expectation rather than breaking it (#627 comment 5399490885).
const projectIndexAccentCycle = [
  { rowClass: 'grid-row--1', accentClasses: ['accent-red', 'accent-paper'] },
  { rowClass: 'grid-row--2', accentClasses: ['accent-blue'] },
  { rowClass: 'grid-row--3', accentClasses: ['accent-black'] },
  { rowClass: 'grid-row--4', accentClasses: ['accent-yellow', 'accent-paper'] },
  { rowClass: 'grid-row--overflow-a', accentClasses: ['accent-blue'] },
  { rowClass: 'grid-row--overflow-b', accentClasses: ['accent-red'] },
];

const projectIndexAccentRows = canonicalProjectCards.map((_, i) =>
  i > 0 && i % projectIndexAccentCycle.length === 0
    ? { ...projectIndexAccentCycle[0], accentClasses: ['accent-yellow', 'accent-paper'] }
    : projectIndexAccentCycle[i % projectIndexAccentCycle.length],
);

// The canonical accent ramp. `accent` stays an authored frontmatter field, but
// it is not free-form: the five interior-register planes run in one fixed
// sequence indexed by `order` — warm, bright, neutral, cool, dark — so each
// project added to the portfolio takes the next color in the walk instead of a
// hand-picked one. Indexed by `order`, not by array position, so a reorder
// re-colors the affected project pages rather than silently breaking the
// sequence. The projects-index Mondrian grid is a separate accent system and
// is unaffected. See specs/project-pages.md § Accent ramp.
const projectAccentRamp = ['red', 'yellow', 'paper', 'blue', 'black'];

// Projects without a deployed live URL — the "View Live Product" CTA
// is suppressed on the detail page, the project card, and the homepage
// Builds section. The SoftwareApplication JSON-LD entity is also
// dropped on these pages (no `url:` to populate).
const noLiveUrlSlugs = ['matchline'];

// Every project source the collection would load, as paths relative to CONTENT.
//
// The glob in src/content.config.ts is `**/*.{md,mdx}` — recursive, and it
// takes both extensions. A flat `readdirSync` filter therefore under-reports
// on two independent axes, and both failures are silent: a nested project, or
// (before #759) an .mdx one, simply drops out of whatever the caller was
// enforcing. Mirror the glob here so the guards below cannot go quietly
// out of sync with what actually ships.
function projectSourceFiles() {
  return findFilesRecursively(CONTENT, (filePath) => /\.mdx?$/.test(filePath)).map((filePath) =>
    relative(CONTENT, filePath),
  );
}

function readDistHtml(relativePath) {
  return readFileSync(resolve(DIST, relativePath), 'utf-8');
}

function setupDOM(rawHtml) {
  // Scripts are removed on a detached document and the doctype preserved by
  // the shared helper — see tests/helpers/dom.js for why both matter.
  writeSanitizedDOM(rawHtml);
}

describe('Project Pages — routes', () => {
  it('every project slug generates a static HTML file in dist/', () => {
    for (const slug of projectSlugs) {
      const path = join(DIST, 'projects', slug, 'index.html');
      expect(existsSync(path), `missing /projects/${slug}/index.html`).toBe(true);
    }
  });

  it('the projects index page links to every non-draft project slug', () => {
    setupDOM(readDistHtml('projects/index.html'));

    for (const slug of projectSlugs) {
      const link = document.querySelector(`a[href="/projects/${slug}/"]`);
      expect(link, `projects index missing link to /projects/${slug}/`).not.toBeNull();
    }
  });

  it('the projects index keeps the route title while branding the H1 as Built with Agents', () => {
    setupDOM(readDistHtml('projects/index.html'));

    const title = document.querySelector('title');
    const heading = document.querySelector('h1');
    const breadcrumb = document.querySelector('.breadcrumbs');
    const canonical = document.querySelector('link[rel="canonical"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const deck = document.querySelector('.hero .deck');

    expect(title?.textContent).toBe('Projects | Nathan Payne');
    expect(heading?.textContent).toBe('Built with Agents');
    expect(breadcrumb?.textContent).toContain('Projects');
    expect(canonical?.getAttribute('href')).toBe('https://nathanpayne.com/projects/');
    expect(ogTitle?.getAttribute('content')).toBe('Projects | Nathan Payne');
    expect(ogDescription?.getAttribute('content')).toBe(
      'Each one a real problem turned into a systems design exercise—from first commit to deploy.',
    );
    const deckText = deck?.textContent?.replace(/\s+/g, ' ').trim();
    expect(deckText).toBe(
      'Every build started as a real problem. Each one became a systems design exercise—from first commit to deploy, on top of an enforcement system I designed to make agent output reliable. The infrastructure behind these projects is documented in Agent Approval Workflow and the Genesis of Mergepath.',
    );
    expect(deckText).not.toContain('built with AI agents');
  });

  it('the homepage Projects panel keeps wayfinding labels while promoting the Built with Agents heading', () => {
    setupDOM(readDistHtml('index.html'));

    expect(document.body.getAttribute('data-palette')).toBe('1930');

    const panel = document.querySelector('[data-panel="projects"]');
    const panelLabel = panel?.querySelector('.panel-label');
    const projectItems = [...panel.querySelectorAll('.project-item')];

    expect(panel, 'homepage Projects panel missing').not.toBeNull();
    expect(panel.getAttribute('data-label')).toBe('Projects');
    expect(panelLabel?.textContent).toBe('Projects');
    expect(panelLabel?.getAttribute('aria-label')).toBe('Open Projects section');
    expect(panel.querySelector('.content-inner > .eyebrow')).toBeNull();
    expect(panel.querySelector('h2')?.textContent).toBe('Built with Agents');
    expect(panel.querySelector('.content-inner > p')?.textContent).toBe(
      'Every project started as a real problem and shipped end-to-end—Claude Code, Codex, and Cursor—within a multi-agent review system I designed to catch the failure modes agents miss.',
    );
    expect(
      projectItems.map((item) =>
        item.querySelector('.p-name')?.textContent.replace('→', '').trim(),
      ),
    ).toEqual(canonicalProjectCards.map((card) => card.title));
    expect(projectItems.map((item) => item.querySelector('.p-name')?.getAttribute('href'))).toEqual(
      canonicalProjectCards.map((card) => card.href),
    );
    expect(projectItems.map((item) => item.querySelector('p')?.textContent)).toEqual(
      homepageProjectDescriptions,
    );
    expect(homepageProjectDescriptions.join(' ')).not.toMatch(/\b(?:you|your)\b/i);
  });

  it('the projects index renders the canonical project order and updated Matchline copy', () => {
    setupDOM(readDistHtml('projects/index.html'));

    const links = [...document.querySelectorAll('.blog-grid .post-title a')];
    const matchlineCard = links
      .find((link) => link.textContent === 'Matchline')
      ?.closest('.post-card');
    const matchlineDescription = matchlineCard?.querySelector('.post-desc')?.textContent;

    expect(links.map((link) => link.textContent)).toEqual(
      canonicalProjectCards.map((card) => card.title),
    );
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      canonicalProjectCards.map((card) => card.href),
    );
    expect(matchlineDescription).toContain('generates applications grounded in demonstrated work');
    expect(matchlineDescription).not.toContain('what the user has actually done');
  });

  it('the projects index structured data exposes projects as an ItemList', () => {
    setupDOM(readDistHtml('projects/index.html'));

    const script = document.querySelector('script[type="application/ld+json"]');
    const jsonLd = JSON.parse(script.textContent);
    const collectionPage = jsonLd['@graph'].find((entry) => entry['@type'] === 'CollectionPage');
    const itemList = jsonLd['@graph'].find((entry) => entry['@type'] === 'ItemList');

    expect(collectionPage.mainEntity['@id']).toBe('https://nathanpayne.com/projects/#itemlist');
    expect(itemList).toBeDefined();
    expect(itemList.itemListElement.map((item) => item.item.name)).toEqual(
      canonicalProjectCards.map((card) => card.title),
    );
    expect(itemList.itemListElement[0]).toMatchObject({
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'WebPage',
        '@id': 'https://nathanpayne.com/projects/five-across/',
        url: 'https://nathanpayne.com/projects/five-across/',
        name: 'Five Across',
      },
    });
    expect(itemList.itemListElement[0].item.description.length).toBeLessThanOrEqual(160);
  });

  it('project detail pages can use concise SEO descriptions without changing card copy', () => {
    setupDOM(readDistHtml('projects/mergepath/index.html'));

    const description = document.querySelector('meta[name="description"]');
    const script = document.querySelector('script[type="application/ld+json"]');
    const jsonLd = JSON.parse(script.textContent);
    const webPage = jsonLd['@graph'].find((entry) => entry['@type'] === 'WebPage');
    const softwareApp = jsonLd['@graph'].find((entry) => entry['@type'] === 'SoftwareApplication');
    const metaDescription = description?.getAttribute('content');

    expect(metaDescription).toBe(
      'A repository standard for reliable AI-agent development: canonical docs, CI guardrails, multi-identity review, Codex review, and downstream propagation.',
    );
    expect(webPage.description).toBe(metaDescription);
    expect(webPage.keywords).toBe('Infrastructure, AI Tooling, GitHub Actions, Bash');
    expect(softwareApp.description).toBe(metaDescription);
    expect(softwareApp.sameAs).toEqual(['https://github.com/nathanjohnpayne/mergepath']);
  });

  it('the projects index keeps its Mondrian accent color sequence by row position', () => {
    setupDOM(readDistHtml('projects/index.html'));

    const rows = [...document.querySelectorAll('.blog-grid > div')];
    const titleByRow = rows.map((row) => row.querySelector('.post-title a')?.textContent);
    const accentClassesByRow = rows.map((row) =>
      [...row.querySelectorAll('[aria-hidden="true"]')].map((accent) =>
        [...accent.classList].find((className) => className.startsWith('accent-')),
      ),
    );

    expect(titleByRow).toEqual(canonicalProjectCards.map((card) => card.title));
    expect(
      rows.map((row) => [...row.classList].find((className) => className.startsWith('grid-row--'))),
    ).toEqual(projectIndexAccentRows.map((row) => row.rowClass));
    expect(accentClassesByRow).toEqual(projectIndexAccentRows.map((row) => row.accentClasses));
  });

  it('the collection source has the same number of non-draft projects as the index renders', () => {
    // Of the four guards that enumerate project sources, this is the only one
    // that fails LOUDLY when the enumeration drifts from the collection glob —
    // it compares a count against the rendered index, so a missed file reads as
    // `expected 6 to be 7`. The other three (raw palette fields, the accent
    // ramp, and the case-study/.mdx guard) just stop covering the file they
    // missed, in silence. That asymmetry is why all four share
    // projectSourceFiles() rather than each filtering for themselves.
    const sourceFiles = projectSourceFiles();
    const nonDraftSources = sourceFiles.filter(
      (file) => readProjectFrontmatter(file).draft !== true,
    );
    expect(nonDraftSources.length).toBe(projectSlugs.length);
  });

  it('project frontmatter does not carry raw palette color fields', () => {
    const sourceFiles = projectSourceFiles();

    for (const file of sourceFiles) {
      const frontmatter = readProjectFrontmatter(file);

      expect(Object.hasOwn(frontmatter, 'accentColor'), `${file} still declares accentColor`).toBe(
        false,
      );
      expect(
        Object.hasOwn(frontmatter, 'gradientFrom'),
        `${file} still declares gradientFrom`,
      ).toBe(false);
      expect(Object.hasOwn(frontmatter, 'gradientTo'), `${file} still declares gradientTo`).toBe(
        false,
      );
    }
  });

  it('evaluates the accent ramp from YAML-parsed values', () => {
    const frontmatter = parseProjectFrontmatter(
      '---\norder: 1.0\naccent: "yellow" # inline comments are valid YAML\n---\n',
      'regression fixture',
    );

    expect(frontmatter.order).toBe(1);
    expect(frontmatter.accent).toBe(
      projectAccentRamp[frontmatter.order % projectAccentRamp.length],
    );
  });

  it('every project accent follows the canonical ramp for its order', () => {
    const sourceFiles = projectSourceFiles();

    for (const file of sourceFiles) {
      const { order, accent } = readProjectFrontmatter(file);

      expect(Number.isInteger(order), `${file} order must be an integer`).toBe(true);
      expect(order, `${file} order must be non-negative`).toBeGreaterThanOrEqual(0);
      expect(accent, `${file} (order ${order}) breaks the accent ramp`).toBe(
        projectAccentRamp[order % projectAccentRamp.length],
      );
    }
  });
});

describe('Project Pages — render', () => {
  for (const slug of projectSlugs) {
    describe(`/projects/${slug}/`, () => {
      beforeEach(() => {
        setupDOM(readDistHtml(`projects/${slug}/index.html`));
      });

      it('has a non-empty <title> that includes "Nathan Payne"', () => {
        const title = document.querySelector('title')?.textContent;
        expect(title).toBeTruthy();
        expect(title).toMatch(/Nathan Payne/);
      });

      it('has a metadata strip with exactly four <dt>/<dd> items', () => {
        const strip = document.querySelector('.metadata-strip');
        expect(strip, '.metadata-strip not found').not.toBeNull();
        const items = strip.querySelectorAll('.metadata-strip__item');
        expect(items.length).toBe(4);
      });

      it('uses the data-accent token path instead of inline palette properties', () => {
        const body = document.body;
        const shell = document.querySelector('main.page-shell');
        const inlineStyle = shell?.getAttribute('style') || '';

        expect(body.getAttribute('data-accent')).toBeTruthy();
        expect(body.hasAttribute('data-palette')).toBe(false);
        expect(inlineStyle).not.toMatch(/--accent|--project-gradient/);
      });

      it('renders all four metadata labels (Topics, Format, Focus, Status)', () => {
        const labels = Array.from(document.querySelectorAll('.metadata-strip dt')).map((dt) =>
          dt.textContent.trim(),
        );
        expect(labels).toEqual(['Topics', 'Format', 'Focus', 'Status']);
      });

      it('has a <figure class="project-screenshot"> containing an accessible image', () => {
        const figure = document.querySelector('figure.project-screenshot');
        expect(figure, 'figure.project-screenshot not found').not.toBeNull();
        // The screenshot slot accepts either <img> (raster screenshots) or
        // <svg> (inline wordmarks; see ProjectMuxPlayer for why SVG fallbacks
        // are inlined rather than referenced via <img src=...>). Either path
        // must carry an accessible name.
        const img = figure.querySelector('img[alt]:not([alt=""])');
        const svg = figure.querySelector('svg');
        const roleImage = figure.querySelector('[role="img"][aria-label]');
        expect(
          img || svg || roleImage,
          'no accessible image inside .project-screenshot',
        ).not.toBeNull();
        if (img) {
          expect(img.getAttribute('src')).toBeTruthy();
          expect(img.getAttribute('alt')).toBeTruthy();
        } else if (svg) {
          // Inline SVG must carry image semantics so screen readers
          // announce it the way an <img alt="..."> would.
          expect(
            svg.getAttribute('role'),
            'inline <svg> in .project-screenshot must have role="img"',
          ).toBe('img');
          const ariaLabel = svg.getAttribute('aria-label');
          const titleEl = svg.querySelector('title');
          expect(
            ariaLabel || (titleEl && titleEl.textContent.trim()),
            'inline <svg> in .project-screenshot lacks an accessible name (aria-label or <title>)',
          ).toBeTruthy();
        }
      });

      it('has a .project-copy container with section headings', () => {
        // Was `toContain('Overview')`. That pinned the older Overview / What
        // the product does / Why it matters shape, which issue #752 removes
        // from Five Across and which most project pages are expected to leave
        // behind as they are reworked into case studies. specs/project-pages.md
        // § Body content structure now describes both shapes and mandates
        // neither, so the assertion is that the body IS sectioned — the thing
        // the layout actually depends on — not which words the sections use.
        const copy = document.querySelector('.project-copy');
        expect(copy, '.project-copy not found').not.toBeNull();
        const headings = Array.from(copy.querySelectorAll('h2')).map((h) => h.textContent.trim());
        expect(headings.length, `${slug}: .project-copy has no <h2> sections`).toBeGreaterThan(0);
        expect(
          headings.every((h) => h.length > 0),
          `${slug}: an <h2> in .project-copy is empty`,
        ).toBe(true);
      });

      it('renders the appropriate CTA actions for the project', () => {
        const actions = Array.from(document.querySelectorAll('.nav-button')).map((a) =>
          a.textContent.trim(),
        );
        // The "Back to Projects" / "Back to Homepage" footer actions also
        // share the .nav-button class, so filter to the hero CTAs by
        // checking for the canonical labels we render in HeroWide/Narrow.
        if (noLiveUrlSlugs.includes(slug)) {
          expect(actions).not.toContain('View Live Product');
        } else {
          expect(actions).toContain('View Live Product');
        }
        expect(actions).toContain('View on GitHub');
      });

      it('emits a JSON-LD graph; SoftwareApplication present iff project has a live URL', () => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        expect(scripts.length).toBeGreaterThan(0);

        let foundSoftwareApp = false;
        for (const script of scripts) {
          try {
            const ld = JSON.parse(script.textContent);
            const graph = Array.isArray(ld['@graph']) ? ld['@graph'] : [ld];
            if (graph.some((e) => e && e['@type'] === 'SoftwareApplication')) {
              foundSoftwareApp = true;
              break;
            }
          } catch {
            // malformed JSON-LD would fail another test; ignore here
          }
        }
        if (noLiveUrlSlugs.includes(slug)) {
          expect(foundSoftwareApp, 'pre-launch project should NOT emit SoftwareApplication').toBe(
            false,
          );
        } else {
          expect(foundSoftwareApp, 'no SoftwareApplication entity in JSON-LD graph').toBe(true);
        }
      });
    });
  }
});

describe('Project Pages — screenshot aspect variants', () => {
  it('Swipe Watch uses the narrow screenshot variant', () => {
    setupDOM(readDistHtml('projects/swipe-watch/index.html'));
    const figure = document.querySelector('figure.project-screenshot');
    expect(figure, 'figure.project-screenshot not found on swipe-watch').not.toBeNull();
    expect(figure.className).toContain('project-screenshot--narrow');
  });

  it('Swipe Watch renders mux-background-video with the Safari-safe hero config', () => {
    const html = readDistHtml('projects/swipe-watch/index.html');
    setupDOM(html);

    const player = document.querySelector('mux-background-video.project-screenshot__mux');
    expect(player, 'Swipe Watch mux-background-video not found').not.toBeNull();
    expect(document.querySelector('mux-player')).toBeNull();
    expect(player.getAttribute('src')).toBe(
      'https://stream.mux.com/wNCRY97981o2uDAJrJ3ExPeK379yldRRFJgUIgSYz00k.m3u8',
    );
    expect(player.getAttribute('preload')).toBe('auto');
    expect(player.hasAttribute('max-resolution')).toBe(false);

    const frame = document.querySelector('.project-screenshot__mux-shell[data-mux-hero]');
    expect(frame, 'Swipe Watch mux frame not found').not.toBeNull();
    expect(frame.getAttribute('data-playback-state')).toBe('loading');

    const mediaFrame = frame.querySelector('.project-screenshot__mux-frame');
    expect(mediaFrame.getAttribute('role')).toBe('img');
    expect(mediaFrame.getAttribute('aria-label')).toBe('Swipe Watch product screenshot');

    const gifFallback = frame.querySelector('.project-screenshot__mux-gif-fallback');
    expect(gifFallback, 'Swipe Watch Mux GIF fallback not found').not.toBeNull();
    expect(gifFallback.getAttribute('data-src')).toBe('/images/projects/swipe-watch-hero.gif');
    expect(gifFallback.hasAttribute('src')).toBe(false);
    expect(gifFallback.getAttribute('aria-hidden')).toBe('true');

    const playButton = frame.querySelector('.project-screenshot__mux-play[data-mux-play]');
    expect(playButton, 'Swipe Watch manual play button not found').not.toBeNull();
    expect(playButton.getAttribute('type')).toBe('button');
    expect(playButton.getAttribute('aria-label')).toBe('Play Swipe Watch demo');
    expect(playButton.hasAttribute('hidden')).toBe(true);

    const poster = player.querySelector('.project-screenshot__mux-poster');
    expect(poster, 'Swipe Watch poster img not found').not.toBeNull();
    expect(poster.getAttribute('src')).toBe(
      'https://image.mux.com/wNCRY97981o2uDAJrJ3ExPeK379yldRRFJgUIgSYz00k/thumbnail.jpg?width=1280&time=0',
    );
    expect(poster.getAttribute('aria-hidden')).toBe('true');

    const moduleSrcs = Array.from(
      html.matchAll(/<script type="module" src="([^"]+)"/g),
      (match) => match[1],
    );
    expect(moduleSrcs.length, 'No module scripts found').toBeGreaterThan(0);
    const muxScript = moduleSrcs
      .map((src) => readFileSync(resolve(DIST, src.replace(/^\//, '')), 'utf-8'))
      .find((code) => code.includes('https://cdn.jsdelivr.net/npm/mux-embed@5.18.0'));
    expect(muxScript, 'Mux runtime module not found').toBeTruthy();
    // Vite 8's minifier re-emits plain string literals as interpolation-free
    // template literals (`` `mux-background-video` ``). Normalize those back to
    // single quotes so every literal below stays pinned to an exact string
    // rather than being widened to accept arbitrary delimiters. See #640.
    const mux = normalizeTemplateLiterals(muxScript);
    expect(mux).toMatch(/querySelector\((['"])mux-background-video\1\)/);
    expect(mux).toContain("shadowRoot?.querySelector('video')");
    expect(mux).toContain('setTimeout');
    expect(mux).toContain("dataset.playbackState='fallback'");
    expect(mux).toContain("dataset.playbackState='playing'");
    expect(mux).toContain('.play()');
    expect(mux).toContain('currentTime>0');
    expect(html).not.toContain('PUBLIC_MUX_ENV_KEY');
    // #265 regression: when the mux-embed script tag already exists in a
    // settled (loaded/error) state, the loader must short-circuit to
    // Promise.resolve() instead of re-attaching listeners that will never
    // fire. Encoded via the dataset.muxEmbedStatus sentinel.
    expect(mux).toMatch(/muxEmbedStatus===['"]loaded['"]/);
    expect(mux).toMatch(/muxEmbedStatus===['"]error['"]/);
    expect(mux).toContain('Promise.resolve()');
  });

  it.each(['loaded', 'error'])(
    '#265 regression: loadMuxEmbed short-circuits when script[data-mux-embed] is already settled (%s)',
    async (settledStatus) => {
      const html = readDistHtml('projects/swipe-watch/index.html');
      setupDOM(html);

      // The bundle's top-level module logic reads `window.matchMedia`
      // eagerly; jsdom doesn't implement it, so stub it before importing.
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn((query) => ({
          matches: false,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          onchange: null,
          dispatchEvent: vi.fn(),
        })),
      });

      const moduleSrcs = Array.from(
        html.matchAll(/<script type="module" src="([^"]+)"/g),
        (match) => match[1],
      );
      const muxSrc = moduleSrcs.find((src) =>
        readFileSync(resolve(DIST, src.replace(/^\//, '')), 'utf-8').includes(
          'https://cdn.jsdelivr.net/npm/mux-embed@5.18.0',
        ),
      );
      expect(muxSrc, 'Mux runtime module not found').toBeTruthy();

      // Pre-seed a settled mux-embed script tag, mirroring a page revisit
      // where the embed already finished loading (or failed) earlier, and
      // spy on its listener registration: a broken settled-branch check
      // would re-attach 'load'/'error' listeners that can never fire on
      // this inert stub tag, hanging the loader's promise forever.
      const existingScript = document.createElement('script');
      existingScript.setAttribute('data-mux-embed', 'true');
      existingScript.dataset.muxEmbedStatus = settledStatus;
      const addEventListenerSpy = vi.spyOn(existingScript, 'addEventListener');
      document.head.appendChild(existingScript);

      // Import the built module fresh (cache-busted) so its top-level
      // loadMuxEmbed() invocation runs against our seeded DOM state.
      await import(
        /* @vite-ignore */ resolve(DIST, muxSrc.replace(/^\//, '')) + `?settled-${settledStatus}`
      );

      // Give the module's Promise chain a tick to settle.
      await new Promise((r) => setTimeout(r, 0));

      expect(
        addEventListenerSpy,
        'loadMuxEmbed must not attach load/error listeners to an already-settled script',
      ).not.toHaveBeenCalled();

      const muxEmbedScripts = document.querySelectorAll('script[data-mux-embed]');
      expect(
        muxEmbedScripts.length,
        'loadMuxEmbed must not append a new script when one is already settled',
      ).toBe(1);
      expect(muxEmbedScripts[0]).toBe(existingScript);
      expect(existingScript.dataset.muxEmbedStatus).toBe(settledStatus);
    },
  );

  it('only Swipe Watch opts into the Mux hero today', () => {
    for (const slug of projectSlugs.filter((projectSlug) => projectSlug !== 'swipe-watch')) {
      setupDOM(readDistHtml(`projects/${slug}/index.html`));
      expect(
        document.querySelector('mux-background-video'),
        `${slug} should not render a Mux background video`,
      ).toBeNull();
      expect(
        document.querySelector('mux-player'),
        `${slug} should not render mux-player`,
      ).toBeNull();
    }
  });

  it('the Five Across standings figure is tagged portrait and keeps its CLS reservation', () => {
    // The standings share card is 1800x2250. At full column width a portrait
    // image that tall swamps the prose around it, so rehype-figure-captions
    // tags taller-than-wide figures and global.css caps their width.
    setupDOM(readDistHtml('projects/five-across/index.html'));

    const figure = document.querySelector('figure.blog-figure');
    expect(figure, 'five-across: figure.blog-figure not found').not.toBeNull();
    expect(figure.className).toContain('blog-figure-portrait');

    // Width/height must survive the cap: they are what reserves the box before
    // a lazy-loaded image arrives. A `width: auto` cap would drop the reservation.
    const img = figure.querySelector('img');
    expect(img.getAttribute('width')).toBe('1800');
    expect(img.getAttribute('height')).toBe('2250');
    expect(img.getAttribute('loading')).toBe('lazy');

    const css = readdirSync(join(DIST, '_astro'))
      .filter((file) => file.endsWith('.css'))
      .map((file) => readFileSync(join(DIST, '_astro', file), 'utf8'))
      .join('\n');
    expect(css).toMatch(/\.blog-figure-portrait\s+img\s*\{[^}]*max-width:/);
    expect(css).not.toMatch(/\.blog-figure-portrait\s+img\s*\{[^}]*width:\s*auto/);
  });

  it('every inline project-page figure is registered in the dimension map', () => {
    // rehype-figure-captions only stamps width/height and the portrait cap on
    // images it can measure, and its `imageDimensions` map is hand-maintained.
    // An unregistered image renders at full column width with no CLS
    // reservation — invisible in a diff, visible only as a layout shift in the
    // browser. The five-across assertion above is slug-specific and so could
    // not catch three Swipe Watch captures shipping unregistered (Codex P2 on
    // PR #836); this one generalises it to every project page.
    const slugs = readdirSync(join(DIST, 'projects'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    expect(slugs.length).toBeGreaterThan(0);

    let figuresChecked = 0;
    for (const slug of slugs) {
      setupDOM(readDistHtml(`projects/${slug}/index.html`));

      for (const img of document.querySelectorAll('figure.blog-figure img')) {
        const src = img.getAttribute('src');
        const width = Number(img.getAttribute('width'));
        const height = Number(img.getAttribute('height'));

        expect(
          width,
          `${slug}: ${src} has no width — add it to imageDimensions`,
        ).toBeGreaterThan(0);
        expect(
          height,
          `${slug}: ${src} has no height — add it to imageDimensions`,
        ).toBeGreaterThan(0);

        if (height > width) {
          expect(
            img.closest('figure').className,
            `${slug}: ${src} is portrait and must carry blog-figure-portrait`,
          ).toContain('blog-figure-portrait');
        }
        figuresChecked += 1;
      }
    }

    expect(figuresChecked).toBeGreaterThan(0);
  });

  it('Mergepath, Matchline, Override, DST, and FFB use the wide screenshot variant', () => {
    const wideSlugs = [
      'mergepath',
      'matchline',
      'override',
      'device-source-of-truth',
      'friends-and-family-billing',
    ];
    for (const slug of wideSlugs) {
      setupDOM(readDistHtml(`projects/${slug}/index.html`));
      const figure = document.querySelector('figure.project-screenshot');
      expect(figure, `${slug}: figure.project-screenshot not found`).not.toBeNull();
      expect(figure.className, `${slug} should use project-screenshot--wide`).toContain(
        'project-screenshot--wide',
      );
    }
  });
});

// ── Case-study components (#759) ────────────────────────────────────
//
// DecisionLedger / ConstraintStrip / LearningLedger are portfolio
// infrastructure: one implementation shared by every project page that
// needs decisions, constraints or learnings. No page consumes them yet
// — PR 1 ships the system, and each page adopts it in its own PR — so
// these assert the component source and the shipped stylesheet rather
// than rendered markup. Render assertions against dist/ arrive with the
// first page that adopts them.
describe('Project Pages — case-study components', () => {
  const COMPONENTS = resolve(__dirname, '../src/components/projects');
  const componentNames = ['DecisionLedger', 'ConstraintStrip', 'LearningLedger'];

  function componentSource(name) {
    const path = join(COMPONENTS, `${name}.astro`);
    expect(existsSync(path), `${name}.astro missing from src/components/projects/`).toBe(true);
    return readFileSync(path, 'utf8');
  }

  function builtCss() {
    return readdirSync(join(DIST, '_astro'))
      .filter((file) => file.endsWith('.css'))
      .map((file) => readFileSync(join(DIST, '_astro', file), 'utf8'))
      .join('\n');
  }

  it('each component renders nothing when its array is empty or absent', () => {
    // The empty guard lives in the component, not at the call site, so a
    // page can place all three unconditionally and an un-authored field
    // is a no-op. The `?? []` also absorbs `undefined` from a page that
    // reached for `frontmatter.X` instead of `props.X` — in MDX those
    // differ, and only `props.X` carries the schema's `.default([])`.
    for (const name of componentNames) {
      const source = componentSource(name);
      expect(source, `${name}: must normalize a missing array`).toMatch(/\?\?\s*\[\]/);
      expect(source, `${name}: must guard on length before rendering`).toMatch(/\.length > 0/);
    }
  });

  it('every project slug is unique across the collection', () => {
    // getStaticPaths keys the route on `data.slug`, not on the file path, so
    // two files in different directories declaring the same slug collide on
    // one route. The filename-matches-slug convention makes that impossible
    // while every project is flat — and stops protecting anything the moment
    // one is nested, which the recursive glob allows (CodeRabbit, round 8).
    const bySlug = new Map();
    for (const file of projectSourceFiles()) {
      const { slug } = readProjectFrontmatter(file);
      bySlug.set(slug, [...(bySlug.get(slug) ?? []), file]);
    }

    const collisions = [...bySlug.entries()].filter(([, files]) => files.length > 1);
    expect(
      collisions,
      `slug collisions: ${collisions.map(([slug, files]) => `${slug} <- ${files.join(', ')}`).join('; ')}`,
    ).toEqual([]);
  });

  it('a project declaring case-study fields also renders them', () => {
    // The schema accepts `decisions` / `constraints` / `learnings` on ANY
    // project and [slug].astro forwards all three for every page, but the
    // data only reaches a reader if an .mdx body PLACES the component. Two
    // ways to author a page that builds clean, passes the suite, and shows
    // nothing — no error, no warning, no output:
    //
    //   1. Declare the fields in a .md file. No body can place a component.
    //   2. Declare them in .mdx and forget the component invocation.
    //
    // Both are the natural mistake while reworking these pages one PR at a
    // time, and neither the build nor the diff can see either. Checking only
    // the extension catches (1) and misses (2) (Codex P2, round 3).
    // Vacuous until the first page adopts a field.
    const FIELD_COMPONENTS = {
      decisions: { component: 'DecisionLedger', rootClass: 'decision-ledger' },
      constraints: { component: 'ConstraintStrip', rootClass: 'constraint-strip' },
      learnings: { component: 'LearningLedger', rootClass: 'learning-ledger' },
    };

    for (const file of projectSourceFiles()) {
      const frontmatter = readProjectFrontmatter(file);
      const declared = Object.keys(FIELD_COMPONENTS).filter(
        (field) => Array.isArray(frontmatter[field]) && frontmatter[field].length > 0,
      );
      if (declared.length === 0) continue;

      // A draft project is excluded by getStaticPaths, so dist/ has no page
      // to read and readDistHtml would throw ENOENT rather than fail with a
      // useful message (Codex P2, round 6). The extension check below still
      // applies to drafts — that one is about the source, not the render.
      const isDraft = frontmatter.draft === true;

      expect(
        file.endsWith('.mdx'),
        `${file} declares ${declared.join(', ')} but is .md — those fields cannot render from a Markdown body. Convert it to .mdx and place the component(s), or remove the frontmatter.`,
      ).toBe(true);

      if (isDraft) continue;

      // Assert the RENDERED page, not the source. A raw-source regex for
      // `<DecisionLedger` also matches the component inside a fenced code
      // example or a JSX comment — neither of which Astro executes — so the
      // silent data-loss case would survive the guard meant to catch it
      // (Codex P2, round 5). The built markup is the only evidence that a
      // reader actually sees the records, and it subsumes the import check:
      // a missing import fails the build outright.
      const html = readDistHtml(`projects/${frontmatter.slug}/index.html`);
      for (const field of declared) {
        const { component, rootClass } = FIELD_COMPONENTS[field];
        expect(
          html.includes(`class="${rootClass}`),
          `${file} declares ${field} but /projects/${frontmatter.slug}/ renders no .${rootClass} — place <${component}> in the body, or the records are authored and silently dropped.`,
        ).toBe(true);
      }
    }
  });

  it('components carry no <style> block — styles live in global.css', () => {
    // Only OgCard.astro carries scoped styles, and it is a build-time OG
    // template. Everything else is styled from the single stylesheet.
    //
    // Scoped to the template half: the component frontmatter is JS and
    // its doc comments discuss `<style>` in prose, which a whole-file
    // match reads as a violation.
    for (const name of componentNames) {
      const source = componentSource(name);
      const template = source.split(/^---$/m).slice(2).join('---');
      expect(template.length, `${name}: could not isolate the template half`).toBeGreaterThan(0);
      expect(template, `${name}: unexpected <style> block`).not.toMatch(/<style[\s>]/);
    }
  });

  it('DecisionLedger maps every schema status, and pending takes the base marker', () => {
    const source = componentSource('DecisionLedger');
    for (const status of ['validated', 'mixed', 'revised', 'pending']) {
      expect(source, `DecisionLedger: no label for status "${status}"`).toContain(`${status}:`);
    }
    // `pending` deliberately has NO modifier class: the base marker is an
    // empty outline, which is what pending means. The stylesheet below
    // therefore defines exactly three modifiers, not four.
    expect(source).toMatch(/status === 'pending'/);
  });

  it('DecisionLedger labels pending evidence as a boundary, not an observation', () => {
    // `evidence` is required for every status, but it carries a different
    // kind of claim when the status is `pending`: the schema contract makes
    // it the validation boundary — why the evidence is not in yet — rather
    // than something observed. Labelling that "Observed" asserts an
    // observation that has not happened (Codex P2, round 6).
    const source = componentSource('DecisionLedger');
    expect(source, 'evidence label must vary by status').toMatch(/EVIDENCE_LABELS\[decision\.status\]/);
    expect(source).toMatch(/pending:\s*'Validation boundary'/);
    for (const status of ['validated', 'mixed', 'revised']) {
      expect(source, `${status} must keep the Observed label`).toMatch(
        new RegExp(`${status}:\\s*'Observed'`),
      );
    }
  });

  it('the four decision statuses render as visual peers', () => {
    // The load-bearing invariant of this component (#759): `validated`
    // must not read as success and `mixed` / `revised` / `pending` must
    // not read as error states. The statuses share one type treatment and
    // differ ONLY in the fill of their square marker. A later edit that
    // colors a status, bolds it, or shrinks it breaks the contract that
    // makes the failure states credible rather than apologetic — so pin
    // it here rather than trusting a comment.
    const css = builtCss();
    const modifiers = css.match(/\.decision-ledger__status--[a-z]+:{1,2}before\{[^}]*\}/g) ?? [];
    expect(modifiers.length, 'expected exactly three status modifiers').toBe(3);

    for (const rule of modifiers) {
      expect(rule, `status modifier must not restyle type: ${rule}`).not.toMatch(
        /(^|[;{])(color|font-size|font-weight|letter-spacing|text-transform):/,
      );
      // Every marker derives from the page accent, so the same status is
      // a different color on a red page and a blue one and still reads as
      // a peer. A literal hex would freeze one status against the ramp.
      expect(rule, `status modifier must derive from --accent-text: ${rule}`).toContain(
        'var(--accent-text)',
      );
      expect(rule, `status modifier must not hard-code a color: ${rule}`).not.toMatch(
        /#[0-9a-fA-F]{3,8}\b/,
      );
    }
  });

  it('evidence is styled as observation, distinct from rationale', () => {
    // Evidence and rationale are different epistemic objects — one is
    // what happened, the other is why the choice was made — and the plan
    // (§9) requires they not be interchangeable typographic blocks.
    // Evidence gets an exhibit plane; rationale is prose on the ground.
    const css = builtCss();

    const observed = css.match(/\.decision-ledger__observed dd\{[^}]*\}/)?.[0];
    expect(observed, '.decision-ledger__observed dd rule missing').toBeTruthy();
    expect(observed).toMatch(/background:/);
    expect(observed).toMatch(/border:/);

    const why = css.match(/\.decision-ledger__why dd\{[^}]*\}/)?.[0];
    expect(why, '.decision-ledger__why dd rule missing').toBeTruthy();
    expect(why, 'rationale must not take the evidence plane').not.toMatch(/background:|border:/);
  });

  it('the case-study styles use motion and color tokens, never literals', () => {
    // rules/repo_rules.md § Forbidden Patterns: no bare ms values, no
    // bare easing keywords, no hard-coded palette hexes.
    const css = builtCss();
    const blocks =
      css.match(/\.(decision-ledger|constraint-strip|learning-ledger)[a-z_-]*[^{]*\{[^}]*\}/g) ??
      [];
    expect(blocks.length, 'case-study CSS missing from the built bundle').toBeGreaterThan(10);

    for (const rule of blocks) {
      expect(rule, `hard-coded duration: ${rule}`).not.toMatch(/\d+ms/);
      expect(rule, `hard-coded palette hex: ${rule}`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});
