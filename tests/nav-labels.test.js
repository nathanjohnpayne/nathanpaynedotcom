import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Guards the canonical wayfinding labels on the 404 page against drift (#524).
// The 404 shortcut buttons must use the same navigation labels as the rest of
// the site — "Projects" (not the old "Builds") for /projects/ and "Blog" for
// /blog/ — even though the editorial H1s differ ("Built with Agents", "The
// AI-Augmented PM"). Reads the built dist/ HTML (`npm test` runs `astro build`
// first).

const DIST = resolve(__dirname, '../dist');

function setupDOM(rawHtml) {
  // Remove scripts through the DOM rather than by regex (CodeQL
  // js/bad-tag-filter, js/incomplete-multi-character-sanitization), on a
  // detached DOMParser document so nothing executes on the way in. See
  // tests/connect-booking.test.js for the long form. JSON-LD is kept because it
  // is content, not behaviour.
  const parsed = new DOMParser().parseFromString(rawHtml, 'text/html');
  for (const script of parsed.querySelectorAll('script:not([type="application/ld+json"])')) {
    script.remove();
  }
  document.documentElement.innerHTML = '';
  document.write(parsed.documentElement.outerHTML);
  document.close();
}

describe('404 navigation labels (#524)', () => {
  beforeEach(() => {
    setupDOM(readFileSync(resolve(DIST, '404.html'), 'utf-8'));
  });

  it('uses canonical wayfinding labels for the section shortcuts', () => {
    const buttons = [...document.querySelectorAll('.project-actions .nav-button')];
    const byHref = Object.fromEntries(
      buttons.map((a) => [a.getAttribute('href'), a.textContent.trim()]),
    );
    expect(byHref['/']).toBe('Homepage');
    expect(byHref['/resume/']).toBe('Résumé');
    expect(byHref['/projects/']).toBe('Projects'); // canonical nav label, not the old "Builds"
    expect(byHref['/blog/']).toBe('Blog');
  });

  it('does not reintroduce the stale "Builds" wayfinding label', () => {
    const labels = [...document.querySelectorAll('.project-actions .nav-button')].map((a) =>
      a.textContent.trim(),
    );
    expect(labels).not.toContain('Builds');
  });
});
