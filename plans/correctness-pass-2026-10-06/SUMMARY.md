# Correctness pass, 2026-10-06: summary

Fifteen pages audited in parallel, one ledger each in this directory, against the brief in `BRIEF.md`. Site-wide checks run separately: every internal link on the built blog and project pages resolves (197), every external link returns 200 (231) except two, and no post carries a future or out-of-order date.

## Site-wide findings

| # | Finding | Verdict | Fix |
|---|---|---|---|
| S1 | `https://codepen.io/jensimmons/pen/JJpGgw`, linked twice from `html-mockups-as-spec` (lines 97 and 130) and described as "public, still live" and "an artifact a reader can still open", returns a CodePen 404 page (confirmed in a browser, 2026-10-06). | WRONG | Point both links at `https://labs.jensimmons.com/2017/01-011.html` ("Mondrian Art in CSS Grid", HTTP 200 on 2026-10-06) and drop "CodePen" from the link text. The CSS comment in `global.css` that credits the CodePen by name stays: it records the inspiration as it was. |
| S2 | `https://chatgpt.com/codex/cloud/settings/code-review` (genesis post) returns 403 to curl. | SUPPORTED | Auth-walled settings page by design; no change. |

## Per-page tallies

| Page | WRONG | STALE | UNPROVABLE | SUPPORTED | Ledger |
|---|---|---|---|---|---|
| swipe-watch | 3 | 1 | 4 | 24 | `swipe-watch-ledger.md` |
| override | 1 (+1 cross-page) | 1 | 6 | 33 | `override-ledger.md` |
| friends-and-family-billing | 0 | 7 | 3 | 27 | `friends-and-family-billing-ledger.md` |
| how-a-responsive-fix-became-an-astro-migration | 7 | 1 | 4 | 30 | `how-a-responsive-fix-became-an-astro-migration-ledger.md` |
| device-source-of-truth | 7 | 0 | 4 | 36 | `device-source-of-truth-ledger.md` |
| autofix-was-the-whole-cost | 4 | 4 | 6 | 41 | `autofix-was-the-whole-cost-ledger.md` |
| two-blues-one-composition | 4 | 0 | 8 | 36 | `two-blues-one-composition-ledger.md` |
| six-prs-one-bug-agent-failure-modes | 5 | 9 | 1 | 28 | `six-prs-one-bug-agent-failure-modes-ledger.md` |
| matchline | 10 | 5 | 6 | 38 | `matchline-ledger.md` |
| perfect-score-wrong-axis | 4 | 3 | 4 | 30 | `perfect-score-wrong-axis-ledger.md` |
| five-across | 4 | 4 | 11 | 50 | `five-across-ledger.md` |
| html-mockups-as-spec | 12 | 2 | 11 | 28 | `html-mockups-as-spec-ledger.md` |
| agent-approval-workflow-genesis-of-mergepath | 16 | 0 | 5 | 36 | `agent-approval-workflow-genesis-of-mergepath-ledger.md` |
| every-reviewer-was-right | 6 | 1 | 7 | 58 | `every-reviewer-was-right-ledger.md` |
| mergepath | 9 | 3 | 4 | 37 | `mergepath-ledger.md` |

## Fix list (WRONG and STALE rows, with the decision taken)

### swipe-watch

- R1 constraint "3 days / core build": the committed Firebase deploy cache hash-dates `app.js` to 2026-02-03, three weeks before the first commit, so "3 days" is false as a duration. Fix: value `13 commits`, label describing three calendar days in the record.
- R2 figure alt "a Disney+ title card": the card shown is *Shifting Gears*, in the catalog's Hulu block. Fix: "a Hulu title card".
- R3 related-link label "Six PRs, One Bug—What AI Agents Actually Get Wrong": the post title uses a colon. Shared by four project pages; fix all together.
- R4 "Firebase Hosting serves the repo root as-is": since swipewatch#132 (2026-09-29) hosting serves `public/`. Fix: "serves a static `public/` directory as-is".
- R6 (UNPROVABLE, cross-surface) `cardDescription` calls the simulated payoff accidental while the decision ledger files the same copy under `chosen`. Decision deferred to the owner; see the ledger.

