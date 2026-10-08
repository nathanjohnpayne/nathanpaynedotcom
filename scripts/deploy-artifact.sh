#!/usr/bin/env bash
# Deploy the attested CI build of a commit on main (#1239, part of #1104).
#
# #1104: the deploy aliases run `npm run build` after preflight has exported
# Firebase and Cloudflare credentials and the author/reviewer PATs, so every
# build dependency and hook inherits them. The owner's decision (2026-10-08)
# is to build in credential-free CI (.github/workflows/build-artifact.yml,
# #1238) and deploy that job's verified artifact in a separate step that never
# builds. This script is that step. It is not the default yet: the package
# aliases still build locally until #1240 switches them.
#
# Run it directly, never through `npm run`: npm puts node_modules/.bin first
# on PATH, which is exactly the resolution this script refuses.
#
# Usage:
#   scripts/deploy-artifact.sh [--sha <40-hex>] [--hosting-only] [--dry-run] [--no-purge]
#
#   --sha <sha>      Commit to deploy. Default: origin/main after
#                    `git fetch origin main`. Either way it must be a full
#                    40-hex SHA that is an ancestor of (or equal to)
#                    origin/main.
#   --hosting-only   Pass `--only hosting` to the Firebase helper, like the
#                    old `deploy:hosting` alias. firebase.json declares
#                    hosting and nothing else (and this script refuses one
#                    that declares more), so both modes deploy hosting; the
#                    flag is kept for parity.
#   --dry-run        Do everything up to, but not including, the Firebase
#                    deploy and the Cloudflare purge: find the run, download,
#                    verify, extract, assemble the deploy directory, resolve
#                    the tools, and print what each child would receive.
#   --no-purge       Deploy without the Cloudflare purge (run
#                    scripts/cf-cache-purge.sh yourself afterwards).
#
# What it does, in order. Steps 1-6 read no credential, and any failure
# among them aborts before a credential-holding child exists:
#
#   1. Resolves every tool from a fixed PATH (DEFAULT_SAFE_PATH below), never
#      the caller's, and refuses a tool whose path or real path is inside any
#      worktree of this repository or inside a node_modules directory (the
#      one exception is a global npm install's own package directory, for
#      `firebase` - see trusted_tool).
#   2. Fetches origin/main and requires the SHA to be on it.
#   3. Finds the successful build-artifact.yml run for exactly that SHA on
#      main (event push or workflow_dispatch), and fails if the build failed.
#   4. Downloads its artifact into a fresh temporary directory and requires
#      exactly the archive and SHA256SUMS, a manifest naming exactly that
#      archive, and a matching SHA-256.
#   5. Runs `gh attestation verify` pinned to the repository, the signer
#      workflow, refs/heads/main and the exact commit (--source-digest).
#   6. Extracts the archive with a validating extractor (regular files and
#      directories only; no absolute paths, `..`, links or devices) and adds
#      firebase.json and .firebaserc from the verified commit's tree (never
#      the working tree), rejecting a firebase.json with predeploy or
#      postdeploy hooks or with anything other than hosting from `dist`.
#   7. Deploys from that directory with op-firebase-deploy under `env -i`
#      and the allowlist in FIREBASE_ENV_NAMES.
#   8. Purges Cloudflare with the verified commit's scripts/cf-cache-purge.sh,
#      run from memory under `env -i` with only CF_API_TOKEN and the
#      preflight mode flags it reads.
#
# Nothing here runs npm, astro, prebuild or a working-tree script. The only
# repository code that runs is the verified commit's purge script.
#
# Environment the children receive. Every child process starts from `env -i`;
# nothing is inherited.
#
#   base (all)  PATH=<safe path>, HOME, and USER, LOGNAME, TMPDIR, LANG,
#               LC_ALL, TERM when set.
#   git         base + SSH_AUTH_SOCK (an ssh origin needs the agent socket).
#               Hooks disabled with core.hooksPath=/dev/null.
#   gh          base + GH_TOKEN when the caller set it (otherwise gh uses its
#               stored login), GH_CONFIG_DIR / XDG_CONFIG_HOME when set.
#               Never OP_PREFLIGHT_*_PAT.
#   firebase    base + FIREBASE_ENV_NAMES: the source-credential pointers
#               op-firebase-deploy reads. No GitHub token, no PAT, no
#               CF_API_TOKEN, no OP_SESSION_*/OP_SERVICE_ACCOUNT_TOKEN.
#   purge       base + CF_API_TOKEN, OP_PREFLIGHT_DONE, OP_PREFLIGHT_MODE,
#               OP_ACCOUNT. No Firebase credential pointers, no GitHub token.
#
# Both op-firebase-deploy and the purge can fall back to `op` when preflight
# did not cache their credential. That works through the 1Password desktop
# app's CLI integration, which needs no environment; a session-token login
# (OP_SESSION_*) is deliberately not passed, because it would hand a
# 1Password credential to firebase. Run preflight first, or use the app
# integration.
#
# Exit codes: 0 deployed (or dry run complete), 1 refused or failed, 2 usage.

