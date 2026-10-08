#!/usr/bin/env bash
# Fail a build job whose environment holds a credential (#1238, part of #1104).
#
# .github/workflows/build-artifact.yml builds the deployable dist/ in a job that
# is meant to hold nothing worth stealing: `permissions: contents: read`, no
# `secrets.*`, a checkout without a persisted token, and only the three public
# client values from repository variables. This script is the step that proves
# it from inside the job, before `npm ci` runs any dependency code. A workflow
# edit that adds `id-token: write`, maps a secret into `env:`, or lets a
# checkout keep its token turns this step red instead of quietly widening what
# a compromised build dependency could read.
#
# What counts as a credential here, and why:
#
#   Denied by name, even when empty
#     ACTIONS_ID_TOKEN_REQUEST_URL, ACTIONS_ID_TOKEN_REQUEST_TOKEN
#       The runner sets these only when the job has `id-token: write`. With
#       them any process can mint an OIDC token for this workflow, which is
#       exactly what a Workload Identity Federation deploy trusts. Only the
#       attest job may hold them.
#     GITHUB_TOKEN, GH_TOKEN, GH_ENTERPRISE_TOKEN, GITHUB_ENTERPRISE_TOKEN
#       The runner never puts the job token in a `run:` step's environment on
#       its own; it is there only when a workflow maps it in.
#
#   Denied by name shape (any value, including empty)
#     A name containing TOKEN, SECRET, PASSWORD, PASSWD, PASSPHRASE or
#     CREDENTIAL; a name with a KEY, KEYS, AUTH, PAT or CREDS component (so
#     `NPM_CONFIG__AUTH` and `AWS_SECRET_ACCESS_KEY` match but `PATH` and
#     `KEYBOARD` do not); and the deploy-provider and 1Password namespaces
#     this site's deploy uses: OP_, FIREBASE_, CLOUDFLARE_, CF_, GOOGLE_,
#     GCLOUD_, CLOUDSDK_.
#
#   Denied by value shape
#     A value that looks like a credential whatever its name: GitHub token
#     prefixes (ghp_, gho_, ghu_, ghs_, ghr_, github_pat_), a PEM private key,
#     a Google service-account JSON or ya29. access token, an AWS access key
#     ID, a Slack token, a 1Password service-account token (ops_ey...), an
#     npm token, a JWT. Values are inspected, never printed.
#
#   Allowed, by exact name only
#     PUBLIC_POSTHOG_PROJECT_TOKEN, PUBLIC_GA_MEASUREMENT_ID,
#     PUBLIC_LOGODEV_KEY
#       Public client identifiers that ship in the built HTML (DEPLOYMENT.md
#       § Client-side env vars). Any other PUBLIC_* name that is
#       credential-shaped still fails: the prefix is a convention, not proof.
#     ACTIONS_RUNTIME_TOKEN
#       The runner's per-job token for the Actions artifact and cache
#       services. actions/upload-artifact needs it, it cannot read or write
#       repository contents, issues or pull requests, and it expires with the
#       job. It can write this ref's Actions cache, which is why the build job
#       restores no cache (see the workflow). Allowed whether or not the runner
#       exposes it to `run:` steps.
#
#   Not considered at all
#     GitHub's other runtime variables (GITHUB_* and ACTIONS_*_URL locations,
#     RUNNER_*, CI) and the runner image's tool paths. They describe the run;
#     none of them authenticates anything. They fail only if a name or value
#     rule above matches, in which case the rule is what needs a look.
#
# Usage:
#   scripts/check-build-env-credential-free.sh [--checkout DIR]
#
# --checkout DIR additionally fails when DIR's git config still carries a
# credential: an http.*.extraheader (what actions/checkout persists without
# `persist-credentials: false`), an includeIf (where newer checkout releases
# keep that header), or a credential.* helper.
#
# Exit 0 when nothing credential-shaped is present, 1 when something is, 2 on a
# usage error. Output names variables, never values.
set -euo pipefail

