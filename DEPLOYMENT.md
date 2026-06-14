# Deployment

## New Machine Setup

Run these steps on any new or temporary machine. Tell your AI agent:

> "Set up this machine for development. Run the new machine setup from DEPLOYMENT.md."

### 1. Install system tools

```bash
# 1Password CLI
brew install --cask 1password-cli

# Firebase CLI
npm install -g firebase-tools

# Google Cloud SDK
brew install google-cloud-sdk

# GitHub CLI
brew install gh
```

### 2. Authenticate

```bash
# 1Password—enables biometric unlock for op CLI
# (Follow the prompts to sign in and enable Touch ID)
op signin

# GitHub CLI
gh auth login

# Google Cloud—use 1Password-backed ADC (no interactive login needed
# if op is authenticated and the GCP ADC item exists in 1Password)
```

### 3. Install deploy scripts

```bash
# Clone the template repo if not already present
git clone https://github.com/nathanjohnpayne/mergepath.git ~/Documents/GitHub/mergepath

# Install canonical helper scripts
mkdir -p ~/.local/bin
cp ~/Documents/GitHub/mergepath/scripts/gcloud/gcloud ~/.local/bin/
cp ~/Documents/GitHub/mergepath/scripts/firebase/op-firebase-deploy ~/.local/bin/
cp ~/Documents/GitHub/mergepath/scripts/firebase/op-firebase-setup ~/.local/bin/
chmod +x ~/.local/bin/gcloud ~/.local/bin/op-firebase-deploy ~/.local/bin/op-firebase-setup

# Ensure PATH includes ~/.local/bin
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

### 4. Clone and bootstrap all repos

```bash
cd ~/Documents/GitHub

for repo in friends-and-family-billing device-platform-reporting device-source-of-truth swipewatch nathanpaynedotcom overridebroadway; do
  git clone "https://github.com/nathanjohnpayne/$repo.git" 2>/dev/null || (cd "$repo" && git pull)
  cd "$repo"
  ./scripts/bootstrap.sh    # restores .env.local from 1Password via op inject
  cd ..
done
```

The bootstrap script for each repo:
- Resolves `op://` references in `.env.tpl` → writes `.env.local` (via `op inject`)
- Runs `npm install`
- Runs `npm run build` (if applicable)

### 5. Verify

```bash
# Quick check that each repo's local config was restored
for repo in friends-and-family-billing device-platform-reporting device-source-of-truth overridebroadway; do
  echo "=== $repo ==="
  ls ~/Documents/GitHub/$repo/.env* 2>/dev/null || echo "  (no env files expected)"
done
```

---

## Returning to Your Main Machine

When you return from a temporary machine, tell your agent:

> "Sync any changes from this session back. Run the return-to-main workflow from DEPLOYMENT.md."

### 1. On the temporary machine (before leaving)

```bash
cd ~/Documents/GitHub
for repo in friends-and-family-billing device-platform-reporting device-source-of-truth swipewatch nathanpaynedotcom overridebroadway; do
  cd "$repo"
  # Push any local config changes to 1Password
  ./scripts/bootstrap.sh --sync
  # Ensure all code changes are committed and pushed
  git status
  cd ..
done
```

### 2. On the main machine (when you return)

```bash
cd ~/Documents/GitHub
for repo in friends-and-family-billing device-platform-reporting device-source-of-truth swipewatch nathanpaynedotcom overridebroadway; do
  cd "$repo"
  git pull                          # get code changes from the temp machine
  ./scripts/bootstrap.sh --force    # re-resolve .env.tpl from 1Password (latest values)
  cd ..
done
```

The `--force` flag overwrites existing `.env.local` files with freshly resolved
values from 1Password. This ensures you pick up any secrets that were updated
on the temporary machine via `--sync`.

### Conflict resolution

If both machines modified the same 1Password item:
- 1Password keeps the latest write (last-writer-wins)
- The `.env.tpl` templates are in git, so structural changes merge normally
- For true conflicts, compare with `op item get <id>` and resolve manually

---

## Prerequisites

