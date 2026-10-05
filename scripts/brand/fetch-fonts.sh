#!/usr/bin/env bash
# Downloads the WOFF faces the logo generator outlines text with. Both families are OFL-licensed.
set -euo pipefail
dir="$(cd "$(dirname "$0")" && pwd)/.fonts"
mkdir -p "$dir"
ua="Mozilla/5.0 (Windows NT 6.1; WOW64; rv:27.0) Gecko/20100101 Firefox/27.0"
css="$(curl -sS -A "$ua" "https://fonts.googleapis.com/css?family=Cormorant+Garamond:400,500,600,700|Inter:400,500,600")"
# Start clean so a short or changed response cannot leave stale faces behind.
rm -f "$dir"/*.woff
i=0
while read -r url; do i=$((i + 1)); curl -sS -o "$dir/face-$i.woff" "$url"; done < <(printf '%s\n' "$css" | grep -o 'https://[^)]*\.woff' | sort -u)
# Filenames carry no meaning: lib.mjs identifies each face from its own family and
# weight metadata and refuses to run unless all seven expected faces are present.
if [ "$i" -ne 7 ]; then echo "expected 7 faces, got $i" >&2; exit 1; fi
echo "fetched $i faces into $dir"
