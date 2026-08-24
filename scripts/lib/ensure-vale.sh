#!/usr/bin/env bash
# Provision the pinned Vale release in CI while leaving local installation to the developer.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PINNED_VALE_VERSION="$(cat "$ROOT/.vale-version"; printf '.')"
PINNED_VALE_VERSION="${PINNED_VALE_VERSION%.}"
if [[ "$PINNED_VALE_VERSION" == *$'\n' ]]; then
  PINNED_VALE_VERSION="${PINNED_VALE_VERSION%$'\n'}"
  PINNED_VALE_VERSION="${PINNED_VALE_VERSION%$'\r'}"
fi
if ! [[ "$PINNED_VALE_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ensure-vale.sh: invalid pinned version in .vale-version: $PINNED_VALE_VERSION" >&2
  exit 1
fi

CI_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --ci-only) CI_ONLY=true ;;
    *)
      echo "ensure-vale.sh: unknown argument: $arg (supported: --ci-only)" >&2
      exit 1 ;;
  esac
done

VALE_VERSION="${ENSURE_VALE_VERSION:-v$PINNED_VALE_VERSION}"

if command -v vale >/dev/null 2>&1; then
  INSTALLED_VALE_VERSION="$(vale --version | awk '{print $NF}')"
  if [ "$INSTALLED_VALE_VERSION" != "${VALE_VERSION#v}" ]; then
    echo "ensure-vale.sh: Vale ${INSTALLED_VALE_VERSION} does not match pinned ${VALE_VERSION#v}; refusing to run with an unverified binary" >&2
    exit 1
  fi
  if [ "${GITHUB_ACTIONS:-}" != "true" ]; then
    echo "Vale already present: $(vale --version)"
    exit 0
  fi
  echo "ensure-vale.sh: CI will replace the existing matching-version binary with the checksum-verified release"
fi

if $CI_ONLY && [ "${GITHUB_ACTIONS:-}" != "true" ]; then
  echo "ensure-vale.sh: not a CI run (GITHUB_ACTIONS != true); install Vale locally with 'brew install vale'."
  exit 0
fi

VALE_SYSTEM="${ENSURE_VALE_SYSTEM:-$(uname -s)}"
VALE_MACHINE="${ENSURE_VALE_MACHINE:-$(uname -m)}"
if [ "$VALE_SYSTEM" != "Linux" ] || [ "$VALE_MACHINE" != "x86_64" ]; then
  echo "ensure-vale.sh: the automated install supports Linux x86_64 only" >&2
  exit 1
fi

VALE_DEST="${ENSURE_VALE_DEST:-/usr/local/bin/vale}"
DEFAULT_SHA256="a6f71a75a12fe689345b754f2412b90367fe33648abb7d200fa19eaadc2dbf6d"
if [ "$VALE_VERSION" != "v$PINNED_VALE_VERSION" ] && [ -z "${ENSURE_VALE_SHA256:-}" ]; then
  echo "ensure-vale.sh: ENSURE_VALE_SHA256 is required when overriding the pinned version" >&2
  exit 1
fi
VALE_SHA256="${ENSURE_VALE_SHA256:-$DEFAULT_SHA256}"

VALE_TEMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ensure-vale.XXXXXX")"
trap 'rm -rf "$VALE_TEMP_DIR"' EXIT
VALE_ARCHIVE="$VALE_TEMP_DIR/vale.tar.gz"

if [ -n "${ENSURE_VALE_ARCHIVE_PATH:-}" ]; then
  cp "$ENSURE_VALE_ARCHIVE_PATH" "$VALE_ARCHIVE"
else
  curl -fsSL --connect-timeout 10 --max-time 120 -o "$VALE_ARCHIVE" \
    "https://github.com/vale-cli/vale/releases/download/${VALE_VERSION}/vale_${VALE_VERSION#v}_Linux_64-bit.tar.gz"
fi

if command -v sha256sum >/dev/null 2>&1; then
  printf '%s  %s\n' "$VALE_SHA256" "$VALE_ARCHIVE" | sha256sum -c - >/dev/null
else
  [ "$(shasum -a 256 "$VALE_ARCHIVE" | awk '{print $1}')" = "$VALE_SHA256" ]
fi
tar -xzf "$VALE_ARCHIVE" -C "$VALE_TEMP_DIR" vale

if [ -w "$(dirname "$VALE_DEST")" ]; then
  install -m 0755 "$VALE_TEMP_DIR/vale" "$VALE_DEST"
else
  sudo install -m 0755 "$VALE_TEMP_DIR/vale" "$VALE_DEST"
fi

"$VALE_DEST" --version | grep -F "${VALE_VERSION#v}" >/dev/null
hash -r
RESOLVED_VALE="$(command -v vale || true)"
if [ "$RESOLVED_VALE" != "$VALE_DEST" ]; then
  echo "ensure-vale.sh: installed $VALE_DEST but PATH resolves vale to ${RESOLVED_VALE:-nothing}" >&2
  exit 1
fi
echo "Installed $("$VALE_DEST" --version)"
