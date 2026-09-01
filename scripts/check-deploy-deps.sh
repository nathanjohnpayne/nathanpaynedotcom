#!/usr/bin/env bash
# Fail a deploy that would ship a build made against stale dependencies.
#
# `npm run deploy` builds from whatever is installed in this checkout. CI
# builds from `npm ci`. When those two disagree, CI is green on a SHA whose
# local build is broken — and the deploy publishes the broken one and reports
# success, because `astro build` exits 0 either way.
#
# That is not hypothetical: it is what shipped (#900). This checkout had
# astro@7.2.4 installed against a lockfile pinning astro@7.2.9. On 7.2.4 the
# plain-.md pipeline drops the inline `style` that rehype plugins write, so
# --mermaid-natural-width never reached the SVGs, the CSS min-width fell back
# to 0px, and Mermaid labels downscaled to ~4px on three blog posts. The fix
# for that defect (#895) had already merged and was already green. The .mdx
# project pages rendered correctly, because @astrojs/mdx happened to be at its
# locked version — which is why it read as a code gap rather than as drift.
#
# Why this compares against package-lock.json and not `npm ls`:
# `npm ls --depth=0` reports "invalid" against the *ranges* in package.json.
# astro@7.2.4 satisfies a ^7.2.0 range perfectly well, so `npm ls` is silent
# on exactly the drift that shipped. The lockfile is the only artifact that
# pins the version CI actually builds against, so it is the only correct
# thing to compare to.
#
# Optional dependencies are exempt when absent: the lockfile enumerates every
# platform's binaries (107 of them here), and npm installs only this one's.
# An optional package that IS installed is still version-checked.
#
# Fails closed on a lockfile it cannot read, and on one it can read but learns
# nothing from. `lock.packages` exists only from lockfileVersion 2; a v1 file
# keys its tree under `dependencies` instead. Defaulting a missing map to {} —
# the obvious way to write this — makes the loop check nothing and the empty
# result print "safe to build" over an empty node_modules. A guard that fails
# open is worse than no guard, because it also reports that it passed. So the
# shape is validated before the loop, and a run that checked zero packages is
# itself a refusal.
#
# Usage:
#   scripts/check-deploy-deps.sh
#
# Exit 0 when every installed package matches the lockfile, 1 otherwise.
# Break-glass: DEPLOY_ALLOW_DEP_DRIFT=1 downgrades the failure to a warning.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f package-lock.json ]]; then
  {
    echo ""
    echo "⚠  Refusing to deploy: package-lock.json not found at ${ROOT_DIR}."
    echo ""
    echo "   There is nothing to verify the installed tree against."
    echo ""
  } >&2
  # Routed through the same override as every other refusal here. An early
  # `exit 1` would make DEPLOY_ALLOW_DEP_DRIFT=1 work for malformed lockfiles
  # and version drift but not for a missing one — a documented break-glass
  # that silently does not cover its most drastic case.
  if [[ "${DEPLOY_ALLOW_DEP_DRIFT:-}" == "1" ]]; then
    echo "   DEPLOY_ALLOW_DEP_DRIFT=1 set — continuing anyway." >&2
    echo "" >&2
    exit 0
  fi
  exit 1
fi

# CI builds from the lockfile as committed at this SHA. A working copy modified
# by a bare `npm install` matches the tree that same install produced, so the
# comparison below would pass while CI never tested those versions — the guard
# would agree with itself instead of with CI. Refuse while the lockfile is
# dirty; committing it is what makes CI's answer apply to this build.
#
# Skipped outside a git repo (the test sandboxes, a tarball export): there is no
# committed state to disagree with, so there is nothing this check could learn.
# Asks HEAD, not the index. `git ls-files` reads the index, so a lockfile
# staged for removal makes it fail and skips this guard entirely — after which
# a regenerated, now-untracked lockfile and its matching node_modules sail
# through the comparison below against versions CI never built from.
if git rev-parse --git-dir >/dev/null 2>&1 && git rev-parse --verify HEAD >/dev/null 2>&1; then
  if ! git cat-file -e HEAD:package-lock.json 2>/dev/null ||
     ! git diff --quiet HEAD -- package-lock.json 2>/dev/null; then
    {
      echo ""
      echo "⚠  Refusing to deploy: package-lock.json does not match HEAD."
      echo ""
      echo "   Either it has uncommitted changes, or HEAD carries no lockfile"
      echo "   at all — deleted, or staged for removal."
      echo ""
      echo "   CI built this SHA from the committed lockfile. Your node_modules"
      echo "   matches this modified one, so the version check below would pass"
      echo "   against a dependency set CI never tested — the guard agreeing with"
      echo "   itself rather than with CI."
      echo ""
      echo "   Commit the lockfile and let CI run against it, or restore it:"
      echo ""
      echo "     git checkout -- package-lock.json && npm ci"
      echo ""
    } >&2
    if [[ "${DEPLOY_ALLOW_DEP_DRIFT:-}" == "1" ]]; then
      echo "   DEPLOY_ALLOW_DEP_DRIFT=1 set — continuing anyway." >&2
      echo "" >&2
    else
      exit 1
    fi
  fi
