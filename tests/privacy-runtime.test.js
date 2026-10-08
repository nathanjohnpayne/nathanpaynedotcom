// @vitest-environment node
//
// #1079 / #1228 privacy runtime: the head gate (src/lib/privacy/gate.js) and
// the flag-on PostHog and GA4 blocks, exercised without a real browser.
// Contract: specs/analytics-privacy.md. Behaviour notes: specs/analytics.md
// § Privacy Runtime.
//
// Every test runs the gate's exact source in a fresh JSDOM window, so state
// never leaks between cases and what is tested is what PrivacyHead.astro
// inlines. The flag-on analytics scripts are lifted from their component
// source and run the way Astro's define:vars wraps them. Real-SDK behaviour
// (requests, replay payloads) is checked separately under tests/privacy-runtime/.

import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const GATE_SRC = read('src/lib/privacy/gate.js');
const HEAD_SRC = read('src/components/privacy/PrivacyHead.astro');
const POSTHOG_SRC = read('src/components/posthog.astro');
const LAYOUT_SRC = read('src/layouts/BaseLayout.astro');
const INTERNAL = Symbol.for('np-privacy.internal');
const BASE_HTML = '<!doctype html><html><head><script></script></head><body></body></html>';

/** Body of the `index`-th `openTag` script in an .astro source. */
function scriptBody(src, openTag, index) {
  let at = -1;
  for (let i = 0; i <= index; i += 1) {
    at = src.indexOf(openTag, at + 1);
    if (at < 0) throw new Error(`script ${index} with ${openTag} not found`);
  }
  const start = at + openTag.length;
  return src.slice(start, src.indexOf('</script>', start));
}

const POSTHOG_ON = scriptBody(POSTHOG_SRC, '<script is:inline define:vars={{ token }}>', 1);
const GA_ON = scriptBody(LAYOUT_SRC, '<script is:inline define:vars={{ gaId }}>', 1);

/** Runs an inline script the way Astro's define:vars emits it: an IIFE with const bindings. */
function runDefineVars(w, vars, body) {
  const decls = Object.entries(vars)
    .map(([k, v]) => `const ${k} = ${JSON.stringify(v)};`)
    .join('\n');
  w.eval(`(function(){${decls}\n${body}\n})();`);
}

/**
 * A fresh window with the gate booted. Network primitives are recording stubs,
 * so the transport guard has something to wrap and nothing can leave.
 */
function boot({
  url = 'https://nathanpayne.test/',
  stored,
  gpc,
  storage = 'ok',
  html = BASE_HTML,
  runGate = true,
} = {}) {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  const w = dom.window;
  if (stored !== undefined) w.localStorage.setItem('np-privacy', stored);
  if (gpc !== undefined) {
    Object.defineProperty(w.navigator, 'globalPrivacyControl', { value: gpc, configurable: true });
  }
  if (storage === 'throws') {
    Object.defineProperty(w, 'localStorage', {
      configurable: true,
      get() {
        throw new w.DOMException('blocked', 'SecurityError');
      },
    });
  } else if (storage === 'write-throws') {
    w.Storage.prototype.setItem = function () {
      throw new w.DOMException('full', 'QuotaExceededError');
    };
  }
  const sent = { fetch: [], beacon: [], xhr: [] };
  w.Response = Response;
  w.fetch = function (input) {
    sent.fetch.push(String((input && input.url) || input));
    return Promise.resolve(new Response('ok'));
  };
  w.navigator.sendBeacon = function (target) {
    sent.beacon.push(String(target));
    return true;
  };
  w.XMLHttpRequest.prototype.open = function (_method, target) {
    this.npTarget = String(target);
  };
  w.XMLHttpRequest.prototype.send = function () {
    sent.xhr.push(this.npTarget);
  };
  if (runGate) w.eval(GATE_SRC);
  const privacy = w.npPrivacy;
  return { dom, w, sent, privacy, gate: privacy && privacy[INTERNAL] };
}

function storedValue(w) {
  return w.localStorage.getItem('np-privacy');
}

function events(w) {
  const seen = [];
  w.addEventListener('np:privacy-change', (e) => seen.push(e.detail));
  return seen;
}

