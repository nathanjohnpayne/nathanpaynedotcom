// #1079 production-build invariant helpers, shared by
// scripts/build-production-check.mjs and tests/analytics-privacy.test.js
// (specs/analytics-privacy.md § Feature Flag).
//
// The "analytics region" is the run of <head> that BaseLayout emits for the
// analytics tools: from the `<!-- PostHog -->` comment up to (not including)
// `<!-- Google Fonts -->`. The privacy gate (PrivacyHead) is emitted just
// before it. Through #1233 the region was compared byte for byte with the
// flag-off base commit; with the flag on it is checked structurally instead.

import { spawn } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

export const REGION_START = '<!-- PostHog -->';
export const REGION_END = '<!-- Google Fonts -->';

/**
 * Fixed fake tokens for the production-mode check build. They are not the
 * privacy-test build's tokens (package.json `build:privacy-test`), so a file
 * that carries one of either set can be traced to the build that produced it.
 */
export const PRODUCTION_CHECK_ENV = {
  PUBLIC_POSTHOG_PROJECT_TOKEN: 'phc_prod_check_fixture',
  PUBLIC_GA_MEASUREMENT_ID: 'G-PRODCHECK0',
  PUBLIC_LOGODEV_KEY: '',
};

/** The privacy-test build's fake tokens; no production-mode output may carry them. */
export const PRIVACY_TEST_TOKENS = ['phc_privacy_test_fake', 'G-PRIVACYTEST'];

/** Strings every privacy gate, runtime, and UI implementation carries. */
export const RUNTIME_MARKERS = ['npPrivacy', 'np:privacy-change', 'data-np-privacy', 'np-privacy'];

/** Returns the analytics region of one HTML document, or null if absent. */
export function analyticsRegion(html) {
  const start = html.indexOf(REGION_START);
  if (start < 0) return null;
  const end = html.indexOf(REGION_END, start);
  if (end < 0) return null;
  return html.slice(start, end);
}

export async function listFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full)));
    else out.push(full);
  }
  return out;
}

/** Text files in a build, keyed by path relative to the build root. */
export async function readTextFiles(
  dir,
  exts = ['.html', '.js', '.mjs', '.css', '.json', '.xml', '.txt'],
) {
  const files = (await listFiles(dir)).filter((f) => exts.some((e) => f.endsWith(e)));
  return Promise.all(
    files.map(async (f) => ({ path: relative(dir, f), text: await readFile(f, 'utf8') })),
  );
}

/**
 * Every occurrence of any needle in any emitted file, whatever its type: each
 * file is scanned as bytes, so an SVG, a source map, or a file with an
 * unexpected extension cannot hide one. Returns `path: needle` strings.
 */
export async function findInFiles(dir, needles) {
  const pairs = needles.map((m) => [m, Buffer.from(m, 'utf8')]);
  const hits = [];
  for (const f of await listFiles(dir)) {
    const bytes = await readFile(f);
    for (const [needle, buf] of pairs) {
      if (bytes.includes(buf)) hits.push(`${relative(dir, f)}: ${needle}`);
    }
  }
  return hits;
}

/** Every runtime marker found in any emitted file, as `path: marker` strings. */
export function findRuntimeMarkers(dir) {
  return findInFiles(dir, RUNTIME_MARKERS);
}

/** Hosts the analytics tools and Mux Data send to; no markup may name one. */
export const ANALYTICS_HOSTS = [
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'posthog.com',
  'd.nathanpayne.com',
  'litix.io',
];

