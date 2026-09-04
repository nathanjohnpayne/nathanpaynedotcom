#!/usr/bin/env bash
# lint-all.sh — run every lint gate and report all of their failures.
#
# A short-circuiting chain hides later failures. Every gate runs here so one
# `npm run lint` reports JavaScript, prose, and formatting failures together
# (#670, #954).
#
# Every gate runs here, and the command fails if any of them failed.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT" || exit 1

status=0

run_gate() {
  local label="$1"
  shift
  if ! "$@"; then
    status=1
    echo "lint-all: ${label} failed" >&2
  fi
}

run_gate eslint "$ROOT/node_modules/.bin/eslint" .
run_gate prose node "$ROOT/scripts/lint-prose.mjs"
# Delegates to the npm script rather than invoking node_modules/.bin/prettier
# directly, unlike the two gates above, so the Prettier scope has exactly one
# definition. `format` (--write) and `format:check` (--check) already carry that
# glob in package.json; a second copy here would be free to drift from the one
# `npm run format` fixes, which is the failure this gate exists to prevent
# (#954). Prettier exits 2 — not 0 — when a glob matches nothing, so a scope
# that stops matching files fails the gate instead of silently passing it.
run_gate format npm run --silent format:check

if [ "$status" -ne 0 ]; then
  echo "lint-all: one or more gates failed" >&2
fi

exit "$status"
