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
import { readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

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
  // Where GA4 sends Google signals hits. tests/analytics-privacy.test.js reads
  // ANALYTICS_HOSTS out of src/lib/privacy/gate.js and requires every entry
  // here, so the two lists cannot drift.
  'doubleclick.net',
];

// The two guards the flag-on blocks open with (src/components/posthog.astro and
// the flag-on GA4 block in src/layouts/BaseLayout.astro). Everything that
// loads a tool must come after one of these.
const POSTHOG_GUARD =
  /^\s*if \(!pageIsLocal && gate && gate\.boot\.effective === 'granted' && privacy\.get\(\)\.effective === 'granted'\) \{/m;
const GA4_GUARD =
  /^\s*if \(gate && gate\.boot\.effective === 'granted' && privacy\.get\(\)\.effective === 'granted'\) \{/m;

// The one inline script outside the gate and the two region blocks that names
// an analytics host: Mux Data's wrapper (src/lib/privacy/mux-data.js), which
// ProjectMuxPlayer.astro inlines verbatim on a page with a Mux hero and which
// names litix.io, where Mux sends beacons, so that the gate's transport guard
// and its own denial path cover them. It is exempt only as that exact source
// text, never because its body merely contains a host.
const MUX_DATA_SOURCE = readFileSync(
  fileURLToPath(new URL('../../src/lib/privacy/mux-data.js', import.meta.url)),
  'utf8',
).trim();

/**
 * Index of the `}` that closes the `{` at `open` in inline JavaScript, or -1.
 * Brace matching only, for the known inline blocks: it skips line and block
 * comments and string and template literals (braces inside them do not count),
 * and does not parse regular expression literals, so a block whose regex
 * contains an unbalanced brace or quote yields -1, which the caller reports
 * as a finding rather than passing.
 */
function matchingBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    const n = src[i + 1];
    if (c === '/' && n === '/') {
      i = src.indexOf('\n', i);
      if (i < 0) return -1;
    } else if (c === '/' && n === '*') {
      i = src.indexOf('*/', i + 2);
      if (i < 0) return -1;
      i++;
    } else if (c === '"' || c === "'" || c === '`') {
      for (i++; i < src.length && src[i] !== c; i++) if (src[i] === '\\') i++;
      if (i >= src.length) return -1;
    } else if (c === '{') {
      depth++;
    } else if (c === '}' && --depth === 0) {
      return i;
    }
  }
  return -1;
}

/** Every element under `root`, descending into `<template>` contents. */
function* allElements(root) {
  for (const el of root.querySelectorAll('*')) {
    yield el;
    if (el.localName === 'template' && el.content) yield* allElements(el.content);
  }
}

/** CSS escapes (`\2d `, `\-`) decoded, so an escaped host still reads as one. */
function cssUnescape(text) {
  return text
    .replace(/\\([0-9a-f]{1,6})\s?/gi, (_, hex) => {
      const code = parseInt(hex, 16);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    })
    .replace(/\\(.)/gs, '$1');
}

/** A value as the hosts could be spelled in it: lowercased, percent- and CSS-decoded. */
function spellings(value) {
  const out = new Set([value.toLowerCase(), cssUnescape(value).toLowerCase()]);
  try {
    out.add(decodeURIComponent(value).toLowerCase());
  } catch {
    // Not valid percent-encoding: the raw spellings above are all there is.
  }
  return [...out];
}

function namedHosts(value) {
  const forms = spellings(value);
  return ANALYTICS_HOSTS.filter((host) => forms.some((form) => form.includes(host)));
}

const REGION_START_TEXT = REGION_START.slice(4, -3);
const REGION_END_TEXT = REGION_END.slice(4, -3);

/**
 * Structural findings for one production-mode page built with both tokens set
 * (specs/analytics-privacy.md § Gate). Returns an array of strings; an empty
 * array means the page passes. The page is parsed with jsdom (scripts are not
 * run, which is jsdom's default), so entities, attribute quoting and case,
 * `<noscript>`, and `<template>` are the parser's problem, not a pattern's.
 *
 *  - the gate is a synchronous inline script in <head>, before the region
 *  - the region has exactly two inline scripts (PostHog, GA4) and no static
 *    script element, so nothing loads a tool without running through a guard
 *  - in each, every statement that loads, defines, or configures the tool sits
 *    inside the block opened by the guard that requires the gate's boot
 *    decision and the current state to be granted
 *  - no inline script other than the exempt ones names an analytics host
 *  - no attribute (entity-decoded, whatever its name) and no CSS names one,
 *    except `href` on `<a>` and `<area>`
 */
