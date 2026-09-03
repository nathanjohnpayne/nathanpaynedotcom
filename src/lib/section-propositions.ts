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
 * the `<h1>` of `src/pages/projects/index.astro`; it also feeds that page's
 * meta description, `CollectionPage` JSON-LD, and OG image alt text, so it was
 * already a value with more than one reader before the résumé became another.
 *
 * Writing has no index page of its own to quote — `/blog/` is the destination,
 * and "The AI-Augmented PM" is the publication's name rather than a headline
 * lifted from it — so that proposition stays authored in `WritingSection`.
 */

/** Headline of `/projects/`, and the résumé Projects section's proposition. */
export const PROJECTS_HEADING = 'Products—and the decisions behind them';
