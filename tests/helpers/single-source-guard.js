import { readFileSync } from 'fs';
import { resolve } from 'path';
import { expect } from 'vitest';

/**
 * #910 — what the shared-single-source contract can actually enforce.
 *
 * The first five rounds of this change tried to prove a semantic negative:
 * "no equivalent declaration exists anywhere in src/", decided by regexes over
 * source text. It does not converge, and the review record is the evidence —
 * five Codex rounds produced 4 → 1 → 1 → 5 → 2 findings, every one of them
 * legitimate, because each fix exposed the next thing raw text cannot decide:
 * template literals, tuples, renamed keys, CRLF, path separators, prose
 * comments, block comments, commented-out imports, MDX. Review had become the
 * specification generator for a parser the design explicitly refused to write.
 *
 * The mistake was importing #825's lesson into a place it does not hold. That
 * guard works because both sides are CLOSED DATA — a version range in two
 * files, decided by string equality. "Is this vocabulary declared elsewhere"
 * is not closed data, and treating it as if it were produced a 313-line guard
 * over 91 lines of guarded module.
 *
 * So this enforces only what is decidable, and the prose says plainly what is
 * not. Every check below compares two enumerated lists:
 *
 *   - the documented modules and the registry name the same set
 *   - each named importer actually imports its module
 *
 * The "only copy" rule remains a real rule. It is stated in
 * rules/repo_rules.md and enforced by review, not by this file. An invariant
 * honestly marked unenforced is worth more than one a scan pretends to cover.
 */

const ROOT = resolve(__dirname, '../..');
const SRC = resolve(ROOT, 'src');

/**
 * Every `src/lib/` module that `.ai_context.md` documents as a shared single
 * source, with the surfaces that must import it. `importers` is deliberately
 * an explicit list rather than a discovered one: a closed set is checkable,
 * and "every file that might want this" is not.
 */
export const SINGLE_SOURCES = [
  {
    module: 'src/lib/blog-order.ts',
    label: 'blog category vocabulary',
    importers: ['content.config.ts', 'pages/index.astro', 'pages/blog/index.astro'],
  },
  {
    module: 'src/lib/index-grid.ts',
    label: 'index row → accent mapping',
    importers: ['pages/projects/index.astro', 'pages/blog/index.astro'],
  },
  {
    module: 'src/lib/lifecycle-marker.ts',
    label: 'status → marker mapping',
    importers: ['pages/index.astro', 'pages/projects/index.astro', 'components/MetadataStrip.astro'],
  },
];

/**
 * Match an `import … from '<module>'` declaration, in either quote style, and
 * not on a commented-out line.
 *
 * Bounded on purpose. This asks one closed question about one named file —
 * "does this surface import that module" — which is answerable without knowing
 * what else the file does. The comment test is a leading-marker check on the
 * matched line only, because a commented-out import is the realistic way this
 * assertion goes stale. Anything subtler (a conditional import, a re-export
 * chain) is out of scope by design rather than by oversight.
 */
function importsModule(source, modulePath) {
  const specifier = modulePath.replace(/^src\//, '').replace(/\.[^.]+$/, '');
  const pattern = new RegExp(`from\\s+['"][./]*${specifier.replace(/\//g, '\\/')}['"]`);

  return source
    .split('\n')
    .some((line) => !/^\s*(?:\/\/|\*|<!--)/.test(line) && pattern.test(line));
}

/** Every surface the registry names must import the module it is registered against. */
export function assertImportersUseIt(entry) {
  expect(
    entry.importers.length,
    `${entry.label}: the registry lists no importers, so this check would assert nothing. ` +
      'Name the surfaces that must import the module.',
  ).toBeGreaterThan(0);

  for (const surface of entry.importers) {
    const source = readFileSync(resolve(SRC, surface), 'utf-8');
    expect(
      importsModule(source, entry.module),
      `src/${surface} does not import ${entry.module}. Either restore the import, or ` +
        'drop the surface from the registry and from the .ai_context.md row.',
    ).toBe(true);
  }
}