set -euo pipefail

# The script's own utility calls (dirname, mktemp, sed, rm, ...) run before
# and between the `env -i` children, with the full parent environment. Pin
# PATH to the system directories first, so a caller PATH that starts with a
# repository-controlled directory such as node_modules/.bin cannot supply one
# of them (Codex P1 on PR #1244). Tools the children need are resolved
# separately from SAFE_PATH below.
PATH=/usr/bin:/bin
export PATH
umask 077

REPO_SLUG="nathanjohnpayne/nathanpaynedotcom"
WORKFLOW_FILE="build-artifact.yml"
SIGNER_WORKFLOW="${REPO_SLUG}/.github/workflows/${WORKFLOW_FILE}"
OIDC_ISSUER="https://token.actions.githubusercontent.com"
FIREBASE_PROJECT="nathanpaynedotcom"
DEFAULT_SAFE_PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
# Upper bounds for the extractor, far above today's ~185 entries and ~23 MB.
MAX_MEMBERS=20000
MAX_TOTAL_BYTES=$((1024 * 1024 * 1024))

FIREBASE_ENV_NAMES="GOOGLE_APPLICATION_CREDENTIALS OP_PREFLIGHT_ADC_TMPFILE OP_PREFLIGHT_FIREBASE_SA_TMPFILE OP_PREFLIGHT_FIREBASE_PROJECT FIREBASE_DEPLOY_SA_NAME FIREBASE_DEPLOY_SA_EMAIL FIREBASE_SOURCE_CREDENTIAL_OP_URI GCP_ADC_OP_URI OP_ACCOUNT"
PURGE_ENV_NAMES="CF_API_TOKEN OP_PREFLIGHT_DONE OP_PREFLIGHT_MODE OP_ACCOUNT"

# The Python programs this script runs, kept out of command substitutions
# (bash 3.2 mis-parses a here-document inside $(...)).

# Picks the newest successful build-artifact run for the SHA from `gh run list`.
IFS= read -r -d '' PY_PICK_RUN <<'PY' || true
import json, sys
path, sha = sys.argv[1], sys.argv[2]
try:
    runs = json.load(open(path))
except Exception as exc:
    print(f"unreadable run list: {exc}", file=sys.stderr)
    sys.exit(1)
if not isinstance(runs, list):
    print("run list is not a JSON array", file=sys.stderr)
    sys.exit(1)
mine = [r for r in runs
        if isinstance(r, dict)
        and r.get("headSha") == sha
        and r.get("headBranch") == "main"
        and r.get("event") in ("push", "workflow_dispatch")]
ok = [r for r in mine if r.get("status") == "completed" and r.get("conclusion") == "success"
      and isinstance(r.get("databaseId"), int)]