fi

if [[ ! -d node_modules ]]; then
  {
    echo ""
    echo "⚠  Refusing to deploy: node_modules is missing entirely."
    echo ""
    echo "   Install from the lockfile, then retry:"
    echo ""
    echo "     npm ci"
    echo ""
  } >&2
  [[ "${DEPLOY_ALLOW_DEP_DRIFT:-}" == "1" ]] && { echo "   DEPLOY_ALLOW_DEP_DRIFT=1 set — continuing anyway." >&2; exit 0; }
  exit 1
fi

# Node rather than bash: package-lock.json is 700+ entries of nested JSON, and
# shelling out to a JSON parser per entry is slower than the build step this
# guard protects. Emits one `name<TAB>locked<TAB>installed` line per problem.
# node's diagnostics go to a file rather than the terminal, so the bash side can
# quote them back inside its own refusal block instead of letting them surface
# above it, detached from the explanation.
NODE_ERR_FILE="$(mktemp)"
trap 'rm -f "$NODE_ERR_FILE"' EXIT

REPORT="$(node --input-type=module -e '
import { readFileSync, existsSync, readdirSync, statSync, lstatSync, realpathSync } from "node:fs";

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));

// Not `?? {}`. A missing or malformed map has to stop the run, not silently
// become an empty one — see the header. Arrays are rejected explicitly
// because typeof [] === "object" and Object.entries([]) is happily empty.
const packages = lock.packages;
if (packages === null || typeof packages !== "object" || Array.isArray(packages)) {
  process.stderr.write(
    `package-lock.json has no usable \"packages\" map (lockfileVersion ` +
      `${lock.lockfileVersion ?? "unknown"}). Lockfile v1 keys its tree under ` +
      `\"dependencies\"; this guard needs v2 or later.`,
  );
  process.exit(2);
}

// npm records these as either a bare value or a list, and negates with a
// leading "!". Absent means unconstrained, which means it targets every host.
// Mirrors npm-install-checks rather than approximating it, because both
// halves of the approximation were wrong in opposite directions.
//
//   ["any", "!linux"]      an early "any" return ignored the later exclusion
//   ["darwin", "!win32"]   "not excluded" alone passed on linux, but npm also
//                          requires one positive entry to match
//
// Both mistakes report a package npm would never install here, which fails a
// clean deploy rather than letting a bad one through — the noisy direction,
// and the one that gets a guard switched off.
const constraintAllows = (constraint, actual) => {
  if (constraint === undefined) return true;
  const values = Array.isArray(constraint) ? constraint : [constraint];
  if (values.length === 0) return true;

  const negated = [];
  const positive = [];
  for (const value of values) {
    if (value.startsWith("!")) negated.push(value.slice(1));
    else positive.push(value);
  }

  // An explicit exclusion wins outright, whatever else is listed.
  if (negated.includes(actual)) return false;
  // With only exclusions, "not excluded" is the whole test.
  if (positive.length === 0) return true;
  // Otherwise one positive has to match; npm reads "any" as matching each host.
  return positive.includes("any") || positive.includes(actual);
};

// Only ever claims true when the lockfile SAYS so. An entry with no os/cpu of
// its own is usually a transitive dep of a platform-specific parent (the wasm32
// fallbacks pull in @emnapi/* and tslib, none of them constrained), and
// treating "unconstrained" as "targets this host" flags eleven packages on a
// perfectly clean tree. A guard that is noisy when correct gets switched off,
// so the burden of proof sits here: no constraint means not provable, which
// means exempt.
// glibc vs musl. Node reports a glibc version only when it linked against one,
// so its absence on Linux means musl. Off Linux the field is meaningless, and a
// package declaring one cannot be targeting this host at all.
const hostLibc = () => {
  if (process.platform !== "linux") return null;
  return process.report?.getReport?.()?.header?.glibcVersionRuntime ? "glibc" : "musl";
};

