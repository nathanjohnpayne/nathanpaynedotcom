import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';
import { readBuiltPage, writeSanitizedDOM } from './helpers/dom.js';

const rawHtml = readBuiltPage('index.html');

// Read the inline script bodies so the assertions below can inspect them.
// Script 0 = GA config, Script 1 = panel interaction IIFE. This is extraction,
// not sanitization, so it stays a regex; setupDOM does the removal.
const inlineScripts = [...rawHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const panelScript = inlineScripts.find((s) => s.includes('section_view')) || '';
// PostHog init lives in src/components/posthog.astro and is gated on the env
// token, so it may be absent from a token-less build (e.g. CI). Assert the
// init contract against the component SOURCE (build-env-independent); assert
// event behavior against the homepage script, which always renders.
const posthogComponentSrc = readFileSync(
  resolve(__dirname, '../src/components/posthog.astro'),
  'utf-8',
);
const posthogHomepageScript = inlineScripts.find((s) => s.includes('homepage_panel_opened')) || '';

/**
 * The `posthog.init(token, { … })` config object, with full-line `//` comments
 * removed. The component source carries an explanatory comment that quotes the
 * literal string `person_profiles: 'identified_only'` (#612), and a raw grep of
 * the source cannot tell code from prose (#640). Scoping to the config body and
 * dropping comments keeps the regression guard exact.
 *
 * Only comments occupying a whole line are stripped, so `//` inside a URL
 * (`https://…`) is untouched.
 */
const posthogInitConfig = (() => {
  const callIndex = posthogComponentSrc.indexOf('posthog.init(token');
  if (callIndex === -1) return '';
  const open = posthogComponentSrc.indexOf('{', callIndex);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < posthogComponentSrc.length; i += 1) {
    const char = posthogComponentSrc[i];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return posthogComponentSrc.slice(open, i + 1).replace(/^[ \t]*\/\/.*$/gm, '');
      }
    }
  }
  return '';
})();
// GA4 is loaded by BaseLayout from the env Measurement ID and gated on it, so
// assert the load contract against the layout SOURCE (build-env-independent).
const baseLayoutSrc = readFileSync(resolve(__dirname, '../src/layouts/BaseLayout.astro'), 'utf-8');
// Blog post events live in the BlogPost layout rather than the homepage script,
// so they are asserted against that layout's SOURCE for the same reason.
const blogPostLayoutSrc = readFileSync(
  resolve(__dirname, '../src/layouts/BlogPost.astro'),
  'utf-8',
);
// Resume events live in the page itself rather than a layout, so they are
// asserted against that page's SOURCE for the same reason (#702, #703).
const resumePageSrc = readFileSync(resolve(__dirname, '../src/pages/resume.astro'), 'utf-8');

// Flush a macrotask so queued MutationObserver callbacks have run.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function setupDOM() {
  // Scripts are removed on a detached document and the doctype preserved by
  // the shared helper — see tests/helpers/dom.js for why both matter.
  writeSanitizedDOM(rawHtml);

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query) => ({
      matches:
        query === '(hover: hover) and (pointer: fine)'
          ? true
          : !query.includes('max-width: 1023px'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
  });
}

function loadScript() {
  const fn = new Function(panelScript);
  fn();
}

