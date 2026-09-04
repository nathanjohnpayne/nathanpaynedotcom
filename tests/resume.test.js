import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { JSDOM } from 'jsdom';
import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';
import { writeSanitizedDOM } from './helpers/dom.js';
import { PROJECTS_HEADING } from '../src/lib/section-propositions';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { liveLinkLabel } from '../src/lib/live-link-label';
import { STATUS_MARKER } from '../src/lib/lifecycle-marker';
import {
  pdfTextInEmissionOrder,
  pdfPageCount,
  visibleMarkersPerPage,
  lifecycleMarkSignaturesPerPage,
  normalizeForOrder,
} from './helpers/pdf-oracle.js';
import {
  builtPrintBlocks,
  printBlocks,
  printColorAdjustRules,
  withoutPrintBlocks,
} from './helpers/print-css.js';

// Smoke tests for the content-collection-driven /resume page.
// See specs/resume.md and issue #394.
//
// These read from the already-built dist/ directory — `npm test` runs
// `astro build && vitest run`, so dist/ is always fresh.

const DIST = resolve(__dirname, '../dist');

// The @media print parser lives in ./helpers/print-css.js — a stylesheet
// carries several print blocks (the blog's #622 rules, this file's #420
// cascade, the lifecycle primitive's #950 rule), so each assertion below
// selects the block it cares about by content rather than assuming the first
// one is the resume's.

const CONTENT = resolve(__dirname, '../src/content');
const RESUME_HTML = resolve(DIST, 'resume/index.html');

function readDist(relativePath) {
  return readFileSync(resolve(DIST, relativePath), 'utf-8');
}

