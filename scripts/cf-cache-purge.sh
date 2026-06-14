#!/usr/bin/env bash
# Purge the Cloudflare cache for nathanpayne.com.
# Uses CF_API_TOKEN from credential preflight when available. When run
# directly without preflight, falls back to 1Password.
#
# Usage:
#   scripts/cf-cache-purge.sh
set -euo pipefail

ZONE_ID="2ea6932e7a6e86434297873a191bb123"
OP_ITEM_ID="4x6wslp3f6pal5t6h3jhhe63ie"

if [[ -n "${CF_API_TOKEN:-}" ]]; then
  CF_TOKEN="$CF_API_TOKEN"
elif [[ "${OP_PREFLIGHT_DONE:-}" == "1" && ( "${OP_PREFLIGHT_MODE:-}" == "deploy" || "${OP_PREFLIGHT_MODE:-}" == "all" ) ]]; then
  echo "  CF_API_TOKEN not exported by preflight; skipping Cloudflare cache purge."
  exit 0
else
  CF_TOKEN="$(op read "op://Private/${OP_ITEM_ID}/credential")"
fi

echo "  Purging Cloudflare cache for nathanpayne.com..."

RESPONSE="$(curl -s -X POST \
  "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
  -H "Authorization: Bearer ${CF_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}')"

SUCCESS="$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin).get('success', False))")"

if [[ "$SUCCESS" == "True" ]]; then
  echo "✔  Cloudflare cache purged."
else
  echo "⚠  Cache purge failed: $RESPONSE" >&2
  exit 1
fi
