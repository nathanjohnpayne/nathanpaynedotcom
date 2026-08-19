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
    expect(link.closest('.availability-signal'), 'booking link is not in the availability line')
      .not.toBeNull();
  });

  it('is a plain href — no JavaScript needed to resolve it', () => {
    expect(link.getAttribute('href')).toBe(BOOKING_URL);
  });

  it('opens in a new tab with rel="noopener", like the other external links', () => {
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel') || '').toContain('noopener');
  });

  it('is styled as a peer of "Get in touch" and "Résumé"', () => {
    const peers = [...document.querySelectorAll('.availability-signal a')];
    expect(peers).toHaveLength(3);
    for (const peer of peers) {
      expect(peer.classList.contains('p-link'), `${peer.className} is not a .p-link peer`).toBe(
        true,
      );
      expect(peer.querySelector('.link-arrow'), `${peer.className} has no link arrow`).not.toBeNull();
    }
  });
});