/**
 * A destination URL read out of FRONTMATTER, as its schema stores it (#948).
 *
 * Every URL field in play — `liveUrl` / `githubUrl` on `projects`, `url` /
 * `repo` on `resumeProjects` — is `z.string().trim()`, so ` https://example.com `
 * is schema-valid, is accepted, and renders trimmed. Frontmatter parsed
 * straight off disk has not been through that, and comparing the raw scalar
 * failed a required check on an entry the site renders correctly.
 *
 * **Frontmatter only, deliberately.** Rendered `href`s are compared EXACTLY
 * against the value this returns, never normalised themselves. Trimming the
 * DOM side too would have hidden the defect it is there to catch: Unicode
 * whitespace such as NBSP is `trim()`-able but is not stripped by URL parsing,
 * so an untrimmed href resolves as a relative path on this site rather than
 * opening the product, and both sides would have agreed anyway (Codex,
 * PR #951). Reading the schema and asserting the render is what makes the
 * schema's trim load-bearing rather than assumed.
 *
 * Returns `null` for anything absent or whitespace-only, so `.filter(Boolean)`
 * downstream reads the same on both sides of every comparison.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
function frontmatterUrl(value) {
  return (typeof value === 'string' && value.trim()) || null;
}

function setupDOM(rawHtml) {
  // Scripts are removed on a detached document and the doctype preserved by
  // the shared helper — see tests/helpers/dom.js for why both matter.
  writeSanitizedDOM(rawHtml);
}

function countMd(dir) {
  return readdirSync(join(CONTENT, dir)).filter((f) => f.endsWith('.md')).length;
}

function findContentEntries(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(dir, entry.name);
    if (entry.isDirectory()) return findContentEntries(entryPath);
    return /\.(md|ya?ml)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe('Resume — route & build', () => {
  it('builds a static HTML file at dist/resume/index.html', () => {
    expect(existsSync(RESUME_HTML), 'missing dist/resume/index.html').toBe(true);
  });

  it('content collections have the expected file counts', () => {
    expect(countMd('experience'), 'expected 6 experience entries').toBe(6);
    expect(countMd('resume/projects'), 'expected 7 resume projects').toBe(7);
    expect(countMd('certifications'), 'expected 3 certifications').toBe(3);
    expect(countMd('education'), 'expected 1 education entry').toBe(1);
    expect(countMd('myself'), 'expected 1 myself entry').toBe(1);
    const skills = readdirSync(join(CONTENT, 'skills')).filter((f) => /\.ya?ml$/.test(f));
    expect(skills.length, 'expected 5 skill categories').toBe(5);
  });

  it('resumeProjects is a distinct collection — the projects collection is untouched', () => {
    const config = readFileSync(resolve(__dirname, '../src/content.config.ts'), 'utf-8');
    expect(config).toContain('resumeProjects');
    expect(config).toContain("base: './src/content/resume/projects'");
  });

  it('keeps the empty awards scaffold dormant until there is content to load', () => {
    const awardEntries = findContentEntries(join(CONTENT, 'awards'));
    const config = readFileSync(resolve(__dirname, '../src/content.config.ts'), 'utf-8');
    const page = readFileSync(resolve(__dirname, '../src/pages/resume.astro'), 'utf-8');

    expect(awardEntries, 'add the awards collection back when the first entry lands').toHaveLength(
      0,
    );
    expect(config).not.toMatch(/\b(?:const|let|var)\s+awards\s*=/);
    expect(config).not.toMatch(/^\s*['"]?awards['"]?\s*(?:,|:)/m);
    expect(page).not.toMatch(/getCollection\s*\(\s*['"]awards['"]\s*\)/);
    expect(page).not.toContain(
      "import AwardsSection from '../components/resume/AwardsSection.astro'",
    );
    expect(page).not.toContain('<AwardsSection');
  });

  it('detects nested award content before allowing the scaffold to stay dormant', () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), 'awards-scaffold-'));
    try {
      const nestedDir = join(fixtureRoot, 'hackathons');
      mkdirSync(nestedDir);
      writeFileSync(join(nestedDir, 'winner.md'), '---\nname: Winner\n---\n');
      expect(findContentEntries(fixtureRoot)).toHaveLength(1);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});

describe('Resume — page structure', () => {
  beforeEach(() => {
    setupDOM(readDist('resume/index.html'));
  });

  it('has the title "Nathan Payne | Résumé"', () => {
    expect(document.querySelector('title')?.textContent).toBe('Nathan Payne | Résumé');
  });

  it('exposes a resolvable og:image meta tag', () => {
    const og = document.querySelector('meta[property="og:image"]');
    expect(og, 'missing og:image').not.toBeNull();
    expect(og.getAttribute('content')).toMatch(/^https:\/\/nathanpayne\.com\//);
  });

  it('renders the blog-canvas layout (canvas, accent margin, header, content, sidebar)', () => {
    expect(document.querySelectorAll('.resume-canvas').length).toBe(1);
    // The old project-style centered card is gone.
    expect(document.querySelector('.resume-document')).toBeNull();
    expect(
      document.querySelector('.resume-canvas-margin--header'),
      'accent margin missing',
    ).not.toBeNull();
    expect(
      document.querySelector('.resume-canvas-content'),
      'content column missing',
    ).not.toBeNull();
    expect(document.querySelector('.resume-canvas-sidebar'), 'sidebar missing').not.toBeNull();
    expect(document.querySelector('.site-footer--resume'), 'footer missing').not.toBeNull();
  });

  it('renders breadcrumbs (Nathan Payne / Résumé) in the header', () => {
    const crumbs = document.querySelector('.resume-canvas-header .breadcrumbs');
    expect(crumbs, 'breadcrumbs missing').not.toBeNull();
    const text = crumbs.textContent.replace(/\s+/g, ' ').trim();
    expect(text).toContain('Nathan Payne');
    expect(text).toContain('Résumé');
  });

  it('keeps the contact line in the header so it prints (not only the sidebar)', () => {
    const header = document.querySelector('.resume-canvas-header');
    expect(header.querySelector('.resume-contact'), 'header contact line missing').not.toBeNull();
    expect(header.textContent).toContain('hire@nathanpayne.com');
  });

  it('renders the metadata panel and highlight cards (screen sidebar)', () => {
    const meta = document.querySelector('.resume-canvas-meta');
    expect(meta, 'metadata panel missing').not.toBeNull();
    expect(meta.textContent).toContain('Open to');
    expect(document.querySelectorAll('.resume-canvas-topic').length).toBeGreaterThan(0);
    // Fuller set of highlight cards (≥ 5), accents cycle red/yellow/blue.
    const cards = document.querySelectorAll('.resume-highlight');
    expect(cards.length).toBeGreaterThanOrEqual(5);
    // Accents must cycle red → yellow → blue by index (not all the same).
    const cycle = ['red', 'yellow', 'blue'];
    cards.forEach((c, i) => {
      const expected = cycle[i % cycle.length];
      expect(c.className, `highlight ${i} should use the ${expected} accent`).toContain(
        `resume-highlight--${expected}`,
      );
    });
  });

  it('renders an in-page ToC linking to every visible section', () => {
    const toc = document.querySelector('.resume-canvas-toc-list');
    expect(toc, 'sidebar ToC missing').not.toBeNull();
    const links = Array.from(toc.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    for (const id of [
      'summary',
      'skills',
      'experience',
      'education',
      'certifications',
      'projects',
      'writing',
    ]) {
      expect(links, `ToC missing link #${id}`).toContain(`#${id}`);
      expect(
        document.getElementById(id),
        `no <section id="${id}"> for the ToC link`,
      ).not.toBeNull();
    }
    // The awards scaffold stays dormant until the first real entry, so the ToC
    // must not list a broken #awards anchor.
    expect(links, 'ToC should omit #awards while the scaffold is dormant').not.toContain('#awards');
    expect(
      document.getElementById('awards'),
      'awards section should not render while its scaffold is dormant',
    ).toBeNull();
  });

  it('renders the section <h2> titles in order; no References; Awards dormant', () => {
    const titles = Array.from(document.querySelectorAll('.resume-section__title')).map((h) =>
      h.textContent.trim(),
    );
    expect(titles).toEqual([
      'Summary',
      'Skills',
      'Experience',
      'Education',
      'Certifications',
      'Projects',
      'Writing',
    ]);
    // Every section title is a semantic <h2>.
    for (const h of document.querySelectorAll('.resume-section__title')) {
      expect(h.tagName).toBe('H2');
    }
    // No References section anywhere.
    const allH2 = Array.from(document.querySelectorAll('h2')).map((h) =>
      h.textContent.toLowerCase(),
    );
    expect(allH2.some((t) => t.includes('reference'))).toBe(false);
    // Awards is not wired until content exists → no awards section rendered.
    expect(document.querySelector('.resume-awards')).toBeNull();
  });

  it('renders six Experience roles as <h3> with <ul>/<li> bullets', () => {
    const exp = document.querySelector('.resume-experience');
    expect(exp).not.toBeNull();
    const roles = exp.querySelectorAll('h3.resume-entry__title');
    expect(roles.length).toBe(6);
    // Disney NCP entry has bullets.
    expect(exp.querySelector('ul li'), 'experience should render <ul><li> bullets').not.toBeNull();
  });

  it('renders seven Projects, each with an <h3>', () => {
    const proj = document.querySelector('.resume-projects');
    expect(proj).not.toBeNull();
    expect(proj.querySelectorAll('h3.resume-entry__title').length).toBe(7);
  });

  it('opens Projects on the section grammar: proposition, URL, description, label', () => {
    const proj = document.querySelector('.resume-projects');
    expect(proj, 'projects section missing').not.toBeNull();
    const lead = proj.querySelector('.resume-projects__lead');
    expect(lead, 'projects lead missing').not.toBeNull();
    // The proposition slot holds the CLAIM, not the label. It used to hold
    // "Selected Projects" — the label, standing where the claim belongs, which
    // is why the section asserted nothing about itself and had no label row.
    // The proposition is the claim alone, and the separator before the URL is a
    // middle dot rather than an em dash — because this proposition already
    // CONTAINS one ("Products—and the decisions behind them"), and a second em
    // dash in the same line stops marking a break and starts looking like a
    // typo. Writing's proposition has no internal dash and takes the closed em
    // dash instead; see the grammar test below for why that is consistency
    // rather than an exception.
    expect(lead.querySelector('strong')?.textContent).toBe(PROJECTS_HEADING);
    expect(
      lead.textContent.replace(/\s+/g, ' '),
      'the Projects proposition should be separated from its URL by a middle dot',
    ).toContain(`${PROJECTS_HEADING} · nathanpayne.com/projects`);
    const link = lead.querySelector('a');
    expect(link.getAttribute('href')).toBe('/projects/');
    expect(link.textContent).toContain('nathanpayne.com/projects');
    const desc = proj.querySelector('.resume-projects__desc');
    expect(desc, 'projects intro missing').not.toBeNull();
    // The method no longer heads the section, and "from first commit to deploy"
    // was specifically wrong for a project that never launched.
    expect(desc.textContent).toContain('consumer, enterprise, finance, and developer tooling');
    expect(desc.textContent).toContain('decisions, tradeoffs, and evidence');
    expect(desc.textContent).not.toContain('systems design exercise');
    expect(desc.textContent).not.toContain('first commit to deploy');
    // Lifecycle status is looked up from the `projects` collection, so the two
    // surfaces cannot disagree.
    const statuses = [...proj.querySelectorAll('.resume-entry__status')].map((s) =>
      s.textContent.trim(),
    );
    expect(statuses.length, 'every resume project should carry a status').toBe(
      proj.querySelectorAll('.resume-entry').length,
    );
    for (const status of statuses) {
      expect(['SHIPPED', 'ARCHIVED', 'PAUSED', 'EXPERIMENT', 'IN PROGRESS']).toContain(status);
    }
    expect(new Set(statuses).size, 'expected mixed lifecycle states').toBeGreaterThan(1);

    // The selected-items label, and the order of the whole grammar:
    // proposition → description → label → items.
    const label = proj.querySelector('.resume-projects__label');
    expect(label, 'projects selected-items label missing').not.toBeNull();
    expect(label.textContent.trim()).toBe('Selected projects:');
    const firstEntry = proj.querySelector('.resume-entry');
    const order = [lead, desc, label, firstEntry];
    for (let i = 0; i < order.length - 1; i += 1) {
      expect(
        order[i].compareDocumentPosition(order[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING,
        `section grammar out of order at position ${i}`,
      ).toBeTruthy();
    }
  });

  it('gives Writing and Projects the same section grammar', () => {
    // #947. The two sections are the only ones built from a proposition and a
    // canonical URL, and they should read as one pattern rather than two
    // near-misses. Asserted structurally — same parts, same order — rather
    // than by pinning either section's copy, which is asserted elsewhere.
    for (const [section, ns] of [
      [document.querySelector('.resume-projects'), 'resume-projects'],
      [document.querySelector('.resume-writing'), 'resume-writing'],
    ]) {
      expect(section, `${ns} section missing`).not.toBeNull();
      const lead = section.querySelector(`.${ns}__lead`);
      const desc = section.querySelector(`.${ns}__desc`);
      const label = section.querySelector(`.${ns}__label`);
      expect(lead, `${ns} has no proposition line`).not.toBeNull();
      expect(
        lead.querySelector('strong'),
        `${ns} proposition is not set as the claim`,
      ).not.toBeNull();
      expect(
        lead.querySelector('a[href]'),
        `${ns} proposition carries no canonical URL`,
      ).not.toBeNull();
      expect(desc, `${ns} has no description`).not.toBeNull();
      expect(label, `${ns} has no selected-items label`).not.toBeNull();
      expect(label.textContent.trim()).toMatch(/^Selected .+:$/);
      for (const [a, b] of [
        [lead, desc],
        [desc, label],
      ]) {
        expect(
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
          `${ns} grammar is out of order`,
        ).toBeTruthy();
      }

      // The one part of the grammar the two sections deliberately do NOT share.
      // CMOS consistency is using punctuation for its function, not forcing one
      // mark into two different constructions: Writing's proposition is a plain
      // noun phrase, so a closed em dash makes the URL an interruptive
      // continuation of it. Projects' proposition already contains an em dash,
      // and a second one in the same line reads as a typo rather than a break —
      // so it takes a middle dot, the site's own separator elsewhere.
      const flat = lead.textContent.replace(/\s+/g, ' ').trim();
      if (ns === 'resume-writing') {
        expect(lead.querySelector('strong').textContent, 'Writing closes on an em dash').toMatch(
          /—$/,
        );
        expect(flat, 'Writing should not space its em dash').not.toMatch(/\s—|—\s/);
      } else {
        expect(
          lead.querySelector('strong').textContent,
          'Projects states the claim alone',
        ).not.toMatch(/—$/);
        expect(flat, 'Projects separates its URL with a middle dot').toMatch(/ · /);
      }
    }
  });

  it('sets each project name as typography, not as a link', () => {
    // #947. The name is the entry's identity; every destination lives in the
    // row beneath it, so one line answers "where can I go from here" instead
    // of that answer being split between a clickable heading and a link row.
    // Pinned as a negative assertion because a linked title is the obvious
    // thing to reintroduce.
    const proj = document.querySelector('.resume-projects');
    const titles = [...proj.querySelectorAll('h3.resume-entry__title')];
    expect(titles.length).toBe(7);
    for (const title of titles) {
      expect(
        title.querySelector('a'),
        `"${title.textContent.trim()}" is a link; the project name should be typography`,
      ).toBeNull();
    }
    expect(titles.map((t) => t.textContent.trim())).toEqual([
      'Five Across—Live Multiplayer Social Bingo Platform',
      'Mergepath—Agent Governance Infrastructure',
      'Override—Broadway Financial Operating System',
      'Device Source of Truth—Partner Device Intelligence Platform',
      'Matchline—AI Career CRM',
      'Swipe Watch—Content Discovery Prototype',
      'Friends & Family Billing—Shared-Bill Coordination',
    ]);
    // The control for the negative assertion: prove the walk can see a link
    // inside this section at all, so "no link in the title" is a real finding
    // rather than a selector that matches nothing.
    expect(
      proj.querySelector('.resume-entry__link a'),
      'no links found anywhere in the section — the negative assertion is vacuous',
    ).not.toBeNull();
  });

  it('opens each project with a lifecycle kicker carrying the shared marker', () => {
    // #944. Three separable claims, because they fail separately: the kicker
    // precedes its heading, it carries the site's marker vocabulary, and the
    // word is real text rather than something only the mark conveys.
    const entries = [...document.querySelectorAll('.resume-projects .resume-entry')];
    expect(entries.length).toBe(7);
    for (const entry of entries) {
      const status = entry.querySelector('.resume-entry__status');
      const title = entry.querySelector('.resume-entry__title');
      expect(status, `no lifecycle kicker in "${title.textContent.trim()}"`).not.toBeNull();
      expect(
        status.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
        'the kicker should precede the project heading, not trail the name',
      ).toBeTruthy();
      expect(status.classList.contains('state-marker'), 'kicker missing the shared mark').toBe(
        true,
      );
      // Real text, not a glyph standing in for one. The mark is drawn by a
      // ::before, so the element's own text content is the whole word — this is
      // what survives copy/paste, a screen reader, and an ATS parser.
      expect(status.textContent.trim()).toMatch(/^[A-Z ]+$/);
    }
  });

  it('takes every lifecycle value from the projects collection, unmodified', () => {
    // The résumé must not grow a status mapping of its own. Read the canonical
    // value straight out of each project's own page and require a match; a
    // résumé-local table would drift from it silently.
    // The name is no longer a link (#947), so the slug comes from the
    // collection file whose `name:` matches the rendered heading rather than
    // from an href. Still derived, still one source.
    const dir = resolve(__dirname, '../src/content/resume/projects');
    // Parsed, not regexed: `name: 'Five Across—…'` and an unquoted scalar are
    // both valid YAML that Astro renders fine, and a regex tied to one spelling
    // would fail a required check over harmless formatting (Codex, PR #946).
    const bySlug = Object.fromEntries(
      readdirSync(dir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => [
          parseFrontmatter(readFileSync(join(dir, f), 'utf-8')).name,
          f.replace(/\.md$/, ''),
        ]),
    );
    const byHref = new Map(
      [...document.querySelectorAll('.resume-projects .resume-entry')].map((entry) => {
        const name = entry.querySelector('.resume-entry__title').textContent.trim();
        expect(bySlug[name], `no collection entry named "${name}"`).toBeTruthy();
        return [`projects/${bySlug[name]}`, entry.querySelector('.resume-entry__status')];
      }),
    );
    expect(byHref.size).toBe(7);
    for (const [href, status] of byHref) {
      const page = readDist(`${href}/index.html`);
      const canonical = /class="[^"]*metadata-strip__status[^"]*"[^>]*>([^<]+)</.exec(page);
      expect(canonical, `no STATUS cell found on ${href}`).not.toBeNull();
      expect(status.textContent.trim(), `${href} disagrees with its project page`).toBe(
        canonical[1].trim(),
      );
      // The mark, not just the word: same status must select the same modifier.
      const modifier = [...status.classList].find((c) => c.startsWith('state-marker--'));
      expect(page, `${href} does not carry ${modifier}`).toContain(modifier);
    }
    // Deliberately no assertion on WHICH states appear. Every value here is
    // derived from the project pages, and pinning today's mix — four SHIPPED,
    // one each of ARCHIVED, PAUSED, EXPERIMENT — would be the one
    // hand-maintained figure in a check whose whole point is that nothing is
    // restated. Flipping a project's lifecycle is a legitimate content edit and
    // must not fail a résumé test. That the résumé shows a mixed set at all is
    // asserted where it belongs, on the résumé's own markup, above.
  });

  it('confines lifecycle marks to the Projects section', () => {
    // The vocabulary means product/project lifecycle state and keeps that
    // precision only by staying out of employment history, skills, education,
    // certifications, writing, and the availability CTA.
    const all = [...document.querySelectorAll('.state-marker')];
    // The positive control first: a page with no marks at all would satisfy
    // the stray check below for entirely the wrong reason.
    expect(all.length, 'no lifecycle marks on the page — the walk found nothing').toBeGreaterThan(
      0,
    );
    const strays = all.filter((el) => !el.closest('.resume-projects')).map((el) => el.className);
    expect(strays, 'lifecycle marks outside the Projects section').toEqual([]);
    // And the second control, for the filter itself: prove `.closest` can
    // report a stray, by asking it about an element genuinely outside.
    const outside = document.querySelector('.resume-experience .resume-entry__title');
    expect(
      outside.closest('.resume-projects'),
      'the stray filter cannot detect anything',
    ).toBeNull();
    expect(all.length, 'expected exactly one mark per project entry').toBe(
      document.querySelectorAll('.resume-projects .resume-entry').length,
    );
  });

  it('exposes exactly the destinations its canonical project declares', () => {
    // #947. The contract is bidirectional, and it was not always. It used to
    // derive the expectation from the RÉSUMÉ entry and check the canonical
    // project only where a `url` was already present — so a wrong URL failed,
    // and a MISSING one passed. Mergepath demonstrated it: `mergepath.mdx`
    // declared a `liveUrl` the résumé entry never carried, the destination row
    // showed GitHub alone, and this test was green (Codex, PR #946).
    //
    // The canonical project is now the source of the expectation in both
    // directions: every `liveUrl` and `githubUrl` it declares must appear on
    // the résumé, at the same address, in that order — and a destination the
    // canonical project does not have is not required. No opt-out: there are
    // no deliberate omissions today, and inventing a mechanism for a
    // hypothetical one would reopen the hole this closes.
    const resumeDir = resolve(__dirname, '../src/content/resume/projects');
    const resumeEntries = readdirSync(resumeDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({ file: f, data: parseFrontmatter(readFileSync(join(resumeDir, f), 'utf-8')) }));

    // Discovered by DECLARED slug through the same recursive `**/*.{md,mdx}`
    // inventory the collection loads with — never by basename, extension or
    // directory, all of which this PR has already had to unlearn.
    const canonical = findFilesRecursively(resolve(__dirname, '../src/content/projects'), (f) =>
      /\.mdx?$/.test(f),
    ).map((f) => parseFrontmatter(readFileSync(f, 'utf-8')));

    const entries = [...document.querySelectorAll('.resume-projects .resume-entry')];
    expect(entries.length, 'no résumé project entries found').toBeGreaterThan(0);

    let withLive = 0;
    for (const entry of entries) {
      const name = entry.querySelector('.resume-entry__title').textContent.trim();
      const match = resumeEntries.find((r) => r.data.name === name);
      expect(match, `no résumé collection entry named "${name}"`).toBeTruthy();
      const slug = match.file.replace(/\.md$/, '');
      const project = canonical.find((c) => c.slug === slug);
      expect(project, `no canonical project declares slug "${slug}"`).toBeTruthy();

      // The expectation comes from the canonical project, live app first. It
      // may legitimately be EMPTY: `liveUrl` and `githubUrl` are both optional,
      // and an undeployed project with a private repository has neither, in
      // which case the component correctly renders no destination row. The
      // equality below then asserts exactly that, so requiring at least one
      // here would fail a required check on a valid project (Codex, PR #946).
      // The fixture-level controls at the end keep the loop from going vacuous.
      // Read through `frontmatterUrl`, which trims because the schema does, so
      // a canonical URL authored with surrounding whitespace renders clean and
      // must compare clean (#948). The rendered hrefs below are NOT normalised:
      // they are held to the trimmed value exactly, which is what proves the
      // schema actually trimmed rather than assuming it.
      const liveHref = frontmatterUrl(project.liveUrl);
      const repoHref = frontmatterUrl(project.githubUrl);
      const expected = [liveHref, repoHref].filter(Boolean);

      const anchors = [...entry.querySelectorAll('.resume-entry__link a')];
      expect(
        anchors.map((a) => a.getAttribute('href')),
        `${name} does not expose exactly its canonical destinations, in order — ` +
          `a canonical liveUrl or githubUrl missing from the résumé fails here`,
      ).toEqual(expected);

      // And the résumé's own frontmatter must carry the same addresses, so the
      // two collections cannot drift behind an identical render.
      expect(
        [frontmatterUrl(match.data.url), frontmatterUrl(match.data.repo)].filter(Boolean),
        `${slug}: résumé frontmatter disagrees with the canonical project`,
      ).toEqual(expected);

      // Labels: generic words, not URLs. Which word the live link gets is not
      // decided here — it comes from the project's own detail-page CTA, so the
      // two surfaces cannot disagree about what a URL opens. The CTA is located
      // by href rather than wording (`liveLabel` is free text), and read via
      // textContent so an escaped label like `View R&D Demo` compares cleanly.
      let liveWord = null;
      if (liveHref) {
        withLive += 1;
        const projectDom = new JSDOM(readDist(`projects/${slug}/index.html`)).window.document;
        // Located by scanning hrefs rather than by an attribute selector built
        // from the raw scalar: the page renders the schema-trimmed URL, so a
        // selector built from untrimmed frontmatter matched nothing (#948). The
        // comparison is still exact — the scan replaces the selector, not the
        // equality — and still takes the first match in document order.
        const ctaEl = [...projectDom.querySelectorAll('a[href]')].find(
          (a) => a.getAttribute('href') === liveHref,
        );
        expect(ctaEl, `no live CTA found on /projects/${slug}/ for ${liveHref}`).toBeTruthy();
        expect(
          ctaEl.textContent.trim(),
          `/projects/${slug}/ CTA does not match its declared liveLabel`,
        ).toBe((project.liveLabel ?? 'View Live Product').trim());
        liveWord = liveLinkLabel(project.liveLabel);
      }
      // Built from the two destination ROLES, in the order the component
      // renders them — not by matching each href back against `liveUrl`.
      // Nothing requires the two addresses to differ, and a project pointing
      // both fields at one URL renders `<live word>` then `GitHub` correctly,
      // while href equality mapped both anchors to the live word and failed the
      // second (#948).
      expect(
        anchors.map((a) => a.textContent.replace(/[↗\s]+/g, ' ').trim()),
        `${name} should label its destinations ${liveWord ?? '(none)'} / GitHub`,
      ).toEqual([...(liveHref ? [liveWord] : []), ...(repoHref ? ['GitHub'] : [])]);

      for (const a of anchors) {
        expect(a.getAttribute('target'), `${name} link should open in a new tab`).toBe('_blank');
        expect(a.getAttribute('rel'), `${name} link missing rel=noopener`).toBe('noopener');
        // Seven rows all read "Live · GitHub", so the label alone is not a
        // name; the accessible name has to say which project it belongs to.
        expect(a.getAttribute('aria-label'), `${name} link missing an accessible name`).toContain(
          name,
        );
      }
    }

    // Controls. The loop asserts equality per entry, which a page rendering no
    // destinations at all would satisfy only if every canonical project also
    // declared none — so pin that the fixture actually exercises both branches.
    expect(
      withLive,
      'no canonical project declares a liveUrl — the live-label branch never ran',
    ).toBeGreaterThan(0);
    const withBoth = entries.filter(
      (e) => e.querySelectorAll('.resume-entry__link a').length === 2,
    );
    expect(withBoth.length, 'no project renders two destinations').toBeGreaterThan(0);
  });

  it('describes NCPv3 as a runtime that retired the parallel Rust app', () => {
    // #947. The superseded wording said NCPv3 extended the JavaScript stack
    // "without requiring a parallel Rust implementation" — describing avoided
    // work, when the Rust app already existed and was retired. Pinned as a
    // negative assertion so the corrected claim cannot silently revert, on both
    // surfaces that carry it.
    const bullet = [...document.querySelectorAll('.resume-experience .resume-prose li')].find(
      (li) => li.textContent.includes('NCPv3'),
    );
    expect(bullet, 'no NCPv3 experience bullet found').not.toBeNull();
    expect(bullet.textContent).toContain('retiring the parallel Rust app');
    expect(bullet.textContent).toContain('consolidating two codebases and two teams into one');
    expect(bullet.textContent).toContain('app teams choosing to build on the shared runtime');
    expect(bullet.textContent).not.toContain('without requiring a parallel');

    const highlight = [...document.querySelectorAll('.resume-highlight')].find((h) =>
      h.textContent.includes('NCPv3'),
    );
    expect(highlight, 'no NCPv3 highlight card found').not.toBeNull();
    expect(highlight.textContent).toContain('retiring the parallel Rust app');
    expect(highlight.textContent).not.toContain('without requiring a parallel');
  });

  it('states the current review policy on the PR-pipeline bullet', () => {
    // #947. The metric alone read as a finished result; the policy sentence is
    // what makes it a live process with a direction of travel.
    const bullet = [...document.querySelectorAll('.resume-experience .resume-prose li')].find(
      (li) => li.textContent.includes('PR review pipeline'),
    );
    expect(bullet, 'no PR-pipeline bullet found').not.toBeNull();
    expect(bullet.textContent).toContain('exceeding the 30% Q2 OKR target');
    expect(bullet.textContent).toContain(
      'AI review plus two human reviewers, moving toward AI plus one',
    );
  });

  it('renders three Certifications; CSP-PO is attributed to Scrum Alliance', () => {
    const certs = document.querySelectorAll('.resume-certifications .resume-cert');
    expect(certs.length).toBe(3);
    const text = document.querySelector('.resume-certifications').textContent;
    expect(text).toContain('Certified Scrum Professional - Product Owner (CSP-PO)');
    expect(text).toContain('Scrum Alliance');
    // The superseded training-provider attribution must not appear.
    expect(text).not.toContain('LeadingAgile');
  });

  it('renders a CompanyLogo on every Experience role, Education entry, and Certification', () => {
    for (const sel of ['.resume-experience .resume-entry', '.resume-education .resume-entry']) {
      const entries = document.querySelectorAll(sel);
      expect(entries.length, `no entries for ${sel}`).toBeGreaterThan(0);
      for (const entry of entries) {
        expect(entry.querySelector('.company-logo'), `${sel} missing .company-logo`).not.toBeNull();
      }
    }
    for (const cert of document.querySelectorAll('.resume-certifications .resume-cert')) {
      expect(cert.querySelector('.company-logo'), 'cert missing .company-logo').not.toBeNull();
    }
  });

  it('every CompanyLogo carries an initials fallback element', () => {
    const logos = document.querySelectorAll('.company-logo');
    expect(logos.length).toBe(10); // 6 experience + 1 education + 3 certifications
    for (const logo of logos) {
      expect(
        logo.querySelector('.company-logo__initials'),
        'logo missing initials fallback',
      ).not.toBeNull();
    }
  });

  it('uses self-hosted asset overrides where Logo.dev is wrong/absent (Current TV, CSP-PO)', () => {
    // Current TV is defunct (no live domain); the CSP-PO cert deliberately
    // overrides to the official Scrum Alliance badge rather than the corporate
    // mark Logo.dev returns for scrumalliance.org. Turner, by contrast, resolves
    // via Logo.dev (turner.com), so it's a remote logo with no committed asset.
    const srcs = Array.from(document.querySelectorAll('.company-logo img')).map((img) =>
      img.getAttribute('src'),
    );
    expect(srcs).toContain('/images/logos/current-tv.png');
    expect(srcs).toContain('/images/logos/csp-po.png');
    expect(existsSync(resolve(DIST, 'images/logos/current-tv.png'))).toBe(true);
    expect(existsSync(resolve(DIST, 'images/logos/csp-po.png'))).toBe(true);
  });

  it('emits a Person + ProfilePage JSON-LD graph', () => {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const types = new Set();
    for (const s of scripts) {
      try {
        const ld = JSON.parse(s.textContent);
        const graph = Array.isArray(ld['@graph']) ? ld['@graph'] : [ld];
        for (const e of graph) if (e && e['@type']) types.add(e['@type']);
      } catch {
        /* a malformed graph would fail another test */
      }
    }
    expect(types.has('Person')).toBe(true);
    expect(types.has('ProfilePage')).toBe(true);
  });

  it('preserves verbatim summary anchors (20+ years, Disney+/Hulu/ESPN)', () => {
    const summary = document.querySelector('.resume-summary').textContent;
    expect(summary).toContain('20+ years');
    expect(summary).toContain('Disney+, Hulu, and ESPN');
  });

  it('every section title id is wired to its section via aria-labelledby', () => {
    const sections = document.querySelectorAll('section.resume-section');
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) {
      const id = section.getAttribute('aria-labelledby');
      expect(id, 'section missing aria-labelledby').toBeTruthy();
      const heading = section.querySelector(`#${id}`);
      expect(heading, `aria-labelledby="${id}" does not resolve to a heading`).not.toBeNull();
      expect(heading.classList.contains('resume-section__title')).toBe(true);
    }
  });

  it('never starts a logo at a speculative name lookup (domain/override only)', () => {
    // The deliberate divergence from the friends-and-family-billing reference:
    // an entry with no website/logo lands on initials, never a guessed
    // /name/ logo (which could resolve to a successor brand). Every primary
    // <img> src is therefore an override path or a by-domain Logo.dev URL;
    // by-name URLs only ever live in the data-name-src onerror fallback.
    for (const img of document.querySelectorAll('.company-logo__img')) {
      expect(
        img.getAttribute('src'),
        'a logo primary src should never be a speculative /name/ lookup',
      ).not.toMatch(/logo\.dev\/name\//);
    }
  });
});

