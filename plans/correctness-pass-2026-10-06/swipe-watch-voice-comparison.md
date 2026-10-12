# Swipe Watch—voice approval packet

Draft date: 2026-10-12. Status: root audited the owner's applied cost/card/evidence conditions and authorized PR #1310 and merge after the repository gates. The review refinements below are applied and await root's final audit before merge. Deployment is outside this approval.

Factual baseline: `467d26110ae1b3850f03b88296300b4f23262909`, current `origin/main` when this pass began. Source: `src/content/projects/swipe-watch.mdx`. Dated facts ledger: `plans/correctness-pass-2026-10-06/swipe-watch-ledger.md`. Worktree: `/Users/nathanpayne/.codex/worktrees/swipe-watch-voice/nathanpaynedotcom`, branch `codex/swipe-watch-voice`.

## Approval summary

The complete page is rewritten, including every field in all three decisions, the four constraint glosses, hero, card on both homepage/index surfaces, and a separate search snippet. The first-person account makes the question, scope decisions and costs direct. It keeps the owner's two thesis lines: “A preference-gathering loop that terminates after ten signals is not a loop,” and “Swipe Watch is not a recommendation engine. It is the interaction layer I would put upstream of one.” The prototype's payoff remains a chosen simulation, not an accident, and the economy remains a second untested mechanic with no comparison design.

All three body sections, three decision titles and lenses, validated/mixed/pending statuses, constraint values, Mux playback ID, hero GIF, paired screenshots, exact captions, component placement and links stay fixed. Long body paragraphs are split. No new learning component or shared style is added.

The complete authored reader copy is **1312 → 1248 words**, a **4.9% cut**. This count uses whitespace-separated words in the title, hero, kicker, status, format/focus/stack, constraints, all decision fields, related labels and body headings/prose/captions. It excludes generated component/button labels, MDX/HTML/import syntax, destinations and separate card/search renditions. The brevity checker's body-only count is 578 → 566 (-2.1%); much of this page's copy lives in frontmatter.

Two factual qualifications are clearer. The signal-density comparison is explicitly a hypothesis, with the browsing-versus-play premise conditional on a system that waits for viewing signals and a hypothetical session with no more than one play. Thirteen commits remain the core-build record count, but no longer claim to measure total work or total loss: working code predates the first commit. Both supporting ledger rows/details are repaired in place. The ledger's stale assertions that current cards/résumé still say “accidentally”/“inadvertently” are also corrected: current source and both résumé surfaces already use neutral simulated-payoff wording, so there is no new intent decision to make.

The canonical résumé entry was reread against the draft and matches the site body verbatim. Disney+/Hulu discovery, the simulated-payoff interpretation limit, and the EVP demo as the author's account still hold. Only the case-study hash and review date change; résumé body/hash and private canonical remain unchanged.

## Writing-style pass

The installed Write Like Me skill was used through its supplied-reference route. No private writing retrieval or cache was used. The designated after passage in the owner's batch brief is model prose selected by the owner as the style reference; it is not presented as a newly user-authored corpus. The complete source was then checked separately against the original and facts ledger for meaning, actor, causation, chronology and uncertainty.

## Metadata renditions

### Hero and social-card fallback

**Before (149 characters):** Can a streaming service learn your taste before you press play? An independent swipe-based discovery prototype built on the Disney+ and Hulu catalog.

**After (180 characters):** I built an independent swipe prototype with Disney+ and Hulu titles to ask for taste before a viewer presses play. It simulates the recommendation payoff; no engine learns from it.

### Project index and homepage card

**Before (181 characters):** A swipe-first streaming recommender whose prototype faked the payoff it was meant to test—a choice that made reactions to the demo impossible to separate from reactions to the idea.

**After (185 characters):** I built a swipe prototype to ask for taste before viewing. I let the demo promise better recommendations it didn't produce, so I couldn't separate reactions to the idea from the payoff.

### Search snippet

**Before (149 characters via hero fallback; separate field absent):** Can a streaming service learn your taste before you press play? An independent swipe-based discovery prototype built on the Disney+ and Hulu catalog.

**After (159 characters):** An independent Disney+ and Hulu discovery prototype. I tested swiping, simulated the recommendation payoff, and couldn't measure whether it improved discovery.

