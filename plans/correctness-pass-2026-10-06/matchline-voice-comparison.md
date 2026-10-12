# Matchline—voice approval packet

Draft date: 2026-10-12. Status: the owner approved the revised draft `42e775f` for PR preparation on 2026-10-12 and supplied the connecting paragraph included below. The parent’s final audit precedes PR creation. Merge remains held until the live-rules condition is verified or the owner explicitly accepts the source-only boundary. The earlier approval was superseded by the requested résumé example and fresh approval pass, now completed. No PR, push, merge, or deployment has occurred for this draft.

Factual baseline: `467d26110ae1b3850f03b88296300b4f23262909`, `origin/main` when the pass began. Final validation includes dependency merge `ff2daa3e1f4b370a673d0f8ac75b757bdb171f72` (#1299), which supplies the evidence paragraph style, and Device page merge `1cbe9dae0a2b738fc59fb50e46a2d862a400cbb8` (#1302); the captured original remains the initial baseline. Source: `src/content/projects/matchline.mdx`. Historical facts ledger: `plans/correctness-pass-2026-10-06/matchline-ledger.md`. Product evidence retains that ledger’s pinned 2026-10-06 audit, except the public fixture and public résumé were freshly verified on 2026-10-12 at Matchline main `798df55c3caee2cf32745f1cee003647591fb4a8`. The parent’s live Rules API read remains pending credentials; no API read or production mutation occurred. R11 stays source-only.

## Approval summary

The complete page is rewritten: hero, homepage/project card, search and social renditions, three constraint glosses, all four decision records, and body prose. The narrator owns the choices and admits where my reply to a reviewer was wrong. Agents remain the implementation authors and independent reviewers. The original nine main sections and subsection remain, with every component, code block, table, four-field exhibit, diagram, caption, and anchor in the same position. The exhibit’s contents now quote the owner’s dated real fixture rather than the synthetic Threadline candidate, as requested. Long technical paragraphs now break where the claim changes; the three review defects become a readable list. Four decision titles and their two pending/two mixed statuses are retained after the cross-page reference search.

The 48% extraction/19% match against an 80% bar remains the card's baseline. The body keeps the exact aggregate 48.4%/19.1% separate from the single-fixture series and the repaired mapping's 19.4% result. The June mapping measurement is still real; the four-pair run under it and any run after the July cache still never happened. I make the export stub and mocked detector checks explicit, without presenting them as completed user validation.

The owner requested the real résumé example and a sharper card. The new exhibit quotes Unit `u_ai_pr_review` from `nathan-2026`: PR cycle time from 7.4 to 4 days, beating the 30% Q2 OKR target, plus its exact skills, domains and tools. The public file labels 22 Units on April 26, 2026. A fresh anonymous public résumé read confirms the same claim. The date and fixture link make this a historical fixture quote, not another résumé wording-sync surface or evidence of a successful product run. The artifact now identifies that same résumé, pairs its real PR-cycle result with the fabricated 40% SAP HANA claim, and uses the owner’s direct testimony, “I’ve never worked on SAP HANA.”

Two supporting repairs are visible. R11 no longer treats an anonymous client bundle and checked source rules as verification that another account is refused in production: the page names source allowlist enforcement and says deployed rules and a signed-in non-owner were not tested. R47 adds identity and CI tooling to the month-of-maintenance inventory, matching the audit's existing evidence. Both ledger summary/detail surfaces are updated in place. The pause is explicitly a launch/restart decision, not a claim that no product commits resumed.

The canonical résumé and site mirror still agree verbatim. Its evidence graph, approved-claim gate, unvalidated detector/export stub, historical 48%/19% result and final instrumentation work remain supported by the draft. Only the case-study hash and review date change. The résumé body/body hash, private canonical, and unrelated entries are untouched.

## Metadata proposed for approval

The card supplies the homepage and project index. The explicit social description remains separate because the hero exceeds 180 characters. The search snippet is concise at 148 characters. The card is 125 characters and fits the existing 120–200 band and grid-volume ratio. The parent corrected the initial 109-character proposal after its hard test failure: “Paused before launch with” preserves the same facts and the owner’s preferred exact ending. The shared tests remain unchanged. No template or orphaned copy is added.

### Hero

**Before (257 characters):** A career CRM that turns work history into approved evidence, then refuses to let a generated claim through unless it traces back to that evidence. Paused before launch, after rebuilding the measurement system but before running it against the product again.

**After (244 characters):** I built a career CRM to turn my work history into evidence I could reuse and defend. Claims have to trace to evidence I've approved. I paused before launch, after repairing the measurement system and before running it against the product again.

### Homepage and project card

**Before (144 characters):** Paused with better instruments and the same 48% extraction and 19% match against an 80% bar: the final session fixed the ruler, not the product.

**After (125 characters):** Paused before launch with 48% extraction and 19% match against an 80% bar. My final session fixed the ruler, not the product.

### Search snippet

**Before (156 characters):** A career CRM where a claim that fails to trace to approved evidence stops at the gate. Paused pre-launch at 48% extraction and 19% match against an 80% bar.

**After (148 characters):** My career CRM traces claims to approved evidence. Paused before launch at 48% extraction and 19% match against an 80% bar, with export still a stub.

### Social card

**Before (168 characters):** A career CRM that turns work history into approved evidence, then refuses to let a generated claim through unless it traces back to that evidence. Paused before launch.

**After (168 characters):** I built a career CRM around evidence I could defend. Claims have to trace to evidence I've approved. I paused before launch; the export behind the gate is still a stub.

## Complete proposed page

This reader view expands all four decision records and the constraint strip. The schema, diagrams and capability table remain unchanged; the dated real-résumé fixture replaces the synthetic exhibit in its existing scaffold.

# Matchline

I built a career CRM to turn my work history into evidence I could reuse and defend. Claims have to trace to evidence I've approved. I paused before launch, after repairing the measurement system and before running it against the product again.

Format: Single-user web app

Focus: Evidence-based application generation, capability mapping, pipeline management

Stack: React · TypeScript · Vite · Tailwind · Firebase · Anthropic · OpenAI · Vitest

## The problem

I started Matchline with two premises about the 2026 job market. If anyone can generate a tailored résumé and cover letter in seconds, polish stops telling a hiring manager much. Specificity that a candidate can defend might still tell them something. A generative writer doesn't know which of my projects mattered, which numbers are honest, or which claims I can defend in an interview.

An application doesn't need a lie to be empty. Matchline's validator refuses twelve phrases, including *collaborated cross-functionally*, *drove results*, and *moved the needle*. I can trace those back to something I did somewhere. They can be true and still tell a reader nothing.

A typical AI career tool takes a résumé and a job description and generates prose. I wanted to build the evidence first: a structured graph of capabilities, outcomes, and evidence that I could keep refining. AI would select from it for a particular opportunity. Its job was selection, sequencing, and framing. A claim that didn't trace to something I'd documented and approved was a defect to catch.

This was a hypothesis about my own job search. I did no external user research or market validation. I kept V1 to finding out whether the workflow worked for me before asking whether it worked for anyone else.

- 1 user: me; I deliberately kept V1 to my own job search
- $25/mo: my Anthropic cap, enough for about twelve tuning runs
- 10 × 12: résumés by job descriptions in the evaluation corpus on 2026-10-06

## What got built

| Capability | State |
|---|---|
| Résumé into Experience Units | Built |
| Approved evidence only, into matching | Built |
| Job description into requirements, with gaps surfaced | Built |
| Fabrication gate blocking export | Built, never user-validated; the export it gates is a Phase 2 stub |
| Latency and cost targets | Measured once (2026-04-27): cost met, latency 11.8× over |

LinkedIn and long-form ingestion were deferred. Uploaded PRDs, decks, and retrospectives never existed—an earlier version of this page listed them as inputs, incorrectly. They were specified, but never built. I'm keeping the correction here because the earlier page claimed more than the product did.

## The evidence model

An Experience Unit is one checkable claim about work. I gave it a strict schema, so the model can't return a Unit without the evidence the contract requires:

```ts
export const ExtractedUnitV1Schema = z
  .object({
    raw_text: z.string().trim().min(1),
    normalized_summary: z.string().trim().min(1),
    unit_type: UnitTypeSchema,

    skills: z.array(z.string().trim().min(1)),
    tools: z.array(z.string().trim().min(1)),
    domains: z.array(z.string().trim().min(1)),
    seniority_signals: z.array(z.string().trim().min(1)),
    scope_signals: z.array(z.string().trim().min(1)),
    business_outcomes: z.array(z.string().trim().min(1)),
    metrics: z.array(MetricSchema),

    evidence_type: EvidenceTypeSchema,
    // Prompt says "below 0.50 should not be emitted" — enforce at
    // schema level too so a hallucination flood is rejected.
    confidence_score: z.number().min(0.5).max(1),

    date_range: DateRangeSchema.optional(),
  })
  .strict();
```

This one is mine. I labeled it from my own résumé on April 26, 2026, and the exhibit quotes [the fixture](https://github.com/nathanjohnpayne/matchline/blob/798df55c3caee2cf32745f1cee003647591fb4a8/tests/fixtures/expected-units/nathan-2026.json). The same claim is on my [published résumé](https://nathanpayne.com/resume/):

<dl class="unit-exhibit">
  <div><dt>Claim</dt><dd>Introduced AI-powered PR review reducing median PR cycle time from 7.4 to 4 days, beating the 30% Q2 OKR target</dd></div>
  <div><dt>Skills</dt><dd>engineering productivity · AI tooling adoption · OKR ownership · process change</dd></div>
  <div><dt>Domains</dt><dd>developer tools · AI-augmented engineering</dd></div>
  <div><dt>Tools</dt><dd>GitHub · AI code review</dd></div>
</dl>

"Improved developer productivity" wouldn't give the matcher much to work with. This Unit names the change, the before and after, and the target it beat. It separates those details so the matcher can ask whether this claim answers a particular requirement.

The fixture carries four fields. The scorer compares two: the summary and the skills. A production Unit also carries metrics, seniority and scope signals, an evidence type, and a confidence score. The model produces them; the server validates them against the contract above.

I kept approval out of the extractor's output. It can't return that field, and the server stamps every extracted Unit unapproved. Anything the model proposes has to pass review before matching can use it. The enforcing filter runs server-side wherever evidence is consumed, four places as of 2026-10-06.

I can also type a Unit myself. Those arrive pre-approved and marked `user_confirmed`, because I've already made the assertion. Another review would add nothing.

```mermaid title="The core loop, and where approval sits in it" description="A pasted resume is extracted into Experience Units, each of which is written to the capability graph already, but unapproved. Human review flips that approval flag in place. The gate is not on the way into the graph but on the way out of it: a server-side filter passes only approved Units into matching, so an unapproved Unit sits in the store and is never read. Units the user types by hand arrive pre-approved instead. Separately, a job description is parsed into requirements. The matching engine scores approved Units against those requirements and surfaces requirements with no qualifying evidence as gaps rather than hiding them. Generation draws only on approved matches, and a traceability check sits between the generated draft and export: a claim that cannot be traced back to an approved Unit is stopped at the gate until the user resolves it."
flowchart TD
    R["Pasted résumé"]
    U["Experience Units<br/>written unapproved"]
    G["Capability graph<br/>approved and not"]
    REV["Human review<br/>flips approval"]
    GATE["approved-only filter"]
    JD["Job description"]
    REQ["Requirements"]
    M["Matching<br/>scores + gaps"]
    GEN["Generated draft"]
    V["Traceability check"]
    X["Export<br/>(Phase 2 stub)"]

    R --> U --> G
    REV --> G
    G --> GATE --> M
    JD --> REQ
    REQ --> M
    M --> GEN --> V
    V -->|every claim traces| X
    V -.->|a claim does not| GEN

    style GATE fill:#e8784a,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style V fill:#e8784a,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style REV fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style G fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style X fill:#11100d,stroke:#11100d,stroke-width:1.5px,color:#fffdf8
```

The two orange nodes are the whole product. The first sits after the graph: unapproved Units are stored immediately, then filtered out when something reads the evidence. The audit calls it a read gate because it doesn't stop a Unit from being written. Those two checks carry the thesis. The rest is plumbing a competent team would build the same way.

I put requirements with no qualifying evidence in a gaps panel above the match list, inside the same tab. I wanted to see the gaps when I looked at the matches. They were the point, not an embarrassment to bury.

## The decisions

### Make zero fabrication a gate, not a warning

Trust · pending

**What I encountered**

An application I send is something I may have to defend out loud, in a room, weeks later. A good sentence about something that never happened can sound confident right up to the follow-up question.

**Over**

A confidence score and a warning banner for risky claims. That's the standard pattern, and it still lets someone ship when a deadline matters more than the warning.

**What I decided**

I required every claim in a draft to trace back to its Experience Unit and disabled export while any claim failed. To clear it, I have to edit the claim, remove it, or supply a Unit that supports it.

**Why**

I didn't want to leave that judgment to someone in a hurry, reading prose that sounds like their own. A block needs a disqualifying reason. An unprovable claim in a job application qualifies.

**Cost**

The tool gets in my way most when I'm in a hurry. It also blocks a true accomplishment if I haven't documented it. I have to write the evidence down before I can use it, so an honest missing record and a careless invented claim pay the same tax.

**What it changed**

The gate exists in code, with a fixture designed to break it. That test proves the orchestration blocks a known fabricated claim. The language-model checks are mocked, so it doesn't measure whether the detector reliably catches a new one.

The product records no use of a generated output by a user. The export behind the gate remains a stub.

### Build for one user and refuse to generalize

Scope · pending

**What I encountered**

I could specify outcome-driven tuning, a referral graph, and a should-I-apply score on day one. All those V2 layers were more interesting to build than the four steps that had to work first.

**Over**

Building the multi-user foundation first, on the usual argument that tenancy is cheap to add up front and expensive to retrofit.

**What I decided**

I kept V1 to one user and one job search. The spec explicitly put multi-user, sharing, teams, job-board integrations, and every learning layer out of scope. I didn't leave them waiting in a backlog.

**Why**

I needed to find out whether evidence-grounded generation could produce an application I'd send. One user could answer that question. A thousand users wouldn't answer it any better. Whether the architecture could hold them was a different question.

**Cost**

I'm the only customer and the author. The evaluation corpus comes from my prospect list. Every signal is one I generated myself, and I can't separate a product that works from one its builder is willing to tolerate.

### Fix the ruler before trusting the measurement

Method · mixed

**What I encountered**

I was tuning the matching layer against match accuracy. One run reported 18.1%, with three samples of a single fixture ranging from 12.5% to 25.0%. That spread was wider than the improvement I was trying to measure.

**Over**

Continuing to tune against the noisy metric and averaging more samples. It would cost less engineering time and was affordable within the cap.

**What I decided**

I stopped tuning the matcher and repaired the measurement. I replaced the absolute 0.30 similarity threshold with relative best-match mapping and a 0.10 sanity floor. Later, I built a content-addressed stage cache so unchanged stages could replay for free.

**Why**

When a metric's run-to-run noise is larger than the effect I'm measuring, I can't tell whether a change helped. Averaging costs another run. At three samples, a run cost $2.06 against my $25 monthly cap, enough for about twelve tuning runs a month.

**Cost**

My final session changed no user-facing feature. I paused with better instruments and the four-pair baseline unchanged. The one run after the mapping repair showed less noise and a mean near 19%. The work someone would have seen in a demo was the work I didn't do.

**What it changed**

Both repairs landed, but I measured only the first. In its own pull request, the mapping fix ran once on one fixture at three samples. The range fell from 12.5 points to 4.1, and the mean was 19.4%.

Eight weeks of product work separated that repair from the cache, which landed in the final session at the end of July. No run under the repaired mapping touched the four-pair corpus, and none followed the cache. I stopped with a better-designed instrument and one fixture's evidence that it was better.

### A deadline someone else depends on wins

Prioritization · mixed

**What I encountered**

In early July, Matchline and Five Across wanted the same summer. Matchline had one user, no launch date, and nobody waiting. Five Across was a live multiplayer bingo game for a nine-night cruise. The sailing date wasn't going to move, and the players would either have the game or not.

**Over**

Pushing Matchline to a usable V1 first, on the argument that a tool this close to working shouldn't stop mid-flight.

**What I decided**

I stopped Matchline to ship the game. I spent the one remaining Matchline session on measurement infrastructure instead of features.

**Why**

A date someone else set is not negotiable and a date I set is. That's my reasoning. The commits corroborate the sequence, not its cause: one project stopped and another started. Their timestamps can't tell anyone why I chose it.

**Cost**

The instruments were finally cheap, but accuracy wasn't there. I never made the four-pair run under the repaired mapping that the cache was built to make cheap. That was the next step, though it wouldn't alone establish that matching works. I still needed a finished corpus and a real application end to end.

**What it changed**

Product work stopped the day before the Five Across repository was created, apart from one final session on the evaluation cache.

The cache closed that phase. The next product commit landed a month later.

## The measurement problem

I set the bar at 80% extraction accuracy and 80% match accuracy. Matchline reached neither. How the numbers moved matters more than where they stopped.

The first scorer compared generated summaries with hand-labeled ones using string equality. The model paraphrased, and the score was 3.3%. Token overlap brought it to 34%. A coverage coefficient gave full credit when a longer generated set covered the labeled set, bringing it to 50.3%. I had changed the ruler twice.

The next change was to the product: expanding the matching vocabulary from roughly 220 entries to 415. That added a single point, reaching 51.3%.

```mermaid title="Extraction accuracy: two ruler changes and one system change" description="Extraction accuracy rose from 3.3 percent to 51.3 percent across four measurements, against an 80 percent target that was never reached. Three of those four measurements came from different definitions of the scoring metric rather than from any change to the product: string equality scored 3.3 percent, token overlap 34 percent, and a coverage coefficient 50.3 percent. Only the last step was a change to the system itself, an expansion of the matching vocabulary, and it added a single point to reach 51.3 percent."
flowchart TD
    A["3.3%<br/>string equality"]
    B["34%<br/>token overlap"]
    C["50.3%<br/>coverage coefficient"]
    D["51.3%<br/>vocabulary expansion"]
    T["80%<br/>the target"]

    A -->|CHANGED THE RULER| B
    B -->|CHANGED THE RULER| C
    C -->|CHANGED THE SYSTEM| D
    D -.->|never reached| T

    style A fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style B fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style C fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style D fill:#e8784a,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style T fill:#11100d,stroke:#11100d,stroke-width:1.5px,color:#fffdf8
```

All four measurements came from one résumé-and-job pair. Later the same day, a run across all four labeled pairs, three samples each, scored 48.4% extraction and 19.1% match. That aggregate remains the baseline of record.

The vocabulary work also moved match accuracy from 4.2% to 16.7%. After that, I couldn't read the signal. One run reported 18.1%, with three samples of that one fixture ranging from 12.5% to 25.0%. Eight to thirteen points of noise was more than the improvement I was trying to measure.

I could average more runs, but a single run cost $2.06 against my $25 monthly cap. That bought about twelve runs a month.

I spent the last working session on the instrument rather than the product.

## The artifact

A validator that says "looks fine" can score well if every input is honest. I needed a case that should fail. The repository has a hand-labeled fabricated paragraph attached to my own résumé, the one the Unit above comes from. It claims a multi-year x86 and Arm CPU roadmap, a hundred-million-VM fleet, a 40% throughput gain on SAP HANA, and $400M in contracts displacing a competitor.

Both claims carry a number. The 7.4-to-4-day cycle time traces to the Unit above. I've never worked on SAP HANA, so a 40% throughput gain on it is a claim I couldn't defend, however plausible the sentence sounds. None of those four claims traces to an Experience Unit. The fixture lists all four, explains why each fails, and expects validation to fail.

That test runs in continuous integration against the Firestore emulator. Passing means the gate blocked the Export control, whose handler is still a stub. It proves the orchestration refuses a known untraceable claim. The model checks are mocked, so it doesn't establish that the model catches a new one. The integration reaches the database, not the model API.

## How it was built

Agents wrote the implementation, and independent agent identities reviewed it under the enforcement system documented in [Mergepath](/projects/mergepath/). They caught three defects that materially changed the product:

- A seniority scorer zeroed every Experience Unit because extraction emitted verbs and the ladder matched nouns.
- A schema converter silently returned an empty object, disabling model-input validation across four subsystems.
- A matching rerun discarded the user's rejections.

On that last one, my first reply to the reviewer was wrong. I cited a test that didn't cover the case. The reviewer pushed back a second time before it was fixed.

The eval stage cache landed on the evening of 2026-07-31, Pacific. That dates the pause. For the month after it, maintenance continued: dependency bumps, repository-template syncs, and identity and CI tooling. None touched the product.

Product commits resumed on 2026-08-31 and, as of 2026-09-01, were still landing. The fixes below belong to that later work. Paused means I hadn't launched or decided to restart; it doesn't mean the repository stopped receiving product fixes.

A development build is deployed behind a sign-in wall, and the "View Live Product" button above goes to it. It was redeployed on the evening of 2026-08-31, replacing the 2026-05-02 build it had served until then, and again on 2026-10-02. The served build checked for this page carries the June and July work and the fixes that followed.

Since 2026-09-30, the source rules and callable gates restrict reads and calls to my owner allowlist. The audit read the anonymous sign-in shell and its bundle; it didn't verify the deployed rules or try another account. The link shows that shell, not the corpus.

## What would restart it

I hadn't written restart or kill criteria while I was building. The repository had exit criteria for finishing V1, but none for deciding whether to continue. I had criteria for building, not for deciding.

**Resume it when:**

- I've finished and labeled the evaluation corpus.
- I can trust the measurement enough to distinguish improvement from noise.
- I've taken one real application through the product end to end. The second build phase required it, and I never met that condition.

**Kill it when:**

- Matching is still fundamentally poor after a full tuning cycle on the cheap evaluation infrastructure. Then I'd be treating the wrong approach as something that just needs more tuning.
- I finish a job search without reaching for it. The success metric was making Matchline my primary tool, instead of another system I abandon for a spreadsheet. If I don't use it under real pressure, that answers the question.

### Where it stands

As of September 2026, my job search had resumed. Matchline finally had the situation it was built to test.

Writing this page also exposed three stacked production failures:

- missing Cloud Run invoker bindings blocked CORS preflights;
- trailing newlines in both provider secrets broke authentication;
- extraction had a sixty-second timeout for three long model calls.

Once those were fixed, résumé extraction and JD parsing ran end to end. That exposed the next problem: the matching ontology under-recognizes out-of-domain requirements. Until a fix on 2026-09-01, `jaccard()` zeroed 45% of the score before fit was even considered.

The eval harness can now route tuning runs through a subscription CLI. Those runs don't draw on the metered Anthropic cap that had limited me to roughly twelve runs a month.

**The project remains paused.** The infrastructure works, experiments are cheap, and my job search supplies the test. I still need to decide to restart against the criteria above. Continuing to make commits isn't that decision.

## What I learned

Getting the model to produce something plausible wasn't the hardest part. I had to decide what evidence would make its output trustworthy, then build a measurement system I could trust to tell me whether the product was improving.

I got further with the evidence than with the measurement. Matchline can structure it, ground claims, and stop an untraceable claim at the gate. Matching stayed well below the quality bar. I stopped after fixing the instrument that could finally measure it.

That's why I paused before shipping. A product that exists is not necessarily a product that works, and a metric that moves is not necessarily evidence that anything got better.

## Related

- [Project: Mergepath](https://nathanpayne.com/projects/mergepath/)
- [Project: Five Across](https://nathanpayne.com/projects/five-across/)

## Most-changed passages

### The job-market premise

**Before:** Matchline is built on two premises about the 2026 job market. First, anyone can generate a tailored résumé and cover letter in seconds, so every application is polished and polish is no longer a signal. Second, what remains as signal is specificity a candidate can defend—and a generative writer can't supply it, because the model doesn't know which projects mattered, which numbers are honest, or which claims survive an interview.

**After:** I started Matchline with two premises about the 2026 job market. If anyone can generate a tailored résumé and cover letter in seconds, polish stops telling a hiring manager much. Specificity that a candidate can defend might still tell them something. A generative writer doesn't know which of my projects mattered, which numbers are honest, or which claims I can defend in an interview.

**Choice:** Keeps the thesis as my product premise, without turning a universal about every application into an established market fact. This remains a single-user hypothesis with no external research or market validation.

### The measurement repair

**Before:** Both repairs landed; only the first was measured. The mapping fix was run once, in its own pull request, on one fixture at three samples: the range fell from 12.5 points to 4.1 and the mean settled at 19.4%. Eight weeks of product work separate it from the cache, which landed in the final session at the end of July; no run under the repaired mapping ever touched the four-pair corpus, and none followed the cache.

**After:** Both repairs landed, but I measured only the first. In its own pull request, the mapping fix ran once on one fixture at three samples. The range fell from 12.5 points to 4.1, and the mean was 19.4%.

Eight weeks of product work separated that repair from the cache, which landed in the final session at the end of July. No run under the repaired mapping touched the four-pair corpus, and none followed the cache.

**Choice:** Preserves every result, sample/corpus qualification and chronology. Smaller paragraphs keep the measured repair distinct from the unmeasured cache, rather than implying neither repair was run.

### The gate's validation boundary

**Before:** It runs in continuous integration against the Firestore emulator, and a passing run means the export was blocked. That proves the orchestration refuses a known untraceable claim. It does not prove the model reliably detects a novel one, because the model checks are mocked in that test—its integration boundary is the database, not the model API.

**After:** That test runs in continuous integration against the Firestore emulator. Passing means the gate blocked the Export control, whose handler is still a stub. It proves the orchestration refuses a known untraceable claim. The model checks are mocked, so it doesn't establish that the model catches a new one. The integration reaches the database, not the model API.

**Choice:** Preserves the test's real evidence and limit, while making the export stub explicit where a reader encounters the claimed result. A disabled button is not a completed export flow.

### The deployment boundary

**Before:** Signing in with another account gets nothing: since 2026-09-30 an owner allowlist refuses every read and call from any uid but mine, so the link shows the shell, not the corpus.

**After:** Since 2026-09-30, the source rules and callable gates restrict reads and calls to my owner allowlist. The audit read the anonymous sign-in shell and its bundle; it didn't verify the deployed rules or try another account. The link shows that shell, not the corpus.

**Choice:** Removes the unsupported move from anonymously read client plus source configuration to deployed authorization proof. The checked source behavior and anonymous view remain; no newly authenticated probe or rules-deployment read is claimed.

### The admission about review

**Before:** On that last one my own first reply to the reviewer was wrong, cited a test that did not cover the case, and the reviewer pushed back a second time before it was fixed.

**After:** On that last one, my first reply to the reviewer was wrong. I cited a test that didn't cover the case. The reviewer pushed back a second time before it was fixed.

**Choice:** Keeps ownership and the second pushback; no reviewer mind-reading or claim that the first reply resolved the bug.

### The dated owner example and fabricated claim

**Before:** The exhibit quoted a synthetic Threadline founder’s pivot, 38 calls in six weeks, doubled ARR and churn from 4.1% to 1.8%, with four founder skills, two founder domains and no tools. Its explanation began “Led a pivot.” The artifact was attached to “a real résumé,” without identifying whose.

**After:** The April 26, 2026 `nathan-2026` fixture quotes “Introduced AI-powered PR review reducing median PR cycle time from 7.4 to 4 days, beating the 30% Q2 OKR target,” with its four engineering/process skills, two developer-tool domains and GitHub/AI code review tools. The published résumé link confirms the same underlying claim. “Improved developer productivity” gives way to the specific change, before/after and target. The artifact explicitly attaches to “my own résumé, the one the Unit above comes from,” and pairs the real PR-cycle result with a fabricated 40% SAP HANA gain: “I’ve never worked on SAP HANA.”

**Choice:** This is the owner-requested substantive example replacement approved in the fresh pass. The owner’s final connecting paragraph explicitly distinguishes a number tracing to a Unit from an equally numerical fabricated claim, while retaining the four-claim fixture and test boundary. The original Threadline numbers and fields are deliberately removed; the schema and `<dl>` scaffold remain. R35 preserves the old audit chronology and records fresh public provenance. R43 records the shared `resume_fixture_id` and distinguishes direct human testimony from source verification. Mocked checks, the stub Export control, and no recorded real application still bound the example.

### The requested card

**Previous prepared draft (155 characters):** Paused at 48% extraction and 19% match against an 80% bar. My final session made evaluation cheaper. I stopped before running the product through it again.

**Revised draft (125 characters):** Paused before launch with 48% extraction and 19% match against an 80% bar. My final session fixed the ruler, not the product.

**Choice:** Restores the owner’s preferred ending with normal spaces. The initial 109-character proposal failed the global 120-character floor and would exceed the grid ratio; the parent supplied this 125-character wording, adding the already-established pre-launch fact. The capitalized “Paused” also preserves the unchanged route-test pin. All shared checks remain unchanged and the owner approved this revised wording in the fresh pass. The final-session claim remains instrumentation work, and the full record still says no post-cache run occurred. This does not collapse the measured June mapping repair into the July final session.

## Complete substantive-point and qualification mapping

Every distinct point in the original is accounted for below. Row numbers refer to the existing historical audit. Its source pin and historical quotes are evidence context, not a new claim that current deployment or model behavior was checked.

| Original point or qualification | Draft destination and disposition |
| --- | --- |
| Title/slug, PAUSED status, single-user format, focus, stack, destinations, wordmark and dark surface | Configuration, format/focus and art unchanged. Authored description renditions rewritten without altering lifecycle or destinations (R22, R24–R25, R33). |
| Career CRM: approved evidence and traceable claims; pause before launch and any post-cache run | Hero/social/card/search preserve mechanism and pause. Export is named as a stub in social/search and the page. The post-cache no-run boundary does not retract the measured June repair (R58). |
| Card's 48% extraction / 19% match / 80% bar; final session concerned instruments | Card retains exact rounded baseline and final-session limit. No single-fixture 51.3% promoted onto the card (R6, R41, R58). |
| Two 2026 job-market premises: polish loses signal, defensible specificity matters, model lacks personal knowledge | Problem opening retains both as my premises, without an unproved universal market result (R16). |
| Twelve true-but-empty phrases; three exact examples; traceability alone is insufficient | Problem retains twelve, collaborated cross-functionally/drove results/moved the needle, and true-but-empty distinction (R1). |
| Typical résumé/JD prose workflow versus a reusable evidence graph; selection, sequencing and framing | Problem keeps all steps, three model jobs and approval requirement (R59). |
| Own job-search hypothesis; no external research or market validation; V1 must work for me first | Problem and Scope record retain testimony and limitation. Absence of repository evidence is not proof about research outside it (R17, R28). |
| 1 user, $25/mo Anthropic cap, about twelve runs, 10 × 12 corpus as of 2026-10-06 | Constraints retain all values, matcher and as-of date (R14, R26). |
| Complete capability table: three Built rows, unvalidated gate, Phase 2 export stub, measured cost and latency | Exact capability table retained byte-for-byte (R8–R9, R57). |
| Deferred LinkedIn/long-form ingestion; never-built PRDs, decks and retros; visible correction of earlier page | What got built explicitly retains correction and distinguishes specified from built, matching existing ledger (R56). |
| Checkable Experience Unit; strict schema, required evidence, confidence bound and exact code | Evidence model introduction rewritten; exact TypeScript code block retained, including existing comment elision (R34, R36). |
| Synthetic Threadline fixture: 38 calls in six weeks, doubled ARR, churn 4.1% to 1.8%, skills/domains/no tools | Deliberately replaced at the owner’s request with the dated real nathan-2026 Unit: 7.4 to 4 days, 30% Q2 OKR, exact four skills/two domains/two tools. R35 records public provenance and retains the original audit as historical. Four-field HTML scaffold stays; this substantive inventory change was reviewed in the fresh owner approval pass. |
| Specific pivot, calls and two changed numbers give the matcher a checkable claim | The replacement illustrates the same point with a specific PR-review change, before/after and target, rather than “Improved developer productivity.” |
| Four fixture fields, two scored fields; production metrics/signals/evidence type/confidence; server validation | Evidence model keeps all fields/counts and provenance split (R7, R36). |
| Extractor cannot set approval; server writes unapproved; review before matching; four consumers as of 2026-10-06 | Evidence model retains exclusion, write default, review and consumer count/date (R15, R36). |
| Hand-typed Units pre-approved and user_confirmed; the user's own assertion | Evidence model preserves manual route and exact code identifier (R37). |
| Stored unapproved Units, human review, approved-only read filter, matching/gaps/generation and traceability gate | First Mermaid fence/description/source retained exactly. Diagram narrative preserves all boundaries and manual bypass provenance (R38). |
| Two orange nodes carry thesis; ordinary plumbing elsewhere; gaps panel above matches in the same tab | Post-diagram prose retains thesis and exact placement/visibility rationale (R10, R38). |
| An application defended in a room weeks later; fabricated confidence fails at the follow-up question | Trust context keeps the concrete risk scenario. No owner interview event invented. |
| Claim traces to Experience Unit; disable export; edit, remove or supply evidence to clear it | Trust chosen keeps all three remedies; export stub explicit in evidence/table (R9). |
| Reject confidence/banner warnings; rushed judgment; unprovable application claim is disqualifying | Trust rejected/rationale retains tradeoff and owner's normative position. |
| Gate obstructs a hurried user and true-but-undocumented work; honest and careless cases pay the same tax | Trust cost retains both uncomfortable consequences. |
| Real gate and adversarial fixture; mocked detector calls; no measured novel detection or recorded output use | Trust evidence preserves pending boundary and adds explicit export stub. It makes no claim of reliable novel detection or used applications (R18, R27). |
| Day-one V2 tuning, referrals and should-I-apply score; four core steps must work first | Scope context retains all deferred layers and four steps (R28). |
| One user/search; multi-user, sharing, teams, job boards and learning layers excluded in spec, not backlog | Scope chosen retains full exclusion set and location (R28). |
| Multi-user foundation alternative: cheaper tenancy upfront, expensive retrofit | Scope rejected retains reasonable alternative. |
| Would I send an evidence-grounded application? One user can answer; scale is a different question | Scope rationale preserves hypothesis and unvalidated outcome. |
| Owner is customer and author; own prospect list; self-generated signals cannot separate usefulness from tolerance | Scope cost retains every validation/confounding limit (R28). |
| 18.1% run mean; three samples of one fixture ranged 12.5%–25.0%; noise exceeded intended effect | Method context and measurement body retain values/subjects; the mean is not a sample value (R29, R42). |
| Stop tuning; absolute 0.30 threshold becomes relative mapping with 0.10 floor; content-addressed cache | Method chosen retains both repairs and clarifies they were separated in time (R29–R30). |
| Alternative: noisy tuning plus averaging, less engineering work and affordable within the cap | Method rejected retains reasonable alternative and budget qualification. |
| Noise larger than effect obscures improvement; three-sample $2.06 run, $25 cap, about twelve runs/month | Method rationale and body retain numbers with their events (R26, R29). |
| Final session had no user-facing change; four-pair baseline unchanged; mapping mean near 19% with less noise | Method cost retains final-session scope and single-fixture qualification (R4, R6). |
| Both repairs landed; only mapping measured once in its PR; one fixture/three samples, range 12.5 to 4.1 points, mean 19.4% | Method evidence retains complete measured result and limits (R3–R4). |
| Eight weeks of product work between mapping and July cache; no repaired four-pair or post-cache run | Method evidence retains all chronology and negative assertions (R3, R5, R30). |
| Early July: one-user Matchline without deadline versus multiplayer Five Across for a nine-night cruise | Priority context retains complete situation and cross-page-compatible cruise duration (R31–R32). |
| Stop Matchline, ship game, spend remaining session on instruments; alternative finish a close V1 first | Priority chosen/rejected retain sequence and alternative. |
| Authentic deadline thesis; owner's rationale; commits prove sequence, not why | Priority rationale retains exact thesis and explicit causal boundary (R21). |
| Cheap instrument but inadequate accuracy; missing four-pair run; finished corpus and real application also needed | Priority cost retains every readiness condition and next-step limit (R5). |
| Work stopped before Five Across repository creation, except final cache; next product commit a month later | Priority evidence retains event ordering and calendar-month relation (R31). |
| Both 80% extraction and 80% matching quality bars unmet | Measurement opening preserves both bars and failures (R39). |
| 3.3% string equality → 34% overlap → 50.3% coverage; vocabulary about 220 → 415 adds one point to 51.3% | Body and unchanged second Mermaid preserve every value, two ruler changes, one product change and unreached target (R40). |
| All four figures from one pair; same-day four-pair/three-sample aggregate 48.4%/19.1% remains baseline | Measurement body preserves scope, date ordering and exact aggregate (R2, R41). |
| Vocabulary also moved match 4.2% → 16.7%; mean 18.1%, range 12.5%–25%, eight-to-thirteen points of noise | Body retains full series and approximate noise wording (R42). |
| Last working session repaired the instrument | Body preserves singular final-session qualification (R6). |
| Easy-to-fake validator; fabricated real-résumé paragraph claiming CPU roadmap, hundred-million-VM fleet, 40% HANA gain and $400M contracts | Artifact retains all four fabricated claims, now identifies the owner’s résumé and pairs the real PR-cycle result with the fabricated SAP HANA gain. The personal denial is owner testimony, with fixture corroboration (R43). |
| Four untraceable claims, individual reasons and expected failed validation | Artifact retains fixture evidence and count (R43). |
| CI and Firestore emulator; gate blocks known claim, models mocked, database integration, export stub | Artifact keeps tested boundary and names the actual blocked control (R9, R44). |
| Agents wrote and independent identities reviewed; seniority, schema and rejected-match defects | How it was built retains all defects and attribution, now as readable list (R45). |
| Owner's wrong first reply and non-covering test; reviewer pushed back a second time before fix | Same section keeps admission and sequence (R45). |
| Cache on evening of 2026-07-31 Pacific dates pause; following month maintenance, no product paths | Same section retains date and product-path limit; adds recorded identity/CI tooling to make maintenance inventory complete (R46–R47 repair). |
| Product commits resumed 2026-08-31 and were still landing as of 2026-09-01 | Same section keeps dates and makes status meaning explicit: fixes can land without launch/restart (R22, R48). |
| Dev sign-in build and CTA; 2026-08-31 redeploy replaced 2026-05-02 build; redeployed again 2026-10-02 | Same section retains exact pinned deployment phrases/dates, grounded in the audit's dated served-build read (R12, R24, R49). |
| 2026-09-30 owner allowlist in source; anonymous shell, no corpus; deployment enforcement unverified | Same section retains checked source gates and anonymous shell, explicitly removes unverified deployed-other-account assertion (R11 repair). |
| No earlier restart/kill criteria, but phase exit criteria; building versus deciding | Restart intro keeps admission and finding, written as criteria proposed on page (R51). |
| Resume with labeled corpus, trustworthy measurement and one real application; Phase 2 criterion unmet | Restart list retains all three conditions. The unmet condition remains owner's testimony; repository absence alone cannot prove it (R19). |
| Kill after poor full tuning cycle or finishing search without using it; primary tool versus spreadsheet | Kill list keeps both criteria and stated success metric (R52). |
| September 2026 job search resumed, providing the previously missing test situation | Where it stands keeps dated owner situation; no completed real application validation is implied (R23). |
| Page-writing exposed three failures: invoker/CORS, secret newlines/auth, sixty-second timeout/three calls | Where it stands preserves all failures and owner causal testimony; timestamps corroborate sequence only (R20, R53). |
| Extraction/JD parsing ran after fixes; ontology undercoverage; jaccard zeroed 45% until 2026-09-01 fix | Same subsection retains whole chronology and residual ontology problem (R13, R54). |
| Subscription CLI avoids metered Anthropic cap and roughly twelve-run limit; no new accuracy result claimed | Same subsection keeps route and budget benefit without claiming equivalent output or completed post-cache evaluation (R55). |
| Project still paused; working infrastructure, cheap experiments and job search need a deliberate restart | Same subsection keeps status and human decision requirement. Continued commits don't count as restart. |
| Plausible output easier than trustworthy evidence and measurement; first half got further | Closing preserves both lessons and ordering. |
| Evidence/claim gate built, matching below bar; stopped after instrument, paused before shipping | Closing preserves capability and outcome limitations, with export stub already explicit. |
| Exact thesis: an existing product may not work; a moving metric may not mean improvement | Exact concluding thesis preserved. |
| Related Mergepath and Five Across links | Labels/destinations unchanged (R33). |

## Supporting records and review judgments

- R11 is repaired in both summary and detail to source-only allowlist behavior, with anonymous client evidence and unverified deployed enforcement distinguished. The original audit totals are labeled historical: 10 wrong, 5 stale, 6 unprovable and 38 supported. The current 59-row table was recounted separately: 10 wrong, 4 stale, 6 unprovable and 39 supported. R11's supported source-only verdict accounts for the change; deployment enforcement remains unverified.
- R47's summary and detail now include identity and CI tooling. The no-product-path claim remains the same; this is an inventory repair from existing evidence, not a new product outcome.
- The broader 2026-10-06 ledger still retains historical, explicitly marked WRONG/STALE original quotations beside corrected values. Those quotations are the audit subjects, never their own support. Older cross-ledger warnings remain labeled as historical defects; this packet does not edit shared project ledgers or another page.
- The source keeps market premises, no-external-research testimony, reason for prioritizing the cruise, Phase 2's unmet real-application condition, and page-writing causation in their original judgment/testimony scope. Neither repository absence nor timestamps become proof of experiences or causes beyond the evidence.
- Two gates do not prove a reliable detector. The fixture checks orchestration with mocked model calls and a stub export control. Both limits remain in the record, table and narrative.
- The measured June mapping repair is not folded into the July final session. Its one fixture/three samples establish reduced range for that fixture, not corpus accuracy or product improvement. The four-pair aggregate remains separate from single-fixture results everywhere.
- R35/R43 now record fresh public-fixture identity, label date, 22-Unit count, exact fields, shared résumé identity, current public résumé confirmation, and the owner’s SAP HANA testimony. The old synthetic audit is preserved as historical. The replacement is dated evidence, not an added résumé sync contract.
- The exact schema code, capability table, Mermaid code/accessibility descriptions and captions are unchanged. The exhibit contents and their protected numeral inventory change only for the owner-requested real example; its four-field HTML scaffold is identical. Original decision assertions containing “not” are retained because they carry the existing product positions, not filler contrasts.
- The installed writing-style skill used supplied owner-designated model prose and approved model revisions from the batch brief. They are style references, not newly user-authored writing or new facts. No private writing was retrieved, cached, or used as style evidence; only the needed canonical résumé project section was read for factual fidelity.

## Validation and mechanical exceptions

The reader-facing authored text is 2948 → 2844 words, a 3.5% cut. This counts title, hero, format/focus/stack, constraint values/glosses, all decision text/lenses/statuses, and visible body prose/headings/captions/table/exhibit; it excludes imports/components, raw HTML and Markdown structural markers, fenced schema/diagram source and hidden accessibility metadata, template labels, and separate card/search/social renditions. It uses whitespace-separated words after stripping those markers and destinations. The brevity checker separately reports whole source 3,611 → 3,507 and body-only prose 1,815 → 1,774 (−2.3%); these include/exclude different surfaces and are not the full reader count.

The brevity checker reports six intentional failures: rewritten search description; its indented-code detector treats changed YAML decision evidence paragraphs as protected code; the two new public fixture/résumé URLs and corresponding link destinations; the new April 26, 2026 label date; and the changed numeral inventory. The owner-requested real exhibit removes the synthetic 38 calls, 4.1%/1.8% churn and six-week/doubled-ARR details, and adds the verified 7.4-to-4 result, 30% target and fixture date. The owner-supplied connecting paragraph formats the same cycle time as 7.4-to-4-day and pairs it with the fabricated 40% claim; no metric moves to another event or acquires a new outcome. The link’s SHA/fixture-year digits are new provenance, not changed product milestones. Existing schema/diagram/table/inline-code blocks and original non-exhibit protected dates, metrics, URLs and references remain. The four-field HTML scaffold is unchanged, while its contents are an explicit substantive proposal for approval. The spelled-out-number advisory was manually reviewed across twelve phrases, four fixture fields/two scored, four consumers, four core steps, one versus thousand users, three samples/one fixture, eight weeks, four-pair corpus, two repairs, three failures, two orange gates, four fabricated claims, second reviewer pushback and roughly twelve tuning runs. No checker was weakened.

The blog voice CLI rejects project MDX with exit 2, “Supply one blog Markdown (.md) file.” It has not passed this page. Sentence-case headings, straight apostrophes, American spelling, narrator pronouns, quotation/source attribution and complete original/ledger meaning comparison were reviewed manually. Original decision assertions containing “not” are retained as substantive positions. Two exact regression-test phrases are preserved inside the rewrite: the ingestion retraction and lower-case missing Cloud Run invoker bindings; tests were not changed. No new tests were added for copy.

The revised real-exhibit source passed an uncredentialed Astro build, with #1299 included. All 159 scoped project/content-schema/résumé-stamp tests pass on the final 125-character card, with no test change. The earlier 109-character proposal failed the band and the first 125-character wording failed the case-sensitive “Paused” route pin; the final parent-supplied wording satisfies both unchanged checks. Scoped desktop/phone Mermaid checks passed 17 tests with one existing skip after the final build; global setup verified every served file against this worktree’s dist. Changed-file prose lint and diff checks passed; sentence-case title warnings remain advisory. The previous complete responsive suite passed 369 tests with 51 existing skips; lint/typecheck had no errors or warnings. The final owner-supplied connecting paragraph was rebuilt and all 159 focused tests passed again after the Device integration. It does not alter schemas, decision records, diagrams, cards or résumé body. No new broad suite was needed. Original exact regression phrases remain and no tests/checker were changed.

At 1440px and 375px, every authored field in all four decision records renders exactly, all three existing evidence fields compute to `white-space: pre-line`, and there are no page errors, document overflow or article-copy overflow. Separate render checks compare all four Unit fields with the public fixture, verify the public résumé link, and compare the project-index card with the exact 125-character source. Desktop/phone Unit and card screenshots were inspected, with no clipping. The unchanged 168-character social description still fits its regenerated card. The final connecting paragraph was also compared with rendered text at both widths, normalizing the renderer’s existing typographic apostrophes; the source retains the requested straight apostrophes, and both paragraph screenshots fit. Evidence lives in `/tmp/project-voice-batch-2026-10-12/matchline/`. Only this project’s generated OG reference is included. The parent’s Rules API read is pending credentials, so no production-authorization proof or signed-in non-owner test is claimed; no retry was attempted here.

## Approval record and remaining condition

On 2026-10-12, the owner approved the revised draft and supplied this final connecting paragraph: “Both claims carry a number. The 7.4-to-4-day cycle time traces to the Unit above. I've never worked on SAP HANA, so a 40% throughput gain on it is a claim I couldn't defend, however plausible the sentence sounds.” The complete reader above contains it, with the four fabricated claims, expected failure, mocked detector, stub Export control and database boundary preserved.

The parent will audit this final revision before the authorized PR/review workflow. Merge is still conditional on the live-rules verification or explicit owner acceptance of the source-only boundary, followed by the required PR checks. The owner’s future intent to refresh credentials is not readiness; no auth retry occurred here. Deployment is handled separately by the parent workflow.
