/**
 * Session replay payloads (specs/analytics-privacy.md § Capture Minimization
 * items 1 and 3; PRIV-2, PRIV-13). Replay is tested separately from event
 * scrubbing: its snapshots are rrweb records, some field-compressed by the SDK,
 * and masking happens in the recorder rather than in the event pipeline.
 */
import { CANARIES, FIXTURE_PATH, SITE_ORIGIN } from './harness/constants';
import { neutralRemoteConfig } from './harness/egress';
import {
  canaryHits,
  expectCollecting,
  findNodes,
  humanActivity,
  interactWithFixture,
  replayItems,
  sensitiveFixtureUrl,
  typeCanaries,
  unloadAndSettle,
  urlViolations,
} from './harness/helpers';
import { expect, test } from './harness/test';

const SCRUBBED_FIXTURE_URL = `${SITE_ORIGIN}${FIXTURE_PATH}?utm_source=fixture`;

const textOf = (node: Record<string, unknown>): string =>
  (Array.isArray(node.childNodes) ? (node.childNodes as Array<Record<string, unknown>>) : [])
    .map((c) => (typeof c.textContent === 'string' ? c.textContent : textOf(c)))
    .join('');

test.describe('replay payloads', () => {
  test('PRIV-2 (instrument) unmasked text on the page IS found in the decompressed replay, so the absence checks below can fail', async ({
    open,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: false });
    await s.page.evaluate((canary) => {
      const p = document.createElement('p');
      p.id = 'np-detector-control';
      p.textContent = canary; // not inside a masked or blocked region
      document.body.append(p);
    }, CANARIES.input);
    await humanActivity(s.page);
    await expect
      .poll(
        () =>
          canaryHits(
            s.sink
              .snapshotEvents()
              .map(({ req }) => req.searchable)
              .join('\n'),
          ),
        {
          message: 'the detector sees unmasked page text in decompressed replay traffic',
        },
      )
      .toEqual([CANARIES.input]);
  });

  test('PRIV-2 replay masks inputs and marked text, blocks forms and marked regions, scrubs URLs, and records no canary', async ({
    open,
  }) => {
    test.setTimeout(120_000);
    const s = await open();
    await s.goto(sensitiveFixtureUrl());
    await expectCollecting(s, { ga4: false });
    await interactWithFixture(s.page);
    await humanActivity(s.page);
    await s.page.waitForTimeout(3500);
    await Promise.all([s.page.waitForLoadState('load'), s.page.click('#fixture-sensitive-link')]);
    await humanActivity(s.page);
    await s.page.waitForTimeout(5000);
    await unloadAndSettle(s.page);
    await expect.poll(() => s.sink.snapshotEvents().length).toBeGreaterThan(1);

    const items = replayItems(s);
    const fullSnapshots = items.filter((i) => i.type === 2);
    expect(fullSnapshots.length, 'a full DOM snapshot per document').toBeGreaterThanOrEqual(2);

    // --- Positive controls: what the recording does contain.
    const nodes = fullSnapshots.flatMap((i) => findNodes(i.data, () => true));
    const allText = nodes.filter((n) => n.type === 3).map((n) => String(n.textContent));
    expect(allText, 'ordinary page text is recorded unmasked').toContain('Privacy test fixture');
    expect(allText).toContain('Fixture button');

    const typed = items
      .filter((i) => i.type === 3 && i.data?.source === 5)
      .map((i) => String(i.data?.text));
    expect(typed.length, 'typing into the inputs was recorded').toBeGreaterThan(0);
    expect(
      typed.every((t) => /^\*+$/.test(t)),
      'every recorded input value is masked',
    ).toBe(true);
    expect(typed, 'the 15-character canary is recorded as 15 mask characters').toContain(
      '*'.repeat(CANARIES.input.length),
    );

    const masked = nodes.find(
      (n) => (n.attributes as Record<string, unknown> | undefined)?.id === 'fixture-masked',
    );
    expect(masked, 'the [data-np-privacy="mask"] element is in the snapshot').toBeDefined();
    expect(textOf(masked ?? {}), 'its text is replaced by mask characters of the same length').toBe(
      '*'.repeat(CANARIES.maskedText.length),
    );

    // rrweb records a blocked element as an empty placeholder carrying only its box (rr_* attributes).
    const blocked = nodes.filter(
      (n) => n.type === 2 && 'rr_width' in ((n.attributes as Record<string, unknown>) ?? {}),
    );
    expect(
      blocked.filter((n) => n.tagName === 'form').length,
      'both <form> elements are blocked, not recorded',
    ).toBeGreaterThanOrEqual(2);
    expect(
      blocked.filter((n) => n.tagName === 'div').length,
      'the [data-np-privacy="block"] region is blocked',
    ).toBeGreaterThanOrEqual(1);
    for (const b of blocked)
      expect(b.childNodes, 'a blocked element has no recorded children').toEqual([]);

    const link = nodes.find(
      (n) => (n.attributes as Record<string, unknown> | undefined)?.id === 'fixture-sensitive-link',
    );
    expect(
      (link?.attributes as Record<string, unknown>).href,
      'link href in the DOM reduced, utm_source kept',
    ).toBe(SCRUBBED_FIXTURE_URL);
    const pii = nodes.find(
      (n) => (n.attributes as Record<string, unknown> | undefined)?.id === 'fixture-pii-button',
    );
    expect(
      (pii?.attributes as Record<string, unknown>)['data-fixture-pii'],
      'data-* attribute values are emptied',
    ).toBe('');
    const meta = items.filter((i) => i.type === 4).map((i) => i.data?.href);
    expect(meta, 'page URL in replay metadata is scrubbed with utm_source kept').toContain(
      SCRUBBED_FIXTURE_URL,
    );

    const requests = items
      .filter((i) => i.type === 6)
      .flatMap((i) =>
        ((i.data?.payload as { requests?: Array<{ name: string }> })?.requests ?? []).map(
          (r) => r.name,
        ),
      );
    expect(
      requests.length,
      'network timing entries were recorded (positive control)',
    ).toBeGreaterThan(0);
    expect(requests, 'the document request is recorded under its scrubbed URL').toContain(
      SCRUBBED_FIXTURE_URL,
    );

    // --- Absence checks over fully decompressed replay payloads.
    expect(s.sink.undecodedCollection(), 'every replay body was decodable').toEqual([]);
    const replayText = s.sink
      .snapshotEvents()
      .map(({ req }) => req.searchable)
      .join('\n');
    expect(replayText.length).toBeGreaterThan(5000);
    expect(
      canaryHits(replayText),
      'no NP-CANARY-* string in any decompressed replay payload',
    ).toEqual([]);
    const replayPlain = s.sink
      .snapshotEvents()
      .map(({ req }) => req.plain)
      .join('\n');
    expect(
      urlViolations(replayPlain),
      'every URL in the recording is reduced to origin, path, and allowlisted parameters',
    ).toEqual([]);
  });

  test('PRIV-2 typed text is masked even in a field the page marks nothing on, and a password-like value never appears', async ({
    open,
  }) => {
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: false });
    await typeCanaries(s.page);
    await s.page.fill('#fixture-email', `${CANARIES.input}@example.test`);
    await s.page.waitForTimeout(4000);
    await unloadAndSettle(s.page);
    await expect
      .poll(() => replayItems(s).filter((i) => i.type === 3 && i.data?.source === 5).length, {
        message: 'the typing was flushed to the sink',
      })
      .toBeGreaterThan(0);
    const typed = replayItems(s)
      .filter((i) => i.type === 3 && i.data?.source === 5)
      .map((i) => String(i.data?.text));
    expect(typed.length).toBeGreaterThan(0);
    expect(typed.every((t) => /^\*+$/.test(t))).toBe(true);
    expect(canaryHits(s.sink.searchableText('posthog'))).toEqual([]);
  });
});

