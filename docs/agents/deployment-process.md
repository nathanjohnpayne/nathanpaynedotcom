# Deployment Process

All deploys use `op-firebase-deploy` for non-interactive service account impersonation (the exception is the key-based path in DEPLOYMENT.md § CI/CD & Headless Deploy, which uses the deployer service account key directly, without impersonation). Never run `firebase deploy` directly. Production deploys come only from the attested CI build of a commit on `main`, via `scripts/deploy-artifact.sh`, and only after the owner asks for one. There is no npm deploy alias (`package.json` has no `deploy` or `deploy:hosting` script), because npm runs its configured `script-shell`, which a repository `.npmrc` can set, before any script body. Never run `npm run deploy`; it prints npm's "Missing script" error and runs nothing.

```bash
git pull --ff-only                                       # refresh origin/main first; a stale checkout pins a stale SHA
SHA="$(git rev-parse origin/main)"                       # confirm it is the full SHA the owner approved
scripts/deploy-artifact.sh --sha "$SHA" --dry-run        # verify that artifact; deploy nothing
scripts/deploy-artifact.sh --sha "$SHA"                  # full deploy, then purge Cloudflare
scripts/deploy-artifact.sh --sha "$SHA" --hosting-only   # hosting only, then purge Cloudflare
```

Procedure: merge to `main`; wait for the `Build Artifact` workflow on that commit; `git pull` in the main checkout and run preflight (`eval "$(scripts/op-preflight.sh --agent <agent> --mode all)"`); dry run, then deploy, passing the same full `--sha` (the commit the owner approved) to both, because an unpinned run defaults to whatever `origin/main` is at that moment; verify the live site. Rollback: `scripts/deploy-artifact.sh --sha <earlier main sha>` within the 30-day artifact retention, or Firebase Hosting's release history for older releases.

Run the script directly, never through `npm run` or as `bash scripts/deploy-artifact.sh`. It refuses to run when its copy differs from `scripts/deploy-artifact.sh` on `origin/main`, so a rollback keeps the current deployer; `--sha` selects only the artifact and the deployment configuration.

**Do not call `op-firebase-deploy` directly.** It deploys to Firebase but does not purge Cloudflare, so the edge keeps serving the old copy and production appears unchanged while the deploy reports success. Images sit at the edge for several hours (observed `max-age=14400` on `/images/**`). If you deploy by hand anyway, run `scripts/cf-cache-purge.sh` afterwards.

**Deploy from the main checkout, not a worktree.** Only `~/GitHub/nathanpaynedotcom` has `.env.local` (gitignored, so no worktree has one), and the CI build is guarded by `scripts/check-deploy-env.sh` against a missing `PUBLIC_*` client var (no brand logos, no PostHog or GA4). `scripts/check-deploy-deps.sh` (lockfile drift) is no longer in the deploy path because nothing is built locally.

**Merging a PR deploys nothing.** There is no deploy workflow in `.github/workflows/`—deploys are manual. `.github/workflows/build-artifact.yml` builds and attests the credential-free `dist/` archive on every push to `main` (#1238); `scripts/deploy-artifact.sh` (#1239) verifies and deploys it, and is the only deploy path (the npm aliases were removed in #1240).

**Verify against the live URL, not the deploy log.** Fetch the changed page or
asset and confirm the new bytes are being served (`curl -s <url> | md5`). A
successful deploy plus a warm CDN edge looks exactly like a successful deploy
that reached users.

See `DEPLOYMENT.md` for the 1Password-backed GCP ADC bootstrap, `gcloud` wrapper install, first-time impersonation setup, cache-bust steps, caching rules, security headers, rollback procedure, and secrets management.

- If credential preflight was run at session start (`scripts/op-preflight.sh --mode all`),
  deploy credentials are already cached in `GOOGLE_APPLICATION_CREDENTIALS`. No additional
  biometric prompt is needed for deployment.

If an `op` command fails with a sign-in or biometric error during deploy, follow the pause-and-prompt procedure in [operating-rules.md](operating-rules.md#1password-cli-authentication-failures). Do not retry or work around the failure without the human present.

---
