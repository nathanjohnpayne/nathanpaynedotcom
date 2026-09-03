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
 * So the string lives here and every surface imports it. `PROJECTS_HEADING` is
 * the `<h1>` of `src/pages/projects/index.astro`, the `name` of that page's
 * `ItemList` JSON-LD node, its OG image alt text, the heading rendered into the
 * projects OG card (`src/pages/og-templates/projects.astro`), and the résumé's
 * Projects proposition.
 *
 * That OG card was the one copy this module missed on its first pass: a
 * hard-coded duplicate in a template nobody edits, which would have shipped
 * stale share artwork after a copy change and produced no error anywhere
 * (Codex, PR #946). `tests/section-propositions.test.js` now fails on any
 * literal copy of the string under `src/`, so a sixth consumer has to import
 * it rather than retype it.
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
