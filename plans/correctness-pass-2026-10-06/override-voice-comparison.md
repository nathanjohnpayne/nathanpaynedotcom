# Override voice rewrite: approval packet

Prepared 2026-10-12 against origin/main `ff2daa3e1f4b370a673d0f8ac75b757bdb171f72`. Original source captured at `467d26110ae1b3850f03b88296300b4f23262909`; its Override text is unchanged by the base refresh. Proposed source: `src/content/projects/override.mdx`. Factual authority: that complete source and `override-ledger.md`, with the technical record through 2026-10-06 and the production deal-room read separately dated 2026-08-28. The owner's designated style example guides voice; it is owner-selected model prose, not a retrieved user-authored corpus. No private writing was retrieved or cached.

## Approval summary

I made the decisions first person and broke the densest technical paragraphs into steps a reader can follow. The four decisions, three constraints, all five section headings, three body figures, related links, tags, metadata, statuses, lenses, and component placements remain. There is no learning component on this page; the closing prose remains its learning section.

I preserved the distinction between a working build and a product validated by a producer. The engine's specific arithmetic/phase inconsistency, thin financial test coverage, missing enforcement, approximate IRR, domain limits, and absent real-capitalization evidence remain. The August calibration run is described as historical so this rewrite does not imply I just repeated it. The record-scoped no-real-use claim and last production read have explicit dates.

One factual correction is proposed: the profit-split image's alt text says forty-five cents per hundred dollars. The image plainly shows 45%/5%/50% under Per $100: forty-five dollars, five dollars, fifty dollars. I correct only that unit, retaining all values, the carve from the investor pool, and the base-case no-recoup qualification. R34's ledger summary/detail now flags the unit error rather than calling the full sentence supported. This correction is included for owner approval.

The canonical résumé's Override entry still holds and the site body remains verbatim. Only its case-study hash/date are refreshed.

## Metadata proposed for approval

| Surface | Characters | Proposed copy |
|---|---:|---|
| description | 177 | I built Override to see what AI coding tools could do with a real problem. It connects a Broadway deal's capitalization, waterfall, scenarios, and investor returns in one model. |
| cardDescription | 147 | I turned Broadway deal documents into an interactive model to learn the domain and test AI coding tools. It still hasn't run a real capitalization. |
| seoDescription | 155 | I built a Broadway financial model with capitalization, waterfall, scenarios, and a read-only investor deal room. It has not yet run a real capitalization. |
| ogDescription | 158 | I built a Broadway deal model to learn the domain and test AI coding tools. It connects terms to investor outcomes, but has not yet run a real capitalization. |

The same card line appears on the homepage and project index. The search snippet supplies HTML metadata and JSON-LD, while the hero supplies the visible detail-page deck. The explicit OG description preserves the real-capitalization caveat on the social card, within its 180-character cap. Title and slug remain Override / override.

## Complete proposed page

# Override

I built Override to see what AI coding tools could do with a real problem. It connects a Broadway deal's capitalization, waterfall, scenarios, and investor returns in one model.

**Status:** SHIPPED

**Format:** Financial operating system

**Focus:** Capitalization, ownership, and investor workflows

**Stack:** Next.js · TypeScript · Tailwind · Firebase · Recharts · Vitest

**Kicker:** AI × Finance × Theater

**Tags:** Finance · Theater · React · Firebase

