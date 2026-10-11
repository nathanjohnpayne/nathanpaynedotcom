/**
 * Self-tests for the acceptance suite's own instruments. Neither group needs a
 * browser. They answer two questions every absence assertion depends on:
 * "is the fixture what production runs?" and "can the detector actually see a
 * canary in every encoding the SDKs use?"
 */
import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { REPO_ROOT } from './harness/constants';
import {
  canonicalJson,
  gtagConfigFindings,
  gtagConfigFingerprint,
  gtagEmbeddedResource,
  gtagEmbeddedTags,
  gtagProvenance,
  loadManifest,
  reusableGtag,
  sha256Hex,
  type GtagResource,
  type GtagState,
} from './harness/fixtures';
import {
  canaryHits,
  contactHits,
  disabledEnhancedMeasurement,
  ga4MarkerViolations,
  urlViolations,
} from './harness/helpers';
import { decodeBody, deepExpand, ga4Events, postHogEvents } from './harness/payloads';
import { expect, test } from '@playwright/test';

const read = (relative: string): string => readFileSync(join(REPO_ROOT, relative), 'utf8');
const hashesIn = (text: string): string[] =>
  [...text.matchAll(/\b[0-9a-f]{64}\b/g)].map((m) => m[0]);

test.describe('fixtures manifest agrees with the production record', () => {
  const manifest = loadManifest();
  const inventory = read(manifest.inventory.document);
  const capture = read(manifest.inventory.captureDocument);
  const section = inventory.slice(
    inventory.indexOf('## Production SDK Versions'),
    inventory.indexOf('## Nathan to Verify'),
  );
  const rowFor = (text: string, marker: string): string =>
    text.split('\n').find((l) => l.includes(marker)) ?? '';

  test('PRIV-1 the pinned posthog-js version is the inventory production version', () => {
    expect(section).toContain(`posthog-js **${manifest.posthog.version}**`);
    for (const file of Object.values(manifest.posthog.files)) {
      if (file.servedAt !== '/static/array.js')
        expect(file.servedAt).toContain(`/static/${manifest.posthog.version}/`);
    }
  });

  test('PRIV-1 array.js and the replay recorder hashes equal the inventory Production SDK Versions table', () => {
    expect(hashesIn(rowFor(section, 'PostHog `array.js`'))).toEqual([
      manifest.posthog.files['array.js']!.sha256,
    ]);
    expect(hashesIn(rowFor(section, 'PostHog replay recorder'))).toEqual([
      manifest.posthog.files['posthog-recorder.js']!.sha256,
    ]);
  });

  test('PRIV-1 the other four extension bundles equal the capture summary Production SDK Hashes table', () => {
    const rows: Array<[string, string]> = [
      ['surveys.js', 'PostHog surveys'],
      ['dead-clicks-autocapture.js', 'PostHog dead clicks'],
      ['web-vitals-with-attribution.js', 'PostHog web vitals'],
      ['exception-autocapture.js', 'PostHog exception autocapture'],
    ];
    for (const [file, marker] of rows) {
      expect(hashesIn(rowFor(capture, marker)), file).toEqual([
        manifest.posthog.files[file]!.sha256,
      ]);
    }
  });

  test('PRIV-1 the recorded gtag.js configuration fingerprint equals the inventory (it is in the gtag.js row, with its capture date)', () => {
    const row = rowFor(section, '`gtag.js`');
    expect(manifest.gtag.production.configSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(hashesIn(row), 'the fingerprint is the one hash the row records').toEqual([
      manifest.gtag.production.configSha256,
    ]);
    expect(manifest.gtag.production.capturedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(row).toContain(manifest.gtag.production.capturedOn);
  });
});

/** A gtag.js-shaped body around the given resource; `junk` stands in for the rotating bytes outside the configuration. */
const gtagBody = (resourceJson: string, junk = ''): string =>
  `${junk}var data = {\n\n"resource": ${resourceJson.slice(0, -1)}\n}\n\n\n\n,"runtime":[\n[50,"__x"]]};${junk}`;

test.describe('GA4 configuration fingerprint', () => {
  type Tag = { function: string; [key: string]: unknown };
  const tags: Tag[] = [
    { function: '__ogt_auto_events', vtp_enableOutboundClick: true },
    { function: '__ogt_1p_data_v2', vtp_isEnabled: false, vtp_isAutoCollectPiiEnabledFlag: true },
    { function: '__ccd_em_page_view', vtp_historyEvents: true, vtp_nested: { b: [1, 2], a: null } },
    { function: '__ccd_em_scroll' },
    { function: '__ccd_auto_redact', vtp_redactEmail: true },
  ];
  /** The shape of the served container: the five top-level fields of `resource` as of 2026-10-11. */
  const makeResource = (): GtagResource => ({
    version: '2',
    macros: [{ function: '__e' }, { function: '__u', vtp_component: 'HOST' }],
    tags: structuredClone(tags) as GtagResource['tags'],
    predicates: [{ function: '_eq', arg0: ['macro', 0], arg1: 'page_view' }],
    rules: [
      [
        ['if', 0],
        ['add', 1, 2],
      ],
    ],
  });
  const clean = makeResource();
  const fingerprintOf = (js: string): string => gtagConfigFingerprint(gtagEmbeddedResource(js)!);
  const changed = (mutate: (resource: GtagResource) => void): string => {
    const copy = makeResource();
    mutate(copy);
    return gtagConfigFingerprint(copy);
  };

  test('PRIV-2 (control) the fingerprint ignores key order and whitespace, and the bytes around the configuration', () => {
    const compact = fingerprintOf(gtagBody(JSON.stringify(clean)));
    // The same configuration, pretty-printed, with every object's keys in reverse order.
    const reversed = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(reversed)
        : value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value)
                .reverse()
                .map(([k, v]) => [k, reversed(v)]),
            )
          : value;
    const reordered = JSON.stringify(reversed(clean), null, 2);
    expect(reordered).not.toBe(JSON.stringify(clean));
    expect(fingerprintOf(gtagBody(reordered)), 'key order and whitespace').toBe(compact);
    // Google's byte rotation: other bytes around the very same configuration.
    expect(fingerprintOf(gtagBody(JSON.stringify(clean), '/* rotated build */ ')), 'rotation').toBe(
      compact,
    );
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: 3 }] })).toBe('{"a":[{"c":3,"d":2}],"b":1}');
    expect(compact).toMatch(/^[0-9a-f]{64}$/);
    expect(gtagEmbeddedTags(gtagBody(JSON.stringify(clean)))).toEqual(clean.tags);
  });

  test('PRIV-2 (control) a changed, added, removed, or reordered tag setting changes the fingerprint', () => {
    const seen = new Set([
      gtagConfigFingerprint(clean),
      changed((r) => (r.tags[1]!.vtp_isEnabled = true)), // user-provided data on
      changed((r) => (r.tags[2]!.vtp_historyEvents = false)),
      changed((r) => r.tags.push({ function: '__ccd_em_outbound_click' })),
      changed((r) => r.tags.pop()),
      changed((r) => r.tags.reverse()),
      changed((r) => ((r.tags[2]!.vtp_nested as { b: number[] }).b = [2, 1])),
    ]);
    expect(seen.size, 'every variant has its own fingerprint').toBe(7);
  });

  test('PRIV-2 (control) a changed rule, predicate, macro, or version changes the fingerprint and reads re-record, though the tags are untouched', () => {
    const recorded = gtagConfigFingerprint(clean);
    const verdict = (resource: GtagResource) =>
      gtagProvenance(gtagConfigFingerprint(resource), recorded, gtagConfigFindings(resource.tags));
    expect(verdict(makeResource()).status, 'the recorded configuration').toBe('verified');
    const edits: Record<string, (r: GtagResource) => void> = {
      'a rule (a tag now fires on another condition)': (r) =>
        ((r.rules as unknown[][][])[0]![1] = ['add', 1]),
      'a rule added': (r) =>
        (r.rules as unknown[]).push([
          ['if', 0],
          ['add', 3],
        ]),
      'a predicate': (r) => ((r.predicates as Array<{ arg1: string }>)[0]!.arg1 = 'scroll'),
      'a macro': (r) =>
        ((r.macros as Array<{ vtp_component?: string }>)[1]!.vtp_component = 'QUERY'),
      'the container version': (r) => (r.version = '3'),
    };
    for (const [what, mutate] of Object.entries(edits)) {
      const copy = makeResource();
      mutate(copy);
      expect(
        gtagConfigFindings(copy.tags),
        `${what}: the tag findings alone cannot see it`,
      ).toEqual([]);
      expect(gtagConfigFingerprint(copy), `${what} changes the fingerprint`).not.toBe(recorded);
      expect(verdict(copy).status, `${what} reads re-record`).toBe('re-record');
    }
  });

  test('PRIV-2 (control) every top-level field of the resource is part of the fingerprint: nothing is excluded', () => {
    const recorded = gtagConfigFingerprint(clean);
    for (const key of Object.keys(clean)) {
      expect(
        changed((r) => {
          r[key] = JSON.stringify(r[key]) === '"x"' ? 'y' : 'x';
        }),
        `changing ${key} changes the fingerprint`,
      ).not.toBe(recorded);
    }
    // And a field Google adds later is covered too.
    expect(changed((r) => (r.newField = 1))).not.toBe(recorded);
  });

  test('PRIV-2 (control) re-enabled outbound clicks or user-provided data change the fingerprint and read re-record, never verified', () => {
    const recorded = gtagConfigFingerprint(clean);
    const verdict = (resource: GtagResource) =>
      gtagProvenance(gtagConfigFingerprint(resource), recorded, gtagConfigFindings(resource.tags));
    expect(verdict(makeResource()).status, 'the recorded configuration').toBe('verified');
    const outbound = makeResource();
    outbound.tags.push({ function: '__ccd_em_outbound_click' });
    expect(gtagConfigFingerprint(outbound)).not.toBe(recorded);
    expect(verdict(outbound).status, 'injected __ccd_em_outbound_click').toBe('re-record');
    const userData = makeResource();
    userData.tags = userData.tags.map((t) =>
      t.function === '__ogt_1p_data_v2' ? { ...t, vtp_isEnabled: true } : t,
    );
    expect(gtagConfigFingerprint(userData)).not.toBe(recorded);
    expect(verdict(userData).status, 'enabled __ogt_1p_data_v2').toBe('re-record');
  });
});

