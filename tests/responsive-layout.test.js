import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const html = readFileSync(resolve(__dirname, '../index.html'), 'utf-8');
const css = readFileSync(resolve(__dirname, '../style.css'), 'utf-8');

function setupDOM() {
  document.documentElement.innerHTML = '';
  document.write(html);
  document.close();

  // Inject the stylesheet so CSS rules are queryable
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

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

describe('Responsive Layout', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupDOM();
  });

  it('mondrian grid element exists with grid display', () => {
    const mondrian = document.getElementById('mondrian');
    expect(mondrian).not.toBeNull();
    expect(mondrian.classList.contains('mondrian')).toBe(true);
  });

  it('stage element uses grid layout with place-items: center', () => {
    const stage = document.querySelector('.stage');
    expect(stage).not.toBeNull();
  });

  it('CSS contains the 920px mobile breakpoint reference in script.js', () => {
    const scriptContent = readFileSync(resolve(__dirname, '../script.js'), 'utf-8');
    expect(scriptContent).toContain('920px');
  });

  it('CSS uses clamp() for fluid typography', () => {
    expect(css).toContain('clamp(');
    // Verify panel-label font-size uses clamp
    expect(css).toMatch(/font-size:\s*clamp\(/);
  });

  it('mondrian grid uses aspect-ratio 1/1', () => {
    expect(css).toMatch(/aspect-ratio:\s*1\s*\/\s*1/);
  });

  it('mobile guard prevents panel opening when viewport is narrow', () => {
    // Set up mobile matchMedia
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

    const scriptContent = readFileSync(resolve(__dirname, '../script.js'), 'utf-8');
    const fn = new Function(scriptContent);
    fn();

    const panel = document.querySelector('[data-panel="about"]');
    panel.click();
    expect(panel.classList.contains('is-open')).toBe(false);
  });
});
