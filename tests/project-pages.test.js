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
  'matchline',
  'override',
  'device-source-of-truth',
  'friends-and-family-billing',
  'swipe-watch',
];

// Projects without a deployed live URL — the "View Live Product" CTA
// is suppressed on the detail page, the project card, and the homepage
// Builds section. The SoftwareApplication JSON-LD entity is also
// dropped on these pages (no `url:` to populate).
const noLiveUrlSlugs = ['matchline'];

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

      it('renders all four metadata labels (Topics, Format, Focus, Status)', () => {
        const labels = Array.from(document.querySelectorAll('.metadata-strip dt')).map(
          (dt) => dt.textContent.trim(),
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
        const headings = Array.from(copy.querySelectorAll('h2')).map((h) =>
          h.textContent.trim(),
        );
        expect(headings).toContain('Overview');
      });

      it('renders the appropriate CTA actions for the project', () => {
        const actions = Array.from(document.querySelectorAll('.project-action')).map(
          (a) => a.textContent.trim(),
        );
        // The "Back to Projects" / "Back to Homepage" footer actions also
        // share the .project-action class, so filter to the hero CTAs by
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
          expect(foundSoftwareApp, 'pre-launch project should NOT emit SoftwareApplication').toBe(false);
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
    expect(player.getAttribute('src')).toBe('https://stream.mux.com/wNCRY97981o2uDAJrJ3ExPeK379yldRRFJgUIgSYz00k.m3u8');
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
    expect(poster.getAttribute('src')).toBe('https://image.mux.com/wNCRY97981o2uDAJrJ3ExPeK379yldRRFJgUIgSYz00k/thumbnail.jpg?width=1280&time=0');
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
    expect(muxScript).toMatch(/querySelector\((['"])mux-background-video\1\)/);
    expect(muxScript).toContain('shadowRoot?.querySelector("video")');
    expect(muxScript).toContain('setTimeout');
    expect(muxScript).toContain('dataset.playbackState="fallback"');
    expect(muxScript).toContain('dataset.playbackState="playing"');
    expect(muxScript).toContain('.play()');
    expect(muxScript).toContain('currentTime>0');
    expect(html).not.toContain('PUBLIC_MUX_ENV_KEY');
    // #265 regression: when the mux-embed script tag already exists in a
    // settled (loaded/error) state, the loader must short-circuit to
    // Promise.resolve() instead of re-attaching listeners that will never
    // fire. Encoded via the dataset.muxEmbedStatus sentinel.
    expect(muxScript).toMatch(/muxEmbedStatus===['"]loaded['"]/);
    expect(muxScript).toMatch(/muxEmbedStatus===['"]error['"]/);
    expect(muxScript).toContain('Promise.resolve()');
  });

  it('only Swipe Watch opts into the Mux hero today', () => {
    for (const slug of projectSlugs.filter((projectSlug) => projectSlug !== 'swipe-watch')) {
      setupDOM(readDistHtml(`projects/${slug}/index.html`));
      expect(
        document.querySelector('mux-background-video'),
        `${slug} should not render a Mux background video`,
      ).toBeNull();
      expect(document.querySelector('mux-player'), `${slug} should not render mux-player`).toBeNull();
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
