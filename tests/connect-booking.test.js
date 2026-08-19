import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Cal.com scheduling link in the Connect panel (#620).
 *
 * The point of the link is that it works without JavaScript: unlike the
 * mailto beside it — assembled client-side from base64 so the address never
 * appears in the static HTML — a booking URL has nothing to harvest, so it
 * ships as a plain href. These assertions read the BUILT HTML, which is what
 * a JS-disabled reader gets.
 */

const DIST = resolve(__dirname, '../dist');
const BOOKING_URL = 'https://cal.com/nathanpayne';

let link;

beforeAll(() => {
  const raw = readFileSync(resolve(DIST, 'index.html'), 'utf-8');
  // Remove scripts through the DOM rather than by regex. This is the reference
  // implementation; the other dist-reading tests mirror it with a short comment.
  //
  // The original `/<script>...<\/script>/g` matched only lowercase `<script>`
  // with no attributes, so Astro's own `<script type="module" src="...">`
  // survived and the "what a JS-disabled reader gets" premise above was not
  // actually achieved (CodeQL js/bad-tag-filter, alert #17). Making the regex
  // case-insensitive and attribute-tolerant fixed that but traded it for
  // js/incomplete-multi-character-sanitization: any single-pass string replace
  // can leave `<script` behind through nesting, so CodeQL objects to the
  // technique itself, not to one pattern.
  //
  // Removing the parsed elements sidesteps the whole class. It is also exact:
  // case, attributes, and nesting are the parser's problem, not a pattern's.
  //
  // The removal runs on a detached `DOMParser` document, not on the live one.
  // Vitest's jsdom environment defaults to `runScripts: "dangerously"`, so
  // anything written into the live document with `document.write` executes
  // immediately and pruning afterwards would be too late. `DOMParser` never
  // executes scripts, so stripping there means nothing runs at all. (An earlier
  // revision of this comment claimed jsdom does not execute scripts under
  // vitest.config.js; that is wrong. Writing the built homepage into the live
  // document and clicking a panel with no `loadScript()` call opens the panel,
  // which only the page's own inline script can do.)
  //
  // JSON-LD is kept because it is content, not behaviour.
  const parsed = new DOMParser().parseFromString(raw, 'text/html');
  for (const script of parsed.querySelectorAll('script:not([type="application/ld+json"])')) {
    script.remove();
  }
  document.documentElement.innerHTML = '';
  document.write(parsed.documentElement.outerHTML);
  document.close();
  link = document.querySelector('.availability-booking');
});

describe('Connect panel scheduling link (#620)', () => {
  it('renders in the availability line, in the static HTML', () => {
    expect(link, '.availability-booking missing from built homepage').not.toBeNull();
    expect(
      link.closest('.availability-signal'),
      'booking link is not in the availability line',
    ).not.toBeNull();
  });

  it('is a plain href — no JavaScript needed to resolve it', () => {
    expect(link.getAttribute('href')).toBe(BOOKING_URL);
  });

  it('opens in a new tab with rel="noopener", like the other external links', () => {
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel') || '').toContain('noopener');
  });

  it('is styled as a peer of "Get in touch" and "Résumé"', () => {
    // Assert the peers that must be there, not an exact total: an unrelated
    // fourth link in the availability line should not fail this test, but a
    // missing one still must.
    const signal = document.querySelector('.availability-signal');
    expect(signal, '.availability-signal missing from built homepage').not.toBeNull();
    for (const selector of [
      '.availability-mailto',
      '.availability-booking',
      '.availability-resume',
    ]) {
      expect(
        signal.querySelector(selector),
        `${selector} missing from the availability line`,
      ).not.toBeNull();
    }
    const peers = [...signal.querySelectorAll('a')];
    expect(peers.length, 'availability line lost its links').toBeGreaterThanOrEqual(3);
    for (const peer of peers) {
      expect(peer.classList.contains('p-link'), `${peer.className} is not a .p-link peer`).toBe(
        true,
      );
      expect(
        peer.querySelector('.link-arrow'),
        `${peer.className} has no link arrow`,
      ).not.toBeNull();
    }
  });
});
