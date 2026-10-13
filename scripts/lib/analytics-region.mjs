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
import { parse as acornParse } from 'acorn';
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
 * The block an `if` statement at `at` guards, as [index of its `{`, index of
 * its `}`], or null. Read from the parsed script, so braces inside strings,
 * comments, templates, and regular expressions cannot move it.
 */
function guardedBlock(src, at) {
  let ast;
  try {
    ast = acornParse(src, { ecmaVersion: 'latest', sourceType: 'script' });
  } catch {
    return null;
  }
  let found = null;
  const visit = (node) => {
    if (found || !node || typeof node.type !== 'string') return;
    if (node.type === 'IfStatement' && node.start === at) {
      if (node.consequent.type === 'BlockStatement') {
        found = [node.consequent.start, node.consequent.end - 1];
      }
      return;
    }
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child.type === 'string') visit(child);
    }
  };
  visit(ast);
  return found;
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

/** Percent-decodes every valid `%XX` and leaves anything else as it is, so one bad escape cannot hide the rest. */
function percentDecode(value) {
  return value.replace(/%([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Every spelling a browser could arrive at. A browser applies its decoders in
 * stages (CSS unescaping, then URL percent-decoding), so the decoders are
 * composed, not just applied each to the raw value: every form found is fed
 * through every decoder again until no new form appears. The parser has
 * already decoded HTML entities.
 */
function spellings(value) {
  const decoders = [cssUnescape, percentDecode];
  const seen = new Set([value.toLowerCase()]);
  let frontier = [...seen];
  for (let round = 0; round < 8 && frontier.length; round++) {
    const next = [];
    for (const form of frontier) {
      for (const decode of decoders) {
        const decoded = decode(form).toLowerCase();
        if (!seen.has(decoded)) {
          seen.add(decoded);
          next.push(decoded);
        }
      }
    }
    frontier = next;
  }
  return [...seen];
}

function namedHosts(value) {
  const forms = spellings(value);
  return ANALYTICS_HOSTS.filter((host) => forms.some((form) => form.includes(host)));
}

/**
 * The value of a constant string expression, or null: a string or number
 * literal, a template literal whose every expression is itself constant, or a
 * `+` of two constants. That is how far the check evaluates: JavaScript's own
 * escapes (`\x2d`, `-`, `\u{2d}`, line continuations) arrive already
 * decoded in the parser's cooked values, and a host split across `+` or a
 * template is put back together. Anything computed at run time
 * (`String.fromCharCode`, `atob`, `[...].join`) is beyond a static check; the
 * browser suites, which refuse all egress, are the enforcement for those.
 */
function constantString(node) {
  if (!node) return null;
  if (node.type === 'Literal') {
    return typeof node.value === 'string' || typeof node.value === 'number'
      ? String(node.value)
      : null;
  }
  if (node.type === 'TemplateLiteral') {
    let out = '';
    for (let i = 0; i < node.quasis.length; i++) {
      const cooked = node.quasis[i].value.cooked;
      if (cooked == null) return null;
      out += cooked;
      if (i < node.expressions.length) {
        const part = constantString(node.expressions[i]);
        if (part == null) return null;
        out += part;
      }
    }
    return out;
  }
  if (node.type === 'BinaryExpression' && node.operator === '+') {
    const left = constantString(node.left);
    const right = left == null ? null : constantString(node.right);
    return left == null || right == null ? null : left + right;
  }
  return null;
}

/**
 * Every string a script's source spells as a constant (see constantString):
 * each string literal, each template quasi, and each constant expression whole.
 * `skip` is an optional half-open [start, end) source range whose nodes are
 * not read.
 * Returns `{ strings }`, or `{ error }` when the source parses as neither a
 * classic script nor a module, which the caller reports rather than passes.
 */
export function scriptStrings(source, { skip = null } = {}) {
  let ast = null;
  let lastError = null;
  for (const sourceType of ['script', 'module']) {
    try {
      ast = acornParse(source, {
        ecmaVersion: 'latest',
        sourceType,
        allowHashBang: true,
        allowReturnOutsideFunction: sourceType === 'script',
      });
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!ast) return { error: lastError?.message ?? 'unparseable' };
  const strings = [];
  const code = [];
  const dynamic = new Set();
  const inSkip = (node) => skip && node.start >= skip[0] && node.end <= skip[1];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string' || inSkip(node)) return;
    if (node.type === 'TemplateLiteral') {
      for (const q of node.quasis) if (q.value.cooked != null) strings.push(q.value.cooked);
    }
    // A template with no expressions is its one quasi, already recorded.
    const value =
      node.type === 'TemplateLiteral' && !node.expressions.length ? null : constantString(node);
    if (value != null) strings.push(value);
    const payload = codePayload(node);
    if (payload != null) code.push(payload);
    const compiles = compilesCode(node);
    if (compiles) dynamic.add(compiles);
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child.type === 'string') visit(child);
    }
  };
  visit(ast);
  return { strings, code, dynamic: [...dynamic] };
}

/**
 * The name of the run-time code compiler a node uses, or null. Any reference
 * to `eval` (direct, indirect as `(0, eval)`, or as a member), `Function`
 * called or constructed, a string `setTimeout`/`setInterval`, and a constant
 * computed name resolving to one of them. The site's own code compiles no code
 * at run time, so using one is a finding in itself, whatever the payload: no
 * static reading of a compiled string can be complete.
 */
function compilesCode(node) {
  if (node.type === 'Identifier' && node.name === 'eval') return 'eval';
  // A reference, not only a call: `globalThis['eval']` or `window.Function`
  // taken into an alias still compiles code when the alias is called.
  if (node.type === 'MemberExpression') {
    const prop = node.computed ? constantString(node.property) : node.property.name;
    if (prop === 'eval' || prop === 'Function') return prop;
  }
  if (node.type !== 'CallExpression' && node.type !== 'NewExpression') return null;
  const callee = node.callee;
  const name =
    callee.type === 'Identifier'
      ? callee.name
      : callee.type === 'MemberExpression'
        ? callee.computed
          ? constantString(callee.property)
          : callee.property.name
        : null;
  if (name === 'eval' || name === 'Function') return name;
  if ((name === 'setTimeout' || name === 'setInterval') && node.arguments.length) {
    const arg = node.arguments[0];
    if (arg.type === 'Literal' || arg.type === 'TemplateLiteral' || arg.type === 'BinaryExpression')
      return `${name} with a string`;
  }
  return null;
}

const CODE_SINKS = new Set(['eval', 'Function', 'setTimeout', 'setInterval']);

/**
 * The constant source a call hands the engine to compile, or null:
 * `eval(src)`, `Function(..., body)` / `new Function(..., body)`, and
 * `setTimeout(src, ...)` / `setInterval(src, ...)` with a string, called
 * directly or as a member (`window.eval`). That string runs as code, so its own
 * escapes are decoded only by a second parse.
 */
function codePayload(node) {
  if (node.type !== 'CallExpression' && node.type !== 'NewExpression') return null;
  const callee = node.callee;
  // `window.eval`, and `window['eval']` or any other constant computed name.
  const name =
    callee.type === 'Identifier'
      ? callee.name
      : callee.type === 'MemberExpression'
        ? callee.computed
          ? constantString(callee.property)
          : callee.property.name
        : null;
  if (!CODE_SINKS.has(name) || !node.arguments.length) return null;
  const arg = name === 'Function' ? node.arguments.at(-1) : node.arguments[0];
  if (name === 'setTimeout' || name === 'setInterval') {
    if (arg.type !== 'Literal' && arg.type !== 'TemplateLiteral' && arg.type !== 'BinaryExpression')
      return null;
  }
  return constantString(arg);
}

/**
 * Analytics hosts a script names, read two ways: its raw text (comments and
 * all, through spellings()) and its constant strings as the engine would
 * evaluate them. `skip` excludes a source range from both readings. A script
 * that cannot be parsed is reported by name instead of passing.
 */
function scriptHosts(source, { skip = null, label = 'script', depth = 0 } = {}) {
  const raw = skip ? source.slice(0, skip[0]) + '\n' + source.slice(skip[1]) : source;
  const hosts = new Set(namedHosts(raw));
  const parsed = scriptStrings(source, { skip });
  if (parsed.error) return { hosts: [...hosts], error: `${label} could not be parsed: ${parsed.error}` };
  for (const value of parsed.strings) for (const host of namedHosts(value)) hosts.add(host);
  const errors = [];
  // A constant executable data: URL in code (an import(), a Worker, a script
  // element's src) runs a body nothing here reads.
  const dataUrls = [
    ...new Set(parsed.strings.map((value) => executableDataUrl(value)).filter(Boolean)),
  ];
  if (dataUrls.length) {
    errors.push(`${label} names an executable data: URL (${dataUrls.join(', ')})`);
  }
  if (parsed.dynamic.length) {
    errors.push(`${label} compiles code at run time (${parsed.dynamic.join(', ')})`);
  }
  // Constant code handed to eval and its kin is still parsed and read again,
  // to a bounded depth, so a finding also names the host it would reach.
  for (const payload of parsed.code) {
    if (depth >= 4) {
      errors.push(`${label}: code nested past depth 4`);
      break;
    }
    const inner = scriptHosts(payload, { label: `${label} (eval payload)`, depth: depth + 1 });
    if (inner.error) errors.push(inner.error);
    inner.hosts.forEach((h) => hosts.add(h));
  }
  return errors.length ? { hosts: [...hosts], error: errors.join('; ') } : { hosts: [...hosts] };
}

/**
 * The MIME type of an executable `data:` URL, or null. JavaScript (any type in
 * JAVASCRIPT_MIME_TYPES), HTML, and XHTML always count. SVG and XML count where
 * they become a document (a frame, object, or embed). On a `<script>` any
 * `data:` URL counts, whatever type it claims. `context` is the element's
 * local name, or null for a string in a script.
 */
function executableDataUrl(value, context = null) {
  const m = /^\s*data:\s*([a-z0-9.+-]+\/[a-z0-9.+-]+)?/i.exec(value);
  if (!m) return null;
  const type = (m[1] ?? 'text/plain').toLowerCase();
  if (JAVASCRIPT_MIME_TYPES.has(type) || type === 'text/html' || type === 'application/xhtml+xml')
    return type;
  if (
    ['image/svg+xml', 'text/xml', 'application/xml'].includes(type) &&
    ['iframe', 'frame', 'object', 'embed'].includes(context)
  )
    return type;
  if (context === 'script') return type;
  return null;
}

/** JSON's own string escapes decoded: every string key and value in a JSON document. */
function jsonStrings(text) {
  const out = [];
  const visit = (value) => {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        out.push(key);
        visit(child);
      }
    }
  };
  try {
    visit(JSON.parse(text));
    return { strings: out };
  } catch (error) {
    return { error: error.message };
  }
}