describe('Resume — print stylesheet', () => {
  let cssFiles;
  beforeAll(() => {
    const astroDir = resolve(DIST, '_astro');
    cssFiles = existsSync(astroDir)
      ? readdirSync(astroDir)
          .filter((f) => f.endsWith('.css'))
          .map((f) => readFileSync(join(astroDir, f), 'utf-8'))
      : [];
  });

  /** All @media print blocks across every emitted stylesheet. */
  function allPrintBlocks() {
    return cssFiles.flatMap(printBlocks);
  }

  it('hides the canvas chrome (logo, accent margin, sidebar) inside @media print', () => {
    expect(cssFiles.length, 'no emitted CSS found in dist/_astro').toBeGreaterThan(0);
    const block = allPrintBlocks().find((b) => b.includes('company-logo'));
    expect(block, 'no @media print block referencing .company-logo').toBeTruthy();
    expect(block).toContain('display:none');
    // The screen-only Mondrian margin + sidebar (ToC/highlights) are hidden too.
    expect(block).toContain('resume-canvas-margin');
    expect(block).toContain('resume-canvas-sidebar');
  });

  it('forces black-on-white and avoids breaking entries inside @media print', () => {
    const block = allPrintBlocks().find((b) => b.includes('resume-canvas'));
    expect(block, 'no @media print block found').toBeTruthy();
    expect(block).toContain('#000'); // forced black text
    expect(block).toContain('break-inside:avoid'); // keep entries/projects/certs whole
  });

  it('declares print-color-adjust for the bullet markers and for nothing else on this page', () => {
    // Two rules in one, because they are the same rule read in both
    // directions: exactly one thing in the résumé cascade may pin itself to
    // print a background, and it is the bullet marker.
    //
    // What must be there (#953). `.resume-prose ul li::before` paints a 6px
    // square as a `background`, and Chrome's print dialog leaves "Background
    // graphics" off by default, so the `background: #000 !important` beside it
    // had never reached paper. #925 fixed the generated PDF by turning on
    // `printBackground`, which is why no artifact this repo builds can see the
    // gap — the file has had all eleven markers since, and the printed page
    // had none.
    //
    // What must NOT be there. The rule that makes the lifecycle marks print
    // their fills was `.resume-canvas .state-marker::before` from #944 until
    // #950 unscoped it to `.state-marker::before`; it is asserted, with the
    // reasoning, in tests/lifecycle-marker.test.js § print fidelity. A
    // surface-scoped copy coming back here would not fail a build — it would
    // just let this page's marks start drifting from the other three
    // surfaces'. So any résumé-scoped `print-color-adjust` selector that is
    // not the bullet marker fails, whatever it targets.
    //
    // Every print block, and every selector inside a comma-joined list, not
    // the first block that mentions `resume-canvas` (#956). A second
    // résumé-specific block added later sits behind a `.find()` and is never
    // reached, and a residue copy merged into an existing selector list is
    // invisible to a whole-block `toMatch`. Both flattenings live in
    // printColorAdjustRules, which documents why.
    const blocks = allPrintBlocks();
    expect(blocks.length, 'no @media print block found').toBeGreaterThan(0);

    // Selector-substring scoping, because "belongs to the résumé" is a claim
    // about the selector and not about which block it was written in — a
    // residue rule can be authored anywhere in the cascade and still target
    // this page. The complementary check, that nothing anywhere narrows the
    // lifecycle rule to a surface, is tests/lifecycle-marker.test.js's.
    const resumeScoped = printColorAdjustRules(blocks).filter((rule) =>
      rule.selector.includes('resume-'),
    );

    // Control: the "nothing else" half of this test proves nothing on its own
    // — an empty result would satisfy it while meaning the scan matched no
    // rules at all. Requiring the one rule that IS expected is what makes a
    // clean result evidence rather than silence.
    expect(
      resumeScoped,
      'the résumé bullet markers are not pinned to print their fills; without ' +
        'print-color-adjust the background beside it never reaches paper (#953)',
    ).toHaveLength(1);

    // Single colon: the minifier emits the legacy `:before` form.
    expect(
      resumeScoped[0].selector,
      `${resumeScoped[0].selector} is not the bullet marker — a print-color-adjust ` +
        'anywhere else in the résumé cascade is either a residue copy of the lifecycle ' +
        'rule, which belongs to .state-marker::before and not to one surface (#950), or ' +
        'a new decision that has not been made here',
    ).toMatch(/^\.resume-prose ul li::?before$/);

    // The value, not just the property. `economy` is the initial value, so a
    // rule flipped to it is a rule that has been switched off — the marker
    // stops reaching paper exactly as it did before #953, while a scan that
    // only looked for the property would still find this rule and pass.
    // (Codex, #961.)
    expect(
      resumeScoped[0].value,
      'the bullet-marker rule declares print-color-adjust but not `exact`, which ' +
        'leaves Chrome omitting the background again (#953)',
    ).toBe('exact');
  });

  it('declares the mark fills, and the geometry the PDF ink oracle measures', () => {
    // #948. The declarations the PDF oracle reads, pinned where they can fail
    // without a render. Two failures live here rather than in the ink
    // assertion, and both would otherwise be invisible until something else
    // broke:
    //
    //   1. A broken variant selector. Delete the `--shipped` fill and nothing
    //      upstream objects — `printBackground` still paints backgrounds and
    //      `print-color-adjust` still forces them — while every mark prints as
    //      the same outline. The ink assertion does catch this, and catching it
    //      twice is the point: this one names the rule, in the file that
    //      declares it, without needing a rendered page to say so.
    //   2. Drifted geometry. `STATUS_MARK_SIZE` in tests/helpers/pdf-oracle.js
    //      is DERIVED from these declarations — 0.72em of the 7.5pt kicker plus
    //      a 1px border each side — and the classifier's size window is built
    //      around it. Change them and the oracle looks at the wrong column,
    //      which is the failure mode where a check reports a confident answer
    //      about the wrong thing.
    //
    // Note what the border-plus-box derivation does NOT cover: `--archived`
    // also carries `padding: 0.1em`, which grows its box for the same reason
    // the border does, so that one mark renders larger than its three peers.
    // That is a shipped inconsistency rather than a test problem (#959); the
    // oracle's window is wide enough for both it and a corrected version.
    //
    // Read from the screen cascade, not a print block: these are the base
    // declarations both surfaces inherit.
    const screen = cssFiles.map(withoutPrintBlocks).join('\n');
    const rule = (selector) => {
      const match = new RegExp(`\\${selector}::?before\\{([^}]*)\\}`).exec(screen);
      return match?.[1] ?? null;
    };

    const geometry = rule('.state-marker');
    expect(geometry, 'no .state-marker::before rule in the screen cascade').toBeTruthy();
    expect(geometry, 'mark width drifted from what the PDF oracle measures').toMatch(
      /width:\s*0?\.72em/,
    );
    expect(geometry, 'mark height drifted from what the PDF oracle measures').toMatch(
      /height:\s*0?\.72em/,
    );
    expect(geometry, 'the 1px outline the oracle adds to the mark box is gone').toMatch(
      /border:\s*1px/,
    );

    // The three fills, by variant. PAUSED and IN PROGRESS correctly declare
    // none — the bare outline is their mark.
    expect(rule('.state-marker--shipped'), 'SHIPPED lost its solid fill').toMatch(
      /background-color:\s*currentcolor/i,
    );
    expect(rule('.state-marker--archived'), 'ARCHIVED lost its cored fill').toMatch(
      /background-color:\s*currentcolor/i,
    );
    expect(rule('.state-marker--experiment'), 'EXPERIMENT lost its half fill').toMatch(
      /background-image:\s*linear-gradient/i,
    );
  });

  it('applies the 8.5in page width only inside @media print', () => {
    // The 8.5in constraint must not appear anywhere in the base (screen)
    // cascade — meaning outside EVERY @media print block, not merely before
    // the first one.
    for (const css of cssFiles) {
      const screenCascade = withoutPrintBlocks(css);
      expect(/8\.5in/.test(screenCascade), '8.5in width leaked into the screen cascade').toBe(
        false,
      );
    }
    const block = allPrintBlocks().find((b) => b.includes('8.5in'));
    expect(block, '8.5in print width constraint missing').toBeTruthy();
  });
});

