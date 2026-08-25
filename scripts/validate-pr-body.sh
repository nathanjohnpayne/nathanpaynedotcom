#!/usr/bin/env bash
# Validate the repository's identity-bearing PR description contract.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# shellcheck source=lib/pr-body-contract.sh
. "$ROOT/scripts/lib/pr-body-contract.sh"

PRINT_AUTHOR=false
case "${1:-}" in
  "") ;;
  --print-author) PRINT_AUTHOR=true ;;
  *)
    echo "usage: scripts/validate-pr-body.sh [--print-author] < pr-body.md" >&2
    exit 2
    ;;
esac

BODY="$(cat)"
pr_body_validate "$BODY" "$ROOT/.github/review-policy.yml"

if [ "$PRINT_AUTHOR" = true ]; then
  pr_body_authoring_agent "$BODY"
fi
