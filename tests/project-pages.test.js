import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { writeSanitizedDOM } from './helpers/dom.js';

// Smoke tests for the content-collection-driven project detail pages.
// See specs/project-pages.md and issue #156.
//
// These tests read from the already-built dist/ directory — `npm test`
// runs `astro build && vitest run`, so dist/ is always fresh.

const DIST = resolve(__dirname, '../dist');
const CONTENT = resolve(__dirname, '../src/content/projects');

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
  'A financial operating system for Broadway productions—models capitalization and investor returns, manages ownership, and shares live deals with backers without spreadsheet or PDF workflows.',
  'A single web application that tracks partner-device hardware, DRM, codec support, and operational readiness across Disney+, Hulu, and ESPN.',
  'A career CRM for one person running a serious job search—turns work history into structured, reusable evidence, maps it against specific job requirements, and generates applications grounded in demonstrated work.',
  'A swipe-based discovery experiment for Disney+ and Hulu that turns recommendation training and watchlist building into a game—built in vanilla JS over a weekend.',
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

const projectIndexAccentRows = canonicalProjectCards.map(
  (_, i) => i > 0 && i % projectIndexAccentCycle.length === 0
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
    const sourceFiles = readdirSync(CONTENT).filter((f) => f.endsWith('.md'));
    const nonDraftSources = sourceFiles.filter((f) => {
      const body = readFileSync(join(CONTENT, f), 'utf-8');
      // Restrict the draft: true check to the YAML frontmatter block at the
      // top of the file. A documentation example in the body that contains
      // `draft: true` as an indented code sample should not make the project
      // look drafted. Projects without `draft:` at all default to false per
      // the schema. (See #161.)
      const fmMatch = body.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = fmMatch ? fmMatch[1] : '';
      return !/^draft:\s*true\s*$/m.test(frontmatter);
    });
    expect(nonDraftSources.length).toBe(projectSlugs.length);
  });

  it('project frontmatter does not carry raw palette color fields', () => {
    const sourceFiles = readdirSync(CONTENT).filter((f) => f.endsWith('.md'));

    for (const file of sourceFiles) {
      const body = readFileSync(join(CONTENT, file), 'utf-8');
      const fmMatch = body.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = fmMatch ? fmMatch[1] : '';

      expect(frontmatter, `${file} still declares accentColor`).not.toMatch(/^accentColor:/m);
      expect(frontmatter, `${file} still declares gradientFrom`).not.toMatch(/^gradientFrom:/m);
      expect(frontmatter, `${file} still declares gradientTo`).not.toMatch(/^gradientTo:/m);
    }
  });

  it('every project accent follows the canonical ramp for its order', () => {
    const sourceFiles = readdirSync(CONTENT).filter((f) => f.endsWith('.md'));

    for (const file of sourceFiles) {
      const body = readFileSync(join(CONTENT, file), 'utf-8');
      const fmMatch = body.match(/^---\n([\s\S]*?)\n---/);
      const frontmatter = fmMatch ? fmMatch[1] : '';

      // Trailing `# ...` is valid YAML and is exactly what the authoring
      // template in specs/project-pages.md ships, so both patterns tolerate an
      // inline comment. Without it, copying the documented template verbatim
      // fails here with "declares no accent" (Codex P2 on #783).
      const orderMatch = frontmatter.match(/^order:\s*(\d+)\s*(?:#.*)?$/m);
      const accentMatch = frontmatter.match(/^accent:\s*["']?([a-z]+)["']?\s*(?:#.*)?$/m);

      expect(orderMatch, `${file} declares no order`).not.toBeNull();
      expect(accentMatch, `${file} declares no accent`).not.toBeNull();

      const order = Number(orderMatch[1]);
      expect(accentMatch[1], `${file} (order ${order}) breaks the accent ramp`).toBe(
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

      it('has a .project-copy container with an <h2>Overview</h2> heading', () => {
        const copy = document.querySelector('.project-copy');
        expect(copy, '.project-copy not found').not.toBeNull();
        const headings = Array.from(copy.querySelectorAll('h2')).map((h) => h.textContent.trim());
        expect(headings).toContain('Overview');
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
