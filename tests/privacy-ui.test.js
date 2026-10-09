// @vitest-environment node
//
// #1079 / #1229 privacy notice, controls, footer link, and /privacy/ page
// (specs/analytics-privacy.md § UI Hooks). Contract criteria this file
// speaks to: PRIV-10 (GPC state in the controls), PRIV-11 (no placeholder or
// unverified claim in the copy), PRIV-14 (non-modal, dismissible, dismissing
// is not a choice, opt-out is one step), and the UI-side half of PRIV-6.
//
// The behaviour tests run the gate's exact source (src/lib/privacy/gate.js)
// and the exact UI scripts (src/components/privacy/ui/*.js) in a fresh JSDOM
// window around the components' static markup, so what is tested is what the
// components inline. Rendering, layout, focus order, reduced motion, and axe
// are checked in a real browser by tests/privacy-ui/ui.pw.ts.

import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { parseFrontmatter } from '../scripts/lib/parse-frontmatter.mjs';
import { SITE_COPY_SCHEMAS } from '../src/lib/site-copy-schema.ts';

const ROOT = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

const GATE_SRC = read('src/lib/privacy/gate.js');
const NOTICE_SRC = read('src/components/privacy/ui/notice.js');
const CONTROLS_SRC = read('src/components/privacy/ui/controls.js');
const NOTICE_ASTRO = read('src/components/privacy/ui/PrivacyNotice.astro');
const CONTROLS_ASTRO = read('src/components/privacy/ui/PrivacyControls.astro');
const LINK_ASTRO = read('src/components/privacy/ui/PrivacyLink.astro');
const BODY_ASTRO = read('src/components/privacy/PrivacyBody.astro');
const PAGE_ASTRO = read('src/pages/privacy/[...index].astro');

/** The template half of an .astro source: the frontmatter is JS whose comments mention tags in prose. */
const templateHalf = (source) => source.split(/^---$/m).slice(2).join('---');

/**
 * Removes every match of `pattern`, repeating until nothing changes, so that
 * removing one occurrence cannot leave another assembled from its pieces.
 */
function removeAll(text, pattern) {
  let previous;
  let current = text;
  do {
    previous = current;
    current = current.replace(pattern, '');
  } while (current !== previous);
  return current;
}

/** The template half, without its inline style and script (any case). */
function template(source) {
  let body = templateHalf(source);
  body = removeAll(body, /<style\b[\s\S]*?<\/style\b[^>]*>/gi);
  body = removeAll(body, /<script\b[^>]*\/>/gi);
  body = removeAll(body, /<script\b[\s\S]*?<\/script\b[^>]*>/gi);
  return body;
}

const NOTICE_HTML = template(NOTICE_ASTRO);
const CONTROLS_HTML = template(CONTROLS_ASTRO);
const PAGE_TEMPLATE = template(PAGE_ASTRO);

/**
 * A fresh window with the gate booted, as tests/privacy-runtime.test.js does
 * it, then the component markup mounted and its script run.
 */
function mount(html, { stored, gpc, storage = 'ok', script, runGate = true } = {}) {
  const dom = new JSDOM(
    '<!doctype html><html><head></head><body><main><a href="/">Home</a></main></body></html>',
    {
      url: 'https://nathanpayne.test/blog/',
      runScripts: 'outside-only',
    },
  );
  const w = dom.window;
  if (stored !== undefined) w.localStorage.setItem('np-privacy', stored);
  if (gpc !== undefined) {
    Object.defineProperty(w.navigator, 'globalPrivacyControl', { value: gpc, configurable: true });
  }
  if (storage === 'write-throws') {
    w.Storage.prototype.setItem = function () {
      throw new w.DOMException('full', 'QuotaExceededError');
    };
  }
  if (runGate) w.eval(GATE_SRC);
  w.document.body.insertAdjacentHTML('beforeend', html);
  w.eval(script);
  return { w, d: w.document, privacy: w.npPrivacy };
}

const mountNotice = (options) => mount(NOTICE_HTML, { ...options, script: NOTICE_SRC });
const mountControls = (options) => mount(CONTROLS_HTML, { ...options, script: CONTROLS_SRC });