// Every JavaScript MIME type (WHATWG MIME Sniffing § JavaScript MIME type). A
// script whose type essence-matches one runs as a classic script.
const JAVASCRIPT_MIME_TYPES = new Set([
  'application/ecmascript',
  'application/javascript',
  'application/x-ecmascript',
  'application/x-javascript',
  'text/ecmascript',
  'text/javascript',
  'text/javascript1.0',
  'text/javascript1.1',
  'text/javascript1.2',
  'text/javascript1.3',
  'text/javascript1.4',
  'text/javascript1.5',
  'text/jscript',
  'text/livescript',
  'text/x-ecmascript',
  'text/x-javascript',
]);

/**
 * How the browser treats a `<script type>`: 'js' for a classic or module
 * script, 'json' for the JSON types it reads itself (`importmap`,
 * `speculationrules`) and any JSON data block, 'data' for anything else.
 */
function scriptKind(type) {
  const t = (type ?? '').trim().toLowerCase();
  if (t === '' || t === 'module') return 'js';
  const essence = t.split(';')[0].trim();
  if (JAVASCRIPT_MIME_TYPES.has(essence)) return 'js';
  if (t === 'importmap' || t === 'speculationrules' || /json/.test(essence)) return 'json';
  return 'data';
}

const REGION_START_TEXT = REGION_START.slice(4, -3);
const REGION_END_TEXT = REGION_END.slice(4, -3);

