/**
 * What the Selected Projects footer says on its content line (#984).
 *
 * Every other panel footer ends on a bounded line: four scope terms in
 * Community, one title in Connect, one date in About. Builds ended on ten
 * stack items at desktop, which ran the full measure and under the exit link,
 * so the eyebrow row and the content line fused into one block of same-weight
 * gray text.
 *
 * DOMAINS is the default because it is bounded by what it names — four domains
 * stay four, while a stack list grows with every tool — and because it is the
 * sentence a PM or TPM screen should retain. The stack is not lost: it appears
 * on every project page and on the résumé.
 *
 * **This switch is temporary and is meant to be deleted.** It exists so the two
 * lines can be compared on the live page rather than argued about; when the
 * decision is made, delete the losing branch, the union type, and this file.
 * A switch nobody flips is dead code with a config file. Tracked in the
 * follow-up filed at close.
 */

/** The two lines the Builds footer can end on. */
export type ProjectsRibbon = 'domains' | 'stack';

/** The line the build renders. Flip, rebuild, and the suite validates either. */
export const PROJECTS_RIBBON: ProjectsRibbon = 'domains';

/**
 * How much of the #930 ladder survives under `'stack'`.
 *
 * 6 is that ticket's floor: the shortest rung that still shows range. Under
 * `'stack'` the ladder is filtered to `tier <= STACK_CAP` server-side, so every
 * shipped item is a rung-6 item and the container queries in global.css — which
 * only ever re-show tiers 7 through 10 — are no-ops.
 */
export const STACK_CAP = 6;

/**
 * Rendered under `'domains'`, in this order.
 *
 * The order is the former intro sentence's ("The projects span consumer,
 * enterprise, finance, and developer tooling."), which leaves the intro under
 * this mode rather than being said twice.
 */
export const PROJECT_DOMAINS = ['Consumer', 'Enterprise', 'Finance', 'Developer tooling'] as const;