describe('Analytics', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupDOM();
  });

  it('calls gtag with section_view on first panel mouseenter', () => {
    const gtagMock = vi.fn();
    window.gtag = gtagMock;

    loadScript();

    const panel = document.querySelector('[data-panel="about"]');
    panel.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(gtagMock).toHaveBeenCalledWith('event', 'section_view', {
      section_name: 'about',
      event_category: 'engagement',
    });
  });

  it('fires the analytics event only once per panel', () => {
    const gtagMock = vi.fn();
    window.gtag = gtagMock;

    loadScript();

    const panel = document.querySelector('[data-panel="projects"]');
    panel.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    panel.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    panel.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    const sectionViewCalls = gtagMock.mock.calls.filter(
      (call) =>
        call[0] === 'event' && call[1] === 'section_view' && call[2].section_name === 'projects',
    );
    expect(sectionViewCalls).toHaveLength(1);
  });

  it('does not error when gtag is not defined', () => {
    delete window.gtag;
    loadScript();

    const panel = document.querySelector('[data-panel="about"]');
    // Should not throw
    expect(() => {
      panel.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    }).not.toThrow();
  });

  it('does not fire section_view on non-hover devices', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query) => ({
        matches: query.includes('max-width: 1023px'),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
        dispatchEvent: vi.fn(),
      })),
    });
    const gtagMock = vi.fn();
    window.gtag = gtagMock;

    loadScript();

    const panel = document.querySelector('[data-panel="about"]');
    panel.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(gtagMock).not.toHaveBeenCalledWith('event', 'section_view', expect.any(Object));
  });

  it('guards analytics with typeof check', () => {
    expect(panelScript).toContain("typeof gtag !== 'function'");
  });

  it('loads GA from the PUBLIC_GA_MEASUREMENT_ID env var, never hardcoded', () => {
    expect(baseLayoutSrc).toContain('import.meta.env.PUBLIC_GA_MEASUREMENT_ID');
    expect(baseLayoutSrc).not.toMatch(/G-[A-Z0-9]{10}/); // no committed Measurement ID
  });

  it('only loads GA when the Measurement ID is present (graceful degradation)', () => {
    expect(baseLayoutSrc).toMatch(/\{gaId &&/); // conditional render guard
    expect(baseLayoutSrc).toContain("gtag('config', gaId");
  });

  it('exposes gtag on window despite the define:vars IIFE (section_view regression)', () => {
    // define:vars wraps the GA config script in an IIFE, so `function gtag`
    // is IIFE-local; it must be re-exposed on window or the homepage
    // section_view path (its `typeof gtag` guard) silently stops firing.
    expect(baseLayoutSrc).toContain('window.gtag = gtag');

    // Behavioral proof when this build actually included GA (env token present):
    const gaConfig = inlineScripts.find((s) => s.includes("gtag('config'"));
    if (gaConfig) {
      delete window.gtag;
      new Function(gaConfig)();
      expect(typeof window.gtag).toBe('function');
    }
  });

  it('does not hardcode the GA Measurement ID anywhere in tracked files', () => {
    // Repo-wide drift guard: the Measurement ID lives only in 1Password / env,
    // never committed. The needle is built from parts so this assertion file
    // does not match itself.
    const needle = 'G-7C29' + 'SRBXB1';
    const root = resolve(__dirname, '..');
    const skipBinary = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot|pdf|mp4|webm|mov|zip)$/i;
    const files = execSync('git ls-files', { cwd: root, encoding: 'utf-8' })
      .split('\n')
      .filter((f) => f && !skipBinary.test(f));
    const offenders = files.filter((f) => {
      try {
        return readFileSync(resolve(root, f), 'utf-8').includes(needle);
      } catch {
        return false;
      }
    });
    expect(offenders).toEqual([]);
  });
});

