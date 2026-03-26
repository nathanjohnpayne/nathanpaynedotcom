# Deployment

> This guide covers deploying the existing project. For **new project setup** (create Firebase project, `firebase init`, first-time auth bootstrap), see `ai_agent_repo_template/DEPLOYMENT.md` in the sibling directory.

## Prerequisites

- [Firebase CLI](https://firebase.google.com/docs/cli) installed globally
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`) installed
- [1Password CLI](https://developer.1password.com/docs/cli/) (`op`) installed and signed in
- Local `gcloud` wrapper installed on PATH (see First-Time Setup below)
- `op-firebase-deploy` and `op-firebase-setup` on PATH
- Access to the shared 1Password source credential `op://Private/GCP ADC/credential` or another explicit `GOOGLE_APPLICATION_CREDENTIALS` file
- Permission to impersonate `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com`

## Machine User Setup (New Project)

When creating a new repository from this template, complete these steps to enable the AI agent cross-review system. All steps are manual (human-only) unless noted.

### 1. Add machine users as collaborators

Go to the new repo → Settings → Collaborators → Invite each:

- `nathanpayne-claude` — Write access
- `nathanpayne-codex` — Write access
- `nathanpayne-cursor` — Write access

### 2. Accept collaborator invitations

Log into each machine user account and accept the invitation:

- https://github.com/notifications (as `nathanpayne-claude`)
- https://github.com/notifications (as `nathanpayne-codex`)
- https://github.com/notifications (as `nathanpayne-cursor`)

Alternatively, use `gh` CLI or the invite URL directly: `https://github.com/{owner}/{repo}/invitations`

**Note:** Fine-grained PATs cannot accept invitations via API. Use the browser or a classic PAT with `repo` scope.

### 3. Store PATs as repository secrets

Go to the new repo → Settings → Secrets and variables → Actions → New repository secret. Add:

| Secret name | Value | PAT type |
|---|---|---|
| `CLAUDE_PAT` | Classic PAT for `nathanpayne-claude` with `repo` scope | **Classic** (not fine-grained) |
| `CODEX_PAT` | Classic PAT for `nathanpayne-codex` with `repo` scope | **Classic** (not fine-grained) |
| `CURSOR_PAT` | Classic PAT for `nathanpayne-cursor` with `repo` scope | **Classic** (not fine-grained) |
| `REVIEWER_ASSIGNMENT_TOKEN` | PAT for `nathanjohnpayne` | Fine-grained OK (owns repo) |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude Code headless review | — |
| `OPENAI_API_KEY` | OpenAI API key for Codex headless review | — |

**Why classic PATs?** Machine users are collaborators, not repo owners. Fine-grained
PATs on personal (non-org) GitHub accounts only cover repos the account *owns*.
The "All repositories" scope means all owned repos (zero for collaborators), and
"Only select repositories" does not list collaborator repos.

Or use the CLI (faster):

```bash
# Use exact 1Password item IDs (avoids shell issues with parentheses in item titles):
gh secret set CLAUDE_PAT --repo {owner}/{repo} --body "$(op read 'op://Private/pvbq24vl2h6gl7yjclxy2hbote/token')"
gh secret set CURSOR_PAT --repo {owner}/{repo} --body "$(op read 'op://Private/bslrih4spwxgookzfy6zedz5g4/token')"
gh secret set CODEX_PAT --repo {owner}/{repo} --body "$(op read 'op://Private/o6ekjxjjl5gq6rmcneomrjahpu/token')"
gh secret set REVIEWER_ASSIGNMENT_TOKEN --repo {owner}/{repo} --body "$(op read 'op://Private/sm5kopwk6t6p3xmu2igesndzhe/token')"
gh secret set ANTHROPIC_API_KEY --repo {owner}/{repo} --body "$(op read 'op://Private/Anthropic API Key/credential')"
gh secret set OPENAI_API_KEY --repo {owner}/{repo} --body "$(op read 'op://Private/OpenAI API Key/credential')"
```

### 4. Configure branch protection

Go to the new repo → Settings → Branches → Add branch protection rule for `main`:

1. **Require pull request reviews before merging:** Yes
2. **Required number of approving reviews:** 1
3. **Dismiss stale pull request approvals when new commits are pushed:** Yes
4. **Require status checks to pass before merging:** Yes
   - Add `Self-Review Required`
   - Add `Label Gate`
5. **Do not allow bypassing the above settings:** Disabled (so Nathan can force-merge in emergencies)

Or use the CLI:

```bash
gh api --method PUT "repos/{owner}/{repo}/branches/main/protection" \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      {"context": "Self-Review Required"},
      {"context": "Label Gate"}
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null
}
EOF
```

**Note:** Branch protection requires the repo to be public, or requires GitHub Pro/Team for private repos.

**Known issue:** The `Self-Review Required` and `Label Gate` status checks are
configured as required but may never report if the CI workflows that post them
(`pr-review-policy.yml`) fail silently due to misconfigured repository secrets.
This blocks all merges. Workarounds:
- Fix the CI secrets so status checks report, **or**
- Use the GitHub web UI "Merge without waiting for requirements" bypass checkbox

The `--admin` flag on `gh pr merge` does **not** bypass required status checks —
it only bypasses review requirements. The break-glass hook (`BREAK_GLASS_ADMIN=1`)
only bypasses the Claude Code PreToolUse guard, not GitHub's branch protection API.

### 5. Create required labels

The workflows expect these labels to exist. Create them if they don't:

```bash
gh label create "needs-external-review" --color "D93F0B" --description "Blocks merge until external reviewer approves" --repo {owner}/{repo}
gh label create "needs-human-review" --color "B60205" --description "Agent disagreement — requires human review" --repo {owner}/{repo}
gh label create "policy-violation" --color "000000" --description "Review policy violation detected" --repo {owner}/{repo}
gh label create "audit" --color "FBCA04" --description "Weekly PR audit report" --repo {owner}/{repo}
```

### 6. Verify setup

Run these checks after completing the steps above:

```bash
REPO="{owner}/{repo}"

# Check collaborators
echo "=== Collaborators ==="
gh api "repos/$REPO/collaborators" --jq '.[].login'

# Check secrets exist
echo "=== Secrets ==="
gh secret list --repo "$REPO"

# Check branch protection
echo "=== Branch Protection ==="
DEFAULT=$(gh api "repos/$REPO" --jq '.default_branch')
gh api "repos/$REPO/branches/$DEFAULT/protection/required_status_checks" --jq '.checks[].context'

# Check labels
echo "=== Labels ==="
gh label list --repo "$REPO" --search "needs-external-review"
gh label list --repo "$REPO" --search "needs-human-review"
gh label list --repo "$REPO" --search "policy-violation"
```

### Token type: classic PATs required

Machine user reviewer identities (nathanpayne-claude, etc.) are **collaborators**,
not repo owners. GitHub fine-grained PATs on personal accounts only cover repos
owned by the token account — they cannot access collaborator repos. The "All
repositories" scope in fine-grained PATs means all repos the account *owns* (zero
for collaborators), not repos they collaborate on.

