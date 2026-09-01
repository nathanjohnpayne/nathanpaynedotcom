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
REPORT="$(node --input-type=module -e '
import { readFileSync, existsSync } from "node:fs";

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const rows = [];

for (const [path, meta] of Object.entries(lock.packages ?? {})) {
  // The root project is keyed "" and has no version of its own to check.
  if (!path.startsWith("node_modules/")) continue;
  // `link: true` entries are workspace symlinks; their real entry appears
  // separately under the workspace path.
  if (!meta.version || meta.link) continue;

  const name = path.slice("node_modules/".length);
  const manifest = `${path}/package.json`;

  if (!existsSync(manifest)) {
    // Absent optional deps are the normal case, not drift: the lockfile
    // carries every platforms binaries and npm installs only this one.
    if (meta.optional) continue;
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

process.stdout.write(rows.join("\n"));
')"

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
