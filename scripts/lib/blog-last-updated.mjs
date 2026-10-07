import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * A blog post's last-updated time, derived from git history at build time
 * (#1168). The date is not authored: it is the committer timestamp of the
 * newest commit that changed the post's Markdown body, excluding the commit
 * that added the file and any commit listed in `.freshness-ignore-revs`.
 * specs/last-updated.md is the contract; this module is its only
 * implementation, shared by the post layout, the Open Graph meta and the
 * sitemap so those three surfaces cannot disagree.
 */

export const IGNORE_REVS_FILE = '.freshness-ignore-revs';
export const BLOG_CONTENT_DIR = 'src/content/blog';

/** Calendar used for the reader-visible month and the same-month rule. */
export const LAST_UPDATED_TIME_ZONE = 'America/Los_Angeles';

// Same delimiter grammar as scripts/lib/sitemap-frontmatter.mjs, so the
// "body" here is exactly what follows the frontmatter the sitemap reads.
const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---/;
const FULL_SHA_RE = /^[0-9a-f]{40}$/;

/**
 * The Markdown body: everything after the frontmatter block. A file with no
 * frontmatter is all body.
 * @param {string} source
 */
export function markdownBody(source) {
  const match = source.match(FRONTMATTER_RE);
  return match ? source.slice(match[0].length) : source;
}

/**
 * Parse `.freshness-ignore-revs`: one full 40-character commit SHA per line,
 * `#` comments and blank lines allowed. Anything else throws, because a
 * malformed entry would otherwise be silently skipped and the sweep it was
 * meant to hide would show up as an update.
 * @param {string} text
 * @param {string} [label]
 * @returns {Set<string>}
 */
export function parseIgnoreRevs(text, label = IGNORE_REVS_FILE) {
  const revs = new Set();
  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) return;
    if (!FULL_SHA_RE.test(line)) {
      throw new Error(
        `${label}:${index + 1}: expected one full 40-character lowercase commit SHA, got "${line}"`,
      );
    }
    revs.add(line);
  });
  return revs;
}

/**
 * Run git in `repoRoot`. Without `input` the result is a UTF-8 string; with
 * it, a Buffer, because `cat-file --batch` sizes are byte counts.
 */
function git(repoRoot, args, input) {
  const options = { maxBuffer: 512 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] };
  // Pin the settings that change output shape, so a contributor's git config
  // (signature lines in `log`, quoted paths) cannot corrupt the parse.
  const argv = [
    '-C',
    repoRoot,
    '-c',
    'core.quotePath=false',
    '-c',
    'log.showSignature=false',
    '-c',
    'color.ui=never',
    ...args,
  ];
  if (input === undefined) return execFileSync('git', argv, { ...options, encoding: 'utf8' });
  return execFileSync('git', argv, { ...options, input: Buffer.from(input, 'utf8') });
}

/**
 * Fail closed when the history needed to date posts is missing. A shallow
 * clone would otherwise give every post the date of its one visible commit,
 * which looks plausible and is wrong.
 * @param {string} repoRoot
 * @returns {string} the repository's top-level directory
 */
export function assertFullHistory(repoRoot) {
  let topLevel;
  let shallow;
  try {
    topLevel = git(repoRoot, ['rev-parse', '--show-toplevel']).trim();
    shallow = git(repoRoot, ['rev-parse', '--is-shallow-repository']).trim();
  } catch (error) {
    throw new Error(
      `Blog last-updated dates come from git history, but git could not read ${repoRoot}. ` +
        `Build from a git checkout with git on PATH. (${error.message.split('\n')[0]})`,
      { cause: error },
    );
  }
  if (shallow === 'true') {
    throw new Error(
      `Blog last-updated dates come from git history, but ${topLevel} is a shallow clone. ` +
        'Fetch full history (`git fetch --unshallow`, or `fetch-depth: 0` on actions/checkout) ' +
        'rather than build with dates read from a truncated log.',
    );
  }
  return topLevel;
}