### override

- R1 figure alt "because this demonstration never recoups": the page's own scenarios exhibit shows the Bull case recouping in week 20; the split chart is fed the base case. Fix: "because this demonstration does not recoup at its base-case assumptions".
- R2 "Eighty-six tests pass": 109 pass today (changed 2026-09-30 and 2026-10-04), plus a separate emulator-backed rules suite. "Only eight touch the engine" still exact. Fix: date the count or update it to 109.
- X2 (on `mergepath.mdx`, "has run every change since on the fleet's review path"): 29 commits reached Override's `main` without a pull request since 2026-03-24, seven after it joined the manifest, none touching `src/`. Fix: "has landed every product change since through the fleet's review path; the direct pushes to its `main` since March are documentation and template-sync commits, the last on 2026-08-28".
- Editorial, not factual: prose says "operating profit" for the post-fee figure while the UI and the alt text use "Operating Profit" for the pre-fee subtotal. Fix: "distributable profit" in the prose at line 92.
- Unchanged, flagged for the owner: the "1 deal room in production" constraint could not be re-read today without a 1Password resolution; it stands as a 2026-08-28 figure. The apex `www.overridebroadway.com` returns a Cloudflare 530 but the page links only the bare apex, which is 200.

### friends-and-family-billing

All seven STALE rows trace to product PR friends-and-family-billing#459 (merged 2026-09-30T17:11:44Z, nineteen days after the page's last edit): it removed the client-supplied-HTML mail path that #161 created, so the canonical renderer now feeds the preview only, both the test send and the invoice render server-side from plain-text bodies, and the DOM-equality regression test was rewritten.