test.describe('GA4 provenance verdicts', () => {
  const recorded = loadManifest().gtag.production.configSha256;

  test('PRIV-2 (control) the recorded fingerprint is verified, and any other configuration, a tampered record, findings, or no configuration read re-record, never verified', () => {
    expect(gtagProvenance(recorded, recorded, []).status).toBe('verified');
    // The property configuration changed.
    const other = gtagProvenance('0'.repeat(64), recorded, []);
    expect(other.status).toBe('re-record');
    expect((other as { reason: string }).reason).toContain('Nathan');
    // The record itself is altered: the very configuration that matched no longer does.
    const tampered = gtagProvenance(
      recorded,
      `${recorded.slice(0, -1)}${recorded.endsWith('0') ? '1' : '0'}`,
      [],
    );
    expect(tampered.status).toBe('re-record');
    // The fingerprint matches but the configuration has findings (or its findings are unknown).
    const withFindings = gtagProvenance(recorded, recorded, ['__ccd_em_scroll is missing']);
    expect(withFindings.status).toBe('re-record');
    expect((withFindings as { reason: string }).reason).toContain('__ccd_em_scroll is missing');
    expect(gtagProvenance(recorded, recorded, undefined).status).toBe('re-record');
    // Nothing was fetched, or the file was of another shape.
    expect(gtagProvenance(undefined, recorded, []).status).toBe('re-record');
  });
});

