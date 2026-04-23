Tracks **Phase 0** of Matchline V1 (Project #6).

**Goal:** the repo is bootstrapped, the PR #4 scaffold is merged, Firebase is live, secrets are provisioned, and reviewer identities can post comments on matchline PRs. No product surface ships in this phase.

**Why this phase exists:** most of it is human-only work (creating the Firebase project, running `op-firebase-setup`, storing API keys, adding collaborator access). Separating it into its own phase keeps Phase 1 from blocking on unrelated setup.

**Exit criteria:**
- PR #4 merged into `main`.
- `op-firebase-deploy --only hosting` succeeds against `matchline-dev`.
- `npm run build` and `npm --prefix functions run build` both green.
- `repo_lint.yml` green on `main`.
- `nathanpayne-claude` can post review comments on matchline PRs.

Plan: [`plans/matchline-implementation-plan.md`](https://github.com/nathanjohnpayne/matchline/blob/main/plans/matchline-implementation-plan.md) § Phase 0.
Spec: [`specs/matchline.md`](https://github.com/nathanjohnpayne/matchline/blob/main/specs/matchline.md).

Sub-issues below.
