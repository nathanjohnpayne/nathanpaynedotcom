# AGENTS.md

Agent instructions are organized into focused sub-files under `docs/agents/`. Read the relevant file(s) before taking action in this repository.

## Sections

1. **[Repository Overview](docs/agents/repository-overview.md)** --- Project description, tech stack, agent role
2. **[Agent Operating Rules](docs/agents/operating-rules.md)** --- Reading order, conflict resolution
3. **[Code Modification Rules](docs/agents/code-modification-rules.md)** --- File creation, duplication, directory constraints
4. **[Documentation Rules](docs/agents/documentation-rules.md)** --- When and what to update
5. **[Testing Requirements](docs/agents/testing-requirements.md)** --- Coverage expectations, test deletion policy
6. **[Deployment Process](docs/agents/deployment-process.md)** --- Build/deploy flow, 1Password-backed auth
7. **[Prose Line-Wrapping](docs/agents/prose-line-wrapping.md)** --- Soft-wrap Markdown prose; repository scope is listed in Documentation Rules
8. **[Blog Revision Process](docs/agents/blog-revision-process.md)** --- Two-pass order for audited posts, facts ledgers, brevity verification

## Code Review Policy

This repository uses a multi-identity AI agent code review system. The full policy is in REVIEW_POLICY.md. The per-repo configuration is in .github/review-policy.yml.

### Identity Rules

- All agents author and commit code as nathanjohnpayne.
- Each agent reviews code under its own reviewer identity (e.g., nathanpayne-claude, nathanpayne-cursor, nathanpayne-codex).
- An agent never reviews code under the same identity that authored it.
- Only nathanjohnpayne merges to the target branch.

### Workflow Summary

Use [REVIEW_POLICY.md § Workflow](REVIEW_POLICY.md#workflow) for credential preflight, author/reviewer identities, review rounds and merge gates. The [agent operating rules](docs/agents/operating-rules.md) and [testing requirements](docs/agents/testing-requirements.md) cover local execution details.

1. Author as `nathanjohnpayne`, file the PR through `scripts/gh-as-author.sh`, and include the required `Authoring-Agent:` and `## Self-Review` body fields.
2. Review under a registered reviewer identity. Resolve eligible bot conversations and registered agent-reviewer conversations after that reviewer accepts the fix; stop for real-human conversations unless the human explicitly directs otherwise. Follow the policy's complete-history feedback accounting before merging.
3. Run `scripts/coderabbit-should-invoke.sh` to select Phase 2.5. When that phase observes a CodeRabbit rate-limit or included-quota refusal, request Codex immediately; do not wait out the provider window or post a CodeRabbit retry. See [Phase 2.5](REVIEW_POLICY.md#phase-25-automated-external-review-coderabbit).
4. A rate-limited under-threshold PR still needs exact-head Codex clearance before reviewer approval. Record the provider and full SHA in the later approval as required by [Phase 3](REVIEW_POLICY.md#phase-3-external-review-threshold-check).
5. Use the configured threshold, protected paths and the force-on `needs-external-review` label to route [Phase 4](REVIEW_POLICY.md#phase-4-external-review). Apply the governing policy's request budgets, external-review requirements and human escalation rules.
6. Outside an active native merge-queue rollout, merge one current, approved head as `nathanjohnpayne` through the author wrapper only after all applicable gates and review conversations clear. During an active rollout, follow the [canonical native merge-queue policy](https://github.com/nathanjohnpayne/mergepath/blob/main/REVIEW_POLICY.md#native-merge-queue-boundary-1058) and leave activation, queue actions and any direct merge to the human owner. Preserve human holds, reviewer disagreements and actual in-flight Codex review stops.

### Disagreements

If the internal reviewer and external reviewer disagree on whether code is ready to merge, the human is the tiebreaker. Surface both positions clearly and wait.

In Phase 4a specifically, the agent escalates automatically on either of two signals: **repeat-after-rebuttal** (Codex re-flags a finding after the agent posted a rebuttal reply) or **runaway** (the blocking-review budget `codex.max_blocking_reviews` is spent, or the Phase 4b barrier finds that every request the ceiling allowed drew a blocking review whose findings were not all fixed). `codex.max_review_rounds` (10) is the per-PR request ceiling, not a runaway signal: a spent ceiling (exit `7`, `kind: "request-ceiling"`) enters the Phase 4b barrier, where `scripts/phase-4b-review.sh` runs first. On escalation, the agent stops the loop, posts a comment on the PR summarizing both positions with links to the review rounds, alerts the human, and does not merge. Escalation does NOT route the PR into Phase 4b: a second external reviewer would settle a dispute the human is supposed to settle. Timeout (exit code `4` from `codex-review-request.sh`) is NOT a disagreement—it falls back to Phase 4b directly. The same rule governs Phase 4b's own automated review: exhausting `phase_4b_automation.max_review_rounds` escalates to the human rather than falling through to the manual handoff. Full detail in REVIEW_POLICY.md § Disagreements and Tiebreaking.

### Adding a New Agent

1. Create a GitHub account: nathanpayne-{agent}
2. Add it to available_reviewers in .github/review-policy.yml.
3. Configure the agent environment with credentials for both nathanjohnpayne and the new reviewer identity.

For the complete policy including the handoff message format, post-merge issue creation rules, and git identity switching instructions, read REVIEW_POLICY.md.