test.describe('cached gtag.js reuse', () => {
  const recorded = loadManifest().gtag.production.configSha256;
  const bytes = 'cached gtag.js stand-in';
  let dir = '';
  let file = '';
  const entry = (extra: Partial<GtagState> = {}): GtagState => ({
    available: true,
    rawSha256: sha256Hex('raw bytes stand-in'),
    configSha256: recorded,
    configFindings: [],
    servedSha256: sha256Hex(bytes),
    substitutions: 3,
    matchesProduction: false, // the stored verdict is never trusted
    ...extra,
  });

  test.beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'np-gtag-cache-'));
    file = join(dir, 'gtag.js');
    writeFileSync(file, bytes);
  });
  test.afterEach(() => rmSync(dir, { recursive: true, force: true }));

  test('PRIV-2 (control) an intact entry with the recorded configuration is reused, with the verdict recomputed', () => {
    expect(reusableGtag(entry(), file, recorded)).toMatchObject({
      matchesProduction: true,
      servedSha256: sha256Hex(bytes),
      source: 'cache', // the recorded configuration, but not seen served by production this run
    });
  });

  test('PRIV-2 (control) a cache entry whose file bytes no longer match is rebuilt, not reused', () => {
    writeFileSync(file, `${bytes} edited`);
    expect(reusableGtag(entry(), file, recorded)).toBeUndefined();
    writeFileSync(file, bytes.slice(0, 5)); // truncated
    expect(reusableGtag(entry(), file, recorded)).toBeUndefined();
    rmSync(file); // gone
    expect(reusableGtag(entry(), file, recorded)).toBeUndefined();
  });

  test('PRIV-2 (control) a legacy cache entry without the fingerprint, the served hash, or the substitution count is rebuilt, not reused', () => {
    expect(reusableGtag(entry({ configSha256: undefined }), file, recorded)).toBeUndefined();
    expect(reusableGtag(entry({ servedSha256: undefined }), file, recorded)).toBeUndefined();
    expect(reusableGtag(entry({ substitutions: undefined }), file, recorded)).toBeUndefined();
  });

  test('PRIV-2 (control) an entry for another configuration than the recorded one, or an unavailable one, is rebuilt; other bytes with the same configuration are reused', () => {
    expect(reusableGtag(entry({ configSha256: '0'.repeat(64) }), file, recorded)).toBeUndefined();
    expect(reusableGtag(entry({ rawSha256: '0'.repeat(64) }), file, recorded)).toMatchObject({
      source: 'cache',
    });
    expect(reusableGtag(entry({ available: false }), file, recorded)).toBeUndefined();
    expect(reusableGtag(undefined, file, recorded)).toBeUndefined();
  });
});