const stored = (w) => JSON.parse(w.localStorage.getItem('np-privacy') ?? 'null');
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const otherTabWrites = (w, value) => {
  w.localStorage.setItem('np-privacy', JSON.stringify(value));
  w.dispatchEvent(new w.StorageEvent('storage', { key: 'np-privacy' }));
};

describe('the UI scripts talk to window.npPrivacy and nothing else', () => {
  for (const [name, src] of [
    ['notice.js', NOTICE_SRC],
    ['controls.js', CONTROLS_SRC],
  ]) {
    it(`${name} touches no analytics global, network, or storage API`, () => {
      expect(src).toContain('w.npPrivacy');
      expect(src).not.toMatch(
        /posthog|gtag|dataLayer|\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|document\.cookie|indexedDB/,
      );
      // Inlined into HTML verbatim: no markup that would end the script early.
      expect(src).not.toMatch(/<\/?script|<!--/i);
    });
  }

  it('is inlined verbatim, one classic script per component, with inline styles', () => {
    for (const [astro, file] of [
      [NOTICE_ASTRO, 'notice.js'],
      [CONTROLS_ASTRO, 'controls.js'],
    ]) {
      expect(astro).toContain(`from './${file}?raw';`);
      const markup = templateHalf(astro);
      expect(markup.match(/<script\b/g)).toHaveLength(1);
      expect(markup).toMatch(/<script is:inline set:html=\{\w+Source\} \/>/);
      // A hoisted <style> or <script> is bundled by import graph and would
      // reach a flag-off build; inline ones exist only where rendered.
      expect(markup.match(/<style\b/g)).toHaveLength(1);
      expect(markup).toContain('<style is:inline>');
    }
    expect(BODY_ASTRO).toContain('<PrivacyNotice />');
  });
});

