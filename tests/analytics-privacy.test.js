// @vitest-environment node
//
// #1079 analytics privacy controls — the feature flag and the production-build
// invariants (specs/analytics-privacy.md § Feature Flag, PRIV-15).
//
// #1233 committed the flag on, so the check that used to prove a flag-off
// build unchanged now proves the opposite about a production-mode build: the
// gate script, notice, controls, footer link, and /privacy/ route are present
// on every page; analytics load only through the gated path; and the test
// fixture page, its canaries, and the fake tokens exist nowhere in it. The
// build under test is made in mode `production` (the mode the deploy build
// runs in) with fixed fake tokens, so the analytics blocks render. A second
// group checks the real `dist/` that `npm test` just built, which carries
// whatever tokens the environment has.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  PRIVACY_CONTROLS_COMMITTED,
  PRIVACY_TEST_MODE,
  flagStateForMode,
  isPrivacyTestBuild,
  privacyControlsEnabled,
} from '../src/lib/privacy-flag.ts';
import { execFileSync } from 'node:child_process';
import {
  ANALYTICS_HOSTS,
  PRIVACY_TEST_TOKENS,
  PRODUCTION_CHECK_ENV,
  RUNTIME_MARKERS,
  analyticsGateFindings,
  analyticsRegion,
  buildProductionCheck,
  findInFiles,
  findRuntimeMarkers,
  readTextFiles,
} from '../scripts/lib/analytics-region.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const flagSrc = readFileSync(join(ROOT, 'src/lib/privacy-flag.ts'), 'utf8');
const fixturePageSrc = readFileSync(
  join(ROOT, 'src/pages/test-fixtures/privacy/[...index].astro'),
  'utf8',
);
const baseLayoutSrc = readFileSync(join(ROOT, 'src/layouts/BaseLayout.astro'), 'utf8');

// Strings that exist only on the test fixture page (spec § Test Fixture).
const FIXTURE_CANARY = 'NP-CANARY';

describe('privacy flag', () => {
  it('is committed on (#1233)', () => {
    expect(PRIVACY_CONTROLS_COMMITTED).toBe(true);
    expect(flagSrc).toMatch(/^export const PRIVACY_CONTROLS_COMMITTED = true;$/m);
  });

  it('enables the controls in every mode, and the fixture page in privacy-test only', () => {
    expect(PRIVACY_TEST_MODE).toBe('privacy-test');
    expect(flagStateForMode('privacy-test')).toEqual({ enabled: true, testBuild: true });
    for (const mode of ['production', 'development', 'test', '', 'privacy-test ', 'PRIVACY-TEST']) {
      expect(flagStateForMode(mode)).toEqual({ enabled: true, testBuild: false });
    }
  });

  it('exposes parameterless gates bound to the actual Astro mode', () => {
    // Vitest runs in mode `test`: the controls are on, the fixture page is not.
    expect(privacyControlsEnabled.length).toBe(0);
    expect(isPrivacyTestBuild.length).toBe(0);
    expect(privacyControlsEnabled()).toBe(true);
    expect(isPrivacyTestBuild()).toBe(false);
  });

  it('keeps the mode-taking decision table out of every component', () => {
    // git grep exits 1 on no match; that is the expected, passing outcome.
    const gitGrep = (...args) => {
      try {
        return execFileSync('git', ['grep', '--untracked', ...args, '--', 'src'], { cwd: ROOT })
          .toString()
          .trim()
          .split('\n');
      } catch (err) {
        if (err.status === 1) return [];
        throw err;
      }
    };
    expect(gitGrep('-l', 'flagStateForMode')).toEqual(['src/lib/privacy-flag.ts']);
    const withArgs = gitGrep('-nE', '(privacyControlsEnabled|isPrivacyTestBuild)\\([^)]').filter(
      (line) => !line.startsWith('src/lib/privacy-flag.ts:'),
    );
    expect(withArgs).toEqual([]);
  });

  it('reads only the Astro mode, so no env var, file, or query string can override it', () => {
    const envReads = flagSrc.match(/import\.meta\.env\.[A-Z_]+/g) ?? [];
    expect(new Set(envReads)).toEqual(new Set(['import.meta.env.MODE']));
    expect(flagSrc).not.toMatch(/process\.env|location|localStorage|readFile/);
  });

  it('builds the test fixture page only in the privacy-test mode, flag on or not', () => {
    expect(fixturePageSrc).toMatch(/isPrivacyTestBuild\(\)\s*\?/);
    expect(fixturePageSrc).not.toMatch(/privacyControlsEnabled/);
  });

  it('mounts every privacy component in BaseLayout behind the flag', () => {
    expect(baseLayoutSrc).toContain('{privacyEnabled && <PrivacyHead />}');
    expect(baseLayoutSrc).toContain('{privacyEnabled && <PrivacyBody />}');
    expect(baseLayoutSrc.indexOf('<PrivacyHead />')).toBeLessThan(
      baseLayoutSrc.indexOf('<!-- PostHog -->'),
    );
  });
});

