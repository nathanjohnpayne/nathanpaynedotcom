#!/usr/bin/env bash
# lint-all.sh — run every lint gate and report all of their failures.
#
# `eslint . && node scripts/lint-content-em-dash.mjs` short-circuits: when
# eslint fails, the content gate never runs. Nothing bad merges — the overall
# command still fails — but a single `npm run lint` can only ever surface one
# class of problem, so fixing eslint earns you a second failing run that
# reports the content violations you could have seen the first time (#670).
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
run_gate content-em-dash node "$ROOT/scripts/lint-content-em-dash.mjs"

if [ "$status" -ne 0 ]; then
  echo "lint-all: one or more gates failed" >&2
fi

exit "$status"
