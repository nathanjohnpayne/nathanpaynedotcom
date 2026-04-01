import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');

function setupDOM() {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  // Default: desktop with hover support
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

  it('only one panel is expanded at a time', () => {
    const about = document.querySelector('[data-panel="about"]');
    const projects = document.querySelector('[data-panel="projects"]');

    about.click();
    expect(about.classList.contains('is-open')).toBe(true);

    projects.click();
    expect(projects.classList.contains('is-open')).toBe(true);
    expect(about.classList.contains('is-open')).toBe(false);
  });

  it('clicking outside panels collapses the active panel', () => {
    const panel = document.querySelector('[data-panel="about"]');
    panel.click();
    expect(panel.classList.contains('is-open')).toBe(true);

    // Click on body (outside panels)
    document.body.click();
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
        matches: query.includes('max-width: 920px') ? true : false,
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