if not ok:
    if mine:
        seen = ", ".join(f"{r.get('databaseId')}={r.get('status')}/{r.get('conclusion')}" for r in mine)
        print(f"no successful run for {sha}; runs found: {seen}", file=sys.stderr)
    else:
        print(f"no build-artifact run on main for {sha}", file=sys.stderr)
    sys.exit(1)
print(max(r["databaseId"] for r in ok))
PY

# Validates every archive member, then extracts regular files and directories
# only, creating each file with O_EXCL|O_NOFOLLOW under a fresh directory.
IFS= read -r -d '' PY_EXTRACT <<'PY' || true
import os, sys, tarfile
archive, dest, max_members, max_bytes = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])

def fail(msg):
    print(f"unsafe archive: {msg}", file=sys.stderr)
    sys.exit(1)

def parts_of(name):
    if "\x00" in name or "\\" in name:
        fail(f"{name!r}: illegal character")
    if name.startswith("/"):
        fail(f"{name!r}: absolute path")
    parts = [p for p in name.split("/") if p not in ("", ".")]
    if ".." in parts:
        fail(f"{name!r}: parent-directory component")
    return parts

try:
    tf = tarfile.open(archive, "r:")
except tarfile.TarError as exc:
    fail(f"not an uncompressed tar archive ({exc})")

with tf:
    members = tf.getmembers()
    if len(members) > max_members:
        fail(f"{len(members)} members exceeds {max_members}")
    plan, seen, files, total = [], set(), set(), 0
    for m in members:
        if m.isdir():
            kind = "d"
        elif m.isreg():
            kind = "f"
        else:
            fail(f"{m.name!r}: only regular files and directories are allowed")
        parts = parts_of(m.name)
        if not parts:
            if kind == "d":
                continue
            fail(f"{m.name!r}: empty file name")
        key = "/".join(parts)
        if key in seen:
            fail(f"{key!r}: duplicate entry")
        seen.add(key)
        if kind == "f":
            files.add(key)
            total += m.size
            if total > max_bytes:
                fail(f"contents exceed {max_bytes} bytes")
        plan.append((m, parts, kind))
    for _, parts, _ in plan:
        for i in range(1, len(parts)):
            if "/".join(parts[:i]) in files:
                fail(f"{'/'.join(parts)!r}: parent is a file")
    if "index.html" not in files:
        fail("no index.html at the archive root")

    os.mkdir(dest, 0o700)
    nofollow = getattr(os, "O_NOFOLLOW", 0)
    for m, parts, kind in plan:
        target = os.path.join(dest, *parts)
        if kind == "d":
            os.makedirs(target, 0o700, exist_ok=True)
            continue
        os.makedirs(os.path.dirname(target), 0o700, exist_ok=True)
        src = tf.extractfile(m)
        fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | nofollow, 0o600)
        with os.fdopen(fd, "wb") as out:
            while True:
                chunk = src.read(1 << 20)
                if not chunk:
                    break
                out.write(chunk)
print(len(files))
PY

# Accepts only a single hosting site served from dist/, with no hooks.
IFS= read -r -d '' PY_CHECK_FIREBASE_CONFIG <<'PY' || true
import json, sys
cfg_path, rc_path, project = sys.argv[1:4]
def fail(msg):
    print(msg, file=sys.stderr)
    sys.exit(1)
try:
    cfg = json.load(open(cfg_path))
    rc = json.load(open(rc_path))
except Exception as exc:
    fail(f"unreadable Firebase config: {exc}")
# Anything but a single hosting site served from dist/ would deploy something
# this script did not verify, and a predeploy/postdeploy hook is a repository
# command that would run while Firebase credentials exist.
if not isinstance(cfg, dict) or set(cfg) != {"hosting"}:
    fail(f"firebase.json must declare hosting and nothing else (has {sorted(cfg) if isinstance(cfg, dict) else type(cfg).__name__})")