export function analyticsGateFindings(html) {
  const findings = [];
  if (analyticsRegion(html) === null) return ['no analytics region'];

  const dom = new JSDOM(html);
  try {
    const { document } = dom.window;
    const { head } = document;
    const comments = [];
    const walker = document.createTreeWalker(document, 128 /* NodeFilter.SHOW_COMMENT */);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) comments.push(n);
    const start = comments.find((n) => n.data === REGION_START_TEXT);
    const end = comments.find(
      (n) =>
        n.data === REGION_END_TEXT &&
        start &&
        start.compareDocumentPosition(n) & 4 /* FOLLOWING */,
    );
    if (!start || !end || start.parentNode !== head || end.parentNode !== head) {
      findings.push('analytics region is not inside <head>');
      return findings;
    }

    const docScripts = [...document.querySelectorAll('script')];
    const precedes = (a, b) => Boolean(b.compareDocumentPosition(a) & 2 /* PRECEDING */);
    const plain = (s) => !['src', 'async', 'defer', 'type'].some((a) => s.hasAttribute(a));

    const gate = docScripts.filter((s) => precedes(s, start)).at(-1);
    if (!gate) {
      findings.push('no script before the analytics region');
    } else {
      if (gate.parentNode !== head) findings.push('gate script is not in <head>');
      if (!plain(gate)) {
        findings.push(
          `gate script is not a plain synchronous inline script: ${gate.outerHTML.slice(0, 80)}`,
        );
      }
      for (const needle of ['npPrivacy', 'np-privacy', 'globalPrivacyControl', 'localStorage']) {
        if (!gate.textContent.includes(needle)) findings.push(`gate script lacks ${needle}`);
      }
    }

    const inRegion = docScripts.filter((s) => precedes(start, s) && precedes(s, end));
    for (const s of inRegion) {
      if (!plain(s)) {
        findings.push(`region script element is not plain inline: ${s.outerHTML.slice(0, 80)}`);
      }
    }
    if (inRegion.length !== 2) {
      findings.push(`region has ${inRegion.length} scripts, expected 2 (PostHog, GA4)`);
    }
    const posthog = inRegion.find((s) => s.textContent.includes('posthog.init('));
    const ga4 = inRegion.find((s) => s.textContent.includes("gtag('config'"));
    if (!posthog) findings.push('no PostHog block in the region');
    if (!ga4) findings.push('no GA4 block in the region');

    // Every statement that loads a tool must sit inside the block the guard
    // opens, not merely after the guard's text: `if (...) {}` followed by the
    // bootstrap passes an offset comparison and gates nothing.
    const after = (name, body, guard, needles) => {
      const match = guard.exec(body);
      if (!match) {
        findings.push(`${name} block has no gate guard`);
        return;
      }
      const open = match.index + match[0].length - 1;
      const close = matchingBrace(body, open);
      if (close < 0) {
        findings.push(`${name} block: could not find the end of the gate guard's block`);
        return;
      }
      for (const needle of needles) {
        const first = body.indexOf(needle);
        if (first < 0) {
          findings.push(`${name} block lacks ${needle}`);
          continue;
        }
        const last = body.lastIndexOf(needle);
        if (first < open) findings.push(`${name} block runs ${needle} before its gate guard`);
        else if (last > close) findings.push(`${name} block runs ${needle} outside its gate guard`);
      }
    };
    if (posthog) {
      const body = posthog.textContent;
      after('PostHog', body, POSTHOG_GUARD, ['!function(t,e){', 'posthog.init(']);
      if (body.includes('const posthogHost')) {
        findings.push('PostHog block carries the ungated pre-#1233 snippet');
      }
    }
    if (ga4) {
      const body = ga4.textContent;
      after('GA4', body, GA4_GUARD, [
        'window.dataLayer = ',
        "gtag('js'",
        "gtag('config'",
        'document.createElement(',
        'loader.src = ',
        'appendChild(loader)',
      ]);
      if (!body.includes('gtag/js?id=')) findings.push('GA4 block does not create the loader');
    }

    const elements = [...allElements(document)];

    // Inline script bodies outside the ones that legitimately name an
    // analytics host: a stray fetch() or sendBeacon() to one would be a request
    // the gate does not guard. The explicit exemptions, by identity and not by
    // content:
    //  - the gate script, found above as the script just before the region (its
    //    ANALYTICS_HOSTS list drives the transport guard);
    //  - the two region scripts, PostHog's and GA4's, whose guards are verified
    //    above;
    //  - Mux Data's wrapper, exactly as MUX_DATA_SOURCE (see there).
    // JSON-LD and every other script type are scanned like any other: none of
    // them names a host today, so they need no exemption.
    const exempt = new Set(inRegion);
    if (gate) exempt.add(gate);
    for (const el of elements) {
      if (el.localName !== 'script') continue;
      if (exempt.has(el) || el.textContent.trim() === MUX_DATA_SOURCE) continue;
      for (const host of namedHosts(el.textContent)) {
        findings.push(`inline script names analytics host ${host}`);
      }
    }

    // CSS: any mention of a host in a stylesheet (`url(...)`, `@import`, or
    // anything else) is a request the gate cannot stop. `style` attributes are
    // covered by the attribute scan below.
    for (const el of elements) {
      if (el.localName !== 'style') continue;
      for (const host of namedHosts(el.textContent)) {
        findings.push(`stylesheet names analytics host ${host}`);
      }
    }

    // Attributes: every attribute of every element, whatever its name (`src`,
    // `srcset`, `data`, `poster`, `xlink:href`, `content`, `style`, `on*`
    // handlers, `srcdoc`), decoded by the parser. The one exemption is `href`
    // on `<a>` and `<area>`: following a link is navigation the visitor starts,
    // not a request the page makes. A `<link href>` (preconnect, prefetch,
    // stylesheet) is NOT exempt. Prose may name the hosts: the /privacy/ page
    // discloses them in text.
    for (const el of elements) {
      for (const attr of el.attributes) {
        if (attr.name === 'href' && (el.localName === 'a' || el.localName === 'area')) continue;
        for (const host of namedHosts(attr.value)) {
          findings.push(`markup attribute names analytics host ${host}`);
        }
      }
    }
    return findings;
  } finally {
    dom.window.close();
  }
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
