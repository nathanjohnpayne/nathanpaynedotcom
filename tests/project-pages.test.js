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
  'A multiplayer bingo game built for a nine-night cruise, with daily themed cards, offline-first marking, live standings, and a choreographed finale.',
  'A repository standard for the gap between what a fleet of AI coding agents can produce and what one operator can responsibly stand behind.',
  'A financial operating system for Broadway productions—models capitalization and investor returns, manages ownership, and shares a read-only deal room with backers instead of spreadsheet and PDF workflows.',
  'A single web application that tracks partner-device hardware, DRM, codec support, and operational readiness—unifying fragmented device data while keeping consequential changes behind human review.',
  'A career CRM for one person running a serious job search—turns work history into approved evidence, maps it against a specific job’s requirements, and blocks the export when a claim doesn’t trace back.',
  'A swipe-based discovery experiment for Disney+ and Hulu that turns expressing taste into a game—built in vanilla JS across three days of one week.',
  'Shared billing for recurring household costs—showing recipients the arithmetic, tracking settlement, and handling questions without requiring an account.',
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

// Projects without a deployed live URL — the live CTA
// is suppressed on the detail page, the project card, and the homepage
// Builds section. The SoftwareApplication JSON-LD entity is also
// dropped on these pages (no `url:` to populate).
//
// Empty today. `matchline` sat here from #756 through #885 because its only
// deployment was the stale 2026-05-02 build the page declined to link. That
// build was superseded on 2026-08-31, so the exception is gone rather than
// merely unused — restore an entry here only when a project genuinely has no
// reachable deployment.
const noLiveUrlSlugs = [];
// `device-source-of-truth` is a private repository, so its "View on GitHub"
// CTA is suppressed rather than rendering a button that 404s for every
// reader but the owner (#874). Same exception shape as `noLiveUrlSlugs`.
const noGithubUrlSlugs = ['device-source-of-truth'];

// The live CTA's canonical label, and the projects that override it. DST is
// ARCHIVED and its live link opens a synthetic-data demonstration rather than
// the internal product, so "View Live Product" would ask a reader to reconcile
// two states that only look contradictory. Mergepath's live URL is an
// htmlpreview render of the policy playground — a thing to look at, not a
// product to use — and it carried the default label until #947, where the
// résumé began deriving its own Live/Demo wording from this same field and the
// overclaim became visible on two surfaces at once.
//
// Enumerated deliberately, and kept that way. A relabel is a change to what the
// site CLAIMS about a project, so it should cost a test edit and be visible in
// a diff; deriving this from frontmatter would let the claim move silently,
// which is the opposite of what this table is for. It failing is it working.
const DEFAULT_LIVE_LABEL = 'View Live Product';
const liveCtaLabels = {
  'device-source-of-truth': 'View Demo',
  mergepath: 'View Demo',
};

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