hosting = cfg["hosting"]
if not isinstance(hosting, dict):
    fail("firebase.json hosting must be a single site")
if hosting.get("public") != "dist":
    fail("firebase.json hosting.public must be dist")
for hook in ("predeploy", "postdeploy"):
    if hook in hosting:
        fail(f"firebase.json hosting declares a {hook} hook")
if not isinstance(rc, dict) or (rc.get("projects") or {}).get("default") != project:
    fail(f".firebaserc default project must be {project}")
PY

log() { printf '[deploy-artifact] %s\n' "$*" >&2; }
die() {
  log "ERROR: $*"
  exit 1
}

usage() {
  awk '/^# Usage:/{on=1} /^# What it does/{on=0} on' "$0" | sed 's/^# \{0,1\}//'
}

SHA=""
HOSTING_ONLY=0
DRY_RUN=0
PURGE=1
while [ "$#" -gt 0 ]; do
  case "$1" in
    --sha)
      [ "$#" -ge 2 ] || { usage >&2; exit 2; }
      SHA="$2"
      shift 2
      ;;
    --sha=*)
      SHA="${1#--sha=}"
      shift
      ;;
    --hosting-only) HOSTING_ONLY=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    --no-purge) PURGE=0; shift ;;
    -h | --help) usage; exit 0 ;;
    *)
      log "unknown argument: $1"
      usage >&2
      exit 2
      ;;
  esac
done

