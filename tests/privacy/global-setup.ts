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
          ? gtag.source === 'cache'
            ? 'served (its configuration is the recorded production one, but the copy was reused from the cache without a fetch: the provenance test skips as not checked against production)'
            : 'served (fetched from production this run; its embedded configuration matches the recorded fingerprint)'
          : 'served, but its embedded configuration does not match the production fingerprint recorded in tests/privacy/manifest.json (or has findings, or could not be read): take it to Nathan before recording anything (docs/agents/testing-requirements.md, GA4 tag refresh); GA4 transmitted-payload results are indicative and NOT VERIFIED against the production configuration'
        : `unavailable (${gtag.reason ?? 'unknown'}); GA4 transmitted-payload criteria are not verified`
    }`,
  );
  if (gtag.available)
    console.log(
      `[privacy] gtag.js bytes this run (${gtag.source ?? 'unknown'}): SHA-256 ${gtag.rawSha256 ?? 'unknown'}, ${gtag.rawBytes ?? 'unknown'} bytes; configuration fingerprint ${gtag.configSha256 ?? 'unreadable'}`,
    );
}