/**
 * Downloadable PDF (#616).
 *
 * The print stylesheet already existed; what was missing was a file and a
 * button. `src/integrations/resume-pdf.mjs` renders the built /resume/ route
 * to dist/Nathan-Payne-Resume.pdf during `astro:build:done` (driven from
 * og-images.mjs, which already has a Chromium and a static server up), so the
 * file cannot drift from the page — the #163/#164 bug class.
 *
 * These assertions follow tests/og-image-targets.test.js: don't just check
 * that the link is present and well-shaped, check that it resolves to a real
 * file that actually shipped.
 */
describe('Resume — downloadable PDF', () => {
  const PDF_NAME = 'Nathan-Payne-Resume.pdf';
  const PDF_PATH = resolve(DIST, PDF_NAME);

  beforeEach(() => {
    setupDOM(readDist('resume/index.html'));
  });

  it('renders a Download PDF affordance in the header, near the contact block', () => {
    const header = document.querySelector('.resume-canvas-header');
    const link = header?.querySelector('.resume-download');
    expect(link, 'no .resume-download link in the resume header').not.toBeNull();
    expect(link.textContent.trim()).toContain('Download PDF');
    expect(link.hasAttribute('download'), 'link should carry the download attribute').toBe(true);
    // It sits after the contact block, not above the name.
    const contact = header.querySelector('.resume-contact--profiles');
    expect(
      contact.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING,
      'the download affordance should follow the contact block',
    ).toBeTruthy();
  });

  it('links to a recruiter-legible filename, not resume.pdf', () => {
    const href = document.querySelector('.resume-download').getAttribute('href');
    expect(href).toBe(`/${PDF_NAME}`);
    expect(href).not.toMatch(/\/resume\.pdf$/);
  });

  it('the download link resolves to a real file in dist/', () => {
    const href = document.querySelector('.resume-download').getAttribute('href');
    const target = resolve(DIST, href.replace(/^\/+/, ''));
    expect(
      existsSync(target),
      `the resume download link points at ${href}, which is not in dist/. ` +
        `The build-time generator (src/integrations/resume-pdf.mjs, invoked ` +
        `from og-images.mjs) did not run or wrote a different filename.`,
    ).toBe(true);
  });

  it('the generated file is a real, letter-size PDF', () => {
    const buf = readFileSync(PDF_PATH);
    expect(buf.subarray(0, 5).toString('latin1'), 'not a PDF header').toBe('%PDF-');
    // US Letter at 72dpi = 612 × 792 pt. Every page box must be letter — a
    // stray A4 page would mean the format option stopped being honored.
    const boxes = new Set(
      (buf.toString('latin1').match(/\/MediaBox\s*\[[^\]]*\]/g) || []).map((b) =>
        b.replace(/\s+/g, ' '),
      ),
    );
    expect(boxes.size, 'expected a single, uniform page size').toBe(1);
    expect([...boxes][0]).toBe('/MediaBox [0 0 612 792]');
  });

  /**
   * #683 — the PDF is rendered off a localhost static server, so Chromium
   * resolved every root-relative href against `http://127.0.0.1:<port>` and
   * froze that into the file's link annotations. 15 of 39 links shipped
   * pointing at a machine the reader doesn't have. The generator now
   * absolutizes them; these assert the file, not the intent.
   */
  describe('link annotations', () => {
    /** Every /URI value Chromium wrote into the PDF's link annotations. */
    function pdfLinkUris() {
      const raw = readFileSync(PDF_PATH).toString('latin1');
      return [...raw.matchAll(/\/URI\s*\(([^)]*)\)/g)].map((m) => m[1]);
    }

    it('has link annotations at all', () => {
      // Guards the two tests below: a regex that silently matched nothing
      // would make them pass on a PDF with no links whatsoever.
      expect(pdfLinkUris().length, 'no /URI annotations found in the PDF').toBeGreaterThan(0);
    });

    it('never points a link at the localhost render origin', () => {
      const localhost = pdfLinkUris().filter((uri) =>
        /^https?:\/\/(127\.0\.0\.1|localhost)/i.test(uri),
      );
      expect(
        localhost,
        `the PDF links to the build machine's static server. src/integrations/` +
          `resume-pdf.mjs must absolutize relative hrefs to the configured ` +
          `\`site\` origin before page.pdf() writes the annotations (#683).`,
      ).toEqual([]);
    });

    it('emits only absolute production, external, or mailto links', () => {
      // A relative /URI would be just as broken as a localhost one — it would
      // resolve against whatever the reader's PDF viewer considers the base.
      const bad = pdfLinkUris().filter((uri) => !/^(https?:|mailto:)/i.test(uri));
      expect(bad, 'PDF links must carry a scheme to be clickable off-site').toEqual([]);
    });

    it('routes the Writing link to the production blog, not a local path', () => {
      // The specific link in the bug report, asserted by value.
      expect(pdfLinkUris()).toContain('https://nathanpayne.com/blog/');
    });
  });

  it('the PDF margin constant matches the @page margin in the print stylesheet', () => {
    // Chromium takes its print margins from the printToPDF parameters, not
    // from the CSS @page rule, so the 0.6in floor (#420) is restated in the
    // generator. If someone retunes one, this fails until they retune both.
    const gen = readFileSync(resolve(__dirname, '../src/integrations/resume-pdf.mjs'), 'utf-8');
    const genMargin = gen.match(/RESUME_PDF_MARGIN\s*=\s*'([^']+)'/)?.[1];
    const css = readFileSync(resolve(__dirname, '../src/styles/global.css'), 'utf-8');
    const printIdx = css.indexOf('@media print');
    const cssMargin = css
      .slice(printIdx)
      .match(/@page\s*\{[\s\S]*?margin:\s*([^;]+);/)?.[1]
      .trim();
    expect(genMargin, 'RESUME_PDF_MARGIN not found in resume-pdf.mjs').toBeTruthy();
    expect(cssMargin, '@page margin not found in the @media print block').toBeTruthy();
    expect(genMargin).toBe(cssMargin);
  });

  it('keeps the PDF out of the sitemap', () => {
    // The PDF is an asset, not a route. @astrojs/sitemap enumerates pages, so
    // this should hold by construction — assert it so a future change that
    // starts feeding it custom entries can't silently list a binary.
    const sitemaps = readdirSync(DIST).filter((f) => /^sitemap.*\.xml$/.test(f));
    expect(sitemaps.length, 'no sitemap files in dist/').toBeGreaterThan(0);
    for (const file of sitemaps) {
      expect(readFileSync(join(DIST, file), 'utf-8')).not.toContain(PDF_NAME);
    }
  });

  it('hides the download affordance in @media print', () => {
    const astroDir = resolve(DIST, '_astro');
    const cssFiles = readdirSync(astroDir)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(join(astroDir, f), 'utf-8'));
    const withPrint = cssFiles.filter((css) => css.includes('@media print'));
    expect(withPrint.length, 'no emitted stylesheet has an @media print block').toBeGreaterThan(0);
    const hidden = withPrint.some((css) => {
      const i = css.indexOf('@media print');
      return /\.resume-actions[^{]*\{[^}]*display:\s*none/.test(css.slice(i));
    });
    expect(hidden, '.resume-actions is not hidden inside @media print').toBe(true);
  });

  it('hides the project destination row in print, and keeps the routes that survive', () => {
    // #947. A destination row is only useful where it can be followed. On
    // paper "Live ↗ · GitHub ↗" says nothing without its URLs, and printing
    // fourteen full URLs to fix that cost ~10 lines and a fourth page — so the
    // row is hidden outright, the way the essay list already was, and every
    // project stays reachable through the section lead instead.
    const astroDir = resolve(DIST, '_astro');
    // Balanced blocks, not a slice to EOF. A slice would also match a
    // `display: none` that had been moved OUT of @media print into the base
    // cascade below it — which hides the row on SCREEN too, taking every
    // project destination with it, while this test went on passing and the PDF
    // assertions passed as well (a base rule hides it in print by definition).
    // Codex, PR #946.
    const blocks = readdirSync(astroDir)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(join(astroDir, f), 'utf-8'))
      .flatMap(printBlocks);
    expect(blocks.length, 'no @media print block found in the emitted CSS').toBeGreaterThan(0);

    const hidden = blocks.some((block) =>
      [...block.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some(
        ([, sel, decls]) =>
          /\.resume-entry__link(?![_a-zA-Z-])/.test(sel) && /display:\s*none/.test(decls),
      ),
    );
    expect(hidden, '.resume-entry__link is not hidden in @media print (#947)').toBe(true);

    // What paper keeps instead. Without this the rule above is a silent
    // deletion of every route to the work rather than a considered trade.
    const printed = pdfTextInEmissionOrder(resolve(DIST, 'Nathan-Payne-Resume.pdf'));
    for (const route of [
      'nathanpayne.com/projects',
      'nathanpayne.com/blog',
      'github.com/nathanjohnpayne',
    ]) {
      expect(printed, `the PDF no longer carries ${route}`).toContain(route);
    }
    // And the row's own URLs are genuinely gone, not merely unstyled.
    expect(printed, 'a per-project URL still reaches the PDF').not.toContain('fiveacross.app');
  });
});

