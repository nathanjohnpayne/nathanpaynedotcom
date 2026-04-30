import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const rawHtml = readFileSync(resolve(__dirname, '../dist/index.html'), 'utf-8');

// Extract inline scripts before stripping them from the HTML.
// Script 0 = GA config, Script 1 = panel interaction IIFE.
const inlineScripts = [...rawHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const panelScript = inlineScripts.find((s) => s.includes('section_view')) || '';

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

  it('guards analytics with typeof check', () => {
    expect(panelScript).toContain("typeof gtag !== 'function'");
  });
});
