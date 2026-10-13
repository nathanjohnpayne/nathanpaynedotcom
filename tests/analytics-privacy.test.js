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
  bundleFindings,
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

  it('names no analytics host in any emitted bundle but the Mux Data chunk (#1320)', () => {
    const bundles = files.filter((f) => /\.m?js$/.test(f.path));
    expect(bundles.length).toBeGreaterThan(0);
    // Not vacuous: the Mux Data chunk (found by mux-embed's beacon key) is in
    // the build and does name its host.
    const mux = bundles.find((f) => f.text.includes('mux_embed_version'));
    expect(mux, 'the mux-embed chunk').toBeTruthy();
    expect(mux.text).toContain('litix.io');
    expect(bundleFindings(files)).toEqual([]);
  });

  describe('the bundle check fails on an ungated request in emitted JavaScript (#1320)', () => {
    let muxChunk;
    beforeAll(() => {
      muxChunk = files.find((f) => /\.m?js$/.test(f.path) && f.text.includes('mux_embed_version'));
    });

    it('catches a host in an ordinary bundle, plain or escaped', () => {
      for (const text of [
        "fetch('https://www.google-analytics.com/g/collect')",
        String.raw`fetch('https://www.google\x2danalytics.com/g/collect')`,
        "export const u = 'https://d.nathanpayne.' + 'com/e';",
      ]) {
        expect(bundleFindings([{ path: '_astro/app.js', text }]), text).toHaveLength(1);
      }
    });

    it('allows litix.io only in the mux-embed chunk', () => {
      expect(bundleFindings([muxChunk])).toEqual([]);
      expect(
        bundleFindings([
          { path: '_astro/other.js', text: "navigator.sendBeacon('https://img.litix.io/')" },
        ]),
      ).toEqual(['_astro/other.js: bundle names analytics host litix.io']);
    });

    it('pins the allowance to the installed mux-embed version', () => {
      const version = JSON.parse(
        readFileSync(join(ROOT, 'node_modules/mux-embed/package.json'), 'utf8'),
      ).version;
      expect(muxChunk.text).toContain(version);
      const other = { ...muxChunk, text: muxChunk.text.split(version).join('0.0.0-not-installed') };
      expect(bundleFindings([other])).toEqual([
        `${muxChunk.path}: bundle names analytics host litix.io`,
      ]);
    });

    it("allows litix.io in the mux-embed chunk only as mux-embed's own strings", () => {
      for (const extra of [
        "fetch('https://img.litix.io/x');",
        // Not a string at all: a regular expression's source.
        'fetch(/https:\\/\\/img.litix.io\\/x/.source);',
        // The same string the package ships, one more time than it does.
        "fetch('https://img.litix.io');",
      ]) {
        const tampered = { ...muxChunk, text: `${muxChunk.text}\n${extra}` };
        expect(
          bundleFindings([tampered]).some((f) => f.includes("mux-embed's own code")),
          extra,
        ).toBe(true);
      }
    });

    it('allows no other host in the mux-embed chunk', () => {
      const tampered = {
        ...muxChunk,
        text: `${muxChunk.text}\nfetch('https://us.i.posthog.com/e');`,
      };
      expect(bundleFindings([tampered])).toEqual([
        `${muxChunk.path}: bundle names analytics host posthog.com`,
      ]);
    });

    it('reports a bundle that compiles code at run time', () => {
      expect(bundleFindings([{ path: '_astro/x.js', text: "(0, eval)('1')" }])[0]).toMatch(
        /^_astro\/x\.js compiles code at run time \(eval\)/,
      );
    });

    it('reports a bundle it cannot parse, and ignores files that are not JavaScript', () => {
      expect(bundleFindings([{ path: '_astro/broken.js', text: 'fetch((' }])[0]).toMatch(
        /^_astro\/broken\.js could not be parsed/,
      );
      expect(
        bundleFindings([{ path: 'privacy/index.html', text: 'https://posthog.com/privacy' }]),
      ).toEqual([]);
    });
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
      // `}{` keeps the script valid: an empty guard, then a bare unguarded block.
      const mutated = page.replace(PH_GUARD_LINE, PH_GUARD_LINE + '}{');
      const findings = analyticsGateFindings(mutated);
      expect(findings).toContain('PostHog block runs posthog.init( outside its gate guard');
      expect(findings).toContain('PostHog block runs !function(t,e){ outside its gate guard');
    });

    it('catches a GA4 guard that closes right after it opens', () => {
      const mutated = page.replace(GA4_GUARD_LINE, GA4_GUARD_LINE + '}{');
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

    it('catches a host spelled through composed CSS and URL decoding', () => {
      for (const tag of [
        // CSS turns \\2d plus space into "-", then URL parsing turns %2e into ".".
        '<div style="background:url(https://www.google\\2d analytics%2ecom/g/collect)"></div>',
        // The same host with the stages the other way round.
        '<img src="https://www.google%5c2d analytics.com/g/collect">',
      ]) {
        const mutated = page.replace('</body>', `${tag}</body>`);
        expect(analyticsGateFindings(mutated), tag).toContain(
          'markup attribute names analytics host google-analytics.com',
        );
      }
    });

    it('catches analytics URLs in every attribute form HTML accepts', () => {
      for (const tag of [
        '<img src=https://stats.doubleclick.net/pixel>',
        '<IMG SRC="https://stats.doubleclick.net/pixel">',
        '<img/src="https://stats.doubleclick.net/pixel">',
        "<link REL=preconnect HREF='https://www.google-analytics.com'>",
      ]) {
        const mutated = page.replace('</body>', `${tag}</body>`);
        expect(
          analyticsGateFindings(mutated).some((f) =>
            f.startsWith('markup attribute names analytics host'),
          ),
          tag,
        ).toBe(true);
      }
    });

    describe('JavaScript read as the engine reads it (#1320)', () => {
      const inBody = (fragment) => page.replace('</body>', `${fragment}</body>`);
      const scriptFinding = (mutated, host) =>
        analyticsGateFindings(mutated).includes(`inline script names analytics host ${host}`);

      it('catches a host spelled with JavaScript string escapes', () => {
        for (const literal of [
          String.raw`'https://www.google\x2danalytics.com/g/collect'`,
          String.raw`'https://www.google\u002danalytics.com/g/collect'`,
          String.raw`'https://www.google\u{2d}analytics.com/g/collect'`,
          String.raw`"https://www.google\x2danalytics\x2ecom/g/collect"`,
        ]) {
          const mutated = inBody(`<script>fetch(${literal});</script>`);
          expect(scriptFinding(mutated, 'google-analytics.com'), literal).toBe(true);
        }
      });

      it('catches a host split across constant concatenation and templates', () => {
        for (const expr of [
          "'https://www.google-' + 'analytics.com/g/collect'",
          "'https://www.google' + '-' + 'analytics' + '.com/g/collect'",
          '`https://www.google-${"analytics"}.com/g/collect`',
          "`https://www.google${'\\x2d'}analytics.com/g/collect`",
        ]) {
          const mutated = inBody(`<script>navigator.sendBeacon(${expr});</script>`);
          expect(scriptFinding(mutated, 'google-analytics.com'), expr).toBe(true);
        }
      });

      it('catches an escaped host in a module script and in JSON-LD', () => {
        const mutated = inBody(
          String.raw`<script type="module">fetch('https://d\x2enathanpayne.com/e')</script>`,
        );
        expect(scriptFinding(mutated, 'd.nathanpayne.com')).toBe(true);
        const ld = inBody(
          String.raw`<script type="application/ld+json">{"url":"https://www.google\u002danalytics.com/"}</script>`,
        );
        expect(scriptFinding(ld, 'google-analytics.com')).toBe(true);
      });

      it('catches an escaped host in an event handler and in a javascript: link', () => {
        for (const fragment of [
          String.raw`<img src="x" onerror="fetch('https://www.google\x2danalytics.com/g')">`,
          String.raw`<a href="javascript:fetch('https://www.google\x2danalytics.com/g')">x</a>`,
        ]) {
          expect(analyticsGateFindings(inBody(fragment)), fragment).toContain(
            'markup attribute names analytics host google-analytics.com',
          );
        }
      });

      it('reports an inline script it cannot parse instead of passing it', () => {
        const mutated = inBody('<script>fetch((</script>');
        expect(
          analyticsGateFindings(mutated).some((f) =>
            f.startsWith('inline script could not be parsed'),
          ),
        ).toBe(true);
      });

      it('catches a request after the PostHog guard closes', () => {
        const at = page.indexOf('posthog.init(');
        const close = page.indexOf('})();', at);
        expect(close).toBeGreaterThan(at);
        for (const call of [
          "fetch('https://d.nathanpayne.com/e');",
          String.raw`fetch('https://d\x2enathanpayne.com/e');`,
        ]) {
          const mutated = page.slice(0, close) + call + page.slice(close);
          expect(analyticsGateFindings(mutated), call).toContain(
            'PostHog block names analytics host d.nathanpayne.com outside its gate guard',
          );
        }
      });

      it('catches a request before the GA4 guard opens', () => {
        const mutated = page.replace(
          GA4_GUARD_LINE,
          `navigator.sendBeacon('https://www.google' + '-analytics.com/g/collect');\n${GA4_GUARD_LINE}`,
        );
        expect(analyticsGateFindings(mutated)).toContain(
          'GA4 block names analytics host google-analytics.com outside its gate guard',
        );
      });

      it('reads every JavaScript MIME type as JavaScript', () => {
        for (const type of [
          'text/ecmascript',
          'application/x-javascript',
          'text/jscript',
          'text/javascript1.5',
          'Text/JavaScript; charset=utf-8',
        ]) {
          const mutated = inBody(
            String.raw`<script type="${type}">fetch('https://www.google\x2danalytics.com/g')</script>`,
          );
          expect(scriptFinding(mutated, 'google-analytics.com'), type).toBe(true);
        }
      });

      it('decodes the JSON the browser reads in importmap and speculationrules', () => {
        for (const fragment of [
          String.raw`<script type="importmap">{"imports":{"a":"https://d.nathanpayne\u002ecom/a.js"}}</script>`,
          String.raw`<script type="speculationrules">{"prefetch":[{"urls":["https://www.google\u002danalytics.com/"]}]}</script>`,
        ]) {
          expect(
            analyticsGateFindings(inBody(fragment)).some((f) =>
              f.startsWith('inline script names analytics host'),
            ),
            fragment,
          ).toBe(true);
        }
      });

      it('takes the guarded block from the parsed script, so a regex brace cannot widen it', () => {
        const close = page.indexOf('})();', page.indexOf('posthog.init('));
        const mutated =
          page.slice(0, close) +
          String.raw`fetch('https://d\x2enathanpayne.com/e'); /\}/;` +
          page.slice(close);
        const withOpen = mutated.replace(PH_GUARD_LINE, String.raw`${PH_GUARD_LINE} /\{/;`);
        expect(analyticsGateFindings(withOpen)).toContain(
          'PostHog block names analytics host d.nathanpayne.com outside its gate guard',
        );
      });

      it('reports a region script whose guard block no longer parses', () => {
        const mutated = page.replace(PH_GUARD_LINE, PH_GUARD_LINE + '}');
        expect(analyticsGateFindings(mutated)).toContain(
          "PostHog block: could not find the end of the gate guard's block",
        );
      });

      it('treats a javascript: URL as a finding in itself, its body percent-decoded', () => {
        for (const href of [
          'javascript:void(0)',
          "javascript:fetch('https://www.google%5Cx2danalytics.com/g')",
        ]) {
          expect(analyticsGateFindings(inBody(`<a href="${href}">x</a>`)), href).toContain(
            'markup attribute holds a javascript: URL',
          );
        }
        // Percent-decoded first, then parsed: the escaped host is found too.
        expect(
          analyticsGateFindings(
            inBody(`<a href="javascript:fetch('https://www.google%5Cx2danalytics.com/g')">x</a>`),
          ),
        ).toContain('markup attribute names analytics host google-analytics.com');
      });

      it('treats a javascript: URL in code as a finding in itself', () => {
        for (const code of [
          'location.href = "javascript:fetch(1)"',
          "document.querySelector('a').href = 'java\\tscript:void(0)'",
          'const u = `JavaScript:${1}`',
        ]) {
          expect(
            analyticsGateFindings(inBody(`<script>${code}</script>`)).some((f) =>
              f.includes('names a javascript: URL'),
            ),
            code,
          ).toBe(true);
        }
        expect(
          bundleFindings([{ path: '_astro/x.js', text: 'location.href = "javascript:1"' }])[0],
        ).toMatch(/names a javascript: URL/);
      });

      it('reads a javascript: link the way the URL parser does', () => {
        for (const href of [
          String.raw`java&#10;script:fetch('https://www.google\x2danalytics.com/g')`,
          String.raw`java&#9;script:fetch('https://www.google\x2danalytics.com/g')`,
          String.raw`&#1;javascript:fetch('https://www.google\x2danalytics.com/g')`,
          String.raw`JAVASCRIPT:fetch('https://www.google\x2danalytics.com/g')`,
        ]) {
          expect(analyticsGateFindings(inBody(`<a href="${href}">x</a>`)), href).toContain(
            'markup attribute names analytics host google-analytics.com',
          );
        }
      });

      it('checks a srcdoc document like the page, nested ones too', () => {
        for (const fragment of [
          `<iframe srcdoc="&lt;script>fetch('https://www.google\x2danalytics.com/g')&lt;/script>"></iframe>`,
          `<iframe srcdoc="&lt;img src=&quot;https://stats.doubleclick.net/p&quot;>"></iframe>`,
          `<iframe srcdoc="&lt;iframe srcdoc=&quot;&amp;lt;script>fetch('https://d\x2enathanpayne.com/e')&amp;lt;/script>&quot;>&lt;/iframe>"></iframe>`,
        ]) {
          expect(
            analyticsGateFindings(inBody(fragment)).some((f) => f.startsWith('srcdoc: ')),
            fragment,
          ).toBe(true);
        }
      });

      it('parses constant code handed to eval and its kin again', () => {
        // Each payload's host is escaped twice in the page's script (a backslash,
        // then x2d), so the outer string decodes only to an x2d escape and only
        // a second parse of the payload yields the host.
        for (const call of [
          `eval("fetch('https://www.google\\\\x2danalytics.com/g')")`,
          `new Function("return fetch('https://www.google\\\\x2danalytics.com/g')")`,
          `Function('a', "fetch('https://www.google\\\\x2danalytics.com/g')")`,
          `window.setTimeout("fetch('https://www.google\\\\x2danalytics.com/g')", 0)`,
          `window['eval']("fetch('https://www.google\\\\x2danalytics.com/g')")`,
          `globalThis['set' + 'Timeout']("fetch('https://www.google\\\\x2danalytics.com/g')")`,
          'eval(`eval("fetch(\'https://www.google\\\\x2danalytics.com/g\')")`)',
        ]) {
          expect(
            scriptFinding(inBody(`<script>${call}</script>`), 'google-analytics.com'),
            call,
          ).toBe(true);
        }
      });

      it('treats compiling code at run time as a finding in itself, whatever the payload', () => {
        for (const code of [
          "(0, eval)('1')",
          'eval(window.name)',
          "window['ev' + 'al']('1')",
          "new Function('return 1')",
          "Function('return 1')()",
          "setTimeout('1', 0)",
          "globalThis['setInterval']('1' + '', 10)",
          "const run = globalThis['eval']; run('1')",
          'const F = window.Function; new F("return 1")',
        ]) {
          expect(
            analyticsGateFindings(inBody(`<script>${code}</script>`)).some((f) =>
              f.includes('compiles code at run time'),
            ),
            code,
          ).toBe(true);
        }
        // A function passed to a timer is not compiled code.
        expect(analyticsGateFindings(inBody('<script>setTimeout(() => {}, 0)</script>'))).toEqual(
          [],
        );
      });

      it('treats an executable data: URL as a finding in itself', () => {
        for (const fragment of [
          '<iframe src="data:text/html,%3Cp%3Ehi%3C/p%3E"></iframe>',
          '<iframe src="DATA:Text/HTML;base64,PHA+aGk8L3A+"></iframe>',
          '<object data="data:image/svg+xml,%3Csvg/%3E"></object>',
          '<embed src="data:application/xhtml+xml,%3Chtml/%3E">',
          '<a href="data:text/html,%3Cp%3Ehi%3C/p%3E">x</a>',
          // Scripts: a JavaScript type, a legacy one, and any type at all on <script>.
          '<script src="data:text/javascript;base64,ZmV0Y2goIngiKQ=="></script>',
          '<script src="data:application/x-javascript,1"></script>',
          '<script src="data:text/plain,1"></script>',
          '<link rel="modulepreload" href="data:text/javascript,1">',
          "<script>import('data:text/javascript,export%20default%201')</script>",
          "<script>new Worker('data:application/javascript,1')</script>",
          '<script type="importmap">{"imports":{"x":"data:text/javascript;base64,ZmV0Y2goIngiKQ=="}}</script>',
        ]) {
          expect(
            analyticsGateFindings(inBody(fragment)).some((f) => f.includes('executable data: URL')),
            fragment,
          ).toBe(true);
        }
        // Images are images, not code or documents, even an SVG one.
        for (const fragment of [
          '<img src="data:image/svg+xml,%3Csvg/%3E" alt="">',
          '<img src="data:image/png;base64,iVBORw0KGgo=" alt="">',
        ]) {
          expect(analyticsGateFindings(inBody(fragment)), fragment).toEqual([]);
        }
      });

      it('still allows the hosts the guarded blocks name inside their guards', () => {
        expect(page).toContain('googletagmanager.com/gtag/js');
        expect(analyticsGateFindings(page)).toEqual([]);
      });
    });

    describe('parsed markup (jsdom), not patterns', () => {
      const inBody = (fragment) => page.replace('</body>', `${fragment}</body>`);
      const hasFinding = (mutated, prefix, host) =>
        analyticsGateFindings(mutated).includes(`${prefix} analytics host ${host}`);

      it('catches an entity-encoded host in an attribute', () => {
        const mutated = inBody('<img src="https://www.google&#45;analytics.com/g/collect">');
        expect(hasFinding(mutated, 'markup attribute names', 'google-analytics.com')).toBe(true);
      });

      it('catches a host in a style attribute', () => {
        const mutated = inBody(
          '<div style="background:url(https://www.google-analytics.com/g/collect)"></div>',
        );
        expect(hasFinding(mutated, 'markup attribute names', 'google-analytics.com')).toBe(true);
      });

      it('catches a CSS-escaped host in a style attribute', () => {
        const mutated = inBody(
          '<div style="background:url(https://www.google\\2d analytics.com/g/collect)"></div>',
        );
        expect(hasFinding(mutated, 'markup attribute names', 'google-analytics.com')).toBe(true);
      });

      it('catches an @import in a style element', () => {
        const mutated = inBody(
          '<style>@import url("https://www.googletagmanager.com/x.css");</style>',
        );
        expect(hasFinding(mutated, 'stylesheet names', 'googletagmanager.com')).toBe(true);
      });

      it('catches a namespaced xlink:href in SVG', () => {
        const mutated = inBody(
          '<svg xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="https://stats.doubleclick.net/p"/></svg>',
        );
        expect(hasFinding(mutated, 'markup attribute names', 'doubleclick.net')).toBe(true);
      });

      it('catches a host in an event-handler attribute', () => {
        const mutated = inBody(
          `<img src="x" onerror="fetch('https://www.google-analytics.com/g/collect')">`,
        );
        expect(hasFinding(mutated, 'markup attribute names', 'google-analytics.com')).toBe(true);
      });

      it('catches a host inside <noscript> and <template>', () => {
        for (const fragment of [
          '<noscript><img src="https://stats.doubleclick.net/p"></noscript>',
          '<template><img src="https://stats.doubleclick.net/p"></template>',
        ]) {
          expect(hasFinding(inBody(fragment), 'markup attribute names', 'doubleclick.net')).toBe(
            true,
          );
        }
      });

      it('exempts only href on <a> and <area>', () => {
        for (const fragment of [
          '<a href="https://posthog.com/privacy">x</a>',
          '<map name="m"><area href="https://posthog.com/privacy"></map>',
        ]) {
          expect(analyticsGateFindings(inBody(fragment))).toEqual([]);
        }
        for (const fragment of [
          '<a ping="https://posthog.com/p" href="/">x</a>',
          '<link rel="stylesheet" href="https://posthog.com/x.css">',
          '<a href="/" style="background:url(https://posthog.com/x)">x</a>',
        ]) {
          expect(
            hasFinding(inBody(fragment), 'markup attribute names', 'posthog.com'),
            fragment,
          ).toBe(true);
        }
      });
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

  it('names no analytics host in any emitted bundle but the Mux Data chunk (#1320)', () => {
    expect(files.some((f) => /\.m?js$/.test(f.path))).toBe(true);
    expect(bundleFindings(files)).toEqual([]);
  });
});