if [ -n "$SHA" ] && ! [[ "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
  die "--sha must be a full 40-character lowercase hex commit SHA"
fi

[ -n "${HOME:-}" ] || die "HOME is not set"

# --- 1. A fixed PATH, validated, and every tool resolved from it ------------

# DEPLOY_ARTIFACT_SAFE_PATH replaces the default list (the tests use it to put
# stub tools first). Whatever it holds is validated below exactly like the
# default: absolute entries only, none empty, none inside node_modules or this
# repository.
SAFE_PATH="${DEPLOY_ARTIFACT_SAFE_PATH:-$DEFAULT_SAFE_PATH}"

has_node_modules_component() {
  case "/$1/" in */node_modules/*) return 0 ;; esac
  return 1
}

SAFE_DIRS=()
rest="${SAFE_PATH}:"
while [ -n "$rest" ]; do
  dir="${rest%%:*}"
  rest="${rest#*:}"
  case "$dir" in
    "") die "safe PATH has an empty entry (it would mean the current directory)" ;;
    /*) ;;
    *) die "safe PATH entry is not absolute: ${dir}" ;;
  esac
  if has_node_modules_component "$dir"; then die "safe PATH entry is inside node_modules: ${dir}"; fi
  SAFE_DIRS+=("$dir")
done

BASE_ENV=("PATH=${SAFE_PATH}" "HOME=${HOME}")
for name in USER LOGNAME TMPDIR LANG LC_ALL TERM; do
  if [ -n "${!name:-}" ]; then
    BASE_ENV+=("${name}=${!name}")
  fi
done

# Every child, including the ones that only inspect files, starts from env -i.
run_clean() { /usr/bin/env -i "${BASE_ENV[@]}" "$@"; }

# Search SAFE_PATH only. Prints the first executable candidate, unresolved.
find_on_safe_path() {
  local tool="$1" dir
  for dir in "${SAFE_DIRS[@]}"; do
    if [ -f "${dir}/${tool}" ] && [ -x "${dir}/${tool}" ]; then
      printf '%s\n' "${dir}/${tool}"
      return 0
    fi
  done
  return 1
}

PYTHON="$(find_on_safe_path python3)" || die "python3 not found on ${SAFE_PATH}"
GIT="$(find_on_safe_path git)" || die "git not found on ${SAFE_PATH}"

realpath_of() { run_clean "$PYTHON" -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$1"; }

SCRIPT_DIR="$(cd -P "$(dirname "$0")" && pwd)"
REPO_ROOT="$(run_clean "$GIT" -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null)" ||
  die "not inside a git checkout: ${SCRIPT_DIR}"

git_clean() {
  local extra=()
  if [ -n "${SSH_AUTH_SOCK:-}" ]; then extra+=("SSH_AUTH_SOCK=${SSH_AUTH_SOCK}"); fi
  /usr/bin/env -i "${BASE_ENV[@]}" ${extra[@]+"${extra[@]}"} GIT_TERMINAL_PROMPT=0 \
    "$GIT" -C "$REPO_ROOT" -c core.hooksPath=/dev/null -c core.fsmonitor=false "$@"
}

# Every worktree of this repository, main checkout included, by real path.
FORBIDDEN_ROOTS=()
while IFS= read -r line; do
  case "$line" in
    "worktree "*) FORBIDDEN_ROOTS+=("$(realpath_of "${line#worktree }")") ;;
  esac
done < <(git_clean worktree list --porcelain)
FORBIDDEN_ROOTS+=("$(realpath_of "$REPO_ROOT")")

inside_forbidden_root() {
  local path="$1" root
  for root in "${FORBIDDEN_ROOTS[@]}"; do
    case "$path/" in "$root"/*) return 0 ;; esac
  done
  return 1
}

for dir in "${SAFE_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    real_dir="$(realpath_of "$dir")"
    if inside_forbidden_root "$real_dir" || inside_forbidden_root "$dir"; then
      die "safe PATH entry is inside this repository: ${dir}"
    fi
  fi
done

# A tool is trusted when neither the path found on the safe PATH nor its real
# path is inside a worktree of this repository, and neither is inside a
# node_modules directory. One exception, for a global npm install: when the
# candidate is <prefix>/bin/<tool>, its real path may be inside
# <prefix>/lib/node_modules/<package>/ (no deeper node_modules).
trusted_tool() {
  local candidate="$1" real prefix rest
  real="$(realpath_of "$candidate")"
  if inside_forbidden_root "$candidate" || inside_forbidden_root "$real"; then
    log "refusing ${candidate}: resolves inside this repository (${real})"
    return 1
  fi
  if has_node_modules_component "$(dirname "$candidate")"; then
    log "refusing ${candidate}: found inside a node_modules directory"
    return 1
  fi
  if has_node_modules_component "$real"; then
    prefix="$(dirname "$(dirname "$candidate")")"
    prefix="$(realpath_of "$prefix")"
    case "$real" in
      "$prefix"/lib/node_modules/*)
        rest="${real#"$prefix"/lib/node_modules/}"
        rest="${rest#*/}"
        if has_node_modules_component "$rest"; then
          log "refusing ${candidate}: resolves into a nested node_modules (${real})"
          return 1
        fi
        ;;
      *)
        log "refusing ${candidate}: resolves inside a node_modules directory (${real})"
        return 1
        ;;
    esac
  fi
  printf '%s\n' "$candidate"
}

resolve_tool() {
  local tool="$1" candidate
  candidate="$(find_on_safe_path "$tool")" || die "${tool} not found on ${SAFE_PATH}"
  trusted_tool "$candidate" || die "${tool} is not a trusted executable"
}

PYTHON="$(resolve_tool python3)"
GIT="$(resolve_tool git)"
GH="$(resolve_tool gh)"
if SHASUM="$(find_on_safe_path shasum)"; then
  SHASUM="$(trusted_tool "$SHASUM")" || die "shasum is not a trusted executable"
  SHASUM_ARGS=(-a 256)
else
  SHASUM="$(resolve_tool sha256sum)"
  SHASUM_ARGS=()
fi
FIREBASE="$(resolve_tool firebase)"
case "$(realpath_of "$FIREBASE")" in
  *.js)
    # A node script: the interpreter `#!/usr/bin/env node` finds must be
    # trusted too, and it is found on the same PATH the child gets.
    resolve_tool node >/dev/null
    ;;