describe('gate source', () => {
  it('is inlined verbatim by PrivacyHead as one is:inline script', () => {
    expect(HEAD_SRC).toContain("import gateSource from '../../lib/privacy/gate.js?raw';");
    expect(HEAD_SRC.match(/<script\b/g)).toHaveLength(1);
    expect(HEAD_SRC).toContain('<script is:inline set:html={gateSource} />');
  });

  it('is a classic script with no imports, no network calls, and nothing HTML could misparse', () => {
    expect(GATE_SRC).not.toMatch(/^\s*(import|export)\b/m);
    expect(GATE_SRC).not.toMatch(
      /\bfetch\(|sendBeacon\(|new XMLHttpRequest|importScripts|\.src\s*=/,
    );
    expect(GATE_SRC).not.toMatch(/<\/?script|<!--/i);
  });

  it('carries every runtime marker the flag-off check looks for', () => {
    for (const marker of ['npPrivacy', 'np:privacy-change', 'data-np-privacy', 'np-privacy']) {
      expect(GATE_SRC).toContain(marker);
    }
  });
});

describe('runtime API shape (§ Runtime API)', () => {
  it('exposes exactly the contract members, frozen, with the internal channel hidden', () => {
    const { privacy } = boot();
    expect(Object.keys(privacy).sort()).toEqual(
      ['gpc', 'get', 'notice', 'onChange', 'set', 'version'].sort(),
    );
    expect(privacy.version).toBe(1);
    expect(Object.isFrozen(privacy)).toBe(true);
    expect(Object.keys(privacy.notice).sort()).toEqual(['dismiss', 'shouldShow']);
    expect(Object.getOwnPropertyDescriptor(privacy, INTERNAL).enumerable).toBe(false);
    expect(JSON.stringify(privacy)).not.toContain('scrub');
  });

  it('returns a fresh snapshot from get()', () => {
    const { privacy } = boot();
    const a = privacy.get();
    a.effective = 'denied';
    expect(privacy.get().effective).toBe('granted');
  });
});

describe('choice resolution (§ Choice Model)', () => {
  it('defaults a fresh visit to granted, reason default, and shows the notice', () => {
    const { w, privacy } = boot();
    expect(privacy.get()).toEqual({
      saved: 'unset',
      effective: 'granted',
      reason: 'default',
      persisted: true,
      loadedThisPage: false,
    });
    expect(w.document.documentElement.getAttribute('data-np-privacy')).toBe('granted');
    expect(w.document.documentElement.getAttribute('data-np-privacy-reason')).toBe('default');
    expect(privacy.notice.shouldShow()).toBe(true);
    expect(privacy.gpc()).toBe(false);
  });

  it.each([
    ['denied', 'denied', 'choice'],
    ['granted', 'granted', 'choice'],
    ['unset', 'granted', 'default'],
  ])('reads a saved %s as %s (%s)', (choice, effective, reason) => {
    const { w, privacy } = boot({
      stored: JSON.stringify({ v: 1, choice, noticeDismissed: true }),
    });
    expect(privacy.get()).toMatchObject({ saved: choice, effective, reason });
    expect(w.document.documentElement.getAttribute('data-np-privacy')).toBe(effective);
    expect(privacy.notice.shouldShow()).toBe(false);
  });

  it('lets an active GPC signal override a saved grant', () => {
    const { w, privacy } = boot({
      gpc: true,
      stored: JSON.stringify({ v: 1, choice: 'granted', noticeDismissed: false }),
    });
    expect(privacy.gpc()).toBe(true);
    expect(privacy.get()).toMatchObject({ saved: 'granted', effective: 'denied', reason: 'gpc' });
    expect(w.document.documentElement.getAttribute('data-np-privacy-reason')).toBe('gpc');
    expect(privacy.notice.shouldShow()).toBe(false);
  });

  it('treats only a literal true as GPC', () => {
    expect(boot({ gpc: 'true' }).privacy.get().effective).toBe('granted');
    expect(boot({ gpc: 1 }).privacy.get().effective).toBe('granted');
    expect(boot({ gpc: false }).privacy.get().effective).toBe('granted');
  });

  it('rejects set(granted) under GPC without saving or announcing anything', () => {
    const { w, privacy } = boot({ gpc: true });
    const seen = events(w);
    expect(privacy.set('granted')).toBe(false);
    expect(storedValue(w)).toBeNull();
    expect(privacy.get()).toMatchObject({ saved: 'unset', effective: 'denied', reason: 'gpc' });
    expect(seen).toEqual([]);
  });

  it('saves set(denied) under GPC so the opt-out outlives the signal', () => {
    const first = boot({ gpc: true });
    expect(first.privacy.set('denied')).toBe(true);
    const saved = storedValue(first.w);
    expect(JSON.parse(saved)).toEqual({ v: 1, choice: 'denied', noticeDismissed: false });
    const later = boot({ gpc: false, stored: saved });
    expect(later.privacy.get()).toMatchObject({ effective: 'denied', reason: 'choice' });
  });

  it('rejects anything but granted or denied', () => {
    const { w, privacy } = boot();
    for (const bad of ['unset', 'GRANTED', '', null, undefined, true, {}]) {
      expect(privacy.set(bad)).toBe(false);
    }
    expect(storedValue(w)).toBeNull();
  });
});

describe('storage (§ Storage)', () => {
  it('writes the contract shape under np-privacy', () => {
    const { w, privacy } = boot();
    privacy.set('denied');
    expect(JSON.parse(storedValue(w))).toEqual({ v: 1, choice: 'denied', noticeDismissed: false });
  });

  it.each([
    ['empty', ''],
    ['not JSON', '{nope'],
    ['JSON null', 'null'],
    ['an array', '[]'],
    ['an unknown v', JSON.stringify({ v: 2, choice: 'denied', noticeDismissed: true })],
    ['a missing v', JSON.stringify({ choice: 'denied', noticeDismissed: true })],
    ['an unknown choice', JSON.stringify({ v: 1, choice: 'maybe', noticeDismissed: true })],
    ['a missing choice', JSON.stringify({ v: 1, noticeDismissed: true })],
  ])('reads %s as unset and never rewrites it', (_label, raw) => {
    const { w, privacy } = boot({ stored: raw });
    expect(privacy.get()).toMatchObject({
      saved: 'unset',
      effective: 'granted',
      reason: 'default',
    });
    expect(privacy.notice.shouldShow()).toBe(true);
    privacy.get();
    privacy.notice.shouldShow();
    expect(storedValue(w)).toBe(raw);
  });

  it('reads a non-boolean noticeDismissed as false', () => {
    const { privacy } = boot({
      stored: JSON.stringify({ v: 1, choice: 'unset', noticeDismissed: 'yes' }),
    });
    expect(privacy.notice.shouldShow()).toBe(true);
  });

  it('falls back to the GPC rule, then default-on, when reading throws', () => {
    expect(boot({ storage: 'throws' }).privacy.get()).toMatchObject({
      saved: 'unset',
      effective: 'granted',
      reason: 'default',
    });
    expect(boot({ storage: 'throws', gpc: true }).privacy.get()).toMatchObject({
      effective: 'denied',
      reason: 'gpc',
    });
  });

  it('applies a choice in memory and reports persisted: false when writing throws', () => {
    const { w, privacy } = boot({ storage: 'write-throws' });
    const seen = events(w);
    expect(privacy.set('denied')).toBe(true);
    expect(privacy.get()).toMatchObject({ saved: 'denied', effective: 'denied', persisted: false });
    expect(seen).toHaveLength(1);
    expect(seen[0].persisted).toBe(false);
  });
});

describe('notice (§ Runtime API)', () => {
  it('dismisses without making a choice', () => {
    const { w, privacy } = boot();
    const seen = events(w);
    privacy.notice.dismiss();
    expect(privacy.notice.shouldShow()).toBe(false);
    expect(privacy.get()).toMatchObject({
      saved: 'unset',
      effective: 'granted',
      reason: 'default',
    });
    expect(JSON.parse(storedValue(w))).toEqual({ v: 1, choice: 'unset', noticeDismissed: true });
    expect(seen).toHaveLength(1);
  });

  it('stays hidden once a choice is saved', () => {
    const { privacy } = boot();
    privacy.set('granted');
    expect(privacy.notice.shouldShow()).toBe(false);
  });
});

describe('change notification (§ Runtime API, § Withdrawal 4)', () => {
  it('stops the tools, then dispatches np:privacy-change, then calls onChange', () => {
    const { w, privacy, gate } = boot();
    const order = [];
    gate.registerTool('t', { stop: () => order.push('stop') });
    w.addEventListener('np:privacy-change', (e) => order.push(`event:${e.detail.effective}`));
    privacy.onChange((s) => order.push(`listener:${s.effective}`));
    privacy.set('denied');
    expect(order).toEqual(['stop', 'event:denied', 'listener:denied']);
  });

  it('does not announce a set() that changes nothing', () => {
    const { w, privacy } = boot({ stored: JSON.stringify({ v: 1, choice: 'denied' }) });
    const seen = events(w);
    privacy.set('denied');
    expect(seen).toEqual([]);
  });

  it('unsubscribes and isolates throwing listeners', () => {
    const { privacy } = boot();
    const calls = [];
    privacy.onChange(() => {
      throw new Error('listener bug');
    });
    const off = privacy.onChange(() => calls.push('a'));
    privacy.onChange(() => calls.push('b'));
    privacy.set('denied');
    off();
    privacy.set('granted');
    expect(calls).toEqual(['a', 'b', 'b']);
    expect(typeof privacy.onChange('not a function')).toBe('function');
  });
});

describe('withdrawal and re-enable (§ Withdrawal, § Re-Enable)', () => {
  it('marks loadedThisPage when a tool registers', () => {
    const { privacy, gate } = boot();
    gate.registerTool('t', { stop() {} });
    expect(privacy.get().loadedThisPage).toBe(true);
  });

  it('stops every tool once even when one throws', () => {
    const { privacy, gate } = boot();
    const stops = [];
    gate.registerTool('a', {
      stop() {
        stops.push('a');
        throw new Error('vendor error');
      },
    });
    gate.registerTool('b', { stop: () => stops.push('b') });
    privacy.set('denied');
    privacy.set('denied');
    expect(stops).toEqual(['a', 'b']);
    expect(gate.withdrawn()).toBe(true);
    expect(privacy.get().effective).toBe('denied');
  });

  it('saves a re-grant but never restarts collection in the same page view', () => {
    const { privacy, gate } = boot();
    const stops = [];
    gate.registerTool('t', { stop: () => stops.push('t') });
    privacy.set('denied');
    expect(privacy.set('granted')).toBe(true);
    expect(privacy.get()).toMatchObject({
      saved: 'granted',
      effective: 'granted',
      reason: 'choice',
    });
    expect(gate.withdrawn()).toBe(true);
    expect(gate.scrubEvent({ event: '$pageview', properties: {} })).toBeNull();
    expect(stops).toEqual(['t']);
  });

  it('changes nothing but the saved value from unset to granted', () => {
    const { privacy, gate } = boot();
    const stops = [];
    gate.registerTool('t', { stop: () => stops.push('t') });
    privacy.set('granted');
    expect(privacy.get()).toMatchObject({ saved: 'granted', effective: 'granted' });
    expect(stops).toEqual([]);
    expect(gate.withdrawn()).toBe(false);
  });

  it('withdraws when another tab saves denied (storage event)', () => {
    const { w, privacy, gate } = boot();
    const stops = [];
    gate.registerTool('t', { stop: () => stops.push('t') });
    const seen = events(w);
    const value = JSON.stringify({ v: 1, choice: 'denied', noticeDismissed: false });
    w.localStorage.setItem('np-privacy', value);
    w.dispatchEvent(new w.StorageEvent('storage', { key: 'np-privacy', newValue: value }));
    expect(stops).toEqual(['t']);
    expect(privacy.get()).toMatchObject({ saved: 'denied', effective: 'denied' });
    expect(seen).toHaveLength(1);
    expect(w.document.documentElement.getAttribute('data-np-privacy')).toBe('denied');
  });

  it('ignores storage events for other keys', () => {
    const { w, gate } = boot();
    const stops = [];
    gate.registerTool('t', { stop: () => stops.push('t') });
    w.localStorage.setItem('np-privacy', JSON.stringify({ v: 1, choice: 'denied' }));
    w.dispatchEvent(new w.StorageEvent('storage', { key: 'something-else' }));
    expect(stops).toEqual([]);
  });

  it('re-reads the choice when a page is restored from the back/forward cache', () => {
    const { w, privacy, gate } = boot();
    const stops = [];
    gate.registerTool('t', { stop: () => stops.push('t') });
    w.localStorage.setItem('np-privacy', JSON.stringify({ v: 1, choice: 'denied' }));
    w.dispatchEvent(new w.PageTransitionEvent('pageshow', { persisted: false }));
    expect(stops).toEqual([]);
    w.dispatchEvent(new w.PageTransitionEvent('pageshow', { persisted: true }));
    expect(stops).toEqual(['t']);
    expect(privacy.get().effective).toBe('denied');
  });

  it('stops a tool at once if it registers after a withdrawal', () => {
    const { privacy, gate } = boot();
    privacy.set('denied');
    const stops = [];
    gate.registerTool('late', { stop: () => stops.push('late') });
    expect(stops).toEqual(['late']);
  });
});

describe('transport guard', () => {
  it('passes every request through until a withdrawal, then refuses analytics hosts only', async () => {
    const { w, sent, privacy, gate } = boot();
    gate.registerTool('t', { stop() {} });
    await w.fetch('https://d.nathanpayne.com/i/v0/e/');
    w.navigator.sendBeacon('https://region1.google-analytics.com/g/collect');
    privacy.set('denied');
    const refused = await w.fetch('https://d.nathanpayne.com/i/v0/e/');
    expect(refused.status).toBe(204);
    await w.fetch(new Request('https://us.i.posthog.com/e/'));
    expect(w.navigator.sendBeacon('https://region1.google-analytics.com/g/collect')).toBe(true);
    const xhr = new w.XMLHttpRequest();
    xhr.open('POST', 'https://d.nathanpayne.com/s/');
    xhr.send('{}');
    await w.fetch('https://nathanpayne.test/_astro/page.js');
    w.navigator.sendBeacon('https://example.org/beacon');
    expect(sent).toEqual({
      fetch: ['https://d.nathanpayne.com/i/v0/e/', 'https://nathanpayne.test/_astro/page.js'],
      beacon: ['https://region1.google-analytics.com/g/collect', 'https://example.org/beacon'],
      xhr: [],
    });
  });

  it('is installed only once a tool registers', () => {
    const { w } = boot();
    expect(w.fetch.toString()).toContain('sent.fetch.push');
  });

  it.each([
    ['https://d.nathanpayne.com/static/array.js', true],
    ['https://us.i.posthog.com/e/', true],
    ['https://us-assets.i.posthog.com/array/x/config.js', true],
    ['https://www.googletagmanager.com/gtag/js?id=G-X', true],
    ['https://region1.google-analytics.com/g/collect', true],
    ['https://region1.analytics.google.com/g/collect', true],
    ['https://stats.g.doubleclick.net/g/collect', true],
    ['https://nathanpayne.com/', false],
    ['https://notgoogle-analytics.com/', false],
    ['https://d.nathanpayne.com.example.net/', false],
    ['https://fonts.googleapis.com/css2', false],
    ['/i/v0/e/', false],
  ])('classifies %s as analytics: %s', (url, expected) => {
    expect(boot().gate.isAnalyticsUrl(url)).toBe(expected);
  });
});

describe('URL scrubbing (§ Capture Minimization 3)', () => {
  const at = (path = '/blog/post/') => boot({ url: `https://nathanpayne.test${path}` }).gate;

  it('has exactly one allowlist: the five UTMs and the four Google click identifiers', () => {
    expect([...at().ALLOWED_QUERY_PARAMS]).toEqual([
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'gbraid',
      'wbraid',
      'dclid',
    ]);
    expect(Object.isFrozen(at().ALLOWED_QUERY_PARAMS)).toBe(true);
    // No second list: no parameter name outside the allowlist is ever named.
    expect(GATE_SRC.match(/QUERY_PARAMS\s*=/g)).toHaveLength(1);
    expect(GATE_SRC).not.toMatch(/'(email|fbclid|msclkid|ref|token|q)'/);
  });

  it.each([
    [
      'https://nathanpayne.com/a/b/?email=x%40y.test&utm_source=news&gclid=abc&fbclid=zz#frag',
      'https://nathanpayne.com/a/b/?utm_source=news&gclid=abc',
    ],
    ['https://nathanpayne.com/?q=secret', 'https://nathanpayne.com/'],
    ['https://nathanpayne.com/#only-a-fragment', 'https://nathanpayne.com/'],
    [
      'https://nathanpayne.com/x?utm_campaign=a%20b&x=1&utm_source=s&utm_medium=&dclid',
      'https://nathanpayne.com/x?utm_campaign=a%20b&utm_source=s&utm_medium=&dclid',
    ],
    ['https://nathanpayne.com/x?UTM_SOURCE=shout', 'https://nathanpayne.com/x'],
    ['https://nathanpayne.com/x?utm%5Fsource=enc', 'https://nathanpayne.com/x?utm%5Fsource=enc'],
    ['https://user:pass@nathanpayne.com:8443/x?a=1', 'https://nathanpayne.com:8443/x'],
    ['HTTP://NATHANPAYNE.COM/Path?A=1', 'http://nathanpayne.com/Path'],
    ['//cdn.example.test/x.js?token=t', '//cdn.example.test/x.js'],
    [
      '/test-fixtures/privacy/?email=NP-CANARY-QUERY%40example.test&utm_source=fixture#NP-CANARY-FRAGMENT',
      '/test-fixtures/privacy/?utm_source=fixture',
    ],
    ['?utm_medium=mail&ref=1', '/blog/post/?utm_medium=mail'],
    ['#section', '/blog/post/'],
    ['../other/?a=1', '/blog/other/'],
    ['  https://nathanpayne.com/x?a=1  ', 'https://nathanpayne.com/x'],
  ])('reduces %s to %s', (input, expected) => {
    expect(at().scrubUrl(input)).toBe(expected);
  });

  it.each([
    'mailto:me@example.test?subject=hi',
    'tel:+15555550100',
    'data:text/plain,x?y',
    'blob:x',
  ])('leaves the non-page URL %s alone', (input) => {
    expect(at().scrubUrl(input)).toBe(input);
  });

  it('passes non-strings and the empty string through', () => {
    const gate = at();
    for (const value of [null, undefined, 42, '', true]) {
      expect(gate.scrubUrl(value)).toBe(value);
    }
  });

  it('fails closed on a URL that will not parse', () => {
    expect(at().scrubUrl('http://[::bad/x?email=a#b')).toBe('http://[::bad/x');
  });

  it('keeps every allowlisted parameter and drops every other name', () => {
    const gate = at();
    for (const name of gate.ALLOWED_QUERY_PARAMS) {
      expect(gate.scrubUrl(`https://n.test/?${name}=v`)).toBe(`https://n.test/?${name}=v`);
    }
    for (const name of [
      'email',
      'q',
      'fbclid',
      'msclkid',
      'gad_source',
      'utm_id',
      'ref',
      'token',
    ]) {
      expect(gate.scrubUrl(`https://n.test/?${name}=v`)).toBe('https://n.test/');
    }
  });
});

describe('event scrubbing: PostHog before_send (§ Capture Minimization 3–4)', () => {
  const FIXTURE_HTML = `<!doctype html><html><head><script></script></head><body>
    <p id="masked" data-np-privacy="mask">NP-CANARY-MASKED-TEXT and more</p>
    <div data-np-privacy="block"><a href="/x/">NP-CANARY-BLOCKED-TEXT</a></div>
    <form><button>Submit form</button></form>
    <a id="open" href="/blog/">All writing</a></body></html>`;

  it('scrubs every URL-bearing property, top-level and person-level', () => {
    const { gate } = boot({ url: 'https://nathanpayne.test/a/?email=x#f' });
    const out = gate.scrubEvent({
      event: '$pageview',
      properties: {
        $current_url: 'https://nathanpayne.test/a/?email=x&utm_source=s#f',
        $referrer: 'https://www.google.com/search?q=secret',
        $referring_domain: 'www.google.com',
        $host: 'nathanpayne.test',
        $pathname: '/a/',
        $session_entry_url: 'https://nathanpayne.test/a/?email=x',
        $session_entry_referrer: '$direct',
        $prev_pageview_url: 'https://nathanpayne.test/b/?q=1',
        title: 'A page',
        utm_source: 's',
        token: 'phc_test',
        $set: { $current_url: 'https://nathanpayne.test/a/?email=x' },
      },
      $set: { $current_url: 'https://nathanpayne.test/a/?email=x#f', email: 'n@nathanpayne.com' },
      $set_once: {
        $initial_current_url: 'https://nathanpayne.test/a/?email=x&gclid=g',
        $initial_referrer: 'https://news.example/?id=7',
        $initial_pathname: '/a/',
        $initial_utm_source: 's',
      },
    });
    expect(out.properties).toEqual({
      $current_url: 'https://nathanpayne.test/a/?utm_source=s',
      $referrer: 'https://www.google.com/search',
      $referring_domain: 'www.google.com',
      $host: 'nathanpayne.test',
      $pathname: '/a/',
      $session_entry_url: 'https://nathanpayne.test/a/',
      $session_entry_referrer: '$direct',
      $prev_pageview_url: 'https://nathanpayne.test/b/',
      title: 'A page',
      utm_source: 's',
      token: 'phc_test',
      $set: { $current_url: 'https://nathanpayne.test/a/' },
    });
    expect(out.$set).toEqual({
      $current_url: 'https://nathanpayne.test/a/',
      email: 'n@nathanpayne.com',
    });
    expect(out.$set_once).toEqual({
      $initial_current_url: 'https://nathanpayne.test/a/?gclid=g',
      $initial_referrer: 'https://news.example/',
      $initial_pathname: '/a/',
      $initial_utm_source: 's',
    });
  });

  it('scrubs relative URLs only under URL-named keys', () => {
    const { gate } = boot();
    const out = gate.scrubEvent({
      event: 'blog_post_nav_clicked',
      properties: { to_post_href: '/blog/next/?ref=x#c', href: '?a=1', note: '/not/a?url=1' },
    });
    expect(out.properties).toEqual({
      to_post_href: '/blog/next/',
      href: '/',
      note: '/not/a?url=1',
    });
  });

  it('merges heatmap buckets keyed by URLs that differ only in scrubbed parts', () => {
    const { gate } = boot();
    const out = gate.scrubEvent({
      event: '$$heatmap',
      properties: {
        $heatmap_data: {
          'https://nathanpayne.test/a/?email=1': [{ x: 1 }],
          'https://nathanpayne.test/a/?email=2#f': [{ x: 2 }],
          'https://nathanpayne.test/b/': [{ x: 3 }],
        },
      },
    });
    expect(out.properties.$heatmap_data).toEqual({
      'https://nathanpayne.test/a/': [{ x: 1 }, { x: 2 }],
      'https://nathanpayne.test/b/': [{ x: 3 }],
    });
  });

  it('keeps only structural attributes in $elements_chain and scrubs its hrefs', () => {
    const { gate } = boot({ html: FIXTURE_HTML });
    const chain =
      'button:attr__data-fixture-pii="NP-CANARY-ATTR@example.test"attr__id="fixture-pii-button"attr__type="button"nth-child="11"nth-of-type="1"text="Fixture button";' +
      'a.ribbon-exit.is-active:attr__class="ribbon-exit is-active"attr__href="/t/?email=NP-CANARY-QUERY%40example.test&utm_source=f#NP-CANARY-FRAGMENT"attr__style="color: red"attr__target="_blank"attr__aria-label="Go"href="/t/?email=NP-CANARY-QUERY%40example.test&utm_source=f#NP-CANARY-FRAGMENT"nth-child="2"nth-of-type="1"text="He said \\"hi\\"";' +
      'main:attr__id="privacy-fixture"attr__data-panel="about"nth-child="1"nth-of-type="1"';
    const out = gate.scrubEvent({ event: '$autocapture', properties: { $elements_chain: chain } });
    expect(out.properties.$elements_chain).toBe(
      'button:attr__id="fixture-pii-button"attr__type="button"nth-child="11"nth-of-type="1"text="Fixture button";' +
        'a.ribbon-exit.is-active:attr__class="ribbon-exit is-active"attr__href="/t/?utm_source=f"attr__aria-label="Go"href="/t/?utm_source=f"nth-child="2"nth-of-type="1"text="He said \\"hi\\"";' +
        'main:attr__id="privacy-fixture"nth-child="1"nth-of-type="1"',
    );
    expect(out.properties.$elements_chain).not.toMatch(/NP-CANARY|data-/);
  });

  it('drops an $elements_chain it cannot parse rather than send an unknown shape', () => {
    const { gate } = boot();
    for (const chain of ['no colon here', 'a:attr__id="unterminated', 'a:attr__id="x"trailing']) {
      expect(
        gate.scrubEvent({ event: '$autocapture', properties: { $elements_chain: chain } })
          .properties.$elements_chain,
      ).toBe('');
    }
  });

  it('applies the same rules to the legacy $elements array', () => {
    const { gate } = boot({ html: FIXTURE_HTML });
    const out = gate.scrubEvent({
      event: '$autocapture',
      properties: {
        $elements: [
          {
            tag_name: 'a',
            $el_text: 'All writing',
            classes: ['x'],
            attr__href: 'https://nathanpayne.test/t/?email=1#f',
            attr__class: 'x',
            'attr__data-fixture-pii': 'NP-CANARY-ATTR@example.test',
            attr__style: 'color: red',
            nth_child: 1,
            nth_of_type: 1,
          },
        ],
      },
    });
    expect(out.properties.$elements).toEqual([
      {
        tag_name: 'a',
        $el_text: 'All writing',
        classes: ['x'],
        attr__href: 'https://nathanpayne.test/t/',
        attr__class: 'x',
        nth_child: 1,
        nth_of_type: 1,
      },
    ]);
  });

  it('drops autocapture text that comes from a masked or blocked region', () => {
    const { gate } = boot({ html: FIXTURE_HTML });
    const out = gate.scrubEvent({
      event: '$rageclick',
      properties: {
        $el_text: 'NP-CANARY-MASKED-TEXT and more',
        $elements_chain:
          'p:attr__id="masked"nth-child="1"nth-of-type="1"text="NP-CANARY-MASKED-TEXT and more";' +
          'a:href="/x/"nth-child="1"nth-of-type="1"text="NP-CANARY-BLOCKED-TEXT";' +
          'button:nth-child="1"nth-of-type="1"text="Submit form";' +
          'a:attr__id="open"href="/blog/"nth-child="4"nth-of-type="2"text="All writing"',
        $elements: [{ tag_name: 'p', $el_text: 'NP-CANARY-MASKED-TEXT' }],
        $selected_content: 'MASKED-TEXT and',
      },
    });
    expect(out.properties).not.toHaveProperty('$el_text');
    expect(out.properties).not.toHaveProperty('$selected_content');
    expect(out.properties.$elements).toEqual([{ tag_name: 'p' }]);
    expect(out.properties.$elements_chain).toBe(
      'p:attr__id="masked"nth-child="1"nth-of-type="1";a:href="/x/"nth-child="1"nth-of-type="1";' +
        'button:nth-child="1"nth-of-type="1";a:attr__id="open"href="/blog/"nth-child="4"nth-of-type="2"text="All writing"',
    );
  });

  it('keeps the internal/test-traffic exclusion inputs untouched', () => {
    // Cohort 360946 ("Internal / Test users") matches person properties
    // $internal_or_test_user and email; test_account_filters read $host.
    const { gate } = boot();
    const out = gate.scrubEvent({
      event: '$set',
      properties: { $host: 'nathanpayne.com', $set: { $internal_or_test_user: true } },
      $set: { $internal_or_test_user: true, email: 'someone@nathanpayne.com' },
    });
    expect(out.properties).toEqual({
      $host: 'nathanpayne.com',
      $set: { $internal_or_test_user: true },
    });
    expect(out.$set).toEqual({ $internal_or_test_user: true, email: 'someone@nathanpayne.com' });
  });

  it('scrubs only the top level of a $snapshot and leaves the replay data alone', () => {
    const { gate } = boot();
    const data = [
      { type: 4, data: { href: 'https://nathanpayne.test/?a=1' } },
      { cv: '2024-10', data: '\u001f\u008b' },
    ];
    const out = gate.scrubEvent({
      event: '$snapshot',
      properties: {
        $snapshot_data: data,
        $session_id: 's',
        $current_url: 'https://nathanpayne.test/?a=1',
      },
    });
    expect(out.properties.$snapshot_data).toBe(data);
    expect(out.properties.$current_url).toBe('https://nathanpayne.test/');
  });

  it('drops every event once analytics are withdrawn', () => {
    const { privacy, gate } = boot();
    expect(gate.scrubEvent({ event: 'x', properties: {} })).not.toBeNull();
    privacy.set('denied');
    expect(gate.scrubEvent({ event: 'x', properties: {} })).toBeNull();
    expect(gate.scrubEvent({ event: '$snapshot', properties: {} })).toBeNull();
  });

  it('passes a malformed event through rather than throwing', () => {
    const { gate } = boot();
    expect(gate.scrubEvent(null)).toBeNull();
    expect(gate.scrubEvent({ event: 'x' })).toEqual({ event: 'x' });
  });
});

describe('replay minimization (§ Capture Minimization 1–2)', () => {
  it('uses the contract selectors', () => {
    const { gate } = boot();
    expect(gate.MASK_SELECTOR).toBe('[data-np-privacy="mask"]');
    expect(gate.BLOCK_SELECTOR).toBe('form, [data-np-privacy="block"]');
  });

  it('empties data-* values outside the rendering allowlist and scrubs navigation URLs', () => {
    const { w, gate } = boot();
    const el = (tag) => w.document.createElement(tag);
    const mask = gate.maskReplayAttribute;
    expect(mask('data-fixture-pii', 'NP-CANARY-ATTR@example.test', el('button'))).toBe('');
    expect(mask('DATA-NP-PRIVACY', 'mask', el('p'))).toBe('');
    expect(mask('data-focus', 'about', el('div'))).toBe('about');
    expect(mask('href', '/t/?email=x&utm_term=t#f', el('a'))).toBe('/t/?utm_term=t');
    expect(mask('href', 'https://n.test/?q=1', el('area'))).toBe('https://n.test/');
    expect(mask('action', '/submit?token=1', el('form'))).toBe('/submit');
    expect(mask('formaction', '/go?x=1', el('button'))).toBe('/go');
    const fonts = 'https://fonts.googleapis.com/css2?family=Inter&display=swap';
    expect(mask('href', fonts, el('link'))).toBe(fonts);
    expect(mask('src', '/img.png?v=1', el('img'))).toBe('/img.png?v=1');
    expect(mask('_cssText', 'body{color:red}', el('link'))).toBe('body{color:red}');
    expect(mask('class', 'a b', el('div'))).toBe('a b');
    expect(mask('constructor', 'x', el('div'))).toBe('x');
  });

  it('keeps only data attributes the site stylesheet actually selects on', () => {
    const css = [];
    const walk = (dir) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (/\.(css|astro)$/.test(name)) css.push(readFileSync(path, 'utf8'));
      }
    };
    walk(join(ROOT, 'src'));
    const all = css.join('\n');
    for (const attr of boot().gate.REPLAY_DATA_ATTRIBUTES) {
      expect(all, `${attr} is not a selector anywhere under src/`).toContain(`[${attr}`);
    }
  });

  it('scrubs the URL of a captured request and of replay metadata without mutating its input', () => {
    const { gate } = boot();
    const request = {
      name: 'https://nathanpayne.test/?email=x#f',
      initiatorType: 'fetch',
      duration: 3,
    };
    expect(gate.maskNetworkRequest(request)).toEqual({
      name: 'https://nathanpayne.test/',
      initiatorType: 'fetch',
      duration: 3,
    });
    expect(request.name).toBe('https://nathanpayne.test/?email=x#f');
    expect(gate.maskNetworkRequest({ name: '/privacy/?a=1' })).toEqual({ name: '/privacy/' });
    expect(gate.maskNetworkRequest(null)).toBeNull();
  });

  it.each([
    ['/privacy/', true],
    ['/privacy', true],
    ['/privacy/anything/deeper/', true],
    ['https://nathanpayne.test/privacy/?a=1#b', true],
    ['/%70rivacy/', true],
    ['/', false],
    ['/privacy-policy/', false],
    ['/blog/privacy/', false],
    ['/test-fixtures/privacy/', false],
  ])('treats %s as replay-excluded: %s', (path, expected) => {
    expect(boot().gate.isReplayExcluded(path)).toBe(expected);
  });

  it('reports every client-side navigation, before and after pushState', () => {
    const { w, gate } = boot({ url: 'https://nathanpayne.test/a/' });
    const seen = [];
    gate.onNavigate((url, phase) => seen.push(`${phase} ${new URL(url).pathname}`));
    w.history.pushState({}, '', '/privacy/');
    w.history.replaceState({}, '', '/b/');
    w.history.pushState({}, '');
    w.dispatchEvent(new w.PopStateEvent('popstate'));
    w.dispatchEvent(new w.HashChangeEvent('hashchange'));
    w.dispatchEvent(new w.PageTransitionEvent('pageshow', { persisted: true }));
    w.dispatchEvent(new w.PageTransitionEvent('pageshow', { persisted: false }));
    expect(seen).toEqual([
      'before /privacy/',
      'after /privacy/',
      'before /b/',
      'after /b/',
      'after /b/',
      'after /b/',
      'after /b/',
      'after /b/',
    ]);
  });
});