[View Live Product](https://overridebroadway.com) · [GitHub](https://github.com/nathanjohnpayne/overridebroadway)

**Hero image:** ![Override product view](/images/projects/override-hero.png)

## Why this exists

I wanted to know how far I could get building with an AI coding tool. I picked a real problem that annoyed me, in a domain I wanted to understand better.

Broadway investing supplied both. The first position I tracked arrived as three documents: a term sheet PDF, a cap-table spreadsheet, and a subscription agreement by email. Three months later, the cap table and term sheet disagreed. Nobody had done anything wrong. Each document was accurate the day it was written, and a production changes constantly while it is being capitalized.

So I opened the spreadsheet, rebuilt the waterfall by hand, and worked out what my position now meant. Spreadsheet archaeology.

I had three separate problems. The work was **manual**: I recalculated ownership, recoupment, and investor outcomes whenever anything moved. The deal was **hard to understand**: its economics were spread across documents I needed domain knowledge to interpret. It was also **static**. I could read what the producers expected to happen, but each artifact described one state of the deal. I could not ask what happened to my position if they were wrong.

Products like Carta had shown me an alternative: software could make complicated ownership structures legible and interactive. Broadway financing had the same ingredients: ownership, capitalization, waterfalls, and returns. I hadn't encountered anything like that from the investor's side. What would the experience be like if the deal itself were software?

I built Override to answer that question. It also let me test whether I could learn an unfamiliar, specialized domain well enough to build credible software for it, and how much an AI workflow could carry. I learned the domain by trying to model it. I learned the tooling by trying to ship it.

I named it after a line in the waterfall. The override, as I learned the word, is the producer's percentage taken off the top, before investors see a distribution. Opaque outside the industry, immediately legible to any producer who has negotiated one.

The technical record below runs through 2026-10-06. The production deal-room count is dated separately to its last read on 2026-08-28.

## How it works

**Structure the deal.** A producer sets capitalization and unit price, the weekly operating nut, house terms, eleven royalty participants, and the waterfall structure. First-time users can use a guided stepper. Experienced users can see every section at once, which is the default. Both the producer and prospective investor have a place in the product. The dashboard's primary control is a My Productions / My Investments toggle. I built it from the side of the table that only ever sees the second view.

**Model the outcome.** Broadway money moves in a fixed order, and the order is the product. Credit-card fees and the house's cut come out of gross box office to give adjusted gross. Eleven royalty participants take their share, then the weekly nut comes out, then the general partner's fee. What survives is distributable profit. Only then does the waterfall run.

Two structures ship. Under recoup-first, investors are repaid in full before anyone shares profit. In the week the show crosses its capitalization, the engine splits that week's profit at the crossing point. It does not put the whole week on one side of the line. Under share-from-dollar-one, profit sharing runs alongside recoupment from the first performance.

The same model gives per-investor returns, an approximate IRR, breakeven occupancy, and a sensitivity grid that re-runs across occupancy rates and run lengths.

![The weekly cascade as an investor sees it, computed by the same engine the producer's own model runs: gross box office down through credit-card fees and the house, royalties and the weekly nut to operating profit, then the GP's management fee, then what reaches investor recoupment.](/images/projects/override-waterfall.png)

**Share the deal.** The producer generates a link and sends it. The prospective investor opens the URL and reads the deal, with no account to create, invitation to accept, or portal to log into. The room holds a snapshot taken when it was shared. The producer can keep editing the model without changing what the investor is reading.

![What a prospective investor gets on opening a deal-room link, with no account: three cases side by side, each with its assumptions above its outcome. Bear and Base never recoup, so investor distributions are zero; Bull recoups in week 20 and returns $3.4M. Demonstration figures—the room's own producer note calls every number a placeholder.](/images/projects/override-scenarios.png)

- **6 days:** scaffold to the whole-app commit
- **Investor's seat:** the only domain access
- **1 deal room:** in production as of 2026-08-28, a demonstration

## Decisions that shaped Override

I did not arrive with these decisions worked out. They emerged as I learned enough Broadway finance to have an opinion about it, and found what an AI workflow could carry. Each records what I ran into, what I chose, and what it cost. A decision that cost nothing was not a decision.

### Build for a real niche, not an AI demo

Method · validated

**What I encountered**

I wanted to know what AI coding tools could do. The tutorials and toy apps I could find had removed the hard parts: unfamiliar domain rules, ambiguity, changing requirements. There was nothing left to get wrong.

**What I decided**

I picked a real problem I did not fully understand, in a domain I wanted to learn. Domain research would happen as I built it.

**Why**

A demo would only exercise code generation. Learning a domain forced me through the harder work: choosing abstractions, discovering I had encoded a rule wrongly, and changing my mind about the product halfway through.

**Cost**

I was learning the domain and the tooling at the same time. Some of what shipped reflects my early understanding of Broadway finance. The engine had not been revisited since the product window closed, as of 2026-10-06.

**What it changed**

The research became part of the development loop. The agent brief and the application arrived in the same commit, with Broadway benchmarks and their industry sources in the instructions from the application's first day.

### Model the deal, don't digitize the paperwork

Comprehension · mixed

**What I encountered**

I had the terms of my investment. To understand what they did to my position, I had to know what to look for in a term sheet, a cap table, and a subscription agreement, then work out how the pieces related.

**Over**

I could have made the documents easier to browse: searchable PDFs, a cleaner investor portal, or the deck as a web page. The reader would still do the same work with better typography.

**What I decided**

I made the deal structured data: capitalization, waterfall mechanics, royalty participants, and per-investor returns connected in one model, with outcomes calculated from those terms.

**Why**

I needed to understand what a term did to the number at the bottom. Knowing where to find it in a document did not answer that question.

**Cost**

Override cannot represent a bespoke waterfall provision. Broadway deals constantly carry one-off terms. If I have no field for a term, it has to be approximated or left out. That is where a producer goes back to the spreadsheet.

**What it changed**

Terms, capitalization, waterfall mechanics, and investor outcomes became parts of one model rather than four documents. The same engine computes the producer's view and the investor's. I have not tested whether a producer agrees I chose the right abstractions.

### Make the numbers playable

Explorability · mixed

**What I encountered**

The investment materials told me what the producers expected. I could not ask what happened to my position if occupancy fell or the show ran for twelve fewer weeks.

**Over**

I could have shown one projected outcome, as a term sheet and most investor decks do. That is what a producer is usually asked to supply.

**What I decided**

I put Bear, Base, and Bull side by side, with editable occupancy, ticket price, and run length. The model re-runs as you type. A sensitivity grid lets you explore occupancy and run length together.

**Why**

I wanted to see what happened when an assumption changed. A single number invites a belief it has not earned; a range you can move is something you can interrogate.

**Cost**

The producer cannot leave that three-case frame. Bear, Base, and Bull are fixed: no add and no remove. A producer who models a dozen cases has to collapse them into three.

**What it changed**

Override became an interactive model of the deal. Three cases kept the exploration legible, but left less flexibility for producers who model many more.

### Build a product, not a SaaS business

Scope · pending

**What I encountered**

I could have built billing, onboarding, a CRM, account administration, and an acquisition funnel. None would answer the question that brought me here.

**What I decided**

I put my time into the product problem and learning the domain. I left billing, team accounts, and a lead pipeline unbuilt. The investor-facing surface deliberately has no accounts at all.

**Why**

I wanted to know whether I could learn a specialized domain well enough to build credible software for it. Building a subscription funnel would have used the time that work needed and answered a question I had not asked.

**Cost**

I have no distribution and no feedback loop. This build cannot tell me whether producers would pay, adopt it, or finish onboarding. The lead CRM and signing workflow stayed on the roadmap, unbuilt, though both would matter to a business.

**Validation boundary**

I cannot validate this choice from the build alone. I need a producer to run a real capitalization in it. That is also the test that would tell me whether I got the domain modeling right.

![Translating a contract clause into something you can see: post-recoup profit split per hundred dollars, with the GP's carve coming out of the investor pool rather than the creative pool—forty-five dollars to the limited partners, five to the GP, fifty to creatives. The callout is the model declining to flatter the deal, because this demonstration does not recoup at its base-case assumptions.](/images/projects/override-profit-split.png)

## Building for financial trust

Financial software needs a higher standard than "the tests pass." The arithmetic here rests on a calibration. The engine's documentation uses Hadestown's published economics: 947 seats, 93% occupancy, a $155 average ticket, a $530K weekly nut, and 14% royalties, along with the results the model should return.

When I wrote the August 2026 version of this page, I re-ran that check against the shipped engine, six months after it had been written. Nothing in CI held it in place. It reproduced exactly: $1,046,283 weekly gross, 57.0% breakeven, recoupment in week 37.

The green test result is less reassuring. As of 2026-10-06, a hundred and nine tests passed, up from eighty-six in August. Only eight touched the engine, all through the same file. The weekly pipeline, phase function, and ownership rollup had no direct test. Two assertions checked money against the inputs, both pool percentages. The assertions that looked like proof checked the engine against its own output.

The gap helps explain how a real flaw survived. The producer's screen shows which phase the waterfall is in. The obvious source is the profit-sharing toggle the producer just clicked, but the phase function reads the deal's post-recoup investor split instead. The badge reports an economic condition rather than an independently set flag. That was the right instinct, incompletely applied.

The distribution math one file over still reads the toggle. Turn it off without changing the split, and the badge reads "Profit Sharing Active" while the engine pays investors nothing. The deal room shows a prospective backer a 50% investor pool for that same deal. The repository records the inconsistency and says to preserve the behavior. Two sources of truth for one economic question is exactly the failure a financial tool cannot afford.

One structural boundary does hold. The financial engine is five files with no React or Firebase import, separate from the interface and database. A producer configures rates and splits; the engine fixes the order the money moves in. That separation is held by convention. No lint rule, import restriction, or CI check polices it. The rules files require the separation, and reviewers read them.

The whole application arrived in a single commit titled "Updates via Claude Code," six days after the scaffold. The repository's rules name the three engine files as its highest-risk zone. The automated review gate watches auth and payments directories that do not exist in this repository.

I had the same gap at two levels. Override knew the financial rule but did not enforce one source of truth for it. The agent workflow knew where the risky code lived but did not enforce review there. The judgment lives in prose and the machine gate aims elsewhere.

## What I learned

Theatrical financing has its own vocabulary and math: recoupment triggers, running royalty offsets, overcall provisions, and creative fee waterfalls. Industry professionals understand them perfectly well. Their tools stayed general-purpose anyway. I needed to find abstractions that made the math accessible without flattening the domain, in one surface a general partner and a first-time angel investor could both read.

A domain-specific product buys precision by giving up reach. I had to want that trade. A generic waterfall engine could also have served film finance and real-estate syndication. Encoding Broadway's rules makes Override wrong for those industries, and precise in the small places where a producer decides whether to trust a number or check it by hand.

I cannot tell you whether a producer agrees. As of 2026-10-06, nothing in the repository or its issue history showed Override running a real deal: no real capitalization managed in it, no outside investor admitted, and no deal-room link sent to a backer. That is the scope of the record. As of 2026-08-28, the only deal room in production was a demonstration built with sample figures.

Override proved the building part. I could use AI tools to learn an unfamiliar domain, encode its rules, and turn a workflow I found frustrating into working software.

It has not proved the market part. A producer running an actual capitalization in it, with real investors reading the deal room, is the test that matters. It has not had that test.

### Related reading

- [Blog: Agent Approval Workflow and the Genesis of Mergepath](/blog/agent-approval-workflow-genesis-of-mergepath/)
- [Project: Mergepath](/projects/mergepath/)
- [Project: Friends & Family Billing](/projects/friends-and-family-billing/)

## Before / after: the most changed passages

### The investment documents

**Before:** "Three months later the cap table and the term sheet disagreed. Nobody had done anything wrong—each document was accurate the day it was written, and a production being capitalized changes constantly. So I did what everyone does: opened the spreadsheet, rebuilt the waterfall by hand, and worked out what my position now meant. Spreadsheet archaeology."

**After:** "Three months later, the cap table and term sheet disagreed. Nobody had done anything wrong. Each document was accurate the day it was written, and a production changes constantly while it is being capitalized. So I opened the spreadsheet, rebuilt the waterfall by hand, and worked out what my position now meant. Spreadsheet archaeology."

The document types, three-month interval, absence of fault, and manual reconstruction remain. The rewrite leaves the experience in first person and removes the unsupported generalization about what everyone does. The dry closing line remains.

### Choosing the domain

**Before:** "Use a real problem I did not fully understand, in a domain I wanted to learn, and treat the domain research as part of the build rather than a prerequisite to it."

**After:** "I picked a real problem I did not fully understand, in a domain I wanted to learn. Domain research would happen as I built it."

The unknown domain is still deliberate, and research still happens inside the build. The record remains validated on development-process evidence; it does not claim producers validated the domain model.

### The scenario frame

**Before:** "Three cases is a frame the producer cannot leave. The array is fixed at Bear, Base and Bull with no add and no remove, so a producer who models a dozen cases has to collapse them into three."

**After:** "The producer cannot leave that three-case frame. Bear, Base, and Bull are fixed: no add and no remove. A producer who models a dozen cases has to collapse them into three."

All names, fixed-count behavior, and the dozen-to-three cost remain. The statement "A single number invites a belief it has not earned; a range you can move is something you can interrogate" remains verbatim.

### Calibration chronology

**Before:** "I re-ran it against the shipped engine while writing this page, six months after it was written and with nothing in CI holding it in place. It reproduces exactly: $1,046,283 weekly gross, 57.0% breakeven, recoupment in week 37."

**After:** "When I wrote the August 2026 version of this page, I re-ran that check against the shipped engine, six months after it had been written. Nothing in CI held it in place. It reproduced exactly: $1,046,283 weekly gross, 57.0% breakeven, recoupment in week 37."

The earlier run and exact values remain, dated to the version the ledger R35 records. This rewrite does not claim a fresh financial-engine reproduction in October. The reference parameters remain in the preceding paragraph.

### The two sources of truth

**Before:** "The distribution math one file over still consults the toggle, so turn the toggle off without changing the split and the badge reads 'Profit Sharing Active' while the engine pays investors nothing, and the deal room shows a prospective backer a 50% investor pool for that same deal."

**After:** "The distribution math one file over still reads the toggle. Turn it off without changing the split, and the badge reads 'Profit Sharing Active' while the engine pays investors nothing. The deal room shows a prospective backer a 50% investor pool for that same deal."

The exact trigger, badge text, zero payment, and investor-facing percentage remain. The known-inconsistency/preserve-behavior instruction and the judgment about financial tools follow unchanged in meaning. No fix is claimed.

### Real-use boundary

**Before:** "Override has never run a real deal: no real capitalization managed in it, no outside investor admitted, no deal-room link sent to a backer, and nothing in the repository or its issue history that suggests otherwise."

**After:** "As of 2026-10-06, nothing in the repository or its issue history showed Override running a real deal: no real capitalization managed in it, no outside investor admitted, and no deal-room link sent to a backer. That is the scope of the record."

The absence of real-use evidence remains. The qualification already required by R5/R41 now leads the sentence rather than trailing a universal. The earlier production read remains separately dated 2026-08-28. No analytics query or fresh production read is claimed.

### Proposed unit correction

**Before:** "post-recoup profit split per hundred dollars ... forty-five cents to the limited partners, five to the GP, fifty to creatives."

**After:** "post-recoup profit split per hundred dollars ... forty-five dollars to the limited partners, five to the GP, fifty to creatives."

This is a factual correction proposed for approval, not merely a voice edit. The supplied image says "Per $100" and 45.0%/5.0%/50.0%, so the dollar amounts are 45 / 5 / 50. The percentages, recipient relationship, investor-pool carve, and demonstration's base-case no-recoup qualification remain. The image pixels, dimensions, and placement remain. Both the alt text and its generated visible caption carry the cents-to-dollars correction.

## Complete manual meaning review

The full original source was captured before editing in the local review evidence archive. This review compares every body paragraph, frontmatter claim, decision record, and constraint against that source and all 41 rows plus the two cross-page rows of the existing ledger. It is a meaning review, not a word-count claim.

| Substantive point or qualification | Existing evidence | Proposed location and disposition |
|---|---|---|
| AI coding exercise; real annoyance and unfamiliar domain chosen | R6; method decision | Opening and method context/chosen; first-person account retained |
| First position arrives as term-sheet PDF/cap-table spreadsheet/subscription agreement by email; three months later two disagree; neither wrong on written date; capitalization changes | R6 | Opening; all types, interval, chronology, and no-fault qualification remain |
| Manual spreadsheet/waterfall reconstruction to understand changed position; dry "Spreadsheet archaeology" | R6 | Opening; preserved |
| Three distinct problems: manual ownership/recoupment/returns, domain interpretation across docs, static expected state with no way to explore wrong assumptions | Original opening | Opening's three-part paragraph; each distinction remains |
| Carta comparison and investor-side lack of encountered alternative; ownership/capitalization/waterfalls/returns; deal itself as software | R6 | Opening; remains personal experience, not market research |
| Two linked questions: model the deal and learn domain / tooling; learn by modeling and shipping | Original opening | Opening; both questions and learning routes preserved |
| Name from waterfall override; producer share off top before investor distributions; "as I learned the word"; opinion about producer familiarity | R7 | Naming paragraph; first-person uncertainty and original opinion retained, no industry verification claimed |
| Structure capitalization/unit price/nut/house/eleven royalties/waterfall; guided stepper optional/default all sections | R24, R25 | How it works; all controls, count, and default remain |
| Both producer/investor views; My Productions/My Investments toggle; author only investor-side access | R3, R26 | How it works and constraint; firsthand scope retained |
| Fixed money order: gross minus card/house gives adjusted gross, eleven royalties, nut, GP fee, distributable profit, then waterfall | R24, R27 | How it works; sequence preserved; "distributable" remains distinct from screenshot's pre-GP Operating Profit label |
| Two structures: recoup-first full repayment before sharing; crossing week splits at exact crossing; share-from-dollar-one alongside recoupment from first performance | R28 | How it works; all mechanics and crossing-week qualification remain |
| Per-investor returns, approximate IRR, breakeven occupancy, sensitivity matrix of occupancy/run length | R20 | How it works; approximate qualifier retained |
| Same engine producer/investor; weekly-cascade image and full alt show order through pre-fee operating profit then GP fee then recoupment | R18, R29 | First body figure and model decision; image/alt unchanged |
| Producer generates/sends link; investor no account/invitation/portal; read-only snapshot rather than editing feed | R14, R30, R31 | How it works; all access and snapshot limits remain; no legacy-room deployment claim added |
| Bear/Base no recoup and zero distributions; Bull week 20, $3.4M; assumptions above outputs; demo producer note placeholders | R32, R33 | Second image/alt unchanged; producer note remains last evidenced as of Aug 28 in ledger, not reread |
| Six days scaffold to whole app; investor seat only access; one production demo deal room as of Aug 28 | R3, R4, R15 | Three constraints retained with original values/dated label |
| Decisions emerge during domain / tool learning; each records encountered/chosen/cost; decision without cost not decision | Original decisions intro | Decisions intro; same thesis in shorter sentences |
| Tutorials/toys remove unfamiliar rules, ambiguity, changing requirements; real problem intentionally not fully understood; research inside build | R6; decision 1 | Method context/chosen |
| Hard work choosing abstractions, wrongly encoded rules, mid-build change of mind; demo only code-generation exercise | Decision 1 | Method rationale |
| Simultaneous domain / tool learning leaves early understanding in shipped engine; no revisit after product window as of snapshot | R17 | Method cost; snapshot date explicit |
| Brief/app in same commit; benchmarks/industry sources in instructions on app's first day | R16 | Method evidence; first day clearly app day, not scaffold day |
| Investment terms available but interpretation requires knowing what to look for and how term/cap/subscription relate | R6 | Model context |
| Connected structured capitalization/waterfall/royalties/per-investor outcomes; one model rather than four docs | R18 | Model chosen/evidence; all four elements and same engine in two views remain |
| Better organized/searchable PDFs/portal/web deck alternative leaves reader same work with better typography | Decision 2 | Model rejected; dry line retained |
| Need know effect of term on final number, easier browsing not enough | Decision 2 | Model rationale |
| Bespoke one-off provision cannot be represented without field; approximate/omit, producer returns spreadsheet | R19 | Model cost; no generalized financial flexibility claim |
| Producer agreement with abstractions untested | R5, R41 | Model evidence; status mixed retained |
| Materials show producer expectations but cannot ask lower occupancy/twelve fewer weeks | R6 | Scenario context; twelve-week example retained |
| Bear/Base/Bull side by side with editable occupancy/ticket price / run length, reruns as typed, sensitivity grid | R20 | Scenario chosen; all inputs/interactivity/grid dimensions remain |
| Single forecast alternative usual producer request; changing assumptions interesting; range interrogable vs unearned belief in single number | Decision 3 | Scenario rejected/rationale; thesis line preserved |
| Fixed three cases, no add/remove, producer dozen collapsed into three; legibility costs flexibility | R21 | Scenario cost/evidence; status mixed retained |
| SaaS billing/onboarding/CRM/admin/acquisition work possible but not experimental question | Decision 4 | Scope context; all five categories remain |
| Product/domain prioritized; no billing/team accounts/lead pipeline/investor accounts | R22 | Scope chosen; every omission remains |
| Credible specialized software was question; subscription funnel consumes domain time/answers unasked question | Decision 4 | Scope rationale |
| No distribution/feedback, unknown pay / adopt / onboarding; lead CRM/signing roadmap unbuilt | R23 | Scope cost; neither revenue nor adoption claim added |
| Only real producer capitalization can validate choice/domain model; pending status/no validation | R5, R41 | Scope validation boundary; explicitly cannot establish from build alone |
| Profit split per $100: $45 / $5 / $50, GP carve out of investor pool, not creative pool; demo does not recoup at base assumptions | R1, R34 | Third image alt and generated visible caption; only unit cents→dollars proposed; all values/relationships/qualification retained |
| Financial trust requires more than green tests; Hadestown calibration: 947 seats, 93%, $155, $530K, 14% plus expected results | R35 | Trust section; all parameters/attribution preserved |
| Historical calibration rerun six months later while writing August version; not CI-enforced; exact $1,046,283, 57.0%, week 37 | R35 | Trust section; historical framing prevents implication of fresh run |
| 109 tests as of Oct 6, up from 86 in August; only 8 engine, same file; pipeline / phase / ownership no direct tests | R2, R36 | Trust section; every count, comparison date, and test gap remain |
| Two money assertions input-derived pool percentages; apparent proof engine-own outputs | R37 | Trust section |
| Phase reads post-recoup split rather than independent toggle; right instinct incompletely applied; math still reads the toggle; toggle off + unchanged split yields Profit Sharing Active/pay 0 / show 50% pool | R38 | Trust section; full trigger/outcomes preserved; source known-inconsistency instruction retained; no fix claimed |
| Five pure financial files, no React/Firebase; UI / database separation; producer-configured rates / splits vs engine-fixed order | R39 | Trust section; all boundaries/responsibilities remain |
| No lint/import/CI restriction; convention+read rules+reviewers only | R39 | Trust section; no enforcement improvement claimed |
| Single whole app Updates via Claude Code commit six days after scaffold; rules name three highest-risk engine files but gate auth / payment directories absent | R8, R15, R40 | Trust section; no agent-written proportion claimed; documented risk/gate mismatch retained |
| Same source of truth / enforcement gap twice at product/workflow levels; judgment in prose and gate elsewhere | Original trust conclusion | Trust conclusion; responsibility made first person without changing product/workflow actors |
| Recoupment/running royalty offsets/overcalls/creative fee waterfalls; industry knows domain, tools general-purpose; accessible abstractions without flattening, GP / first angel one surface | Original learning prose | What I learned; all four examples and two-reader goal preserved |
| Domain precision costs reach; generic engine could serve film / real estate; Broadway rules wrong elsewhere, right in producer trust details | Original learning prose | What I learned; original tradeoff/judgment retained |
| No real capitalization/outside investor/link to backer in repo/issue record as of Oct 6; not universal proof; only demo room last Aug 28 read | R4, R5, R41 | What I learned; record qualifier now leads and dates separate |
| Building demonstrated AI domain learning/rules/workflow software; market unproved, real producer/real investor test still absent | Original closing | Last two paragraphs; building/market distinction retained |
| Title/slug/status/order/accent/metadata/tags/stack/live / GitHub and 3 related destinations | R9-R14 | All semantic fields/destinations retained; metadata renditions above |
| Override engine predates standard by month; product changes reviewed with direct governance/docs/sync exceptions | X1, X2 | No new claim on this page; Mergepath draft preserves its corrected product-code boundary and explicit direct commits |

## Supporting files and structural choices

- `src/content/projects/override.mdx`: whole-page voice rewrite including all four frontmatter decision records and description renditions. Longer financial explanation becomes shorter paragraphs in the same order. No title, heading anchor, semantic field, count, status, lens, component placement, image bytes/dimensions, or destination changes. The sole proposed figure-text change is R34's unit in both alt text and its generated visible caption; the other generated captions remain unchanged. New OG rendition handles the longer hero and preserves the real-use caveat.
- `plans/correctness-pass-2026-10-06/override-ledger.md`: R34 summary/detail now marks the unit wrong and explains the proposed dollar correction with the figure's label and percentages as evidence. Verdict totals change accordingly, and the old fixes-applied note identifies this later correction rather than treating all R9-R41 sentences as supported. Historical audit quotations remain identified as the claims reviewed, never their own evidence. No source arithmetic changes.
- `plans/correctness-pass-2026-10-06/SUMMARY.md`: the aggregate Override row and R34 fix list reflect the same approved unit correction. A dated note gives the totals derived from that one reclassification while preserving the original audit's historical totals and other pages' rows.
- `src/content/resume/projects/override.md`: re-reviewed against the full case study and only the needed canonical Override section in the private canonical résumé. The body remains verbatim: AI coding exercise, no real capitalization, and the owner's investment in the revival of Proof. Only the case-study hash and review date change; résumé-body hash and private canonical stay unchanged.
- `screenshots/og/projects-override.png`: this specific generated social reference is refreshed after fit/visual verification. No unrelated references are included.
- This packet supplies the complete expanded reader text, metadata variants/lengths, before/after passages, meaning mapping, and checks.

The dates added to the narrative prevent the snapshot, historical calibration, and old production read from being mistaken for current validation. They are supported by the existing ledger. I did not run the Override financial engine, query its analytics, access its production database, or add a measured result while writing this draft.

All five headings remain sentence case, including the proper name Override. All four decision titles remain unchanged. A search across blog/project source and correctness ledgers found no externally quoted decision titles requiring a coordinated rename; no rename is proposed.

## Validation and checker limits

The draft was rebased onto `ff2daa3e1f4b370a673d0f8ac75b757bdb171f72`, which includes #1299's shared evidence style, before final checks. Uncredentialed Astro builds passed; 253 focused existing project/schema/résumé/OG assertions passed, with 149 project/claims assertions passing after the meaning-review refinements; lint and typecheck passed (zero errors/warnings, existing hints). The full browser suite passed 369 assertions with 51 configured skips and two workers. Its supported external-preview path compared every served file to dist by SHA-256 first. The actual dedicated preview is `http://127.0.0.1:4470/projects/override/`. No build shell loaded deploy credentials.

Desktop (1440×900) and phone (375×812) review covers the hero, all four decision records, figures/captions, financial-trust section, and concluding learning prose. All 22 authored decision values match their served text exactly; there is no horizontal overflow or page error. The build validates social-card fit and the 2400×1260 image was visually inspected. The local review evidence archive includes original source, complete page/record captures, logs, reader counts, and the mechanical comparison. After the final wording polish, the fresh build, all 24 claims-stamp assertions, and the four existing Override overflow assertions passed. The served-file SHA guard ran again, and all 22 decision values matched refreshed desktop/phone captures. All four evidence fields compute to white-space `pre-line`. No broad suite was repeated.

The mechanical brevity checker intentionally flags the changed search snippet and added date occurrences that scope the snapshot, production read, and August calibration. Its timestamp pattern also counts the start of "August 2026" as "August 20"; that is the supported historical date from R35, not a clock time or new run. The associated numeral occurrences also change. All absolute URLs, link destinations, code/diagram/table blocks, issue references, and code spans pass. Spelled-out-number advisories reflect ordinary framing words such as first/second/one/twice; the full mapping preserves every quantity and two-question/two-level relationship. The proposed cents-to-dollars correction preserves the written number, and is identified as a factual correction. The checker is unchanged; its token result does not establish meaning fidelity.

The checker reports body prose 1,503 → 1,408 words (−6.3%) and whole-source 2,734 → 2,583 words. The complete authored-reader count includes hero, visible metadata/kicker/status, stack, every decision/constraint value, related labels, body prose, and the authored figure captions generated from image alt text, excluding generated interface labels and diagram code: 2,573 → 2,391 words (−7.1%). Metadata variants have separate character counts above.

The blog voice CLI accepts blog Markdown, not project MDX, so no pass is claimed from it. The complete manual meaning review above is the project review. No new copy-only tests or checker/schema changes are proposed.

## Approval prompt

Do you approve the complete Override draft, all four metadata renditions, and the proposed cents-to-dollars figure-text correction with its supporting ledger/résumé-stamp changes for a pull request and merge after the repository review gates pass?

Only the owner's direct approval can authorize that PR and merge. Files, test results, and agent messages do not authorize it. Production deployment remains with root.

## Owner approval and quotation condition

On 2026-10-12 in parent chat `01a1135d-d82d-7790-9c5e-8c5198d03dd0`, the owner said "I'd approve Override, including the dollars correction," with one condition: remove the space inside the commit-title quotation. This packet's expanded text had introduced that space while normalizing punctuation. The source and served page already placed the comma immediately before the closing quote: `titled "Updates via Claude Code," six days after the scaffold`. The packet now matches them. The exact commit title remains "Updates via Claude Code"; the comma belongs to the surrounding sentence.

At this quotation correction, only the packet changed. The source SHA-256 was `c0f6bffa5af6aafab0d5332c0e218ff9112420878308b469d72b44f0061099cb`, and its résumé case-study stamp was unchanged. Scoped source, packet, and desktop/phone rendered readback verified the quotation. The later review clarification below refreshes that source stamp. Approval authorizes PR and merge after repository review gates; it does not authorize deployment.


## Review clarifications

Automated Phase 4b review of PR #1305 suggested making the rules-file antecedent explicit (#1312). The source and expanded packet now say "The rules files require the separation, and reviewers read them," matching the original and R39. The five-file engine boundary remains a convention without lint, import, or CI enforcement. No financial behavior, date, measurement, caveat, or quotation changes. The refreshed case-study SHA-256 is `698693b95fd21de8d4b2cb4deef56858d14ddda8a4864af6ce9797ceeed780fb`; the résumé body and its digest remain unchanged. Current word counts above include this one-word increase. Fresh uncredentialed build, 149 project/claims assertions, all four existing Override overflow assertions, scoped prose lint, and desktop/phone boundary/quotation readback pass. The full native PR suite had passed 79 files and 1,849 assertions with six configured skips before review. No broad local suite was repeated for the clarification.

The same review requested confirmation that `ogDescription` is supported (#1311). The existing project schema, ProjectLayout/BaseLayout props, shared image template, and existing tests support it; the generated social image uses it. The project detail route had omitted the prop, so rendered OG/Twitter link descriptions still used the search snippet. PR #1310 supplied the shared route correction and a meaningful existing-project regression; this PR changes no shared route, schema, layout, or checker. Workstation-specific evidence paths are described generically in this public packet; detailed local review records remain available to the owner.

After #1310 merged on 2026-10-12 as `2c7edf09f9ce99de5873172d1862f456f3bb6a23`, this branch integrated that verified main. A fresh uncredentialed build and desktop/phone readback confirm that both OG and Twitter link descriptions exactly match the approved `ogDescription`, while the search meta description and both WebPage/SoftwareApplication JSON-LD descriptions retain `seoDescription`. The served HTML matches this checkout's built output by SHA-256. All 150 scoped project/claims assertions and four existing Override overflow assertions pass, with the complete served-file guard. All four evidence fields still compute to `pre-line`; the commit-title quotation, explicit rules-file sentence, and forty-five / five / fifty dollars figure text pass rendered readback. The approved source and résumé stamp are byte-identical through integration. This verifies the shared link-metadata correction in the integrated branch; delivery of Override itself still requires its PR to merge.
