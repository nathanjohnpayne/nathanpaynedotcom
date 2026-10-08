/**
 * Build-time flag for the #1079 analytics privacy controls.
 *
 * Contract: specs/analytics-privacy.md § Feature Flag. Everything the controls
 * add — the head gate, notice, footer link, `/privacy/` page, scrubbing and
 * replay minimization — renders only when `privacyControlsEnabled()` is true.
 * With it false, a production build is unchanged, which
 * tests/analytics-privacy.test.js enforces byte for byte.
 */

/** The committed value. Only #1233 may set this to true. */
export const PRIVACY_CONTROLS_COMMITTED = false;

/**
 * The Astro mode of the test-only override (`astro build --mode privacy-test`,
 * i.e. `npm run build:privacy-test`). Production builds run in mode
 * `production`, so they ignore the override by construction; nothing else —
 * no env var, file, query string, or caller-supplied value — can turn the
 * flag on.
 */
export const PRIVACY_TEST_MODE = 'privacy-test';

/**
 * Pure decision table for a given mode. Exported for unit tests only: no file
 * under src/ may call it (tests/analytics-privacy.test.js fails if one does),
 * because a caller passing its own mode could bypass the production-off
 * invariant. Components use the parameterless gates below.
 */
export function flagStateForMode(mode: string): { enabled: boolean; testBuild: boolean } {
  const testBuild = mode === PRIVACY_TEST_MODE;
  return { enabled: PRIVACY_CONTROLS_COMMITTED || testBuild, testBuild };
}

/** True when this build renders the privacy controls. */
export function privacyControlsEnabled(): boolean {
  return flagStateForMode(import.meta.env.MODE).enabled;
}

/** True only in the `privacy-test` build; gates the test fixture page. */
export function isPrivacyTestBuild(): boolean {
  return flagStateForMode(import.meta.env.MODE).testBuild;
}
