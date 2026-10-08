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
 * no env var, file, or query string — can turn the flag on.
 */
export const PRIVACY_TEST_MODE = 'privacy-test';

export function isPrivacyTestBuild(mode: string = import.meta.env.MODE): boolean {
  return mode === PRIVACY_TEST_MODE;
}

export function privacyControlsEnabled(mode: string = import.meta.env.MODE): boolean {
  return PRIVACY_CONTROLS_COMMITTED || isPrivacyTestBuild(mode);
}
