# Testing Requirements

Vitest smoke tests cover SEO metadata, blog rendering, responsive behavior, content schema validation, sitemap generation, keyboard navigation, Mermaid diagrams, analytics, and image policy. Playwright e2e tests cover visual regression and interactions.

**Enforced in CI (`.github/workflows/build-and-test.yml`, #632):** every pull request and every push to `main` runs `npm ci` (plain, no `--legacy-peer-deps`—see #631), `npm test` (`astro build && vitest run`), and `npm run lint`. The test suite inspects rendered Mermaid SVG for the blog label-contrast contract; lint runs ESLint and Vale prose checks. Any failure blocks the PR. `npm run test:e2e` (Playwright) is intentionally NOT part of this required job—see the workflow file for why—and stays a manual/local check for now. Dependabot auto-merge (`.github/workflows/dependabot-auto-merge.yml`) waits on this job's `build-and-test` check succeeding on the PR's current HEAD, in addition to the existing structural `lint` check, before it will merge.

**Timeouts are set explicitly (`vitest.config.js`, #891/#894).** `testTimeout: 20_000` and `hookTimeout: 60_000`, not the 5s default. Several suites parse every built page with JSDOM and one drives a real Chromium, so under concurrent load the 5s ceiling produced failures that were always timeouts and never assertions—on a rotating set of unrelated tests, which is the tell. If you see a suite fail somewhere unexpected, check the duration before you go looking for a defect: a failure at five-plus seconds is almost certainly contention, and one at a couple of hundred milliseconds is almost certainly real.

**Playwright owns its own server, and will not adopt one it did not start (`playwright.config.ts`, #875).** `reuseExistingServer` is `false`. It used to be `!process.env.CI`, which locally accepted any listener on :4321 as the server under test—and worktrees under `.claude/worktrees/` are separate checkouts with separate `dist/` trees, so a sibling session's preview got adopted and the suite reported on a build unrelated to the branch. Green or red, both fiction; #875 records two false findings shipped that way. A busy port is now a startup error naming the URL. Two escape hatches, in preference order: `E2E_PORT=4400 npm run test:e2e` runs a second checkout on its own port, and `E2E_BASE_URL=http://localhost:4450 npm run test:e2e` points the suite at a server it does not manage—needed under an agent session's preview manager, where `astro preview` daemonizes and Playwright reports "Process from config.webServer exited early". Either way `tests/responsive/global-setup.ts` runs first and compares **every file** in `dist/`—HTML and assets alike, by SHA-256—against what the server returns for its path, so an adopted server on the wrong build fails before the first spec instead of reporting on it. The breadth is deliberate and was narrowed twice under review: an asset-name fingerprint passes a sibling checkout differing only in Markdown, and an HTML-only comparison passes one differing only in a `public/` asset—which `swipe-watch-mux-fallback.spec.ts` actually loads. One caveat it cannot cover: the check proves the server is serving *this* `dist/`, not that `dist/` matches your sources. The managed path builds first; under `E2E_BASE_URL` nothing does, so build before pointing the suite at an external preview.

## PDF test dependencies

`tests/resume.test.js` needs two PDF command-line tools, and will fail with an install hint rather than skip if either is missing. Skipping would quietly drop the only coverage of two regressions that are invisible to every other kind of check.

```bash
# macOS
brew install poppler mupdf-tools

# Debian / Ubuntu (this is what CI installs)
sudo apt-get install -y poppler-utils mupdf-tools
```

**Poppler (`pdftotext`, `pdfinfo`)** is the oracle for reading order, #923. The résumé PDF renders correctly but Chromium writes each page's text in *paint* order, so a CSS change can reorder the document for everything that reads the file rather than looks at it—ATS parsers, assistive tech, copy-paste—with every pixel identical. `pdftotext -raw` reports content-stream order and exposes that. `pdftotext` **without** `-raw` reconstructs order from glyph coordinates, reports the visual order, and passes on a broken file; so does any page-image comparison. The `-raw` flag is the entire point of using it.

**MuPDF (`mutool`)** renders pages for the bullet-marker check, #925, where the markers existed in the file but were painted white. That one is about what is on the page, so the test renders and looks for ink. It also renders them for the lifecycle marks (#944, #957), which are the same failure shape with a twist: three of the four are CSS backgrounds and only the outline is a border, so dropping backgrounds leaves every mark present, correctly sized, correctly placed, and collapsed into one state. The oracle there classifies each mark by the ink on its middle row—solid, cored, half, hollow—rather than counting the filled ones, and the test compares that sequence against the variants the page declares. Counting only ever worked while some project was `SHIPPED`, which is the one variant that runs solid edge to edge; classifying works whatever states the résumé happens to hold, which is what `specs/resume.md` requires of it.

Neither tool is a runtime or build dependency, and nothing ships from them—they are test oracles only. The repository deliberately does **not** parse PDFs itself: an earlier version of this coverage grew a 677-line Chromium-specific PDF interpreter (`/ToUnicode` CMaps, font code widths, graphics state, marked-content replacement text) and eleven rounds of review found new ways for it to be quietly wrong about content. See `tests/helpers/pdf-oracle.js`.

`tests/fixtures/known-bad-resume-pre-923.pdf` is the résumé exactly as published with both defects. Every ordering and marker assertion runs against it as well as against the fresh build and **requires it to fail**—a check that passes on the broken artifact is not a check. Do not regenerate or repair that fixture.

## The lifecycle marker suite parses CSS with a parser

`tests/lifecycle-marker.test.js` § declarations asserts what each of the four lifecycle marks is made of by reading the emitted stylesheet, and it reads it with `css-tree`, not with regular expressions (#967). The history is the argument: thirteen of PR #964's sixteen findings were the same finding arriving five rounds running—a regex approximating the CSS selector grammar does not handle shape *X*—as descendant and compound qualification, `:is()` / `:where()`, attribute and ID qualification, a comma inside `:is(a, b)`, and a comma inside an attribute value. Every fix was right and every fix closed one case and left the shape. Round 5 is where the extractor also produced a **false** failure, reading `@layer components` as conditional, which is the worse direction and what made this a dependency decision rather than another patch.

Two things follow for anyone extending it. **The suite carries its own defect fixtures**—§ *the collector rejects every shape it has been fooled by*—which rebuild each historical shape and assert the collector finds it, alongside the false positives that must keep passing (`@layer`, a surface sizing its own status element, a class whose escaped name merely looks like the primitive). Add to that table when a new shape turns up; a negative assertion over a stylesheet that is currently correct is not known to reject anything, which is exactly how five rounds of holes each passed every check. **And the surface list is derived twice**, from the `stateMarkerClass()` call sites and from the classes on rendered marks in `dist/`, because each derivation is blind where the other sees. A call site whose surface argument is not a string literal fails the suite rather than contributing nothing (#968): a surface that is never policed and a surface that does not exist must not arrive as the same empty result.

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
