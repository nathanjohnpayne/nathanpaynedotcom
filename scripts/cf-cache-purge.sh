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
  # Exit 0 on purpose: a missing cache token must not fail an otherwise good
  # deploy. But say so loudly. This branch is the reason a deploy can report
  # success while the edge still serves the previous build.
  echo "" >&2
  echo "⚠  CLOUDFLARE CACHE WAS NOT PURGED." >&2
  echo "   CF_API_TOKEN was not exported by the credential preflight." >&2
  echo "   The deploy reached Firebase, but Cloudflare will keep serving the" >&2
  echo "   previous copy from its edge — for several hours on images." >&2
  echo "   Production will look unchanged even though the deploy succeeded." >&2
  echo "" >&2
  echo "   Fix: re-run preflight with a deploy-capable mode, then purge:" >&2
  echo "     eval \"\$(scripts/op-preflight.sh --agent <agent> --mode all --refresh)\"" >&2
  echo "     scripts/cf-cache-purge.sh" >&2
  echo "" >&2
  echo "   Then verify against the live URL, not this log." >&2
  echo "" >&2
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
