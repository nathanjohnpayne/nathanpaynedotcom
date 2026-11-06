# Keep the Phone Receptionist in This Repository

## Decision

**The phone receptionist's agent code lives in this repository, in a top-level `receptionist/` folder, as a self-contained Python project.** It has its own `pyproject.toml`, tests and path-filtered CI job, deploys to LiveKit Cloud with `lk agent deploy` from inside the folder, and is never built, served or deployed by Astro or Firebase.

Decided by the owner on 2026-11-05, in the session that filed epic #1561, after a separate public repository (`nathanjohnpayne/livekit-receptionist`) had briefly been created for it. Implemented in #1563.

## Why This Needed Deciding

`rules/repo_rules.md` forbids a new top-level directory without a justification in `AGENTS.md` or a `plans/` entry, and says Astro is the framework: no other framework or runtime without explicit discussion. The agent adds a second language and a server-side runtime to a repository that is otherwise a static site. It doesn't add anything to the site itself: no page loads LiveKit, and the only site change in the epic is a `tel:` link on `/book/` (#1567).

## Options Considered

1. **A separate public repository.** This keeps this repository's gates (prose lint, the spec-to-test mapping, the mergepath sync, external review above 300 changed lines) away from Python code. It would also be a small, readable repository for the LiveKit role the demo was built for. It was set aside: the tickets, the privacy inventory and the `/book/` page all live here, and a second repository is one more thing to keep in step.
2. **`receptionist/` in this repository (chosen).** The tickets, code, privacy record and the page that publishes the number change together and are reviewed in one place.

## Consequences

- `.repo-template.yml` declares `receptionist` in `extra_top_level_dirs`, so `check_no_forbidden_top_level_dirs` accepts it.
- `.github/workflows/receptionist.yml` runs the Python lint and tests only when `receptionist/**` or the workflow itself changes. The site's required checks don't run Python and don't need to.
- The folder's Markdown is tracked, so prose lint covers it like any other doc.
- The Cal.com key and LiveKit credentials are never committed. The key lives in 1Password and in LiveKit Cloud's agent secrets, set at deploy time (#1565). That keeps `rules/repo_rules.md` § Forbidden Patterns and the credential-free site build intact.
- `.ai_context.md` lists the folder, LiveKit Cloud as an external dependency, and why `functions/` is still absent: the agent runs on LiveKit Cloud, not Firebase.
- The separate repository created before this decision held only its initial README and license commit. The owner had it deleted on 2026-11-05.

## Status

Shipped. The epic's issues closed between 2026-11-05 and 2026-11-06: the agent (#1563), deploy and number routing (#1565), privacy (#1566), the `/book/` phone row (#1567), call analytics (#1573), Cal.com error mapping and API version (#1570, #1571), and the documentation pass (#1569). Later additions stayed inside this decision: analytics added a PostHog client, and two more agent secrets, to the same folder. The operating runbook is `receptionist/README.md`.
