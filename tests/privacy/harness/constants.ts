/**
 * Constants shared by the #1079 privacy acceptance harness (#1230).
 * Contract: specs/analytics-privacy.md § Test Fixture.
 */
import { resolve } from 'node:path';

/** Repository root (this file is tests/privacy/harness/constants.ts). */
export const REPO_ROOT = resolve(import.meta.dirname, '../../..');

/**
 * Where fetched third-party bundles live. Under node_modules so that it is gitignored and so that ESLint and
 * Prettier, which never descend into node_modules, do not lint or reformat vendor code.
 */
export const CACHE_DIR = resolve(REPO_ROOT, 'node_modules/.cache/np-privacy-acceptance');

/**
 * The privacy-test build (`npm run build:privacy-test`). Override with
 * NP_PRIVACY_DIST to point the suite at another build of the same site.
 */
export const DIST_DIR = resolve(REPO_ROOT, process.env.NP_PRIVACY_DIST ?? 'dist-privacy-test');

/**
 * A non-local hostname for the site under test. PostHog skips local hosts, so
 * the site is served from this name, which only the harness proxy resolves.
 */
export const TEST_HOST = 'nathanpayne.test';
export const SITE_ORIGIN = `https://${TEST_HOST}`;
/**
 * A second, non-analytics origin the harness serves, standing in for any ordinary cross-origin dependency
 * (a CDN, an API). It exists so a test can show that a withdrawal's transport guard refuses only analytics
 * hosts, not every cross-origin request.
 */
export const ASSET_HOST = 'assets.nathanpayne.test';
/**
 * A `*.localhost` alias for the same build, to show that the local-host skip
 * (contract, Gate item 4) still holds. PostHog treats any `*.localhost` name as local.
 */
export const LOCAL_HOST_ALIAS = 'np-local-check.localhost';

/** Fixed fake identifiers baked in by `npm run build:privacy-test`. */
export const FAKE_POSTHOG_TOKEN = 'phc_privacy_test_fake';
export const FAKE_GA_ID = 'G-PRIVACYTEST';

/** The production PostHog first-party proxy host (inventory, PostHog, Initialization). */
export const POSTHOG_PROXY_HOST = 'd.nathanpayne.com';
export const GTAG_HOST = 'www.googletagmanager.com';

/** Hosts whose requests are recorded by the local sink and never forwarded. */
export const SINK_HOST_PATTERNS: readonly RegExp[] = [
  /^d\.nathanpayne\.com$/,
  /(^|\.)posthog\.com$/,
  /(^|\.)google-analytics\.com$/,
  /(^|\.)analytics\.google\.com$/,
  /(^|\.)doubleclick\.net$/,
  /(^|\.)googleadservices\.com$/,
  /^www\.googletagmanager\.com$/,
];

export const CANARIES = {
  input: 'NP-CANARY-INPUT',
  form: 'NP-CANARY-FORM',
  maskedText: 'NP-CANARY-MASKED-TEXT',
  blockedText: 'NP-CANARY-BLOCKED-TEXT',
  attr: 'NP-CANARY-ATTR',
  query: 'NP-CANARY-QUERY',
  fragment: 'NP-CANARY-FRAGMENT',
  search: 'NP-CANARY-SEARCH',
} as const;

/** Fake contact values the suite types into the fixture's contact form. */
export const CONTACT = {
  email: 'np-canary@example.test',
  phone: '+1 555 010 0199',
  phoneE164: '+15550100199',
  address: '1 Canary Way',
} as const;

export const FIXTURE_PATH = '/test-fixtures/privacy/';
/** The replay-excluded path set (contract, Capture Minimization item 2). */
export const EXCLUDED_PATH = '/privacy/';

/**
 * An ordinary desktop Chrome identity. PostHog drops events from visitors that
 * look like bots (it reads `navigator.userAgentData.brands` and
 * `navigator.webdriver`), and headless Chromium reports `HeadlessChrome` in
 * both, so without this the SDK sends nothing and every opt-out assertion would
 * be vacuous. docs/privacy/capture-2026-10-08.md § Method records the same
 * accommodation.
 */
export const CHROME_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36';
