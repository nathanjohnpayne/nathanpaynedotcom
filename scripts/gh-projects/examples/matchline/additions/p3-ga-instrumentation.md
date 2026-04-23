Instrument Firebase Analytics / GA4 events on the V1 surfaces so Phase 3 real-use generates its own funnel data. Prerequisite: GA property linked at Firebase-project creation time (see scope note on #11).

**Why Phase 3, not earlier.**

Single-user V1 doesn't need analytics for *product decisions* (sample size = 1). But Phase 3 is where Nathan uses Matchline for real applications and where tuning (#38, #39, #40) and telemetry (#41) live. GA events give:

- A zero-cost funnel view: onboarding → first Unit approved → first Match approved → first Application generated → first export. Useful for spotting drop-off even at N=1.
- A durable record of what screens got used when, which is easier to reason about than scraping Firestore `updated_at` timestamps.
- Free-tier quotas that are fine for single-user usage; no paid tier needed.

It's also cheap to instrument *after* the surfaces are built (Phase 2 done) and expensive to retrofit if the event schema is wrong. Landing this during Phase 3 real-use means the event schema is informed by actual usage, not guessed.

**Scope:**

1. **SDK init.** `src/lib/analytics.ts` initializes `getAnalytics(firebaseApp)` only when `VITE_FIREBASE_ANALYTICS_ENABLED === "true"` — so local dev and the eval harness don't pollute the property. Import from `src/main.tsx` on boot.
2. **Event schema.** One typed wrapper per event, so call sites never pass freeform strings:
   - `track.onboardingStarted({ source: "resume" | "linkedin" | "longform" })`
   - `track.extractionCompleted({ unitCount, durationMs })`
   - `track.unitApproved({ unitId, evidenceType })`
   - `track.unitRejected({ unitId })`
   - `track.jdParsed({ roleId, requirementCount })`
   - `track.matchingCompleted({ roleId, matchCount, gapCount })`
   - `track.matchApproved({ matchId })`
   - `track.generationCompleted({ format: "resume" | "coverLetter", bulletCount })`
   - `track.validationFlagResolved({ reason: "edit" | "remove" | "addUnit" })`
   - `track.applicationExported({ format: "pdf" | "docx" | "txt" })`
   - `track.stageAdvanced({ from, to })`
3. **Wire into the five surfaces.** Onboarding, Unit Review, Role Detail (Requirements + Matches tabs), Application Editor, Pipeline. Every user-visible state transition emits exactly one event. Pure service-layer calls emit nothing; only screen-level events surface.
4. **No PII in events.** UUIDs only. Never include raw resume text, JD text, or generated bullet text. Lint rule (grep-based) to catch regressions.
5. **Debug view.** While developing, `VITE_FIREBASE_ANALYTICS_DEBUG=true` routes events through GA's DebugView instead of production — keeps the real property clean during event-schema iteration.
6. **Documentation.** `docs/architecture/analytics-events.md` — one-pager listing every event, its payload, and when it fires. Kept in sync via a tiny test that reflects on `src/lib/analytics.ts` and diffs against the doc.

**Non-goals:**

- Server-side events (Firebase Functions → Measurement Protocol). Client events cover the V1 funnel.
- Experimentation / A-B testing. V1 is single-user.
- Custom audiences / remarketing. Not a consumer product.
- Outcome tracking (did this application → interview → offer). That's `Application.stage` transitions in Firestore; GA doesn't need it.

**Verification:**

- Manually: complete the onboarding → approve a Unit → generate → export flow. Every event appears in GA DebugView with the expected payload shape.
- Unit test: calling each `track.*` wrapper with a known payload invokes `logEvent` exactly once with the expected event name + params.
- Lint: grep for raw `logEvent(` call sites outside `src/lib/analytics.ts` → zero hits.

Parent: #__PARENT_NUM__
Related: #11 (GA property linked at project-create time), #41 (cost + latency telemetry — different surface, complementary).
