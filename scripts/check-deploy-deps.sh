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
  echo "⚠  package-lock.json not found at ${ROOT_DIR}; cannot verify dependencies." >&2
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
if git rev-parse --git-dir >/dev/null 2>&1 && git ls-files --error-unmatch package-lock.json >/dev/null 2>&1; then
  if ! git diff --quiet HEAD -- package-lock.json 2>/dev/null; then
    {
      echo ""
      echo "⚠  Refusing to deploy: package-lock.json has uncommitted changes."
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
import { readFileSync, existsSync, readdirSync } from "node:fs";

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
const constraintAllows = (constraint, actual) => {
  if (constraint === undefined) return true;
  const values = Array.isArray(constraint) ? constraint : [constraint];
  const negated = values.filter((v) => v.startsWith("!")).map((v) => v.slice(1));
  if (negated.length > 0) return !negated.includes(actual);
  return values.includes(actual);
};

// Only ever claims true when the lockfile SAYS so. An entry with no os/cpu of
// its own is usually a transitive dep of a platform-specific parent (the wasm32
// fallbacks pull in @emnapi/* and tslib, none of them constrained), and
// treating "unconstrained" as "targets this host" flags eleven packages on a
// perfectly clean tree. A guard that is noisy when correct gets switched off,
// so the burden of proof sits here: no constraint means not provable, which
// means exempt.
const targetsThisHost = (meta) => {
  if (meta.os === undefined && meta.cpu === undefined) return false;
  return constraintAllows(meta.os, process.platform) && constraintAllows(meta.cpu, process.arch);
};

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

  if (!existsSync(manifest)) {
    // Absent optional deps are usually the normal case: the lockfile carries
    // every platform binary and npm installs only this hosts. But exempting
    // ALL of them also exempts a package that DOES target this host — a
    // missing sharp or Astro compiler binding changes the build while the
    // guard reports a match. So the exemption is narrowed to packages this
    // host could not install, using the lockfiles own os/cpu/libc constraints.
    if (meta.optional && !targetsThisHost(meta)) continue;
    rows.push([name, meta.version, "(not installed)"].join("\t"));
    continue;
  }

  let installed;
  try {
    installed = JSON.parse(readFileSync(manifest, "utf8")).version;
  } catch {
    rows.push([name, meta.version, "(unreadable manifest)"].join("\t"));
    continue;
  }

  if (installed !== meta.version) {
    rows.push([name, meta.version, installed].join("\t"));
  }
}

// The loop above only ever looks at packages the lockfile knows about, so a
// package installed with --no-save, or left behind after a dependency was
// removed, is invisible to it. `npm ci` deletes node_modules outright, so CI
// never has one. Top level and one scope deep is where a hand-run install
// lands; walking the whole nested tree would cost more than it catches.
const installedTopLevel = [];
for (const entry of readdirSync("node_modules", { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
  if (entry.name.startsWith("@")) {
    for (const scoped of readdirSync(`node_modules/${entry.name}`, { withFileTypes: true })) {
      if (scoped.isDirectory() && !scoped.name.startsWith("."))
        installedTopLevel.push(`${entry.name}/${scoped.name}`);
    }
  } else {
    installedTopLevel.push(entry.name);
  }
}

for (const name of installedTopLevel) {
  if (packages[`node_modules/${name}`]) continue;
  if (!existsSync(`node_modules/${name}/package.json`)) continue;
  let version = "unknown";
  try {
    version = JSON.parse(readFileSync(`node_modules/${name}/package.json`, "utf8")).version;
  } catch {}
  rows.push([name, "(not in lockfile)", version].join("\t"));
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