function readIgnoreRevs(topLevel) {
  const file = join(topLevel, IGNORE_REVS_FILE);
  if (!existsSync(file)) return new Set();
  const revs = parseIgnoreRevs(readFileSync(file, 'utf8'));
  if (revs.size === 0) return revs;
  // An entry naming no commit is a typo, and a typo here means the intended
  // sweep still counts as an update. Refuse it rather than ignore it.
  const report = git(topLevel, ['cat-file', '--batch-check'], [...revs].map((r) => `${r}^{commit}`).join('\n') + '\n')
    .toString('utf8')
    .trim()
    .split('\n');
  const missing = report.filter((line) => line.endsWith(' missing'));
  if (missing.length > 0) {
    throw new Error(
      `${IGNORE_REVS_FILE} lists commits this repository does not contain: ` +
        missing.map((line) => line.split(' ')[0].replace(/\^\{commit\}$/, '')).join(', '),
    );
  }
  return revs;
}

/**
 * Parse `git log --raw -z --format=%x01%H %cI` output into commits, newest
 * first, each with its file changes.
 */
function parseRawLog(output) {
  return output
    .split('\x01')
    .filter(Boolean)
    .map((chunk) => {
      const headerEnd = chunk.indexOf('\0');
      const [sha, committedAt] = chunk.slice(0, headerEnd).split(' ');
      const tokens = chunk.slice(headerEnd + 1).split('\0');
      const changes = [];
      for (let i = 0; i < tokens.length; i += 1) {
        const meta = tokens[i].replace(/^\n/, '');
        if (!meta.startsWith(':')) continue;
        // :<old mode> <new mode> <old blob> <new blob> <status>[score]
        const [, , oldBlob, newBlob, status] = meta.slice(1).split(' ');
        const kind = status[0];
        if (kind === 'R' || kind === 'C') {
          changes.push({ kind, oldBlob, newBlob, oldPath: tokens[i + 1], newPath: tokens[i + 2] });
          i += 2;
        } else {
          changes.push({ kind, oldBlob, newBlob, oldPath: tokens[i + 1], newPath: tokens[i + 1] });
          i += 1;
        }
      }
      return { sha, committedAt, changes };
    });
}

/** Read many blobs through one `git cat-file --batch` process. */
function readBlobs(topLevel, blobIds) {
  const blobs = new Map();
  if (blobIds.length === 0) return blobs;
  const output = git(topLevel, ['cat-file', '--batch'], blobIds.join('\n') + '\n');
  let offset = 0;
  for (const id of blobIds) {
    const headerEnd = output.indexOf(0x0a, offset);
    const [, type, size] = output.subarray(offset, headerEnd).toString('utf8').split(' ');
    if (type !== 'blob') throw new Error(`git cat-file returned ${type} for blob ${id}`);
    const start = headerEnd + 1;
    const end = start + Number(size);
    blobs.set(id, output.subarray(start, end).toString('utf8'));
    offset = end + 1;
  }
  return blobs;
}

/**
 * Compute the last-updated time of every Markdown file committed under
 * `contentDir` at HEAD.
 *
 * One `git log` walks the directory's history newest first with rename
 * detection, following each current file back through its renames until the
 * commit that added it. One `git cat-file --batch` then reads the blobs on
 * both sides of every candidate change, and the newest change whose body
 * differs wins. Frontmatter-only edits, pure renames, the adding commit and
 * ignored commits never count.
 *
 * @param {object} options
 * @param {string} options.repoRoot any directory inside the repository
 * @param {string} [options.contentDir] repository-relative directory
 * @param {Set<string>} [options.ignoreRevs] overrides `.freshness-ignore-revs`
 * @returns {Map<string, Date>} absolute file path → last-updated time; files
 *   with no qualifying change are absent
 */
