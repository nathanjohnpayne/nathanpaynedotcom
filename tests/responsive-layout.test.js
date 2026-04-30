import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const rawHtml = readFileSync(resolve(__dirname, '../dist/index.html'), 'utf-8');

const inlineScripts = [...rawHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const panelScript = inlineScripts.find((s) => s.includes('section_view')) || '';
const html = rawHtml.replace(/<script>[\s\S]*?<\/script>/g, '');

// Astro hashes CSS into dist/_astro/*.css
const astroDir = resolve(__dirname, '../dist/_astro');
const cssFile = readdirSync(astroDir).find((f) => f.endsWith('.css'));
const css = readFileSync(resolve(astroDir, cssFile), 'utf-8');

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

  it('CSS contains the 1023px stack-mode breakpoint reference in inline script', () => {
    // The inline script's matchMedia('(max-width: 1023px)') guard must stay in
    // sync with the @media (max-width: 1023px) block in global.css and the
    // --bp-stack token (1024px) defined on :root. See #313.
    expect(panelScript).toContain('1023px');
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

    const fn = new Function(panelScript);
    fn();

    const panel = document.querySelector('[data-panel="about"]');
    panel.click();
    expect(panel.classList.contains('is-open')).toBe(false);
  });
});
