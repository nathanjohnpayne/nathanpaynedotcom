import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * #825 — the toolchain pins in `rules/repo_rules.md` § Toolchain Constraints and
 * the ranges in `package.json` can diverge silently, and nothing noticed twice
 * running: #738 widened the `typescript` ceiling to `<7.1.0` while the rule file
 * still said `<6.1.0`, #824 restored it by hand, and #886 re-widened it four
 * days later. Both times the lockfile still resolved `6.0.3` — a version
 * satisfying either range — so `npm ci`, lint, and the full test suite stayed
 * green while the guard itself was gone.
 *
 * The check reads the machine-readable pin block rather than the prose. #825
 * weighed both designs and this is the one it picked: a check that breaks when
 * someone rephrases a sentence trains people to weaken the check, and this
 * section in particular *cannot* be prose-parsed — its narrative quotes the
 * breach ceiling `<7.1.0` and `typescript-eslint`'s peer `<6.1.0` in the same
 * bullet as the normative value, so any literal-scanner would either flag the
 * history or need a carve-out big enough to hide a real drift.
 *
 * Two assertions do not depend on the block's own numbers being right, which
 * matters because the block is as editable as the manifest is:
 *
 *   - the `typescript` ceiling is re-derived from the peer ranges recorded in
 *     `package-lock.json`, so widening the ceiling in *both* files still fails;
 *   - the Markdown-processor trio is checked against astro's declared optional
 *     peer and mdx's exact dependency, so the pins are validated against the
 *     registry's own coupling rather than against a number written by hand.
 *
 * Placement is deliberate. This runs in `npm test`, which reports as
 * `build-and-test` — one of the two names in `.github/required-head-checks`
 * that `dependabot-auto-merge.yml` waits on. A `scripts/ci/check_*` would have
 * to be wired in the never-propagated `repo_lint_local.yml` annex (repo_lint.yml
 * is manifest-canonical) and would report as `repo-lint-local`, which neither
 * that workflow nor `scripts/required-head-checks.sh` observes — blind to the
 * grouped Dependabot PRs that are this guard's entire threat model.
 */

const rootDir = resolve(__dirname, '..');
const rulesPath = resolve(rootDir, 'rules/repo_rules.md');

// Newlines are normalized before matching: .gitattributes pins `eol=lf` only
// for *.svg, so a Windows checkout with core.autocrlf=true hands this file CRLF
// and an \n-anchored fence pattern would throw on a perfectly valid block.
const rulesText = readFileSync(rulesPath, 'utf-8').replace(/\r\n/g, '\n');
const manifest = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
const lockfile = JSON.parse(readFileSync(resolve(rootDir, 'package-lock.json'), 'utf-8'));

const PIN_BLOCK = /<!--\s*toolchain-pins:begin[\s\S]*?-->\s*```json\n([\s\S]*?)\n```\s*<!--\s*toolchain-pins:end\s*-->/;

function readPinBlock() {
  const match = rulesText.match(PIN_BLOCK);
  if (!match) {
    throw new Error(
      'rules/repo_rules.md has no toolchain-pins block. Expected a fenced ```json block ' +
        'between <!-- toolchain-pins:begin --> and <!-- toolchain-pins:end -->.',
    );
  }
  return JSON.parse(match[1]);
}

const pins = readPinBlock();

/** The lockfile entry for a top-level package, or `undefined` if it is absent. */
function lockEntry(name) {
  return lockfile.packages?.[`node_modules/${name}`];
}

/**
 * Upper bound of a semver range, as a comparable [major, minor, patch] tuple,
 * or `null` for "unbounded above".
 *
 * Deliberately partial: it understands only the range forms this repo's
 * manifest and its installed peers actually use, and throws on anything else.
 * Failing closed on an unrecognized form is the point — a peer range the parser
 * cannot read is a range nobody has reasoned about, and a silent `null` there
 * would read as "no ceiling" and pass the very comparison this exists to make.
 */
