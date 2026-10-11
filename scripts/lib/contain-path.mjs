/**
 * Path-containment helper (#456).
 *
 * Frontmatter-supplied asset paths (e.g. `screenshotSrc: "/images/x.png"`)
 * are joined into a base directory before writing. A value containing `..`
 * segments (`/../../etc/x`) would escape the base after normalization, so
 * callers must resolve through this helper instead of join()ing directly.
 *
 * The check is also symlink-aware (#1081): a symlink committed under the base
 * (a directory, the file itself, or a dangling link) could point outside it,
 * and a write through it would land there even though the lexical path looks
 * contained.
 */
import { lstatSync, realpathSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';

/**
 * The real path of `p`: the realpath of its deepest existing ancestor, with
 * the not-yet-existing segments appended. Returns null when a segment is a
 * dangling symlink, because a write would create its target, wherever it
 * points, and for a symlink loop.
 */
function realpathAllowingMissing(p) {
  const missing = [];
  let current = p;
  for (;;) {
    try {
      return join(realpathSync(current), ...missing);
    } catch (err) {
      if (err.code === 'ELOOP') return null;
      if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') throw err;
      if (err.code === 'ENOENT' && isSymlink(current)) return null;
    }
    const parent = dirname(current);
    if (parent === current) return p;
    missing.unshift(basename(current));
    current = parent;
  }
}

function isSymlink(p) {
  try {
    return lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Resolve a "/"-rooted child path against baseDir, returning the absolute
 * destination only when it stays strictly inside baseDir — null otherwise
 * (including for the base directory itself, which is never a valid file
 * destination). Containment is checked twice: lexically, then again on the
 * real paths, so a symlink under baseDir cannot redirect the write.
 */
export function containedJoin(baseDir, childPath) {
  const base = resolve(baseDir);
  const dest = resolve(base, String(childPath).replace(/^\/+/, ''));
  if (!dest.startsWith(base + sep)) return null;
  const realBase = realpathAllowingMissing(base);
  const realDest = realpathAllowingMissing(dest);
  if (realBase === null || realDest === null) return null;
  return realDest.startsWith(realBase + sep) ? dest : null;
}
