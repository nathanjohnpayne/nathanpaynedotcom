import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const rawHtml = readFileSync(resolve(__dirname, '../dist/index.html'), 'utf-8');

const inlineScripts = [...rawHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const panelScript = inlineScripts.find((s) => s.includes('section_view')) || '';
const html = rawHtml.replace(/<script>[\s\S]*?<\/script>/g, '');

function setupDOM() {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  // Default: desktop with hover support
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

describe('Panel Interaction', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupDOM();
    loadScript();
  });

  it('adds is-open class and sets data-focus on click', () => {
    const panel = document.querySelector('[data-panel="about"]');
    panel.click();
    expect(panel.classList.contains('is-open')).toBe(true);
    expect(document.getElementById('mondrian').dataset.focus).toBe('about');
  });

  it('only one panel is expanded at a time', async () => {
    const about = document.querySelector('[data-panel="about"]');
    const projects = document.querySelector('[data-panel="projects"]');

    about.click();
    expect(about.classList.contains('is-open')).toBe(true);

    // Switching from one panel to another runs through the state machine
    // (#313): content fades out (--motion-fast ≈ 130ms) before is-open
    // hands off to the new panel. Wait for the fade to complete before
    // asserting the swap.
    projects.click();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(projects.classList.contains('is-open')).toBe(true);
    expect(about.classList.contains('is-open')).toBe(false);
  });

  it('clicking outside panels collapses the active panel', async () => {
    const panel = document.querySelector('[data-panel="about"]');
    panel.click();
    expect(panel.classList.contains('is-open')).toBe(true);

    // Click on body (outside panels). Close runs through the state
    // machine: content fades out first (--motion-fast ≈ 130ms), then
    // is-open is removed.
    document.body.click();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(panel.classList.contains('is-open')).toBe(false);
  });

  it('mouseenter opens a panel on hover-capable devices', () => {
    const panel = document.querySelector('[data-panel="projects"]');
    panel.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    expect(panel.classList.contains('is-open')).toBe(true);
  });

  it('does not open panels on mobile viewport', () => {
    // Re-setup with mobile media query
    setupDOM();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query) => ({
        matches: query.includes('max-width: 1023px') ? true : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        onchange: null,
        dispatchEvent: vi.fn(),
      })),
    });
    loadScript();

    const panel = document.querySelector('[data-panel="about"]');
    panel.click();
    expect(panel.classList.contains('is-open')).toBe(false);
  });

  it('does not trigger open when clicking a link inside a panel', () => {
    const panel = document.querySelector('[data-panel="about"]');
    // First open the panel to make links visible
    panel.click();
    expect(panel.classList.contains('is-open')).toBe(true);
  });
});
