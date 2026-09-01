# Deployment Process

All deploys use `op-firebase-deploy` for non-interactive service account impersonation. Never run `firebase deploy` directly. For a full production deploy, use the package alias so the build always runs first and Cloudflare is purged afterward.

```bash
npm run deploy                      # full deploy: build, op-firebase-deploy, purge Cloudflare
npm run deploy:hosting              # hosting only: build, deploy hosting, purge Cloudflare
```

**Use one of those two aliases. Do not call `op-firebase-deploy` directly.** It
deploys to Firebase but does not purge Cloudflare, so the edge keeps serving the
old copy and production appears unchanged while the deploy reports success.
Images sit at the edge for several hours (observed `max-age=14400` on
`/images/**`). If you deploy by hand anyway, run `scripts/cf-cache-purge.sh`
afterwards.

**Deploy from the main checkout, not a worktree.** Both aliases run `scripts/check-deploy-env.sh` first, which refuses the deploy when a `PUBLIC_*` client var is missing or still an unresolved `op://` reference. Only `~/GitHub/nathanpaynedotcom` has `.env.local`; it is gitignored, so no worktree has one. Without the check, a worktree deploy succeeds and publishes a site with no Logo.dev brand marks on `/resume` and no PostHog or GA4 anywhere—every `PUBLIC_*` consumer degrades gracefully by design, so the build has nothing to fail on. Break-glass override: `DEPLOY_ALLOW_MISSING_PUBLIC_ENV=1`.

**Deploy from a checkout installed off the lockfile.** Both aliases also run `scripts/check-deploy-deps.sh`, which compares every installed package against `package-lock.json` and refuses the deploy on any mismatch. The deploy builds from whatever is installed in the checkout; CI builds from `npm ci`. When those two disagree, CI is green on a SHA whose local build is broken, and the deploy ships the broken one and reports success—`astro build` exits 0 either way. The signature is CI green on the same SHA that a clean local build fails: that is dependency drift, never a broken `main`. `npm ls` will not catch it, because a drifted version usually still satisfies the range in `package.json`; the lockfile is the only artifact pinning what CI built against. Fix with `npm ci`. Break-glass override: `DEPLOY_ALLOW_DEP_DRIFT=1`.

**Merging a PR deploys nothing.** There is no deploy workflow in `.github/workflows/`—deploys are manual. After merging a change that should be visible on the site, run a deploy alias yourself.

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
