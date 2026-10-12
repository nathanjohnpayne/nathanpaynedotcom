# Friends & Family Billing—voice approval packet

Draft date: 2026-10-12. Status: owner approved the copy for a PR and merge on 2026-10-12, conditional on the live rules check and two wording fixes. Those conditions have been addressed in this revision; the parent must confirm the readback before starting the PR workflow. No PR, push, merge, or deployment has occurred for this draft.

Factual baseline: `467d26110ae1b3850f03b88296300b4f23262909`, `origin/main` when this pass began. Final validation includes dependency merge `ff2daa3e1f4b370a673d0f8ac75b757bdb171f72` (#1299), which supplies the evidence paragraph style; the captured original remains the initial baseline. Source: `src/content/projects/friends-and-family-billing.mdx`. Historical facts ledger: `plans/correctness-pass-2026-10-06/friends-and-family-billing-ledger.md`. Product evidence retains that ledger's pinned 2026-10-06 audit except R18, whose deployed-rule verification is freshly dated 2026-10-12. That read-only check covered rules/configuration; no private product data was read.

## Approval summary

The complete page is rewritten: hero, homepage/project card, search snippet, four constraint glosses, all three mixed decision records, and the body. It begins with my yearly spreadsheet routine and keeps the decisions in my voice. Codex is named as the agent that delivered PR #161 after I changed the brief. Five existing section headings, the constraint strip, decision ledger, household image, diagram, and diagram caption keep their positions. The three decision titles are unchanged after searching project/blog copy and ledgers for cross-page references.

The prose distinguishes the April rendering fix from the September security change. It keeps the recipient invoice outside the tested parity claim, preserves the lack of automatic sending, and makes visit counts about visits rather than people. The overpayment record still admits that I got the model right before providing the views the coordinator and recipient needed.

The original 2026-10-06 audit checked source only, so the first draft removed its unverified deployment assertion. The parent's read-only Firebase Rules API check on 2026-10-12 now confirms that the complete deployed rules match current product main. The deployed wording is restored and the three hedges are removed. Exposure is bounded to a known-hash read of an existing cached member view, including linked household members: a successfully deleted cache cannot expose its payload. The normal revocation and pruning deletion paths are explained once in decision 1 Cost; its evidence keeps the link-management outcome, and the Access recap links issue #492. R18's summary/detail now record live provenance and retract the source-only conclusion in place. No private member documents or tokens were probed and no data/configuration changed.

The canonical résumé and site mirror still agree verbatim. Its claims—recurring household costs, showing the arithmetic, tracking settlement, handling questions without accounts, nine people across five households—hold against this draft. Only `claimsReviewed.caseStudy` and the date change; the body, body hash, private canonical, and unrelated entries stay untouched.

## Metadata proposed for approval

The hero supplies the social-card line through the existing fallback. The card supplies both the homepage and project index. No template copy or alternate rendition is added.

### Hero and social fallback

**Before (118 characters):** Shared billing that shows the math, tracks the money, and takes the awkward checking out of splitting recurring costs.

**After (166 characters):** I built shared billing for nine people so I could stop reopening a spreadsheet every time someone asked what they owed. The math was easy. Explaining it was the work.

### Homepage and project card

**Before (186 characters):** Shared billing for nine people that handles the explaining and asking without recipient accounts. Its three biggest failures shared one gap: the model was right before the interface was.

**After (155 characters):** I built billing for nine people without recipient accounts. It handles the explaining and checking, but I got the model right before I made it easy to see.

### Search snippet

**Before (134 characters):** A household billing tool built on one question: how do you show someone what they owe, and why, without making them create an account?

**After (160 characters):** I built a household billing tool for nine people. It shows what they owe and why without an account, but getting the model right didn't make every screen right.

## Complete proposed page

The reader view expands every component record. The source keeps the unchanged asset path; this packet links its published image for readability.

# Friends & Family Billing

I built shared billing for nine people so I could stop reopening a spreadsheet every time someone asked what they owed. The math was easy. Explaining it was the work.

Format: Shared-cost coordination tool

Focus: Recurring shared costs and the adjustments around them

Stack: React · JavaScript · Vite · Firebase · Vitest · Playwright

## The math was never the problem

My husband and I split T-Mobile, Apple One, and 1Password with my parents, my sister's family, and two friends. Nine people in five households. The name was fairly literal.

Every year, someone would ask how much they owed. I'd open a spreadsheet, work through the math for three bills, and text them a number. Then someone else would ask, and I'd do it again.

The arithmetic was trivial. I had to calculate, explain, ask, remind, verify, and repeat. Asking friends for money feels awkward. Checking whether they've looked feels intrusive. Both jobs fall to whoever set the arrangement up, which was me.

I needed accurate numbers and a record I could audit, because I was the one vouching for them. A recipient needed an amount, the arithmetic behind it, a way to pay, and a way to object. I built Friends & Family Billing around those two jobs and kept an account out of the recipient's way.

## One link is the recipient's whole year

A household member opens a no-login link. It shows their member-scoped view, including equivalent summaries for any linked household members. I wanted the page to explain the number I used to text them.

Every bill shows its derivation inline: `$300.00/mo ÷ 8 members = $37.50/mo · ×12 = $450.00/yr`. The display reads each figure from the canonical fields the billing math wrote. It doesn't calculate them again, so it can't imply a rounding step the calculation never took. The invoice email carries a greeting, a total, and the link. The email asks; the page explains.

A link can let someone question a charge, approve or reject my proposed resolution, confirm or deny receipt of a refund, and request a fresh link when theirs has died. The first three depend on the scopes I grant that link. Without them, it opens to a summary with no controls. Recipients can't record payments; there's no payment control or write scope. They see, question, and confirm. I post the money.

"Question This Charge" stays inside that no-login flow. It submits a scoped review request, rate-limits it, writes a server-side audit entry, and emails me the question with a link straight into my review queue. Six of the seven Cloud Functions serve someone who has no account.

That removes three steps from the old conversation. A recipient can find the amount and its derivation without asking me. I can see that their link was opened without asking them: each link has a visit count and a last-viewed date. Those count visits through the app, not people. A forwarded link and a second look give me the same signal.

An expired link has a "Request New Link" control. The system emails me the request, but I still have to create and deliver the replacement.

Sending is still my job too. There's no scheduler in this codebase. Once a year, I open a dialog and press Send for each member. I removed the explaining and the checking, and moved the request for a replacement into the product. I didn't automate the sending.

![My own share of the 2026 bills, from the live product. Each line shows its derivation and not just its result—`$300.00 / month × 12 ÷ 8 members = $450.00`—and every figure is read from the field the billing math wrote, not recomputed for display, so the page cannot imply a rounding the calculation never took. This is the same derivation a recipient's link renders. The capture stops at my own subtotal: the rows below it belong to another member, and my approval to publish covers my data and nobody else's.](https://nathanpayne.com/images/projects/friends-and-family-billing-household.png)

- 9 people: one group across five households, no shared budget; the only users there have ever been, on my account
- No accounts: recipients hold a link; I designed possession of it to be their credential
- No scheduler: I still press Send for each member once a year
- 365 days: the default link life, including what the dialog silently creates when I choose No expiry

## The decisions

All three decisions are mixed. Each has real support and a real limitation. Two concern the money: who can see a household's numbers without an account, and what I owe someone who overpaid. The third is the rendering failure I wrote about in [Six PRs, One Bug](/blog/six-prs-one-bug-agent-failure-modes/).

### Make the link the credential

Access · mixed

**What I encountered**

A household member checks their bill a handful of times a year. I didn't want to put a password, recovery flow, and sign-in in front of that, especially for the person I was asking to pay. The token link was already there before the React app. No ADR, spec, or pull request records a comparison with recipient accounts.

**What I decided**

I gave recipients a URL. It opens their member view, including equivalent summaries for any linked household members. I added expiry, revocation, and pruning, plus a visit count and last-viewed date for each link.

**Why**

A recipient needs four things: an amount, its derivation, a way to pay, and a way to object. Those are read-and-request acts. I didn't need to establish an identity for them, and I expected an account requirement to stop someone who only checks once a year from looking at all.

**Cost**

The application treats whoever holds the link as the recipient. The deployed data-layer rules let anyone who knows the token hash read an existing cached view of that member and any linked household members, without checking expiry or revocation. Revocation marks the token revoked and tries to delete the cache, but ignores a failed delete; pruning batch-deletes caches. A successfully deleted cache no longer exposes its payload.

**What it changed**

Managing links became part of my workflow. I can read each link's lifecycle, visit count, and last-viewed date to see that a bill was opened without asking.

### The coordinator doesn't keep the change

Settlement · mixed

**What I encountered**

The vanilla-JS app had three balance states: outstanding, partial, settled. Then consider a service credit applied after someone has paid. I'm holding money that belongs to them, and none of those states says so.

**Over**

Writing it off. A coordinator can quietly keep a small overpayment in an informal arrangement. I deliberately removed that option; ADR-0004 records the absence of a forgive-credit action as intentional.

**What I decided**

I added overpaid as a fourth state in the React port on 2026-03-21, in a Phase 2a commit rather than an ADR. ADR-0004 later made the rule explicit: I have to return an overpayment as a refund or carry it forward. I can't absorb it.

**Why**

If I can call a balance settled but can't say that I owe someone money, I can turn the household's error into my gain and call it even. Between people sharing a phone plan, returning the money matters to whether the arrangement feels fair.

**Cost**

The fourth state doesn't clear itself. I have to close it by deciding where the money goes. Behind the badge came credit adjustments, refund events, a refund-notice service, a refunds scope on share links, a Cloud Function for the recipient to confirm receipt, and five ADRs about how credit moves.

**What it changed**

I got the state into the model before I made it easy to find. The board has an Owed to members tile, so I can see that I owe money. Its filters are All, Outstanding, Partial, Settled. There's no Overpaid chip; I have to scroll All to find the household.

The share page doesn't import the status badge. The person whose money I'm holding sees green settled or a red amount due. I made the debt visible in the headline and left both people who need to act without the view they need.

### Fix the rendering model, not the preview

Parity · mixed

**What I encountered**

The invoice template had three render paths. The editor drew its own DOM with unresolved token pills, the preview used one markdown pipeline, and the sent email used another. Six pull requests shipped on this surface in one session across roughly twenty hours without closing the gap. The three attempts at the bug itself all tried to make the surfaces look closer.

**What I decided**

I changed the brief, and Codex delivered PR #161. It introduced a canonical renderer whose docstring calls it the single source of truth for the Invoicing preview and template email HTML. That path bypassed the plain-text bridge. A regression test in a required check held the preview's DOM and the test email's payload to the same HTML until 2026-09-30.

**Why**

The sent email is the source of truth. I needed one renderer that the other surfaces used. Making Preview look closer kept the three competing versions in place, which was the approach that had already failed.

**Cost**

The fix reached the surfaces I was watching. Before it, the test email and the invoice rendered identically. After it, they diverged: the preview and test send moved together, and the invoice stayed where it was. The pull request never touched the file that sends the recipient's invoice.

**What it changed**

After the third failed attempt, I rewrote the brief as an invariant, explicitly banned the approach that had failed three times, and moved the task to a different agent. That produced the canonical renderer and required tests comparing the preview with the test send: two at the time, though the set has changed since.

None checks the invoice people actually receive. The tests still cover the same incomplete set of surfaces the fix did. [Six PRs, One Bug](/blog/six-prs-one-bug-agent-failure-modes/) has the chronology.

## What broke

I kept getting the model right and stopping before the screen someone needed.

- **Rendering.** From April to September 2026, the preview and test send shared a canonical renderer. The recipient's invoice didn't; its dialog sent plain text with no HTML field. A security change on 2026-09-30 (friends-and-family-billing#459) closed that particular gap by taking every email off the client's HTML. Both sent messages now render server-side from plain-text bodies, which still differ in serialization. Only the preview uses the canonical renderer.
- **Settlement.** I modeled overpayment and built the subsystem behind it. I can see an `Owed to members` tile, but there's no `Overpaid` filter to take me to the household. The recipient's share page has no badge for the money I owe them.
- **Access.** I built expiry, revocation, and pruning into the application. The deployed rules leave an existing cached member view readable to anyone who knows its token hash, without checking expiry or revocation. [The missing backstop is tracked in issue #492](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/492).

The gaps sit at different layers, but I made the same mistake each time: I stopped checking just before the boundary that mattered.

```mermaid title="Three render paths, one template" description="One invoice template renders along three paths. The editor draws its own document and shows tokens unresolved, so it never matched the output on screen; the brief's ask that it reflect final output was never delivered. The canonical renderer, added by the 2026 parity fix, produces the preview, and from April to September 2026 it produced the test send too, with a required regression test holding those two together. The invoice email a household member actually receives always took the third path, through the plain-text bridge into the server's markdown renderer, which the fix never reached; since 2026-09-30 the test send takes that path as well, so the only surface still on the canonical renderer is the one nobody receives."
flowchart TD
    DOC["Template doc"]
    ED["Editor DOM<br/>token pills"]
    CAN["Canonical renderer"]
    PV["Preview"]
    TE["Test email"]
    BR["Plain-text bridge"]
    MD["Server markdown<br/>renderer"]
    INV["Invoice email"]

    DOC --> ED
    DOC --> CAN
    CAN --> PV
    CAN -.->|until 2026-09-30| TE
    DOC --> BR
    BR --> MD
    MD --> TE
    MD --> INV

    style DOC fill:#fffdf8,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style ED fill:#dde1e5,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style CAN fill:#e3d477,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style PV fill:#e3d477,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style TE fill:#e8784a,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style BR fill:#e8784a,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style MD fill:#e8784a,stroke:#11100d,stroke-width:1.5px,color:#11100d
    style INV fill:#11100d,stroke:#11100d,stroke-width:1.5px,color:#fffdf8
```

Three paths out of one template. The two the parity fix unified were the two the tests covered, and the third was the one that reaches a person; since 2026-09-30 the test send has rejoined the invoice on the bridge, leaving only the preview on the canonical renderer.

## What I learned

Splitting a phone plan wasn't mathematically hard. It was always a division. Showing the derivation answers the question someone would otherwise ask me, and the visit count lets me check without another message.

I routed the asking without automating the sending. That feels like the right place to stop. Nothing here should decide on its own that a friend owes money.

The harder lesson was mine. I modeled overpayment correctly and refused to let the coordinator absorb it, then left myself scrolling to find it and the recipient with no sign of it. I unified the renderer and missed the path into a person's inbox. In both cases, I stopped at correctness before reaching the surface someone actually looks at.

The household doesn't experience a balance state or a canonical renderer. It experiences an amount, an explanation, and whether the arrangement still feels fair a year later. In a product moving money between people who know each other, that is the whole job.

## Related

- [Blog: Six PRs, One Bug: What AI Agents Actually Get Wrong](https://nathanpayne.com/blog/six-prs-one-bug-agent-failure-modes/)
- [Project: Override](https://nathanpayne.com/projects/override/)

## Most-changed passages

### The annual ritual

**Before:** My husband and I split T-Mobile, Apple One, and 1Password with my parents, my sister's family, and two friends—nine people in five households, which is the detail the product's name was carrying all along. Every year, someone would ask how much they owed, I would open a spreadsheet, re-derive the math for three bills, and text them a number. Then someone else would ask, and I would do it again.

**After:** My husband and I split T-Mobile, Apple One, and 1Password with my parents, my sister's family, and two friends. Nine people in five households. The name was fairly literal.

Every year, someone would ask how much they owed. I'd open a spreadsheet, work through the math for three bills, and text them a number. Then someone else would ask, and I'd do it again.

**Choice:** Smaller paragraphs put the situation before the product explanation. The dry observation about the name is retained in ordinary language. The three services, nine people, five households, annual cadence, and repeated work remain.

### Who moved in the rendering fix

**Before:** The fix landed on the surface being watched. Before it, the test email and the invoice rendered identically; after it, the proven surface and the real one diverged—and the pull request that unified the first two never touched the file that sends the third.

**After:** The fix reached the surfaces I was watching. Before it, the test email and the invoice rendered identically. After it, they diverged: the preview and test send moved together, and the invoice stayed where it was. The pull request never touched the file that sends the recipient's invoice.

**Choice:** Names the surfaces and direction of change. The invoice did not drift or move; it was the path the fix missed. Historical cost remains distinct from the September update.

### What the deployed rules establish

**Before:** The weakness is enforcement—expiry and revocation live in the application, and the deployed data-layer rule does not fully back them.

**After:** The application treats whoever holds the link as the recipient. The deployed data-layer rules let anyone who knows the token hash read an existing cached view of that member and any linked household members, without checking expiry or revocation. Revocation marks the token revoked and tries to delete the cache, but ignores a failed delete; pruning batch-deletes caches. A successfully deleted cache no longer exposes its payload.

**Choice:** The 2026-10-12 live API readback now supports deployment wording. The first draft's source-only hedges are withdrawn, not left alongside the new claim. This identifies the missing rules backstop without saying cache deletion never works or claiming a private payload was read. Nathan is not presented as the person who performed the API check.

### The closing admission

**Before:** The harder lesson is that getting the model right is not the same as getting it seen. I modeled overpayment correctly, refused on principle to let the coordinator absorb it, and then left the coordinator scrolling for it and the recipient with no sign of it at all. I unified the renderer and missed the one path that reaches a person's inbox.

**After:** The harder lesson was mine. I modeled overpayment correctly and refused to let the coordinator absorb it, then left myself scrolling to find it and the recipient with no sign of it. I unified the renderer and missed the path into a person's inbox.

**Choice:** Keeps the admission and human responsibility. The next sentence retains the thesis that correctness stopped before the surface someone actually looks at.

## Complete substantive-point and qualification mapping

Every distinct point in the original is accounted for here. Ledger row numbers refer to the existing historical audit, not a new claim of live verification. Original quotations retained in historical ledger rows remain audit subjects, not evidence for themselves.

| Original point or qualification | Draft destination and disposition |
| --- | --- |
| Title/slug; SHIPPED; React/JavaScript/Vite/Firebase/Vitest/Playwright; format/focus; URLs, tags, order/accent | Metadata unchanged except authored description renditions; no status, destination, layout, or technology claim changes (R11–R13). |
| Splitting T-Mobile, Apple One, 1Password with husband, parents, sister's family, two friends; nine people/five households | Opening and 9 people constraint preserve all participants, services and counts. Remains owner-supplied autobiography, not corroborated production data (R8). |
| Annual spreadsheet recalculation for three bills, repeated whenever someone asked | Opening, with the same annual frequency and repeated work. No invented duration, savings measurement, or external adoption (R9–R10). |
| Only users ever, on own account; one group with no shared budget | 9 people constraint retains this owner testimony and limit (R9). |
| Coordination cycle: calculate/explain/ask/remind/verify/repeat; awkward asking, intrusive checking, default coordinator responsibility | Opening names every verb and says that coordinator was me. No measured interpersonal outcome added. |
| Two jobs: coordinator accuracy/auditable record/vouching versus recipient amount/derivation/payment/objection/no account | Opening and access rationale retain all requirements. |
| No-account bearer link as intended credential; handful of visits a year; password/recovery/sign-in burden | Access context/constraint/rationale retains the intended model and owner's judgment. Prediction about accounts is explicitly my expectation, not observed abandonment (R9, R16). |
| Link predates React; no ADR/spec/PR records comparison with recipient accounts | Access context preserves both the chronology and absence-of-record qualification (R16). No rejected account evaluation is invented. |
| Member-scoped view includes equivalent summaries for linked household members | Access chosen/body; same scope (R17). |
| Expiry/revocation/pruning; counters and last-viewed date for each link | Access chosen/evidence and body; lifecycle/counters retained (R17). |
| 365-day default; No expiry silently creates that default | Constraint retains exact value and the misleading dialog option (R14). |
| Link-holder is treated as recipient; possible exposure bounded to member and linked households | Access cost/body; risk retained and now verified against the deployed rule. Exposure is confined to an existing member/linked-household cache at a known hash; normal successful deletion removes the payload. R18 records the read-only API provenance and issue #492. |
| No scheduler; coordinator still presses Send once per member per year | No scheduler constraint/body/closing; no automatic sends asserted (R15). |
| Inline arithmetic example and canonical fields; no display recomputation or invented rounding | Body exact code example retained. Image caption is byte-identical, with the same second formula (R29, R34). |
| Email greeting/total/link; email asks/page explains | Body retains the thesis and scope. It remains an abbreviated description, not an exhaustive email-content inventory (R30). |
| Four grants: question, approve/reject resolution, confirm/deny refund receipt, request replacement | Body retains all four and both binary decisions (R31). |
| First three controls require per-link scopes; without those summary/no controls | Body preserves the grants qualification; no universal recipient control is implied (R31). |
| No recipient payment control or write scope; only coordinator posts money | Body keeps both the technical absence and decision right (R31). |
| Question This Charge: scoped request/rate limit/server audit/email/deep review link | Body retains every step and exact control label (R32). |
| Six of seven Cloud Functions serve no-account recipients | Body retains both counts with their subject (R32). |
| Three eliminated coordination steps; amount/derivation self-service, visit check, replacement request | Body splits the three steps into readable paragraphs. Replacement still requires my manual creation/delivery; sending is not counted as eliminated (R33). |
| Visit counts are not people; forwarding and second look indistinguishable | Body preserves this exact validation boundary (R33). |
| Household image: own 2026 bills, same inputs/derivation, subtotal crop, publication approval only own data | Exact caption, URL, image, and placement preserved. Same derivation means inputs/result, not an identical string (R34). No further data published. |
| Three decisions, all mixed; two money decisions and rendering failure with companion chronology | Decisions intro preserves count, status and linkage (R35–R36). |
| Vanilla-JS outstanding/partial/settled; no overpaid branch; post-payment service credit means money owed back | Settlement context retains all three states and the scenario (R19). |
| Fourth state added React port 2026-03-21/Phase 2a commit, not ADR | Settlement chosen retains date and implementation provenance (R20). |
| ADR-0004 bans write-off; refund/carry-forward; absence of forgive-credit action intentional | Chosen/rejected preserve every disposition and the deliberate absence. 'Later' clarifies the ledger-supported chronology; the ADR did not create the March state (R20). |
| Trust/fairness when money flows back; settled-only model can turn household error into coordinator gain | Rationale retains the judgment in first person. Unmeasured claim that most arrangements keep money becomes the available informal option, without inventing prevalence evidence. |
| Overpaid not self-clearing; coordinator disposition; credit adjustments/refund events/notice service/refund scope/Cloud Function/five ADRs | Settlement cost retains complete subsystem and five-ADR count, using ledger's narrow credit-movement matcher (R21). |
| Owed to members headline exists; All/Outstanding/Partial/Settled filters; no Overpaid chip; scroll All | Settlement evidence and bullet preserve full UI list and friction. Removes the overbroad implication that nobody sees any debt: the headline does show it (R22). |
| Share page doesn't import badge; green settled or red amount due; recipient lacks overpayment signal | Settlement evidence and bullet preserve both displayed states and missing signal (R22). |
| Three original rendering paths: editor DOM/unresolved pills, preview pipeline, sent-email pipeline | Rendering context and unchanged diagram retain all paths (R23). |
| Six PRs on this surface, in one session, roughly twenty hours; three failed bug attempts/look-closer approach | Rendering context preserves count, inclusion scope, approximate duration and failure pattern (R24). |
| PR #161 canonical renderer; exact docstring designation; bypasses bridge on that path | Chosen keeps exact designation with attribution to the docstring and names Codex (R25, R28). The unchanged docstring is not proof that all current emails use it. |
| Required regression test once held preview DOM/test payload to same HTML until 2026-09-30 | Chosen preserves test scope and end date (R6). |
| Sent email source of truth; one renderer rather than three reconciled; Preview look-closer approach had failed | Rationale preserves the stated requirement (R26). |
| Test/invoice identical before fix; checked preview/test moved together; invoice untouched and diverged | Cost names movement accurately and preserves the omission of the invoice file (R27). |
| Third failed attempt; owner rewrites invariant/bans failed approach/changes agent; two required tests then; set changed since | Rendering evidence retains every action and count. Codex named as agent rather than narrator (R7, R28). |
| No test renders actual recipient invoice; incomplete parity scope persists | Rendering evidence preserves the negative assertion and links the chronology (R7, R35, R37). |
| April–September 2026 preview/test on canonical versus recipient dialog plain text/no HTML | Rendering bullet keeps history separate from dated update (R1–R2, R37). |
| 2026-09-30 security change friends-and-family-billing#459 takes all email off client HTML; server render/plain bodies still differ serialization; preview alone canonical | Rendering bullet and byte-identical Mermaid/description plus the owner-revised caption preserve the complete update (R1–R7). No current byte parity or completed recipient coverage asserted. |
| Same gap across layers; invariant/model stops before needed boundary | What broke intro/closing preserve the thesis with human ownership rather than abstraction. |
| Arithmetic was always division; explaining/checking removed via derivation; asking routed/sending manual; nothing should decide friend's debt | What I learned preserves product result and explicit owner judgment about stopping point. No measured time savings added. |
| Owner modeled overpayment/refused absorption but missed views; unified renderer/missed inbox path | Closing retains both admissions, responsibility, and distinct failures. |
| Household experiences amount/explanation/fairness a year later, not model/renderers; whole job | Last paragraph preserves thesis and annual relationship. |
| Related blog and Override links | Destinations/labels preserved (R35). |

## Supporting records and review judgments

- R18 is repaired in both summary and detail to SUPPORTED, DEPLOYMENT VERIFIED 2026-10-12. The original audit tally remains 27 supported, 7 stale and 3 unprovable; R18 was already supported within source scope, so extending it with deployed evidence does not change its bucket. The first draft's source-only conclusion is expressly superseded in place by the exact live readback below.
- The overpayment evidence says the headline exposes the debt but the filters and recipient page still fail the action someone needs. This keeps the original UI inventory and removes a contradictory blanket sentence, without claiming the product changed.
- The account rationale remains judgment: I expected an account requirement to discourage an annual visit. It is not measured recipient abandonment or a documented accounts-versus-links evaluation.
- The ADR sentence names the March implementation first and the later explicit rule second. No ADR-caused-March-state claim remains.
- The untouched image caption and diagram source/accessibility description preserve their historical qualifications and publication boundary. The diagram's following caption now says 'the two the tests covered' rather than 'the two anyone tested', as the owner requested; its dates and surface relationships are unchanged. The accessible description explicitly carries both April and September states.
- No private writing was retrieved or cached. The installed writing-style skill used the human-designated model prose and other owner-approved model revisions from the batch brief. Those are style references, not newly user-authored writing or new facts.

## Validation and mechanical exceptions

The reader-facing authored text is 2,089 → 2,021 words, a 3.3% cut. This counts title, hero, format/focus/stack, constraint values/glosses, all decision text/lenses/statuses, and visible body prose/headings/caption; it excludes imports/components, fenced diagram source and hidden accessibility metadata, template labels, and the separately reviewed card/search renditions. It uses whitespace-separated words after removing Markdown destinations/format markers. The brevity checker separately reports whole source 2,456 → 2,395 and body-only prose 1,043 → 974 (−6.6%). These counts were regenerated from the complete source after the owner fixes and live-rules revision; the earlier packet's stale plain-number reader figure is replaced.

The brevity checker reports six intentional failures: the search description rewrite; changed YAML evidence prose treated as indented code; and the new issue #492's URL, link destination, issue reference and numeric occurrences. The issue identifier occurs twice in the numeric inventory, in the label and URL. These supporting additions are authorized by the owner's live-verification condition. The checked date and release/ruleset timestamps are new evidence in this packet and R18, not changed historical events or shifted dates in the page. All original URLs/destinations, PR references, numeric tokens, timestamps, all five inline code spans, actual fenced Mermaid/code and tables remain; the checker reports no lost protected tokens. The YAML evidence scalars are authored prose, not executable code. The spelled-out-number advisory was reviewed against the complete mapping: all original distinct counts retain their subjects. No checker was weakened.

The blog voice CLI explicitly rejects project MDX with exit 2, “Supply one blog Markdown (.md) file.” It has not passed this page. Sentence-case headings, straight apostrophes, American spelling, narrator pronouns, source attribution and complete original/ledger meaning comparison were reviewed manually. The preserved decision title “Fix the rendering model, not the preview” is the original substantive decision assertion; it stays intentionally.

The original preparation passed an uncredentialed build; focused project/schema/résumé/ribbon/Mermaid suites (280 passed, 5 existing skips); the full responsive suite (369 passed, 51 existing skips); lint; and typecheck (0 errors, 0 warnings). No new tests were added for copy.

The latest live-rules revision was rebuilt uncredentialed and checked with the affected project/schema/résumé-stamp subset (159 passed), changed-file prose lint, and scoped desktop/phone diagram checks (17 passed, 1 existing skip). The scoped browser setup verifies every built file against served bytes before the assertions. No broad suite was repeated for this supporting revision. Advisory CMOS title-case suggestions are retained because the requested headings are sentence case.

At 1440px and 375px, every authored field in all three records renders exactly, with no page error, document overflow or article-copy overflow. Every evidence field computes to `white-space: pre-line`; the Access outcome is now one paragraph, while the other evidence records retain visible gaps. The final decision 1 cost, outcome and phone layout were inspected after the cache qualification was added. The unchanged social rendition remains 166 characters and fits without clipping. Render evidence is in `/tmp/project-voice-batch-2026-10-12/billing/` (desktop/phone top, full-page and decision 1–3 captures; `visual.json`). Only this project's regenerated OG reference is included in the branch.

## Live-rules provenance and read-only boundary

Checked 2026-10-12 by the parent workflow through the Firebase Rules API. The `projects/friends-and-family-billing/releases/cloud.firestore` release points to ruleset `527a0ae0-e202-437d-bed0-5290c97b8957`, created `2026-09-30T17:42:10.927663Z`; the release was updated `2026-09-30T17:42:16.063254Z`. Its entire `firestore.rules` byte-matches current product main `3691ab5b9f2580f3ffa324bba46674aef47184fc`, with SHA-256 `be4264dffc76f5a34b2d8e310c4a8774d5ad182e7fdf65b602bf04d860be46dc` on both sides. This revision independently read back the artifacts and rechecked byte/hash equality.

The `publicShares` get rule is unconditional. Current revocation marks the token revoked and then tries cache deletion, ignoring a deletion failure; pruning batch-deletes caches. Therefore the verified defect is the missing expiry/revocation backstop for a known-hash read of an existing cache. It is not a claim that a successfully deleted cache remains exposed. No private member documents or tokens were tested; no data or configuration changed. The captures are `/tmp/project-voice-batch-2026-10-12/billing/live-rule-comparison.json`, `live-release.json`, `live-ruleset.json`, and `live-firestore.rules`.

The parent searched open/all-history issues and filed the distinct exposure as [friends-and-family-billing#492](https://github.com/nathanjohnpayne/friends-and-family-billing/issues/492). #424 list isolation and #464 rawToken/requestShareLink concerns are separate. This page revision performs no fix or deployment to the billing product.

## Approval record

The owner approved the copy for a PR and merge on 2026-10-12, with live rules verification and two wording fixes. The card says "I got the model right", and the diagram's following caption says "the two the tests covered". The completed live check supports deployed wording; the three unverified-deployment hedges are removed, and normal cache deletion is acknowledged. Full reader text, metadata, source, supporting R18 and résumé stamp are synchronized.

The parent must verify the final readback and confirm the conditions before starting the PR workflow. Required PR checks still apply. No PR, push, merge, billing-product fix or deployment has been performed by this drafting agent. Deployment remains separate and is not authorized by this record.