const targetsThisHost = (meta) => {
  if (meta.os === undefined && meta.cpu === undefined && meta.libc === undefined) return false;
  if (meta.libc !== undefined) {
    const libc = hostLibc();
    if (libc === null || !constraintAllows(meta.libc, libc)) return false;
  }
  return constraintAllows(meta.os, process.platform) && constraintAllows(meta.cpu, process.arch);
};

const manifestPath = (path) => `${path}/package.json`;
const isInstalled = (path) => existsSync(manifestPath(path));

// An unconstrained optional entry is exempt when absent — that rule is what
// keeps the guard quiet on a clean tree (see above). But it has a hole: a
// REQUIRED child of an installed optional parent inherits `optional: true` in
// the lockfile while carrying no platform constraints of its own, so it looks
// exactly like a foreign-platform straggler and gets exempted. sharp ->
// @img/colour is exactly that shape here, and deleting the child makes
// `import("sharp")` fail with ERR_MODULE_NOT_FOUND while the guard reports a
// clean tree — a false pass on the library that renders every OG image.
//
// So applicability is traced from parents that are actually installed: if
// something present on disk lists a package in its `dependencies`, that
// package is required here regardless of an inherited optional flag. Children
// of absent foreign-platform parents are still exempt, because their parent is
// not installed to require them.
// Keyed by locked PATH, not bare name. npm resolves a dependency either into
// the parent own node_modules or to a hoisted copy, and the lockfile keys both
// forms by full path — so a bare name would exempt a missing
// parent/node_modules/child while matching an unrelated hoisted child.
// Resolved the way node resolves: nearest node_modules first, then each
// ancestor. Adding every candidate location instead marks a hoisted entry
// required even when the clean tree legitimately has only the nested copy —
// which blocks a correct deploy, the noisy direction.
const resolveDep = (parentPath, dep) => {
  let scope = parentPath;
  while (scope) {
    const candidate = `${scope}/node_modules/${dep}`;
    if (packages[candidate]) return candidate;
    const cut = scope.lastIndexOf("/node_modules/");
    if (cut === -1) break;
    scope = scope.slice(0, cut);
  }
  return packages[`node_modules/${dep}`] ? `node_modules/${dep}` : null;
};

// optionalDependencies count too. astro declares sharp there, unconstrained;
// a plain `npm ci` installs it, so a tree missing it differs from what CI
// built even though the entry carries no platform constraints to prove it.
const requiredPaths = new Set();
for (const [path, meta] of Object.entries(packages)) {
  // The root project is keyed "" and is always "installed". Its own
  // dependencies and optionalDependencies are what npm installs at top level,
  // so skipping it left every direct optional dependency looking unrequired.
  const isRoot = path === "";
  if (!isRoot && (!path.startsWith("node_modules/") || !isInstalled(path))) continue;
  // peerDependencies count when not marked optional: an installed parent
  // imports them directly, so a tree without them differs from what npm ci
  // produces. peerDependenciesMeta[name].optional exempts one.
  const peerMeta = meta.peerDependenciesMeta ?? {};
  const requiredPeers = Object.fromEntries(
    Object.entries(meta.peerDependencies ?? {}).filter(([n]) => !peerMeta[n]?.optional),
  );
  const deps = {
    ...(meta.dependencies ?? {}),
    ...(meta.optionalDependencies ?? {}),
    ...requiredPeers,
  };
  for (const dep of Object.keys(deps)) {
    const resolved = isRoot
      ? packages[`node_modules/${dep}`]
        ? `node_modules/${dep}`
        : null
      : resolveDep(path, dep);
    if (resolved) requiredPaths.add(resolved);
  }
}

const rows = [];
let checked = 0;