describe('flag-on PostHog block', () => {
  const runPostHog = (opts = {}) => {
    const env = boot(opts);
    runDefineVars(env.w, { token: 'phc_unit_test' }, POSTHOG_ON);
    const arrayJs = env.w.document.querySelectorAll('script[src$="/static/array.js"]');
    const init = env.w.posthog && env.w.posthog._i && env.w.posthog._i[0];
    return { ...env, arrayJs, init, config: init && init[1] };
  };

  it('initializes with the unchanged settings plus the privacy options when granted', () => {
    const { arrayJs, config, gate, privacy } = runPostHog();
    expect(arrayJs).toHaveLength(1);
    expect(arrayJs[0].src).toBe('https://d.nathanpayne.com/static/array.js');
    expect(config).toMatchObject({
      api_host: 'https://d.nathanpayne.com',
      ui_host: 'https://us.posthog.com',
      defaults: '2026-01-30',
      person_profiles: 'always',
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-np-privacy="mask"]',
        blockSelector: 'form, [data-np-privacy="block"]',
        recordHeaders: false,
        recordBody: false,
      },
    });
    expect(config.before_send[0]).toBe(gate.scrubEvent);
    expect(config.before_send).toHaveLength(2);
    expect(config.session_recording.maskAttributeFn).toBe(gate.maskReplayAttribute);
    expect(config.session_recording.maskCapturedNetworkRequestFn).toBe(gate.maskNetworkRequest);
    expect(privacy.get().loadedThisPage).toBe(true);
  });

  it('keeps the same unchanged settings as the flag-off block', () => {
    for (const setting of [
      "api_host: 'https://d.nathanpayne.com'",
      "ui_host: 'https://us.posthog.com'",
      "defaults: '2026-01-30'",
      "person_profiles: 'always'",
    ]) {
      expect(POSTHOG_ON).toContain(setting);
    }
    expect(POSTHOG_ON).not.toMatch(/^\s*person_profiles:\s*'identified_only'/m);
  });

  it.each([
    ['a saved opt-out', { stored: JSON.stringify({ v: 1, choice: 'denied' }) }],
    ['GPC', { gpc: true }],
  ])('creates no script element and no global under %s', (_label, opts) => {
    const { w, arrayJs } = runPostHog(opts);
    expect(arrayJs).toHaveLength(0);
    expect(w.posthog).toBeUndefined();
  });

  it('fails closed when the gate is missing', () => {
    const { w, arrayJs } = runPostHog({ runGate: false });
    expect(arrayJs).toHaveLength(0);
    expect(w.posthog).toBeUndefined();
  });

  it.each(['http://localhost:4321/', 'http://127.0.0.1/', 'http://preview.localhost/'])(
    'keeps the local-host skip on %s',
    (url) => {
      const { w, arrayJs } = runPostHog({ url });
      expect(arrayJs).toHaveLength(0);
      expect(w.posthog).toBeUndefined();
    },
  );

  it('starts with replay off on an excluded path', () => {
    expect(
      runPostHog({ url: 'https://nathanpayne.test/privacy/' }).config.disable_session_recording,
    ).toBe(true);
  });

  it('withdraws through the documented calls, even before array.js loads', () => {
    const { w, privacy } = runPostHog();
    privacy.set('denied');
    const queued = [...w.posthog].map((call) => call[0]);
    expect(queued).toEqual(['opt_out_capturing', 'set_config']);
    expect(w.posthog[1][1]).toEqual({ disable_session_recording: true });
  });

  it('stops replay before navigating to an excluded path and restarts after leaving it', () => {
    const { w } = runPostHog({ url: 'https://nathanpayne.test/a/' });
    const calls = [];
    w.posthog.stopSessionRecording = () => calls.push('stop');
    w.posthog.startSessionRecording = (arg) => calls.push(`start:${arg}`);
    w.history.pushState({}, '', '/privacy/');
    w.history.pushState({}, '', '/privacy/more/');
    w.history.pushState({}, '', '/b/');
    expect(calls).toEqual(['stop', 'start:undefined']);
  });

  it('clears an SDK opt-out left by an earlier withdrawal, but not one from this page', () => {
    const { w, config, privacy } = runPostHog();
    const sdk = { cleared: 0, has_opted_out_capturing: () => true, get_property: () => undefined };
    sdk.clear_opt_in_out_capturing = () => (sdk.cleared += 1);
    config.loaded(sdk);
    expect(sdk.cleared).toBe(1);
    privacy.set('denied');
    config.loaded(sdk);
    expect(sdk.cleared).toBe(1);
    expect(w.posthog).toBeDefined();
  });

  it('keeps the first URL and referrer the SDK persists in its cookie scrubbed', () => {
    const { w, config } = runPostHog();
    const fakeSdk = (info) => {
      const sdk = { registered: [], has_opted_out_capturing: () => false };
      sdk.get_property = (key) => (key === '$initial_person_info' ? info : undefined);
      sdk.register = (props) => sdk.registered.push(props);
      return sdk;
    };
    const dirty = fakeSdk({
      r: 'https://news.example/item?id=7#c',
      u: 'https://nathanpayne.test/a/?email=x&utm_source=s#f',
    });
    config.loaded(dirty);
    expect(dirty.registered).toEqual([
      {
        $initial_person_info: {
          r: 'https://news.example/item',
          u: 'https://nathanpayne.test/a/?utm_source=s',
        },
      },
    ]);
    const clean = fakeSdk({ r: '$direct', u: 'https://nathanpayne.test/a/' });
    config.loaded(clean);
    expect(clean.registered).toEqual([]);
    // The before_send step does the same against the live instance, and
    // passes the event through untouched.
    const live = fakeSdk({ r: '$direct', u: 'https://nathanpayne.test/?q=1' });
    w.posthog = live;
    const event = { event: '$pageview', properties: {} };
    expect(config.before_send[1](event)).toBe(event);
    expect(live.registered).toEqual([
      { $initial_person_info: { r: '$direct', u: 'https://nathanpayne.test/' } },
    ]);
  });
});