function upperBound(range) {
  const union = range.split('||').map((clause) => clause.trim());
  let widest = null;

  for (const clause of union) {
    let bound = null;

    for (const term of clause.split(/\s+/).filter(Boolean)) {
      const caret = term.match(/^\^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
      const less = term.match(/^<(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
      // An exact peer (`6.0.3`, `=6.0.3`) is a *bounded* range: it admits one
      // version and nothing above it. Folding it in with `>=` would report it
      // as unbounded and admit any declared ceiling — the silent widening this
      // whole file exists to catch.
      const exact = term.match(/^=?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
      const floor = /^>=?\d+\.\d+\.\d+(?:[-+].*)?$/.test(term);

      let termBound = null;
      if (caret) {
        const [major, minor, patch] = caret.slice(1, 4).map(Number);
        // npm's caret semantics: the leftmost non-zero component is what stays fixed.
        if (major > 0) termBound = [major + 1, 0, 0];
        else if (minor > 0) termBound = [0, minor + 1, 0];
        else termBound = [0, 0, patch + 1];
      } else if (less) {
        termBound = less.slice(1, 4).map(Number);
      } else if (exact) {
        const [major, minor, patch] = exact.slice(1, 4).map(Number);
        termBound = [major, minor, patch + 1]; // exclusive upper for a single version
      } else if (!floor) {
        throw new Error(
          `Unsupported semver range term "${term}" in "${range}". ` +
            'tests/toolchain-pins.test.js only parses the forms this repo uses ' +
            '(^x.y.z, <x.y.z, >x.y.z, >=x.y.z, x.y.z, =x.y.z, and || unions). ' +
            'Extend the parser rather than loosening it.',
        );
      }
      // A recognized `>=x.y.z` / `>x.y.z` leaves termBound null: it is a floor,
      // not a ceiling, and contributes nothing to the upper bound.

      // Terms within a clause are ANDed: the tightest ceiling wins.
      if (termBound && (bound === null || compare(termBound, bound) < 0)) bound = termBound;
    }

    // Clauses are ORed: the widest ceiling wins, and one unbounded clause
    // makes the whole union unbounded.
    if (bound === null) return null;
    if (widest === null || compare(bound, widest) > 0) widest = bound;
  }

  return widest;
}

function compare(a, b) {
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

const fmt = (bound) => (bound === null ? 'unbounded' : bound.join('.'));

describe('toolchain pins (#825)', () => {
  it('declares a parseable pin block with the fields the rest of this suite reads', () => {
    expect(pins.markdownProcessorLockstep).toEqual(
      expect.arrayContaining(['astro', '@astrojs/markdown-remark', '@astrojs/mdx']),
    );
  });

  it('records every protected package in the block, so none can drop out of coverage', () => {
    // Every list here is BOTH the source of truth and the thing that generates
    // the assertions below, so an entry deleted from one silently deletes its
    // own coverage while everything else keeps passing. This is the floor.
    expect(
      Object.keys(pins.devDependencies ?? {}),
      'a pin dropped out of the block would take its own check with it',
    ).toEqual(expect.arrayContaining(['typescript', ...pins.markdownProcessorLockstep]));

    // Both ceiling sources, not just the tighter one. Which peer is binding
    // changes as they move: `@astrojs/check` ceilings at 7.0.0 today and
    // `typescript-eslint` at 6.1.0, but the rules bullet's warning cuts both
    // ways — consulting only one is what makes an unsafe bump look safe.
    expect(
      pins.typescriptPeerCeilingSources,
      'dropping a ceiling source removes the only check that reads it',
    ).toEqual(expect.arrayContaining(['@astrojs/check', 'typescript-eslint']));
  });

  describe('package.json agrees with the pin block', () => {
    // The drift that #738 and #886 both produced, in either direction.
    for (const [name, declared] of Object.entries(pins.devDependencies)) {
      it(`${name} is declared as "${declared}"`, () => {
        expect(
          manifest.devDependencies?.[name],
          `package.json declares ${name} as "${manifest.devDependencies?.[name]}" but ` +
            `rules/repo_rules.md § Toolchain Constraints pins it at "${declared}". ` +
            'Change both together, or neither.',
        ).toBe(declared);
      });
    }
  });

  describe("the lockfile's copy of the root manifest agrees too", () => {
    // package-lock.json mirrors the root manifest under packages[""], so a
    // declared range lives on THREE surfaces. #886's restoration missed this
    // one: package.json said <6.1.0 while the lockfile still said <7.1.0, and
    // any lockfile-reading audit got the old ceiling. Caught by Codex on this
    // PR, which is the same lesson one level down — a value written in more
    // than one place needs a check that reads every place.
    const root = lockfile.packages?.[''] ?? {};

    for (const [name, declared] of Object.entries(pins.devDependencies)) {
      it(`${name} is mirrored as "${declared}"`, () => {
        expect(
          root.devDependencies?.[name],
          `package-lock.json packages[""] declares ${name} as ` +
            `"${root.devDependencies?.[name]}" but the pin block says "${declared}". ` +
            'Run `npm install --package-lock-only` after editing package.json.',
        ).toBe(declared);
      });
    }
  });

  describe('the typescript ceiling is no wider than its tightest installed peer', () => {
    // Independent of the block: re-derived from the tree that is actually
    // installed, so widening the ceiling in both files still fails here.
    const declaredCeiling = upperBound(pins.devDependencies.typescript);

    for (const peer of pins.typescriptPeerCeilingSources) {
      it(`${peer} admits the declared range`, () => {
        const entry = lockEntry(peer);
        expect(entry, `${peer} is not installed at the top level of package-lock.json`).toBeTruthy();

        const peerRange = entry.peerDependencies?.typescript;
        expect(
          peerRange,
          `${peer}@${entry.version} declares no typescript peer, so it can no longer be ` +
            'a ceiling source. Drop it from typescriptPeerCeilingSources in the pin block ' +
            'and say why in the prose.',
        ).toBeTruthy();

        const peerCeiling = upperBound(peerRange);
        const admitted =
          peerCeiling === null ||
          (declaredCeiling !== null && compare(declaredCeiling, peerCeiling) <= 0);

        expect(
          admitted,
          `package.json declares typescript "${pins.devDependencies.typescript}" ` +
            `(ceiling ${fmt(declaredCeiling)}), but ${peer}@${entry.version} peers ` +
            `"${peerRange}" (ceiling ${fmt(peerCeiling)}). The wider range admits a ` +
            'typescript npm ci would reject on this peer — the #631 ERESOLVE class. ' +
            'Do not widen until every peer above admits the wider version.',
        ).toBe(true);
      });
    }
  });

  describe('the Markdown-processor trio moves in lockstep', () => {
    const EXACT = /^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/;

    for (const name of pins.markdownProcessorLockstep) {
      it(`${name} is pinned exact`, () => {
        expect(
          manifest.devDependencies?.[name],
          `${name} must be pinned exact — a caret on any member of the trio cannot ` +
            "express astro's exact optional peer, which is how #630 broke.",
        ).toMatch(EXACT);
      });
    }

    it("@astrojs/markdown-remark matches astro's exact optional peer", () => {
      const astro = lockEntry('astro');
      const declaredPeer = astro?.peerDependencies?.['@astrojs/markdown-remark'];
      expect(
        declaredPeer,
        `astro@${astro?.version} declares no @astrojs/markdown-remark peer; the coupling ` +
          'this asserts no longer exists upstream and the rules prose needs revisiting.',
      ).toBeTruthy();

      expect(
        manifest.devDependencies['@astrojs/markdown-remark'],
        `astro@${astro.version} peers @astrojs/markdown-remark@"${declaredPeer}" but ` +
          `package.json pins ${manifest.devDependencies['@astrojs/markdown-remark']}. ` +
          'Bump both in the same change (#630).',
      ).toBe(declaredPeer);
    });

    it("@astrojs/mdx's exact dependency matches the pinned @astrojs/markdown-remark", () => {
      const mdx = lockEntry('@astrojs/mdx');
      const nested = mdx?.dependencies?.['@astrojs/markdown-remark'];
      expect(
        nested,
        `@astrojs/mdx@${mdx?.version} no longer depends on @astrojs/markdown-remark; ` +
          'the silent-nesting failure mode this guards may no longer apply.',
      ).toBeTruthy();

      expect(
        manifest.devDependencies['@astrojs/markdown-remark'],
        `@astrojs/mdx@${mdx.version} depends on @astrojs/markdown-remark@${nested} but ` +
          `package.json pins ${manifest.devDependencies['@astrojs/markdown-remark']}. ` +
          'npm will nest a second copy rather than error.',
      ).toBe(nested);
    });

    it('the lockfile holds no second @astrojs/markdown-remark nested under @astrojs/mdx', () => {
      // The failure this section calls silent: two Markdown processors in one
      // tree, no ERESOLVE, no error, every other gate still green.
      //
      // Matched on the exact path rather than the directory prefix. mdx nesting
      // some unrelated transitive dependency is ordinary npm behaviour and says
      // nothing about the Markdown processor, so reddening a required check over
      // it would be a false positive on a gate that has to stay trustworthy.
      const nested = 'node_modules/@astrojs/mdx/node_modules/@astrojs/markdown-remark';
      expect(
        Object.keys(lockfile.packages ?? {}),
        `${nested} exists: two Markdown processors in one tree`,
      ).not.toContain(nested);
    });
  });
});