**Use classic PATs with `repo` scope for all reviewer identities.** This is stored
in 1Password with the field name `token` (not `credential` or `password`).

1Password item IDs (all classic PATs with `ghp_` prefix, field `token`, vault `Private`):

| Reviewer Identity | 1Password Item ID | `op read` command |
|---|---|---|
| `nathanpayne-claude` | `pvbq24vl2h6gl7yjclxy2hbote` | `op read "op://Private/pvbq24vl2h6gl7yjclxy2hbote/token"` |
| `nathanpayne-cursor` | `bslrih4spwxgookzfy6zedz5g4` | `op read "op://Private/bslrih4spwxgookzfy6zedz5g4/token"` |
| `nathanpayne-codex` | `o6ekjxjjl5gq6rmcneomrjahpu` | `op read "op://Private/o6ekjxjjl5gq6rmcneomrjahpu/token"` |
| `nathanjohnpayne` | `sm5kopwk6t6p3xmu2igesndzhe` | `op read "op://Private/sm5kopwk6t6p3xmu2igesndzhe/token"` |

Use the item ID (not the item title) to avoid shell issues with parentheses in
1Password item names like `GitHub PAT (pr-review-claude)`.

### Token rotation (as needed)

The current PATs are set to never expire. If you ever need to rotate them:

