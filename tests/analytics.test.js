import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const rawHtml = readFileSync(resolve(__dirname, '../dist/index.html'), 'utf-8');

// Extract inline scripts before stripping them from the HTML.
// Script 0 = GA config, Script 1 = panel interaction IIFE.
const inlineScripts = [...rawHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const panelScript = inlineScripts.find((s) => s.includes('section_view')) || '';
// PostHog: the init snippet (posthog.init) and the homepage event script.
const posthogInitScript = inlineScripts.find((s) => s.includes('posthog.init')) || '';
const posthogHomepageScript = inlineScripts.find((s) => s.includes('homepage_panel_opened')) || '';

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
      matches: query === '(hover: hover) and (pointer: fine)' ? true : !query.includes('max-width: 1023px'),
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
      (call) => call[0] === 'event' && call[1] === 'section_view' && call[2].section_name === 'projects'
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
});

describe('PostHog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupDOM();
  });

  it('initializes with the public phc_ project key and US host', () => {
    expect(posthogInitScript).toContain("posthog.init('phc_");
    expect(posthogInitScript).toContain('us.i.posthog.com');
  });

  it('never ships a personal API key or an unresolved env token', () => {
    expect(posthogInitScript).not.toContain('phx_');
    expect(posthogInitScript).not.toContain('import.meta.env');
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
