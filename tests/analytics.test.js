import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const rawHtml = readFileSync(resolve(__dirname, '../dist/index.html'), 'utf-8');

// Extract inline scripts before stripping them from the HTML.
// Script 0 = GA config, Script 1 = panel interaction IIFE.
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
// GA4 is loaded by BaseLayout from the env Measurement ID and gated on it, so
// assert the load contract against the layout SOURCE (build-env-independent).
const baseLayoutSrc = readFileSync(resolve(__dirname, '../src/layouts/BaseLayout.astro'), 'utf-8');

// Flush a macrotask so queued MutationObserver callbacks have run.
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

// Strip all inline <script> blocks so they don't auto-execute during document.write.
const html = rawHtml.replace(/<script>[\s\S]*?<\/script>/g, '');

function setupDOM() {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

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

  it('guards every homepage capture with optional chaining', () => {
    expect(posthogHomepageScript).toContain('window.posthog?.capture');
    expect(posthogHomepageScript).not.toContain('window.posthog.capture');
  });

  it('wires the homepage conversion events', () => {
    for (const evt of [
      'homepage_panel_opened',
      'contact_email_clicked',
      'resume_link_clicked',
      'social_link_clicked',
      'donation_link_clicked',
      'writing_link_clicked',
    ]) {
      expect(posthogHomepageScript).toContain(evt);
    }
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

  it('captures resume_link_clicked from the Connect social-stack résumé row (and still social_link_clicked)', () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    document
      .querySelector('.social-row--resume')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // Connect "Elsewhere" résumé row is both a résumé link and a .social-row,
    // so it fires both events (see specs/analytics.md Behavior #3).
    expect(capture).toHaveBeenCalledWith('resume_link_clicked');
    expect(capture).toHaveBeenCalledWith('social_link_clicked', { platform: 'resume' });
  });

  it('captures resume_link_clicked from the About-panel résumé link', () => {
    const capture = vi.fn();
    window.posthog = { capture };
    new Function(posthogHomepageScript)();

    document
      .querySelector('.about-block--resume a')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(capture).toHaveBeenCalledWith('resume_link_clicked');
  });
});
