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

describe('Keyboard Navigation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupDOM();
    loadScript();
  });

  it('each panel has a focusable .panel-label with tabindex="0"', () => {
    // The .panel-label inside each .panel is the button-role element that
    // receives tab focus. The panel itself is a <region> that registers the
    // keydown handlers — Enter/Space/Escape bubble up from the focused label.
    // Giving both elements tabindex="0" would create a confusing tab order, so
    // focusability lives on the label, not the panel.
    const panels = document.querySelectorAll('.panel');
    expect(panels.length).toBeGreaterThan(0);
    panels.forEach((panel) => {
      const label = panel.querySelector('.panel-label');
      expect(label, 'panel missing .panel-label child').not.toBeNull();
      expect(label.getAttribute('tabindex')).toBe('0');
      expect(label.getAttribute('role')).toBe('button');
    });
  });

  it('Enter key opens a focused panel', () => {
    const panel = document.querySelector('[data-panel="about"]');
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(panel.classList.contains('is-open')).toBe(true);
    expect(document.getElementById('mondrian').dataset.focus).toBe('about');
  });

  it('Space key opens a focused panel and prevents default', () => {
    const panel = document.querySelector('[data-panel="projects"]');
    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    const spy = vi.spyOn(event, 'preventDefault');
    panel.dispatchEvent(event);
    expect(panel.classList.contains('is-open')).toBe(true);
    expect(spy).toHaveBeenCalled();
  });

  it('Escape key on a panel collapses the active panel', async () => {
    const panel = document.querySelector('[data-panel="about"]');
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(panel.classList.contains('is-open')).toBe(true);

    // Close runs through the state machine (#313): content fades out
    // (--motion-fast ≈ 130ms) before is-open is removed.
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(panel.classList.contains('is-open')).toBe(false);
  });

  it('Escape key on document collapses the active panel', async () => {
    const panel = document.querySelector('[data-panel="community"]');
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(panel.classList.contains('is-open')).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(panel.classList.contains('is-open')).toBe(false);
  });

  it('focusin on a panel opens it', () => {
    const panel = document.querySelector('[data-panel="connect"]');
    panel.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(panel.classList.contains('is-open')).toBe(true);
  });

  it('focusout to a non-child element schedules close', async () => {
    const panel = document.querySelector('[data-panel="about"]');
    panel.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(panel.classList.contains('is-open')).toBe(true);

    // Focus leaves to an element outside the panel. The state machine
    // (#313) fades content first (--motion-fast ≈ 130ms) before
    // removing is-open.
    panel.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: document.body }),
    );
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(panel.classList.contains('is-open')).toBe(false);
  });
});
