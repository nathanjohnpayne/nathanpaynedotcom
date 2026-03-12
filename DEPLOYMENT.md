# Deployment

## Prerequisites

- [Firebase CLI](https://firebase.google.com/docs/cli) installed globally
- [1Password CLI](https://developer.1password.com/docs/cli/) (`op`) installed and signed in
- `op-firebase-deploy` script on PATH (see First-Time Setup below)
- Access to the `nathanpaynedotcom` 1Password vault items: `Private/Firebase Deploy - nathanpaynedotcom` and `Private/GCP ADC`

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

All deploys use `op-firebase-deploy` for non-interactive 1Password auth. **Never run `firebase deploy` directly.**

```bash
# Full deploy (hosting + all configured services)
op-firebase-deploy

# Hosting only
op-firebase-deploy --only hosting
```

The script:
1. Reads the service account key from 1Password (`Private/Firebase Deploy - nathanpaynedotcom/credential`)
2. Auto-detects the Firebase project from `.firebaserc`
3. Writes the key to a temp file (`umask 077`), sets `GOOGLE_APPLICATION_CREDENTIALS`
4. Runs `firebase deploy --non-interactive`
5. Cleans up credentials on exit

The only interactive step is the 1Password biometric prompt (Touch ID). No `firebase login`, `gcloud auth login`, or browser prompts needed.

## First-Time Setup

```bash
op-firebase-setup nathanpaynedotcom
```

This creates a `firebase-deployer` service account, grants deploy roles, generates a key, and stores it in 1Password as `Firebase Deploy - nathanpaynedotcom`. Run once per machine.

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

## Secrets Management

- No API keys or secrets are committed to this repository. Google Analytics Measurement ID (`G-7C29SRBXB1`) is a public identifier — not a secret.
- Service account credentials are stored exclusively in 1Password (`Private/Firebase Deploy - nathanpaynedotcom`).
- Do not commit API keys, service-account JSON, or ADC credentials.
- If the `Private/GCP ADC` credential is exposed:
  1. Run `gcloud auth application-default login --project=nathanpaynedotcom`
  2. Overwrite the 1Password item: `op item edit "GCP ADC" --vault Private "credential=$(cat ~/.config/gcloud/application_default_credentials.json)"`
  3. Revoke the old Google credential in the GCP Console
- If a future feature requires API keys, keep them in ignored config files and apply browser restrictions in Google Cloud. Never commit raw keys.

## Caching Rules

| Pattern | Cache TTL |
|---------|-----------|
| `og-image.png`, `/og/**` | 1 year (immutable) |
| `**/*.js`, `**/*.css` | 1 hour |
| `**/*.html` | 1 hour |

## Security Headers

Applied globally via `firebase.json`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`.

## Key Rotation

The service account key does not expire. To rotate if compromised:

```bash
op-firebase-setup nathanpaynedotcom
```
