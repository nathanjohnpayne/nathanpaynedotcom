/**
 * What the résumé calls a project's live URL (#947).
 *
 * A project declares one label for the live CTA on its own detail page —
 * `liveLabel` in the `projects` collection, defaulting to "View Live Product"
 * when unset. The résumé's destination row needs the same fact in a shorter
 * form, and the whole point of deriving it is that the two surfaces cannot
 * disagree about whether a URL opens a running product or something else.
 *
 * **The derivation reads the value, not a keyword.** An earlier version tested
 * `/demo/i` and returned "Live" for anything else, which quietly reintroduced
 * the contradiction it existed to prevent: `liveLabel` is `z.string().min(1)`,
 * so `View Prototype` or `Open Sandbox` are valid overrides, and the résumé
 * would have called them "Live" while the detail page called them Prototype and
 * Sandbox (Codex, PR #946). Any override now carries through.
 *
 * The CTA is phrased as an instruction — "View Demo" — and a row label is not,
 * so the leading verb comes off and the noun stays. The verb list is closed and
 * short on purpose: an override that does not start with one is used whole,
 * which is the safe direction. It shortens what it recognises and never
 * silently discards what it does not.
 */

/** Imperative openers a CTA label may carry that a row label should not. */
const CTA_VERBS = /^\s*(?:view|open|try|launch|see|explore|read)\s+/i;

/**
 * @param liveLabel the project's `liveLabel`, or undefined when it sets none
 * @returns the word for the résumé's live destination link
 */
export function liveLinkLabel(liveLabel?: string): string {
  const override = liveLabel?.trim();
  // No override means the project makes no claim beyond the default CTA, and
  // the default CTA is the live product.
  if (!override) return 'Live';
  return override.replace(CTA_VERBS, '').trim() || override;
}