// The two guards the flag-on blocks open with (src/components/posthog.astro and
// the flag-on GA4 block in src/layouts/BaseLayout.astro). Everything that
// loads a tool must come after one of these.
const POSTHOG_GUARD =
  /^\s*if \(!pageIsLocal && gate && gate\.boot\.effective === 'granted' && privacy\.get\(\)\.effective === 'granted'\) \{/m;
const GA4_GUARD =
  /^\s*if \(gate && gate\.boot\.effective === 'granted' && privacy\.get\(\)\.effective === 'granted'\) \{/m;

// Case-insensitive, and the end tag may carry anything up to its `>` (as
// browsers accept `</script foo>`), so no spelling of a script tag can slip
// past the structure check.
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\b[^>]*>/gi;
const URL_ATTR_RE =
  /\s(?:src|href|srcset|data|action|formaction|poster|ping|content)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const SCRIPT_ATTR_RE = /\b(src|async|defer|type)\s*=/;

function scripts(html) {
  return [...html.matchAll(SCRIPT_RE)].map((m) => ({
    attrs: m[1],
    body: m[2],
    index: m.index,
  }));
}

/**
 * Structural findings for the analytics region of one production-mode page
 * built with both tokens set (specs/analytics-privacy.md § Gate). Returns an
 * array of strings; an empty array means the page passes.
 *
 *  - the gate is a synchronous inline script in <head>, before the region
 *  - the region has exactly two inline scripts (PostHog, GA4) and no static
 *    script element, so nothing loads a tool without running through a guard
 *  - in each, every statement that loads, defines, or configures the tool sits
 *    after the guard that requires the gate's boot decision and the current
 *    state to be granted
 *  - outside script bodies, nothing in the page names an analytics host
 */
export function analyticsGateFindings(html) {
  const findings = [];
  const region = analyticsRegion(html);
  if (region === null) return ['no analytics region'];
  const regionStart = html.indexOf(REGION_START);
  const headStart = html.indexOf('<head');
  const headEnd = html.indexOf('</head>');
  if (!(headStart >= 0 && regionStart > headStart && regionStart < headEnd)) {
    findings.push('analytics region is not inside <head>');
  }

  const gate = scripts(html.slice(0, regionStart)).at(-1);
  if (!gate) {
    findings.push('no script before the analytics region');
  } else {
    if (gate.index < headStart) findings.push('gate script is not in <head>');
    if (SCRIPT_ATTR_RE.test(gate.attrs)) {
      findings.push(`gate script is not a plain synchronous inline script: <script${gate.attrs}>`);
    }
    for (const needle of ['npPrivacy', 'np-privacy', 'globalPrivacyControl', 'localStorage']) {
      if (!gate.body.includes(needle)) findings.push(`gate script lacks ${needle}`);
    }
  }

  const inRegion = scripts(region);
  for (const s of inRegion) {
    if (SCRIPT_ATTR_RE.test(s.attrs)) {
      findings.push(`region script element is not plain inline: <script${s.attrs}>`);
    }
  }
  if (inRegion.length !== 2) {
    findings.push(`region has ${inRegion.length} scripts, expected 2 (PostHog, GA4)`);
  }
  const posthog = inRegion.find((s) => s.body.includes('posthog.init('));
  const ga4 = inRegion.find((s) => s.body.includes("gtag('config'"));
  if (!posthog) findings.push('no PostHog block in the region');
  if (!ga4) findings.push('no GA4 block in the region');

  const after = (name, body, guard, needles) => {
    const g = body.search(guard);
    if (g < 0) {
      findings.push(`${name} block has no gate guard`);
      return;
    }
    for (const needle of needles) {
      const at = body.indexOf(needle);
      if (at < 0) findings.push(`${name} block lacks ${needle}`);
      else if (at < g) findings.push(`${name} block runs ${needle} before its gate guard`);
    }
  };
  if (posthog) {
    after('PostHog', posthog.body, POSTHOG_GUARD, ['!function(t,e){', 'posthog.init(']);
    if (posthog.body.includes('const posthogHost')) {
      findings.push('PostHog block carries the ungated pre-#1233 snippet');
    }
  }
  if (ga4) {
    after('GA4', ga4.body, GA4_GUARD, [
      'window.dataLayer = ',
      "gtag('js'",
      "gtag('config'",
      'document.createElement(',
      'loader.src = ',
      'appendChild(loader)',
    ]);
    if (!ga4.body.includes('gtag/js?id=')) findings.push('GA4 block does not create the loader');
  }

  // Attribute values outside script bodies: a preconnect, prefetch, img, or
  // noscript pixel naming an analytics host would be a request the gate cannot
  // stop. Prose may name the hosts (the /privacy/ page discloses them).
  let markup = html.replace(SCRIPT_RE, '<script></script>');
  // Strip comments until nothing changes: one pass can leave a `<!--` that
  // a nested or split comment reassembles.
  for (let prev = ''; prev !== markup; ) {
    prev = markup;
    markup = markup.replace(/<!--[\s\S]*?-->/g, '');
  }
  for (const m of markup.matchAll(URL_ATTR_RE)) {
    const value = m[1] ?? m[2];
    for (const host of ANALYTICS_HOSTS) {
      if (value.includes(host)) findings.push(`markup attribute names analytics host ${host}`);
    }
  }
  return findings;
}

/** Runs `astro build` in production mode with the fixed fake tokens. */
export function buildProductionCheck(outDir, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        join(cwd, 'node_modules/astro/bin/astro.mjs'),
        'build',
        '--mode',
        'production',
        '--outDir',
        outDir,
      ],
      { cwd, env: { ...process.env, ...PRODUCTION_CHECK_ENV }, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let log = '';
    child.stdout.on('data', (d) => (log += d));
    child.stderr.on('data', (d) => (log += d));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve(log)
        : reject(new Error(`production-mode check build exited ${code}\n${log.slice(-4000)}`)),
    );
  });
}
