/**
 * Mux playback-ID shape, shared by the content schema (src/content.config.ts)
 * and the prebuild GIF refresher (scripts/refresh-mux-gifs.mjs).
 *
 * Mux playback IDs are alphanumeric. The value is interpolated into
 * stream.mux.com / image.mux.com URLs at build time and in the page, so
 * anything else — a slash, a dot segment, a query or fragment character —
 * would change which URL is requested rather than which asset. Rejecting it at
 * the schema fails the build with a content error; the script checks again
 * because it runs before Astro and reads frontmatter directly.
 */
export const MUX_PLAYBACK_ID_PATTERN = /^[A-Za-z0-9]+$/;

/**
 * @param {unknown} value
 * @returns {value is string}
 */
export function isMuxPlaybackId(value) {
  return typeof value === 'string' && MUX_PLAYBACK_ID_PATTERN.test(value);
}