esac
BASH_BIN="$(resolve_tool bash)"
if [ "$PURGE" -eq 1 ]; then
  resolve_tool curl >/dev/null
fi
# `op` is optional: preflight usually caches every credential. But the helper
# (its ADC fallback) and the verified purge script (when CF_API_TOKEN is unset)
# can both run `op read`, so an `op` the safe PATH provides must be trusted
# before either child starts.
if OP_BIN="$(find_on_safe_path op)"; then
  trusted_tool "$OP_BIN" >/dev/null || die "op is not a trusted executable"
fi

# The helper lives in ~/.local/bin by convention (DEPLOYMENT.md § First-Time
# Setup), which is not on the safe PATH. It is invoked by absolute path; the
# directory is not added to the child's PATH, so the helper's own `firebase`
# lookup lands on the same binary resolved above.
if [ -x "${HOME}/.local/bin/op-firebase-deploy" ] && [ -f "${HOME}/.local/bin/op-firebase-deploy" ]; then
  HELPER="$(trusted_tool "${HOME}/.local/bin/op-firebase-deploy")" ||
    die "op-firebase-deploy is not a trusted executable"
else
  HELPER="$(resolve_tool op-firebase-deploy)"
fi

# gh must support the attestation pins this script relies on.
GH_ENV=()
if [ -n "${GH_TOKEN:-}" ]; then GH_ENV+=("GH_TOKEN=${GH_TOKEN}"); fi
for name in GH_CONFIG_DIR XDG_CONFIG_HOME; do
  if [ -n "${!name:-}" ]; then GH_ENV+=("${name}=${!name}"); fi
done
gh_clean() {
  /usr/bin/env -i "${BASE_ENV[@]}" ${GH_ENV[@]+"${GH_ENV[@]}"} \
    GH_PROMPT_DISABLED=1 GH_NO_UPDATE_NOTIFIER=1 NO_COLOR=1 "$GH" "$@"
}
attest_help="$(gh_clean attestation verify --help 2>&1)" ||
  die "gh attestation verify is unavailable (upgrade gh)"
for flag in --signer-workflow --source-ref --source-digest --deny-self-hosted-runners; do
  case "$attest_help" in
    *"$flag"*) ;;
    *) die "gh attestation verify does not support ${flag} (upgrade gh)" ;;
  esac
done

# --- Temporary directory, removed on every exit -----------------------------

tmp_base="${TMPDIR:-/tmp}"
WORK="$(mktemp -d "${tmp_base%/}/deploy-artifact.XXXXXX")"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# --- 2. The SHA is on main --------------------------------------------------

log "fetching origin main"
git_clean fetch --quiet --no-tags origin main ||
  die "git fetch origin main failed"
MAIN_SHA="$(git_clean rev-parse --verify --quiet 'refs/remotes/origin/main^{commit}')" ||
  die "origin/main does not resolve"
if [ -z "$SHA" ]; then
  SHA="$MAIN_SHA"
fi
git_clean cat-file -e "${SHA}^{commit}" 2>/dev/null ||
  die "commit ${SHA} is not in this repository"
git_clean merge-base --is-ancestor "$SHA" "$MAIN_SHA" ||
  die "commit ${SHA} is not on main (origin/main is ${MAIN_SHA})"
log "commit ${SHA} is on main (origin/main ${MAIN_SHA})"

ARTIFACT="nathanpaynedotcom-dist-${SHA}"
ARCHIVE="${ARTIFACT}.tar"

# --- 3. The successful build-artifact run for exactly this SHA --------------

RUNS_JSON="${WORK}/runs.json"
gh_clean run list --repo "$REPO_SLUG" --workflow "$WORKFLOW_FILE" --branch main \
  --commit "$SHA" --limit 50 \
  --json databaseId,headSha,headBranch,event,status,conclusion,workflowName >"$RUNS_JSON" ||
  die "could not list ${WORKFLOW_FILE} runs"

