# Testing Requirements

Vitest smoke tests cover SEO metadata, blog rendering, responsive behavior, content schema validation, sitemap generation, keyboard navigation, Mermaid diagrams, analytics, and image policy. Playwright e2e tests cover visual regression and interactions.

**Enforced in CI (`.github/workflows/build-and-test.yml`, #632):** every pull request and every push to `main` runs `npm ci` (plain, no `--legacy-peer-deps`—see #631), `npm test` (`astro build && vitest run`), and `npm run lint`. The lint command runs ESLint, Vale prose checks, and the blog Mermaid label-contrast gate. Any failure blocks the PR. `npm run test:e2e` (Playwright) is intentionally NOT part of this required job—see the workflow file for why—and stays a manual/local check for now. Dependabot auto-merge (`.github/workflows/dependabot-auto-merge.yml`) waits on this job's `build-and-test` check succeeding on the PR's current HEAD, in addition to the existing structural `lint` check, before it will merge.

**Run before any PR (locally, in addition to CI):**

```bash
npm run lint
npm run typecheck     # astro check
npm run test          # astro build && vitest run
npm run test:e2e      # playwright test
```

**Manual testing checklist (run before any PR):**

1. Homepage panels open/close correctly on desktop (hover)
2. Keyboard navigation works: Tab to focus, Enter/Space to open, Escape to close
3. Mobile view (375px): panels stack vertically, content always visible
4. `prefers-reduced-motion` respected: test in macOS Accessibility settings or Chrome DevTools emulation
5. No console errors in Chrome and Safari
6. OG metadata renders correctly (use a social card preview tool if OG image changed)
7. Blog routes load correctly (`/blog/` and the latest post page) if blog content or templates changed
8. Project pages render correctly if project content or layouts changed
9. RSS feed is valid (`/rss.xml`)
10. Security headers present (check in DevTools → Network → Response Headers after deploying)

**When to add more automated tests:** Add or extend Vitest/Playwright coverage whenever new page routes, metadata surfaces, content types, or integrations are introduced.

---
