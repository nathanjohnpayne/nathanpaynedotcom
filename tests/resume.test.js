import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
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
import {
  pdfPagesInStreamOrder,
  pdfPageContentStreams,
  normalizeForOrder,
} from './helpers/pdf-stream-text.js';

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

  it('opens Projects with a Selected Projects lead — tag, intro, and /projects/ index link (Writing pattern)', () => {
    const proj = document.querySelector('.resume-projects');
    expect(proj, 'projects section missing').not.toBeNull();
    const lead = proj.querySelector('.resume-projects__lead');
    expect(lead, 'projects lead missing').not.toBeNull();
    expect(lead.querySelector('strong')?.textContent).toBe('Selected Projects');
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
    // surfaces cannot disagree. Plain text rather than the site's marker
    // geometry: this section prints to PDF and is parsed by applicant tracking
    // systems, where portability beats extending the visual language.
    const statuses = [...proj.querySelectorAll('.resume-entry__status')].map((s) =>
      s.textContent.replace(/[—\s]+/g, ' ').trim(),
    );
    expect(statuses.length, 'every resume project should carry a status').toBe(
      proj.querySelectorAll('.resume-entry').length,
    );
    for (const status of statuses) {
      expect(['SHIPPED', 'ARCHIVED', 'PAUSED', 'EXPERIMENT', 'IN PROGRESS']).toContain(status);
    }
    expect(new Set(statuses).size, 'expected mixed lifecycle states').toBeGreaterThan(1);

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
    expect(links.length).toBe(7);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/projects/five-across/',
      '/projects/mergepath/',
      '/projects/override/',
      '/projects/device-source-of-truth/',
      '/projects/matchline/',
      '/projects/swipe-watch/',
      '/projects/friends-and-family-billing/',
    ]);
    expect(links.map((link) => link.textContent.trim())).toEqual([
      'Five Across – Live Multiplayer Social Bingo Platform',
      'Mergepath – Agent Governance Infrastructure',
      'Override – Broadway Financial Operating System',
      'Device Source of Truth – Partner Device Intelligence Platform',
      'Matchline – AI Career CRM',
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
  function printBlockRanges(css) {
    const ranges = [];
    let i = css.indexOf('@media print');
    while (i !== -1) {
      let depth = 0;
      const start = css.indexOf('{', i);
      for (let j = start; j < css.length; j++) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}' && --depth === 0) {
          ranges.push([i, j + 1]);
          break;
        }
      }
      i = css.indexOf('@media print', i + 1);
    }
    return ranges;
  }

  function printBlocks(css) {
    return printBlockRanges(css).map(([from, to]) => css.slice(from, to));
  }

  /**
   * The stylesheet with every @media print block cut out — i.e. everything the
   * screen cascade actually sees. Slicing at the FIRST print block instead
   * would silently stop guarding every line after it, which is what happened
   * when #622 added a second print block ahead of the resume's.
   */
  function withoutPrintBlocks(css) {
    let out = '';
    let cursor = 0;
    for (const [from, to] of printBlockRanges(css)) {
      out += css.slice(cursor, from);
      cursor = to;
    }
    return out + css.slice(cursor);
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

  it('does not append the URL after project titles in print', () => {
    // The print sheet appends ' (' attr(href) ')' to descriptive-text links
    // matching a[href^='http']. Project titles were exempt only by accident —
    // their href was root-relative, so it never matched. #683 absolutizes
    // every href before the PDF is written, which dragged all seven titles
    // into that selector and printed a redundant /projects/<slug>/ after each
    // name. The suppression is now explicit; this keeps it that way.
    const astroDir = resolve(DIST, '_astro');
    const withPrint = readdirSync(astroDir)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(join(astroDir, f), 'utf-8'))
      .filter((css) => css.includes('@media print'));
    const suppressed = withPrint.some((css) => {
      const printBlock = css.slice(css.indexOf('@media print'));
      // The selector must appear in a rule whose content resolves to empty.
      // Matched loosely against BUILT css: the minifier drops the quotes in
      // [href^=http] and collapses ::after to :after, and the selector is one
      // of several grouped before the shared { content: '' } block.
      return /\.resume-entry__title a\[href\^=['"]?http['"]?\]::?after[^{]*\{[^}]*content:\s*(''|"")/.test(
        printBlock,
      );
    });
    expect(
      suppressed,
      `.resume-entry__title links are not exempted from the a[href^='http']::after ` +
        `URL suffix in @media print — every project title will print its own ` +
        `/projects/<slug>/ URL after the name (#683).`,
    ).toBe(true);
  });
});

