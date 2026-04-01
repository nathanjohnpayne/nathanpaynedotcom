import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');

function setupDOM() {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query) => ({
      matches: query === '(hover: hover) and (pointer: fine)' ? true : !query.includes('max-width: 920px'),
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
  const scriptContent = readFileSync(resolve(__dirname, '../script.js'), 'utf-8');
  const fn = new Function(scriptContent);
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
    const scriptContent = readFileSync(resolve(__dirname, '../script.js'), 'utf-8');
    expect(scriptContent).toContain("typeof gtag !== 'function'");
  });
});