/**
 * PDF reading order (#923) and marker visibility (#925).
 *
 * A PDF carries two orders and they are allowed to disagree. The visual one is
 * reconstructed from glyph coordinates — it is what a page image shows, and it
 * was never wrong here. The stream one is the sequence the text is written in,
 * and it is what every consumer that reads the file rather than looks at it
 * gets: ATS parsers, assistive tech, copy-paste.
 *
 * Chromium writes each printed page's text in PAINT order, so a CSS rule that
 * changes paint order reorders the document for those readers while leaving
 * every pixel identical. `.resume-prose li` used to carry `position: relative`
 * as the containing block for its absolutely-positioned bullet square, which
 * puts a list item in step 8 of the painting algorithm — after every
 * non-positioned block and inline on the page. On page 1 that is invisible,
 * because the Disney NCP bullets end the page anyway; on page 2 it moved the
 * four Disney Streaming 2018–2021 bullets past six sections.
 *
 * ## The oracles, and the control
 *
 * `pdftotext -raw` (Poppler) reports content-stream order; Poppler's default
 * mode and any page-image comparison report visual order and pass on the
 * broken file. MuPDF renders the pages for the marker check. Neither this file
 * nor tests/helpers/pdf-oracle.js decodes any PDF itself.
 *
 * Every check here runs against BOTH the freshly built PDF and
 * `tests/fixtures/known-bad-resume-pre-923.pdf` — the résumé exactly as it was
 * published with both defects — and the fixture is required to FAIL. Asserting
 * against a good file proves the assertions run; asserting against the broken
 * one proves they discriminate.
 */