- [Firebase CLI](https://firebase.google.com/docs/cli) installed globally
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`) installed
- [1Password CLI](https://developer.1password.com/docs/cli/) (`op`) installed and signed in
- Local `gcloud` wrapper installed on PATH (see First-Time Setup below)
- `op-firebase-deploy` and `op-firebase-setup` on PATH
- Access to the project SA key in `op://Firebase/nathanpaynedotcom — Firebase Deployer SA Key` (preferred for CI/headless) or the shared 1Password source credential `op://Private/c2v6emkwppjzjjaq2bdqk3wnlm/credential` or another explicit `GOOGLE_APPLICATION_CREDENTIALS` file
- Permission to impersonate `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com`

## Machine User Setup (New Project)

When creating a new repository from this template, complete these steps to enable the AI agent cross-review system. All steps are manual (human-only) unless noted.

### 1. Add machine users as collaborators

Go to the new repo → Settings → Collaborators → Invite each:

- `nathanpayne-claude`—Write access
- `nathanpayne-codex`—Write access
- `nathanpayne-cursor`—Write access

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
| `REVIEWER_ASSIGNMENT_TOKEN` | PAT for `nathanjohnpayne` | Fine-grained OK (owns repo) |

Or use the CLI (faster):

```bash
gh secret set REVIEWER_ASSIGNMENT_TOKEN --repo {owner}/{repo} --body "$(op read 'op://Private/sm5kopwk6t6p3xmu2igesndzhe/token')"
```

**Reviewer identity PATs (`nathanpayne-claude`, `nathanpayne-codex`,
`nathanpayne-cursor`) are intentionally NOT stored as repo CI secrets.**
Phase 2 internal self-peer review runs in the agent's own session: the
agent switches its Git identity to its reviewer account with a PAT
read directly from 1Password (`op read 'op://Private/<item-id>/token'`)
and posts the review with that PAT. See REVIEW_POLICY.md § Phase 2 and
each repo's `CLAUDE.md` / `AGENTS.md` for the identity-switch procedure.

**Do NOT add `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `CLAUDE_PAT` /
`CODEX_PAT` / `CURSOR_PAT` as repo secrets.** An earlier iteration of
`agent-review.yml` had an `invoke-reviewer` job that ran the Claude
Code CLI headlessly as a CI-side reviewer; this was the wrong flow
(parallel to the authoring session, stale-API-key failure surface,
duplicate work) and was removed. Phase 2 now lives entirely inside
the authoring agent's session.

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
gh label create "needs-human-review" --color "B60205" --description "Agent disagreement—requires human review" --repo {owner}/{repo}
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
owned by the token account—they cannot access collaborator repos. The "All
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

### Reviewer PAT quick check

Before asking a reviewer identity to approve a PR, verify the token with
`gh api user` and then reuse the same explicit `GH_TOKEN` override for
`gh pr review`:

```bash
# Example: verify the Claude reviewer identity before approving a PR
GH_TOKEN="$(op read 'op://Private/pvbq24vl2h6gl7yjclxy2hbote/token')" \
  gh api user --jq '.login'
# expected: nathanpayne-claude

GH_TOKEN="$(op read 'op://Private/pvbq24vl2h6gl7yjclxy2hbote/token')" \
  gh pr review <PR#> --repo <owner/repo> --approve --body "Review comment"
```

- Use the item ID from the table above for your agent identity. Do not use the 1Password item title.
- If `gh auth status` still shows `nathanjohnpayne`, that is okay.
  `GH_TOKEN=...` overrides the ambient login for that command.
- On local interactive machines, the `op read` command itself may trigger the
  1Password biometric prompt even if `op whoami` says you are not signed in.
- `Review Can not approve your own pull request` means the wrong GitHub
  identity is still being used. Check the table above and verify you are using
  your agent's item ID, not the author identity's.

### Token rotation (as needed)

The current PATs are set to never expire. If you ever need to rotate
a reviewer identity PAT (`nathanpayne-claude`, `nathanpayne-codex`,
`nathanpayne-cursor`):

1. Generate a new **classic** PAT with `repo` scope for the machine user account
2. Update the `token` field on the corresponding 1Password item
3. Revoke the old token in GitHub
4. Verify agent access still works: `GH_TOKEN="$(op read 'op://Private/<item-id>/token')" gh api user`

Note: reviewer identity PATs are NOT stored as repo CI secrets. They are
read from 1Password per-session by the authoring agent for the in-session
identity switch, so rotation does not require updating any repo secrets.

The `REVIEWER_ASSIGNMENT_TOKEN` repo secret (Nathan's PAT used by the
Agent Review Pipeline workflow) follows a similar process but also
needs a `gh secret set REVIEWER_ASSIGNMENT_TOKEN --repo {owner}/{repo}`
call on every repo after rotating the 1Password item.

---

## Environments

| Environment | Firebase Project | URL |
|-------------|-----------------|-----|
| Production | `nathanpaynedotcom` | https://nathanpayne.com |

There is no staging environment. All deploys go directly to production.

## Build Process

The site uses Astro to generate static HTML/CSS/JS into `dist/`. **Always build before deploying:**

```bash
npm run build
```

`npm run build` runs `prebuild` first, then `astro build`.

**`prebuild`** (chained via `&&` in [package.json](package.json)):

1. `node scripts/refresh-hero-images.mjs`—for every project with `heroRefresh: github-social` in its frontmatter, re-fetches the repo's current GitHub social preview and writes it to `public/<screenshotSrc>`. Fails soft on any error; keeps the existing image.
2. `node scripts/refresh-mux-gifs.mjs`—for every project with a `muxPlaybackId`, fetches an animated GIF from `image.mux.com` and writes it to `public/<screenshotSrc>`. Fails **loud** on any network error (non-zero exit halts the build); the Mux GIF is the only authoritative source for the hero fallback on Mux-backed projects, so a silent miss would ship stale content. See [specs/project-pages.md § Fallback GIF regeneration](specs/project-pages.md#fallback-gif-regeneration) for the full contract.

The two refreshers never race for the same output path—`refresh-hero-images.mjs` explicitly skips any project with `muxPlaybackId`.

**`astro build`** then:

1. Compiles all `.astro` pages and layouts into static HTML
2. Processes Markdown blog posts via Content Collections
3. Generates the sitemap via `@astrojs/sitemap`
4. Generates OG images via the custom Playwright integration (OG templates consume the freshly-regenerated GIFs from step 2 of prebuild, so OG images and hero images stay in sync)
5. Outputs everything to `dist/`

Astro handles asset fingerprinting automatically—no manual cache-busting is needed.

### Client-side env vars

Any `PUBLIC_*` env var read via `import.meta.env` during the build is baked into the emitted HTML/JS. These are resolved from `.env.local`, which `scripts/bootstrap.sh` generates from `.env.tpl` via `op inject`.

**Workflow when adding a new client env var:**

1. Add the line to `.env.tpl` with an `op://` reference:

   ```dotenv
   PUBLIC_FOO=op://Private/<1p-item-id>/<field>
   ```

2. Store the secret in 1Password at that path.
3. Anyone on the team runs `./scripts/bootstrap.sh --force` to refresh their `.env.local`.
4. `npm run build` picks up the new value automatically.

The current `PUBLIC_*` vars are `PUBLIC_LOGODEV_KEY` (Logo.dev publishable
token — drives the `/resume` company logos via `CompanyLogo.astro`) and
`PUBLIC_POSTHOG_PROJECT_TOKEN` (PostHog public project ingest token — drives
analytics via `posthog.astro`). Both are public client identifiers resolved
from 1Password via `op inject`, and both degrade gracefully when unset at build
time (initials-only logos; PostHog simply does not initialize). Mux Data for
project hero videos does not use a build-time env var in this site: pages with
a Mux hero load `mux-embed`, and `@mux/mux-background-video` infers the Mux Data
env key from the public `stream.mux.com` URL at runtime.

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
2. Reads source credentials in order: `GOOGLE_APPLICATION_CREDENTIALS`, then the project SA key from `op://Firebase/nathanpaynedotcom — Firebase Deployer SA Key`, then `op://Private/c2v6emkwppjzjjaq2bdqk3wnlm/credential`, then `~/.config/gcloud/application_default_credentials.json`
3. If the source credential is the `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com` service account key, uses it directly (no impersonation, faster). Otherwise generates a temporary `impersonated_service_account` credential file for `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com`
4. Sets `GOOGLE_APPLICATION_CREDENTIALS` to that temp file and runs `firebase deploy --non-interactive`
5. Cleans up credentials on exit

No browser prompt is needed for routine use once `op://Private/c2v6emkwppjzjjaq2bdqk3wnlm/credential` exists and the 1Password CLI is unlocked. In normal use the only interactive step is the 1Password unlock or Touch ID prompt.

This 1Password-first source-credential model is a deliberate project decision. Do not replace it with ADC-first day-to-day docs, routine browser-login steps, `firebase login`, or long-lived deploy keys unless a human explicitly asks for that change.

The local `gcloud` wrapper uses the same source-credential precedence, then applies quota attribution in this order: explicit `--billing-project`, explicit `--project`, the nearest repo `.firebaserc` project, then the active `gcloud` config.

## First-Time Setup

Install the canonical helper scripts from the sibling template repo once per machine:

```bash
mkdir -p ~/.local/bin
cp ../mergepath/scripts/gcloud/gcloud ~/.local/bin/gcloud
cp ../mergepath/scripts/firebase/op-firebase-deploy ~/.local/bin/
cp ../mergepath/scripts/firebase/op-firebase-setup ~/.local/bin/
chmod +x ~/.local/bin/gcloud ~/.local/bin/op-firebase-deploy ~/.local/bin/op-firebase-setup
hash -r
```

Then bootstrap project impersonation:

```bash
op-firebase-setup nathanpaynedotcom
```

If `op://Private/c2v6emkwppjzjjaq2bdqk3wnlm/credential` does not exist yet, seed it once by running `gcloud auth application-default login`, then copy the resulting `~/.config/gcloud/application_default_credentials.json` into the 1Password item `Private/GCP ADC`, field `credential`. After that one-time bootstrap or any later credential rotation, the normal daily flow returns to 1Password-backed, non-browser auth.

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
3. Hover over each panel on desktop—confirm open/close animations work
4. Test keyboard navigation (Tab to focus panels, Enter to open, Escape to close)
5. Verify mobile view at 375px—panels should stack vertically with content always visible
6. Verify blog listing (`/blog/`) and at least one blog post load correctly
7. Verify OG images render (check `/og/home.png` or use a social card preview tool)
8. Check Firebase Console → Analytics → confirm `section_view` events fire on panel hover

## CI/CD Integration

Deploys are manual via `op-firebase-deploy`. CI workflows (repo linting, review policy enforcement) run on push/PR via GitHub Actions—see `.github/workflows/`.

If a CI pipeline is added later, prefer Workload Identity Federation or another `external_account` credential as the source credential, then let `op-firebase-deploy` impersonate the deployer service account. Do **not** store service account keys as CI secrets.

### CI/CD & Headless Deploy

For headless environments (Claude Code cloud tasks, GitHub Actions, etc.) where
1Password biometric auth is unavailable, use the project SA key directly:

```bash
# Pull the SA key from 1Password (one-time, requires biometric)
op document get "nathanpaynedotcom — Firebase Deployer SA Key" \
  --vault Firebase --out-file ~/firebase-keys/nathanpaynedotcom-sa-key.json

# Deploy with the SA key
GOOGLE_APPLICATION_CREDENTIALS=~/firebase-keys/nathanpaynedotcom-sa-key.json op-firebase-deploy
```

Because this SA key matches `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com`,
`op-firebase-deploy` skips impersonation and uses the key directly (faster).

For Claude Code cloud scheduled tasks:
1. Retrieve the key: `op document get "nathanpaynedotcom — Firebase Deployer SA Key" --vault Firebase`
2. Copy the JSON contents
3. In the task's cloud environment, add: `FIREBASE_SA_KEY=<paste JSON>`
4. Add a setup script:
   ```bash
   echo "$FIREBASE_SA_KEY" > /tmp/sa-key.json
   export GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa-key.json
   ```

## Secrets Management

- No API keys or secrets are committed to this repository. Google Analytics Measurement ID (`G-7C29SRBXB1`) is a public identifier—not a secret.
- Deploy auth uses short-lived impersonated credentials derived from a 1Password-backed GCP ADC source credential, another explicit `GOOGLE_APPLICATION_CREDENTIALS` file, or CI-provided external-account credentials.
- Do not commit API keys, service-account JSON, or ADC credentials.
- If a future feature requires API keys, keep them in ignored config files and apply browser restrictions in Google Cloud. Never commit raw keys.

## Caching Rules

| Pattern | Cache TTL |
|---------|-----------|
| `og-image.png`, `/og/**` | 24 hours |
| `**/*.js`, `**/*.css` | 1 hour |
| `**/*.html` | 1 hour |

## Security Headers

Applied globally via `firebase.json`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`.

## Auth Maintenance

For interactive (biometric) machines, verify the 1Password CLI is signed in and `op://Private/c2v6emkwppjzjjaq2bdqk3wnlm/credential` is readable. The script also checks the Firebase vault SA key at `op://Firebase/nathanpaynedotcom — Firebase Deployer SA Key` before falling back to the shared ADC.

For headless environments, the Firebase vault SA key (`op://Firebase/cjitzliqlvivlqfltei2drrxcq`) is the primary credential source. Export it as `GOOGLE_APPLICATION_CREDENTIALS` (see CI/CD & Headless Deploy above).

If deploy impersonation breaks because IAM bindings or `gcloud` config drifted, rerun:

```bash
op-firebase-setup nathanpaynedotcom
```

If the shared source credential itself needs rotation, refresh it once with `gcloud auth application-default login`, overwrite the `Private/GCP ADC` item with the new `application_default_credentials.json`, and, if desired, align its own quota project with:

```bash
gcloud auth application-default set-quota-project nathanpaynedotcom
```
