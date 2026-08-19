import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

// Smoke tests for the content-collection-driven /resume page.
// See specs/resume.md and issue #394.
//
// These read from the already-built dist/ directory — `npm test` runs
// `astro build && vitest run`, so dist/ is always fresh.

const DIST = resolve(__dirname, '../dist');
const CONTENT = resolve(__dirname, '../src/content');
const RESUME_HTML = resolve(DIST, 'resume/index.html');

function readDist(relativePath) {
  return readFileSync(resolve(DIST, relativePath), 'utf-8');
}

function setupDOM(rawHtml) {
  // Strip every executable <script> (bare, module, or external) to prevent
  // auto-execution during document.write, but keep
  // <script type="application/ld+json"> for the structured-data assertions.
  const safe = rawHtml.replace(
    /<script\b(?![^>]*\btype=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi,
    '',
  );
  document.documentElement.innerHTML = '';
  document.write(safe);
  document.close();
}

function countMd(dir) {
  return readdirSync(join(CONTENT, dir)).filter((f) => f.endsWith('.md')).length;
}

describe('Resume — route & build', () => {
  it('builds a static HTML file at dist/resume/index.html', () => {
    expect(existsSync(RESUME_HTML), 'missing dist/resume/index.html').toBe(true);
  });

  it('content collections have the expected file counts', () => {
    expect(countMd('experience'), 'expected 6 experience entries').toBe(6);
    expect(countMd('resume/projects'), 'expected 6 resume projects').toBe(6);
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
});

describe('Resume — page structure', () => {
  beforeEach(() => {
    setupDOM(readDist('resume/index.html'));
  });

  it('has the title "Nathan Payne | Resume"', () => {
    expect(document.querySelector('title')?.textContent).toBe('Nathan Payne | Resume');
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

  it('renders breadcrumbs (Nathan Payne / Resume) in the header', () => {
    const crumbs = document.querySelector('.resume-canvas-header .breadcrumbs');
    expect(crumbs, 'breadcrumbs missing').not.toBeNull();
    const text = crumbs.textContent.replace(/\s+/g, ' ').trim();
    expect(text).toContain('Nathan Payne');
    expect(text).toContain('Resume');
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
    // Awards is empty → AwardsSection renders nothing, so the ToC must NOT
    // list a (broken) #awards anchor and there is no <section id="awards">.
    expect(links, 'ToC should omit #awards while the collection is empty').not.toContain('#awards');
    expect(
      document.getElementById('awards'),
      'awards section should not render while empty',
    ).toBeNull();
  });

  it('renders the section <h2> titles in order; no References; Awards absent while empty', () => {
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
    // Awards collection is empty → no awards section rendered.
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

  it('renders six Projects, each with an <h3>', () => {
    const proj = document.querySelector('.resume-projects');
    expect(proj).not.toBeNull();
    expect(proj.querySelectorAll('h3.resume-entry__title').length).toBe(6);
  });

  it('opens Projects with a Built with Agents lead — tag, intro, and /projects/ index link (Writing pattern)', () => {
    const proj = document.querySelector('.resume-projects');
    expect(proj, 'projects section missing').not.toBeNull();
    const lead = proj.querySelector('.resume-projects__lead');
    expect(lead, 'projects lead missing').not.toBeNull();
    expect(lead.querySelector('strong')?.textContent).toBe('Built with Agents');
    const link = lead.querySelector('a');
    expect(link.getAttribute('href')).toBe('/projects/');
    expect(link.textContent).toContain('nathanpayne.com/projects');
    const desc = proj.querySelector('.resume-projects__desc');
    expect(desc, 'projects intro missing').not.toBeNull();
    expect(desc.textContent).toContain('systems design exercise—from first commit to deploy.');
    expect(desc.textContent).not.toContain('built with AI agents');
    // The lead precedes the first project entry.
    const firstEntry = proj.querySelector('.resume-entry');
    expect(
      lead.compareDocumentPosition(firstEntry) & Node.DOCUMENT_POSITION_FOLLOWING,
      'lead should render before the first project entry',
    ).toBeTruthy();
  });

  it('links each resume project title to its matching project page', () => {
    const proj = document.querySelector('.resume-projects');
    const links = Array.from(proj.querySelectorAll('h3.resume-entry__title a'));
    expect(links.length).toBe(6);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/projects/mergepath/',
      '/projects/matchline/',
      '/projects/device-source-of-truth/',
      '/projects/override/',
      '/projects/swipe-watch/',
      '/projects/friends-and-family-billing/',
    ]);
    expect(links.map((link) => link.textContent.trim())).toEqual([
      'Mergepath – Agent Governance Infrastructure',
      'Matchline – AI Career CRM',
      'Device Source of Truth – Partner Device Intelligence Platform',
      'Override – Broadway Financial Operating System',
      'Swipe Watch – Content Discovery Prototype',
      'Friends & Family Billing – Shared-Bill Coordination',
    ]);
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

  // Pull every balanced @media print { ... } block out of a minified
  // stylesheet. A stylesheet can carry more than one — the blog's
  // end-of-post print rules (#622) sit ahead of the resume's — so each
  // assertion below selects the block it cares about by content rather
  // than assuming the first one is the resume's.
  function printBlocks(css) {
    const blocks = [];
    let i = css.indexOf('@media print');
    while (i !== -1) {
      let depth = 0;
      const start = css.indexOf('{', i);
      for (let j = start; j < css.length; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}' && --depth === 0) {
          blocks.push(css.slice(i, j + 1));
          break;
        }
      }
      i = css.indexOf('@media print', i + 1);
    }
    return blocks;
  }

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

  it('applies the 8.5in page width only inside @media print', () => {
    // The 8.5in constraint must not appear anywhere in the base (screen) cascade.
    for (const css of cssFiles) {
      const printIdx = css.indexOf('@media print');
      const head = printIdx === -1 ? css : css.slice(0, printIdx);
      expect(/8\.5in/.test(head), '8.5in width leaked into the screen cascade').toBe(false);
    }
    const block = allPrintBlocks().find((b) => b.includes('8.5in'));
    expect(block, '8.5in print width constraint missing').toBeTruthy();
  });
});