export function computeLastUpdated({ repoRoot, contentDir = BLOG_CONTENT_DIR, ignoreRevs }) {
  const topLevel = assertFullHistory(repoRoot);
  const ignored = ignoreRevs ?? readIgnoreRevs(topLevel);

  const current = git(topLevel, ['ls-tree', '-r', '-z', '--name-only', 'HEAD', '--', contentDir])
    .split('\0')
    .filter((path) => path.endsWith('.md'));
  // path as it was at the point in history being read → path at HEAD
  const lineage = new Map(current.map((path) => [path, path]));

  const log = git(topLevel, [
    'log',
    '-M',
    '--raw',
    '--no-abbrev',
    '-z',
    '--format=%x01%H %cI',
    'HEAD',
    '--',
    contentDir,
  ]);

  /** @type {Map<string, {sha: string, committedAt: string, oldBlob: string, newBlob: string}[]>} */
  const candidates = new Map();
  for (const commit of parseRawLog(log)) {
    for (const change of commit.changes) {
      const tracked = lineage.get(change.newPath);
      if (!tracked) continue;
      if (change.kind === 'A' || change.kind === 'C') {
        // The commit that brought the file into being publishes it; it is
        // not an update. Older history on this path belongs to another file.
        lineage.delete(change.newPath);
        continue;
      }
      if (change.kind === 'R') {
        lineage.delete(change.newPath);
        lineage.set(change.oldPath, tracked);
      }
      if (change.kind === 'D' || ignored.has(commit.sha)) continue;
      if (change.oldBlob === change.newBlob) continue;
      if (!candidates.has(tracked)) candidates.set(tracked, []);
      candidates.get(tracked).push({
        sha: commit.sha,
        committedAt: commit.committedAt,
        oldBlob: change.oldBlob,
        newBlob: change.newBlob,
      });
    }
  }

  const blobIds = [
    ...new Set([...candidates.values()].flat().flatMap((c) => [c.oldBlob, c.newBlob])),
  ];
  const blobs = readBlobs(topLevel, blobIds);

  const result = new Map();
  for (const [path, changes] of candidates) {
    const winner = changes.find(
      (c) => markdownBody(blobs.get(c.oldBlob)) !== markdownBody(blobs.get(c.newBlob)),
    );
    if (winner) result.set(join(topLevel, path), new Date(winner.committedAt));
  }
  return result;
}

const CACHE = Symbol.for('nathanpayne.blogLastUpdated');

/**
 * The blog's last-updated map for the repository containing `repoRoot`,
 * computed once per process. Astro evaluates the config and the page bundle
 * as separate module graphs; the global cache keeps that to one git pass.
 * @param {string} [repoRoot]
 * @returns {Map<string, Date>}
 */
export function getBlogLastUpdated(repoRoot = process.cwd()) {
  const cache = (globalThis[CACHE] ??= new Map());
  const key = resolve(repoRoot);
  if (!cache.has(key)) cache.set(key, computeLastUpdated({ repoRoot: key }));
  return cache.get(key);
}

/**
 * Look a file up in a last-updated map. Keys are git's real top-level paths,
 * so the lookup resolves symlinks (macOS's /var → /private/var among them).
 * @param {Map<string, Date>} map
 * @param {string} filePath absolute, or relative to the working directory
 * @returns {Date | undefined}
 */
export function lastUpdatedFor(map, filePath) {
  const absolute = resolve(filePath);
  if (map.has(absolute)) return map.get(absolute);
  try {
    return map.get(realpathSync(absolute));
  } catch {
    return undefined;
  }
}

/**
 * The modification time search surfaces carry: the last update when it is
 * later than publication, otherwise the publication date.
 * @param {Date} published
 * @param {Date | undefined} updated
 */
export function effectiveModified(published, updated) {
  return updated && updated.getTime() > published.getTime() ? updated : published;
}

function monthIndex(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: 'numeric' })
    .formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year').value);
  const month = Number(parts.find((p) => p.type === 'month').value);
  return year * 12 + month;
}

/**
 * Whether the page shows an "Updated" row. `published` is a calendar date
 * (frontmatter `date`, midnight UTC, rendered in UTC); `updated` is an
 * instant, read in Pacific time. The row appears only when the update falls
 * in a later month than publication.
 * @param {Date} published
 * @param {Date | undefined} updated
 */
export function showsUpdatedMonth(published, updated) {
  if (!updated) return false;
  return monthIndex(updated, LAST_UPDATED_TIME_ZONE) > monthIndex(published, 'UTC');
}

/**
 * Reader-visible month and year, e.g. "October 2026".
 * @param {Date} updated
 */
export function formatUpdatedMonth(updated) {
  return updated.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    timeZone: LAST_UPDATED_TIME_ZONE,
  });
}