for (const [path, meta] of Object.entries(packages)) {
  // The root project is keyed "" and has no version of its own to check.
  if (!path.startsWith("node_modules/")) continue;
  // `link: true` entries are workspace symlinks; their real entry appears
  // separately under the workspace path.
  if (!meta.version || meta.link) continue;

  const name = path.slice("node_modules/".length);
  const manifest = `${path}/package.json`;
  checked++;

  // Would a clean `npm ci` put this package here? Decided once, above the
  // present/absent split, because BOTH directions are drift: an applicable
  // package that is absent, and an inapplicable one that is present.
  //
  // Two ways it applies: the lockfile proves it targets this host, or it
  // carries no constraints at all AND something installed requires it.
  // Unconstrained-and-unrequired stays exempt — the lockfile carries every
  // platform binary and npm installs only the one for this host, so exempting those is
  // what keeps a clean tree quiet.
  const unconstrained =
    meta.os === undefined && meta.cpu === undefined && meta.libc === undefined;
  const installsHere =
    !meta.optional || targetsThisHost(meta) || (unconstrained && requiredPaths.has(path));

  if (!existsSync(manifest)) {
    if (!installsHere) continue;
    rows.push([name, meta.version, "(not installed)"].join("\t"));
    continue;
  }

  // NOT symmetric, deliberately. Reporting a PRESENT package as one npm would
  // not have installed requires predicting npm exactly, and this model cannot.
  // @img/sharp-wasm32 and @napi-rs/wasm-runtime are optional with no os/cpu
  // constraints, declared only by wasm32 parents that are themselves optional
  // and platform-specific. npm omits them on darwin and hoists them on linux —
  // so the symmetric check exited 1 on a clean `npm ci` tree on the very
  // platform CI runs, which is the worst possible failure for this guard.
  //
  // The absent direction is safe because exempting is conservative: a package
  // this model cannot prove applicable is simply not reported. The present
  // direction has no such fallback, so it is not attempted. An extraneous
  // package NOT in the lockfile is still reported, further down — that needs
  // no prediction at all.
  // ...but that judgement gates ABSENCE only. "Do not judge why it is here"
  // is not "do not check what it is": an earlier version continued past the
  // comparison below too, so an unconstrained optional installed at the
  // WRONG version passed silently. A present package is always version-
  // checked; only its absence is excused.

  let installed;
  try {
    installed = JSON.parse(readFileSync(manifest, "utf8")).version;
  } catch {
    rows.push([name, meta.version, "(unreadable manifest)"].join("\t"));
    continue;
  }

  // A locked path replaced by a symlink into a local tree passes the version
  // check whenever that trees manifest carries the locked version, and the
  // extraneous scan skips it too because the path IS in the lockfile. The CI
  // `npm ci` installs the registry artifact, so the contents can differ
  // arbitrarily. Only entries the lockfile itself marks `link: true` are
  // legitimately symlinks, and those are skipped earlier.
  if (lstatSync(path).isSymbolicLink()) {
    rows.push([name, meta.version, "(symlink, not the locked artifact)"].join("\t"));
    continue;
  }

  if (installed !== meta.version) {
    rows.push([name, meta.version, installed].join("\t"));
  }
}

// The loop above only ever looks at packages the lockfile knows about, so a
// package installed with --no-save, or left behind after a dependency was
// removed, is invisible to it. `npm ci` deletes node_modules outright, so CI
// never has one.
const installedPaths = [];
// A symlink is NOT isDirectory() in a Dirent — npm and pnpm both link workspace
// and `npm link`ed packages, so testing isDirectory() alone skips exactly the
// hand-installed cases this scan exists to catch. statSync follows the link; a
// broken one throws and is simply not a package.
const isPackageDir = (path, entry) => {
  if (entry.name.startsWith(".")) return false;
  if (entry.isDirectory()) return true;
  if (!entry.isSymbolicLink()) return false;
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

// Recursive, because the lockfile keys nested installs by their full path
// (`node_modules/parent/node_modules/child`), so a nested package can be
// compared exactly like a hoisted one — there is no ambiguity to be noisy
// about. It matters because Node resolves a nested copy ahead of the hoisted
// one, so an obsolete package left under a parent changes the build while a
// top-level-only scan reports a clean tree.
const collectInstalled = (dir) => {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const path = `${dir}/${entry.name}`;
    if (!isPackageDir(path, entry)) continue;

    if (entry.name.startsWith("@")) {
      // A scope directory is not itself a package; its children are.
      for (const scoped of readdirSync(path, { withFileTypes: true })) {
        const scopedPath = `${path}/${scoped.name}`;
        if (!isPackageDir(scopedPath, scoped)) continue;
        installedPaths.push(scopedPath);
        collectInstalled(`${scopedPath}/node_modules`);
      }
      continue;
    }

    installedPaths.push(path);
    collectInstalled(`${path}/node_modules`);
  }
};

