import { readFileSync } from 'fs';
import { relative, resolve } from 'path';
import { expect } from 'vitest';
import { findFilesRecursively } from '../../scripts/lib/blog-file-inventory.mjs';

/**
 * #910 — one implementation of the "this module is the only copy" guard.
 *
 * The first cut of this had each suite hand-roll its own residue walk and had
 * the class test look for the string `findFilesRecursively` in the file. Codex
 * pointed out that an import, a comment, or dead code satisfies a token match,
 * so the enforcement was itself unenforced — three copies of a guard, checked
 * by a substring. Which is the failure this whole change is about.
 *
 * So the guard lives here once, the registry below names what it protects, and
 * `tests/shared-single-sources.test.js` RUNS it for every entry rather than
 * grepping for evidence that someone else ran it.
 */

const SRC = resolve(__dirname, '../../src');

/** Code files only: `.css` defines the classes, `.md` frontmatter uses the vocabulary. */
const isCode = (file) => /\.(astro|ts|js|mjs)$/.test(file);

const walkSrc = () => findFilesRecursively(SRC, isCode).map((file) => relative(SRC, file));

/**
 * Every `src/lib/` module that `.ai_context.md` documents as a shared single
 * source. `declares` identifies a DECLARATION of the vocabulary, not a use of
 * it — consumers read these values, only a second copy states them.
 */
export const SINGLE_SOURCES = [
  {
    module: 'src/lib/blog-order.ts',
    label: 'blog category vocabulary',
    // Quote-agnostic: a copy written with backticks is still a copy. The
    // original guard matched only ' and ", which Codex caught.
    declares: (source) =>
      /['"`](?:Agent Systems|Building This Site)['"`]/.test(source) ||
      /BLOG_CATEGORIES\s*=/.test(source),
    importers: ['content.config.ts', 'pages/index.astro', 'pages/blog/index.astro'],
  },
  {
    module: 'src/lib/index-grid.ts',
    label: 'index row → accent mapping',
    // The MAPPING, not the key names. A copy is recognized by pairing a cycle
    // row class with an accent class, however it spells the container — tuples
    // and renamed keys are caught, an unrelated `rowClass` variable is not, and
    // the blog index's static `grid-row--rss` never matches the cycle pattern.
    declares: (source) =>
      /grid-row--(?:[1-4]|overflow-[ab])/.test(source) &&
      /accent-(?:red|yellow|paper|blue|black)/.test(source),
    importers: ['pages/projects/index.astro', 'pages/blog/index.astro'],
  },
  {
    module: 'src/lib/lifecycle-marker.ts',
    label: 'status → marker mapping',
    declares: (source) => /STATUS_MARKER\s*[:=]|state-marker--\$\{/.test(source),
    importers: ['pages/index.astro', 'pages/projects/index.astro', 'components/MetadataStrip.astro'],
  },
];

const importSpecifier = (modulePath) =>
  new RegExp(`from '[./]*${modulePath.replace(/^src\//, '').replace(/\.[^.]+$/, '')}'`);

/** The residue sweep: nothing outside the module may declare its vocabulary. */
export function assertSoleDeclaration(entry) {
  const own = entry.module.replace(/^src\//, '');
  const offenders = walkSrc()
    .filter((file) => file !== own)
    .filter((file) => entry.declares(readFileSync(resolve(SRC, file), 'utf-8')))
    .map((file) => `src/${file}`);

  expect(offenders, `${entry.label} declared outside ${entry.module}`).toEqual([]);
}

/**
 * The control for the sweep above. A zero-hit "no duplicates" assertion is
 * worthless unless the same walk demonstrably reaches the files that would
 * carry a duplicate, and those files demonstrably import the shared module.
 */
export function assertImportersUseIt(entry) {
  const walked = walkSrc();
  const specifier = importSpecifier(entry.module);

  for (const surface of entry.importers) {
    expect(walked, `the residue walk never reached ${surface}`).toContain(surface);
    expect(
      readFileSync(resolve(SRC, surface), 'utf-8'),
      `${surface} does not import ${entry.module}`,
    ).toMatch(specifier);
  }
}
