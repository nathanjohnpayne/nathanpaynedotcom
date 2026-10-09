import { defineConfig } from '@playwright/test';

/**
 * #1229 privacy UI browser check: the notice, the controls, the footer link,
 * and /privacy/ in a real Chromium, with axe and the reference screenshots.
 * Not part of `npm run test:e2e` (whose config is `playwright.config.ts`);
 * #1230 owns the acceptance suite and its CI wiring. Run it by hand against
 * the flag-on test build:
 *
 *   npm run build:privacy-test
 *   NP_AXE_CORE=<scratch>/axe-core/axe.min.js \
 *     npx playwright test -c tests/privacy-ui/playwright.config.ts
 *
 * `NP_AXE_CORE` points at axe-core's `axe.min.js`, fetched into a scratch
 * directory outside the repository (`npm pack axe-core`); it is not a repo
 * dependency, and without it the axe cases are skipped and say so.
 * `NP_PRIVACY_SCREENSHOTS=1` also writes the reference screenshots into
 * screenshots/privacy/. The spec launches its own Chromium behind the local
 * egress proxy in tests/privacy-runtime/egress.ts, so there is no webServer.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 90_000,
});