describe('Resume — PDF reading order and markers', () => {
  const BUILT_PDF = resolve(DIST, 'Nathan-Payne-Resume.pdf');
  const KNOWN_BAD_PDF = resolve(__dirname, 'fixtures/known-bad-resume-pre-923.pdf');

  /** Content-stream-order text of each PDF, normalized, read once. */
  const emitted = {};

  beforeAll(() => {
    emitted.built = normalizeForOrder(pdfTextInEmissionOrder(BUILT_PDF));
    emitted.knownBad = normalizeForOrder(pdfTextInEmissionOrder(KNOWN_BAD_PDF));
  });

  beforeEach(() => {
    setupDOM(readDist('resume/index.html'));
  });

  /**
   * Walk `landmarks` through `text`, each required at or after the end of the
   * previous match. Returns the first landmark that is missing or out of
   * sequence, or null when the whole run is in order.
   */
  function firstOutOfOrder(text, landmarks) {
    let cursor = 0;
    for (const { label, value } of landmarks) {
      const needle = normalizeForOrder(value);
      const at = text.indexOf(needle, cursor);
      if (at < 0) {
        return {
          label,
          reason:
            text.indexOf(needle) < 0 ? 'missing from the PDF entirely' : 'appears out of sequence',
        };
      }
      cursor = at + needle.length;
    }
    return null;
  }

  /** Assert a landmark run holds for the built PDF and fails for the fixture. */
  function expectOrder(landmarks, what) {
    const broke = firstOutOfOrder(emitted.built, landmarks);
    expect(
      broke,
      broke &&
        `${broke.label} ${broke.reason}. ${what} — the PDF's content stream must follow ` +
          `the same order as /resume/ (#923).`,
    ).toBeNull();

    // The control. Without it this assertion proves only that it runs.
    expect(
      firstOutOfOrder(emitted.knownBad, landmarks),
      `${what}: this run also passes on the known-bad fixture, so it does not ` +
        `discriminate. See tests/fixtures/README-known-bad-resume.md.`,
    ).not.toBeNull();
  }

  /** Text of every print-visible block under `root`, in DOM order. */
  function printedBlocks(root, hidden) {
    const blocks = [];
    const walk = (el) => {
      if (hidden && el.matches(hidden)) return;
      // The outermost element that directly contributes text. Recursing past
      // it would re-collect an inline `<strong>`, or a `<p>` nested inside a
      // loose Markdown `<li>`, whose text the cursor has already passed.
      const ownText = Array.from(el.childNodes).some(
        (n) => n.nodeType === 3 && n.textContent.trim().length > 0,
      );
      if (ownText) {
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        if (text)
          blocks.push({ label: `${el.tagName.toLowerCase()}: ${text.slice(0, 44)}…`, value: text });
        return;
      }
      for (const child of el.children) walk(child);
    };
    walk(root);
    return blocks;
  }

  /**
   * Selectors the print cascade hides, read out of the emitted stylesheet so
   * the list cannot drift: whatever `@media print` hides is what the PDF
   * omits. Every print block is scanned — Astro concatenates component styles,
   * so the sheet holds several and the first belongs to the blog.
   */
  function printHiddenSelectors() {
    const astroDir = resolve(DIST, '_astro');
    const css = readdirSync(astroDir)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(join(astroDir, f), 'utf-8'))
      .filter((c) => c.includes('@media print'))
      .join('\n');
    const selectors = [];
    for (const at of css.matchAll(/@media print\s*\{/g)) {
      const open = at.index + at[0].length - 1;
      let depth = 0;
      let end = open;
      for (; end < css.length; end += 1) {
        if (css[end] === '{') depth += 1;
        else if (css[end] === '}' && --depth === 0) break;
      }
      for (const rule of css.slice(open + 1, end).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (/display:\s*none/.test(rule[2])) selectors.push(rule[1].trim().replace(/\s+/g, ' '));
      }
    }
    expect(
      selectors.length,
      'no display:none rules found in any @media print block',
    ).toBeGreaterThan(0);
    return selectors.join(',');
  }

  it('extracts substantial real text from the PDF', () => {
    // Positive control. Every assertion below is "A before B", and an empty
    // extraction would satisfy none of them for the right reason.
    expect(emitted.built.length, 'the PDF extracted as (almost) no text').toBeGreaterThan(5000);
    expect(emitted.built, 'a known line of the résumé is missing').toContain(
      normalizeForOrder('Conceptualized and led the CNN Magic Wall'),
    );
  });

  it('writes the Disney Streaming 2018–2021 bullets with their own role', () => {
    // The reported symptom, pinned as literal copy: the role summary is
    // followed by its four bullets, and the next role follows all four.
    expectOrder(
      [
        [
          'Disney Streaming role title',
          'Senior Technical Project Manager, Lead – Disney Streaming',
        ],
        [
          'role summary',
          'Led front-end engineering teams that built and launched Disney+ across connected devices.',
        ],
        ['bullet 1', 'Brought Disney+ from concept to launch across living-room platforms'],
        [
          'bullet 2',
          'Led PlayStation prototyping that produced the first living-room Disney+ experience to launch.',
        ],
        ['bullet 3', 'Rebuilt the Disney+ app for MVPD set-top boxes'],
        ['bullet 4', 'Led Hulu through its PlayStation 5 launch.'],
        [
          'the next role (MLB Advanced Media)',
          'Technical Project Manager – MLB Advanced Media / BAMTech Media',
        ],
      ].map(([label, value]) => ({ label, value })),
      'The Disney Streaming bullets have come away from their role',
    );
  });

  it('writes every experience role with its own summary and bullets', () => {
    // The general form, derived from the built page rather than pinned:
    // whatever the résumé says, the PDF must say it in that order.
    const landmarks = [];
    for (const entry of document.querySelectorAll('.resume-experience .resume-entry')) {
      const title = entry.querySelector('.resume-entry__title').textContent.trim();
      landmarks.push({ label: `role "${title}"`, value: title });
      const prose = entry.querySelector('.resume-prose');
      if (prose) landmarks.push(...printedBlocks(prose, null));
    }
    expect(landmarks.length, 'no experience landmarks derived from the page').toBeGreaterThan(10);
    expectOrder(landmarks, 'An experience role came apart from its body');
  });

  it('writes every printed block in the order the page composes it', () => {
    // The whole contract in one assertion, from `.resume-canvas` so the header
    // participates too: headings, summaries, bullets, skills rows,
    // certifications, project tech lines, URLs and descriptions are all things
    // a positioned element could detach.
    const blocks = printedBlocks(document.querySelector('.resume-canvas'), printHiddenSelectors());
    expect(blocks.length, 'no printed blocks derived from the page').toBeGreaterThan(60);
    expectOrder(blocks, 'The printed document came out of order');
  });

  it('writes each experience bullet exactly once', () => {
    // The fix must not have been a duplicate-and-hide.
    const bullets = document.querySelectorAll('.resume-experience .resume-prose li');
    expect(bullets.length, 'no experience bullets found on the page').toBeGreaterThan(10);
    for (const li of bullets) {
      const needle = normalizeForOrder(li.textContent);
      const count = emitted.built.split(needle).length - 1;
      expect(count, `bullet appears ${count}× in the PDF: ${li.textContent.slice(0, 60)}`).toBe(1);
    }
  });

  it('paints a visible bullet marker for every bullet', () => {
    // #925. The markers are CSS backgrounds, and the generator rendered with
    // `printBackground: false` — which does not omit the rectangle, it paints
    // it WHITE. So this asks the rendered page whether there is ink where a
    // marker belongs, rather than asking the file whether a rectangle exists:
    // the known-bad fixture has all eleven rectangles, at the same
    // coordinates, and shows none of them.
    const expected = document.querySelectorAll('.resume-prose ul li').length;
    expect(expected, 'no bullets on the page to look for').toBeGreaterThan(0);

    const built = visibleMarkersPerPage(BUILT_PDF);
    expect(
      built.reduce((a, b) => a + b, 0),
      `the rendered PDF shows ${built} markers for ${expected} bullets — check ` +
        `printBackground in src/integrations/resume-pdf.mjs (#925).`,
    ).toBe(expected);

    // The control.
    expect(
      visibleMarkersPerPage(KNOWN_BAD_PDF).reduce((a, b) => a + b, 0),
      'the known-bad fixture shows visible markers, so this check does not discriminate',
    ).toBe(0);
  });

  it('paints each lifecycle mark as the variant it declares', () => {
    // #944, reshaped in #957. The end-state invariant for the downloadable
    // file: the marks are inked on paper, so the four states are told apart
    // there and not only on screen.
    //
    // Two independent mechanisms produce that ink, and this asserts the
    // result rather than either one. `printBackground: true` in the generator
    // and `print-color-adjust: exact` in @media print each suffice on their
    // own — measured, by removing each in turn and rebuilding: the marks
    // survived both times, while removing `printBackground` alone took every
    // BULLET marker out (#925's failure, which has no such second mechanism).
    // So do not read this test as the guard for either property. The stylesheet
    // rule has its own assertion in § print stylesheet, where it can actually
    // fail.
    //
    // **It compares signatures, not a count, and that is what makes it
    // content-independent.** The oracle used to count marks running solid edge
    // to edge, which only SHIPPED does — so the assertion could only run while
    // the page carried a SHIPPED project. #948 removed the floor that made one
    // mandatory, because specs/resume.md deliberately pins no lifecycle mix and
    // calls a flip an ordinary content edit; what that left was an equality
    // that went `0 === 0` on a page with no SHIPPED entry (#957). Reading each
    // mark's own signature closes it: whatever states the page holds, every
    // mark owes the one its class declares. Drop the backgrounds and every
    // filled variant reads hollow and fails here. On a page whose marks are
    // ALREADY all hollow, dropping them changes nothing about the file, and
    // passing is then correct rather than vacuous.
    const marks = [...document.querySelectorAll('#projects .state-marker')];
    expect(
      marks.length,
      'no lifecycle marks on the page at all — the Projects kicker is gone, and ' +
        'every signature below would be missing for that reason rather than a rendering one',
    ).toBeGreaterThan(0);

    // What each variant is drawn as, keyed by the modifier `stateMarkerClass`
    // emits. PAUSED and IN PROGRESS share the bare outline by design, and a
    // status with no modifier falls through to the same outline — so the map is
    // over the four MARKS, and every modifier the vocabulary can emit has to
    // land in it. A fifth variant with a fill of its own would otherwise be
    // silently expected to look hollow.
    const SIGNATURE = {
      shipped: 'solid',
      archived: 'cored',
      experiment: 'half',
      paused: 'hollow',
      'in-progress': 'hollow',
    };
    expect(
      Object.values(STATUS_MARKER).filter((modifier) => !(modifier in SIGNATURE)),
      'a lifecycle modifier has no expected mark signature — see src/lib/lifecycle-marker.ts',
    ).toEqual([]);

    const declared = marks.map((el) => {
      const modifier = [...el.classList]
        .find((c) => c.startsWith('state-marker--'))
        ?.replace('state-marker--', '');
      return modifier ? SIGNATURE[modifier] : 'hollow';
    });

    expect(
      lifecycleMarkSignaturesPerPage(BUILT_PDF).flat(),
      `the rendered PDF does not paint the marks the page declares — check both ` +
        `printBackground in src/integrations/resume-pdf.mjs and print-color-adjust on the ` +
        `lifecycle mark in @media print (#944)`,
    ).toEqual(declared);

    // The control. The fixture predates the kicker entirely, so a classifier
    // that fired on anything mark-shaped — a bullet, a glyph, a rule — would
    // light up here. It is the same control the count had, and it still only
    // proves the oracle does not over-report; that the oracle can FAIL is
    // established by the § print stylesheet assertions on the declarations it
    // reads, and was verified directly by reverting each variant's fill in turn
    // and watching this comparison fail on that variant alone (#957).
    expect(
      lifecycleMarkSignaturesPerPage(KNOWN_BAD_PDF).flat(),
      'the known-bad fixture reports lifecycle marks it does not contain, so this ' +
        'check does not discriminate',
    ).toEqual([]);
  });

  it('still lands on three pages', () => {
    // specs/resume.md § Print targets three balanced pages, calibrated in
    // #420. Paint order is not supposed to move a single line.
    expect(
      pdfPageCount(BUILT_PDF),
      'the résumé PDF is no longer three pages — see specs/resume.md § Print',
    ).toBe(3);
  });
});