describe('PostHog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupDOM();
  });

  it('reads the PostHog token from env and never commits a key in source', () => {
    expect(posthogComponentSrc).toContain('import.meta.env.PUBLIC_POSTHOG_PROJECT_TOKEN');
    // No committed project token (phc_) or personal key (phx_) material in
    // source — match key bodies, not bare mentions in comments.
    expect(posthogComponentSrc).not.toMatch(/phc_[A-Za-z0-9]{6}/);
    expect(posthogComponentSrc).not.toMatch(/phx_[A-Za-z0-9]{6}/);
  });

  it('only initializes PostHog when a token is present (graceful degradation)', () => {
    expect(posthogComponentSrc).toMatch(/\{token &&/); // conditional render guard
    expect(posthogComponentSrc).toContain('posthog.init(token');
    expect(posthogComponentSrc).toContain("api_host: 'https://d.nathanpayne.com'");
  });

  it('sets ui_host and fully migrates off the direct ingest host (reverse proxy, #540)', () => {
    // ui_host must point at the real PostHog US app so the toolbar and
    // "open in PostHog" deep links resolve once api_host is a first-party proxy.
    expect(posthogComponentSrc).toContain("ui_host: 'https://us.posthog.com'");
    // Regression guard: api_host must not revert to the cloud ingest host.
    expect(posthogComponentSrc).not.toContain('us.i.posthog.com');
  });

  it('creates person profiles for anonymous visitors so internal traffic is filterable', () => {
    // `defaults: '2026-01-30'` implies person_profiles: 'identified_only'. This
    // site has no login and never calls identify(), so under that default no
    // visitor ever got a person object — the project held exactly ONE Person row
    // and every other "person" existed only as a synthetic id on the events table.
    // That makes person-property filtering impossible: the "Internal / Test users"
    // cohort can never match, so internal traffic cannot be excluded from
    // analytics or from the error-tracking alerts that file GitHub issues.
    // The explicit override must therefore outlive any future `defaults` bump.
    // Asserted against the init config object with comments stripped, not the
    // raw component source: an explanatory comment in posthog.astro quotes
    // `person_profiles: 'identified_only'` verbatim (#612, #640).
    expect(posthogInitConfig, 'posthog.init config object not found').not.toBe('');
    expect(posthogInitConfig).toContain("person_profiles: 'always'");
    expect(posthogInitConfig).not.toContain("person_profiles: 'identified_only'");
  });

  it('guards every homepage capture with optional chaining', () => {
    expect(posthogHomepageScript).toContain('window.posthog?.capture');
    expect(posthogHomepageScript).not.toContain('window.posthog.capture');
  });

  it("states an event count in the spec that matches the spec's own table", () => {
    // The prose said "twelve" while the table listed nineteen. It had drifted
    // long before this test — each PR that adds an event updates the table it
    // is editing and not the sentence four screens above it, and nothing
    // failed. Derived from the table rather than hardcoded, so adding an event
    // fails this once, on the number, instead of going quietly stale again.
    const spec = readFileSync(resolve(__dirname, '../specs/analytics.md'), 'utf-8');

    const table = spec.match(/\| Event \| Trigger \| Properties \|\n\|[-| ]+\|\n((?:\|.*\n)+)/);
    expect(table, 'no event table found in specs/analytics.md').not.toBeNull();
    const rowCount = table[1].trim().split('\n').length;
    expect(rowCount, 'event table looks empty').toBeGreaterThan(10);

    const words = {
      12: 'twelve',
      13: 'thirteen',
      14: 'fourteen',
      15: 'fifteen',
      16: 'sixteen',
      17: 'seventeen',
      18: 'eighteen',
      19: 'nineteen',
      20: 'twenty',
    };
    const expected = words[rowCount];
    expect(expected, `no spelling on file for ${rowCount} — extend the map`).toBeDefined();
    expect(
      spec,
      `specs/analytics.md prose should say "${expected} custom conversion/engagement events" ` +
        `to match its own table of ${rowCount}`,
    ).toContain(`${expected} custom conversion/engagement events`);
  });

  it('wires the homepage conversion events', () => {
    for (const evt of [
      'homepage_panel_opened',
      'contact_email_clicked',
      'booking_link_clicked',
      'resume_link_clicked',
      'social_link_clicked',
      'donation_link_clicked',
      'writing_link_clicked',
      'index_link_clicked',
    ]) {
      expect(posthogHomepageScript).toContain(evt);
    }
  });

  it('wires the blog post events', () => {
    // Every event here has a row in specs/analytics.md § Events. The registry
    // stops being canonical the first time a shipped event is missing from it.
    for (const evt of ['blog_post_viewed', 'blog_cta_clicked', 'blog_post_nav_clicked']) {
      expect(blogPostLayoutSrc).toContain(`capture('${evt}'`);
    }
  });

  it('wires the resume events', () => {
    // Same registry contract as the blog events above: a shipped event with no
    // row in specs/analytics.md § Events is the thing this guards against.
    for (const evt of [
      'resume_viewed',
      'resume_pdf_downloaded',
      'resume_action_clicked',
      'resume_cta_clicked',
    ]) {
      expect(resumePageSrc).toContain(`capture('${evt}'`);
    }
  });

  it('keeps the resume PDF download on its own event name', () => {
    // The download predates the action row (#616) and existing insights key
    // off `resume_pdf_downloaded`, so it must NOT be folded into the shared
    // `resume_action_clicked` capture when the row grew (#703).
    expect(resumePageSrc).toMatch(/action === 'download'[\s\S]{0,120}resume_pdf_downloaded/);
  });

  it('captures homepage_panel_opened when a panel gains focus', async () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    document.getElementById('mondrian').dataset.focus = 'about';
    await tick();

    expect(capture).toHaveBeenCalledWith('homepage_panel_opened', { panel_name: 'about' });
  });

  it('does not emit phantom opens during a measurement-style data-focus cycle', async () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    const grid = document.getElementById('mondrian');
    grid.dataset.focus = 'about';
    await tick();

    // measureContentHeights() cycles focus across every panel, then restores it.
    grid.dataset.focus = 'projects';
    grid.dataset.focus = 'connect';
    grid.dataset.focus = 'community';
    grid.dataset.focus = 'about';
    await tick();

    const opens = capture.mock.calls.filter((c) => c[0] === 'homepage_panel_opened');
    expect(opens).toHaveLength(1);
  });

  it('re-captures the same panel only after focus clears', async () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    const grid = document.getElementById('mondrian');
    grid.dataset.focus = 'about';
    await tick();
    delete grid.dataset.focus; // panel closed
    await tick();
    grid.dataset.focus = 'about'; // re-opened
    await tick();

    const opens = capture.mock.calls.filter((c) => c[0] === 'homepage_panel_opened');
    expect(opens).toHaveLength(2);
  });

  it('captures social_link_clicked with the platform from the row class', () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    document
      .querySelector('.social-row--linkedin')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(capture).toHaveBeenCalledWith('social_link_clicked', { platform: 'linkedin' });
  });

  it('captures contact_email_clicked on the availability mailto', () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    document
      .getElementById('availability-mailto')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(capture).toHaveBeenCalledWith('contact_email_clicked');
  });

  it('captures booking_link_clicked on the Cal.com scheduling link (#620)', () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    document
      .querySelector('.availability-booking')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(capture).toHaveBeenCalledWith('booking_link_clicked');
  });

  // #972 removed the Connect "Elsewhere" résumé row, and with it the only
  // element that was both a résumé link and a .social-row. That row fired
  // resume_link_clicked and social_link_clicked {platform:"resume"} together
  // — deliberately, and documented as Behavior #3 — so the coverage that
  // used to pin the double-fire now pins its absence, from the action-row
  // link that replaced it as Connect's résumé affordance.
  it('captures resume_link_clicked from the Connect action-row résumé link, and nothing else', () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    document
      .querySelector('.availability-resume')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(capture).toHaveBeenCalledWith('resume_link_clicked');
    expect(
      capture.mock.calls.filter((c) => c[0] === 'social_link_clicked'),
      'the action-row résumé link is not a .social-row and must not report as one',
    ).toHaveLength(0);
  });

  it('captures index_link_clicked from every panel exit, with its panel and href', () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    const exits = [...document.querySelectorAll('.ribbon-exit')];
    // Control: the sweep below says nothing if it swept nothing. Three panels
    // exit to an index — Projects, About, Connect (#975).
    expect(exits.length, 'expected three .ribbon-exit links').toBe(3);
    for (const exit of exits) {
      exit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    const calls = capture.mock.calls.filter((c) => c[0] === 'index_link_clicked').map((c) => c[1]);
    expect(calls.map((c) => c.panel).sort()).toEqual(['about', 'connect', 'projects']);
    expect(calls.map((c) => c.href).sort()).toEqual(['/blog/', '/blog/', '/projects/']);
    expect(
      calls.some((c) => c.panel === 'unknown'),
      'an exit is not inside a [data-panel] .panel container',
    ).toBe(false);
  });

  it('reports the Projects exit whichever footer line the build switch selected', () => {
    // #984 rebuilds the Projects footer's eyebrow row in two branches, and the
    // exit link is inside both. The sweep above would still pass on a build
    // that lost it — three exits would become two and `.sort()` would report a
    // shorter list, but only this assertion says which panel went missing and
    // which branch it went missing from.
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    const exit = document.querySelector('[data-panel="projects"] .domains-ribbon .ribbon-exit');
    expect(exit, 'no .ribbon-exit inside .domains-ribbon').not.toBeNull();

    exit.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(capture).toHaveBeenCalledWith('index_link_clicked', {
      panel: 'projects',
      href: '/projects/',
    });
  });

  it('keeps [data-panel] unique to panel containers', () => {
    // The exits carried their own data-panel until Codex caught it on #975.
    // It duplicated the value on the containing <article>, which is what the
    // grid's state machine and the Playwright suite select on — and
    // Playwright's locator is strict, so [data-panel="about"] threw instead
    // of asserting, while document.querySelector here silently took the
    // first match and every Vitest suite stayed green. Asserting uniqueness
    // rather than the absence of one attribute on one element: any future
    // element borrowing the name breaks the same selector.
    for (const name of ['about', 'projects', 'connect', 'community']) {
      const matches = document.querySelectorAll(`[data-panel="${name}"]`);
      expect(matches.length, `[data-panel="${name}"] should match exactly one element`).toBe(1);
      expect(
        matches[0].classList.contains('panel'),
        `[data-panel="${name}"] should be the panel container`,
      ).toBe(true);
    }
  });

  it('keeps writing_link_clicked to article links only', () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    // The About exit sat inside .writing-list until #975, so its one click
    // per quarter landed in the article-click event. It reports as
    // index_link_clicked now and must not double-report.
    document
      .querySelector('[data-panel="about"] .ribbon-exit')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(capture.mock.calls.filter((c) => c[0] === 'writing_link_clicked')).toHaveLength(0);

    const article = document.querySelector('.writing-list__posts a');
    expect(article, 'no article link found — the assertion below is vacuous').not.toBeNull();
    article.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(capture).toHaveBeenCalledWith('writing_link_clicked', {
      href: article.getAttribute('href'),
    });
  });

  it('no longer emits social_link_clicked with an on-site platform', () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    const rows = [...document.querySelectorAll('.social-row')];
    // Control: a zero-hit sweep proves nothing if the sweep found no rows.
    expect(rows.length, 'no .social-row elements found — the sweep below is vacuous').toBe(6);
    for (const row of rows) {
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }

    const platforms = capture.mock.calls
      .filter((c) => c[0] === 'social_link_clicked')
      .map((c) => c[1].platform)
      .sort();
    expect(platforms).toEqual(['bluesky', 'github', 'instagram', 'linkedin', 'threads', 'x']);
  });

  // #659 folded the RÉSUMÉ section into NOW, so the About-panel résumé link
  // is no longer identifiable by its block: it carries .about-resume-link.
  it('captures resume_link_clicked from the About-panel résumé link', () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    document
      .querySelector('.about-resume-link')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(capture).toHaveBeenCalledWith('resume_link_clicked');
  });
});
