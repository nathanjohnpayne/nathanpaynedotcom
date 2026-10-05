#!/usr/bin/env bash
# Downloads the WOFF faces the logo generator outlines text with. Both families are OFL-licensed.
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)/.fonts"
mkdir -p "$dir"
ua="Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0"
css="$(curl -sS -A "$ua" "https://fonts.googleapis.com/css?family=Cormorant+Garamond:400,500,600,700|Inter:400,500,600")"
i=0
# Order is stable: CG 700, 600, 500, 400, Inter 600, 500, 400 → f1..f7 (lib.mjs depends on it).
while read -r url; do i=$((i + 1)); curl -sS -o "$dir/f$i.woff" "$url"; done < <(printf '%s\n' "$css" | grep -o 'https://[^)]*\.woff' | sort -u)
echo "fetched $i faces into $dir"
