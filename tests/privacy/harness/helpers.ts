/**
 * Assertions and page helpers shared by the privacy acceptance specs (#1230).
 */
import type { Page } from '@playwright/test';
import { CONTACT, FIXTURE_PATH, SITE_ORIGIN } from './constants';
import { findDigests, findLiterals } from './payloads';
import { expect, type Session, type PrivacyState } from './test';
import type { PostHogEvent } from './payloads';

export type Choice = 'granted' | 'denied' | 'unset';

/** The contract's URL allowlist (Capture Minimization item 3). The only place the suite restates it. */
export const ALLOWED_QUERY_PARAMS = new Set([
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

/** Storage state with the gate's one key pre-set, for "a returning visitor who already chose". */
export function storageWith(choice: Choice, extra: Record<string, unknown> = {}) {
  return {
    cookies: [],
    origins: [
      {
        origin: SITE_ORIGIN,
        localStorage: [
          {
            name: 'np-privacy',
            value: JSON.stringify({ v: 1, choice, noticeDismissed: false, ...extra }),
          },
        ],
      },
    ],
  };
}

/** Wait until the page has loaded the gate and (when granted) finished initializing analytics. */
export async function gateReady(page: Page): Promise<void> {
  await page.waitForFunction(() =>
    Boolean((window as unknown as { npPrivacy?: unknown }).npPrivacy),
  );
}

export interface ScriptAudit {
  sdkScripts: string[];
  posthogGlobal: boolean;
  gtagLibraryGlobal: boolean;
  dataLayerEntries: number;
}

/** What a denied page may and may not contain (contract, Gate item 3). */
export async function auditSdk(page: Page): Promise<ScriptAudit> {
  return page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    const sdkScripts = [...document.scripts]
      .map((s) => s.src)
      .filter((src) =>
        /posthog|\/static\/array\.js|googletagmanager|gtag\/js|google-analytics|d\.nathanpayne\.com/i.test(
          src,
        ),
      );
    return {
      sdkScripts,
      posthogGlobal: typeof w.posthog !== 'undefined',
      // google_tag_manager is defined by the real gtag.js, not by a page-level stub.
      gtagLibraryGlobal: typeof w.google_tag_manager !== 'undefined',
      dataLayerEntries: Array.isArray(w.dataLayer) ? (w.dataLayer as unknown[]).length : 0,
    };
  });
}

/** Zero analytics requests, by three independent observers, plus no SDK element or global. */
export async function expectNoAnalytics(s: Session, mark = 0, dwellMs = 7000): Promise<void> {
  await s.page.waitForTimeout(dwellMs);
  const audit = await auditSdk(s.page);
  expect(audit.sdkScripts, 'no PostHog or GA4 script element').toEqual([]);
  expect(audit.posthogGlobal, 'window.posthog is not defined').toBe(false);
  expect(audit.gtagLibraryGlobal, 'the gtag.js library did not run').toBe(false);
  expect(
    s.sink.vendorRequests(mark).map((r) => `${r.method} ${r.host}${r.path}`),
    'no request reached the sink for an analytics host',
  ).toEqual([]);
  expect(
    s.attemptedVendorRequests().map((r) => `${r.method} ${r.url}`),
    'the page did not even attempt an analytics request',
  ).toEqual([]);
  expect(
    s.sink.refusals.map((r) => r.target),
    'nothing was refused at the proxy (nothing tried to leave)',
  ).toEqual([]);
}

/**
 * Positive control (contract: opt-out tests mean nothing without it): PostHog
 * events and replay snapshots, and GA4 hits when a gtag fixture is served,
 * actually reached the sink.
 */
export async function expectCollecting(
  s: Session,
  options: { ga4: boolean; timeout?: number; mark?: number },
): Promise<void> {
  const mark = options.mark ?? 0;
  const timeout = options.timeout ?? 30_000;
  // posthog-js holds replay snapshots while it cannot tell whether the visitor is present, so a visit
  // with no input at all sends none. A real visitor moves the pointer; so does the suite.
  await humanActivity(s.page);
  await expect
    .poll(() => s.sink.posthogEvents(mark).some(({ event }) => event.event === '$pageview'), {
      message: 'PostHog $pageview reached the sink',
      timeout,
    })
    .toBe(true);
  await expect
    .poll(() => s.sink.snapshotEvents(mark).length > 0, {
      message: 'a replay snapshot reached the sink',
      timeout,
    })
    .toBe(true);
  if (options.ga4) {
    await expect
      .poll(() => s.sink.ga4Events(mark).some(({ event }) => event.name === 'page_view'), {
        message: 'GA4 page_view reached the sink',
        timeout,
      })
      .toBe(true);
  }
}

/** Pointer movement and a scroll: the minimum that makes the recorder treat the visit as attended. */
export async function humanActivity(page: Page): Promise<void> {
  await page.mouse.move(60, 160);
  await page.mouse.move(240, 220, { steps: 6 });
  await page.mouse.wheel(0, 120);
  await page.mouse.move(420, 300, { steps: 6 });
}

/** All rrweb items across `$snapshot` events, in arrival order. */
export interface ReplayItem {
  type: number;
  timestamp?: number;
  data?: Record<string, unknown>;
  req: { seq: number };
}

export function replayItems(s: Session, mark = 0): ReplayItem[] {
  const out: ReplayItem[] = [];
  for (const { req, event } of s.sink.snapshotEvents(mark)) {
    const data = event.properties.$snapshot_data;
    if (!Array.isArray(data)) continue;
    for (const item of data as Array<Record<string, unknown>>) {
      out.push({ ...(item as unknown as ReplayItem), req });
    }
  }
  return out;
}