describe('notice (PRIV-14, PRIV-6)', () => {
  it('shows on a first visit as a labelled, non-modal aside in flow at the top of the body', () => {
    const { d, privacy } = mountNotice();
    const notice = d.getElementById('np-privacy-notice');
    expect(privacy.notice.shouldShow()).toBe(true);
    expect(notice.hidden).toBe(false);
    expect(notice.tagName).toBe('ASIDE');
    expect(notice.getAttribute('data-np-privacy-ui')).toBe('notice');
    expect(notice.getAttribute('role')).toBeNull();
    expect(notice.hasAttribute('aria-modal')).toBe(false);
    const title = d.getElementById(notice.getAttribute('aria-labelledby'));
    expect(title.textContent.trim()).toBe('Analytics on this site');
    // In the document flow above the page content, never over it.
    expect(d.body.firstElementChild).toBe(notice);
    expect(notice.nextElementSibling).toBe(d.getElementById('np-privacy-notice-status'));
    expect(d.querySelector('main').previousElementSibling).toBe(notice.nextElementSibling);
    // Nothing took focus.
    expect(d.activeElement).toBe(d.body);
    // The hooks the contract names, and the plain-language vendor names.
    expect(notice.querySelector('[data-np-privacy-action="deny"]').type).toBe('button');
    expect(notice.querySelector('[data-np-privacy-action="dismiss"]').type).toBe('button');
    expect(notice.querySelector('a[href="/privacy/"]')).not.toBeNull();
    const text = notice.textContent.replace(/\s+/g, ' ');
    expect(text).toContain('PostHog');
    expect(text).toContain('session replay');
    expect(text).toContain('Google Analytics');
  });

  it('turns analytics off in one step, saves the choice, closes, and announces', () => {
    const { w, d, privacy } = mountNotice();
    const deny = d.querySelector('[data-np-privacy-action="deny"]');
    deny.focus();
    click(w, deny);
    expect(stored(w)).toEqual({ v: 1, choice: 'denied', noticeDismissed: false });
    expect(privacy.get()).toMatchObject({ saved: 'denied', effective: 'denied', reason: 'choice' });
    expect(d.documentElement.getAttribute('data-np-privacy')).toBe('denied');
    expect(d.getElementById('np-privacy-notice').hidden).toBe(true);
    const status = d.getElementById('np-privacy-notice-status');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.textContent).toBe(
      'PostHog and Google Analytics are off for this site in this browser.',
    );
    expect(d.activeElement).toBe(status);
  });

  it('dismissing is not a choice: the saved choice stays unset and analytics stay on', () => {
    const { w, d, privacy } = mountNotice();
    click(w, d.querySelector('[data-np-privacy-action="dismiss"]'));
    expect(stored(w)).toEqual({ v: 1, choice: 'unset', noticeDismissed: true });
    expect(privacy.get()).toMatchObject({
      saved: 'unset',
      effective: 'granted',
      reason: 'default',
    });
    expect(privacy.notice.shouldShow()).toBe(false);
    expect(d.getElementById('np-privacy-notice').hidden).toBe(true);
    expect(d.getElementById('np-privacy-notice-status').textContent).toContain('Notice dismissed');
  });

  it('says a dismissal applies only to this page when it could not be saved', () => {
    const { w, d, privacy } = mountNotice({ storage: 'write-throws' });
    click(w, d.querySelector('[data-np-privacy-action="dismiss"]'));
    expect(privacy.get()).toMatchObject({ saved: 'unset', persisted: false });
    expect(d.getElementById('np-privacy-notice-status').textContent).toContain(
      'Your browser did not save that, so it may appear again on the next page.',
    );
  });

  it('Escape dismisses without making a choice', () => {
    const { w, d } = mountNotice();
    const notice = d.getElementById('np-privacy-notice');
    notice.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(notice.hidden).toBe(true);
    expect(stored(w)).toEqual({ v: 1, choice: 'unset', noticeDismissed: true });
  });

  it('stays hidden once a choice is saved, once dismissed, and while GPC is active', () => {
    const saved = (choice, noticeDismissed = false) =>
      JSON.stringify({ v: 1, choice, noticeDismissed });
    for (const options of [
      { stored: saved('denied') },
      { stored: saved('granted') },
      { stored: saved('unset', true) },
      { gpc: true },
    ]) {
      const { d, privacy } = mountNotice(options);
      expect(privacy.notice.shouldShow(), JSON.stringify(options)).toBe(false);
      expect(d.getElementById('np-privacy-notice').hidden, JSON.stringify(options)).toBe(true);
    }
  });

  it('closes when another tab makes the choice', () => {
    const { w, d } = mountNotice();
    const notice = d.getElementById('np-privacy-notice');
    expect(notice.hidden).toBe(false);
    otherTabWrites(w, { v: 1, choice: 'denied', noticeDismissed: false });
    expect(notice.hidden).toBe(true);
  });

  it('never announces a local action as coming from another tab', async () => {
    const { w, d } = mountNotice();
    const status = d.getElementById('np-privacy-notice-status');
    const texts = [];
    new w.MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) texts.push(node.textContent);
      }
    }).observe(status, { childList: true, characterData: true, subtree: true });
    const deny = d.querySelector('[data-np-privacy-action="deny"]');
    deny.focus();
    click(w, deny);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(texts.join(' | ')).not.toContain('closed because your setting changed');
    expect(status.textContent).toBe(
      'PostHog and Google Analytics are off for this site in this browser.',
    );
    expect(d.activeElement).toBe(status);
  });

  it('moves focus to the announcement when another tab closes the notice under it', () => {
    const { w, d } = mountNotice();
    const notice = d.getElementById('np-privacy-notice');
    notice.querySelector('[data-np-privacy-action="dismiss"]').focus();
    expect(notice.contains(d.activeElement)).toBe(true);
    otherTabWrites(w, { v: 1, choice: 'denied', noticeDismissed: false });
    expect(notice.hidden).toBe(true);
    expect(d.activeElement).toBe(d.getElementById('np-privacy-notice-status'));
    expect(d.activeElement.textContent).toBe(
      'The privacy notice closed because your setting changed.',
    );
  });

  it('drops a stale announcement when another tab brings the notice back (#1258)', () => {
    const { w, d } = mountNotice();
    const notice = d.getElementById('np-privacy-notice');
    const status = d.getElementById('np-privacy-notice-status');
    click(w, notice.querySelector('[data-np-privacy-action="dismiss"]'));
    expect(notice.hidden).toBe(true);
    expect(status.textContent).toContain('Notice dismissed');
    // Another tab clears the saved setting: the notice shows again.
    w.localStorage.removeItem('np-privacy');
    w.dispatchEvent(new w.StorageEvent('storage', { key: 'np-privacy' }));
    expect(notice.hidden).toBe(false);
    expect(status.textContent).toBe('');
  });

  it('keeps an unsaved dismissal and its announcement consistent after a back/forward restore (#1258)', () => {
    const { w, d } = mountNotice({ storage: 'write-throws' });
    const notice = d.getElementById('np-privacy-notice');
    const status = d.getElementById('np-privacy-notice-status');
    click(w, notice.querySelector('[data-np-privacy-action="dismiss"]'));
    w.dispatchEvent(new w.PageTransitionEvent('pageshow', { persisted: true }));
    expect(notice.hidden).toBe(true);
    expect(status.textContent).toContain('Notice dismissed for this page');
  });

  it('says so when the choice could not be saved', () => {
    const { w, d, privacy } = mountNotice({ storage: 'write-throws' });
    click(w, d.querySelector('[data-np-privacy-action="deny"]'));
    expect(privacy.get()).toMatchObject({ effective: 'denied', persisted: false });
    expect(d.getElementById('np-privacy-notice').hidden).toBe(true);
    expect(d.getElementById('np-privacy-notice-status').textContent).toContain(
      'applies only to this page',
    );
  });

  it('stays hidden when the gate is missing, rather than offering controls that do nothing', () => {
    const { d } = mountNotice({ runGate: false });
    expect(d.getElementById('np-privacy-notice').hidden).toBe(true);
  });

  it('stays hidden on the page that carries the controls, without counting as dismissed', () => {
    const { d, privacy } = mount(CONTROLS_HTML + NOTICE_HTML, { script: NOTICE_SRC });
    expect(privacy.notice.shouldShow()).toBe(true);
    expect(d.getElementById('np-privacy-notice').hidden).toBe(true);
  });
});

