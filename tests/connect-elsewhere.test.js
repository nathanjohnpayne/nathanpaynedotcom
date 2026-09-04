import { describe, it, expect, beforeAll } from 'vitest';
import { readBuiltPage, writeSanitizedDOM } from './helpers/dom.js';

/**
 * The Connect panel's "Elsewhere" list is off-site only (#972).
 *
 * Blog and Résumé used to sit in this list, which made the label wrong:
 * both are on this site, Résumé is in the action row directly above, and
 * the blog is reachable from the Writing panel and the Latest Post footer.
 *
 * What this guards is a category, not a list of six names. A row is
 * checked by where its href goes, so the next on-site row fails here
 * whatever it is called — a name-only assertion would pass a "Projects"
 * row pointing at /projects/. The expected set is pinned as well, because
 * a category check alone cannot notice a row that quietly disappears.
 */

const SITE_DOMAIN = 'nathanpayne.com';

/**
 * True for the apex and for every subdomain under it.
 *
 * Membership in a fixed host list is not the same question: a first-party
 * subdomain like `social.nathanpayne.com` is not in such a list, so a row
 * pointing there would read as off-site and pass — which is the invariant
 * inverted, since that row does not leave the site. Suffix-matched on a
 * leading dot so `notnathanpayne.com` stays off-site.
 */
function isOnSite(hostname) {
  const host = hostname.toLowerCase();
  return host === SITE_DOMAIN || host.endsWith(`.${SITE_DOMAIN}`);
}

let stack;
let rows;

beforeAll(() => {
  writeSanitizedDOM(readBuiltPage('index.html'));
  stack = document.querySelector('.social-stack');
  rows = [...(stack?.querySelectorAll('.social-row') ?? [])];
});

describe('Connect "Elsewhere" list (#972)', () => {
  it('lists the six off-site destinations and nothing else', () => {
    expect(stack, '.social-stack missing from the built homepage').not.toBeNull();
    expect(rows.map((row) => row.querySelector('.s-label')?.textContent.trim()).sort()).toEqual([
      'Bluesky',
      'GitHub',
      'Instagram',
      'LinkedIn',
      'Threads',
      'X',
    ]);
  });

  it('sends every row off this site', () => {
    // The positive above establishes that rows were found at all, so a
    // clean pass here means "checked and off-site", not "nothing to check".
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      const href = row.getAttribute('href') ?? '';
      const label = row.querySelector('.s-label')?.textContent.trim() ?? row.className;
      expect(href, `${label}: Elsewhere row is not an absolute URL`).toMatch(/^https?:\/\//);
      expect(
        isOnSite(new URL(href).hostname),
        `${label} points at ${href}, which is this site — Elsewhere is off-site only`,
      ).toBe(false);
      expect(row.getAttribute('target'), `${label}: off-site row should open in a new tab`).toBe(
        '_blank',
      );
      expect(row.getAttribute('rel') ?? '', `${label}: off-site row needs rel=noopener`).toContain(
        'noopener',
      );
    }
  });

  it('classifies the apex and its subdomains as on-site, and lookalikes as off-site', () => {
    // The sweep above reports "off-site" by asking this function. A sweep
    // over six rows that all pass proves nothing about a classifier that
    // answers false to everything, so it is exercised directly on the cases
    // the rows do not currently cover.
    for (const host of ['nathanpayne.com', 'www.nathanpayne.com', 'social.nathanpayne.com']) {
      expect(isOnSite(host), `${host} should count as on-site`).toBe(true);
    }
    for (const host of ['github.com', 'notnathanpayne.com', 'nathanpayne.com.evil.test']) {
      expect(isOnSite(host), `${host} should count as off-site`).toBe(false);
    }
  });

  it('keeps exactly one résumé link in Connect, in the action row', () => {
    const connect = document.querySelector('[data-panel="connect"]');
    const resumeLinks = [...connect.querySelectorAll('a[href="/resume/"]')];
    expect(resumeLinks).toHaveLength(1);
    expect(
      resumeLinks[0].closest('.availability-signal'),
      'the surviving résumé link is not the action-row one',
    ).not.toBeNull();
  });

  it('labels the blog the same way the Writing panel does', () => {
    // Two paths to one destination reading differently is how a reader
    // concludes they are two destinations.
    const text = (el) => el.textContent.replace(/→/g, '').replace(/\s+/g, ' ').trim();
    const writingPanelLink = document.querySelector('.writing-list .writing-list__all');
    const connectLink = document.querySelector('.blog-callout__all');

    expect(writingPanelLink, 'Writing panel lost its index link').not.toBeNull();
    expect(connectLink, 'Connect has no path to the blog index').not.toBeNull();
    expect(connectLink.getAttribute('href')).toBe('/blog/');
    expect(text(connectLink)).toBe(text(writingPanelLink));
  });
});
