/**
 * The AI-use disclosure's anchor (#1493, epic #1490): the one place the id the
 * top "AI use" link points at and the end block carries is spelled.
 *
 * The id is a constant rather than the heading's slug: Astro slugs Markdown
 * headings from their visible text, so a post that ever writes
 * "## How this was written" in its body would otherwise emit a second element
 * with the same id. The `/how-i-write/` path lives in `src/lib/how-i-write.ts`.
 */

/** `id` of the end block (`section#ai-use`). The top link's `href` is `#` plus this. */
export const AI_USE_ID = 'ai-use';

/** `id` of the end block's `h2`, which `aria-labelledby` names. */
export const AI_USE_HEADING_ID = 'ai-use-heading';

/** The top link's visible text, which is also its accessible name. */
export const AI_USE_LINK_LABEL = 'AI use';

/** The end block's heading. */
export const AI_USE_HEADING = 'How this was written';

/** The inline link that closes the statement. */
export const AI_USE_MORE_LABEL = 'More about how I write';