/**
 * Header action row (#703), the Lucide download glyph (#704), and the
 * end-of-page availability CTA (#702).
 *
 * The through-line for all three is that none of them may reach paper. The
 * downloadable PDF is rendered from this page's own `@media print` cascade
 * (`emulateMedia({ media: 'print' })` in src/integrations/resume-pdf.mjs), so
 * a screen-only affordance is screen-only in the PDF too — but only as long
 * as the print hide list keeps up with the markup. These assert the file, not
 * the intent.
 */
describe('Resume — contact actions', () => {
  const CAL_URL = 'https://cal.com/nathanpayne';
  const BOOKING_HOST = new URL(CAL_URL).host;
  /** Parsed host of a URL, or '' for a non-URL (mailto:, a relative path). */
  function hostOf(url) {
    try {
      return new URL(url).host;
    } catch {
      return '';
    }
  }
  // Distinguishes the two action mailtos from the header contact line's bare
  // `mailto:hire@nathanpayne.com`, which is content and does print.
  const ACTION_SUBJECT = 'subject=';

  beforeEach(() => {
    setupDOM(readDist('resume/index.html'));
  });

  describe('header action row', () => {
    it('renders exactly three actions, in order, under the contact block', () => {
      const header = document.querySelector('.resume-canvas-header');
      const actions = Array.from(header.querySelectorAll('.resume-actions .resume-action'));
      expect(actions.map((a) => a.textContent.replace(/\s+/g, ' ').trim())).toEqual([
        'Download PDF',
        'Get in touch',
        'Book a time',
      ]);
      const contact = header.querySelector('.resume-contact--profiles');
      expect(
        contact.compareDocumentPosition(actions[0]) & Node.DOCUMENT_POSITION_FOLLOWING,
        'the action row should follow the contact block',
      ).toBeTruthy();
    });

    it('points the two new actions at a mailto and the booking page', () => {
      const [, email, booking] = Array.from(document.querySelectorAll('.resume-action'));
      expect(email.getAttribute('href')).toMatch(/^mailto:[^@]+@[^?]+\?subject=/);
      expect(booking.getAttribute('href')).toBe(CAL_URL);
      // External link convention (docs/agents/code-modification-rules.md).
      expect(booking.getAttribute('target')).toBe('_blank');
      expect(booking.getAttribute('rel')).toBe('noopener');
    });

    it('gives every action a decorative icon and an accessible text name', () => {
      for (const action of document.querySelectorAll('.resume-action')) {
        const icon = action.querySelector('svg.contact-icon');
        expect(icon, `no .contact-icon in "${action.textContent.trim()}"`).not.toBeNull();
        expect(icon.getAttribute('aria-hidden'), 'the glyph must stay decorative').toBe('true');
        expect(
          action.textContent.trim().length,
          'the link text is the accessible name',
        ).toBeGreaterThan(0);
      }
    });
  });

  describe('Lucide glyph provenance', () => {
    // Source-level, not DOM-level: the point of #704 is that the committed
    // path data is byte-identical to upstream, so a drift check is a string
    // comparison. Upstream:
    //   lucide-icons/lucide@main/icons/{download,calendar}.svg
    const ICON_SRC = readFileSync(
      resolve(__dirname, '../src/components/resume/ContactIcon.astro'),
      'utf-8',
    );

    /**
     * The subpath elements of one named glyph, normalized to `tag attrs` so a
     * mismatch reports which subpath drifted rather than a whole-SVG diff.
     */
    function subpathsFor(name) {
      const start = ICON_SRC.indexOf(`{name === '${name}' &&`);
      expect(start, `no '${name}' case in ContactIcon.astro`).toBeGreaterThan(-1);
      const block = ICON_SRC.slice(start, ICON_SRC.indexOf('</svg>', start));
      return [...block.matchAll(/<(path|rect|circle)\b([^>]*)>/g)].map(
        (m) => `${m[1]}${m[2].replace(/\s+/g, ' ').trimEnd()}`,
      );
    }

    it('carries Lucide download verbatim', () => {
      expect(subpathsFor('download')).toEqual([
        'path d="M12 15V3"',
        'path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"',
        'path d="m7 10 5 5 5-5"',
      ]);
    });

    it('carries Lucide calendar verbatim', () => {
      expect(subpathsFor('calendar')).toEqual([
        'path d="M8 2v3"',
        'path d="M16 2v3"',
        'rect x="3" y="3" width="18" height="18" rx="2"',
        'path d="M3 9h18"',
      ]);
    });
  });

  describe('end-of-page availability CTA', () => {
    it('closes the content column, after the Writing section', () => {
      const content = document.querySelector('.resume-canvas-content');
      const cta = content.querySelector('.resume-cta');
      expect(cta, 'no .resume-cta in the content column').not.toBeNull();
      expect(content.lastElementChild, '.resume-cta should close the column').toBe(cta);
      const writing = content.querySelector('#writing');
      expect(
        writing.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING,
        'the CTA should follow the Writing section',
      ).toBeTruthy();
    });

    it('is ruled off from the Writing section above it', () => {
      // The card sat flush under the essay list and read as an orphan. The
      // divider is a ::before rather than a border-top because the card's own
      // `border` already draws its box — a border-top would thicken that edge
      // instead of ruling off the space above it.
      //
      // Geometry is asserted, not just the color: a rule that is present but
      // mis-offset is the actual regression to fear here, and it would look
      // fine in a diff. Each declaration is matched independently because the
      // minifier reorders them (`position` migrates to the end) and collapses
      // `::before` to `:before`.
      const astroDir = resolve(DIST, '_astro');
      const css = readdirSync(astroDir)
        .filter((f) => f.endsWith('.css'))
        .map((f) => readFileSync(join(astroDir, f), 'utf-8'))
        .join('\n');
      const body = css.match(/\.resume-cta::?before[^{]*\{([^}]*)\}/)?.[1];
      expect(
        body,
        '.resume-cta has no ::before divider — the CTA will read as an orphan ' +
          'hanging off the Writing essay list.',
      ).toBeTruthy();
      const decls = body.replace(/\s+/g, ' ');
      for (const [label, pattern] of [
        ['a 1px hairline in the divider color', /border-top: ?1px solid var\(--rule\)/],
        ['absolute positioning, so the rule sits in the margin', /position: ?absolute/],
        ['the rule 1.6rem above the card, matching the section rhythm', /top: ?-1\.6rem/],
        // var(--line), never a literal 9px: the token drops to 6px below the
        // stack breakpoint, and a hard-coded value would leave the hairline
        // short of the section dividers on mobile.
        ['a left inset of one grid line', /left: ?calc\( ?-1 ?\* ?var\(--line\) ?\)/],
        ['a right inset over the 1px border', /right: ?-1px/],
      ]) {
        expect(decls, `.resume-cta::before is missing ${label}`).toMatch(pattern);
      }
    });

    it('is a sibling of the sections, not a section — no id, no ToC entry', () => {
      const cta = document.querySelector('.resume-cta');
      expect(cta.tagName).toBe('ASIDE');
      expect(cta.hasAttribute('id'), 'the CTA must not claim a ToC anchor').toBe(false);
      const tocHrefs = Array.from(document.querySelectorAll('.resume-canvas-toc-list a')).map((a) =>
        a.getAttribute('href'),
      );
      expect(tocHrefs).not.toContain('#cta');
    });

    it('offers exactly two links and never self-links back to /resume/', () => {
      const links = Array.from(document.querySelectorAll('.resume-cta a'));
      expect(links.map((a) => a.textContent.replace(/\s+/g, ' ').replace(/→/g, '').trim())).toEqual(
        ['Get in touch', 'Book a time'],
      );
      // The blog's version of this block carries a Résumé link (#622). On the
      // résumé itself that link is a loop, and dropping it is the whole point
      // of #702 — assert it stays dropped.
      for (const a of links) {
        expect(a.getAttribute('href'), 'the CTA must not link back to /resume/').not.toMatch(
          /\/resume\/?$/,
        );
      }
    });
  });

  describe('none of it reaches paper', () => {
    it('hides .resume-cta inside @media print', () => {
      // Was a local `printBlocks()` that sliced each stylesheet from its FIRST
      // `@media print` to end of file. #950 gave this file an imported
      // `printBlocks(css)`, so the two shared a name and disagreed about
      // arity; the shared `builtPrintBlocks()` is what the local one was
      // approximating, and it returns balanced blocks rather than a tail that
      // also carries every screen rule written after the first print block.
      const blocks = builtPrintBlocks();
      expect(blocks.length, 'no emitted stylesheet has an @media print block').toBeGreaterThan(0);
      expect(
        blocks.some((b) => /\.resume-cta[^{]*\{[^}]*display:\s*none/.test(b)),
        '.resume-cta is not hidden inside @media print — the availability CTA ' +
          'will print, and will land in Nathan-Payne-Resume.pdf (#702).',
      ).toBe(true);
    });

    it('leaves no booking or action-mailto link annotation in the generated PDF', () => {
      // The PDF's text is inside compressed content streams, but Chromium
      // writes link annotations in the clear — so the cheapest proof that a
      // screen-only affordance stayed off paper is that its href never became
      // a /URI. See the 'link annotations' block above for the same technique.
      const raw = readFileSync(resolve(DIST, 'Nathan-Payne-Resume.pdf')).toString('latin1');
      const uris = [...raw.matchAll(/\/URI\s*\(([^)]*)\)/g)].map((m) => m[1]);
      expect(uris.length, 'no /URI annotations found in the PDF').toBeGreaterThan(0);
      expect(
        // Host equality, not a substring test: `u.includes('cal.com')` also
        // matches https://cal.com.evil.example/ and https://evil.example/cal.com,
        // which CodeQL flags as js/incomplete-url-substring-sanitization.
        uris.filter((u) => hostOf(u) === BOOKING_HOST),
        'the booking link reached the PDF — check the @media print hide list',
      ).toEqual([]);
      expect(
        uris.filter((u) => u.startsWith('mailto:') && u.includes(ACTION_SUBJECT)),
        'an action mailto reached the PDF; only the bare contact-line address ' + 'should print',
      ).toEqual([]);
      // Positive control: the contact line's own address must still print, or
      // this test would pass on a PDF that lost the contact block entirely.
      expect(
        uris.some((u) => u.startsWith('mailto:') && !u.includes(ACTION_SUBJECT)),
        'the header contact mailto is missing from the PDF',
      ).toBe(true);
    });
  });
});