checkout_dir=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --checkout)
      [[ $# -ge 2 && -n "$2" ]] || { echo "usage: $0 [--checkout DIR]" >&2; exit 2; }
      checkout_dir="$2"
      shift 2
      ;;
    *)
      echo "usage: $0 [--checkout DIR]" >&2
      exit 2
      ;;
  esac
done

ALLOWED_NAMES=" PUBLIC_POSTHOG_PROJECT_TOKEN PUBLIC_GA_MEASUREMENT_ID PUBLIC_LOGODEV_KEY ACTIONS_RUNTIME_TOKEN "
DENIED_NAMES=" ACTIONS_ID_TOKEN_REQUEST_URL ACTIONS_ID_TOKEN_REQUEST_TOKEN GITHUB_TOKEN GH_TOKEN GH_ENTERPRISE_TOKEN GITHUB_ENTERPRISE_TOKEN "

# credential_name_reason NAME -> prints why NAME is credential-shaped, or nothing.
credential_name_reason() {
  local name upper component
  name="$1"
  upper="$(printf '%s' "$name" | tr '[:lower:]' '[:upper:]')"

  case " $DENIED_NAMES " in
    *" $upper "*) printf 'denied name'; return 0 ;;
  esac
  case "$upper" in
    *TOKEN* | *SECRET* | *PASSWORD* | *PASSWD* | *PASSPHRASE* | *CREDENTIAL*)
      printf 'credential-shaped name'; return 0 ;;
    OP_* | FIREBASE_* | CLOUDFLARE_* | CF_* | GOOGLE_* | GCLOUD_* | CLOUDSDK_*)
      printf 'deploy or 1Password namespace'; return 0 ;;
  esac
  # Whole components only, so PATH, KEYBOARD and AUTHOR stay clear.
  local IFS='_'
  for component in $upper; do
    case "$component" in
      KEY | KEYS | AUTH | PAT | CREDS) printf 'credential-shaped name'; return 0 ;;
    esac
  done
  return 0
}

# credential_value_reason VALUE -> prints the matched credential form, or nothing.
credential_value_reason() {
  local value="$1"
  case "$value" in
    *ghp_?* | *gho_?* | *ghu_?* | *ghs_?* | *ghr_?* | *github_pat_?*)
      printf 'GitHub token'; return 0 ;;
    *"-----BEGIN"*"PRIVATE KEY"*)
      printf 'PEM private key'; return 0 ;;
    *'"private_key"'* | *'"service_account"'* | *ya29.?*)
      printf 'Google credential'; return 0 ;;
    *xoxb-?* | *xoxp-?* | *xoxa-?* | *xoxr-?* | *xoxs-?*)
      printf 'Slack token'; return 0 ;;
    *ops_ey?*)
      printf '1Password service-account token'; return 0 ;;
  esac
  # Regexes live in variables: an unquoted pattern inside [[ =~ ]] parses
  # differently across bash releases, and macOS still ships bash 3.2.
  local aws_re='(^|[^A-Z0-9])AKIA[0-9A-Z]{16}'
  local npm_re='npm_[A-Za-z0-9]{36}'
  local jwt_re='eyJ[A-Za-z0-9_-]{8,}[.]eyJ[A-Za-z0-9_-]{8,}[.]'
  if [[ "$value" =~ $aws_re ]]; then
    printf 'AWS access key ID'; return 0
  fi
  if [[ "$value" =~ $npm_re ]]; then
    printf 'npm token'; return 0
  fi
  if [[ "$value" =~ $jwt_re ]]; then
    printf 'JWT'; return 0
  fi
  return 0
}

findings=()

# `env -0` rather than bash's own variable table: it reports exactly what this
# process inherited, including names bash cannot hold as shell variables, and
# NUL separation keeps a multi-line value (a PEM block) in one entry.
while IFS= read -r -d '' entry; do
  name="${entry%%=*}"
  value="${entry#*=}"
  case " $ALLOWED_NAMES " in
    *" $name "*) continue ;;
  esac
  reason="$(credential_name_reason "$name")"
  if [[ -z "$reason" ]]; then
    reason="$(credential_value_reason "$value")"
    [[ -n "$reason" ]] && reason="value looks like a ${reason}"
  fi
  [[ -n "$reason" ]] && findings+=("${name}: ${reason}")
done < <(env -0)

if [[ -n "$checkout_dir" ]]; then
  if ! git -C "$checkout_dir" rev-parse --git-dir >/dev/null 2>&1; then
    findings+=("--checkout ${checkout_dir}: not a git checkout")
  else
    # Key names only; an extraheader value is the credential itself.
    while IFS= read -r key; do
      [[ -n "$key" ]] && findings+=("git config ${key}: checkout kept a credential")
    done < <(git -C "$checkout_dir" config --local --name-only \
      --get-regexp '^(http\..*\.extraheader|includeif\..*|credential\..*)$' 2>/dev/null || true)
  fi
fi

if [[ ${#findings[@]} -eq 0 ]]; then
  echo "✔  Build environment is credential-free."
  exit 0
fi

{
  echo "⚠  Refusing to build: the job environment holds credential-shaped values."
  for finding in "${findings[@]}"; do
    echo "     ${finding}"
  done
  echo ""
  echo "   The build job must hold only the three PUBLIC_* client values and GitHub's"
  echo "   runtime variables. See the header of scripts/check-build-env-credential-free.sh."
} >&2
exit 1