/**
 * PDF reading order (#923).
 *
 * A PDF carries two orders and they are allowed to disagree. The visual one
 * is reconstructed from glyph coordinates — it is what the page image shows,
 * and it was never wrong here. The stream one is the sequence the text is
 * written in, and it is what an ATS parser, assistive tech, `pdftotext -raw`,
 * and copy-paste all read.
 *
 * Chromium writes each printed page's text in PAINT order, so a CSS rule that
 * changes paint order reorders the document for those readers while leaving
 * every pixel identical. `.resume-prose li` used to carry `position: relative`
 * (it was the containing block for the absolutely-positioned bullet square),
 * which puts a list item in step 8 of the painting algorithm — after every
 * non-positioned block and inline on the page. Every bullet was therefore
 * emitted after all of its page's other text. On page 1 that is invisible,
 * because the Disney NCP bullets end the page anyway; on page 2 it moved the
 * four Disney Streaming 2018–2021 bullets past six sections, so they read as
 * belonging to the Projects section.
 *
 * These assertions therefore have to read the stream, not the picture — see
 * tests/helpers/pdf-stream-text.js. They were built against the shipped
 * pre-fix PDF and fail on it, which is the only evidence that they can fail
 * at all.
 */
describe('Resume — PDF reading order', () => {
  const PDF_PATH = resolve(DIST, 'Nathan-Payne-Resume.pdf');

  /** Content-stream text of the whole PDF, normalized for order comparison. */
  let stream;
  /** Per-page content-stream text, for the pagination assertion. */
  let pages;

  /**
   * The same text as `stream`, split at the emitted line boundaries, with each
   * line's start offset into `stream`. `normalizeForOrder` strips whitespace
   * including the newlines, so the concatenation of the normalized lines IS
   * `stream` — which lets a landmark be matched against a WHOLE line rather
   * than as a substring anywhere.
   */
  let lines;

  beforeAll(() => {
    pages = pdfPagesInStreamOrder(readFileSync(PDF_PATH));
    stream = normalizeForOrder(pages.join('\n'));
    lines = [];
    let offset = 0;
    for (const raw of pages.join('\n').split('\n')) {
      const text = normalizeForOrder(raw);
      if (text.length === 0) continue;
      lines.push({ text, offset });
      offset += text.length;
    }
  });

  beforeEach(() => {
    setupDOM(readDist('resume/index.html'));
  });

  /**
   * Walk `landmarks` through the stream, each one required at or after the
   * end of the previous match. Returns the first landmark that is missing or
   * out of sequence, or null when the whole run is in order.
   *
   * A landmark marked `exact` must match a COMPLETE emitted line rather than
   * appear as a substring. Section headings need that: searching for
   * `Projects` as a substring also matches the `Selected Projects` lead that
   * follows it, so the assertion passed whether or not the heading itself was
   * there — establishing neither its presence nor its position (Codex, #924).
   * Prose landmarks stay substring matches, since a wrapped paragraph or
   * bullet spans several emitted lines.
   */
  function firstOutOfOrder(landmarks) {
    let cursor = 0;
    for (const { label, text, exact } of landmarks) {
      const needle = normalizeForOrder(text);
      let at;
      if (exact) {
        const line = lines.find((l) => l.offset >= cursor && l.text === needle);
        at = line ? line.offset : -1;
      } else {
        at = stream.indexOf(needle, cursor);
      }
      if (at < 0) {
        const anywhere = exact ? lines.some((l) => l.text === needle) : stream.indexOf(needle) >= 0;
        return {
          label,
          reason: anywhere ? 'appears earlier than it should' : 'missing from the PDF entirely',
        };
      }
      cursor = at + needle.length;
    }
    return null;
  }

  /**
   * Every print-visible piece of the Experience section, in DOM order: each
   * role title followed by that role's summary paragraphs and bullets.
   *
   * Shared by the within-Experience test and the whole-page section-order
   * test. Deriving it in only the first of those was itself a blind spot: a
   * print rule that positioned every `.resume-entry` would move the whole
   * section after Education, Projects and Writing while preserving the order
   * *within* it — so the dedicated test passed, and the global one passed too
   * because it never placed any experience content between the Experience and
   * Education headings (Codex, #924).
   */
  function experienceLandmarks() {
    const marks = [];
    for (const entry of document.querySelectorAll('.resume-experience .resume-entry')) {
      const title = entry.querySelector('.resume-entry__title').textContent.trim();
      marks.push({ label: `role "${title}"`, text: title });
      // Paragraphs AND bullets, in document order. Recording only the title
      // and the `<li>`s left every role summary except Disney's — which the
      // pinned test covers — free to detach from its entry undetected
      // (Codex, #924), which is the exact defect this PR is about. A summary
      // is not a lesser part of a role than its bullets.
      for (const el of entry.querySelectorAll('.resume-prose p, .resume-prose li')) {
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        const kind = el.tagName === 'P' ? 'summary' : 'bullet';
        marks.push({ label: `${kind} under "${title}": ${text.slice(0, 48)}…`, text });
      }
    }
    return marks;
  }

  it('extracts real text from the PDF', () => {
    // Positive control. Every assertion below is "A comes before B", and a
    // reader that returned nothing would satisfy none of them for the right
    // reason — it would throw, or vacuously report everything missing. Prove
    // the extraction works before trusting a single ordering result.
    expect(pages.length, 'no pages extracted from the PDF').toBeGreaterThan(0);
    expect(stream.length, 'the PDF extracted as (almost) no text').toBeGreaterThan(5000);
    expect(stream, 'a known line of the resume is missing from the extracted text').toContain(
      normalizeForOrder('Conceptualized and led the CNN Magic Wall'),
    );
  });

  it('writes the Disney Streaming 2018–2021 bullets with their own role', () => {
    // The reported symptom, stated exactly: the role summary is followed by
    // its four bullets, and the next role follows all four — not the other
    // way round, with the bullets stranded two sections later next to a
    // project. Pinned as literal copy rather than derived from the DOM, so
    // this reads as the bug report it came from.
    const outOfOrder = firstOutOfOrder([
      {
        label: 'Disney Streaming role title',
        text: 'Senior Technical Project Manager, Lead – Disney Streaming',
      },
      {
        label: 'Disney Streaming role summary',
        text: 'Led front-end engineering teams that built and launched Disney+ across connected devices.',
      },
      {
        label: 'bullet 1',
        text: 'Brought Disney+ from concept to launch across living-room platforms',
      },
      {
        label: 'bullet 2',
        text: 'Led PlayStation prototyping that produced the first-to-launch living-room Disney+ experience.',
      },
      { label: 'bullet 3', text: 'Rebuilt the Disney+ app for MVPD set-top boxes' },
      { label: 'bullet 4', text: 'Led Hulu through its PlayStation 5 launch.' },
      {
        label: 'the next role (MLB Advanced Media)',
        text: 'Technical Project Manager – MLB Advanced Media / BAMTech Media',
      },
    ]);
    expect(
      outOfOrder,
      outOfOrder &&
        `${outOfOrder.label} ${outOfOrder.reason} in the PDF's content stream. The Disney ` +
          `Streaming bullets have come away from their role — check for a positioned ` +
          `element inside the printed content, which paints (and so is written) after ` +
          `everything non-positioned on its page (#923).`,
    ).toBeNull();
  });

  it('writes every experience role and its bullets in the order the page has them', () => {
    // The general form of the same guarantee, derived from the built page
    // rather than pinned: whatever the resume says, the PDF must say it in
    // that order. This is what keeps the fix from being specific to one role.
    const landmarks = experienceLandmarks();
    // Guard the derivation itself: an empty or single-item list would make
    // the ordering check pass without checking anything.
    expect(landmarks.length, 'no experience landmarks derived from the page').toBeGreaterThan(10);

    const outOfOrder = firstOutOfOrder(landmarks);
    expect(
      outOfOrder,
      outOfOrder &&
        `${outOfOrder.label} ${outOfOrder.reason}. The PDF's content stream must follow ` +
          `the same order as /resume/ (#923).`,
    ).toBeNull();
  });

  it('writes the sections in the order the page composes them', () => {
    // specs/resume.md fixes the section order; the print sheet hides some
    // chrome but reorders nothing, so the printed sections must appear in
    // that same sequence with the Projects entries nested in their own order.
    // All seven printed sections. Writing sits AFTER the project entries, so it
    // is appended below rather than listed here — leaving it out entirely let a
    // Writing heading that moved above Projects pass (Codex, #924).
    const sections = ['Summary', 'Skills', 'Experience', 'Education', 'Certifications', 'Projects'];
    // Every print-visible part of each project entry, in DOM order — not the
    // titles alone. Walking titles only left a project's tech line, URL or
    // description free to detach and be painted after Writing while the test
    // still passed, which is the same defect for Projects that the role
    // summaries had for Experience (Codex, #924).
    const projectParts = Array.from(document.querySelectorAll('.resume-projects .resume-entry'))
      .flatMap((entry) =>
        Array.from(
          entry.querySelectorAll(
            '.resume-entry__title, .resume-entry__tech, .resume-entry__link, .resume-prose p',
          ),
        ),
      )
      .map((el) => el.textContent.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    expect(projectParts.length, 'no project content found on the page').toBeGreaterThan(6);

    // Section headings alone would not notice a whole section moving: the
    // Experience entries could all paint after Writing, in order, with the
    // headings untouched. Each section's own content is therefore threaded
    // between its heading and the next one.
    const [beforeExperience, afterExperience] = [sections.slice(0, 3), sections.slice(3)];
    const outOfOrder = firstOutOfOrder([
      ...beforeExperience.map((text) => ({ label: `section "${text}"`, text, exact: true })),
      ...experienceLandmarks(),
      ...afterExperience.map((text) => ({ label: `section "${text}"`, text, exact: true })),
      ...projectParts.map((text) => ({ label: `project content "${text.slice(0, 48)}…"`, text })),
      // Writing collapses to its lead line in print, but the heading prints.
      { label: 'section "Writing"', text: 'Writing', exact: true },
      { label: 'the Writing lead', text: 'The AI-Augmented PM' },
    ]);
    expect(
      outOfOrder,
      outOfOrder && `${outOfOrder.label} ${outOfOrder.reason} in the PDF's content stream (#923).`,
    ).toBeNull();
  });

  it('writes each bullet exactly once', () => {
    // The fix must not have been a duplicate-and-hide. Counting occurrences
    // is the cheap proof that the bullets moved rather than multiplied.
    const items = document.querySelectorAll('.resume-experience .resume-prose li');
    // Without this the loop below makes every assertion, so an empty NodeList
    // passes the test having checked nothing (CodeRabbit, #924) — the same
    // vacuous-pass shape the positive-control test above exists to prevent.
    expect(items.length, 'no experience bullets found on the page').toBeGreaterThan(0);
    for (const li of items) {
      const needle = normalizeForOrder(li.textContent);
      const count = stream.split(needle).length - 1;
      expect(count, `bullet appears ${count}× in the PDF: ${li.textContent.slice(0, 60)}`).toBe(1);
    }
  });

  it('paints a visible bullet marker into the PDF for every bullet', () => {
    // #925. The markers are CSS backgrounds on `.resume-prose ul li::before`,
    // and the generator rendered with `printBackground: false` — Chrome's
    // "Background graphics" unchecked. Every printed bullet carried its indent
    // and nothing in it, and the print sheet's `background: #000 !important`
    // for them had never once had an effect.
    //
    // Counting the squares is NOT enough, and that is the whole subtlety of
    // this test: `printBackground: false` does not omit the rectangle, it
    // paints it WHITE. The pre-fix file has all eleven `6 6 re f` operators at
    // exactly the coordinates the fixed one does, each preceded by `1 1 1 rg`.
    // A presence check passes on it. So track the fill colour in force at each
    // square and require black.
    const squares = [];
    for (const stream of pdfPageContentStreams(readFileSync(PDF_PATH))) {
      // `rg` sets an RGB fill, `g` a grayscale one; `re … f` fills a rect.
      // Uppercase `RG`/`G` are stroke colours and deliberately not tracked.
      // `q` saves the graphics state and `Q` restores it, and the fill colour
      // is part of that state. Tracking colour linearly meant a rectangle
      // painted after a pop was judged by the popped scope's colour — which
      // in the direction that matters could report a genuinely white marker
      // as dark, letting the #925 regression through the test written to
      // catch it (Codex, #926).
      const ops =
        /(?:^|\s)([qQ])(?=\s|$)|([\d.]+) ([\d.]+) ([\d.]+) rg|(?:^|\s)([\d.]+) g(?![a-zA-Z])|[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+) re\s+f(?![a-zA-Z*])/g;
      let fill = null;
      const fillStack = [];
      let op;
      while ((op = ops.exec(stream)) !== null) {
        if (op[1] === 'q') fillStack.push(fill);
        else if (op[1] === 'Q') {
          if (fillStack.length > 0) fill = fillStack.pop();
        } else if (op[2] !== undefined) fill = [op[2], op[3], op[4]].map(Number);
        else if (op[5] !== undefined) fill = [Number(op[5])];
        else {
          const [w, h] = [Number(op[6]), Number(op[7])];
          // Small and near-square: not the page background (~701x941) and not
          // a link underline (1 unit tall).
          if (w > 0 && w <= 12 && h > 0 && h <= 12 && Math.abs(w - h) <= 1) {
            squares.push({ w, h, visible: fill !== null && fill.every((c) => c < 0.5) });
          }
        }
      }
    }

    const bullets = document.querySelectorAll('.resume-prose ul li').length;
    expect(bullets, 'no bullets on the page to look for').toBeGreaterThan(0);
    expect(squares.length, `the PDF has no marker rectangle for every bullet`).toBe(bullets);
    expect(
      squares.filter((sq) => !sq.visible).length,
      `${squares.filter((sq) => !sq.visible).length} of ${squares.length} bullet markers are ` +
        `painted in a light fill, so they do not show on paper — check printBackground in ` +
        `src/integrations/resume-pdf.mjs (#925).`,
    ).toBe(0);
  });

  it('still lands on three pages', () => {
    // specs/resume.md § Print targets three balanced pages, calibrated in
    // #420. Paint order is not supposed to move a single line, so a change in
    // page count alongside a reading-order fix means something else moved.
    expect(
      pages.length,
      'the resume PDF is no longer three pages — see specs/resume.md § Print',
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
    /** Every emitted stylesheet's `@media print` block, from the rule onward. */
    function printBlocks() {
      const astroDir = resolve(DIST, '_astro');
      return readdirSync(astroDir)
        .filter((f) => f.endsWith('.css'))
        .map((f) => readFileSync(join(astroDir, f), 'utf-8'))
        .filter((css) => css.includes('@media print'))
        .map((css) => css.slice(css.indexOf('@media print')));
    }

    it('hides .resume-cta inside @media print', () => {
      const blocks = printBlocks();
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