test.describe('capture configuration (PRIV-13)', () => {
  /** The recorder writes its effective options and plugin list into the stream as custom events. */
  const customPayload = (
    items: ReturnType<typeof replayItems>,
    tag: string,
  ): Record<string, unknown> | undefined =>
    items.find((i) => i.type === 5 && i.data?.tag === tag)?.data?.payload as
      Record<string, unknown> | undefined;

  test('PRIV-13 with a conflict-free project config, the client does not turn on console, canvas, network, or body capture', async ({
    open,
    egress,
  }) => {
    const s = await open(); // `open` resets the sink and the remote config, so set the config after it
    egress.remoteConfig = neutralRemoteConfig();
    await s.goto(FIXTURE_PATH);
    await s.page.evaluate(() => console.log('np-console-probe'));
    await expectCollecting(s, { ga4: false });
    await s.page.waitForTimeout(3000);
    await unloadAndSettle(s.page);

    const items = replayItems(s);
    const options = customPayload(items, '$session_options') as
      { sessionRecordingOptions: Record<string, unknown>; activePlugins: string[] } | undefined;
    expect(options, 'the recorder reported its effective options (positive control)').toBeDefined();
    expect(
      Boolean(options?.sessionRecordingOptions.recordCanvas),
      'canvas capture is not turned on by the client',
    ).toBe(false);
    expect(options?.activePlugins ?? [], 'no console plugin').not.toContain('rrweb/console@1');
    expect(options?.activePlugins ?? [], 'no network plugin').not.toContain('rrweb/network@1');
    expect(
      items.filter((i) => i.type === 6),
      'no network records',
    ).toEqual([]);
    expect(JSON.stringify(items), 'the console probe was not recorded').not.toContain(
      'np-console-probe',
    );
    const clientConfig = (
      customPayload(items, '$posthog_config') as
        { config: { session_recording?: Record<string, unknown> } } | undefined
    )?.config;
    expect(
      clientConfig?.session_recording?.recordBody,
      'request and response bodies are not captured',
    ).toBe(false);
    expect(
      clientConfig?.session_recording?.recordHeaders,
      'request and response headers are not captured',
    ).toBe(false);
  });

  test("PRIV-13 with the project's real config (console, canvas, network timing ON), the client leaves them as configured and never adds bodies", async ({
    open,
  }) => {
    // The inventory found these three on in PostHog's remote config (Capture Conflicts C1 to C3). The contract
    // says the runtime must leave them alone and report them to Nathan, not override them from the client.
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: false });
    const marker =
      'np-console-probe-with-url https://nathanpayne.test/x?email=NP-CANARY-QUERY%40example.test#NP-CANARY-FRAGMENT';
    await s.page.evaluate((m) => console.log(m), marker);
    await s.page.waitForTimeout(4000);
    await unloadAndSettle(s.page);
    await expect
      .poll(
        () =>
          replayItems(s).filter((i) => i.type === 6 && i.data?.plugin === 'rrweb/console@1').length,
        { message: 'the console record reached the sink' },
      )
      .toBeGreaterThan(0);

    const items = replayItems(s);
    const options = customPayload(items, '$session_options') as
      { sessionRecordingOptions: Record<string, unknown>; activePlugins: string[] } | undefined;
    expect(
      options?.sessionRecordingOptions.recordCanvas,
      'project canvas setting left in effect',
    ).toBe(true);
    expect(options?.activePlugins, 'project console and network settings left in effect').toEqual(
      expect.arrayContaining(['rrweb/console@1', 'rrweb/network@1']),
    );
    const clientConfig = (
      customPayload(items, '$posthog_config') as
        { config: { session_recording?: Record<string, unknown> } } | undefined
    )?.config;
    expect(clientConfig?.session_recording?.recordBody).toBe(false);
    expect(clientConfig?.session_recording?.recordHeaders).toBe(false);
    for (const record of items.filter((i) => i.type === 6)) {
      const requests =
        (record.data?.payload as { requests?: Array<Record<string, unknown>> }).requests ?? [];
      for (const r of requests) {
        expect(
          Object.keys(r).filter(
            (k) => /body$|headers$/i.test(k) && !/^(encoded|decoded)BodySize$/.test(k),
          ),
        ).toEqual([]);
      }
    }
    const consoleRecords = items.filter(
      (i) => i.type === 6 && i.data?.plugin === 'rrweb/console@1',
    );
    const recorded = JSON.stringify(consoleRecords);
    test.info().annotations.push({
      type: 'finding',
      description: `C1 live: console output is in the recording (${consoleRecords.length} record(s)); the probe URL was ${
        recorded.includes('NP-CANARY') ? 'NOT scrubbed' : 'scrubbed'
      } in it`,
    });
    expect(
      consoleRecords.length,
      'console capture is active, as configured by the project (conflict C1)',
    ).toBeGreaterThan(0);
  });
});