/**
 * Host findings in a parsed document's markup: inline scripts (except the
 * `exempt` elements and Mux Data's exact wrapper), stylesheets, and every
 * attribute. Shared by the page check and, recursively, by each `srcdoc`
 * document a page carries.
 */
function markupFindings(document, exempt, depth = 0) {
  const findings = [];
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
  // them names a host today, so they need no exemption. A JavaScript body is
  // read as the engine reads it (scriptHosts: escapes decoded, constants
  // joined), JSON with its own escapes decoded, anything else as text.
  for (const el of elements) {
    if (el.localName !== 'script') continue;
    if (exempt.has(el) || el.textContent.trim() === MUX_DATA_SOURCE) continue;
    const text = el.textContent;
    const type = el.getAttribute('type');
    const hosts = new Set(namedHosts(text));
    const kind = scriptKind(type);
    if (kind === 'js') {
      const scanned = scriptHosts(text, { label: 'inline script' });
      if (scanned.error) findings.push(scanned.error);
      scanned.hosts.forEach((h) => hosts.add(h));
    } else if (kind === 'json') {
      const parsed = jsonStrings(text);
      if (parsed.error) findings.push(`inline ${type} script is not valid JSON: ${parsed.error}`);
      else {
        for (const value of parsed.strings) namedHosts(value).forEach((h) => hosts.add(h));
        // An import map or speculation rule can point at an executable data:
        // URL, which the browser then loads and runs.
        const dataUrls = [
          ...new Set(parsed.strings.map((v) => executableDataUrl(v)).filter(Boolean)),
        ];
        if (dataUrls.length) {
          findings.push(`inline ${type} script names an executable data: URL (${dataUrls.join(', ')})`);
        }
      }
    }
    for (const host of hosts) findings.push(`inline script names analytics host ${host}`);
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
  // on `<a>` and `<area>` (unless it is a `javascript:` URL): following a link
  // is navigation the visitor starts, not a request the page makes. A `<link href>` (preconnect, prefetch,
  // stylesheet) is NOT exempt. Prose may name the hosts: the /privacy/ page
  // discloses them in text.
  // An `on*` handler and a `javascript:` URL are JavaScript, so they are also
  // read as the engine reads them (scriptHosts); a `javascript:` href is not
  // navigation and gets no exemption.
  for (const el of elements) {
    for (const attr of el.attributes) {
      // As the URL parser reads it: leading C0 controls and spaces stripped,
      // and every ASCII tab and newline removed, before the scheme is read.
      let asUrl = attr.value.replace(/[\t\n\r]/g, '');
      let lead = 0;
      while (lead < asUrl.length && asUrl.charCodeAt(lead) <= 0x20) lead++;
      asUrl = asUrl.slice(lead);
      const isScriptUrl = /^javascript:/i.test(asUrl);
      // An executable `data:` URL (script or document) runs outside the gate:
      // a document in a frame of its own, a script with nothing reading its
      // decoded body. The site uses none, so one is a finding in itself.
      const dataKind = executableDataUrl(asUrl, el.localName);
      if (dataKind) findings.push(`markup attribute embeds an executable data: URL (${dataKind})`);
      if (
        attr.name === 'href' &&
        (el.localName === 'a' || el.localName === 'area') &&
        !isScriptUrl
      ) {
        continue;
      }
      // `srcdoc` is a whole document the browser parses and runs in the
      // frame, so it gets every check here, recursively (to a bounded depth).
      if (attr.name === 'srcdoc') {
        if (depth >= 4) {
          findings.push('srcdoc nested past depth 4');
          continue;
        }
        const nested = new JSDOM(attr.value);
        try {
          const inner = markupFindings(nested.window.document, new Set(), depth + 1);
          for (const finding of inner) findings.push(`srcdoc: ${finding}`);
        } finally {
          nested.window.close();
        }
      }
      const hosts = new Set(namedHosts(attr.value));
      // A javascript: URL runs code the site never needs (it has none), so one
      // is a finding in itself. Its body is still read, percent-decoded as the
      // engine runs it, so the finding also names the host it would reach.
      if (isScriptUrl) findings.push('markup attribute holds a javascript: URL');
      if (/^on/i.test(attr.name) || isScriptUrl) {
        const code = isScriptUrl
          ? percentDecode(asUrl.replace(/^javascript:/i, ''))
          : attr.value;
        const scanned = scriptHosts(code, { label: `${attr.name} attribute` });
        if (scanned.error) findings.push(scanned.error);
        scanned.hosts.forEach((h) => hosts.add(h));
      }
      for (const host of hosts) findings.push(`markup attribute names analytics host ${host}`);
    }
  }
  return findings;
}

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
    // bootstrap passes an offset comparison and gates nothing. Returns the
    // guarded block as a half-open [start, end) range, or null.
    const after = (name, body, guard, needles) => {
      const match = guard.exec(body);
      if (!match) {
        findings.push(`${name} block has no gate guard`);
        return null;
      }
      const block = guardedBlock(body, match.index + match[0].indexOf('if'));
      if (!block) {
        findings.push(`${name} block: could not find the end of the gate guard's block`);
        return null;
      }
      const [open, close] = block;
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
      return [open, close + 1];
    };
    // A region script is exempt from the host scan only inside its guarded
    // block. Everything around the block runs ungated, so a host named there
    // (a stray fetch after the block closes, say) is a finding, however it is
    // spelled. The listed needles above check only what the guard must hold.
    const outsideGuard = (name, body, span) => {
      if (!span) return;
      const { hosts, error } = scriptHosts(body, { skip: span, label: `${name} block` });
      if (error) findings.push(error);
      for (const host of hosts) {
        findings.push(`${name} block names analytics host ${host} outside its gate guard`);
      }
    };
    if (posthog) {
      const body = posthog.textContent;
      outsideGuard(
        'PostHog',
        body,
        after('PostHog', body, POSTHOG_GUARD, ['!function(t,e){', 'posthog.init(']),
      );
      if (body.includes('const posthogHost')) {
        findings.push('PostHog block carries the ungated pre-#1233 snippet');
      }
    }
    if (ga4) {
      const body = ga4.textContent;
      outsideGuard(
        'GA4',
        body,
        after('GA4', body, GA4_GUARD, [
          'window.dataLayer = ',
          "gtag('js'",
          "gtag('config'",
          'document.createElement(',
          'loader.src = ',
          'appendChild(loader)',
        ]),
      );
      if (!body.includes('gtag/js?id=')) findings.push('GA4 block does not create the loader');
    }

    const exempt = new Set(inRegion);
    if (gate) exempt.add(gate);
    findings.push(...markupFindings(document, exempt));
    return findings;
  } finally {
    dom.window.close();
  }
}

