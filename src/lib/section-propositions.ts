/**
 * Section propositions — the one-line claim each index page makes about
 * itself, stated once (#947).
 *
 * The résumé's Projects and Writing sections both open on the same grammar:
 *
 *     section heading → proposition + canonical URL → description →
 *     selected-items label → the items
 *
 * The proposition slot quotes the destination page's own headline, so the
 * résumé says about `/projects/` exactly what `/projects/` says about itself.
 * That is only true for as long as the two strings agree, and a copy edit to a
 * page H1 has no reason to visit a résumé component — the drift class this
 * repo keeps re-finding, most recently in an agent-doc surface inventory that
 * named three consumers of a four-consumer module.
 *
 * So the string lives here and both surfaces import it. `PROJECTS_HEADING` is
 * the `<h1>` of `src/pages/projects/index.astro`, the `name` of that page's
 * `ItemList` JSON-LD node, and its OG image alt text — three readers before the
 * résumé became a fourth.
 *
 * It is NOT the page's meta description, and NOT the `CollectionPage` node's
 * name or description: those are built from `PROJECTS_DESCRIPTION` and
 * `PROJECTS_PAGE_TITLE`, which are derived separately and do not move when this
 * string does. An earlier revision of this comment claimed otherwise and would
 * have had an editor expect those fields to follow a copy change here.
 *
 * Writing has no index page of its own to quote — `/blog/` is the destination,
 * and "The AI-Augmented PM" is the publication's name rather than a headline
 * lifted from it — so that proposition stays authored in `WritingSection`.
 */

/** Headline of `/projects/`, and the résumé Projects section's proposition. */
export const PROJECTS_HEADING = 'Products—and the decisions behind them';
