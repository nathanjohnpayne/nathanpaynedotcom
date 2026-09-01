/**
 * Lifecycle marker vocabulary — one mapping, every surface that shows a
 * project's lifecycle state (#892, extended to the project detail page).
 *
 * `.state-marker` in global.css owns the geometry; this module owns the
 * *mapping* from a status word to the modifier that selects a mark. Both lived
 * as copy-pasted `STATUS_MARKER` literals in `src/pages/index.astro` and
 * `src/pages/projects/index.astro`. A third copy for the detail page's STATUS
 * cell is what forced the lift: a duplicated vocabulary does not fail the
 * build, it lets one surface quietly disagree with another about what ARCHIVED
 * looks like — the residue defect this repo keeps re-finding in review.
 *
 * Keys are the `status` enum in `src/content.config.ts`. `PAUSED` and
 * `IN PROGRESS` map to modifiers that add no declarations of their own: both
 * render the bare outline, which is the correct mark for "nothing is running
 * yet." They are kept as named hooks rather than dropped so the emitted class
 * still says which state produced the outline.
 */

/** Status word → the `state-marker--{modifier}` that selects its mark. */
export const STATUS_MARKER: Record<string, string> = {
  SHIPPED: 'shipped',
  ARCHIVED: 'archived',
  PAUSED: 'paused',
  EXPERIMENT: 'experiment',
  'IN PROGRESS': 'in-progress',
};

/**
 * Build the class list for a lifecycle status label.
 *
 * `base` carries whatever per-surface classes the element already had — the
 * homepage's `p-status`, the index card's `post-meta project-status`, the
 * detail strip's `metadata-strip__status` — so each surface keeps its own
 * position and type and gains only the mark. Base classes come first, matching
 * the order those surfaces already shipped with. An unmapped status falls
 * through to the bare `.state-marker` outline rather than throwing.
 */
export function stateMarkerClass(status: string, ...base: string[]): string {
  const modifier = STATUS_MARKER[status];
  return [...base, 'state-marker', modifier && `state-marker--${modifier}`]
    .filter(Boolean)
    .join(' ');
}