// The installed mux-embed version. Mux Data is the one emitted bundle allowed
// to name an analytics host: its chunk names litix.io, where Mux sends beacons,
// and runs only through the gate's mediation (src/lib/privacy/mux-data.js). The
// chunk is recognized by the name and exact version mux-embed stamps into
// itself, so the allowance follows that package and not a file name or hash.
const MUX_EMBED_VERSION = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../node_modules/mux-embed/package.json', import.meta.url)),
    'utf8',
  ),
).version;

/** Counts of each string in `strings` that names litix.io. */
function litixStrings(strings) {
  const counts = new Map();
  for (const value of strings) {
    // Array membership on the decoded host list, not a URL substring test.
    if (namedHosts(value).some((host) => host === 'litix.io')) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * The most times `litix.io` appears in any decoded spelling of `text` (see
 * spellings()): every occurrence, in strings, regular expressions, comments,
 * or code, however it is spelled.
 */
function litixOccurrences(text) {
  let most = 0;
  for (const form of spellings(text)) {
    let n = 0;
    for (let i = form.indexOf('litix.io'); i >= 0; i = form.indexOf('litix.io', i + 1)) n++;
    most = Math.max(most, n);
  }
  return most;
}

// The litix.io strings mux-embed itself ships, from the ES module entry Vite
// bundles (`exports.import`). The mux-embed chunk may carry these and only
// these, each at most as often as the package does, so code co-bundled into
// that chunk cannot borrow the allowance.
const MUX_EMBED_SOURCE = readFileSync(
  fileURLToPath(new URL('../../node_modules/mux-embed/dist/mux.mjs', import.meta.url)),
  'utf8',
);
const MUX_EMBED_LITIX = litixStrings(scriptStrings(MUX_EMBED_SOURCE).strings ?? []);
// And every occurrence, string or not: the chunk may not name litix.io more
// often, in any spelling, than the package's own source does.
const MUX_EMBED_LITIX_OCCURRENCES = litixOccurrences(MUX_EMBED_SOURCE);

/**
 * Findings for the JavaScript a build emits (`files` as readTextFiles returns
 * them; anything not .js or .mjs is ignored). A same-origin bundle runs on any
 * page that loads it, so an analytics host named in one is a request the HTML
 * check never sees. Each bundle is read as the engine reads it (scriptHosts),
 * and one that cannot be parsed is reported. The mux-embed chunk (see
 * MUX_EMBED_VERSION) may name litix.io and nothing else, and only in the
 * strings mux-embed ships (MUX_EMBED_LITIX).
 */
export function bundleFindings(files) {
  const findings = [];
  for (const { path, text } of files) {
    if (!/\.m?js$/.test(path)) continue;
    const { hosts, error } = scriptHosts(text, { label: path });
    if (error) findings.push(error);
    if (!hosts.length) continue;
    const { strings = [] } = scriptStrings(text);
    // mux-embed's own NAME and VERSION constants, and the beacon key it
    // reports them under (an object key, so read from the text).
    const isMuxEmbed =
      strings.includes('mux-embed') &&
      strings.includes(MUX_EMBED_VERSION) &&
      text.includes('mux_embed_version');
    for (const host of hosts) {
      if (isMuxEmbed && host === 'litix.io') {
        const occurrences = litixOccurrences(text);
        if (occurrences > MUX_EMBED_LITIX_OCCURRENCES) {
          findings.push(
            `${path}: bundle names analytics host litix.io ${occurrences} times; mux-embed's own code does ${MUX_EMBED_LITIX_OCCURRENCES}`,
          );
        }
        for (const [value, count] of litixStrings(strings)) {
          if (count > (MUX_EMBED_LITIX.get(value) ?? 0)) {
            findings.push(
              `${path}: bundle names analytics host litix.io beyond mux-embed's own code (${value})`,
            );
          }
        }
        continue;
      }
      findings.push(`${path}: bundle names analytics host ${host}`);
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
