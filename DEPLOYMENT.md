# Deployment

> This guide covers deploying the existing project. For **new project setup** (create Firebase project, `firebase init`, first-time auth bootstrap), see `ai_agent_repo_template/DEPLOYMENT.md` in the sibling directory.

## Prerequisites

- [Firebase CLI](https://firebase.google.com/docs/cli) installed globally
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`) installed
- Local `gcloud` wrapper installed on PATH (see First-Time Setup below)
- `op-firebase-deploy` and `op-firebase-setup` on PATH
- Application Default Credentials (ADC) initialized via `gcloud auth application-default login`
- Permission to impersonate `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com`

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
2. Reads source credentials from `GOOGLE_APPLICATION_CREDENTIALS` or `~/.config/gcloud/application_default_credentials.json`
3. Generates a temporary `impersonated_service_account` credential file for `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com`
4. Sets `GOOGLE_APPLICATION_CREDENTIALS` to that temp file and runs `firebase deploy --non-interactive`
5. Cleans up credentials on exit

No long-lived deploy key is stored locally or in 1Password. The only interactive step is refreshing local ADC if it has expired or been revoked:

```bash
gcloud auth application-default login
```

The local `gcloud` wrapper uses the same ADC source so normal `gcloud` commands work without an interactive `gcloud auth login`.

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

Then bootstrap machine auth and project impersonation:

```bash
gcloud auth application-default login
op-firebase-setup nathanpaynedotcom
```

`op-firebase-setup` is the legacy script name, but it now performs keyless setup. For this project it:
1. Enables the IAM Credentials API
2. Creates `firebase-deployer@nathanpaynedotcom.iam.gserviceaccount.com` if needed
3. Grants deploy roles to that service account
4. Grants your current principal `roles/iam.serviceAccountTokenCreator` on the deployer
5. Creates or updates a dedicated `gcloud` configuration named `nathanpaynedotcom`

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

No CI/CD pipeline is currently configured. Deploys are manual via `op-firebase-deploy`.

If a CI pipeline is added later, prefer Workload Identity Federation or another `external_account` credential as the source ADC, then let `op-firebase-deploy` impersonate the deployer service account. Do **not** store service account keys as CI secrets.

## Secrets Management

- No API keys or secrets are committed to this repository. Google Analytics Measurement ID (`G-7C29SRBXB1`) is a public identifier — not a secret.
- Deploy auth uses short-lived impersonated credentials derived from local ADC or CI-provided external-account credentials.
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

If local ADC has expired, been revoked, or is missing:

```bash
gcloud auth application-default login
```

If deploy impersonation breaks because IAM bindings or `gcloud` config drifted, rerun:

```bash
op-firebase-setup nathanpaynedotcom
```
