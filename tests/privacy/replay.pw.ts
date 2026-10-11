/**
 * Session replay payloads (specs/analytics-privacy.md § Capture Minimization
 * items 1 and 3; PRIV-2, PRIV-13). Replay is tested separately from event
 * scrubbing: its snapshots are rrweb records, some field-compressed by the SDK,
 * and masking happens in the recorder rather than in the event pipeline.
 */
import { CANARIES, FIXTURE_PATH, SITE_ORIGIN } from './harness/constants';
import { neutralRemoteConfig, REMOTE_CONFIG } from './harness/egress';
import {
  canaryHits,
  eventsNamed,
  expectCollecting,
  fillContactForm,
  leakHits,
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
    await fillContactForm(s.page); // the second form, with the contact values the GA4 test also uses
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

    // Every document's full snapshot is checked on its own: a regression that affects one form, or only the
    // second document, must not be hidden by the other one satisfying an aggregate count.
    const formFieldIds = [
      'fixture-form-text',
      'fixture-form-submit',
      'fixture-contact-email',
      'fixture-contact-phone',
      'fixture-contact-address',
      'fixture-contact-submit',
    ];
    for (const [index, snapshot] of fullSnapshots.entries()) {
      const where = `full snapshot ${index + 1}`;
      const snapshotNodes = findNodes(snapshot.data, () => true);
      const byId = (id: string) =>
        snapshotNodes.find((n) => (n.attributes as Record<string, unknown> | undefined)?.id === id);
      const text = snapshotNodes.filter((n) => n.type === 3).map((n) => String(n.textContent));
      expect(text, `${where}: ordinary page text is recorded unmasked`).toContain(
        'Privacy test fixture',
      );

      const masked = byId('fixture-masked');
      expect(masked, `${where}: the [data-np-privacy="mask"] element is present`).toBeDefined();
      expect(textOf(masked ?? {}), `${where}: its text is replaced by mask characters`).toBe(
        '*'.repeat(CANARIES.maskedText.length),
      );

      // rrweb records a blocked element as an empty placeholder carrying only its box (rr_* attributes).
      const blocked = snapshotNodes.filter(
        (n) => n.type === 2 && 'rr_width' in ((n.attributes as Record<string, unknown>) ?? {}),
      );
      expect(
        blocked.filter((n) => n.tagName === 'form').length,
        `${where}: both <form> elements are blocked placeholders`,
      ).toBe(2);
      expect(
        blocked.filter((n) => n.tagName === 'div').length,
        `${where}: the [data-np-privacy="block"] region is a blocked placeholder`,
      ).toBeGreaterThanOrEqual(1);
      for (const b of blocked)
        expect(b.childNodes, `${where}: a blocked element has no recorded children`).toEqual([]);
      // And no field of either form was recorded as an ordinary element.
      expect(
        formFieldIds.filter((id) => byId(id) !== undefined),
        `${where}: no form field is in the snapshot`,
      ).toEqual([]);

      const link = byId('fixture-sensitive-link');
      expect(
        (link?.attributes as Record<string, unknown>).href,
        `${where}: link href reduced, utm_source kept`,
      ).toBe(SCRUBBED_FIXTURE_URL);
      expect(
        (byId('fixture-pii-button')?.attributes as Record<string, unknown>)['data-fixture-pii'],
        `${where}: data-* attribute values are emptied`,
      ).toBe('');
    }
    const meta = items.filter((i) => i.type === 4).map((i) => i.data?.href);
    expect(meta, 'page URL in replay metadata is scrubbed with utm_source kept').toContain(
      SCRUBBED_FIXTURE_URL,
    );

    // Network timing is off in client config (#1261), so no request URL is recorded at all. The capture
    // configuration tests below show the client setting winning over the project's config.
    expect(
      items.filter((i) => i.type === 6 && i.data?.plugin === 'rrweb/network@1'),
      'no network-timing records',
    ).toEqual([]);

    // --- Absence checks over fully decompressed replay payloads.
    expect(s.sink.undecodedCollection(), 'every replay body was decodable').toEqual([]);
    const replayText = s.sink
      .snapshotEvents()
      .map(({ req }) => req.searchable)
      .join('\n');
    expect(replayText.length).toBeGreaterThan(5000);
    expect(
      leakHits(replayText),
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
    await fillContactForm(s.page);
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
    expect(leakHits(s.sink.searchableText('posthog'))).toEqual([]);
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

  test("PRIV-13 with the project's real config (console, canvas, network timing ON), the client turns all three off, and replay and web vitals still flow", async ({
    open,
  }) => {
    // The inventory found these three on in PostHog's remote config (Capture Conflicts C1 to C3), and the harness
    // serves that config. Nathan's decision 1 on #1079 (#1261) turns them off in client config, which wins over it.
    expect(REMOTE_CONFIG.sessionRecording).toMatchObject({
      consoleLogRecordingEnabled: true,
      recordCanvas: true,
    });
    expect(REMOTE_CONFIG.capturePerformance).toMatchObject({ network_timing: true });
    const s = await open();
    await s.goto(FIXTURE_PATH);
    await expectCollecting(s, { ga4: false });
    // Something for each feature to record while replay runs: a console line carrying a URL, a canvas drawn on
    // for over a second, and a request.
    await s.page.evaluate(async (m) => {
      console.log(m);
      const canvas = document.createElement('canvas');
      canvas.id = 'np-canvas-probe';
      canvas.width = 160;
      canvas.height = 80;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d context');
      ctx.fillStyle = '#c03';
      ctx.fillRect(0, 0, 160, 80);
      document.body.append(canvas);
      for (let i = 0; i < 10; i += 1) {
        ctx.fillStyle = `hsl(${i * 36} 80% 50%)`;
        ctx.fillRect(i * 16, 0, 16, 80);
        await new Promise((r) => setTimeout(r, 150));
      }
      await fetch('/favicon.svg?np-network-probe=1', { cache: 'no-store' });
    }, `np-console-probe-with-url ${SITE_ORIGIN}/x?email=${CANARIES.query}%40example.test#${CANARIES.fragment}`);
    await humanActivity(s.page);
    await s.page.waitForTimeout(4000);
    await unloadAndSettle(s.page);
    expect(s.sink.undecodedCollection(), 'every replay body was decodable').toEqual([]);

    // --- Positive controls: replay recorded the page, including the canvas element itself, and web vitals flowed.
    const items = replayItems(s);
    expect(
      items.some((i) => i.type === 2),
      'a full DOM snapshot',
    ).toBe(true);
    expect(
      items.some((i) => i.type === 3 && JSON.stringify(i.data).includes('np-canvas-probe')),
      'the canvas element was recorded as a DOM node while replay ran',
    ).toBe(true);
    expect(
      eventsNamed(s.sink.posthogEvents(), '$web_vitals').length,
      'web vitals events were sent',
    ).toBeGreaterThan(0);
    const options = customPayload(items, '$session_options') as
      { sessionRecordingOptions: Record<string, unknown>; activePlugins: string[] } | undefined;
    expect(options, 'the recorder reported its effective options').toBeDefined();

    // --- None of the three: no console, canvas, or network-timing record, and the recorder ran without them.
    expect(
      items.filter((i) => i.type === 6 && i.data?.plugin === 'rrweb/console@1'),
      'console records',
    ).toEqual([]);
    expect(
      items.filter((i) => i.type === 3 && i.data?.source === 9),
      'canvas mutation records',
    ).toEqual([]);
    expect(
      items.filter((i) => i.type === 6 && i.data?.plugin === 'rrweb/network@1'),
      'network-timing records',
    ).toEqual([]);
    const replayText = s.sink
      .snapshotEvents()
      .map(({ req }) => req.searchable)
      .join('\n');
    expect(replayText, 'a canvas image in a recorded node').not.toContain('rr_dataURL');
    expect(replayText, 'the console probe').not.toContain('np-console-probe');
    expect(replayText, 'the probe request URL').not.toContain('np-network-probe');
    expect(
      Boolean(options?.sessionRecordingOptions.recordCanvas),
      'canvas capture is off in the recorder',
    ).toBe(false);
    expect(options?.activePlugins ?? [], 'no console plugin').not.toContain('rrweb/console@1');
    expect(options?.activePlugins ?? [], 'no network plugin').not.toContain('rrweb/network@1');
    const clientConfig = (
      customPayload(items, '$posthog_config') as
        { config: { session_recording?: Record<string, unknown> } } | undefined
    )?.config;
    expect(clientConfig?.session_recording?.recordBody).toBe(false);
    expect(clientConfig?.session_recording?.recordHeaders).toBe(false);
  });
});
