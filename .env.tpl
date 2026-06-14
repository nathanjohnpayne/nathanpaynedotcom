# Template resolved by scripts/bootstrap.sh via `op inject`.
# Never edit the generated .env.local directly — change this file and
# re-run ./scripts/bootstrap.sh --force.

# Logo.dev publishable token — read-only client identifier (like the GA
# Measurement ID), safe to ship in the static HTML output, but must come
# from env, never committed (rules/repo_rules.md § No committed secrets).
# Drives the employer/school/issuer logos on /resume via CompanyLogo.astro.
# If unset at build time, the component renders styled initials only — no
# broken images. Same publishable token as friends-and-family-billing.
PUBLIC_LOGODEV_KEY={{ op://Private/rtvfyomcqjigt6ezaycht3vy6i/publishable API key }}

# PostHog project (client) token — public, write-only ingest key (phc_), the
# same class of public client identifier as PUBLIC_LOGODEV_KEY and the GA
# Measurement ID. Safe to ship in the static HTML output, but must come from
# env, never committed (rules/repo_rules.md § No committed secrets). Drives
# product analytics + session replay via src/components/posthog.astro. If unset
# at build time, PostHog does not initialize — no analytics, no errors. The
# personal API key (phx_…) is a true secret and is NOT stored here.
PUBLIC_POSTHOG_PROJECT_TOKEN={{ op://Private/hghd53g7z4fldgqf4d7kgr22ue/project token }}
