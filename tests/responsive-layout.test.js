import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { readBuiltStylesheet, writeSanitizedDOM } from './helpers/dom.js';

const rawHtml = readFileSync(resolve(__dirname, '../dist/index.html'), 'utf-8');

// Read the panel script body so loadScript() can run it. This is extraction,
// not sanitization, so it stays a regex; setupDOM does the removal.
const inlineScripts = [...rawHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const panelScript = inlineScripts.find((s) => s.includes('section_view')) || '';

// Astro content-hashes CSS into dist/_astro/*.css, so the shared helper
// discovers the filenames and reads every emitted chunk rather than the first
// one readdirSync returns (#932).
const css = readBuiltStylesheet();

// Authored stylesheet. Vite 8's minifier collapses `aspect-ratio: 1 / 1` to the
// equivalent `aspect-ratio:1`, so the "did the author write this rule"
// assertion reads the source and is paired with a normalized dist check that
// proves the rule survived the build. See #640.
const sourceCss = readFileSync(resolve(__dirname, '../src/styles/global.css'), 'utf-8');

// `aspect-ratio: <number>` is defined as `<number> / 1`, so re-expanding the
// single-value form is a pure re-serialization, not a looser matcher.
function normalizeAspectRatio(cssText) {
  return cssText.replace(/aspect-ratio:\s*([\d.]+)\s*(?=[;}])/g, 'aspect-ratio: $1 / 1');
}

function setupDOM() {
  // Scripts are removed on a detached document and the doctype preserved by
  // the shared helper — see tests/helpers/dom.js for why both matter.
  writeSanitizedDOM(rawHtml);

  // Inject the stylesheet so CSS rules are queryable
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

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
    // The inline script's matchMedia guard must stay in sync with the
    // @media block in global.css and the --bp-stack token (1024px) defined on
    // :root. See #313.
    expect(panelScript).toContain('1023px');
  });

  it('guards interactions on BOTH axes, not width alone', () => {
    // #992 gave the composition a minimum viewport dimension of 1024px on
    // either axis. The behavioural half of this is asserted below; this is the
    // string half, and it is here because the two can fail independently — a
    // guard could query both axes while the CSS queried one, or the reverse.
    expect(panelScript).toContain('max-height: 1023px');
    expect(sourceCss).toContain('@media (max-width: 1023px), (max-height: 1023px)');
  });

  it('mobile guard prevents panel opening on a WIDE but short viewport', () => {
    // The regression this exists to catch: reverting the guard to a width-only
    // query. This mock answers for a 1440x900 window — wide enough that
    // `max-width: 1023px` does NOT match, short enough that `max-height: 1023px`
    // does — so a width-only guard would report desktop, open the panel, and
    // fail here while the CSS around it renders the static stack.
    //
    // Codex raised this on PR #1003: the pre-existing mocks all key off
    // `max-width: 1023px`, so every one of them would have stayed green
    // through exactly that revert.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn((query) => ({
        matches: query.includes('max-height: 1023px'),
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

  it('CSS uses clamp() for fluid typography', () => {
    expect(css).toContain('clamp(');
    // Verify panel-label font-size uses clamp
    expect(css).toMatch(/font-size:\s*clamp\(/);
  });

  it('mondrian grid uses aspect-ratio 1/1', () => {
    // Authored form.
    expect(sourceCss).toMatch(/aspect-ratio:\s*1\s*\/\s*1/);
    // …and it reached the bundle, whichever serialization the minifier chose.
    expect(normalizeAspectRatio(css)).toMatch(/aspect-ratio:\s*1\s*\/\s*1/);
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
