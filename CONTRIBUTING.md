# Contributing

## Overview

nathanpayne.com is a small, focused static portfolio site. Contributions should honor the design philosophy: clean Mondrian grid layout, strict motion system, no dependencies, no build tooling. Changes should be minimal and precise — this is not a site that benefits from added complexity.

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
2. Keep changes focused — visual changes and content changes in separate commits
3. Test manually before opening a PR (see Testing below)
4. Bump the `?v=` query string on `style.css` and `script.js` in `index.html` if either file changed
5. Open a PR against `main` with a clear title and description
6. At least one human review required before merge

## Code Style

- **HTML:** Semantic elements, ARIA attributes on panels (`role="region"`, `aria-label`), `aria-hidden="true"` on decorative blocks, `target="_blank" rel="noopener"` on external links, inline SVG for icons
- **CSS:** All durations and easing via motion tokens only (no hard-coded `ms` or bare `ease`). Design tokens in `:root`. Panel classes are color-based, not content-based. `clamp()` for fluid sizing.
- **JavaScript:** IIFE-wrapped, strict mode, no globals, vanilla DOM only. `matchMedia` for capability detection. Guard analytics calls with `typeof gtag !== 'function'`.
- No linter is configured. Follow the patterns in the existing files exactly.

## Testing

No automated test suite. Before submitting a PR, manually verify:

1. All four panels open/close correctly on desktop (hover)
2. Keyboard navigation works: Tab to focus, Enter/Space to open, Escape to close
3. Mobile view (375px): panels stack vertically, content always visible, no interaction handlers active
4. `prefers-reduced-motion` respected: test in macOS Accessibility settings or Chrome DevTools
5. No console errors in Chrome and Safari
6. OG metadata renders correctly (use a social card preview tool if OG image changed)
7. Cache-bust query strings updated in `index.html` if CSS or JS changed

## Agent Contributions

AI agent contributions must follow `AGENTS.md`. All agent-proposed changes require human review before merge. Agents must not autonomously merge PRs, modify credentials, or change the Firebase project configuration.

## Questions

Open an issue on GitHub or contact the repo owner directly.