test.describe('GA4 served-configuration instrument', () => {
  const tag = (name: string, extra: Record<string, unknown> = {}) => ({ function: name, ...extra });
  const clean = [
    tag('__ogt_auto_events'),
    tag('__ogt_1p_data_v2', { vtp_isEnabled: false, vtp_isAutoCollectPiiEnabledFlag: true }),
    tag('__ccd_em_page_view', { vtp_historyEvents: true }),
    tag('__ccd_em_scroll'),
    tag('__ccd_auto_redact', { vtp_redactEmail: true }),
  ];

  test('PRIV-2 (control) the 2026-10-10 configuration is clean, and each re-enabled event or user-data setting is a finding', () => {
    expect(gtagConfigFindings(clean)).toEqual([]);
    for (const event of ['outbound_click', 'site_search', 'form', 'video', 'download']) {
      expect(
        gtagConfigFindings([...clean, tag(`__ccd_em_${event}`)]),
        `re-enabled ${event}`,
      ).toEqual([expect.stringContaining(`__ccd_em_${event} is present`)]);
    }
    expect(
      gtagConfigFindings(
        clean.map((t) => (t.function === '__ogt_1p_data_v2' ? { ...t, vtp_isEnabled: true } : t)),
      ),
      'user-provided data turned back on',
    ).toEqual([expect.stringContaining('user-provided data')]);
    // An unknown configuration never reads as "off": a missing or duplicated user-data tag is a finding.
    expect(
      gtagConfigFindings(clean.filter((t) => t.function !== '__ogt_1p_data_v2')),
      'user-data tag missing or renamed',
    ).toEqual([expect.stringContaining('found 0')]);
    expect(
      gtagConfigFindings([...clean, tag('__ogt_1p_data_v2', { vtp_isEnabled: false })]),
      'user-data tag duplicated',
    ).toEqual([expect.stringContaining('found 2')]);
    // The same exact-one rule for the enhanced-measurement tags that stay on, and every page-view tag is checked.
    expect(gtagConfigFindings([...clean, tag('__ccd_em_scroll')]), 'scroll tag duplicated').toEqual(
      ['expected exactly one __ccd_em_scroll, found 2'],
    );
    expect(
      gtagConfigFindings([...clean, tag('__ccd_em_page_view', { vtp_historyEvents: false })]),
      'a second page-view tag without history events',
    ).toEqual([
      'expected exactly one __ccd_em_page_view, found 2',
      'page views lost their history events',
    ]);
    expect(
      gtagConfigFindings(clean.filter((t) => t.function !== '__ccd_em_scroll')),
      'scrolls turned off',
    ).toEqual([expect.stringContaining('__ccd_em_scroll is missing')]);
  });

  test('PRIV-2 (control) the embedded configuration parses out of a gtag.js-shaped file, and a file of another shape reads as unreadable, not as empty', () => {
    const body = `var data = {\n\n"resource": {\n  "version":"2",\n  "tags":[{"function":"__ccd_em_page_view","vtp_historyEvents":true}],\n  "rules":[[["if",0]]]\n}\n\n\n\n,"runtime":[\n[50,"__x"]]};`;
    expect(gtagEmbeddedTags(body)?.map((t) => t.function)).toEqual(['__ccd_em_page_view']);
    expect(gtagEmbeddedTags('(function(){})();')).toBeUndefined();
    expect(gtagEmbeddedTags('"resource": {not json\n}\n,"runtime"')).toBeUndefined();
  });

  test('PRIV-2 (control) the disabled-event detector flags each disabled event and parameter, and passes the events that are still on', () => {
    const ev = (name: string, params: Record<string, string> = {}) => ({ name, params });
    expect(
      disabledEnhancedMeasurement([
        ev('page_view', { dl: 'https://nathanpayne.test/' }),
        ev('scroll', { 'epn.percent_scrolled': '90' }),
        ev('user_engagement', { 'epn.engagement_time_msec': '10' }),
      ]),
    ).toEqual([]);
    expect(
      disabledEnhancedMeasurement([
        ev('click', { 'ep.outbound': 'true', 'ep.link_url': 'https://x.test/?a=1' }),
        ev('file_download', { 'ep.file_name': 'a.pdf' }),
        ev('view_search_results', { 'ep.search_term': 'x' }),
        ev('form_submit', { 'ep.form_destination': 'https://x.test/' }),
        ev('video_progress', { 'ep.video_url': 'https://x.test/v.mp4' }),
      ]),
    ).toEqual(
      expect.arrayContaining([
        'click parameter link_url',
        'click parameter outbound',
        'event file_download',
        'file_download parameter file_name',
        'event view_search_results',
        'view_search_results parameter search_term',
        'event form_submit',
        'form_submit parameter form_destination',
        'event video_progress',
        'video_progress parameter video_url',
      ]),
    );
    // A disabled parameter on an event that is allowed still counts.
    expect(
      disabledEnhancedMeasurement([ev('scroll', { 'ep.link_url': 'https://x.test/' })]),
    ).toEqual(['scroll parameter link_url']);
  });
});

