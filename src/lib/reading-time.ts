/**
 * reading-time.ts — shared reading-time estimator for blog posts.
 *
 * Used by both `src/pages/blog/[...slug].astro` and `src/pages/blog/index.astro`,
 * where the same algorithm previously lived inline in each file (#342 → #115
 * CodeRabbit nit on PR #115). Extracted here so future tweaks to the wpm
 * baseline or the code-block weight don't have to be applied in two places
 * — and so the two callers don't silently drift apart.
 *
 * Algorithm:
 *   1. Strip fenced code blocks (```...```) out of the body. Their word
 *      count gets weighted at 30% — readers skim code faster than prose
 *      on this site's posts, where code snippets illustrate but don't
 *      require word-level reading.
 *   2. Sum prose words (full weight) + code words (× 0.3).
 *   3. Divide by 225 words per minute (the standard prose wpm baseline).
 *   4. Round up; clamp to a 1-minute floor (a one-paragraph post should
 *      not read as "0 min").
 *
 * Returns numeric minutes; each call site formats its own suffix
 * ("X min" on the index card vs "X min read" on the post page).
 */

const WORDS_PER_MINUTE = 225;
const CODE_WEIGHT = 0.3;
const FENCED_CODE_BLOCK = /```[\s\S]*?```/g;
const WHITESPACE = /\s+/;

/**
 * Estimate reading time in whole minutes for a Markdown body.
 * Returns 1 for empty / missing input.
 */
export function estimateReadingMinutes(body: string | undefined | null): number {
  if (!body) return 1;
  const codeBlocks: string[] = [];
  const prose = body.replace(FENCED_CODE_BLOCK, (block) => {
    codeBlocks.push(block);
    return ' ';
  });
  const proseWords = prose.trim().split(WHITESPACE).filter(Boolean).length;
  // Strip the opening (with optional language tag) and closing fence tokens
  // before counting so the ``` delimiters aren't tallied as code words —
  // each fenced block would otherwise contribute 2 phantom "words".
  const codeWords = codeBlocks.reduce((n, b) => {
    const codeOnly = b.replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '');
    return n + codeOnly.split(WHITESPACE).filter(Boolean).length;
  }, 0);
  const minutes = Math.ceil((proseWords + codeWords * CODE_WEIGHT) / WORDS_PER_MINUTE);
  return Math.max(1, minutes);
}