/**
 * Top-of-resume skim (#617) and pre-2016 density (#618).
 */
describe('Resume — skim weighting', () => {
  beforeEach(() => {
    setupDOM(readDist('resume/index.html'));
  });

  it('leads with a single job title that matches the JSON-LD jobTitle', () => {
    const visible = document.querySelector('.resume-title').textContent.trim();
    expect(visible).toBe('Senior Platform Product Manager');
    // No stacked facets joined by a dash — one title, not three (#617).
    expect(visible).not.toMatch(/[–—-]/);

    const person = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
      .flatMap((s) => {
        try {
          const ld = JSON.parse(s.textContent);
          return Array.isArray(ld['@graph']) ? ld['@graph'] : [ld];
        } catch {
          return [];
        }
      })
      .find((e) => e?.['@type'] === 'Person');
    expect(person?.jobTitle, 'visible title must match the JSON-LD jobTitle').toBe(visible);
  });

  it('keeps the summary to 3–4 lines (~55–75 words), scale and AI focus up front', () => {
    const summary = document.querySelector('.resume-summary .resume-prose');
    const text = summary.textContent.replace(/\s+/g, ' ').trim();
    const words = text.split(' ').filter(Boolean).length;
    expect(words, `summary is ${words} words; target 55–75`).toBeGreaterThanOrEqual(55);
    expect(words, `summary is ${words} words; target 55–75`).toBeLessThanOrEqual(75);
    // Both anchors land early, not in a trailing sentence.
    const head = text.split(' ').slice(0, 45).join(' ');
    expect(head, 'Disney scale should be in the opening lines').toContain(
      'Disney+, Hulu, and ESPN',
    );
    expect(head.toLowerCase(), 'the AI-augmented focus should be in the opening lines').toContain(
      'ai-augmented',
    );
  });

  it('renders the pre-2016 roles as compact entries, with tenure intact', () => {
    const entries = Array.from(document.querySelectorAll('.resume-experience .resume-entry'));
    const compact = entries.filter((e) => e.classList.contains('resume-entry--compact'));
    // AJ+, Current TV, CNN — the three flagged in #618. Disney NCP, Disney
    // Streaming, and BAMTech keep full weight.
    expect(compact.length).toBe(3);

    // specs/resume.md § Experience density advertises three guarantees, so
    // check all three PER ENTRY. An earlier version joined the three entries
    // and asserted one date range across the lot, which passed while AJ+ or
    // Current TV lost its years; and it measured `textContent`, which
    // includes the company, role, location and dates, so a body replaced with
    // filler cleared the length floor on the heading alone (#735, Codex).
    const byCompany = Object.fromEntries(
      compact.map((entry) => [
        entry.querySelector('.resume-entry__title').textContent.split('–').pop().trim(),
        entry,
      ]),
    );

    // 1. Every role keeps its full date range — each one, not the set.
    for (const [company, range] of [
      ['AJ+', '2013–2016'],
      ['Current TV', '2012–2013'],
      ['CNN', '2002–2012'],
    ]) {
      const entry = byCompany[company];
      expect(entry, `no compact entry for ${company}`).toBeTruthy();
      expect(
        entry.querySelector('.resume-entry__meta').textContent,
        `${company}: date range missing from the meta line`,
      ).toContain(range);
    }

    // 2. Each entry still carries its actual accomplishment. A length floor
    //    alone is not this guarantee: 121 characters of generic responsibility
    //    clears it (Codex, #916). "A recognizable accomplishment" cannot be
    //    asserted syntactically, so the enforceable version is the specific
    //    fact specs/resume.md says each compact role retains — which is what
    //    the spec actually promises, and is closed rather than open-ended.
    //
    //    Pin the whole distinguishing phrase, not the striking token in it:
    //    `$335K` alone passes a body that says AJ+ merely *managed* a $335K
    //    budget, which drops the guaranteed fact (annual vendor savings) while
    //    keeping the number (Codex, #916).
    for (const [company, marker] of [
      ['AJ+', '$335K in annual vendor savings'],
      ['Current TV', 'launching three nightly shows within 30 days'],
      ['CNN', 'Conceptualized and led the CNN Magic Wall'],
    ]) {
      const prose = byCompany[company].querySelector('.resume-prose');
      expect(prose, `${company}: compact entry has no .resume-prose body`).toBeTruthy();
      const text = prose.textContent.replace(/\s+/g, ' ').trim();
      expect(text, `${company}: compact body dropped its named accomplishment`).toContain(marker);
      // The floor stays as a second signal: it catches a body reduced to the
      // marker alone, which the substring check would happily accept.
      expect(
        text.length,
        `${company}: compact body is a dated one-liner, not an accomplishment`,
      ).toBeGreaterThan(120);
    }
  });

  it('keeps the CNN Magic Wall on the page', () => {
    expect(document.querySelector('.resume-experience').textContent).toContain('Magic Wall');
  });
});