/** Depth-first walk of an rrweb node tree. */
export function findNodes(
  root: unknown,
  predicate: (node: Record<string, unknown>) => boolean,
): Array<Record<string, unknown>> {
  const found: Array<Record<string, unknown>> = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (predicate(n)) found.push(n);
    const children = n.childNodes;
    if (Array.isArray(children)) children.forEach(walk);
    if (n.node) walk(n.node);
  };
  walk(root);
  return found;
}

// ---------------------------------------------------------------------------
// Canary and URL assertions

export const URL_IN_TEXT = /https?:\/\/[^\s"'\\<>)]+/g;

export interface UrlViolation {
  url: string;
  reason: string;
}

/** Every http(s) URL found in decoded text must be reduced to origin, path, and allowlisted parameters. */
export function urlViolations(searchable: string): UrlViolation[] {
  const violations: UrlViolation[] = [];
  const seen = new Set<string>();
  for (const raw of searchable.match(URL_IN_TEXT) ?? []) {
    if (seen.has(raw)) continue;
    seen.add(raw);
    // The searchable text is JSON, so a trailing quote or brace is not part of the URL.
    const cleaned = raw.replace(/[",}\]]+$/, '');
    let url: URL;
    try {
      url = new URL(cleaned);
    } catch {
      continue;
    }
    if (url.hash) violations.push({ url: cleaned, reason: `fragment ${url.hash}` });
    for (const key of url.searchParams.keys()) {
      if (!ALLOWED_QUERY_PARAMS.has(key))
        violations.push({ url: cleaned, reason: `query parameter ${key}` });
    }
  }
  return violations;
}

export const ALL_CANARIES = [
  'NP-CANARY-INPUT',
  'NP-CANARY-FORM',
  'NP-CANARY-MASKED-TEXT',
  'NP-CANARY-BLOCKED-TEXT',
  'NP-CANARY-ATTR',
  'NP-CANARY-QUERY',
  'NP-CANARY-FRAGMENT',
  'NP-CANARY-SEARCH',
];

export function contactLiterals(): string[] {
  return [
    CONTACT.email,
    CONTACT.phone,
    CONTACT.phoneE164,
    CONTACT.phoneE164.replace('+', ''),
    CONTACT.address,
  ];
}

/** Normalized forms Google documents hashing (lowercased and trimmed email; E.164 phone; lowercased street). */
export function contactNormalized(): string[] {
  return [
    CONTACT.email.toLowerCase().trim(),
    CONTACT.phoneE164,
    CONTACT.address.toLowerCase().trim(),
  ];
}

export function canaryHits(searchable: string): string[] {
  return findLiterals(searchable, ALL_CANARIES).map((h) => h.canary);
}

export function contactHits(searchable: string): string[] {
  return [
    ...findLiterals(searchable, contactLiterals()).map((h) => `literal ${h.canary}`),
    ...findDigests(searchable, contactNormalized()).map((h) => h.canary),
  ];
}

// ---------------------------------------------------------------------------
// Fixture interaction

export async function typeCanaries(page: Page): Promise<void> {
  await page.fill('#fixture-text', 'NP-CANARY-INPUT');
  await page.fill('#fixture-email', 'NP-CANARY-INPUT');
  await page.fill('#fixture-textarea', 'NP-CANARY-INPUT');
  await page.fill('#fixture-form-text', 'NP-CANARY-INPUT');
}

export async function interactWithFixture(page: Page): Promise<void> {
  await typeCanaries(page);
  await page.click('#fixture-form-submit');
  await page.click('#fixture-pii-button');
  await page.click('#fixture-masked');
  await page.click('#fixture-blocked');
}

export async function fillContactForm(page: Page): Promise<void> {
  await page.fill('#fixture-contact-email', CONTACT.email);
  await page.fill('#fixture-contact-phone', CONTACT.phone);
  await page.fill('#fixture-contact-address', CONTACT.address);
  await page.click('#fixture-contact-submit');
}

export const sensitiveFixtureUrl = (extra = ''): string =>
  `${FIXTURE_PATH}?q=NP-CANARY-SEARCH&utm_source=fixture${extra}#NP-CANARY-FRAGMENT`;

/** Record every `np:privacy-change` the page dispatches. */
export async function recordChanges(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __npChanges?: unknown[] };
    w.__npChanges = [];
    window.addEventListener('np:privacy-change', (e) =>
      w.__npChanges?.push((e as CustomEvent).detail),
    );
  });
}

export async function recordedChanges(page: Page): Promise<PrivacyState[]> {
  return page.evaluate(() =>
    ((window as unknown as { __npChanges?: PrivacyState[] }).__npChanges ?? []).slice(),
  );
}

export function eventsNamed(events: Array<{ event: PostHogEvent }>, name: string): PostHogEvent[] {
  return events.filter(({ event }) => event.event === name).map(({ event }) => event);
}

/** Click the fixture's outbound link (it opens a new tab, which the egress boundary aborts) and close the tab. */
export async function clickOutbound(s: Session): Promise<void> {
  const popup = s.context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
  await s.page.click('#fixture-outbound-link');
  const opened = await popup;
  await opened?.close().catch(() => undefined);
}

/** Raw `np-privacy` storage seed, for values the gate must read as `unset`. */
export function storageRaw(value: string) {
  return {
    cookies: [],
    origins: [{ origin: SITE_ORIGIN, localStorage: [{ name: 'np-privacy', value }] }],
  };
}

export async function storedValue(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('np-privacy'));
}
