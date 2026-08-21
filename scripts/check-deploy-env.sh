#!/usr/bin/env bash
# Fail a deploy that would ship a build with missing PUBLIC_* client tokens.
#
# Every PUBLIC_* var is read via import.meta.env at build time and baked into
# the emitted HTML. Each one degrades gracefully when unset — CompanyLogo
# renders initials, posthog.astro renders nothing, BaseLayout omits the GA
# tags — which is exactly right for CI and for a fresh checkout, and exactly
# wrong for production. `astro build` exits 0 either way, so a deploy from a
# checkout without .env.local publishes a site with no brand logos and no
# analytics, and reports success.
#
# That is not hypothetical: it is what shipped. Only the main checkout has
# .env.local (bootstrap.sh writes it there, and it is gitignored, so no
# worktree has one). A `npm run deploy` from a worktree stripped all three
# tokens from production at once — /resume fell back to initials and both
# PostHog and GA4 stopped loading site-wide.
#
# The required keys are read from .env.tpl rather than hardcoded, so adding a
# client var there (per DEPLOYMENT.md § Client-side env vars) extends this
# guard automatically instead of silently outgrowing it.
#
# Usage:
#   scripts/check-deploy-env.sh
#
# Exit 0 when every PUBLIC_* key resolves to a real value, 1 otherwise.
# Break-glass: DEPLOY_ALLOW_MISSING_PUBLIC_ENV=1 downgrades the failure to a
# warning, for the rare deploy that genuinely should ship without them.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="${ROOT_DIR}/.env.tpl"

# Vite/Astro read these in ascending precedence, and a real shell env var beats
# all of them. Checked in that order so the value this reports on is the value
# the build would actually bake in.
ENV_FILES=(".env" ".env.local" ".env.production" ".env.production.local")

if [[ ! -f "$TEMPLATE" ]]; then
  echo "⚠  .env.tpl not found at ${TEMPLATE}; cannot determine required PUBLIC_* vars." >&2
  exit 1
fi

# Key names only — this script never prints a value, resolved or otherwise.
REQUIRED_KEYS=()
while IFS= read -r key; do
  [[ -n "$key" ]] && REQUIRED_KEYS+=("$key")
done < <(sed -n 's/^[[:space:]]*\(PUBLIC_[A-Z0-9_]*\)=.*/\1/p' "$TEMPLATE" | sort -u)

if [[ ${#REQUIRED_KEYS[@]} -eq 0 ]]; then
  echo "✔  No PUBLIC_* vars declared in .env.tpl; nothing to check."
  exit 0
fi

# Read KEY from a dotenv file: last assignment wins, surrounding quotes are
# stripped, commented lines are ignored.
read_dotenv_value() {
  local file="$1" key="$2"
  [[ -f "$file" ]] || return 0
  sed -n "s/^[[:space:]]*${key}=//p" "$file" \
    | tail -n 1 \
    | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'\$/\1/"
}

# A value that is still an op:// reference or an .env.example placeholder is
# present in the file but useless in the build — treat it as missing rather
# than letting `op://Private/...` get baked into a <script> tag.
is_placeholder() {
  local value="$1"
  [[ "$value" == op://* ]] && return 0
  [[ "$value" == *'{{'* ]] && return 0
  [[ "$value" == *your_*_here* ]] && return 0
  return 1
}

MISSING=()
PLACEHOLDER=()

for key in "${REQUIRED_KEYS[@]}"; do
  value="${!key:-}"
  source_label="the shell environment"

  if [[ -z "$value" ]]; then
    for env_file in "${ENV_FILES[@]}"; do
      candidate="$(read_dotenv_value "${ROOT_DIR}/${env_file}" "$key")"
      if [[ -n "$candidate" ]]; then
        value="$candidate"
        source_label="$env_file"
      fi
    done
  fi

  if [[ -z "$value" ]]; then
    MISSING+=("$key")
  elif is_placeholder "$value"; then
    PLACEHOLDER+=("${key} (unresolved in ${source_label})")
  fi
done

if [[ ${#MISSING[@]} -eq 0 && ${#PLACEHOLDER[@]} -eq 0 ]]; then
  echo "✔  All ${#REQUIRED_KEYS[@]} PUBLIC_* client vars resolved; safe to build for deploy."
  exit 0
fi

{
  echo ""
  echo "⚠  Refusing to deploy: client env vars are missing from this checkout."
  echo ""
  for key in "${MISSING[@]}"; do
    echo "     missing:     ${key}"
  done
  for entry in "${PLACEHOLDER[@]}"; do
    echo "     unresolved:  ${entry}"
  done
  echo ""
  echo "   These are baked into the HTML at build time. Building without them"
  echo "   succeeds and publishes a degraded site: /resume falls back to styled"
  echo "   initials instead of brand logos, and PostHog and GA4 never load, so"
  echo "   analytics goes silent site-wide. The build cannot tell you this,"
  echo "   because every one of them degrades gracefully on purpose."
  echo ""
  echo "   Most likely cause: you are deploying from a git worktree. Only the"
  echo "   main checkout has .env.local — it is gitignored, so worktrees never"
  echo "   get one. Deploy from the main checkout:"
  echo ""
  echo "     cd ~/GitHub/nathanpaynedotcom && npm run deploy"
  echo ""
  echo "   Otherwise, regenerate .env.local from 1Password and retry:"
  echo ""
  echo "     ./scripts/bootstrap.sh --force"
  echo ""
} >&2

if [[ "${DEPLOY_ALLOW_MISSING_PUBLIC_ENV:-}" == "1" ]]; then
  echo "   DEPLOY_ALLOW_MISSING_PUBLIC_ENV=1 set — continuing anyway." >&2
  echo "" >&2
  exit 0
fi

exit 1