RUN_ID="$(run_clean "$PYTHON" -c "$PY_PICK_RUN" "$RUNS_JSON" "$SHA")" ||
  die "no successful ${WORKFLOW_FILE} run for ${SHA} (did the build fail?)"
log "using run ${RUN_ID}"

# --- 4. Download, and check the file set and digest -------------------------

DL="${WORK}/download"
mkdir "$DL"
gh_clean run download "$RUN_ID" --repo "$REPO_SLUG" --name "$ARTIFACT" --dir "$DL" ||
  die "could not download artifact ${ARTIFACT} from run ${RUN_ID}"

listing="$(cd "$DL" && find . -mindepth 1 -maxdepth 1 -print | sed 's|^\./||' | LC_ALL=C sort | tr '\n' ' ')"
[ "$listing" = "SHA256SUMS ${ARCHIVE} " ] ||
  die "artifact must contain exactly SHA256SUMS and ${ARCHIVE}; found: ${listing}"
for f in SHA256SUMS "$ARCHIVE"; do
  if [ -L "${DL}/${f}" ] || [ ! -f "${DL}/${f}" ]; then
    die "${f} is not a regular file"
  fi
done

[ "$(wc -l <"${DL}/SHA256SUMS" | tr -d ' ')" = "1" ] || die "SHA256SUMS must have exactly one line"
manifest="$(cat "${DL}/SHA256SUMS")"
expected_digest="${manifest%%  *}"
[ "$manifest" = "${expected_digest}  ${ARCHIVE}" ] && [[ "$expected_digest" =~ ^[0-9a-f]{64}$ ]] ||
  die "SHA256SUMS must name exactly ${ARCHIVE}"
actual_digest="$(run_clean "$SHASUM" ${SHASUM_ARGS[@]+"${SHASUM_ARGS[@]}"} "${DL}/${ARCHIVE}")"
actual_digest="${actual_digest%% *}"
[ "$actual_digest" = "$expected_digest" ] ||
  die "digest mismatch: SHA256SUMS says ${expected_digest}, archive is ${actual_digest}"
log "SHA256SUMS matches (sha256:${actual_digest})"

# --- 5. Attestation, pinned to repository, workflow, ref and commit ---------

gh_clean attestation verify "${DL}/${ARCHIVE}" \
  --repo "$REPO_SLUG" \
  --signer-workflow "$SIGNER_WORKFLOW" \
  --source-ref refs/heads/main \
  --source-digest "$SHA" \
  --cert-oidc-issuer "$OIDC_ISSUER" \
  --deny-self-hosted-runners >&2 ||
  die "attestation verification failed for ${ARCHIVE}"
log "attestation verified: ${SIGNER_WORKFLOW} on refs/heads/main at ${SHA}"

# --- 6. Assemble the deploy directory ---------------------------------------

SITE="${WORK}/site"
mkdir "$SITE"
file_count="$(run_clean "$PYTHON" -c "$PY_EXTRACT" "${DL}/${ARCHIVE}" "${SITE}/dist" "$MAX_MEMBERS" "$MAX_TOTAL_BYTES")" ||
  die "refusing to extract ${ARCHIVE}"
log "extracted ${file_count} files into the deploy directory"

git_clean cat-file blob "${SHA}:firebase.json" >"${SITE}/firebase.json" ||
  die "firebase.json is missing at ${SHA}"
git_clean cat-file blob "${SHA}:.firebaserc" >"${SITE}/.firebaserc" ||
  die ".firebaserc is missing at ${SHA}"
run_clean "$PYTHON" -c "$PY_CHECK_FIREBASE_CONFIG" "${SITE}/firebase.json" "${SITE}/.firebaserc" "$FIREBASE_PROJECT" ||
  die "refusing the Firebase config at ${SHA}"

