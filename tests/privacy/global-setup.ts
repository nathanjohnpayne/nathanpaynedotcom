/**
 * Runs once before the privacy acceptance suite (#1230): verifies the build
 * under test exists, then fetches and verifies the third-party fixtures.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DIST_DIR } from './harness/constants';
import { prepareFixtures } from './harness/fixtures';

export default async function globalSetup(): Promise<void> {
  const fixturePage = join(DIST_DIR, 'test-fixtures', 'privacy', 'index.html');
  if (!existsSync(fixturePage)) {
    throw new Error(
      `${fixturePage} is missing. Build the flag-on test site first: npm run build:privacy-test (it writes dist-privacy-test/).`,
    );
  }
  const state = await prepareFixtures();
  const gtag = state.gtag;
  console.log(
    `[privacy] posthog-js bundles verified against the production hashes; gtag.js ${
      gtag.available
        ? gtag.matchesProduction
          ? 'served (matches a recorded production variant)'
          : 'served, but it matches no recorded production variant: GA4 transmitted-payload results are indicative and NOT VERIFIED against production bytes'
        : `unavailable (${gtag.reason ?? 'unknown'}); GA4 transmitted-payload criteria are not verified`
    }`,
  );
}