test.describe('the canary detector sees every encoding the SDKs use, and rejects clean payloads', () => {
  const canary = 'NP-CANARY-INPUT';

  test('PRIV-2 (instrument) gzip JSON event body', () => {
    const body = gzipSync(
      JSON.stringify({ event: '$autocapture', properties: { $el_text: `typed ${canary}` } }),
    );
    const decoded = decodeBody(body, 'text/plain', 'https://d.nathanpayne.com/e/');
    expect(decoded.undecoded).toBe(false);
    expect(canaryHits(decoded.searchable)).toEqual([canary]);
    expect(postHogEvents(decoded.json)[0]?.event).toBe('$autocapture');
  });

  test('PRIV-2 (instrument) replay item whose data field is a latin-1 gzip string, as posthog-js compresses it', () => {
    const inner = gzipSync(JSON.stringify({ node: { textContent: `value ${canary}` } })).toString(
      'latin1',
    );
    const body = Buffer.from(
      JSON.stringify({
        event: '$snapshot',
        properties: { $snapshot_data: [{ type: 2, cv: '2024-10', data: inner }] },
      }),
    );
    const decoded = decodeBody(body, 'application/json', 'https://d.nathanpayne.com/s/');
    expect(decoded.undecoded).toBe(false);
    expect(canaryHits(decoded.searchable)).toEqual([canary]);
    // The control: without expansion the canary is invisible, so expansion is what finds it.
    expect(canaryHits(body.toString('utf8'))).toEqual([]);
  });

  test('PRIV-2 (instrument) base64 gzip string and form-encoded data= body', () => {
    const b64 = gzipSync(JSON.stringify({ t: canary })).toString('base64');
    expect(JSON.stringify(deepExpand({ x: b64 }).value)).toContain(canary);
    const form = `data=${encodeURIComponent(gzipSync(JSON.stringify({ event: 'e', properties: { p: canary } })).toString('base64'))}`;
    const decoded = decodeBody(
      Buffer.from(form),
      'application/x-www-form-urlencoded',
      'https://d.nathanpayne.com/e/',
    );
    expect(canaryHits(decoded.searchable)).toEqual([canary]);
  });

  test('PRIV-2 (instrument) an invalid or truncated base64 data= body is flagged, not decoded to nothing', () => {
    const form = 'application/x-www-form-urlencoded';
    const url = 'https://d.nathanpayne.com/e/';
    for (const bad of ['!!!', 'abc', 'eyJldmVudCI6ImUifQ', 'ZZZZ====', 'ey Jl']) {
      const decoded = decodeBody(Buffer.from(`data=${encodeURIComponent(bad)}`), form, url);
      expect(decoded.undecoded, `data=${bad} is not valid base64`).toBe(true);
    }
    // Controls: a well-formed body, with and without gzip, still decodes.
    const good = Buffer.from(JSON.stringify({ event: 'e', properties: { p: canary } })).toString(
      'base64',
    );
    const plain = decodeBody(Buffer.from(`data=${encodeURIComponent(good)}`), form, url);
    expect(plain.undecoded).toBe(false);
    expect(canaryHits(plain.searchable)).toEqual([canary]);
    const gz = gzipSync(JSON.stringify({ event: 'e', properties: { p: canary } })).toString(
      'base64',
    );
    expect(decodeBody(Buffer.from(`data=${encodeURIComponent(gz)}`), form, url).undecoded).toBe(
      false,
    );
  });

  test('PRIV-2 (instrument) URL-encoded variants of a literal are found', () => {
    expect(canaryHits('x=np-canary-input')).toEqual([canary]);
    expect(canaryHits('email=NP-CANARY-QUERY%40example.test')).toEqual(['NP-CANARY-QUERY']);
  });

  test('PRIV-2 (instrument) an undecodable body is flagged so an absence check cannot silently pass over it', () => {
    const decoded = decodeBody(
      Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x80]),
      'application/octet-stream',
      'https://d.nathanpayne.com/e/',
    );
    expect(decoded.undecoded).toBe(true);
    const truncatedGzip = decodeBody(
      Buffer.from([0x1f, 0x8b, 0x08, 0x00, 0x00]),
      'text/plain',
      'https://d.nathanpayne.com/e/',
    );
    expect(truncatedGzip.undecoded).toBe(true);
  });

  test('PRIV-2 (instrument) a body that opens like JSON but does not parse is flagged, not searched as plain text', () => {
    const truncated = Buffer.from('{"event":"x","properties":{"data":"abc');
    expect(decodeBody(truncated, 'text/plain', 'https://d.nathanpayne.com/s/').undecoded).toBe(
      true,
    );
    const valid = Buffer.from('{"event":"e"}');
    expect(decodeBody(valid, 'text/plain', 'https://d.nathanpayne.com/e/').undecoded).toBe(false);
  });

  test('PRIV-2 (instrument) a compressed value deep in a real-sized tree is still inflated, and a tree past the cap is flagged', () => {
    const nest = (depth: number, leaf: unknown): unknown => {
      let node = leaf;
      for (let i = 0; i < depth; i += 1) node = { childNodes: [node] };
      return node;
    };
    const compressed = gzipSync(JSON.stringify({ t: canary })).toString('base64');
    // 100 DOM levels is 200 JSON levels, deeper than any real page: still decoded.
    const deep = deepExpand(nest(100, compressed));
    expect(deep.undecoded).toBe(false);
    expect(JSON.stringify(deep.value)).toContain(canary);
    // Beyond the cap the walk gives up and must say so.
    expect(deepExpand(nest(500, compressed)).undecoded).toBe(true);
    expect(deepExpand(nest(500, 'plain text')).undecoded).toBe(true);
  });

  test('PRIV-2 (instrument) transport URL parameters are not captured content: no URL violation, but still searched for canaries', () => {
    const transport =
      'https://d.nathanpayne.com/e/?ip=1&_=1791500000000&ver=1.438.3&compression=gzip-js';
    const clean = Buffer.from(
      JSON.stringify({ event: 'e', properties: { $current_url: 'https://a.test/p?utm_source=x' } }),
    );
    const decoded = decodeBody(clean, 'text/plain', transport);
    expect(urlViolations(decoded.plain), 'SDK transport parameters are not a violation').toEqual(
      [],
    );
    // A captured URL with a non-allowlisted parameter still is one.
    const leaky = Buffer.from(
      JSON.stringify({ event: 'e', properties: { $current_url: 'https://a.test/p?email=x' } }),
    );
    expect(
      urlViolations(decodeBody(leaky, 'text/plain', transport).plain).map((v) => v.reason),
    ).toEqual(['query parameter email']);
    // The transport URL is still part of what canary and contact searches cover.
    const withCanary = decodeBody(clean, 'text/plain', `${transport}&x=${canary}`);
    expect(canaryHits(withCanary.searchable)).toEqual([canary]);
    expect(canaryHits(withCanary.plain)).toEqual([]);
  });

  test('PRIV-2 (instrument) GA4 multi-event body parses into events with the shared parameters merged in', () => {
    const events = ga4Events(
      'https://www.google-analytics.com/g/collect?v=2&tid=G-X&dl=https%3A%2F%2Fa.test%2F',
      'en=scroll&epn.percent_scrolled=90\nen=click&ep.link_url=https%3A%2F%2Fb.test%2F%3Fq%3D1',
    );
    expect(events.map((e) => e.name)).toEqual(['scroll', 'click']);
    expect(events[1]?.params).toMatchObject({
      dl: 'https://a.test/',
      'ep.link_url': 'https://b.test/?q=1',
      tid: 'G-X',
    });
  });

  test('PRIV-2 (instrument) the SHA-256 search finds hex, base64, and base64url digests of the normalized contact values, and not other values', () => {
    const email = createHash('sha256').update('np-canary@example.test').digest();
    expect(contactHits(`em=${email.toString('hex')}`)).toEqual(['sha256(np-canary@example.test)']);
    expect(contactHits(`em=${email.toString('base64')}`)).toEqual([
      'sha256(np-canary@example.test)',
    ]);
    expect(contactHits(`em=${email.toString('base64url')}`)).toEqual([
      'sha256(np-canary@example.test)',
    ]);
    const phone = createHash('sha256').update('+15550100199').digest('hex');
    expect(contactHits(`ph=${phone}`)).toEqual(['sha256(+15550100199)']);
    expect(
      contactHits('em=' + createHash('sha256').update('someone.else@example.test').digest('hex')),
    ).toEqual([]);
    expect(contactHits('np-canary%40example.test')).toEqual(['literal np-canary@example.test']);
  });

  test('PRIV-2 (instrument) the URL check flags fragments and non-allowlisted parameters and passes the allowlist', () => {
    expect(urlViolations('see https://a.test/p?utm_source=x&gclid=1&dclid=2')).toEqual([]);
    expect(urlViolations('see https://a.test/p?email=x').map((v) => v.reason)).toEqual([
      'query parameter email',
    ]);
    expect(urlViolations('see https://a.test/p#frag').map((v) => v.reason)).toEqual([
      'fragment #frag',
    ]);
    expect(
      urlViolations('see "https://a.test/p?utm_source=x&q=1#f",').map((v) => v.reason),
    ).toEqual(['fragment #f', 'query parameter q']);
  });
});