links="$(find "$SITE" -type l | head -n 1)"
[ -z "$links" ] || die "deploy directory contains a symlink: ${links}"

PURGE_SRC=""
if [ "$PURGE" -eq 1 ]; then
  # Held in memory, never written where the deploy child could change it.
  PURGE_SRC="$(git_clean cat-file blob "${SHA}:scripts/cf-cache-purge.sh")" ||
    die "scripts/cf-cache-purge.sh is missing at ${SHA}"
fi

# The script running now is the working tree's copy. Say so when it is not
# the verified commit's copy, so a modified checkout is at least visible.
if ! committed_self="$(git_clean cat-file blob "${SHA}:scripts/deploy-artifact.sh" 2>/dev/null)"; then
  log "WARNING: ${SHA} has no scripts/deploy-artifact.sh; this run uses the working-tree copy"
elif [ "$committed_self" != "$(cat "$0")" ]; then
  log "WARNING: this script differs from scripts/deploy-artifact.sh at ${SHA}"
fi

# --- Child environments -----------------------------------------------------

FIREBASE_ENV=("${BASE_ENV[@]}")
for name in $FIREBASE_ENV_NAMES; do
  if [ -n "${!name:-}" ]; then FIREBASE_ENV+=("${name}=${!name}"); fi
done
PURGE_ENV=("${BASE_ENV[@]}")
for name in $PURGE_ENV_NAMES; do
  if [ -n "${!name:-}" ]; then PURGE_ENV+=("${name}=${!name}"); fi
done

names_of() {
  local entry out=""
  for entry in "$@"; do out="${out} ${entry%%=*}"; done
  printf '%s\n' "${out# }"
}

HELPER_ARGS=()
if [ "$HOSTING_ONLY" -eq 1 ]; then HELPER_ARGS=(--only hosting); fi

log "commit:        ${SHA}"
log "run:           ${RUN_ID}"
log "archive:       ${ARCHIVE} (sha256:${actual_digest}, ${file_count} files)"
log "deploy dir:    ${SITE} (firebase.json, .firebaserc, dist/)"
log "helper:        ${HELPER} -> $(realpath_of "$HELPER")"
log "firebase:      ${FIREBASE} -> $(realpath_of "$FIREBASE")"
log "child PATH:    ${SAFE_PATH}"
log "firebase env:  $(names_of "${FIREBASE_ENV[@]}")"
if [ "$PURGE" -eq 1 ]; then
  log "purge env:     $(names_of "${PURGE_ENV[@]}")"
else
  log "purge:         skipped (--no-purge)"
fi
log "helper args:   ${HELPER_ARGS[*]:-(none: every target in firebase.json, which is hosting only)}"

if [ "$DRY_RUN" -eq 1 ]; then
  log "dry run: verified and assembled; not deploying, not purging"
  exit 0
fi

# --- 7. Deploy --------------------------------------------------------------

log "deploying ${SHA} to Firebase project ${FIREBASE_PROJECT}"
(cd "$SITE" && /usr/bin/env -i "${FIREBASE_ENV[@]}" "$HELPER" ${HELPER_ARGS[@]+"${HELPER_ARGS[@]}"}) ||
  die "Firebase deploy failed; Cloudflare was not purged"

# --- 8. Purge ---------------------------------------------------------------

if [ "$PURGE" -eq 1 ]; then
  (cd "$WORK" && /usr/bin/env -i "${PURGE_ENV[@]}" "$BASH_BIN" -c "$PURGE_SRC" cf-cache-purge.sh) ||
    die "Firebase deploy succeeded but the Cloudflare purge failed; run scripts/cf-cache-purge.sh"
else
  log "skipped the Cloudflare purge (--no-purge); run scripts/cf-cache-purge.sh before verifying"
fi

log "deployed ${SHA}; verify against the live URL, not this log"
