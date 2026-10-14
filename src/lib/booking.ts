/**
 * The Cal.com facts behind `/book/` (specs/book-page.md).
 *
 * Every booking link on the site hangs off one Cal.com username, and each
 * card on the page links to one event type by its slug. Both live here so the
 * page, its share card, its JSON-LD and the tests derive every URL from the
 * same two values instead of retyping them.
 */

/** The Cal.com username; the public profile is https://cal.com/<username>. */
export const CAL_USERNAME = 'nathanpayne';

/** The Cal.com profile page, which lists every public event type. */
export const CAL_PROFILE_URL = `https://cal.com/${CAL_USERNAME}`;

/**
 * The page's headline: its `<h1>`, breadcrumb, `ItemList` name and share-card
 * heading. One string, so the share card cannot drift from the page the way
 * the projects card once did (#946).
 */
export const BOOK_TITLE = 'Book time';

/** The booking page for one event type: the profile URL plus the event slug. */
export function bookingUrl(slug: string): string {
  return `${CAL_PROFILE_URL}/${slug}`;
}

/**
 * The lengths an event type offers, as its card's kicker says them: `15 min`,
 * `60 or 90 min`, `60, 90, or 120 min`. Cal.com lets a visitor choose among
 * several lengths on one event type, so the card names every length it
 * offers, shortest first, rather than only the default.
 */
export function formatDurations(minutes: readonly number[]): string {
  const sorted = [...new Set(minutes)].sort((a, b) => a - b);
  if (sorted.length === 0) throw new Error('an event type offers at least one duration');
  if (sorted.length === 1) return `${sorted[0]} min`;
  if (sorted.length === 2) return `${sorted[0]} or ${sorted[1]} min`;
  return `${sorted.slice(0, -1).join(', ')}, or ${sorted[sorted.length - 1]} min`;
}