test.describe('GA4 marker policy', () => {
  test('PRIV-16 (instrument) identity markers count as event parameters too, and benign drift does not', () => {
    expect(
      ga4MarkerViolations(['uid', 'ep.uid', 'epn.uid', 'ep.user_id', 'up.plan', 'gclid']),
    ).toEqual(['uid', 'ep.uid', 'epn.uid', 'ep.user_id', 'up.plan', 'gclid']);
    expect(
      ga4MarkerViolations(['ep.link_url', 'ep.file_name', 'epn.engagement_time_msec', 'tfd']),
    ).toEqual([]);
  });
});

test.describe('repository hygiene', () => {
  test('PRIV-18 nothing under tests/privacy/ is a capture, a HAR, or a real identifier', () => {
    const root = join(REPO_ROOT, 'tests/privacy');
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else files.push(full);
      }
    };
    walk(root);
    expect(files.length).toBeGreaterThan(10);
    expect(
      files.filter((f) => /\.(har|pcap|pcapng|log|pem|key)$/i.test(f)),
      'no capture or key material',
    ).toEqual([]);
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      const tokens = [...text.matchAll(/\bphc_[A-Za-z0-9]{8,}\b/g)].map((m) => m[0]);
      expect(
        tokens.filter((t) => t !== 'phc_privacy_test_fake'),
        `${file}: PostHog tokens`,
      ).toEqual([]);
      const ids = [...text.matchAll(/\bG-[A-Z0-9]{8,12}\b/g)].map((m) => m[0]);
      expect(
        ids.filter((i) => i !== 'G-PRIVACYTEST'),
        `${file}: GA4 measurement IDs`,
      ).toEqual([]);
    }
  });
});