/** Presence of the privacy surfaces in one production-mode build directory. */
function describeBuild(label, getDir, getFiles) {
  describe(label, () => {
    it('has the gate, notice, and footer link on every page', () => {
      const pages = getFiles().filter((f) => f.path.endsWith('.html'));
      expect(pages.length).toBeGreaterThan(10);
      const missing = [];
      for (const p of pages) {
        const regionStart = p.text.indexOf('<!-- PostHog -->');
        if (regionStart < 0) missing.push(`${p.path}: no analytics region`);
        const head = p.text.slice(0, Math.max(regionStart, 0));
        if (!head.includes('globalPrivacyControl'))
          missing.push(`${p.path}: no gate before region`);
        if (!p.text.includes('id="np-privacy-notice"')) missing.push(`${p.path}: no notice`);
        if (!p.text.includes('data-np-privacy-ui="notice"'))
          missing.push(`${p.path}: no notice hook`);
        if (!p.text.includes('data-np-privacy-ui="footer-link"')) {
          missing.push(`${p.path}: no footer link`);
        }
      }
      expect(missing).toEqual([]);
    });

    it('emits the /privacy/ route with the controls', () => {
      const dir = getDir();
      expect(existsSync(join(dir, 'privacy/index.html'))).toBe(true);
      const page = getFiles().find((f) => f.path === 'privacy/index.html').text;
      expect(page).toContain('id="np-privacy-controls"');
      expect(page).toContain('data-np-privacy-ui="controls"');
      expect(page).toContain('data-np-privacy-ui="status"');
      expect(page).toContain('data-np-privacy-action="deny"');
      expect(page).toContain('data-np-privacy-action="grant"');
    });

    it('emits no test fixture page, canary, or link to one', async () => {
      const dir = getDir();
      expect(existsSync(join(dir, 'test-fixtures'))).toBe(false);
      const linked = getFiles()
        .filter((f) => /href="\/test-fixtures\//.test(f.text))
        .map((f) => f.path);
      expect(linked).toEqual([]);
      expect(await findInFiles(dir, [FIXTURE_CANARY, 'test-fixtures/privacy'])).toEqual([]);
    });

    it('carries no privacy-test fake token', async () => {
      expect(await findInFiles(getDir(), PRIVACY_TEST_TOKENS)).toEqual([]);
    });

    it('carries the runtime markers in the inline gate of every page and in no other file', async () => {
      const dir = getDir();
      const hits = await findRuntimeMarkers(dir);
      const pages = getFiles()
        .filter((f) => f.path.endsWith('.html'))
        .map((f) => f.path);
      const expected = pages.flatMap((p) => RUNTIME_MARKERS.map((m) => `${p}: ${m}`));
      expect(hits.slice().sort()).toEqual(expected.slice().sort());
    });
  });
}

describe('production-mode build carries the privacy controls (PRIV-15 replacement)', () => {
  let outDir;
  let files;
  let ownBuild = false;

  // `npm test` builds dist-production-check/ before the main build and passes
  // it in NP_PRODUCTION_CHECK_DIST, so no build runs while other suites read
  // `.astro/`. Run on its own (vitest run tests/analytics-privacy.test.js),
  // the suite builds a fresh copy into a temp directory instead of trusting a
  // stale one.
  beforeAll(async () => {
    if (process.env.NP_PRODUCTION_CHECK_DIST) {
      outDir = resolve(ROOT, process.env.NP_PRODUCTION_CHECK_DIST);
    } else {
      outDir = await mkdtemp(join(tmpdir(), 'np-production-check-'));
      ownBuild = true;
      await buildProductionCheck(outDir, ROOT);
    }
    files = await readTextFiles(outDir);
  }, 600_000);

  afterAll(async () => {
    if (ownBuild) await rm(outDir, { recursive: true, force: true });
  });

  describeBuild(
    'surfaces',
    () => outDir,
    () => files,
  );

  it('loads PostHog and GA4 only through the gate on every page', () => {
    const pages = files.filter((f) => f.path.endsWith('.html'));
    expect(pages.length).toBeGreaterThan(10);
    const findings = pages.flatMap((p) =>
      analyticsGateFindings(p.text).map((finding) => `${p.path}: ${finding}`),
    );
    expect(findings).toEqual([]);
  });

  it('renders both analytics blocks with the fixed fake tokens, so the check is not vacuous', () => {
    const pages = files.filter((f) => f.path.endsWith('.html'));
    const missing = pages
      .filter((p) => {
        const region = analyticsRegion(p.text) ?? '';
        return !(
          region.includes(PRODUCTION_CHECK_ENV.PUBLIC_POSTHOG_PROJECT_TOKEN) &&
          region.includes(PRODUCTION_CHECK_ENV.PUBLIC_GA_MEASUREMENT_ID)
        );
      })
      .map((p) => p.path);
    expect(missing).toEqual([]);
  });

  describe('the page check fails when the gate is weakened (controls on a real page)', () => {
    let page;
    beforeAll(() => {
      page = files.find((f) => f.path === 'index.html').text;
    });

    const GA4_GUARD_LINE =
      "if (gate && gate.boot.effective === 'granted' && privacy.get().effective === 'granted') {";
    const PH_GUARD_LINE =
      "if (!pageIsLocal && gate && gate.boot.effective === 'granted' && privacy.get().effective === 'granted') {";

    it('passes the unmodified page', () => {
      expect(analyticsGateFindings(page)).toEqual([]);
      expect(page).toContain(GA4_GUARD_LINE);
      expect(page).toContain(PH_GUARD_LINE);
    });

    it('catches a missing gate script', () => {
      const gateStart = page.lastIndexOf('<script>', page.indexOf('<!-- PostHog -->'));
      const gateEnd = page.indexOf('</script>', gateStart) + '</script>'.length;
      const mutated = page.slice(0, gateStart) + page.slice(gateEnd);
      expect(analyticsGateFindings(mutated).length).toBeGreaterThan(0);
    });

    it('catches a static gtag loader', () => {
      const mutated = page.replace(
        '<!-- PostHog -->',
        '<!-- PostHog --><script async src="https://www.googletagmanager.com/gtag/js?id=G-X"></script>',
      );
      expect(analyticsGateFindings(mutated).length).toBeGreaterThan(0);
    });

    it('catches an unguarded GA4 block', () => {
      const mutated = page.replace(GA4_GUARD_LINE, 'if (true) {');
      expect(analyticsGateFindings(mutated)).toContain('GA4 block has no gate guard');
    });

    it('catches an unguarded PostHog block', () => {
      const mutated = page.replace(PH_GUARD_LINE, 'if (true) {');
      expect(analyticsGateFindings(mutated)).toContain('PostHog block has no gate guard');
    });

    it('catches a PostHog init moved ahead of its guard', () => {
      const guardAt = page.indexOf(PH_GUARD_LINE);
      const mutated = page.slice(0, guardAt) + 'posthog.init(token);\n' + page.slice(guardAt);
      expect(analyticsGateFindings(mutated).join('\n')).toContain(
        'PostHog block runs posthog.init( before its gate guard',
      );
    });

    it('catches an analytics host in markup', () => {
      const mutated = page.replace(
        '<!-- PostHog -->',
        '<link rel="preconnect" href="https://www.googletagmanager.com"><!-- PostHog -->',
      );
      expect(analyticsGateFindings(mutated)).toContain(
        'markup attribute names analytics host googletagmanager.com',
      );
    });

    it('catches a PostHog guard that closes right after it opens', () => {
      const mutated = page.replace(PH_GUARD_LINE, PH_GUARD_LINE + '}');
      const findings = analyticsGateFindings(mutated);
      expect(findings).toContain('PostHog block runs posthog.init( outside its gate guard');
      expect(findings).toContain('PostHog block runs !function(t,e){ outside its gate guard');
    });

    it('catches a GA4 guard that closes right after it opens', () => {
      const mutated = page.replace(GA4_GUARD_LINE, GA4_GUARD_LINE + '}');
      const findings = analyticsGateFindings(mutated);
      expect(findings).toContain("GA4 block runs gtag('config' outside its gate guard");
      expect(findings).toContain('GA4 block runs loader.src =  outside its gate guard');
    });

    it('catches an analytics script src after the analytics region', () => {
      const mutated = page.replace(
        '<!-- Google Fonts -->',
        '<!-- Google Fonts --><script async src="https://www.googletagmanager.com/gtag/js?id=G-X"></script>',
      );
      expect(analyticsGateFindings(mutated)).toContain(
        'markup attribute names analytics host googletagmanager.com',
      );
    });

    it('catches an analytics script src in <body>', () => {
      const mutated = page.replace(
        '</body>',
        '<script src="https://d.nathanpayne.com/static/array.js"></script></body>',
      );
      expect(analyticsGateFindings(mutated)).toContain(
        'markup attribute names analytics host d.nathanpayne.com',
      );
    });

    it('catches a DoubleClick pixel in <body>', () => {
      const mutated = page.replace(
        '</body>',
        '<img src="https://stats.doubleclick.net/pixel"></body>',
      );
      expect(analyticsGateFindings(mutated)).toContain(
        'markup attribute names analytics host doubleclick.net',
      );
    });

    it('catches an inline fetch to an analytics host in <body>', () => {
      const mutated = page.replace(
        '</body>',
        "<script>fetch('https://www.google-analytics.com/g/collect')</script></body>",
      );
      expect(analyticsGateFindings(mutated)).toContain(
        'inline script names analytics host google-analytics.com',
      );
    });

    it('catches an inline sendBeacon to an analytics host after the analytics region', () => {
      const mutated = page.replace(
        '<!-- Google Fonts -->',
        "<!-- Google Fonts --><script>navigator.sendBeacon('https://d.nathanpayne.com/e/')</script>",
      );
      expect(analyticsGateFindings(mutated)).toContain(
        'inline script names analytics host d.nathanpayne.com',
      );
    });

    it('exempts the Mux Data script only as its exact source', () => {
      const swipe = files.find((f) => f.path === 'projects/swipe-watch/index.html').text;
      expect(analyticsGateFindings(swipe)).toEqual([]);
      const mutated = swipe.replace(
        '</body>',
        "<script>/* #1264: Mux Data */ fetch('https://litix.io/x')</script></body>",
      );
      expect(analyticsGateFindings(mutated)).toContain(
        'inline script names analytics host litix.io',
      );
    });

    it('catches the pre-#1233 flag-off snippet', () => {
      const mutated = page.replace(
        PH_GUARD_LINE,
        'const posthogHost = location.hostname;\n' + PH_GUARD_LINE,
      );
      expect(analyticsGateFindings(mutated)).toContain(
        'PostHog block carries the ungated pre-#1233 snippet',
      );
    });
  });
});

describe('the markup host list', () => {
  it("covers every entry of the gate's own ANALYTICS_HOSTS", () => {
    const gateSrc = readFileSync(join(ROOT, 'src/lib/privacy/gate.js'), 'utf8');
    const literal = gateSrc.match(/var ANALYTICS_HOSTS = Object\.freeze\(\[([\s\S]*?)\]\)/);
    expect(literal, 'ANALYTICS_HOSTS literal not found in gate.js').not.toBeNull();
    const gateHosts = [...literal[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    // Control: the extraction found the list, not an empty match.
    expect(gateHosts.length).toBeGreaterThanOrEqual(7);
    expect(gateHosts).toContain('doubleclick.net');
    expect(ANALYTICS_HOSTS.filter((h) => !gateHosts.includes(h)).sort()).toEqual([]);
    expect(gateHosts.filter((h) => !ANALYTICS_HOSTS.includes(h)).sort()).toEqual([]);
  });
});

describe('the real dist/ build (whatever tokens the environment has)', () => {
  const dist = join(ROOT, 'dist');
  let files;

  beforeAll(async () => {
    // `npm test` runs `astro build` before vitest, as every suite that reads
    // dist/ assumes; a missing build is a failure, not a skip.
    if (!existsSync(dist)) throw new Error('dist/ is missing; run `astro build` first');
    files = await readTextFiles(dist);
  }, 60_000);

  describeBuild(
    'surfaces',
    () => dist,
    () => files,
  );

  it('carries none of the fixed fake tokens of the check builds', async () => {
    expect(
      await findInFiles(dist, [
        ...PRIVACY_TEST_TOKENS,
        PRODUCTION_CHECK_ENV.PUBLIC_POSTHOG_PROJECT_TOKEN,
        PRODUCTION_CHECK_ENV.PUBLIC_GA_MEASUREMENT_ID,
      ]),
    ).toEqual([]);
  });
});
