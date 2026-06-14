# Deployment Process

All deploys use `op-firebase-deploy` for non-interactive service account impersonation. Never run `firebase deploy` directly.

```bash
op-firebase-deploy                  # full deploy
op-firebase-deploy --only hosting   # hosting only
```

See `DEPLOYMENT.md` for the 1Password-backed GCP ADC bootstrap, `gcloud` wrapper install, first-time impersonation setup, cache-bust steps, caching rules, security headers, rollback procedure, and secrets management.

- If credential preflight was run at session start (`scripts/op-preflight.sh --mode all`),
  deploy credentials are already cached in `GOOGLE_APPLICATION_CREDENTIALS`. No additional
  biometric prompt is needed for deployment.

If an `op` command fails with a sign-in or biometric error during deploy, follow the pause-and-prompt procedure in [operating-rules.md](operating-rules.md#1password-cli-authentication-failures). Do not retry or work around the failure without the human present.

---
