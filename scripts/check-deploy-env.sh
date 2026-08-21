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

# Does this file ASSIGN the key at all? Presence is tracked separately from
# emptiness because `PUBLIC_FOO=` is a real assignment: dotenv reads it as an
# empty string, and a higher-precedence empty assignment overrides a lower one
# rather than deferring to it. Treating empty as "not found" would let this
# script report a value the build will never see.
dotenv_assigns() {
  local file="$1" key="$2"
  [[ -f "$file" ]] || return 1
  grep -qE "^[[:space:]]*${key}=" "$file"
}

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
  value=""
  source_label=""

  # Ascending precedence: each file that assigns the key overrides the previous
  # one, empty assignment included.
  for env_file in "${ENV_FILES[@]}"; do
    if dotenv_assigns "${ROOT_DIR}/${env_file}" "$key"; then
      value="$(read_dotenv_value "${ROOT_DIR}/${env_file}" "$key")"
      source_label="$env_file"
    fi
  done

  # A shell variable beats every file — again, empty included. `${!key+…}` tests
  # whether the name is set at all, which `${!key:-}` cannot distinguish from
  # set-but-empty.
  if [[ -n "${!key+set}" ]]; then
    value="${!key}"
    source_label="the shell environment"
  fi

  if [[ -z "$value" ]]; then
    if [[ -n "$source_label" ]]; then
      # Assigned but empty: the build would bake in an empty string, so this is
      # a missing token wearing a value-shaped hat.
      MISSING+=("${key} (empty in ${source_label})")
    else
      MISSING+=("$key")
    fi
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
  # `${arr[@]}` on an empty array is an unbound-variable error under `set -u`
  # in bash 3.2, which is still /bin/bash on macOS. Exactly one of these two
  # lists is usually empty, and the crash would land inside the error path —
  # losing the diagnostic this script exists to print. The `+` expansion keeps
  # an empty list empty instead of unset.
  for key in ${MISSING[@]+"${MISSING[@]}"}; do
    echo "     missing:     ${key}"
  done
  for entry in ${PLACEHOLDER[@]+"${PLACEHOLDER[@]}"}; do
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