describe('flag-on GA4 block', () => {
  const runGa = (opts = {}) => {
    const env = boot(opts);
    runDefineVars(env.w, { gaId: 'G-UNITTEST01' }, GA_ON);
    const loaders = env.w.document.querySelectorAll(
      'script[src^="https://www.googletagmanager.com/gtag/js"]',
    );
    return { ...env, loaders };
  };

  it('creates the loader and scrubs page_location and page_referrer when granted', () => {
    const html = BASE_HTML;
    const env = new JSDOM(html, {
      url: 'https://nathanpayne.test/a/?email=x&utm_source=s#f',
      referrer: 'https://news.example/item?id=7#c',
      runScripts: 'outside-only',
    });
    const w = env.window;
    w.Response = Response;
    w.fetch = () => Promise.resolve(new Response('ok'));
    w.eval(GATE_SRC);
    runDefineVars(w, { gaId: 'G-UNITTEST01' }, GA_ON);
    const loaders = w.document.querySelectorAll(
      'script[src^="https://www.googletagmanager.com/gtag/js"]',
    );
    expect(loaders).toHaveLength(1);
    expect(loaders[0].src).toBe('https://www.googletagmanager.com/gtag/js?id=G-UNITTEST01');
    expect(loaders[0].async).toBe(true);
    expect(typeof w.gtag).toBe('function');
    const config = [...w.dataLayer].find((args) => args[0] === 'config');
    expect(config[1]).toBe('G-UNITTEST01');
    expect(config[2]).toMatchObject({
      page_location: 'https://nathanpayne.test/a/?utm_source=s',
      page_referrer: 'https://news.example/item',
    });
    w.history.pushState({}, '', '/b/?email=y');
    const set = [...w.dataLayer].filter((args) => args[0] === 'set');
    expect(set.at(-1)[1]).toEqual({ page_location: 'https://nathanpayne.test/b/' });
  });

  it.each([
    ['a saved opt-out', { stored: JSON.stringify({ v: 1, choice: 'denied' }) }],
    ['GPC', { gpc: true }],
    ['a missing gate', { runGate: false }],
  ])('creates no loader, no gtag, and no dataLayer under %s', (_label, opts) => {
    const { w, loaders } = runGa(opts);
    expect(loaders).toHaveLength(0);
    expect(w.gtag).toBeUndefined();
    expect(w.dataLayer).toBeUndefined();
  });

  it('sets ga-disable for the measurement ID on withdrawal', () => {
    const { w, privacy } = runGa();
    expect(w['ga-disable-G-UNITTEST01']).toBeUndefined();
    privacy.set('denied');
    expect(w['ga-disable-G-UNITTEST01']).toBe(true);
  });

  it('keeps the flag-off GA markup verbatim as the first branch', () => {
    const offStart = LAYOUT_SRC.indexOf('{gaId && (!privacyEnabled ? (');
    expect(offStart).toBeGreaterThan(-1);
    const off = LAYOUT_SRC.slice(offStart, LAYOUT_SRC.indexOf(') : (', offStart));
    expect(off).toContain(
      '<script async is:inline src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}></script>',
    );
    expect(off).toContain('page_location: window.location.href');
  });
});