// Resolve a slug back to the source file that declares it. Matched on the
// frontmatter `slug` rather than the filename: the two agree today, but the
// collection keys on the field, so a rename would otherwise silently point an
// assertion at the wrong project's frontmatter.
function projectSourceFor(slug) {
  const file = projectSourceFiles().find((f) => readProjectFrontmatter(f).slug === slug);
  if (!file) throw new Error(`no project source declares slug "${slug}"`);
  return file;
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

  it('the projects index leads with product and decisions, not with the method (#751)', () => {
    setupDOM(readDistHtml('projects/index.html'));

    const title = document.querySelector('title');
    const heading = document.querySelector('h1');
    const breadcrumb = document.querySelector('.breadcrumbs');
    const canonical = document.querySelector('link[rel="canonical"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const deck = document.querySelector('.hero .deck');

    expect(title?.textContent).toBe('Projects | Nathan Payne');
    expect(heading?.textContent).toBe('Products—and the decisions behind them');
    expect(breadcrumb?.textContent).toContain('Projects');
    expect(canonical?.getAttribute('href')).toBe('https://nathanpayne.com/projects/');
    expect(ogTitle?.getAttribute('content')).toBe('Projects | Nathan Payne');
    expect(ogDescription?.getAttribute('content')).toBe(
      'The problem each one started as, what got built, what got refused, and what the evidence said afterward.',
    );
    // AC1 orders the deck: problem, then decisions, then outcomes, then the
    // agent leverage last. AC2 keeps agent collaboration present but demoted
    // from the value proposition — pinned by the ordering assertions below
    // rather than by the exact sentence, so the copy can be edited without
    // silently losing the structure the ticket asked for.
    const deckText = deck?.textContent?.replace(/\s+/g, ' ').trim();
    expect(deckText).toMatch(/^Every one of these began as a real problem/);
    const problemAt = deckText.indexOf('real problem');
    const decisionAt = deckText.indexOf('decisions are the part worth reading');
    // The outcome beat no longer counts the shipped projects. Once every card
    // carried a lifecycle marker the tally was redundant with the grid, and
    // counting it read as defending the portfolio's success rate. The beat
    // itself survives — the cards still account for their own state — so AC1's
    // ordering is unchanged and only this anchor moved.
    const outcomeAt = deckText.indexOf('where the project stands');
    const agentAt = deckText.indexOf('I build with AI agents');
    for (const [label, at] of Object.entries({ problemAt, decisionAt, outcomeAt, agentAt })) {
      expect(at, `deck is missing its ${label} beat`).toBeGreaterThan(-1);
    }
    expect(problemAt).toBeLessThan(decisionAt);
    expect(decisionAt).toBeLessThan(outcomeAt);
    expect(outcomeAt).toBeLessThan(agentAt);
    // AC2: the method may appear, but not as the thing being sold.
    expect(deckText).toMatch(/The agents are leverage; the product decisions are the point\./);
    expect(deckText).not.toMatch(/^Built with/);
  });

  it('the homepage Projects panel keeps wayfinding labels while leading with Selected Projects', () => {
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
    expect(panel.querySelector('h2')?.textContent).toBe('Selected Projects');
    // #892: the old intro claimed all seven "shipped end-to-end", which is false
    // for a paused project and an experiment, and put the method in the lead
    // where /projects/ puts the decisions.
    //
    // #984 moved the opening sentence to the footer, so the paragraph no longer
    // says the domains and the footer does. Asserted WHOLE rather than by its
    // tail: a `toContain` on the second half would pass on a build that says
    // the domains twice, which is the one outcome that move exists to prevent.
    expect(panel.querySelector('.content-inner > p')?.textContent).toBe(
      'The case studies focus on the decisions, tradeoffs, and evidence behind them; I built each with AI agents under a review system I designed.',
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
    // #756 recast the card around the gate and the paused state. The negative
    // assertions pin retracted copy: 'what the user has actually done' was the
    // pre-#813 wording, and the four-input ingestion list was never true — only
    // the pasted-resume path is implemented.
    // Since #751 the index renders `cardDescription`, not the hero deck. The
    // retraction assertions below still apply — the card is a public surface
    // and must not reassert what the #756 audit removed.
    expect(matchlineDescription).toContain('51.3% extraction accuracy against an 80% bar');
    expect(matchlineDescription).toContain('Paused');
    expect(matchlineDescription).not.toContain('what the user has actually done');
    expect(matchlineDescription).not.toContain('LinkedIn');
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
      'A repository standard for AI-agent development: independent review identities, fail-closed gates, and cross-repo propagation—with the failures on the record.',
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
        // checking for the canonical labels we render in ProjectHero.
        const liveLabel = liveCtaLabels[slug] ?? DEFAULT_LIVE_LABEL;
        if (noLiveUrlSlugs.includes(slug)) {
          expect(actions).not.toContain(DEFAULT_LIVE_LABEL);
        } else {
          expect(actions).toContain(liveLabel);
          // An overridden label must REPLACE the default, not sit beside it.
          if (liveLabel !== DEFAULT_LIVE_LABEL) {
            expect(actions).not.toContain(DEFAULT_LIVE_LABEL);
          }
        }
        if (noGithubUrlSlugs.includes(slug)) {
          expect(actions).not.toContain('View on GitHub');
        } else {
          expect(actions).toContain('View on GitHub');
        }
      });

      it('marks lifecycle in the STATUS cell and nowhere else', () => {
        // The lifecycle glyph completes a site-wide grammar (homepage Builds
        // row → /projects/ card kicker → this cell). It stays in the STATUS
        // cell alone so lifecycle never competes with project identity: not
        // beside the h1, not in the breadcrumb, not on the hero CTA, and not
        // in two places at once.
        const marked = [...document.querySelectorAll('.state-marker')];
        expect(marked.length, `${slug}: expected exactly one lifecycle mark`).toBe(1);

        const cell = marked[0];
        expect(cell.tagName, 'state is metadata, not a control').toBe('DD');
        expect(cell.classList.contains('metadata-strip__status')).toBe(true);

        const item = cell.closest('.metadata-strip__item');
        expect(item, `${slug}: the mark is not inside a metadata-strip cell`).not.toBeNull();
        expect(item.querySelector('dt').textContent.trim()).toBe('Status');

        // The forbidden neighbours, checked by containment rather than by
        // absence-of-class alone: a mark added to any of them would be inside
        // one of these subtrees.
        for (const sel of ['h1', '.breadcrumbs', '.project-actions', '.project-hero__header > *']) {
          for (const region of document.querySelectorAll(sel)) {
            expect(
              region.querySelector('.state-marker'),
              `${slug}: lifecycle mark leaked into ${sel}`,
            ).toBeNull();
          }
        }

        // The three sibling cells stay unmarked.
        const others = [...document.querySelectorAll('.metadata-strip__item')].filter(
          (el) => el !== item,
        );
        expect(others.length).toBe(3);
        for (const other of others) {
          expect(
            other.querySelector('.state-marker'),
            `${slug}: ${other.querySelector('dt').textContent.trim()} cell gained a mark`,
          ).toBeNull();
        }
      });

      it('selects the marker modifier its frontmatter status calls for', () => {
        // The expected mapping is written out here rather than imported from
        // src/lib/lifecycle-marker.ts on purpose: a test that reads the same
        // table the page reads cannot catch that table being wrong.
        const expected = {
          SHIPPED: 'state-marker--shipped',
          ARCHIVED: 'state-marker--archived',
          PAUSED: 'state-marker--paused',
          EXPERIMENT: 'state-marker--experiment',
          'IN PROGRESS': 'state-marker--in-progress',
        };
        const status = readProjectFrontmatter(projectSourceFor(slug)).status;
        const cell = document.querySelector('.metadata-strip__status');
        expect(cell.textContent.trim(), `${slug}: cell text must be the status word`).toBe(status);
        expect(
          [...cell.classList].find((c) => c.startsWith('state-marker--')),
          `${slug}: wrong mark for ${status}`,
        ).toBe(expected[status]);
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

  it('keeps ARCHIVED and PAUSED on visibly different marks across detail pages', () => {
    // The cored ring exists precisely so a closed history does not read as a
    // project merely set down. If both collapsed to the bare outline the word
    // would carry the whole signal — which is the defect the mark fixes.
    const markFor = (slug) => {
      setupDOM(readDistHtml(`projects/${slug}/index.html`));
      const cell = document.querySelector('.metadata-strip__status');
      return (
        [...cell.classList].find((c) => c.startsWith('state-marker--')) ?? 'state-marker--none'
      );
    };
    expect(markFor('device-source-of-truth')).not.toBe(markFor('matchline'));
  });

  it('reuses the /projects/ marker geometry rather than a detail-page variant', () => {
    // Same primitive, no per-surface size override. `.state-marker` is em-sized
    // so it tracks whatever type it sits in; a `.metadata-strip__status` rule
    // that set width/height/font-size on the mark would break the shared
    // grammar the glyph exists to complete.
    const css = readFileSync(resolve(__dirname, '../src/styles/global.css'), 'utf-8');
    const block = css.match(/\.metadata-strip__status\s*\{([^}]*)\}/);
    expect(block, 'no .metadata-strip__status rule found').not.toBeNull();
    for (const prop of ['width', 'height', 'font-size', 'transform', 'gap']) {
      expect(
        new RegExp(`(^|[;\\s])${prop}\\s*:`).test(block[1]),
        `.metadata-strip__status must not set ${prop} — it would diverge from /projects/`,
      ).toBe(false);
    }
    expect(
      /\.metadata-strip__status::before\s*\{/.test(css),
      '.metadata-strip__status::before must not restyle the shared mark',
    ).toBe(false);
  });
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

        expect(width, `${slug}: ${src} has no width — add it to imageDimensions`).toBeGreaterThan(
          0,
        );
        expect(height, `${slug}: ${src} has no height — add it to imageDimensions`).toBeGreaterThan(
          0,
        );

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

  // The assertion anatomy (#754) is gated on `chosen` so the two pages that
  // shipped against the original shape keep rendering it. That gate is the
  // thing worth testing: a component change that dropped the fallback would
  // leave five-across and swipe-watch with empty Chosen/Cost slots, and no
  // existing assertion would notice.
  it('DecisionLedger switches anatomy on `chosen` and keeps the original labels without it', () => {
    const source = componentSource('DecisionLedger');
    for (const token of ['What I encountered', 'Context', 'Over', 'Rejected']) {
      expect(source, `DecisionLedger: no "${token}" label`).toContain(`'${token}'`);
    }
    for (const slot of ['<dt>Cost</dt>', '<dt>What I decided</dt>']) {
      expect(source, `DecisionLedger: no ${slot}`).toContain(slot);
    }
    // Both halves of each ternary must be present — the fallback is the guard.
    expect(source).toMatch(/decision\.chosen \? 'What I encountered' : 'Context'/);
    expect(source).toMatch(/decision\.chosen \? 'Over' : 'Rejected'/);
    // The outcome slot reverts to the status label when a record is `pending`,
    // so a decision with no outcome yet cannot claim one.
    expect(source).toMatch(/decision\.status !== 'pending' \? 'What it changed'/);
    // These render only when authored, so an un-migrated record emits no slot.
    for (const gate of ['cost', 'lens', 'rejected', 'chosen']) {
      expect(source, `DecisionLedger: ${gate} is not conditionally rendered`).toMatch(
        new RegExp(`\\{decision\\.${gate} &&`),
      );
    }
  });

  it('DecisionLedger labels pending evidence as a boundary, not an observation', () => {
    // `evidence` is required for every status, but it carries a different
    // kind of claim when the status is `pending`: the schema contract makes
    // it the validation boundary — why the evidence is not in yet — rather
    // than something observed. Labelling that "Observed" asserts an
    // observation that has not happened (Codex P2, round 6).
    const source = componentSource('DecisionLedger');
    expect(source, 'evidence label must vary by status').toMatch(
      /EVIDENCE_LABELS\[decision\.status\]/,
    );
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

// #756 — the Matchline audit corrected six claims that had each been published.
// A corrected claim is only fixed while nothing reintroduces it, and the last
// three project-page PRs each shipped a claim that had been fixed on one
// surface and left standing on another. These pin the retractions by claim
// rather than by sentence, so a reworded reintroduction still fails.
describe('Matchline — audited claims stay retracted (#756)', () => {
  const source = () => readFileSync(join(CONTENT, 'matchline.mdx'), 'utf-8');
  const frontmatter = () => readProjectFrontmatter('matchline.mdx');
  const rendered = () => readDistHtml('projects/matchline/index.html');

  it('does not reassert ingestion paths that were never built', () => {
    // Only the pasted-resume path is implemented. LinkedIn HTML and long-form
    // prose are deferred in `src/routes/Onboarding.tsx`; uploaded artifacts
    // (PRDs, decks, retros) appear in neither the matchline code nor its spec.
    // The page may name them as absent — it may not list them as inputs.
    for (const surface of [source(), rendered()]) {
      expect(surface).not.toMatch(/LinkedIn HTML,? (?:or )?long-form/i);
      expect(surface).not.toMatch(/uploaded artifacts \(PRDs/i);
    }
    // The page may still name them, and does — as absent. Pin that reading so
    // the negative assertions above cannot be satisfied by deleting the sentence.
    expect(source(), 'the deferred inputs must stay on the page, labelled').toMatch(
      /LinkedIn and long-form ingestion were deferred/,
    );
    expect(source(), 'the never-existed input must stay retracted in the open').toMatch(
      /never existed—an earlier version of this page listed them as inputs/,
    );
    expect(rendered(), 'the retraction must survive into the rendered page').toMatch(
      /never existed/i,
    );
    // The resume mirror is a fifth surface and carried the retracted pre-#813
    // grounding claim in its own wording ("what the candidate has actually
    // done") for four rounds, because the guards only ever read the page.
    // Caught by Codex on #885.
    const resumeMirror = readFileSync(
      resolve(__dirname, '../src/content/resume/projects/matchline.md'),
      'utf-8',
    );
    expect(
      resumeMirror,
      'the resume mirror must not reassert the broad grounding claim',
    ).not.toMatch(/grounded in what the (?:candidate|user) has actually done/i);
  });

  it('does not claim the validation layer is untested against fabrication', () => {
    // A #813 over-correction replaced an unprovable universal with a false
    // negative, on two surfaces at once. `tests/fixtures/expected-asset-traces/
    // adversarial-fabrication.json` exists and runs in CI.
    for (const surface of [source(), rendered()]) {
      expect(surface).not.toMatch(/no adversarial (?:evaluation|test)/i);
      expect(surface).not.toMatch(/never been adversarially tested/i);
    }
    // And assert the corrected state, so deleting the section cannot satisfy
    // the negatives above: the fixture runs in CI, and the mocked-model limit
    // that keeps it from proving detector reliability ships with it.
    expect(source(), 'the adversarial fixture must be described as running in CI').toMatch(
      /runs in continuous integration/i,
    );
    expect(source(), 'the mocked-model limitation must ship with the claim').toMatch(
      /model checks are mocked/i,
    );
  });

  it('does not claim no deployment exists', () => {
    // A build is deployed and publicly reachable behind a sign-in wall. The
    // page's position was that it was stale and unlinked; since the 2026-08-31
    // redeploy it is current and linked. What must never come back is the
    // claim that no deployment exists at all.
    for (const surface of [source(), rendered()]) {
      expect(surface).not.toMatch(/the running product is not\b/i);
    }
    // The corrected state: a deployment exists, it is gated, it is current,
    // and this page links it. All four clauses, or the retraction is only a
    // deletion.
    expect(source(), 'the deployed build must still be disclosed as gated').toMatch(
      /deployed behind a sign-in wall/i,
    );
    expect(source(), 'the page must say the CTA points at that build').toMatch(
      /button above goes to it/i,
    );
    expect(source(), 'the redeploy must be dated the way the stale build was').toMatch(
      /redeployed on the evening of 2026-08-31/,
    );
    // The superseded staleness claim must not survive alongside the link — a
    // page that links the build and still calls it a May build is worse than
    // either state on its own.
    expect(source(), 'the superseded staleness claim must be gone').not.toMatch(
      /It dates from 2026-05-02, which is before the June and July work/,
    );
  });

  it('dates the pause by the last product commit, not by a commit count', () => {
    // "N commits since X" is stale on arrival: dependency bumps and template
    // syncs keep landing. The durable claim names the last product commit and
    // carries an as-of date, the way #850 dated the Mergepath fleet count.
    const surface = source();
    expect(surface).not.toMatch(/five commits, all on/i);
    expect(surface).not.toMatch(/seventeen substantive commits/i);
    // The page no longer states a burst count at all — the #756 follow-up cut
    // the forensic chronology out of the prioritization record, so there is no
    // corrected value left to pin. The negative above is what matters: the
    // overcount must not come back, whether or not a count is stated.
    expect(surface, 'commit-count claims need an as-of date').toMatch(/as of 2026-09-01/i);
  });

  it('keeps the wordmark legible independent of order or accent', () => {
    // #784: the hero SVG hardcodes a near-white fill and needs a dark figure
    // surface to be visible at all. That treatment used to be keyed on
    // `[data-accent='black']`, so it only survived because `order: 4`
    // happened to land on black — a reorder would have silently dropped it.
    // `screenshotDarkSurface` ties the surface to this content entry instead
    // (see `.project-screenshot--dark-surface` in global.css), so it stays
    // in place regardless of what order or accent ramp position Matchline
    // ends up at.
    const data = frontmatter();
    expect(data.screenshotDarkSurface).toBe(true);
    expect(data.screenshotSrc).toBe('/images/projects/matchline-wordmark.svg');
    expect(rendered(), 'the built page must carry the dark-surface modifier class').toMatch(
      /class="project-screenshot project-screenshot--wide project-screenshot--dark-surface"/,
    );
  });

  it('publishes the dev instance now that the deployment is current', () => {
    // Inverts the #885 assertion. The liveUrl was withheld while the only
    // deployment predated the work this page rests on; the 2026-08-31 redeploy
    // removed that reason, so both hero CTAs and the index card link render.
    const data = frontmatter();
    expect(data.liveUrl).toBe('https://matchline-dev.web.app/');
    expect(data.githubUrl).toBe('https://github.com/nathanjohnpayne/matchline');
  });

  it('styles the subsection heading and decision list it introduced', () => {
    // Matchline is the first project body to use an h3 or a bold-label
    // criteria list — every page before it was flat at h2 with free-standing
    // bullets. Without these rules the h3 falls back to the UA default and
    // the list keeps a rhythm that put a label further from its own bullets
    // than from the next group.
    const css = readFileSync(resolve(__dirname, '../src/styles/global.css'), 'utf-8');
    expect(source(), 'the restart section should carry an h3 subhead').toMatch(/^### /m);
    expect(css, '.project-copy h3 must be styled').toMatch(/^\.project-copy h3 \{/m);

    // The tightened rhythm is scoped to a paragraph that is nothing but a
    // bold label. Globalizing it re-tightens Friends & Family Billing's list,
    // which is introduced by a sentence and followed by a conclusion and
    // reads worse at 6px/14px. Pin the guard, not just the effect.
    for (const selector of [
      '.project-copy p:has(> strong:only-child) + ul',
      '.project-copy p:has(> strong:only-child) + ul + p',
      '.project-copy p:has(> strong:only-child) + ul li',
    ]) {
      expect(css, `${selector} must stay scoped to labelled lists`).toContain(`${selector} {`);
    }
    expect(css, 'the unscoped list indent must stay at its original value').toMatch(
      /\.project-copy ul li \{\n\s*position: relative;\n\s*padding-left: 1rem;/,
    );
  });

  it('says why the pause is expected to end, in the terms the repository sets', () => {
    // The restart passage is the only place the page asserts that product
    // work resumed. It has to name what actually broke and what actually runs,
    // or it is a mood rather than a claim.
    const surface = source();
    expect(surface, 'the restart must name the two engines that came back up').toMatch(
      /résumé extraction and JD parsing run end to end/i,
    );
    expect(surface, 'the edge failure must be named, not summarized').toMatch(
      /missing Cloud Run invoker bindings/,
    );
    expect(surface, 'the credential failure must be named').toMatch(/trailing newlines/);
    // And the status must not quietly follow the prose — the project stays
    // PAUSED until a real application has gone through it end to end.
    expect(frontmatter().status).toBe('PAUSED');
  });
});

// #751 — the index is the thesis page for the portfolio. These pin the four
// things the ticket asked for that nothing else guards: the canonical order,
// the card line being a proof point rather than a product summary, the length
// balance that keeps one card from dominating, and a hiring reader's route out.
describe('Projects index — portfolio thesis (#751)', () => {
  const cardLine = (data) => data.cardDescription ?? data.description;

  it('keeps the canonical editorial order and does not sort by status, date or name', () => {
    // AC4. The order is editorial and `order` is also what derives each project
    // page's accent (RAMP[order % 5]), so a re-sort silently re-colors pages —
    // including one whose hero art is only legible on its current accent (#784).
    // `/projects/` filters `!data.draft`; mirror that here or a legitimately
    // drafted project fails these exact assertions while the rendered index
    // stays correct.
    const orders = projectSourceFiles()
      .map((file) => readProjectFrontmatter(file))
      .filter((data) => data.draft !== true)
      .map((data) => ({ order: data.order, title: data.title, status: data.status }))
      .sort((a, b) => a.order - b.order);

    expect(orders.map((p) => p.title)).toEqual(canonicalProjectCards.map((c) => c.title));
    expect(orders.map((p) => p.order)).toEqual([0, 1, 2, 3, 4, 5, 6]);

    // Explicitly assert the order is NOT any of the mechanical sorts, so a
    // future "tidy-up" that happens to produce one of them fails here.
    const byTitle = [...orders].sort((a, b) => a.title.localeCompare(b.title)).map((p) => p.title);
    const byStatus = [...orders]
      .sort((a, b) => a.status.localeCompare(b.status))
      .map((p) => p.title);
    expect(orders.map((p) => p.title)).not.toEqual(byTitle);
    expect(orders.map((p) => p.title)).not.toEqual(byStatus);
  });

  it('gives every card a proof point, not a stack summary', () => {
    // AC3. A card line earns its place by naming a decision, a constraint or an
    // outcome. The cheapest reliable signal that it has NOT is a technology
    // roster, which is what `stack` is for and what these cards used to repeat.
    const stackish =
      /\b(React|TypeScript|Vite|Tailwind|Firebase|Next\.js|Astro|Vitest|vanilla JS)\b/;
    for (const file of projectSourceFiles()) {
      const data = readProjectFrontmatter(file);
      if (data.draft === true) continue;
      const line = cardLine(data);
      expect(line, `${file} has no card line`).toBeTruthy();
      expect(line, `${file} card line reads as a stack summary`).not.toMatch(stackish);
      expect(line.length, `${file} card line is too short to carry a proof point`).toBeGreaterThan(
        90,
      );
    }
  });

  it('keeps card lines within one length band so no card dominates by volume', () => {
    // AC5. The ticket named Mergepath; by the time it was implemented the
    // outlier was Matchline at 244 characters against a 107-character floor.
    // Pin the band rather than the culprit.
    const lengths = projectSourceFiles()
      .map((file) => readProjectFrontmatter(file))
      .filter((data) => data.draft !== true)
      .map((data) => cardLine(data).length);
    const shortest = Math.min(...lengths);
    const longest = Math.max(...lengths);
    expect(longest).toBeLessThanOrEqual(200);
    expect(shortest).toBeGreaterThanOrEqual(120);
    expect(longest / shortest, 'one card is dominating the grid by copy volume').toBeLessThan(1.6);
  });

  it('does not let a card contradict the status it renders beside', () => {
    // AC6. Status honesty: a paused or archived project must not read as if it
    // is running. Cheap directional check — these verbs assert live operation.
    const runningVerbs = /\b(is live|in production today|runs daily|currently serves)\b/i;
    for (const file of projectSourceFiles()) {
      const data = readProjectFrontmatter(file);
      if (['PAUSED', 'ARCHIVED'].includes(data.status)) {
        expect(
          cardLine(data),
          `${file} is ${data.status} but its card reads as running`,
        ).not.toMatch(runningVerbs);
      }
    }
  });

  it('offers a hiring reader the résumé and a booking link from the index', () => {
    // AC7. Before #751 the only way out of the grid was Back to Homepage.
    setupDOM(readDistHtml('projects/index.html'));
    const footerLinks = [...document.querySelectorAll('.site-footer a')].map((a) => ({
      href: a.getAttribute('href'),
      text: a.textContent?.replace(/[→\s]+/g, ' ').trim(),
    }));
    expect(footerLinks.some((l) => l.href === '/resume/')).toBe(true);
    expect(footerLinks.some((l) => l.href === 'https://cal.com/nathanpayne')).toBe(true);
    expect(footerLinks.some((l) => l.href === '/')).toBe(true);
  });

  it('renders the card line, not the hero deck, on the index', () => {
    // The two fields were one until #751; this pins the split so a future edit
    // to a page's hero deck cannot silently rewrite its index card again.
    setupDOM(readDistHtml('projects/index.html'));
    const matchline = [...document.querySelectorAll('.blog-grid .post-card')].find(
      (card) => card.querySelector('.post-title a')?.textContent === 'Matchline',
    );
    const data = readProjectFrontmatter('matchline.mdx');
    expect(data.cardDescription, 'matchline should exercise the split').toBeTruthy();
    expect(data.cardDescription).not.toBe(data.description);
    expect(matchline?.querySelector('.post-desc')?.textContent).toBe(data.cardDescription);
  });
});

// #751 follow-up: "Live ↗" read as a contradiction beside ARCHIVED, because it
// is ambiguous between "the demo is reachable" and "the product is operational".
// Status carries lifecycle truth; the CTA only says a link exists.
describe('Projects index — CTA vocabulary does not compete with status (#751)', () => {
  it('labels the outbound project link View, not Live', () => {
    setupDOM(readDistHtml('projects/index.html'));
    const ctas = [...document.querySelectorAll('.blog-grid .tag-row a')];
    expect(ctas.length, 'expected at least one project CTA').toBeGreaterThan(0);
    for (const cta of ctas) {
      const label = cta.textContent?.replace(/[↗\s]+/g, ' ').trim();
      expect(label, 'CTA must not assert liveness beside a lifecycle status').not.toMatch(/live/i);
      expect(label).toBe('View');
    }
  });

  it('still renders a CTA only where a liveUrl exists', () => {
    setupDOM(readDistHtml('projects/index.html'));
    const withCta = [...document.querySelectorAll('.blog-grid .post-card')]
      .filter((card) => card.querySelector('.tag-row a'))
      .map((card) => card.querySelector('.post-title a')?.textContent);
    const expected = projectSourceFiles()
      .map((file) => readProjectFrontmatter(file))
      .filter((data) => data.draft !== true && data.liveUrl)
      .sort((a, b) => a.order - b.order)
      .map((data) => data.title);
    expect(withCta).toEqual(expected);
  });
});
