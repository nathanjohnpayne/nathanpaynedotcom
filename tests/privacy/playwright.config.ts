import { defineConfig } from '@playwright/test';

/**
 * Playwright config for the #1079 privacy acceptance suite (#1230).
 *
 * Separate from the repository's playwright.config.ts on purpose: that suite
 * serves `dist/` on localhost with a managed server, while this one serves the
 * flag-on `dist-privacy-test/` build on a non-local hostname through its own
 * refusing proxy (tests/privacy/harness/egress.ts), so there is no webServer.
 *
 *   npm run build:privacy-test
 *   npx playwright test -c tests/privacy/playwright.config.ts
 *
 * The contract is specs/analytics-privacy.md; every test title carries the
 * PRIV-n criterion IDs it speaks to.
 *
 * How the boundary works (full description in harness/egress.ts): Chromium's
 * only network path is a local proxy that serves the built site, the SDK
 * fixtures, and a sink, and refuses everything else; the resolver maps every
 * other hostname to NOTFOUND; WebRTC is limited to proxied UDP; a default-deny
 * route and blocked service workers sit in front of the first navigation. The
 * only network access outside that boundary is the Node-side setup step in
 * global-setup.ts (npm registry tarballs, the production page's gtag ID, and
 * gtag.js), which no browser can reach.
 *
 * Environment:
 *   NP_PRIVACY_DIST          build directory to test (default dist-privacy-test)
 *   NP_PRIVACY_OFFLINE=1     skip the gtag.js fetch; GA4 tests then skip as not verified
 *   NP_PRIVACY_REFRESH=1     refetch gtag.js even if a cached copy exists
 *   NP_GA_MEASUREMENT_ID     production GA4 ID, if the page cannot be read
 *   NP_PRIVACY_REQUIRE_UI=1  fail, instead of skip, when the notice or /privacy/ (#1229) is absent;
 *                            the change that flips the feature flag (#1233) must run with it set
 *
 * Coverage levels, stated plainly:
 *   PostHog: the real posthog-js 1.438.3 bundles, byte-identical to production (SHA-256 checked).
 *   GA4:     the real gtag.js, but INDICATIVE only. It is fetched live and matches none of the three
 *            variants the inventory recorded, so GA4 transmitted-payload criteria are reported not
 *            verified against production bytes.
 */
export default defineConfig({
  testDir: '.',
  // `.pw.ts`, not `.spec.ts`: Vitest's default include would otherwise pick these up.
  testMatch: '**/*.pw.ts',
  outputDir: '../../test-results/privacy',
  globalSetup: './global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 3,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  use: { trace: 'off' },
});
