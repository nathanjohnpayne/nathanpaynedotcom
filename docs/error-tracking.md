# PostHog error tracking — autocapture, rate limits, and alert routing

Runbook for the PostHog error-tracking configuration on project `NathanPayne.com` (id 469428). Everything here is PostHog-side project config rather than application code — none of it is changed by editing this repo or redeploying the site. The sibling record for the bingo project lives at [`nathanjohnpayne/gaycruisebingo`](https://github.com/nathanjohnpayne/gaycruisebingo) in `docs/app/error-tracking.md`; the two are configured identically apart from the repo each one files issues into.

## Exception autocapture is a project setting, not code

This is the part most likely to be re-derived the hard way. Until 2026-08-05 this project had never recorded a single `$exception` event — the event was not even present in the project taxonomy — because `autocapture_exceptions_opt_in` was `null`.

Turning it on required no change to [`src/components/posthog.astro`](../src/components/posthog.astro) and no redeploy. `posthog.init()` there sets `api_host`, `ui_host`, and `defaults` only; it says nothing about exception capture, so the server-side project setting governs and the browser SDK picks it up from remote config:

```
call project-settings-update {"id":469428,"autocapture_exceptions_opt_in":true}
```

Read it back with `project-get`. Sibling toggles that live on the same endpoint and behave the same way: `autocapture_opt_out`, `autocapture_web_vitals_opt_in`, `capture_console_log_opt_in`, `capture_dead_clicks`, `session_recording_opt_in`, `heatmaps_opt_in`.

Two conditions still gate whether exceptions actually arrive, both inherited from how analytics is wired on this site rather than from error tracking itself. `posthog.astro` renders nothing when `PUBLIC_POSTHOG_PROJECT_TOKEN` is unset, so a CI build or a checkout that has not run `scripts/bootstrap.sh` reports no exceptions by construction. And all traffic goes through the first-party reverse proxy at `d.nathanpayne.com`, so a proxy outage silently stops exception capture along with every other event.

## Rate limits

| Setting | Value |
|---|---|
| `project_rate_limit_value` | 1000 |
| `project_rate_limit_bucket_size_minutes` | 60 |
| `per_issue_rate_limit_value` | 250 |
| `per_issue_rate_limit_bucket_size_minutes` | 60 |

These numbers are **copied from the bingo project rather than sized from data**, because when they were set this project had no exception history to size against. Treat them as a runaway-loop backstop with an arbitrary ceiling, not as a tuned threshold. Once real volume accumulates here, revisit them: the right ceiling is one a genuine incident never reaches, which for a personal site is likely well below 1000 per hour.

Read and write with the project-scoped PostHog MCP server:

```
call error-tracking-settings-get
call error-tracking-settings-update {"project_rate_limit_value":1000,"project_rate_limit_bucket_size_minutes":60,"per_issue_rate_limit_value":250,"per_issue_rate_limit_bucket_size_minutes":60}
```

Trust that read rather than the in-app recommendation card. After a successful write, `error-tracking-recommendations-list` kept reporting `rate_limits: {project: false, per_issue: false}` with `status: computing` for well over ten minutes, while `error-tracking-settings-get` returned the new values immediately.

## Alert routing

Two alerts file GitHub issues into this repo, through PostHog integration 176816 (`github`, `nathanjohnpayne`).

| Alert | Trigger event | Issue title shape |
|---|---|---|
| `Issue created · nathanpaynedotcom (auto)` | `$error_tracking_issue_created` | `[error-tracking] <name>` |
| `Issue reopened · nathanpaynedotcom (auto)` | `$error_tracking_issue_reopened` | `[error-tracking] Regression: <name>` |

`$error_tracking_issue_spiking` is deliberately not wired. It re-fires on issues that already exist, so aiming it at an issue tracker files duplicate tickets for issues already open; it is also silent until spike detection is configured. Spiking suits a chat channel, not an issue tracker.

Both alerts are enabled but have **never fired**, because until autocapture was switched on there were no exceptions to fire on. The GitHub write path is therefore unproven on this project — the first genuine unhandled error or promise rejection on nathanpayne.com will be its first real test, and should appear here automatically as an `[error-tracking]` issue.

## Gotchas

**PostHog GitHub integrations are per-project.** The PostHog GitHub App installs once org-wide on `nathanjohnpayne` with All-repositories access, but each PostHog project needs its own integration record, created by connecting from the Settings then Integrations page belonging to that project. Reinstalling or re-authorizing the App does nothing for a second project — the unconnected one keeps returning `integrations-list count: 0` until someone clicks Connect there.

**`template-github` requires `posthog_issue_id` on create**, even though its schema marks the field `hidden: true` with a default. Omitting it fails validation with `This field is required`.

**The stock title and description defaults do not survive every trigger.** They reference `event.properties.$exception_types[1]` and `event.properties.$exception_values[1]`, which are spread onto the created and reopened events but not onto spiking. An alert built from the defaults would file empty-titled issues on that trigger. Both alerts here use `event.properties.name`, `event.properties.description`, and `event.distinct_id`, all of which exist on all three triggers, so the configuration stays correct if spiking is ever added.

**The recommendation cards measure configuration, not risk.** The "Rate limits — 0 / 2 configured" card reads as an alert but is a completeness nudge: `error-tracking-recommendations-list` returns it with both keys false purely because nothing is set, regardless of whether the project has any exception volume worth limiting. Read it as a checklist item, not as evidence of a problem.
