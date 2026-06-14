# Contributing

## Overview

nathanpayne.com is a personal portfolio and blog site built with Astro. Contributions should honor the design philosophy: clean Mondrian grid layout, strict motion system, and minimal complexity. Changes should be precise—this is not a site that benefits from added abstractions.

## Branch Naming

| Type | Format | Example |
|------|--------|---------|
| New feature | `feature/<short-description>` | `feature/add-writing-panel` |
| Bug fix | `fix/<short-description>` | `fix/mobile-panel-overflow` |
| Content update | `chore/<short-description>` | `chore/add-project-swipewatch` |

## Commit Message Format

Use imperative present tense. Keep the subject line under 72 characters.

```
Add SwipeWatch to projects panel
Fix hover intent timing on yellow panel
Update OG image for 2026 redesign
```

For larger changes, add a body explaining why, not what.

## Pull Request Process

1. Branch from `main`
2. Keep changes focused—visual changes and content changes in separate commits
3. Run `npm run lint`, `npm run test`, and `npm run test:e2e` before opening a PR
4. Open a PR against `main` with a clear title and description
5. At least one human review required before merge

## Code Style

- **Astro pages:** Semantic elements, ARIA attributes on panels (`role="region"`, `aria-label`), `aria-hidden="true"` on decorative blocks, `target="_blank" rel="noopener"` on external links, inline SVG for icons
- **CSS:** All durations and easing via motion tokens only (no hard-coded `ms` or bare `ease`). Design tokens in `:root` of `src/styles/global.css`. `clamp()` for fluid sizing.
- **Markdown:** Blog posts in `src/content/blog/` must include valid frontmatter matching the Zod schema in `src/content.config.ts`.
- ESLint is configured via `eslint.config.js`. Follow the patterns in the existing files exactly.

## Testing

Vitest and Playwright tests cover metadata, layout, interactions, and routes.

```bash
npm run lint
npm run test          # astro build && vitest run
npm run test:e2e      # playwright test
```

Before submitting a PR, also manually verify:

1. Homepage panels open/close correctly on desktop (hover)
2. Keyboard navigation works: Tab to focus, Enter/Space to open, Escape to close
3. Mobile view (375px): panels stack vertically, content always visible
4. `prefers-reduced-motion` respected
5. No console errors in Chrome and Safari
6. OG metadata renders correctly (use a social card preview tool if OG image changed)
7. Blog routes and RSS feed work if blog content or templates changed

## Agent Contributions

AI agent contributions must follow `AGENTS.md`. All agent-proposed changes require human review before merge. Agents must not autonomously merge PRs, modify credentials, or change the Firebase project configuration.

## Questions

Open an issue on GitHub or contact the repo owner directly.
