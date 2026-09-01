# Testing Requirements

Vitest smoke tests cover SEO metadata, blog rendering, responsive behavior, content schema validation, sitemap generation, keyboard navigation, Mermaid diagrams, analytics, and image policy. Playwright e2e tests cover visual regression and interactions.

**Enforced in CI (`.github/workflows/build-and-test.yml`, #632):** every pull request and every push to `main` runs `npm ci` (plain, no `--legacy-peer-deps`—see #631), `npm test` (`astro build && vitest run`), and `npm run lint`. The test suite inspects rendered Mermaid SVG for the blog label-contrast contract; lint runs ESLint and Vale prose checks. Any failure blocks the PR. `npm run test:e2e` (Playwright) is intentionally NOT part of this required job—see the workflow file for why—and stays a manual/local check for now. Dependabot auto-merge (`.github/workflows/dependabot-auto-merge.yml`) waits on this job's `build-and-test` check succeeding on the PR's current HEAD, in addition to the existing structural `lint` check, before it will merge.

**Timeouts are set explicitly (`vitest.config.js`, #891/#894).** `testTimeout: 20_000` and `hookTimeout: 60_000`, not the 5s default. Several suites parse every built page with JSDOM and one drives a real Chromium, so under concurrent load the 5s ceiling produced failures that were always timeouts and never assertions—on a rotating set of unrelated tests, which is the tell. If you see a suite fail somewhere unexpected, check the duration before you go looking for a defect: a failure at five-plus seconds is almost certainly contention, and one at a couple of hundred milliseconds is almost certainly real.

**Playwright owns its own server, and will not adopt one it did not start (`playwright.config.ts`, #875).** `reuseExistingServer` is `false`. It used to be `!process.env.CI`, which locally accepted any listener on :4321 as the server under test—and worktrees under `.claude/worktrees/` are separate checkouts with separate `dist/` trees, so a sibling session's preview got adopted and the suite reported on a build unrelated to the branch. Green or red, both fiction; #875 records two false findings shipped that way. A busy port is now a startup error naming the URL. Two escape hatches, in preference order: `E2E_PORT=4400 npm run test:e2e` runs a second checkout on its own port, and `E2E_BASE_URL=http://localhost:4450 npm run test:e2e` points the suite at a server it does not manage—needed under an agent session's preview manager, where `astro preview` daemonizes and Playwright reports "Process from config.webServer exited early". Either way `tests/responsive/global-setup.ts` runs first and compares **every file** in `dist/`—HTML and assets alike, by SHA-256—against what the server returns for its path, so an adopted server on the wrong build fails before the first spec instead of reporting on it. The breadth is deliberate and was narrowed twice under review: an asset-name fingerprint passes a sibling checkout differing only in Markdown, and an HTML-only comparison passes one differing only in a `public/` asset—which `swipe-watch-mux-fallback.spec.ts` actually loads. One caveat it cannot cover: the check proves the server is serving *this* `dist/`, not that `dist/` matches your sources. The managed path builds first; under `E2E_BASE_URL` nothing does, so build before pointing the suite at an external preview.

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
