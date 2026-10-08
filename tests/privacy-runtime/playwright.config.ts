import { defineConfig } from '@playwright/test';

/**
 * #1228 privacy runtime browser check. Not part of `npm run test:e2e`, whose
 * config (`playwright.config.ts`) is untouched; #1230 owns the acceptance
 * suite and its CI wiring. Run it by hand against the flag-on test build:
 *
 *   npm run build:privacy-test
 *   NP_POSTHOG_JS_DIST=<posthog-js@1.438.3>/package/dist NP_GTAG_JS=<gtag.js> \
 *     npx playwright test -c tests/privacy-runtime/playwright.config.ts
 *
 * The vendor bundles are third-party code and are never committed; fetch them
 * into a scratch directory outside the repository (`npm pack posthog-js@1.438.3`,
 * and gtag.js for the fake ID G-PRIVACYTEST). The spec launches its own
 * Chromium behind a local egress proxy (see egress.ts), so there is no
 * webServer here.
 */
export default defineConfig({
  testDir: '.',
  testMatch: '*.pw.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 120_000,
});
