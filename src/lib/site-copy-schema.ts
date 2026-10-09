/**
 * Site-copy schemas — one per entry in `src/content/site-copy/` (#1166).
 *
 * Each entry owns the descriptive copy one page (or one publication) repeats
 * across its surfaces: page metadata, JSON-LD, the build-time share card, and
 * the short introductions other pages quote. Before #1166 most of these were
 * typed into templates separately, so an edit to one rendition never reached
 * the others.
 *
 * The entries have different shapes, so the collection schema is a union of
 * these strict objects and `getSiteCopy()` (src/lib/site-copy.ts) re-parses an
 * entry with the schema for its own id. That second parse is what types the
 * result per entry and what catches a file whose fields satisfy a different
 * member of the union. Every field is required: no consumer has a fallback, so
 * a missing field fails the build instead of shipping an empty tag.
 *
 * Kept free of `astro:content` so `src/content.config.ts` can import it.
 */
import { z } from 'astro/zod';

const copy = () => z.string().trim().min(1);

/** Placeholder the projects description carries for the derived project count. */
export const PROJECT_COUNT_PLACEHOLDER = '{count}';

export const SITE_COPY_SCHEMAS = {
  /** `/blog/` and the publication it indexes ("The AI-Augmented PM"). */
  blog: z.strictObject({
    /** Publication name: `/blog/` heading and card, RSS channel title, feed-discovery link title, résumé Writing proposition. */
    title: copy(),
    /** `/blog/` deck, metadata and share card. */
    description: copy(),
    /** Homepage Writing introduction. */
    homepageWritingDescription: copy(),
    /** RSS channel description. */
    feedDescription: copy(),
    /** Résumé Writing introduction. */
    resumeDescription: copy(),
  }),
  /** `/projects/` and the introductions other pages give it. */
  projects: z.strictObject({
    /**
     * Meta description and CollectionPage JSON-LD. Carries `{count}`, which
     * the page replaces with the published project count spelled as a word,
     * so a drafted or added project cannot leave a stale number behind.
     */
    description: copy().refine((value) => value.includes(PROJECT_COUNT_PLACEHOLDER), {
      message: `projects description must carry the ${PROJECT_COUNT_PLACEHOLDER} placeholder`,
    }),
    /** og:description, twitter:description and the projects share card. */
    ogDescription: copy(),
    /** Homepage Selected Projects introduction. */
    homepageDescription: copy(),
    /** Résumé Projects introduction. */
    resumeDescription: copy(),
  }),
  /** The homepage. */
  home: z.strictObject({
    /** Meta, og and twitter description, and the WebSite and ProfilePage JSON-LD description. */
    description: copy(),
    /** The Person JSON-LD description: a third-person sentence about Nathan rather than the site. */
    personDescription: copy(),
    /** The homepage share card's line, shorter than the 1200×630 card can fit `description` at its size. */
    shareImageDescription: copy(),
  }),
  /** `/resume/`. */
  resume: z.strictObject({
    /** Meta, og and twitter description, ProfilePage JSON-LD, and the résumé share card. */
    description: copy(),
  }),
  /**
   * `/privacy/` (#1079, behind the privacy flag). The route exists only when
   * `privacyControlsEnabled()`, but the entry is validated on every build so a
   * flag flip cannot be the first time its copy is read.
   */
  privacy: z.strictObject({
    /** Meta description and the page's deck. */
    description: copy(),
    /** og:description and twitter:description: the share-card line. */
    ogDescription: copy(),
  }),
} as const;

export type SiteCopyId = keyof typeof SITE_COPY_SCHEMAS;
export type SiteCopy<K extends SiteCopyId> = z.infer<(typeof SITE_COPY_SCHEMAS)[K]>;

/**
 * The collection schema. `z.union` accepts the first strict member that
 * parses, so it guarantees only that an entry matches *some* member's exact
 * key set; it does not enforce that the member is the one for the entry's id.
 * Each member's keys differ today, so no entry matches two, but nothing here
 * keeps it that way. `getSiteCopy` re-parses each entry against the schema for
 * its own id, and that per-id check is the real guard.
 */
export const siteCopySchema = z.union([
  SITE_COPY_SCHEMAS.blog,
  SITE_COPY_SCHEMAS.projects,
  SITE_COPY_SCHEMAS.home,
  SITE_COPY_SCHEMAS.resume,
  SITE_COPY_SCHEMAS.privacy,
]);
