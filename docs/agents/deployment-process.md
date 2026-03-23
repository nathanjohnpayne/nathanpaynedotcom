# Deployment Process

All deploys use `op-firebase-deploy` for non-interactive service account impersonation. Never run `firebase deploy` directly.

```bash
op-firebase-deploy                  # full deploy
op-firebase-deploy --only hosting   # hosting only
```

See `DEPLOYMENT.md` for the 1Password-backed GCP ADC bootstrap, `gcloud` wrapper install, first-time impersonation setup, cache-bust steps, caching rules, security headers, rollback procedure, and secrets management.

---