1. Generate new **classic** PATs with `repo` scope for each machine user account
2. Update the tokens in 1Password (field name: `token`)
3. Update `CLAUDE_PAT`, `CODEX_PAT`, `CURSOR_PAT` secrets on every repo
4. Revoke the old tokens
5. Verify agent access still works

The `REVIEWER_ASSIGNMENT_TOKEN` (Nathan's PAT) follows the same rotation process.

---

## Environments

| Environment | Firebase Project | URL |
|-------------|-----------------|-----|
| Production | `nathanpaynedotcom` | https://nathanpayne.com |

There is no staging environment. All deploys go directly to production.

## Build Process

No build step required. This is a static site — source files (`index.html`, `style.css`, `script.js`, assets) are deployed directly from the repository root.

**Before deploying**, bump the query-string version on asset references in `index.html`:

```html
<!-- Increment date + letter suffix whenever CSS or JS changes -->
<link rel="stylesheet" href="style.css?v=20260228j">
<script src="script.js?v=20260228j"></script>
```

OG images use a separate version string and are cached immutably for 1 year — bump only when the OG image itself changes.

## Deployment Steps

All deploys use `op-firebase-deploy` for keyless, non-interactive service account impersonation. **Never run `firebase deploy` directly.**

```bash
# Full deploy (hosting + all configured services)
op-firebase-deploy

# Hosting only
op-firebase-deploy --only hosting
```

The script:
1. Auto-detects the Firebase project from `.firebaserc`
2. Reads source credentials from `GOOGLE_APPLICATION_CREDENTIALS`, then `op://Private/GCP ADC/credential`, then `~/.config/gcloud/application_default_credentials.json`
3. Generates a temporary `impersonated_service_account` credential file for `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com`
4. Sets `GOOGLE_APPLICATION_CREDENTIALS` to that temp file and runs `firebase deploy --non-interactive`
5. Cleans up credentials on exit

No browser prompt is needed for routine use once `op://Private/GCP ADC/credential` exists and the 1Password CLI is unlocked. In normal use the only interactive step is the 1Password unlock or Touch ID prompt.

This 1Password-first source-credential model is a deliberate project decision. Do not replace it with ADC-first day-to-day docs, routine browser-login steps, `firebase login`, or long-lived deploy keys unless a human explicitly asks for that change.

The local `gcloud` wrapper uses the same source-credential precedence, then applies quota attribution in this order: explicit `--billing-project`, explicit `--project`, the nearest repo `.firebaserc` project, then the active `gcloud` config.

## First-Time Setup

Install the canonical helper scripts from the sibling template repo once per machine:

```bash
mkdir -p ~/.local/bin
cp ../ai_agent_repo_template/scripts/gcloud/gcloud ~/.local/bin/gcloud
cp ../ai_agent_repo_template/scripts/firebase/op-firebase-deploy ~/.local/bin/
cp ../ai_agent_repo_template/scripts/firebase/op-firebase-setup ~/.local/bin/
chmod +x ~/.local/bin/gcloud ~/.local/bin/op-firebase-deploy ~/.local/bin/op-firebase-setup
hash -r
```

Then bootstrap project impersonation:

```bash
op-firebase-setup nathanpaynedotcom
```

If `op://Private/GCP ADC/credential` does not exist yet, seed it once by running `gcloud auth application-default login`, then copy the resulting `~/.config/gcloud/application_default_credentials.json` into the 1Password item `Private/GCP ADC`, field `credential`. After that one-time bootstrap or any later credential rotation, the normal daily flow returns to 1Password-backed, non-browser auth.

`op-firebase-setup` is the legacy script name, but it now performs keyless setup. For this project it:
1. Enables the IAM Credentials API
2. Creates `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com` if needed
3. Grants deploy roles to that service account
4. Grants your current principal `roles/iam.serviceAccountTokenCreator` on the deployer
5. Creates or updates a dedicated `gcloud` configuration named `nathanpaynedotcom`, including `billing/quota_project=nathanpaynedotcom`

`op-firebase-setup` can still print Google Cloud's generic ADC quota warning if the source credential was originally stamped for another project. That warning is noisy but expected here: the local wrapper and `op-firebase-deploy` both override quota attribution to the target project for real commands and deploys.

To bypass the local wrapper for a one-off command:

```bash
GCLOUD_BYPASS_ADC_WRAPPER=1 gcloud ...
```

## Rollback Procedure

Firebase Hosting supports instant rollback via the CLI:

```bash
# List recent releases
firebase hosting:releases:list

# Roll back by redeploying a prior release
firebase hosting:channel:deploy live --release-id <VERSION_ID>
```

Or use the Firebase Console → Hosting → Release History → Roll back.

## Post-Deployment Verification

1. Open https://nathanpayne.com in an incognito window
2. Verify all four panels render correctly (red, yellow, black, blue)
3. Hover over each panel on desktop — confirm open/close animations work
4. Test keyboard navigation (Tab to focus panels, Enter to open, Escape to close)
5. Verify mobile view at 375px — panels should stack vertically with content always visible
6. Check DevTools → Network → confirm `style.css` and `script.js` load with correct `?v=` params
7. Check Firebase Console → Analytics → confirm `section_view` events fire on panel hover

## CI/CD Integration

Deploys are manual via `op-firebase-deploy`. CI workflows (repo linting, review policy enforcement) run on push/PR via GitHub Actions — see `.github/workflows/`.

If a CI pipeline is added later, prefer Workload Identity Federation or another `external_account` credential as the source credential, then let `op-firebase-deploy` impersonate the deployer service account. Do **not** store service account keys as CI secrets.

## Secrets Management

- No API keys or secrets are committed to this repository. Google Analytics Measurement ID (`G-7C29SRBXB1`) is a public identifier — not a secret.
- Deploy auth uses short-lived impersonated credentials derived from a 1Password-backed GCP ADC source credential, another explicit `GOOGLE_APPLICATION_CREDENTIALS` file, or CI-provided external-account credentials.
- Do not commit API keys, service-account JSON, or ADC credentials.
- If a future feature requires API keys, keep them in ignored config files and apply browser restrictions in Google Cloud. Never commit raw keys.

## Caching Rules

| Pattern | Cache TTL |
|---------|-----------|
| `og-image.png`, `/og/**` | 1 year (immutable) |
| `**/*.js`, `**/*.css` | 1 hour |
| `**/*.html` | 1 hour |

## Security Headers

Applied globally via `firebase.json`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`.

## Auth Maintenance

If day-to-day auth stops working, first make sure the 1Password CLI is signed in and `op://Private/GCP ADC/credential` is readable.

If deploy impersonation breaks because IAM bindings or `gcloud` config drifted, rerun:

```bash
op-firebase-setup nathanpaynedotcom
```

If the shared source credential itself needs rotation, refresh it once with `gcloud auth application-default login`, overwrite the `Private/GCP ADC` item with the new `application_default_credentials.json`, and, if desired, align its own quota project with:

```bash
gcloud auth application-default set-quota-project nathanpaynedotcom
```
