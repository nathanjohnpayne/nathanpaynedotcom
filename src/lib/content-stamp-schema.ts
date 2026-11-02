/**
 * Review-stamp schemas shared by content collections.
 *
 * A review stamp records the SHA-256 of some content as it stood when a person
 * last reviewed it, plus the date. The schema checks only the shape; a test
 * recomputes the hash and fails, with the remedy, when the content changed
 * since. Two collections carry one:
 *
 * - `resumeProjects.claimsReviewed` (#1165): see src/content.config.ts and
 *   tests/resume-claims-review.test.js.
 * - `blog.aiUse` and `projects.aiUse` (#1492, epic #1490): the AI-use
 *   disclosure. `statement` says what agents did and what the owner did, for
 *   the text as it stands now; `reviewed.content` is the hash of the entry's
 *   reader-facing content and of `statement` itself (src/lib/ai-use-stamp.mjs,
 *   #1510) when the owner last confirmed the statement, so editing either one
 *   invalidates it. `reviewed` is not hashed. tests/ai-use-stamp.test.js
 *   recomputes it.
 *
 * Kept free of `astro:content` so `src/content.config.ts` and the tests import
 * the same definitions.
 */
import { z } from 'astro/zod';

/** A lowercase SHA-256 hex digest. */
export const sha256Hex = z
  .string()
  .regex(/^[0-9a-f]{64}$/, 'expected a lowercase SHA-256 hex digest');

/**
 * The `aiUse` disclosure. Strict at both levels, so a misspelled key fails the
 * build instead of passing as a stamp that is merely missing a field. Quote
 * `date` in YAML: an unquoted `2026-11-01` parses as a Date, which
 * `z.iso.date()` rejects.
 *
 * Required on both collections, with no default (#1490, #1498): an entry
 * without it fails the build.
 */
export const aiUseSchema = z.strictObject({
  statement: z.string().trim().min(1),
  reviewed: z.strictObject({
    content: sha256Hex,
    date: z.iso.date(),
  }),
});
