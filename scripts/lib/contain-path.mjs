/**
 * Path-containment helper (#456).
 *
 * Frontmatter-supplied asset paths (e.g. `screenshotSrc: "/images/x.png"`)
 * are joined into a base directory before writing. A value containing `..`
 * segments (`/../../etc/x`) would escape the base after normalization, so
 * callers must resolve through this helper instead of join()ing directly.
 */
import { resolve, sep } from 'node:path';

/**
 * Resolve a "/"-rooted child path against baseDir, returning the absolute
 * destination only when it stays strictly inside baseDir — null otherwise
 * (including for the base directory itself, which is never a valid file
 * destination).
 */
export function containedJoin(baseDir, childPath) {
  const base = resolve(baseDir);
  const dest = resolve(base, String(childPath).replace(/^\/+/, ''));
  return dest.startsWith(base + sep) ? dest : null;
}