- R1 "The preview and the test send share a canonical renderer" (line 97) and R2 "The divergence has stood since April 2026": rewrite as "the preview alone is on the canonical renderer; since 2026-09-30 both emails take the server markdown path, and their bodies still differ in serialization".
- R3/R4 the Mermaid description and edges (lines 103 to 117): move the test-email node under the markdown renderer, relabel the markdown node as the server renderer, date #459 in the description.
- R5 line 132 "The two the parity fix unified are the two anyone tested; the third is the one that reaches a person": rewrite as "the preview is the only path on the canonical renderer; both emails now take the bridge, and the invoice's body is still the one no test renders".
- R6 line 50 (#161 "left behind regression tests ... the preview's DOM and the test email's payload must be the same HTML"): past tense, plus one clause that #459 replaced that test on 2026-09-30.
- R7 line 53 "two required tests ... both guard the preview against the test send": "regression tests", dated; the surviving property (no test renders the recipient invoice) still holds.
- R10 "re-derive the math from three billing cadences": the product models two cadences; the capture shows three bills. Fix: "three bills".
- Cross-page: `six-prs-one-bug-agent-failure-modes.md` lines 264 to 278 carry the same pre-#459 topology (see that ledger).
- Not a page defect: the repository is now public (the #759 ledger recorded it private); the `imageDimensions` comment in `rehype-figure-captions.mjs` says the two Invoicing captures came from the E2E harness, whose fixture could not have produced them. Fix the comment to "captured from the live product, cropped to the message body".

### how-a-responsive-fix-became-an-astro-migration

Every correction from the #759 ledger landed. The new findings share one root: the post never mentions issue #33 ("Blog generator drift", filed 2026-04-08 10:47am, 43 minutes after PR #30) or `scripts/generate-blog.js`, and the recorded story (generator drift, then a five-SSG evaluation report at 12:46pm, then an eleven-phase migration plan at 1:13pm, all the same Wednesday) is better evidenced than the one the post tells and still supports the same-day-pivot thesis.

- R1 "Nothing in the repository records a framework bake-off ... reasoning from memory, not a decision log" (line 98): WRONG. #33 carries a "Static Site Generator Evaluation Report" comparing Astro, Hugo, Eleventy, Next.js static and Zola with a weighted matrix and a "Pick Astro" recommendation, then a migration plan. Fix: cite the report and plan; add timeline rows for #33, the report and the plan.
- R2 the opening symptom "A long URL pushed the layout wider ... horizontal scrollbar" (line 55): WRONG. #28 records native-width screenshots in a grid item with `min-width: auto`, content cut off at the right edge with no scroll affordance; long URLs were a secondary hardening item. Fix: rewrite to the recorded symptom.
- R3 "seven hand-maintained `index.html` files" (lines 5, 13, 18, 61): five were hand-maintained; the two blog surfaces were output of a 677-line generator that had drifted from the committed HTML. Fix: say so.
- R4 the five-step duplication workflow and "five hand steps, two files" (lines 65 to 71, 81, 135): the designed workflow was Markdown plus a generator run that could no longer reproduce the committed HTML. Fix: replace the list and the two cells.
- R5 "Next.js and Gatsby were overpowered" (line 98): Gatsby was never evaluated; Zola was; Next.js was cut because static export forfeits its features for ~27MB of dependencies. Fix: drop Gatsby, name Zola, give the recorded reason.
- R6 Phase 0 "moved" static assets into `public/` (line 102): copied; the root originals went in Phase 9 (PR #64). Fix: one word plus a clause.
- R7 "fails with a line number and a field name" (line 127): the build names the file and the field with `:0:0`, no line number. Fix: "naming the file and the field".
- R8 (STALE) the caching paragraph (line 88): since PR #1076 (2026-09-29) `/_astro/**` is immutable for a year, so the one-hour rule now applies to HTML only. Fix: add the rule, narrow the hour.
- R9/R10 (UNPROVABLE) "fixing the bug forced me to see it" and the four-option table: the record ties the migration to #33, not to #28, and shows two options then five SSGs. Fix: present the four options as the author's framing, and let the #33 chronology carry the causal claim.

### device-source-of-truth

No STALE rows and no Mergepath claim to retire (the only reference is the `related` link, and the Mergepath page already says the seventh project left the fleet). Seven WRONG rows, all code-level overstatements; the prior ledger miscounted the role guards at its own pin.

- R1 "forty of the API's fifty role guards are admin-only" (lines 29, 91): fifty of sixty. Fix both occurrences.
- R2 "each hit tagged direct or contextual" (line 61): only alias hits carry those tags. Fix: "with alias hits tagged direct or contextual".
- R3 "Every consumer of partner data goes through the resolver" (line 63): four of five feeds; telemetry resolves by key. Fix: "Every feed that arrives carrying a partner name goes through the resolver".
- R4 "a viewer reads everything" (line 91): four GETs are admin-only. Fix: "a viewer reads the registry".
- R5 "an editor authors records and stages imports" (line 91): only the questionnaire import. Fix: "stages the questionnaire import".
- R6 "the only sign anything was skipped is a count in the response" (line 48): the sign is the preview warning; at commit a skipped row folds into the no-change count. Fix per the ledger's sentence.
- R7 "a registered device has its alert dismissed by hand" (line 127): the client auto-dismisses through the ordinary route with reason "Device Registered". Fix per the ledger's sentence.
- Copy defect: line 145 is missing a full stop before "The reader decides".

### autofix-was-the-whole-cost

The #803 correction pass landed in full; every headline figure reproduces with the stated method. New defects are one causal claim the prior ledger itself had backwards and one paragraph the repository moved out from under.

- R1 "the third is documentation debt from a dependency added after the cut" (lines 117, 177): the dependency landed 27 hours before the cut. Fix: "documentation debt: the dependency inventory had not been updated for a parser dependency the pull request added on its first day".
- R2 "two of its figures six lines apart ... a two-session token count beside a one-session dollar figure" (line 153): the one-session figures were in the sidebar; six lines away sat the three-session $712.66. Fix: "printed a two-session token count in the body and a one-session dollar figure in the sidebar beside it, without saying the populations differed".
- R3 "returns 25, because four findings continue the sentence differently" (line 127): three differ; one is identical but lower case. Fix accordingly.
- R4 "a fresh clone needs `git fetch origin pull/686/head`" (line 63): the merge branch still exists. Fix: "are not reachable from `main`; `git fetch origin pull/686/head` resolves them in any clone".
- R5 (STALE) "not one of `main`'s five required status checks ... a deliberate split" (line 181): seven contexts since #909 (2026-09-01) including `build-and-test` and `lint`. Fix: date the paragraph to August 2026 and add the 2026-09-01 change.
- R6 (STALE) "nothing records what was waved through" (line 181): #1072 (2026-09-30) added `merge-bypass-audit.yml`. Fix: "nothing recorded what was waved through until #1072 (2026-09-30)".
- R7 (STALE) "tracked issues is a piece I intend to build and have not" (line 181): #715 tracked it and closed not-planned on 2026-09-06. Fix: say so or drop the sentence.
- R8 (STALE) "127 prose-bearing list items across the 14 files" (lines 17, 212): true at publication; 165 across 17 today. Fix: date it.
- R55: the unnamed "the issue" at line 163 is #745; link it.
- Surface observation, not a page defect: at 16:31:48Z on 2026-10-06, twelve minutes after a deploy, the live URL served this post's body under `html-mockups-as-spec`'s head (title, description, canonical, `og:url`, `og:image`); five later fetches including cache-busting were correct. One observation; worth a deploy-pipeline or CDN check.

### two-blues-one-composition

Every #759 correction landed, including the §D2 repin, both reproduced by rebuilding at the pinned commits. The #806 revision overshot in one place: it promoted a Wikimedia Commons reproduction to "the Kunsthaus Zürich's digitization" and added a "two museum digitizations" tally the files do not support (pixel comparison: the committed 1930 file is the Commons image downscaled; the Kunsthaus's own image differs by 24 per channel).

- R1 "the Kunsthaus Zürich's digitization of Composition with Red, Blue and Yellow" (lines 102, 108): a Commons reproduction. Fix: "a high-resolution reproduction from Wikimedia Commons", keep the Kunsthaus link for the painting's record.
- R2 "two museum digitizations" / "Two museum scans" / "museum-file medians" / "primary sources" (lines 5, 14, 35, 110, 123, 220, 228): one museum digitization (DMA, 1921) and one Commons reproduction (1930). Fix every occurrence.
- R3 "no calibration transform ... because none is documented for either file; that absence is itself a finding" (line 129): the DMA file embeds an sRGB v4 perceptual profile and the committed copy was rendered through it; the 1930 file is untagged at source. Fix: rewrite the passage, keeping "no calibration against the chart was applied".
- R4 "say the same thing in four words" (line 176): six words, and only #498 carries the phrase. Fix: "in six words" and "The palette ticket says".

### six-prs-one-bug-agent-failure-modes

Every #759 correction landed. Nine STALE rows share the FFB #459 root (2026-09-30: client-supplied HTML removed from the mail queue; the test email rejoined the markdown path; parity now asserted by `emailTemplateParity.test.js`). Five WRONG rows are new.

- R1 "Six pull requests in one session on this surface" (line 52): the same session also merged #156 and #157 on the surface; the rule as stated selects eight. Fix: state the rule that selected the six (the set the RCA and #159's closing comment enumerate) or name #156/#157 as excluded.
- R2 "no counting rule I can reconstruct gives nine" (line 201): the session export tallies nine codex feedback items across #145/#146, #155, #157, #158 and one post-merge. Fix: say so.
- R3 "The spec had answered it a day earlier" (line 181): ten hours earlier, same local day. Fix: "ten hours earlier".
- R4 "a design document neither reviewer had reason to open, because nothing in this PR referenced it" (line 157): the spec was not in the repository until 12 hours after #161 merged; reviewers could not have opened it. Fix: say it lived in the author's vault outside the repository until the day after the fix; qualify the line 145 link the same way.
- R5 "two deliverables beyond the code" (line 227): the brief lists six, five beyond the code. Fix: "among its six deliverables".
- R6 to R14 (STALE, lines 124, 132, 242 to 291, 309, 311): add one dated paragraph and update both diagrams for #459, or date every present-tense sentence in "What the fix changed" and the conclusion to 2026-09-01.
- R15 (UNPROVABLE) "What changed the outcome was a new brief, not a better patch" (line 5, `description`): the body disclaims the causal claim at line 295. Weaker form: "The framing was the variable I controlled."
- Quotation nits: Prompt 6 drops "(image1)"/"(image2)"; the brief's "Do NOT" block omits a line without an ellipsis; "the difference was not the model" condenses the source. Fix the ellipsis; leave the paraphrases if marked.

### matchline

The dated pause claim holds ("as of 2026-09-01, are still landing"; 18 product commits since, the last 2026-10-01). Ten WRONG rows, two of them inherited from the prior ledger; five STALE rows from product PRs #435, #446, #500 and the 2026-10-02 redeploy.

- R1 "the thirteen phrases the validator refuses to let through" (line 79): twelve. Fix.
- R2 "Run the next day across all four labeled pairs" (line 203): later the same day, 2026-04-27 Pacific. Fix.
- R3/R4/R5 "Both repairs landed and neither was measured", "nothing measured it after the repair", "the run that would have shown whether the repair worked was never made" (lines 53, 54, 62): the mapping repair was measured in PR #262 on one fixture (mean 19.4%, range 12.5pp to 4.1pp); what was never made is a four-cell run under it, or any run after the cache. Fix as one rewrite.
- R6 "last two working weeks fixed the ruler" / "last working sessions went into the instrument" (lines 6, 53, 207): one final session on 07-31 fixed one ruler; the 07-06 session shipped twelve product fixes. Fix: "the final session".
- R7 "the four fields the scorer compares" (line 137): two (summary 0.6, skills 0.4). Fix.
- R8 "Latency and cost targets | Designed only" (line 95): measured once on 2026-04-27, cost met, latency 11.8x over. Fix the row.
- R9 "blocks the export" (five places, lines 4, 33, 94, 213, 252): the gate disables an Export control whose handler is a Phase 2 stub. Fix: "disables export", with the stub caveat once.
- R10 "gaps in the same list as the matches rather than hidden behind a tab" (line 171): a separate gaps panel above the list, inside the Matches tab. Fix.
- R11 (STALE) "Signing in with a new account gets an empty instance" (line 221): since #500 (2026-09-30) a non-allowlisted account is refused everywhere. Fix: say the link shows the shell and nothing else to a stranger.
- R12 (STALE) "redeployed on the evening of 2026-08-31 and now carries the June and July work" (line 221): redeployed 2026-10-02 with the work through #506. Fix: date the newer deploy.
- R13 (STALE) "`jaccard()` zeros 45% of the score" (line 242): fixed by #435 on 2026-09-01; the ontology gap remains. Fix: past tense with the date.
- R14 (STALE) "10 x 11 | the whole evaluation corpus" (line 27): 10 x 12 since 2026-09-01. Fix.
- R15 (STALE) "all three places evidence is consumed" (line 139): four since #446. Fix: "at every server-side place evidence is consumed".
- Prior ledger `plans/759/project-pages-ledger.md` §D20 and §D24 are wrong (twelve phrases; #262 recorded a run). Note for whoever next touches that file.

### perfect-score-wrong-axis

All four headline counts reproduce exactly (134 threads, 116 Codex-badged, 122 dispositions, zero rejections); per-PR totals match the prior ledger to the unit. Of 29 prior corrections, 26 landed cleanly, one landed with a new error in the same sentence, one half-landed, one has since gone stale.

- R1 "They post under my author identity, and so does the rate-limit failover" (line 47): all five retry comments are by `nathanpayne-claude`; the wait script retries as the reviewer and only its Codex failover posts as author. Fix: "They post under my agent's reviewer identity, `nathanpayne-claude`, which is also the identity `coderabbit-wait.sh` uses for its own automated retries, so the record cannot say how many the session itself sent."
- R2 "one rule for all three providers" vs the CodeRabbit row "26 (16 substantive)" (lines 45, 67, 77): the round rule was applied to Codex and only to #797 for CodeRabbit; by the page's own rule CodeRabbit rounds are 20. Fix: add the CodeRabbit rounds row or restrict the rule to Codex.
- R3 "a year-long arc" (line 37): four months. Fix.
- R4 "Three of the nine were post-review observations filed off the previous batch" (line 61): #785/#786 are off #783, not the batch named. Fix: "filed off the previous day's PRs (#778 and #783)".
- R5 (STALE) "`required_status_checks.strict: true`" (line 168): false since 2026-10-05 (mergepath#1802). Fix: "At the time, ... set `strict: true`".
- R6 (STALE) "restructured to 28,636 characters" (line 184): 30,805 today. Fix: "as of 2026-08-26".
- R7 (STALE) "The repo is about to put a budget on review" (line 186): landed 2026-10-01/02 (mergepath#1576, #1579) as a per-PR Codex cap. Fix: past tense with the date and unit.
- R9 (UNPROVABLE) "did what the repo's standards ask: a differential test" (line 156): no standards document asks for one. Fix: keep the test, drop "standards ask".
- R11 (UNPROVABLE) "best-looking review record the repo has ever generated" (line 37). Weaker form: "cleanest disposition record of any batch I have measured".
- Method note: the reviewer token returns 404 on the branch-protection endpoint; the author token reads it.

### five-across

Every PostHog figure reproduced exactly; the cruise-side Firestore (`gaycruisebingo`) is unreadable from here, so eleven database figures stay UNPROVABLE and attributed to PR fiveacross#820's recorded read.

- R1 hero alt "showing a Welcome Aboard bingo grid for a Trieste sailing" (line 13): the card is a Day 1 warm-up in the Neon Playground theme rendered by the marketing harness. Fix: "a Day 1 warm-up card in the Neon Playground theme for a Trieste sailing, rendered by the marketing harness".
- R2 "Every new event needs its own Firebase project, provisioned by hand" (line 86): every event for an unrelated group; events within one community share one. Fix.
- R3 "no deploy record survives for that window" (line 144): the repository's own incident note records a mid-sailing rules deploy and two days of stale-shell fallout (#387). Fix: "no deploy log is in the repository ... though its own incident note records one mid-sailing rules deploy".
- R4 quotation ending "on the same engine as Vacay." (line 150): the source sentence continues. Fix: end with an ellipsis or quote through "named Five Across".
- R5/R6/R7 (STALE) the auth-handoff gate ("the IAM provisioning the handoff needs", "gated on provisioning", "implemented but not yet reachable", lines 84 to 98, 152): provisioning completed 2026-09-10 (#547) and the live bundle carries the handoff. Fix: "implemented, provisioned, and shipped in the live client; on registered hosts sign-in still resolves direct, so no sign-in has been demonstrated through it".
- R8 (STALE) "cutover would be one uncommented block" (line 84): two blocks, one per zone, since #1120 (2026-09-07). Fix.
- R17/R18/R19 (UNPROVABLE) "deployed and tested", "Satellite" connectivity, "without notice": weaker forms "deployable and tested", "ship Wi-Fi", "on the schedule the app's own design derived".

### html-mockups-as-spec

Every #759 correction landed, but the #759 audit's spine ("the central evidence does not exist") was wrong: `C-composition-margins.html` is attached to issue #74 and `blog-landing 2.html`, the file PR #77 built from, to issue #75, both downloadable anonymously; and the #75 thread records Mockup B being abandoned on the day ("Still not right ... Build exactly like this HTML mockup"). The post's seam, its drift story and its "only surviving image" all fall to that thread.

- R1/R2/R5 "those files do not exist", "Only B and C are corroborated anywhere, by name", "the mock-ups specified the two blog layouts this site still runs" (lines 38, 77, 155): fix by saying C and `blog-landing 2.html` survive as issue attachments (link them), A, B and D do not, and the index layout was specified by `blog-landing 2.html`.
- R3 "The record does not settle it, and since neither file survives, nothing can ... I believe the shipped grid matches Mockup B" (line 87): the thread settles it. Fix: replace the seam paragraph with the recorded sequence.
- R4 "Shipped, and since drifted ... Nothing caught that drift" (lines 128, 143): PR #77 shipped one post per row at 50% and 72% on 2026-04-09 from `blog-landing 2.html`; no drift. Fix: "never built to Mockup B", drop the drift sentence.
- R6 the FFB image alt and "the only surviving image of any mock-up" (lines 114, 116, 131): the image is the shipped editor after FFB #176; mock-up screenshots survive on #74 and #75. Fix: recaption, delete the "only surviving image" claim.
- R7 "external review summary ... a reviewer that had never seen my prompts" (line 120): the quoted summary is the authoring agent's handoff; the external reviewer's review reports two regex bugs and never mentions the mock-up. Fix: attribute correctly and drop or replace the cold-reader paragraph.
- R8 "branch protection now rejects a direct push to `main` server-side" (line 120): `enforce_admins` is false and the owner has pushed directly since. Fix: "for every identity short of the repository administrator".
- R9 "self-contained, just inline CSS" / "no real data" (lines 73, 75): both files load Google Fonts and carry the first real post's content. Fix.
- R10 the retracted quotation "does not drift between prompts" (line 143): v1 says "Specs that live in prose drift with every prompt. Specs that live in HTML do not." Fix: quote the real sentence.
- R11 table "Match the transcribed grid, then the blocking test suite" (line 128): target was `blog-landing 2.html`; no CI test gate existed until 2026-08-19. Fix the cell.
- R12 "sticky sidebar on the right, metadata in a horizontal accent bar" (lines 89, 129): sticky removed by PR #82 before the post existed; the bar is the narrow-screen treatment. Fix.
- R13 (STALE) "`npm run test:e2e` is deliberately manual and absent from CI" (line 147): a required CI step since #1022 (2026-09-12). Fix: update the gates paragraph.
- R14 (STALE) the CodePen "public, still live" (lines 97, 108, 130): 404. Fix per S1: link the same demo in Jen Simmons' layout lab and say the CodePen the CSS comment credits has since been deleted.
- R18 (UNPROVABLE) "for the first month": 38 days from the first Claude-co-authored commit to the pivot. Weaker form: "first weeks".
- Cross-page: the Genesis post carries the administrator caveat on branch protection that this post drops (R8).

### agent-approval-workflow-genesis-of-mergepath

Every #739 correction landed. The new WRONG rows are where the prior ledger was itself wrong (wrong propagation PRs, CodeRabbit walkthroughs counted as triggers, #60's files never checked) and where the post presents May-to-August tooling as the April 16 state.

- W1 propagation PRs "three days later ... eleven minutes each" (line 155): four identifiable PRs opened 2026-04-15T23:51Z, merged 23:56Z, about five and a half minutes each, an hour after #76. Fix.
- W2 "first evidence of auto-review-on-open" (line 135): untriggered App reviews on #53, #58, #60, #66, #70 preceded #71 the same day. Fix: "as it had been doing on open since PR #53 that morning".
- W3/W4 "#60 touched `.github/**` and therefore required external review", "the blocking label had landed just before the approval" (line 147): docs-only files, label applied by hand three seconds after the approval, merge twelve seconds later. Fix both.
- W5 "A `set +e` pattern ... Codex flagged it" (line 139): Codex flagged the `ls "$path"` existence check. Fix.
- W6 "In April 2026, OpenAI enabled the Codex GitHub App" (line 106): the repository enabled it; OpenAI's GitHub review predates that. Fix.
- W7 "The first version of this post said '100+ PRs' over 'six weeks' (elsewhere, seven)" (line 175): the first version said "30+ PRs"; "100+" entered in the 05-15 refresh. Fix.
- W8/W9 the seven-rounds reviewer and "gave up seventeen new bugs" (lines 157, 187): the CLI identity did the seven rounds on the hook alone; 13 of 17 bugs were in scripts reviewed once or twice. Fix both.
- W10/W11 "a sync manifest with a per-repo override registry", "a security baseline ships on by default" in the April 16 inventory (line 161): May 4/12 and June 17. Fix: move to "Since the snapshot" with dates.
- W12/W13 diagram stage B "wrapper verifies identity, as of April 2026" and the "Adding teeth" hook description at `7878830` (lines 33 to 89): the wrapper landed 2026-05-13, `BREAK_GLASS_MERGE_STATE` 2026-05-14, `7878830` is the 2026-08-27 state. Fix: date the layers.
- W14 "`.cursorrules` for Cursor" (line 70): `.cursor/rules/*.mdc`. Fix.
- W15 "The template is open source" (line 191): public, no license. Fix: "public".
- W16 "median 156 ... across 18 trigger-to-signal observations" (line 173): two "triggers" are CodeRabbit walkthroughs and five "signals" are error replies; 16 operator triggers give the same median. Fix the population.
- U1/U3 (UNPROVABLE) "A week of full-time", "the same model": weaker forms "early full-time use", "the same agent tools".
- Cross-page note from this auditor: the API counts 632 merged hub PRs today against the Mergepath page's 609 (both dated 2026-10-06); the Mergepath auditor adjudicates.

### every-reviewer-was-right

First audit of this post. Every table figure and quotation reproduced; six WRONG rows are small, one STALE row needs a date.

- R1 "nine days after the pull request opened" (line 231): eight. Fix.
- R2 "round 12" (lines 14, 145, 149): round 13. Fix all three.
- R3 figure node "#1197 opened at +377" (line 161): opened at +255, merged at +377. Fix.
- R4 sidebar "the four dispositions the repository's own rule 2 names" (line 33): rule 2 names three; the four are the post's own. Fix.
- R5 "the next round still drew three findings" (line 107): three findings across two Codex rounds and a CodeRabbit pass. Fix.
- R6 "the size of the diff does not appear in the record until September 6" (line 99): the labeler posted the size on 2026-08-27. Fix: scope to the session's prompts and replies.
- R7 (STALE) "Of the 507 closed pull requests ..." (line 127): date it to 2026-09-06.
- R14 (UNPROVABLE) "the instruments are being built now": weaker form "tracked as open issues".

## Outcome

Every WRONG and STALE row on all fifteen pages was corrected on 2026-10-06; each ledger ends with a `## Fixes applied` section listing the before and after per row and the rows deliberately left, with reasons. UNPROVABLE rows were narrowed only where the wording asserted more than the record supports; rows the page already labels as the author's own testimony or hypothesis were left. Site-wide, the dead CodePen link now points at the same demo in Jen Simmons' layout lab, the Six PRs related-link label matches the post's title on all four project pages, and the `imageDimensions` comment on the two Invoicing captures records their live-product provenance.

Totals across the fifteen pages: 92 WRONG, 32 STALE, 74 UNPROVABLE, 498 SUPPORTED.

Three pages grew noticeably because every corrected fact needed stating: `html-mockups-as-spec` (+7%), `six-prs-one-bug-agent-failure-modes` (+4%), `agent-approval-workflow-genesis-of-mergepath` (+4%). A separate brevity pass per `docs/agents/blog-revision-process.md` is the right follow-up; it was not attempted here so that no factual change hides inside a cut.

### Left for the owner

- Swipe Watch: the card and the résumé call the simulated payoff accidental ("accidentally", "inadvertently"); the page's decision ledger files the same copy under `chosen`. The record dates the copy and says nothing about intent. One framing has to go.
- Override: "1 deal room in production" is now dated 2026-08-28; a present-tense figure needs the Firestore read the deployer credential allows.
- Five Across: eleven cruise-side figures stay attributed to the sailing's recorded data read; the `gaycruisebingo` Firestore is unreadable from this machine.
- Device Source of Truth: whether the `related` link to Mergepath still earns its place now that the repository has left the fleet.
- Prior ledgers in `plans/759/` carry rows this pass found wrong (`project-pages-ledger.md` §A29/§A32, §D20, §D24; the Genesis ledger's F2/E4/H; the Perfect Score ledger's §P.2 ack note; the Autofix ledger's §N.9/§H3). Left untouched as historical records; worth a supersession note when next touched.
- Deploy pipeline: one fetch twelve minutes after the 2026-10-06 deploy served the autofix post's body under the HTML-mockups post's head; later fetches were correct. Worth a CDN check if it recurs.
