#!/usr/bin/env bash
# Provision the pinned, checksum-verified Vale release.
#
#   --ci-only  Install to the system path on a GitHub Actions runner (Linux
#              x86_64); outside CI, check the PATH binary and install nothing.
#   --local    Install into the project-local cache that scripts/lint-prose.mjs
#              prefers over PATH (node_modules/.cache/vale/<version>/vale).
#              Supports macOS arm64/x86_64 and Linux x86_64, so a Homebrew
#              upgrade can no longer move the developer off the pin (#1578).
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
LOCAL=false
for arg in "$@"; do
  case "$arg" in
    --ci-only) CI_ONLY=true ;;
    --local) LOCAL=true ;;
    *)
      echo "ensure-vale.sh: unknown argument: $arg (supported: --ci-only, --local)" >&2
      exit 1 ;;
  esac
done
if $CI_ONLY && $LOCAL; then
  echo "ensure-vale.sh: --ci-only and --local are mutually exclusive" >&2
  exit 1
fi

VALE_VERSION="${ENSURE_VALE_VERSION:-v$PINNED_VALE_VERSION}"
if ! [[ "$VALE_VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ensure-vale.sh: invalid version override: $VALE_VERSION" >&2
  exit 1
fi

if $LOCAL; then
  # The project-local binary is the point: whatever PATH resolves (Homebrew's
  # newer release, typically) is irrelevant, so it is neither checked nor used.
  VALE_DEST="${ENSURE_VALE_DEST:-$ROOT/node_modules/.cache/vale/${VALE_VERSION#v}/vale}"
  if [ -x "$VALE_DEST" ] &&
    [ "$("$VALE_DEST" --version 2>/dev/null | awk '{print $NF}')" = "${VALE_VERSION#v}" ]; then
    echo "Vale already installed: $VALE_DEST ($("$VALE_DEST" --version))"
    exit 0
  fi
else
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
    echo "ensure-vale.sh: not a CI run (GITHUB_ACTIONS != true); install the pinned Vale locally with 'npm run vale:install'."
    exit 0
  fi
  VALE_DEST="${ENSURE_VALE_DEST:-/usr/local/bin/vale}"
fi

VALE_SYSTEM="${ENSURE_VALE_SYSTEM:-$(uname -s)}"
VALE_MACHINE="${ENSURE_VALE_MACHINE:-$(uname -m)}"
# One pinned SHA-256 per supported release asset, copied from the release's own
# vale_<version>_checksums.txt. Bump all three together with .vale-version.
case "$VALE_SYSTEM/$VALE_MACHINE" in
  Linux/x86_64)
    VALE_ASSET="Linux_64-bit"
    DEFAULT_SHA256="22aa69a556558e4a9dfc63c17030777383d8d3c48dcdfad655fa98e839d666ed" ;;
  Darwin/arm64)
    VALE_ASSET="macOS_arm64"
    DEFAULT_SHA256="a6c3370f53bad93086c6b85f3163676e44e08049d69743afdcc13f3aab5b7482" ;;
  Darwin/x86_64)
    VALE_ASSET="macOS_64-bit"
    DEFAULT_SHA256="df42b317be6ece6a6a70d06b952deec581d047046eb93ea4632f58da56a86ff9" ;;
  *)
    VALE_ASSET="" ;;
esac
if $LOCAL; then
  if [ -z "$VALE_ASSET" ]; then
    echo "ensure-vale.sh: --local supports macOS arm64/x86_64 and Linux x86_64 only (got $VALE_SYSTEM $VALE_MACHINE)" >&2
    exit 1
  fi
elif [ "$VALE_ASSET" != "Linux_64-bit" ]; then
  echo "ensure-vale.sh: the automated install supports Linux x86_64 only; on macOS use --local ('npm run vale:install')" >&2
  exit 1
fi

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
    "https://github.com/vale-cli/vale/releases/download/${VALE_VERSION}/vale_${VALE_VERSION#v}_${VALE_ASSET}.tar.gz"
fi

if command -v sha256sum >/dev/null 2>&1; then
  printf '%s  %s\n' "$VALE_SHA256" "$VALE_ARCHIVE" | sha256sum -c - >/dev/null
else
  [ "$(shasum -a 256 "$VALE_ARCHIVE" | awk '{print $1}')" = "$VALE_SHA256" ]
fi
tar -xzf "$VALE_ARCHIVE" -C "$VALE_TEMP_DIR" vale

if $LOCAL; then
  # Install under a temporary name and rename, so an interrupted run never
  # leaves a truncated binary at the path lint-prose.mjs trusts.
  mkdir -p "$(dirname "$VALE_DEST")"
  install -m 0755 "$VALE_TEMP_DIR/vale" "$VALE_DEST.tmp.$$"
  mv -f "$VALE_DEST.tmp.$$" "$VALE_DEST"
elif [ -w "$(dirname "$VALE_DEST")" ]; then
  install -m 0755 "$VALE_TEMP_DIR/vale" "$VALE_DEST"
else
  sudo install -m 0755 "$VALE_TEMP_DIR/vale" "$VALE_DEST"
fi

if [ "$("$VALE_DEST" --version | awk '{print $NF}')" != "${VALE_VERSION#v}" ]; then
  echo "ensure-vale.sh: $VALE_DEST does not report version ${VALE_VERSION#v}" >&2
  if $LOCAL; then rm -f "$VALE_DEST"; fi
  exit 1
fi
if ! $LOCAL; then
  hash -r
  RESOLVED_VALE="$(command -v vale || true)"
  if [ "$RESOLVED_VALE" != "$VALE_DEST" ]; then
    echo "ensure-vale.sh: installed $VALE_DEST but PATH resolves vale to ${RESOLVED_VALE:-nothing}" >&2
    exit 1
  fi
fi
echo "Installed $("$VALE_DEST" --version) at $VALE_DEST"
