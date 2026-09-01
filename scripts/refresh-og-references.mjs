#!/usr/bin/env node
/**
 * refresh-og-references.mjs — mirror the built OG cards into `screenshots/og/`.
 *
 * `screenshots/og/` is a convenience for humans and agents reading the repo: a
 * reviewer can look at a social card without running a build. It is NOT a build
 * input — `dist/og/**` is generated at build time and is what actually ships,
 * so a stale reference misleads a reviewer rather than serving a wrong card to
 * a visitor (#876).
 *
 * The whole set was captured once, on 2026-04-11, and then drifted: templates
 * changed without the references following, and three project pages shipped
 * that never got one at all. A reference set that is wrong is worse than none,
 * because it invites trust. This script makes refreshing it one command.
 *
 * **Bytes are not the signal.** PNG encoding varies between runs, so every file
 * differs byte-wise from its freshly built counterpart even when the rendered
 * card is identical. `cmp` is therefore useless as a staleness check, and this
 * script does not attempt one — it mirrors unconditionally and reports what it
 * did. Deciding whether a card *should* have changed is a human read.
 *
 * Naming: `dist/og/<section>/<slug>.png` flattens to
 * `screenshots/og/<section>-<slug>.png`; a top-level `dist/og/<name>.png` keeps
 * its name. The flattening is mechanical so the mapping stays predictable —
 * the one hand-abbreviated legacy name is replaced by its full slug.
 *
 * **The flatten is not injective**, and the script refuses rather than guesses:
 * `blog/foo/bar.png` and `blog/foo-bar.png` both map to `blog-foo-bar.png`, so
 * a nested route could silently overwrite a sibling's reference while the run
 * still reported success. Collisions abort before anything is copied.
 *
 * Usage:
 *   npm run build && node scripts/refresh-og-references.mjs
 *   node scripts/refresh-og-references.mjs --dry-run
 */

import { readdirSync, statSync, copyFileSync, mkdirSync, existsSync, unlinkSync } from 'fs';
import { join, relative, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'dist', 'og');
const TARGET = join(ROOT, 'screenshots', 'og');
const dryRun = process.argv.includes('--dry-run');

function collectPngs(dir, base = dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return collectPngs(full, base);
    return full.endsWith('.png') ? [relative(base, full)] : [];
  });
}

/** `blog/six-prs.png` -> `blog-six-prs.png`; `home.png` -> `home.png`. */
function flatten(relPath) {
  return relPath.split(/[/\\]/).join('-');
}

if (!existsSync(SOURCE)) {
  console.error(
    `[refresh-og-references] ${relative(ROOT, SOURCE)} not found. Run \`npm run build\` first — ` +
      `the OG cards are generated at build time.`,
  );
  process.exit(1);
}

const built = collectPngs(SOURCE);
if (built.length === 0) {
  console.error(`[refresh-og-references] no PNGs under ${relative(ROOT, SOURCE)}; nothing to mirror.`);
  process.exit(1);
}

// Detect collisions before writing anything. Two source paths flattening to
// one reference name would leave a missing card behind a successful-looking
// run, which is the same misleading-reviewer failure this script exists to fix.
const byName = new Map();
for (const relPath of built) {
  const name = flatten(relPath);
  byName.set(name, [...(byName.get(name) ?? []), relPath]);
}
const collisions = [...byName.entries()].filter(([, sources]) => sources.length > 1);
if (collisions.length > 0) {
  console.error('[refresh-og-references] flattened-name collisions; nothing was written:');
  for (const [name, sources] of collisions) {
    console.error(`  ${name} <- ${sources.join(', ')}`);
  }
  console.error(
    '  Rename one of the source routes, or teach flatten() an unambiguous encoding.',
  );
  process.exit(1);
}

const expected = new Set(byName.keys());
mkdirSync(TARGET, { recursive: true });

let written = 0;
let added = 0;
for (const relPath of built.sort()) {
  const name = flatten(relPath);
  const dest = join(TARGET, name);
  const isNew = !existsSync(dest);
  if (!dryRun) copyFileSync(join(SOURCE, relPath), dest);
  written += 1;
  if (isNew) {
    added += 1;
    console.log(`  ${dryRun ? 'would add ' : 'added    '} ${name}`);
  }
}

// A reference whose template was deleted or renamed is orphaned: it depicts a
// card the site no longer serves, which is the same misleading-reviewer problem
// in a different shape.
const orphans = existsSync(TARGET)
  ? readdirSync(TARGET).filter((f) => f.endsWith('.png') && !expected.has(f))
  : [];
for (const orphan of orphans) {
  if (!dryRun) unlinkSync(join(TARGET, orphan));
  console.log(`  ${dryRun ? 'would remove' : 'removed  '} ${orphan}`);
}

console.log(
  `[refresh-og-references] ${dryRun ? 'would mirror' : 'mirrored'} ${written} card(s) ` +
    `(${added} new, ${orphans.length} orphaned) into ${relative(ROOT, TARGET)}/`,
);
