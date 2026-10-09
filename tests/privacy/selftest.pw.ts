/**
 * Self-tests for the acceptance suite's own instruments. Neither group needs a
 * browser. They answer two questions every absence assertion depends on:
 * "is the fixture what production runs?" and "can the detector actually see a
 * canary in every encoding the SDKs use?"
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { REPO_ROOT } from './harness/constants';
import { loadManifest } from './harness/fixtures';
import { canaryHits, contactHits, urlViolations } from './harness/helpers';
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

  test('PRIV-1 the three recorded gtag.js variants equal the inventory (the fixture itself is not hash-gated, see manifest.json)', () => {
    expect(new Set(hashesIn(rowFor(section, '`gtag.js`')))).toEqual(
      new Set(manifest.gtag.productionSha256),
    );
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
