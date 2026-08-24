#!/usr/bin/env bash
# lint-all.sh — run every lint gate and report all of their failures.
#
# A short-circuiting chain hides later failures. Every gate runs here so one
# `npm run lint` reports JavaScript and prose failures together (#670).
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
run_gate mermaid-contrast node "$ROOT/scripts/check-mermaid-contrast.mjs"

if [ "$status" -ne 0 ]; then
  echo "lint-all: one or more gates failed" >&2
fi

exit "$status"