collectInstalled("node_modules");

for (const path of installedPaths) {
  if (packages[path]) continue;
  if (!existsSync(`${path}/package.json`)) continue;
  let version = "unknown";
  try {
    version = JSON.parse(readFileSync(`${path}/package.json`, "utf8")).version;
  } catch {}
  // Reported by path, not bare name: `parent/node_modules/ghost` and a hoisted
  // `ghost` are different installs and the message has to say which one.
  rows.push([path.replace(/^node_modules\//, ""), "(not in lockfile)", version].join("\t"));
}

// The build runs through node_modules/.bin, not through package directories:
// `npm run build` resolves astro via .bin/astro. A shim that is missing or
// dangling therefore breaks or changes the build while every manifest version
// still matches — a clean tree by every other measure.
//
// Deliberately narrow, after measuring. Only TOP-LEVEL locked packages are
// considered: npm shims nested packages into the parent own .bin, not the root
// one, and expecting them at the root reported three packages on a clean npm ci
// tree. Ownership is not asserted either — several packages can declare the
// same bin name and npm picks one, so "points at a different package" is
// ambiguous rather than wrong. What is unambiguous is a shim that does not
// resolve at all.
// No outer existence gate on the directory. An absent node_modules/.bin is not
// "nothing to check" — it is every shim missing at once, and `npm run build`
// would then resolve astro from PATH or fail outright while the guard reported
// a clean tree. The per-shim lstat below already reports absence correctly, so
// the loop simply runs.
const binDir = "node_modules/.bin";
{
  // Grouped by bin NAME, not by package. Several locked packages can declare
  // the same bin — @playwright/test and playwright both declare "playwright" —
  // and npm writes exactly one shim, pointing at whichever it chose. Checking
  // each package independently flags the one npm did not pick, which is a
  // false positive on a perfectly clean tree. So the acceptable targets for a
  // shim are the declared binaries of EVERY installed package declaring that
  // name, and only a shim matching none of them is wrong.
  const expected = new Map();
  for (const [path, meta] of Object.entries(packages)) {
    if (!path.startsWith("node_modules/")) continue;
    // Nested packages shim into their parent .bin, not the root one.
    if (path.lastIndexOf("/node_modules/") !== -1) continue;
    if (!isInstalled(path) || !meta.bin) continue;

    const bin =
      typeof meta.bin === "string"
        ? { [path.slice("node_modules/".length)]: meta.bin }
        : meta.bin;

    for (const [binName, rel] of Object.entries(bin)) {
      if (!expected.has(binName)) expected.set(binName, { version: meta.version, targets: [] });
      expected.get(binName).targets.push({ path, rel });
    }
  }

  // An executable in .bin that no locked package declares is invisible to
  // everything else here: the loop below iterates declared names, and the
  // recursive package scan skips dot-directories. `npm run` puts .bin at the
  // front of PATH, so a stale shim left there runs in preference to anything
  // else — including the plain `node` calls this package.json makes in
  // prebuild. `npm ci` recreates .bin from the lockfile and would not have it.
  try {
    for (const entry of readdirSync(binDir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      if (expected.has(entry.name)) continue;
      rows.push([`.bin/${entry.name}`, "(not in lockfile)", "undeclared shim"].join("\t"));
    }
  } catch {}

  for (const [binName, { version, targets }] of expected) {
    const shim = `${binDir}/${binName}`;

    let entryPresent = true;
    try {
      lstatSync(shim);
    } catch {
      entryPresent = false;
    }
    if (!entryPresent) {
      rows.push([`.bin/${binName}`, version, "(shim missing)"].join("\t"));
      continue;
    }

    let shimTarget;
    try {
      shimTarget = realpathSync(shim);
    } catch {
      rows.push([`.bin/${binName}`, version, "(shim dangling)"].join("\t"));
      continue;
    }

    // On POSIX npm writes a real symlink, so the resolved target IS the test.
    // The previous substring fallback accepted any regular file that merely
    // mentioned the target path — a wrapper naming it and then running
    // arbitrary commands passed, and npm run build would execute those. Kept
    // only for win32, where npm genuinely writes wrappers.
    const allowWrapperText = process.platform === "win32";
    let wrapperText = "";
    if (allowWrapperText) {
      try {
        wrapperText = readFileSync(shim, "utf8");
      } catch {}
    }

    let matched = false;
    let anyDeclaredPresent = false;
    let matchedTarget = null;
    for (const { path, rel } of targets) {
      let wanted;
      try {
        wanted = realpathSync(`${path}/${rel}`);
      } catch {
        continue;
      }
      anyDeclaredPresent = true;
      if (
        shimTarget === wanted ||
        (allowWrapperText && wrapperText.includes(rel.replace(/^\.\//, "")))
      ) {
        matched = true;
        matchedTarget = wanted;
        break;
      }
    }

    // npm ci recreates executable modes. Without the bit the symlink resolves
    // and every version matches, but running it fails with status 126 and the
    // build dies after the guard called the tree safe.
    if (matched && matchedTarget && process.platform !== "win32") {
      try {
        if (!(statSync(matchedTarget).mode & 0o111)) {
          rows.push([`.bin/${binName}`, version, "(target not executable)"].join("\t"));
          continue;
        }
      } catch {}
    }

    if (!anyDeclaredPresent) {
      rows.push([`.bin/${binName}`, version, "(declared bin missing)"].join("\t"));
    } else if (!matched) {
      rows.push([`.bin/${binName}`, version, "(shim points elsewhere)"].join("\t"));
    }
  }
}

if (checked === 0) {
  process.stderr.write(
    "package-lock.json declares no installable packages, so this guard verified " +
      "nothing. Refusing rather than reporting a pass it did not earn.",
  );
  process.exit(2);
}

process.stdout.write(rows.join("\n"));
' 2>"$NODE_ERR_FILE")" || NODE_FAILED=1
NODE_ERR="$(cat "$NODE_ERR_FILE")"

if [[ "${NODE_FAILED:-}" == "1" ]]; then
  {
    echo ""
    echo "⚠  Refusing to deploy: cannot verify dependencies against the lockfile."
    echo ""
    echo "   ${NODE_ERR}"
    echo ""
    echo "   This guard fails closed on a lockfile it cannot read. Regenerate it"
    echo "   with a current npm, then retry:"
    echo ""
    echo "     npm install --package-lock-only && npm ci"
    echo ""
  } >&2
  [[ "${DEPLOY_ALLOW_DEP_DRIFT:-}" == "1" ]] && { echo "   DEPLOY_ALLOW_DEP_DRIFT=1 set — continuing anyway." >&2; exit 0; }
  exit 1
fi

if [[ -z "$REPORT" ]]; then
  echo "✔  Installed dependencies match package-lock.json; safe to build for deploy."
  exit 0
fi

DRIFT_COUNT="$(printf '%s\n' "$REPORT" | grep -c . || true)"

{
  echo ""
  echo "⚠  Refusing to deploy: installed dependencies do not match package-lock.json."
  echo ""
  printf '     %-42s %-14s %s\n' "PACKAGE" "LOCKED" "INSTALLED"
  while IFS=$'\t' read -r name locked installed; do
    [[ -z "$name" ]] && continue
    printf '     %-42s %-14s %s\n' "$name" "$locked" "$installed"
  done <<< "$REPORT"
  echo ""
  echo "   ${DRIFT_COUNT} package(s) differ. The deploy builds from what is installed"
  echo "   here; CI builds from the lockfile. When they disagree, CI stays green"
  echo "   on a SHA whose local build is broken, and this deploy would publish"
  echo "   the broken one and report success — the build exits 0 either way."
  echo ""
  echo "   That is #900: astro@7.2.4 against a lockfile pinning 7.2.9 dropped the"
  echo "   inline styles rehype plugins write, and shipped ~4px Mermaid labels for"
  echo "   a fix that had already merged and gone green."
  echo ""
  echo "   Reinstall from the lockfile, then retry:"
  echo ""
  echo "     npm ci && npm run deploy"
  echo ""
} >&2

if [[ "${DEPLOY_ALLOW_DEP_DRIFT:-}" == "1" ]]; then
  echo "   DEPLOY_ALLOW_DEP_DRIFT=1 set — continuing anyway." >&2
  echo "" >&2
  exit 0
fi

exit 1
