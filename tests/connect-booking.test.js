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
  const safe = raw.replace(/<script>[\s\S]*?<\/script>/g, '');
  document.documentElement.innerHTML = '';
  document.write(safe);
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
