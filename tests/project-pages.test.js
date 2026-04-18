import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

// Smoke tests for the content-collection-driven project detail pages.
// See specs/project-pages.md and issue #156.
//
// These tests read from the already-built dist/ directory — `npm test`
// runs `astro build && vitest run`, so dist/ is always fresh.

const DIST = resolve(__dirname, '../dist');
const CONTENT = resolve(__dirname, '../src/content/projects');

const projectSlugs = [
  'mergepath',
  'override',
  'device-source-of-truth',
  'friends-and-family-billing',
  'swipe-watch',
];

function readDistHtml(relativePath) {
  return readFileSync(resolve(DIST, relativePath), 'utf-8');
}

function setupDOM(rawHtml) {
  // Strip bare <script> blocks to prevent auto-execution during document.write,
  // but keep <script type="application/ld+json"> for structured-data assertions.
  const safe = rawHtml.replace(/<script>[\s\S]*?<\/script>/g, '');
  document.documentElement.innerHTML = '';
  document.write(safe);
  document.close();
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

      it('renders all four metadata labels (Domain, Format, Focus, Status)', () => {
        const labels = Array.from(document.querySelectorAll('.metadata-strip dt')).map(
          (dt) => dt.textContent.trim(),
        );
        expect(labels).toEqual(['Domain', 'Format', 'Focus', 'Status']);
      });

      it('has a <figure class="project-screenshot"> containing an <img> with src and alt', () => {
        const figure = document.querySelector('figure.project-screenshot');
        expect(figure, 'figure.project-screenshot not found').not.toBeNull();
        const img = figure.querySelector('img');
        expect(img, '<img> inside .project-screenshot not found').not.toBeNull();
        expect(img.getAttribute('src')).toBeTruthy();
        expect(img.getAttribute('alt')).toBeTruthy();
      });

      it('has a .project-copy container with an <h2>Overview</h2> heading', () => {
        const copy = document.querySelector('.project-copy');
        expect(copy, '.project-copy not found').not.toBeNull();
        const headings = Array.from(copy.querySelectorAll('h2')).map((h) =>
          h.textContent.trim(),
        );
        expect(headings).toContain('Overview');
      });

      it('renders both CTA actions (View Live Product and View on GitHub)', () => {
        const actions = Array.from(document.querySelectorAll('.project-action')).map(
          (a) => a.textContent.trim(),
        );
        expect(actions).toContain('View Live Product');
        expect(actions).toContain('View on GitHub');
      });

      it('emits a JSON-LD graph containing a SoftwareApplication entity', () => {
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
        expect(foundSoftwareApp, 'no SoftwareApplication entity in JSON-LD graph').toBe(true);
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

  it('Override, DST, and FFB use the wide screenshot variant', () => {
    const wideSlugs = ['override', 'device-source-of-truth', 'friends-and-family-billing'];
    for (const slug of wideSlugs) {
      setupDOM(readDistHtml(`projects/${slug}/index.html`));
      const figure = document.querySelector('figure.project-screenshot');
      expect(
        figure,
        `${slug}: figure.project-screenshot not found`,
      ).not.toBeNull();
      expect(
        figure.className,
        `${slug} should use project-screenshot--wide`,
      ).toContain('project-screenshot--wide');
    }
  });
});