The 180-character hero meets the social line's cap and the rendered fit passes. The 185-character card is within the 120–200 guide. The separate search snippet is 159 characters. The page continues to use the existing social fallback; no OG template changes. Its refreshed reference is `screenshots/og/projects-swipe-watch.png`.

## Complete proposed reader page

Every component record is expanded below at its source position. The hero image represents the unchanged Mux-backed recording and fallback. The pair wrapper and caption text match the source.

# Swipe Watch

I built an independent swipe prototype with Disney+ and Hulu titles to ask for taste before a viewer presses play. It simulates the recommendation payoff; no engine learns from it.

AI × Consumer × Streaming

**Status:** EXPERIMENT

**Format:** Interaction prototype

**Focus:** Discovery, recommendations, and interaction design

![Swipe Watch](/images/projects/swipe-watch-hero.gif)

Vanilla JavaScript · Firebase Hosting

[View Live Product](https://swipewatch.web.app) · [View on GitHub](https://github.com/nathanjohnpayne/swipewatch)

## The hypothesis

I wanted to test a cheaper way to ask about taste. Starting, finishing or abandoning a title costs a viewer attention. A recommender that waits for those signals has to wait for that commitment too.

My hypothesis was that discovery could gather preferences before viewing. If the system learns only when someone presses play, a viewer can browse for ten minutes without teaching it anything.

A swipe costs a gesture. I wanted an interface that asked for taste directly, instead of inferring it from what someone finished last month. The question was whether discovery itself could gather the preferences a recommender needed.

I built Swipe Watch with real Disney+ and Hulu titles and key art, dealt as cards. Swipe left to dismiss, right for interested, up to flag one for later. Each gesture gives a low-stakes signal before a viewer commits to watching.

- **13 commits:** core build in the repository record; work predates the first commit
- **106 titles:** hand-curated
- **10 cards:** per session
- **No backend:** device-local

## The prototype

I built the first version around one question: does swiping feel natural for expressing taste in a streaming catalog? I needed real titles, real art and card physics to test that. I did not need a recommendation engine, so I left it out.

Then I ran out of cards. Sessions deal ten, and the first version ended at a dead-end screen. A preference-gathering loop that terminates after ten signals is not a loop.

In the second iteration, I added coins: earn them by swiping, then spend them to unlock further discovery modes. I wanted the end of a deck to offer a reason to keep going.

That change came from watching the core mechanic run out of room. It also added another untested mechanic to an experiment that had started with one question.

<div class="figure-pair">

![Swipe interaction: a Hulu title card with dismiss, save and like controls, dealt ten to a session.](/images/projects/swipe-watch-card.png)

![The second loop: the end-of-session screen, where swipes have banked ten coins toward unlocking another discovery mode.](/images/projects/swipe-watch-end-screen.png)

</div>

### No stack until the feel earns one

Fidelity · validated

**What I encountered**

I wanted to know whether swiping felt natural for expressing taste in a streaming catalog. I could have started with React, a bundler and a build pipeline before moving the first card.

**Over**

A framework scaffold, like the larger applications in this portfolio use. I would usually choose one for something meant to outlive a prototype.

**What I decided**

I used vanilla JavaScript, with no framework or build step. Firebase Hosting serves the source files as-is. It served the repo root until 2026-09-29 and a static public/ directory since. There is no build output.

**Why**

I was testing the feel of the interaction. Anything between an edit and a reload got in the way. The repository records thirteen core-build commits, but the first already contains a working prototype. That count does not measure all the work I would have discarded if the swipe felt wrong.

**Cost**

I kept the throwaway. Types, components and a build step are still missing. Taking it into a product would mean a rewrite rather than an extension.

**What it changed**

I never had to unwind that choice. The first commit already carried a working swipe UI, session management and analytics. The prototype still has no build script or runtime dependency.

### Let the prototype fake its payoff

Interpretability · mixed

**What I encountered**

The proposed loop was swipe, then get better recommendations. I left its second half out of scope: no ML and no personalization. If the prototype said nothing after a swipe, it would show a different, deader product.

**Over**

A plain session summary, without a promise of better recommendations. That would make reactions easier to interpret, but leave the missing half visible in the demo.

**What I decided**

I let the copy simulate the missing payoff. The demo could show the loop I was proposing even though the software implemented only part of it.

**Why**

People seeing the prototype would have to imagine the finished version either way. I wanted to give them something concrete to react to.

**Cost**

I made reactions to the demo impossible to separate from reactions to the idea. People could respond to a recommendation payoff the software did not produce. No demo of this prototype can tell me whether the real loop works.

**What it changed**

I describe the demo conversation in What I learned below. The simulated payoff let me show the proposed loop, but could not validate it.

### Give the deck a bottom

Loop · pending

**What I encountered**

The first build let me work through ten cards, then stopped at a dead-end screen. It gave me one round of preference gathering and a restart button.

**Over**

Keep the prototype to one question and leave the economy out. That would avoid adding another untested mechanic and give me a longer coin-free baseline.

**What I decided**

I added an economy. Swipes earn coins, and coins unlock further discovery modes. Finishing the deck could give a viewer a reason to keep going.

**Why**

One coin per swipe makes an unlock cost exactly 25 swipes. That was easy to understand and cheap to build on the counters already there.

**Cost**

I compromised the baseline for the swipe by adding a second mechanic. A coin-free production window exists: a few days to a month, depending on when the first deploy landed. No analysis of it has been published. The prototype cannot tell me whether the swipe alone sustains attention.

**Validation boundary**

I set up no flag, variant or cohort to compare engagement before and after the economy. The question remains unresolved. An unlock opens another view of the same catalog; it does not add titles.

## What I learned

My argument was signal density, not "Tinder for streaming."

Ten cards can produce ten explicit preference statements before a viewer commits to watching. In a hypothetical session with no more than one play, a recommender that learns only from plays would get at most one signal. If no title is played, it gets none. My hypothesis was that asking for a cheap signal could gather more preferences for the same attention.

I wanted to feed a recommender explicit, deliberately given preferences while a viewer was already deciding what to watch. It could work with dense, explicit answers collected before viewing, instead of waiting to infer taste from sparse, expensive, ambiguous events.

I demoed Swipe Watch to Disney's EVP of Product, and the signal-density argument is what landed. The prototype made an abstract argument concrete enough to react to. That is my account of a conversation, not a measurement. It tells me the question is worth asking. It does not tell me the answer is yes.

No result from the prototype's analytics has been published. The save gesture has a limit too: the app counts it as Super Liked for the session, then forgets when the session ends. It does not keep a saved-title list.

My read is that the interaction holds up: the gesture is legible, the deck is quick, and the loop has somewhere to go. Whether those signals beat viewing history is still unanswered. The prototype observes no viewing history to compare against.

Swipe Watch is not a recommendation engine. It is the interaction layer I would put upstream of one.

## Related

- [Blog: Six PRs, One Bug: What AI Agents Actually Get Wrong](/blog/six-prs-one-bug-agent-failure-modes/)
- [Project: Device Source of Truth](/projects/device-source-of-truth/)

## Most-changed passages

### The premise is a hypothesis

**Before**

Streaming recommendations learn from expensive signals. A start, a finish, an abandon—each one costs the viewer a real commitment of attention, and the system has to wait for it. That makes preference data sparse and late: you browse for ten minutes and teach the recommender nothing until you actually commit.

A swipe costs a gesture. So the question is not whether a better model could rank the catalog, but whether discovery itself could be the preference-gathering loop—an interface that asks for taste directly instead of inferring it from what you finished last month.

Swipe Watch is that question, built. Real Disney+ and Hulu titles with real key art, dealt as cards: swipe left to dismiss, right for interested, up to flag one for later. Each gesture is a low-stakes signal, given before any viewing commitment.

**After**

I wanted to test a cheaper way to ask about taste. Starting, finishing or abandoning a title costs a viewer attention. A recommender that waits for those signals has to wait for that commitment too.

My hypothesis was that discovery could gather preferences before viewing. If the system learns only when someone presses play, a viewer can browse for ten minutes without teaching it anything.

A swipe costs a gesture. I wanted an interface that asked for taste directly, instead of inferring it from what someone finished last month. The question was whether discovery itself could gather the preferences a recommender needed.

I built Swipe Watch with real Disney+ and Hulu titles and key art, dealt as cards. Swipe left to dismiss, right for interested, up to flag one for later. Each gesture gives a low-stakes signal before a viewer commits to watching.

### Thirteen commits do not measure total work

**Before**

Interaction feel was the entire question, so everything between an edit and a reload was overhead. If the swipe felt wrong, the total loss was thirteen commits.

**After**

I was testing the feel of the interaction. Anything between an edit and a reload got in the way. The repository records thirteen core-build commits, but the first already contains a working prototype. That count does not measure all the work I would have discarded if the swipe felt wrong.

### Simulated payoff and the interpretation cost

**Before**

Every reaction becomes uninterpretable. A response to the prototype cannot be separated from a response to the idea, because what people are reacting to is a payoff the software does not produce—and that is a ceiling on what any demo of this thing can establish, permanently.

**After**

I made reactions to the demo impossible to separate from reactions to the idea. People could respond to a recommendation payoff the software did not produce. No demo of this prototype can tell me whether the real loop works.

### The coin-free baseline remains unresolved

**Before**

Adding a second mechanic compromised the baseline for the first. A coin-free production window does exist—a few days to a month, depending on when the first deploy landed—but no analysis of it has been published, so whether the swipe alone sustains attention is a question the prototype cannot answer about itself.

**After**

I compromised the baseline for the swipe by adding a second mechanic. A coin-free production window exists: a few days to a month, depending on when the first deploy landed. No analysis of it has been published. The prototype cannot tell me whether the swipe alone sustains attention.

### Demo outcome and measurement boundary

**Before**

I demoed Swipe Watch to Disney's EVP of Product, and the signal-density argument is what landed. That is the outcome this prototype was built to produce: it made an abstract argument about preference data concrete enough to react to. It is my own account of a conversation rather than a measurement, and it is evidence that the question is worth asking—not evidence that the answer is yes. No result from the prototype's analytics has ever been published, and the save gesture, despite its label, files a title under a heading the app forgets when the session ends.

**After**

I demoed Swipe Watch to Disney's EVP of Product, and the signal-density argument is what landed. The prototype made an abstract argument concrete enough to react to. That is my account of a conversation, not a measurement. It tells me the question is worth asking. It does not tell me the answer is yes.

No result from the prototype's analytics has been published. The save gesture has a limit too: the app counts it as Super Liked for the session, then forgets when the session ends. It does not keep a saved-title list.


## Complete substantive-point and qualification mapping

All R1–R32 rows and the page's additional opinions/closing claims are covered. The dated evidence is not re-presented as a fresh product or analytics audit.

| Source points | Draft location | Disposition and qualification |
|---|---|---|
| R1, R18: thirteen core-build commits; work before the record | Constraints; first rationale | Count retained. New explicit qualification removes “total loss” as a measure of all work; initial commit already has a working prototype. No replacement duration is invented. |
| R2, R30: Hulu card, ten-per-session caption; ten coins toward another mode | Unchanged paired captions | Images, exact caption text, wrapper and placement retained. “Toward” does not imply ten coins meet the 25-coin threshold. |
| R3, R31: Six PRs title/target; Device project link | Related | Current colon label and both destinations unchanged; historical em-dash drift not reintroduced. |
| R4: root served until 2026-09-29; source public/ directory since; no build output | First chosen | Exact date and chronology retained. No output/build step implied by public/. |
| R5: EVP demo; argument landed; author's account, not measurement | Closing; pointer in second evidence | The complete account and measurement boundary appear once in What I learned. The second evidence field points there and retains the simulated payoff's inability to validate the proposed loop. Repeated substantive material is combined, not deleted. No quote, attendee, feedback detail, adoption or measured success invented. Canonical résumé is consistent, not independent corroboration. |
| R6, R21: copy simulates recommendation payoff; chosen framing; no learned recommendations | Hero/card; second record | Retained and made direct. Current accidental framing was already removed before this draft; ledger now reflects that. The owner account supplies intent; repository primary evidence proves copy/mechanism only. |
| R7: coin-free deployed window, a few days to a month depending on deploy; no published analysis | Third cost | Bounds and deploy uncertainty retained. “No published analysis” is kept, rather than claiming nobody examined private GA4. No exact deployment start or named-host proof added. |
| R8: expensive viewing signals vs cheap gesture; ten cards/ten preference statements; one-play comparison | Hypothesis; closing | All parts of the argument survive as explicit hypothesis. The one-at-most bound is conditional on both a hypothetical session with no more than one play and a recommender learning only from plays. A session without a play supplies none of that signal. The bound does not apply to all browsing sessions or describe an industry-wide measurement. No new work-history claim used as authority. |
| R9–R11, R15, R16: live prototype; Mux/GIF portrait; public repo; hosting-only vanilla JS; no framework/build/runtime dependency | Metadata; first chosen/cost/evidence; hero | Config/URLs/assets fixed. First record preserves continuing throwaway with missing types/components/build step and owner's rewrite judgment. No stronger source-bundle/provenance assertion added. |
| R12, R29: 106 hand-curated titles, Disney+/Hulu real art, three gestures | Constraints; opening | Retained. The page does not claim access to a whole catalog, a backend feed, or that the owner hand-entered every title. Left dismisses, right signals interest, up flags for later. |
| R13: ten-card session, first version dead end | Constraint; prototype prose; third context; captions; closing | Designed size and ten-signal example retained; no claim every possible pool remainder must deal exactly ten. |
| R14: no backend, device-local | Constraints; scope framing | Fixed. Analytics is not presented as a recommendation backend or persistent watchlist. |
| R17: first commit working swipe, session management, analytics | First evidence/rationale | All three capabilities retained. No claim that the work began with the repository. |
| R19: portfolio applications use frameworks; usually right beyond prototype | First rejected | Retained as owner's implementation comparison and opinion. |
| R20: no ML/personalization/recommendation engine; no viewing history | Second context; prototype prose; final paragraphs | All negatives retained. The prototype cannot establish signal superiority without comparison data. No engine or recommender improvement claimed. |
| R22: original dead-end after ten cards, restart only | Third context; prototype prose | Retained. The day-one display count is not described as a persistent spendable economy. |
| R23, R24: economy second; one coin/swipe; 25-swipes unlock; reuse existing counters | Third chosen/rationale; prototype prose | Order, ratio and price retained. “Could give a reason to keep going” remains a purpose, not engagement evidence. |
| R25, R26: unlocked modes filter existing catalog; no flag, variant, cohort; before/after unresolved | Third evidence | Full limits retained. No new titles, cohort, causality or retention result implied. |
| R27: save is session-local label/counter, not saved-title list | Closing | Precision: Super Liked count resets after session; app keeps no saved titles. “The app forgets” does not claim GA4 failed to receive a title event. |
| R28: no published analytics result | Closing; third cost | Retained; says nothing about whether unreadable GA4 was ever examined. |
| R32: EXPERIMENT; record statuses validated/mixed/pending | Metadata; decision records | Values fixed. Validated is the no-stack implementation choice, not signal quality or adoption. Mixed is interpretation-cost tradeoff; economy remains pending. |
| No-stack costs: missing types/components/build; rewrite rather than growth; still throwaway | First cost | Retained as the owner's product judgment. No implication the prototype has already been rewritten. |
| Payoff rationale: audience imagines finished loop; plain summary leaves hole; full demo gives reaction material | Second context/chosen/rejected/rationale | Retained. The simulated promise prevents separating demo/idea reactions and cannot validate real loop. |
| Economy costs: second untested mechanic corrupts first baseline; holding it back gives longer baseline | Third context/rejected/cost; prototype prose | Retained. A prior window exists, but no analysis/design answers attention or engagement. |
| Product change came from watching core mechanic run out of room | Prototype prose | Retained in first person, with the second-mechanic cost beside it. No quantitative observer result added. |
| Signal density rather than “Tinder for streaming”; explicit preferences while choosing; interaction holds up | Closing | Thesis/phrase retained. “My read” labels the gesture/deck/loop judgment as an author's interpretation, not user validation. |
| Closing boundary: upstream interaction layer, not recommendation engine; question worth asking, answer unknown | Closing | Exact final thesis retained and all outcome limits explicit. |

## Supporting changes and structural choices

- R6 summary/detail, cross-page item and applied-fixes note now distinguish the historical accident-versus-choice contradiction from current consistent wording. The historical source quotation stays as evidence of what was audited.
- R8 summary/detail and applied-fixes note now describe the explicit hypothesis and both assumptions behind the conditional comparison: no more than one play in the hypothetical session, and a recommender learning only from plays. R18 summary/detail and note preserve count while retracting total-work/total-loss framing. These repairs live at the affected conclusions rather than only in a downstream appendix.
- Résumé review stamp changes only the case-study hash/date. Its body and body hash stay fixed after manual comparison with the canonical.
- Section/decision headings are sentence case and unchanged. Cross-page/ledger searches found no external exact decision-title quote to update.
- The paired screenshots and all component positions remain intact. The body is split for readability; every decision is still complete. The owner's complete-record workflow controls field lengths rather than cutting technical qualifications to an arbitrary paragraph cap.
- Only the assigned social reference is refreshed. Shared CSS/components/checkers, other authored pages and the canonical résumé are untouched. Root coordinated one shared route correction and one regression assertion in the existing project-page suite: social link descriptions now use the same frontmatter rendition as their image, while normal search metadata and structured data retain the SEO fallback.

## Validation and limits

The draft was rebased onto `ff2daa3e1f4b370a673d0f8ac75b757bdb171f72`, the verified main merge of Five Across #1299. The original factual baseline remains the before-copy authority; this newer base supplies the shared evidence-paragraph style. No authored Swipe Watch copy changed during integration.

- Uncredentialed final Astro build passes: 43 pages and 21 real social cards, including this project's 180-character fallback and rendered fit.
- Seven focused existing suites passed for the full draft, 267/267: `tests/project-pages.test.js`, `tests/content-schema.test.js`, `tests/resume-claims-review.test.js`, `tests/resume.test.js`, `tests/og-fit.test.js`, `tests/og-card-crop-safe.test.js`, and `tests/og-image-targets.test.js`. These ran before dependency integration; authored copy did not change during that integration. The final search-wording correction and owner-requested fields are covered by the focused rerun below.
- Full responsive suite passed on the refreshed base before the later search and owner-requested cost/card/evidence edits: 369 passed, 51 expected responsive-condition skips, two workers. The reader body, hero and layouts are unchanged by those edits; scoped checks below cover the changed frontmatter. Its all-file global setup verifies every served file against this checkout's dist by SHA-256. Swipe Watch's video fallback and reduced-motion checks pass.
- Desktop 1440×900 and phone 375×667 render every field in all three decisions; no page errors or horizontal overflow. Evidence now computes to `white-space: pre-line` on both.
- Lint passes, including the complete packet; typecheck reports zero errors/warnings. Sentence-case headings intentionally keep the nonblocking CMOS title-case suggestions.
- Manual visual inspection covers the social card, desktop payoff decision and phone economy decision; full pages, hero viewports and each decision are captured under `/tmp/project-voice-batch-2026-10-12/swipe-watch/`.
- An initial attempt requested port 4464, but Astro chose 4465 because 4464 belonged to another draft. The all-file fingerprint and decoded-field check both rejected the wrong preview before any suite result or draft-render pass was recorded. The corrected run uses verified `http://127.0.0.1:4465`; the final source-page served hash matches its built file, and the complete suite passes on that address.
- Final metadata correction: “I tested the swipe” becomes “I tested swiping” without changing its meaning. Decoded YAML and the built search meta description are exactly 159 characters; both WebPage and SoftwareApplication descriptions match. At that correction the unchanged hero was 180 characters and the card was 195; the final owner-requested card is 185. The uncredentialed rebuild passes, and the focused project/schema/résumé-stamp rerun passes 159/159 in three files. The private canonical résumé entry still matches verbatim; its body hash is unchanged.
- Owner-condition readback before the Codex factual clarification: the uncredentialed rebuild passes 43 pages/21 OG cards. `tests/project-pages.test.js`, `tests/content-schema.test.js`, and `tests/resume-claims-review.test.js` pass 159/159 after the cost/card/evidence edits and stamp refresh. The source page's served SHA-256 matches its built file: `b3168fcea210eafc81a0ff54684cebdb78ef6715987c74f943188ec063a93787`. All fields in all three decisions match decoded source on desktop 1440×900 and phone 375×667, with no page errors or horizontal overflow. Manual visual inspection covers the updated payoff record and opened homepage card at both widths. The hero/card/search are exactly 180/185/159 characters, both structured-data descriptions match search metadata, and the full EVP account appears once in the rendered reader body. No broad suite was repeated for these scoped wording changes.
- Final review-fix validation on main's Device merge `1cbe9dae0a2b738fc59fb50e46a2d862a400cbb8`: uncredentialed build passes 43 pages/21 OG cards; the same three focused suites pass 160/160, including the new all-published-project social/SEO regression. Its pre-fix run failed on Device's OG metadata, proving it detects the wiring defect. Final served/built Swipe page SHA-256 is `c6b25f0f9e546611eda0bda36fb20875ce2a9726b864044bda677cde18f6b97d`. OG and Twitter descriptions equal the unchanged 180-character image rendition; normal search metadata and both structured-data descriptions equal the unchanged 159-character SEO rendition. The hypothetical-session qualification is present, every decision field matches source on both widths, and the complete EVP account still appears once. Scoped ESLint passes, typecheck has zero errors/warnings, and the final packet has zero Vale errors. No broad suite was repeated for the scoped route/copy fix.
- `git diff --check` passes. The five assigned source/support/reference/packet files and the root-coordinated shared route/test differ from the refreshed main. No deployment occurred.

The captured baseline SHA-256 is `d1037795e1dd0d25eaa6e288a180ed0398d9071323762ba219822032c26d5cf8`; draft SHA-256 is `6db263270c777c1fd1950306142505026b576f2e5f97da2a5b18822cbd17e2d3`. The complete baseline is losslessly available with `git show 467d26110ae1b3850f03b88296300b4f23262909:src/content/projects/swipe-watch.mdx`; the complete draft source lives beside this packet.

The protected-token checker preserves all eight numeral occurrences, the hosting date, both live/repository URLs and image destinations, code/table blocks and other pinned fields. It has one deliberate failure: the new `seoDescription` field replaces the hero fallback as required for the separate search rendition. Project tests derive the value rather than pinning the old description. The description-change and spelled-out-number advisories are manually reviewed; the removed “one” occurrences were rhetorical setup, while one-question scope, one coin per swipe, three gestures/decisions and ten-card examples remain. No checker is weakened.

The blog voice CLI does not support project MDX and is not claimed to pass. Mechanical checks do not certify voice, meaning, identity, adoption, analytics results or reaction interpretability. The comparison above preserves the distinct validation boundaries rather than letting a passing check replace owner judgment.

## Review refinements

Codex review on the approved draft raised two P2 findings. Both are addressed without changing the approved card/cost or shortening the 180-character hero.

The prior browsing comparison conditioned learning on a play but still implied that every session could produce at most one such event. The closing now explicitly uses a hypothetical session with no more than one play and a recommender learning only from plays. It retains the ten-swipe versus one-play signal-density hypothesis and the no-play case, without claiming that real sessions or named systems follow that bound. R8's summary/detail and applied-fixes note are updated in place. No number, event, useful comparison or measurement boundary is removed.

The project route already sent the SEO fallback to normal metadata and JSON-LD, but omitted the separate social description accepted by its layouts. Root authorized this sole shared-route writer to pass `data.ogDescription ?? data.description` to `ProjectLayout.ogDescription`, matching the generated image's existing frontmatter rendition. No copy, schema, layout or image template is added. One regression assertion in the existing Project OG cards suite checks OG/Twitter descriptions against that rendition for every published project and retains the independent SEO-fallback assertion. Before the route fix, the regression fails on Device's social description; the image and normal SEO metadata checks remain separate.

## Owner approval conditions

The owner approved a PR and merge once the cost sentence was fixed and requested these related refinements. All appear in the complete reader draft and metadata above:

1. The cost now says: “I made reactions to the demo impossible to separate from reactions to the idea.”
2. The homepage/index card uses the requested 185-character wording: “I built a swipe prototype to ask for taste before viewing. I let the demo promise better recommendations it didn't produce, so I couldn't separate reactions to the idea from the payoff.”
3. The full EVP demo account and its testimony/measurement boundary remain once in What I learned. Decision two's evidence points there while keeping the simulated-payoff interpretation ceiling.

The hero remains exactly 180 characters and the search snippet remains 159. Consolidation removes a repeated account from one component field; no distinct event, judgment or qualification is lost. All numeric, date, link and other protected-token occurrences remain. Root verified the owner conditions before the PR workflow began and will audit the review refinements before merge; repository checks and exact-head review gates remain part of the authorized merge workflow.
