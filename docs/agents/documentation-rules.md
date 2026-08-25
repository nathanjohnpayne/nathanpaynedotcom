# Documentation Rules

- **`AGENTS.md` / `docs/agents/`:** Update the relevant sub-file when adding new pages/routes, changing the grid system, adding new interaction patterns, modifying the motion system, or changing the content schema.
- **`DEPLOYMENT.md`:** Update when the deploy process changes—new commands, credential rotation, new caching rules, or security header changes.
- **`README.md`:** Update when the project description, live URL, or key features change.
- **`rules/repo_rules.md`:** Update when the directory structure changes or new invariants are needed.
- **`.ai_context.md`:** Update when directories are added/removed, key entry points change, or external dependencies change.

Routine changes to page content, blog posts, or styles do not require documentation updates.

## Prose Line-Wrapping Scope

Follow [Prose Line-Wrapping](prose-line-wrapping.md) for these consumer-owned Markdown paths:

- `AGENTS.md`, `.ai_context.md`, `README.md`, `CONTRIBUTING.md`, `DEPLOYMENT.md`, and `SECURITY.md`
- `docs/*.md`, `plans/*.md`, and `rules/*.md`
- `docs/agents/repository-overview.md`, `docs/agents/operating-rules.md`, `docs/agents/code-modification-rules.md`, `docs/agents/documentation-rules.md`, `docs/agents/testing-requirements.md`, and `docs/agents/deployment-process.md`
- `src/content/blog/**/*.md`

Canonical Mergepath mirrors, generated files, fixtures, and vendored trees remain out of scope. This repository applies the convention during authoring and review; it does not currently add a dedicated wrapping lint gate.

---
