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

const ROOT = resolve(__dirname, '../..');
const SRC = resolve(ROOT, 'src');

/** Code files only: `.css` defines the classes, `.md` frontmatter uses the vocabulary. */
const isCode = (file) => /\.(astro|ts|js|mjs)$/.test(file);

/**
 * The sweep walks `src/` and nothing else, deliberately.
 *
 * A test that restates a vocabulary is not a second copy — it is how you detect
 * the source changing, and it only works by staying independent. #737/#912 make
 * that explicit for the blog categories: `tests/content-schema.test.js` holds
 * the literal pair on purpose, because importing `BLOG_CATEGORIES` would let a
 * widened enum satisfy the assertion the moment it was widened. The same is
 * true of the six-row palette restated in `tests/index-grid.test.js`.
 *
 * Scanning `tests/` would flag both and push people toward exactly the imports
 * that make those assertions vacuous.
 */

/**
 * Repo-relative path with forward slashes on every platform.
 *
 * `findFilesRecursively` joins with `node:path`, so `relative()` hands back
 * backslashes on Windows while the registry below is written with slashes.
 * Every comparison here is exact — `file !== own` to exclude the module,
 * `toContain(surface)` for the importer control — so unnormalized separators
 * would not merely miss a duplicate: they would report the canonical module
 * as its own offender and fail the importer control, on a clean checkout.
 * Same class as the CRLF gap #908 hit, in a repo where #906 was a Windows fix.
 */
export const toPosix = (path) => path.split('\\').join('/');

/**
 * Drop whole-line comments before a predicate reads the source.
 *
 * Codex: a `src/` file that merely DISCUSSES a vocabulary in prose — say
 * `// rows run grid-row--1 through grid-row--4, accent-red first` — trips a
 * raw-text predicate and reds a required gate over a sentence. A guard that
 * fails a correct tree gets deleted, which is the same reason the Windows
 * path bug mattered.
 *
 * Whole-line only, and deliberately not a comment parser. Stripping trailing
 * `//` mid-line means deciding whether it sits inside a string, and a regex
 * that gets that wrong eats real code — turning a loud false positive into a
 * silent false negative. Silent failure is this PR's entire subject, so the
 * trade only goes one way: a prose line that opens with a comment marker is
 * safe to drop, anything else is left for the predicate to judge. A
 * commented-out copy is dropped too, correctly — it declares nothing.
 */
export const stripCommentLines = (source) =>
  source
    .split('\n')
    .filter((line) => !/^\s*(?:\/\/|\/\*|\*|<!--)/.test(line))
    .join('\n');

/** Single entry point, so samples and the sweep go through the same pipeline. */
export const declaresIn = (entry, source) => entry.declares(stripCommentLines(source));

const walkSrc = () => findFilesRecursively(SRC, isCode).map((file) => toPosix(relative(SRC, file)));

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
    // One sample per BRANCH of the predicate above, so a branch that stops
    // matching is caught even while the others still fire.
    samples: [
      "const c = ['Agent Systems'];",
      'const c = ["Building This Site"];',
      'const c = [`Agent Systems`];',
      'export const BLOG_CATEGORIES = [];',
    ],
    counterSamples: [
      "import { BLOG_CATEGORIES } from './lib/blog-order';",
      'category: z.enum(BLOG_CATEGORIES),',
      'const category = post.data.category;',
      "// 'Agent Systems' remains the first category",
      ' * The vocabulary is `Agent Systems` and `Building This Site`.',
    ],
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
    // A conjunction, so the samples vary the SHAPE (object, tuple, renamed
    // keys) while the counter-samples hold one half without the other.
    samples: [
      "{ rowClass: 'grid-row--1', accentClasses: ['accent-red'] }",
      "[['grid-row--overflow-a', ['accent-blue']]]",
      "{ cls: 'grid-row--4', tints: ['accent-yellow'] }",
    ],
    counterSamples: [
      '<div class="grid-row--rss">',
      "const t = { rowClass: 'data-table__row', accentClasses: ['muted'] };",
      'class="accent-red"',
      '// rows run grid-row--1 through grid-row--4, accent-red first',
      ' * grid-row--overflow-a carries accent-blue.',
    ],
    importers: ['pages/projects/index.astro', 'pages/blog/index.astro'],
  },
  {
    module: 'src/lib/lifecycle-marker.ts',
    label: 'status → marker mapping',
    declares: (source) => /STATUS_MARKER\s*[:=]|state-marker--\$\{/.test(source),
    samples: ['const STATUS_MARKER = {};', 'const c = `state-marker--${status}`;'],
    counterSamples: [
      "import { stateMarkerClass } from '../lib/lifecycle-marker';",
      '<span class="state-marker">',
    ],
    importers: ['pages/index.astro', 'pages/projects/index.astro', 'components/MetadataStrip.astro'],
  },
];

const importSpecifier = (modulePath) =>
  new RegExp(`from '[./]*${modulePath.replace(/^src\//, '').replace(/\.[^.]+$/, '')}'`);

/** The residue sweep: nothing outside the module may declare its vocabulary. */
export function assertSoleDeclaration(entry) {
  const own = entry.module.replace(/^src\//, '');

  // Controls for the PREDICATE, before the sweep relies on it.
  //
  // The sweep excludes the canonical module and then asserts an empty offender
  // list, so a `declares` that matches nothing — mistyped, or left behind when
  // the vocabulary was renamed — passes while every duplicate goes invisible.
  // The importer control below proves the WALK reaches the right files; these
  // prove the PREDICATE can tell a declaration from a use.
  //
  // Matching the canonical module is necessary but NOT sufficient: `declares`
  // is a disjunction for two of the three entries, so one dead branch hides
  // behind a live one. The samples exercise the branches individually.
  expect(
    declaresIn(entry, readFileSync(resolve(ROOT, entry.module), 'utf-8')),
    `${entry.label}: declares() does not match ${entry.module} itself, so the sweep ` +
      'below would report zero offenders no matter what src/ contains.',
  ).toBe(true);

  for (const sample of entry.samples) {
    expect(
      declaresIn(entry, sample),
      `${entry.label}: declares() misses a known declaration — ${sample}`,
    ).toBe(true);
  }

  for (const sample of entry.counterSamples) {
    expect(
      declaresIn(entry, sample),
      `${entry.label}: declares() false-positives on a non-declaration — ${sample}`,
    ).toBe(false);
  }

  const offenders = walkSrc()
    .filter((file) => file !== own)
    .filter((file) => declaresIn(entry, readFileSync(resolve(SRC, file), 'utf-8')))
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