describe('controls (PRIV-10, PRIV-14)', () => {
  const statusOf = (d) => d.querySelector('[data-np-privacy-ui="status"]').textContent.trim();

  it('carries the contract hooks and a polite, atomic live status', () => {
    const { d } = mountControls();
    const root = d.getElementById('np-privacy-controls');
    expect(root.tagName).toBe('SECTION');
    expect(root.getAttribute('data-np-privacy-ui')).toBe('controls');
    expect(d.getElementById(root.getAttribute('aria-labelledby')).textContent.trim()).toBe(
      'Your choices',
    );
    const status = root.querySelector('[data-np-privacy-ui="status"]');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(root.querySelector('[data-np-privacy-ui="gpc-explanation"]')).not.toBeNull();
    expect(root.querySelector('[data-np-privacy-action="deny"]').type).toBe('button');
    expect(root.querySelector('[data-np-privacy-action="grant"]').type).toBe('button');
    const covers = root.textContent.replace(/\s+/g, ' ');
    expect(covers).toContain('PostHog, including session replay, and Google Analytics 4');
    expect(covers).toContain('data already sent');
    expect(covers).toContain('next page you load');
  });

  it('states the default state plainly, with both buttons available and no GPC marks', () => {
    const { d } = mountControls();
    expect(statusOf(d)).toBe(
      'Analytics are on. You have not made a choice, so they run by default.',
    );
    const root = d.getElementById('np-privacy-controls');
    expect(root.hasAttribute('data-np-privacy-gpc')).toBe(false);
    expect(root.querySelector('[data-np-privacy-ui="gpc-explanation"]').hidden).toBe(true);
    expect(root.querySelector('[data-np-privacy-action="deny"]').disabled).toBe(false);
    expect(root.querySelector('[data-np-privacy-action="grant"]').disabled).toBe(false);
  });

  it('opts out in one click and re-enables in one click, saying collection resumes on the next load', () => {
    const { w, d, privacy } = mountControls();
    click(w, d.querySelector('[data-np-privacy-action="deny"]'));
    expect(stored(w).choice).toBe('denied');
    expect(privacy.get().effective).toBe('denied');
    expect(statusOf(d)).toBe('Analytics are off. You turned them off.');
    click(w, d.querySelector('[data-np-privacy-action="grant"]'));
    expect(stored(w).choice).toBe('granted');
    expect(privacy.get().effective).toBe('granted');
    expect(statusOf(d)).toBe(
      'You turned analytics back on. They stay off on this page and start on the next page you load.',
    );
  });

  it('on a load with a saved choice, states that choice and no resume note', () => {
    const denied = mountControls({ stored: JSON.stringify({ v: 1, choice: 'denied' }) });
    expect(statusOf(denied.d)).toBe('Analytics are off. You turned them off.');
    const granted = mountControls({ stored: JSON.stringify({ v: 1, choice: 'granted' }) });
    expect(statusOf(granted.d)).toBe('Analytics are on. You turned them on.');
    // Re-enabling after a denied load is the case the note exists for.
    click(denied.w, denied.d.querySelector('[data-np-privacy-action="grant"]'));
    expect(statusOf(denied.d)).toBe(
      'You turned analytics back on. They stay off on this page and start on the next page you load.',
    );
  });

  it('never says analytics are on while a re-enable waits for the next load (#1252)', () => {
    // Another tab clears the saved denial: the default applies again, but
    // nothing restarts on this page.
    const { w, d, privacy } = mountControls({
      stored: JSON.stringify({ v: 1, choice: 'denied', noticeDismissed: false }),
    });
    otherTabWrites(w, { v: 1, choice: 'unset', noticeDismissed: false });
    expect(privacy.get()).toMatchObject({ effective: 'granted', reason: 'default' });
    expect(statusOf(d)).toBe(
      'No choice is saved now, so analytics run by default. They stay off on this page and start on the next page you load.',
    );
    // And a local re-enable after a local opt-out.
    const local = mountControls();
    click(local.w, local.d.querySelector('[data-np-privacy-action="deny"]'));
    click(local.w, local.d.querySelector('[data-np-privacy-action="grant"]'));
    for (const text of [statusOf(d), statusOf(local.d)]) {
      expect(text).not.toMatch(/^Analytics are on/);
      expect(text).toContain('stay off on this page');
    }
  });

  it('with GPC active, shows why analytics are off and makes re-enabling unavailable', () => {
    const { w, d, privacy } = mountControls({ gpc: true });
    const root = d.getElementById('np-privacy-controls');
    const grant = root.querySelector('[data-np-privacy-action="grant"]');
    const note = root.querySelector('[data-np-privacy-ui="gpc-explanation"]');
    expect(root.hasAttribute('data-np-privacy-gpc')).toBe(true);
    expect(grant.disabled).toBe(true);
    expect(grant.getAttribute('aria-describedby')).toBe(note.id);
    expect(note.hidden).toBe(false);
    expect(note.textContent).toContain('your browser sends Global Privacy Control');
    expect(statusOf(d)).toBe(
      'Analytics are off because your browser sends Global Privacy Control.',
    );
    // The grant is rejected by the gate; nothing changes.
    click(w, grant);
    expect(privacy.get()).toMatchObject({ saved: 'unset', effective: 'denied', reason: 'gpc' });
    // A denial is still accepted and saved, so it outlives the signal.
    click(w, root.querySelector('[data-np-privacy-action="deny"]'));
    expect(stored(w).choice).toBe('denied');
    expect(statusOf(d)).toContain('they stay off if your browser stops sending the signal');
  });

  it('says so when the choice could not be saved', () => {
    const { w, d, privacy } = mountControls({ storage: 'write-throws' });
    click(w, d.querySelector('[data-np-privacy-action="deny"]'));
    expect(privacy.get()).toMatchObject({ effective: 'denied', persisted: false });
    expect(statusOf(d)).toBe(
      'Analytics are off. You turned them off. Your browser did not save this choice, so it applies only to this page.',
    );
  });

  it('does not promise the next load when a grant after a saved denial could not be saved (#1248)', () => {
    const { w, d, privacy } = mountControls({
      stored: JSON.stringify({ v: 1, choice: 'denied', noticeDismissed: false }),
      storage: 'write-throws',
    });
    click(w, d.querySelector('[data-np-privacy-action="grant"]'));
    expect(privacy.get()).toMatchObject({ effective: 'granted', persisted: false });
    expect(stored(w).choice).toBe('denied');
    expect(statusOf(d)).toBe(
      'Your browser did not save this choice, so it applies only to this page, and analytics did not load on this page. The next page you load uses whatever setting your browser last saved.',
    );
    expect(statusOf(d)).not.toMatch(/stay off|start on the next page/);
  });

  it('predicts nothing about the next load when a re-enable after an unsaved opt-out fails', () => {
    // Nothing was ever saved: the next load reads unset and runs analytics,
    // so the status must not claim they stay off.
    const { w, d, privacy } = mountControls({ storage: 'write-throws' });
    click(w, d.querySelector('[data-np-privacy-action="deny"]'));
    click(w, d.querySelector('[data-np-privacy-action="grant"]'));
    expect(privacy.get()).toMatchObject({ effective: 'granted', persisted: false });
    expect(statusOf(d)).toContain('uses whatever setting your browser last saved');
    expect(statusOf(d)).not.toMatch(/stay off|start on the next page/);
  });

  it('does not say analytics never loaded when they loaded at boot and a re-enable could not be saved', () => {
    // Booted unset or granted: the tools loaded, then a withdrawal stopped
    // them. A failed re-enable must not claim they did not load on this page.
    for (const stored of [undefined, JSON.stringify({ v: 1, choice: 'granted' })]) {
      const { w, d, privacy } = mountControls({ stored, storage: 'write-throws' });
      // An analytics block registers its tool at boot, as BaseLayout's do.
      privacy[Symbol.for('np-privacy.internal')].registerTool('t', { stop() {} });
      expect(privacy.get().loadedThisPage).toBe(true);
      click(w, d.querySelector('[data-np-privacy-action="deny"]'));
      click(w, d.querySelector('[data-np-privacy-action="grant"]'));
      expect(privacy.get()).toMatchObject({ effective: 'granted', persisted: false });
      expect(statusOf(d)).toBe(
        'Your browser did not save this choice, so it applies only to this page. Analytics stopped on this page when you turned them off and do not restart here. The next page you load uses whatever setting your browser last saved.',
      );
      expect(statusOf(d)).not.toContain('did not load');
    }
  });

  it('ships the status and buttons hidden, for visitors without JavaScript, and reveals them', () => {
    expect(CONTROLS_ASTRO).toMatch(/data-np-privacy-ui="status"[^>]*\bhidden\b/);
    expect(CONTROLS_ASTRO).toMatch(/class="privacy-controls__actions"[^>]*\bhidden\b/);
    expect(CONTROLS_ASTRO).toMatch(/\.privacy-controls \[hidden\]\s*\{\s*display: none;/);
    const { d } = mountControls();
    expect(d.querySelector('[data-np-privacy-ui="status"]').hidden).toBe(false);
    expect(d.querySelector('[data-np-privacy-action="deny"]').parentNode.hidden).toBe(false);
  });

  it('does not promise a GPC-surviving opt-out when the denial could not be saved', () => {
    const { w, d, privacy } = mountControls({ gpc: true, storage: 'write-throws' });
    click(w, d.querySelector('[data-np-privacy-action="deny"]'));
    expect(privacy.get()).toMatchObject({ saved: 'denied', persisted: false, reason: 'gpc' });
    expect(statusOf(d)).not.toContain('stay off if your browser stops sending the signal');
    expect(statusOf(d)).toContain('Your browser did not save this choice');
  });

  it('follows a choice made in another tab', () => {
    const { w, d } = mountControls();
    otherTabWrites(w, { v: 1, choice: 'denied', noticeDismissed: false });
    expect(statusOf(d)).toBe('Analytics are off. You turned them off.');
  });
});

describe('/privacy/ page and footer link (PRIV-11, PRIV-15)', () => {
  it('is prerendered and routed only when the flag is on, from site-copy', () => {
    expect(PAGE_ASTRO).toContain('export const prerender = true;');
    expect(PAGE_ASTRO).toMatch(
      /privacyControlsEnabled\(\)\s*\?\s*\[\{ params: \{ index: undefined \} \}\]\s*:\s*\[\]/,
    );
    expect(PAGE_ASTRO).toContain("getSiteCopy('privacy')");
    expect(PAGE_ASTRO).toContain('<PrivacyControls />');
    expect(PAGE_ASTRO).toContain("import { getEntry } from 'astro:content';");
  });

  it('has a privacy site-copy entry that matches its own strict schema', () => {
    const data = parseFrontmatter(read('src/content/site-copy/privacy.md'));
    const parsed = SITE_COPY_SCHEMAS.privacy.safeParse(data);
    expect(parsed.success, parsed.success ? '' : parsed.error.message).toBe(true);
    expect(Object.keys(parsed.data).sort()).toEqual(['description', 'ogDescription']);
    // The deck and the metadata read the owner; the template retypes neither.
    for (const value of Object.values(data)) expect(PAGE_TEMPLATE).not.toContain(value);
  });

  it('ships no placeholder and no claim of anonymity, compliance, or sale', () => {
    for (const [name, text] of [
      ['PrivacyNotice', NOTICE_HTML],
      ['PrivacyControls', CONTROLS_HTML],
      ['/privacy/', PAGE_TEMPLATE],
    ]) {
      expect(text, name).not.toMatch(/\{\{|INVENTORY:|TODO|TBD|XXX/);
      expect(text, name).not.toMatch(/anonym|complian|GDPR|CCPA|\bsold\b|\bsell\b|lawful|legal/i);
    }
  });

  it('states retention only as the inventory verified it', () => {
    expect(PAGE_TEMPLATE).toContain('PostHog session recordings: 30 days.');
    const days = new Set([...PAGE_TEMPLATE.matchAll(/\b(\d+) days\b/g)].map((m) => m[1]));
    // 30 (replay; Firebase's default log retention), 365 (PostHog and Mux
    // cookies), 400 (Chrome's cap on _ga), 7 (Cloudflare Web Analytics raw
    // data) and 100 (Mux view data), the last three as vendor statements the
    // inventory records. Any other number is unsourced.
    expect([...days].sort()).toEqual(['100', '30', '365', '400', '7']);
    expect(PAGE_TEMPLATE).toContain(
      "are set in each vendor's account, were not verified, and are not stated here",
    );
  });

  it('covers every section the contract names', () => {
    for (const id of ['collected', 'recipients', 'why', 'retention', 'gpc', 'limits', 'contact']) {
      expect(PAGE_TEMPLATE, id).toContain(`id="${id}"`);
    }
    for (const name of [
      'Cloudflare Web Analytics',
      'Network Error Logging',
      'Firebase Hosting',
      'Google Fonts',
      'Logo.dev',
      'Mux',
      'GitHub',
    ]) {
      expect(PAGE_TEMPLATE, name).toContain(name);
    }
    expect(PAGE_TEMPLATE).toContain('Session replay is off on this page.');
  });

  it('renders the footer link through one self-gated component on every surface', () => {
    expect(LINK_ASTRO).toContain('privacyControlsEnabled()');
    expect(LINK_ASTRO).toContain('href="/privacy/" data-np-privacy-ui="footer-link"');
    for (const consumer of ['components/Footer.astro', 'pages/index.astro', 'pages/404.astro']) {
      const src = read(`src/${consumer}`);
      expect(src, consumer).toContain('privacy/ui/PrivacyLink.astro');
      expect(src, consumer).toMatch(/<PrivacyLink class="(nav-button|ribbon-exit)"/);
    }
    // The homepage wraps the link in a ribbon row, which must be gated too.
    expect(read('src/pages/index.astro')).toMatch(
      /\{privacyEnabled && \(\s*<div class="ribbon-row privacy-ribbon">/,
    );
    // No page links /privacy/ on its own: the link exists only through the
    // component, the notice, and the #1226 test fixture.
    const linkers = findFilesRecursively(join(ROOT, 'src'), (f) => /\.(astro|ts|js|mjs)$/.test(f))
      .filter((f) => /href="\/privacy\/"/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(ROOT.length + 1))
      .sort();
    expect(linkers).toEqual([
      'src/components/privacy/ui/PrivacyLink.astro',
      'src/components/privacy/ui/PrivacyNotice.astro',
      'src/pages/test-fixtures/privacy/[...index].astro',
    ]);
  });

  it('is listed in the repository overview', () => {
    expect(read('docs/agents/repository-overview.md')).toContain(
      '`src/pages/privacy/[...index].astro`',
    );
  });
});
