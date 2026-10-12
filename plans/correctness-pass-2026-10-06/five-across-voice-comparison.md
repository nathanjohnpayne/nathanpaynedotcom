# Five Across—voice approval packet

Draft date: 2026-10-11. Status: owner approved opening a PR after the precision fixes requested on 2026-10-11. Those fixes are applied below. Merge and deployment remain separate decisions.

Factual baseline: `ccdc529ec31a811c9d38b7ad1896ea4488dd65cc`, current `origin/main` when this pass began. [Published page](https://nathanpayne.com/projects/five-across/). Source: `src/content/projects/five-across.mdx`. Historical facts ledger: `plans/correctness-pass-2026-10-06/five-across-ledger.md`.

## Approval summary

The complete page is rewritten, including all five decision records, all three learning records, and the hero, card and search renditions. The first-person account names my decisions and keeps the agents' role in build, test and review. It retains the six sections and the positions of the constraint strip, decision ledger, standings image and learning ledger. The long results, operations and platform paragraphs are split into smaller paragraphs; no component or section is moved.

The reader-facing text count is 3,240 → 2,814 words, a 13.1% cut. This counts the authored title, hero, format/focus/stack, constraints, decision and learning text, headings, caption and MDX prose, excluding MDX imports/component markup, shared template labels and the separate search/card renditions. Counts use whitespace-separated words in those authored fields and the body. It is not the brevity script's body-only figure: that script excludes the frontmatter, which holds much of this page. All distinct substantive points remain mapped below.

Two qualification repairs are explicit. The two early main cards' bingos were claimed on the **last full day**, matching R11's July 23 ship-time timestamps rather than implying disembarkation day. R54's supporting ledger row and detail now remove the invalid freeze-move control and the blanket claim that no live-ops records exist. R13 says the freeze was never moved; R3 records a rules-deploy incident. Neither repair changes an event count or adds a new production read.

The canonical résumé's Five Across entry was read against the draft and matches the site entry verbatim. Its claims still hold, including the wording that offline marking was *built to* queue, rather than demonstrated to increase participation. Only its `claimsReviewed.caseStudy` hash and review date change. The résumé body, its hash, and the private canonical file are unchanged.

## Metadata proposed for approval

These remain frontmatter renditions. The templates are unchanged. The hero also supplies the project share-card line through the existing fallback; 169 characters is below its 180-character cap. The 199-character card supplies both `/projects/` and the homepage Projects panel and is within the existing 120–200 band. The search snippet is separate at 154 characters.

### Hero / detail-page description / social-card fallback

**Before (161 characters):** A live multiplayer bingo platform that turns a group trip into a shared game—born on a nine-night Mediterranean cruise, generalizing into a multi-event platform.

**After (169 characters):** I built a live bingo game for a nine-night Mediterranean cruise. It ran at sea, then became the engine for a second event. Getting people to play was a separate problem.

### Project index and homepage card

**Before (170 characters):** A multiplayer bingo game built in eight days for a nine-night cruise, then operated live at sea—where real players exposed what the architecture could and couldn't prove.

**After (199 characters):** I built multiplayer bingo in eight days, then ran it through the ten-day cruise. The standings held, but the social mechanics barely caught on. A second event showed reusing the engine wasn't enough.

### Search snippet

**Before (155 characters):** A live multiplayer bingo platform for group trips—daily themed cards, offline-first marking, live proofs, and a choreographed finale, built and run at sea.

**After (154 characters):** Eight days to build multiplayer bingo for a cruise, then ten days running it aboard. What I chose, what players used, and what the records couldn't prove.

## Complete proposed page

The reader view below expands the existing components into their complete copy. Its image URL is expanded to the unchanged live asset for this document; the MDX source keeps its original asset path.

# Five Across

I built a live bingo game for a nine-night Mediterranean cruise. It ran at sea, then became the engine for a second event. Getting people to play was a separate problem.

## The problem

Five Across started as Gay Cruise Bingo, a phone-first game for a nine-night Mediterranean cruise from Trieste to Barcelona. I had eight days to build it.

A printed card could carry the inside jokes and dares. I wanted shared marks, proofs and standings, so the game could keep running through the trip instead of being a novelty for a day.

Each player got a frozen, randomized 5×5 card from a community-editable prompt pool. They could tap a square when something happened and see who else had already marked it. A fresh themed card unlocked at 8:00 a.m. local time each morning after the first, matched to the day's port and party. Tutorial cards bookended the trip. The live feed carried proofs, milestones, doubts ("pics or it didn't happen"), and hearts.

- 8 days: to launch
- Ship Wi-Fi: connectivity
- 10 days: live operation
- 16 players: friend group

## The decisions

The deadline made scope choices necessary. Each had a reasonable alternative: server checks for marks, an online-only launch, score incentives for reactions, an unchangeable deal, an automated platform cutover. I chose differently for this launch. One of those choices needed revising while the game was live at sea.

I also sized moderation for a private adult friend group. Before departure, the app had server-authoritative report auto-hide, an admin roster and a Cloud Vision gate deliberately off by default. The repository has no record of those controls being used during the sailing. That silence doesn't tell me whether they were used.

### Let friends mark their own boards

Scope · validated

**What I encountered**

I had eight days to build a multiplayer game for an adult friend group. A server-authoritative game would check every claim before it counted, so players couldn't cheat.

**Over**

Cloud Functions checking every mark. That's the standard multiplayer approach, and the safer choice for an audience of strangers.

**What I decided**

I chose honor-system marking, with no server validation. Players write their own boards, and the client sorts the leaderboard. Each event can require a pledge, proof-to-mark, or admin confirmation. The default is a one-tap Cross My Heart.

**Why**

Cheating wasn't in the threat model for this group. I trusted the friends and the feed to challenge a claim if they needed to. Server enforcement would have added work for a problem I wasn't designing this launch around. Leaving it out also let Phase 0 deploy without Cloud Functions at all.

**Cost**

The standings are claims, not independently verified results. A player writes their own board, so the record can't distinguish a real mark from an invented one. Any player could demand proof.

**What it changed**

The frozen production Firestore holds 845 squares. Analytics recorded seven proof-demand events over ten days, all from the same player. Those are events, not seven distinct challenged squares; they can't be subtracted from the square count. The rest stood on the pledge.

### Make marking work without a connection

Reach · mixed

**What I encountered**

Ship Wi-Fi was flaky and expensive, with dead zones at sea. Requiring a connection every time someone tapped a square would make the game unavailable when the group was together without coverage.

**Over**

A plain online web app. It would have been the fastest thing to build in eight days and a reasonable choice for a launch on land.

**What I decided**

I chose an installable PWA with an offline-first Firestore cache. Marks queue on the device and sync when the connection returns. A cold boot doesn't wait for the network.

**Why**

Coverage could disappear without warning. I wanted a player to be able to mark a square wherever they were, without finding a signal first.

**Cost**

I took on the PWA cache and update path. It became one of the two operational problems during the sailing, alongside authentication; the commits skew toward both. The surviving database and analytics records don't let me reconcile the two.

**What it changed**

Over the scoring window, from embarkation to the freeze, Firestore holds 845 squares and analytics logged 783 marks: a gap of 62. The raw analytics total also includes a pre-embarkation day and 30 marks after the freeze on the ceremonial card. Neither belongs in the standings comparison. Offline queueing could explain the gap. Ordinary analytics loss could too. It doesn't establish that players marked without coverage and synced later.

I'd assumed the moments worth capturing would happen furthest from a signal. The marking data challenges immediate capture: 288 of 703 main-day marks, 41%, came after the next day's card unlocked, and 32% of all marks landed between 19:00 and 20:59 ship time. Players' debrief accounts describe recalling previous days together at dinner. Those timestamps still don't tell me whether they had a connection while marking.

A September 26 PostHog query found fifteen cruise-era exception events containing auth/network-request-failed, across five recorded sessions for one recorded user on July 18–19. Those sessions had no recorded marks. Requests failed. Their cause, and whether offline support helped people participate, remain unmeasured.

### Keep hearts out of the score

Incentives · mixed

**What I encountered**

The feed needed a reaction. Points for hearts, or hearts as a tie-break, would give players a reason to use it. My product principle put connection and shared memories ahead of score.

**Over**

Letting reactions affect rank. That's a reasonable engagement mechanic for a social game, but it gives each reaction a strategic use.

**What I decided**

I kept hearts out of stats, standings and win logic. They produce only the Most-Loved Photo award at the freeze. That award carries no points.

**Why**

A heart should be free to give because it buys nothing. Once recognition affects the standings, it's also a move in the game.

**Cost**

A heart that buys nothing is one nobody has to give. I'd removed the score incentive and left no other lever if the group didn't want to react on its own.

**What it changed**

Across ten days and sixteen players, one person gave all nineteen hearts. The principle held, but hearts failed as a social mechanic with this group. Their weak use didn't affect the standings because they never carried score.

### Deal each card once

Fairness · revised

**What I encountered**

I wanted luck to be equal across the standings. If a player could keep trading cards, they could shop for a better board.

**Over**

Mulligans or rerolls whenever a player disliked their card. That would be a forgiving choice for a casual game.

**What I decided**

I started with frozen cards from a seeded shuffle, with no rerolls.

**Why**

A fixed deal made the fairness rule clear: nobody could negotiate their board or the score it produced.

**Cost**

A player whose card didn't fit the trip was stuck with it, with no way to tell whether the problem was the card or the trip. Two days into main-pool play, no main card had produced a bingo. The two cards after the embark tutorial would finish the cruise with one bingo apiece, both claimed on the last full day. I had to revisit the rule while the event was running.

**What it changed**

I changed the rule from a final deal to a deal that becomes final when the player acts on it. A card with zero marks can be traded for a fresh one, three times per player. Once a player has marked it, they can't trade it.

That made the first deal negotiable for anyone who used the feature. The limit prevents shopping for a better board mid-play; it doesn't preserve the original rule intact. The repository calls it a reshuffle and explicitly avoids mulligan. It shipped on the itinerary's sole sea day, alongside easy embark-pool squares blended into main cards. Three of sixteen players used seven reshuffles, all during the sailing.

### Hold the cutover

Platform · pending

**What I encountered**

Five Across is becoming a platform: one codebase, a wildcard event router for the edge, and centralized authentication with a single-use handoff. The next step is unrelated groups sharing a backend. Tenant isolation for that hasn't shipped.

**Over**

Attach the routes now. The worker is deployable and tested, and the route config is written. As of 2026-10-06, cutover would mean uncommenting two blocks, one per zone.

**What I decided**

I held the cutover. Separate events run on separate Firebase projects until the isolation workstream lands. Attaching the routes remains a deliberate human step.

**Why**

The repository's specs distinguish path-scoped rules from tenant isolation. Uncommenting a route block looks like a deployment step, but it makes a decision about other people's data. I wasn't treating it as routine.

**Cost**

Each new event for an unrelated group needs a Firebase project provisioned by hand. The platform code is built and waiting. Until the isolation work lands, I pay that setup cost again for each event.

**Validation boundary**

This decision isn't validated yet. The router carries no production traffic. The auth handoff was provisioned by 2026-09-10 and was live in the client as of 2026-10-06, but no sign-in through it has been demonstrated: registered hosts still sign in directly. There is no behavioral evidence either way. The remaining steps are the tenant-isolation rules workstream and the deliberate act of attaching the routes.

## What happened

The production Firestore preserved the standings, frozen at 08:00 on disembarkation morning. The app's final share card survived too. Those records let me look back at ten days of live play.

Firestore's day buckets credit the embark tutorial with 27 bingos from seven players. None landed on embark day itself; the easy card kept paying out for days.

The player rows show ten people with an event-wide bingo, and PostHog independently counts ten. The scoring tests explicitly include embark bingos in the event total. Seven people with an embark bingo fits inside ten across the event.

My read is that the group adopted the scoreboard. Of 499 sessions across the ten days, 384, or 77%, contained no mark. Checking standings and reading the feed would explain those sessions, but the event log doesn't measure what people did instead.

The social mechanics had little use. One player gave all nineteen hearts. One player made all seven proof demands. Three of sixteen players used seven reshuffles. The possible ceiling of 48 is arithmetic, sixteen players times a cap of three; it isn't a recorded total.

Marking reached most of the group. Fourteen of sixteen players marked at least one square in the frozen Firestore. PostHog sees fewer marks and twelve markers, nine of whom marked on five or more days. The frozen event totals 845 squares and 61 bingos, with zero blackouts.

Zacaria Arab won with 16 bingos across 124 squares. Logan Murdock marked more squares, 129 to 124, and finished second. The leaderboard sorts bingos first. The rule, not volume, crowned the champion.

![The app's own final-standings share card for Day 10, Barcelona, with champion Zacaria Arab at 16 bingos and 124 squares, Turntilla's cruise-wide First to BINGO, and the ten daily honors spread from Trieste to Barcelona.](https://nathanpayne.com/images/projects/five-across-final-standings.png)

### Learning 1

**Expected**

I expected a fresh themed card each day to keep the group marking throughout the cruise. Marking was the core loop.

**Observed**

384 of 499 sessions, 77%, contained no mark. The two cards after the embark tutorial produced one bingo apiece, both claimed on the last full day. The event log records the absence of marks, not why people opened the app.

**Response**

On the morning the ship docked, I put the work into a final-standings share card, committed at 10:47. Three more features landed by evening, so it wasn't the day's last feature. It was the one built to keep the record rather than extend play.

### Learning 2

**Expected**

I expected the game's two independent records to agree.

**Observed**

Firestore holds 845 squares; analytics logged 783 marks over the same window. The bingo counts agree: Firestore's player rows show ten players with an event-wide bingo, seven of them with an embark bingo. PostHog independently counts ten. Embark bingos count toward the event total.

**Response**

I kept both square counts on the page. Each stays attributed to the system that recorded it, and I compare only matching windows. The records don't let me reconcile the disagreement.

### Learning 3

**Expected**

I treated content as a launch risk worth preparing for. Server-side report auto-hide, an admin roster and a flag-gated Vision check were finished six days before embarkation.

**Observed**

The operational problems were authentication and the PWA update path. The sailing's commits skew toward both. The repository keeps no record of the moderation stack being used during the sailing.

**Response**

After the cruise, the platform work went into authentication: a centralized auth origin with a single-use handoff, implemented, provisioned by 2026-09-10, and live in the client as of 2026-10-06.

## Running it at sea

Ninety-six changes landed on main between embarkation and disembarkation. That's the first-parent commit count between the Rome midnights that bound the sailing.

Those commits don't prove that every change reached a phone at sea. No deploy log survives in the repository. Firebase Hosting's release history records 41 deploys between the same midnights, and an incident note records one mid-sailing rules deploy and two days of stale-shell fallout.

The reshuffle gives me evidence that a feature drop reached players. It didn't exist until the sea day, and all seven uses were recorded during the sailing. That build reached people while the game was live. I don't have a breakdown of the ninety-six changes into fixes and features, so calling most of them firefighting would be a guess. The log does show a skew toward authentication and the PWA update path.

Agents expanded my build, test and review capacity against the eight-day deadline, then while I ran the game at sea. The specs pin the choreographed finale's exact instants. ADRs record the decisions that were hard to reverse: on-device share rendering, offline persistence, and a second Firebase project as the interim tenant boundary. Tests turn acceptance criteria into checks, including contrast computed from the shipped CSS across every theme and a launch checklist that pins embarkation day. The mid-cruise drops went through reviewed pull requests.

I owned the product calls: the trust model, the sea-day changes and the held cutover. Those were the part I couldn't delegate.

## From one event to a platform

The engine did get reused. Gay Cruise Bingo remains the original and default live edition, on its own domain and Firebase project. Vacay Bingo is the travel edition. Five Across is the platform under both.

The comment on Gay Cruise Bingo's brand record is explicit: "It is an ENDORSEMENT, not a rename: the wordmark, the cruise vocabulary, the adult posture, gaycruisebingo.com and the legacy Firebase project are all unchanged—GCB is simply one Edition of Five Across now, on the same engine as Vacay…"

A different host ran the first non-cruise event on the same engine: a Sonoma Coast weekend in August 2026. Unlock-copy fixes landed on opening day. The software was reused, but participation stalled. Four people marked 27 squares, nobody got a bingo, and the guests' last marks came on Saturday morning.

On the cruise, the software had prompts written for that sailing, a group ritual, and a host promoting and tuning the game live. Moving the engine to another occasion didn't reproduce that combination. Two events don't isolate which contribution mattered most.

The themes generalized too. Fifteen shipped for the cruise, thirteen party themes and two tutorials, out of twenty-two across the platform. Every one is held to WCAG AA contrast by tests that compute it from the CSS itself.

The cutover is still held. The wildcard event router has written routes that haven't been attached; attaching them is a human step. Centralized authentication with a single-use handoff was live in the client as of 2026-10-06, but no sign-in through it has been demonstrated because registered hosts still sign in directly. Until tenant isolation ships, separate events run on separate Firebase projects and unrelated groups don't share a backend.

## What a friend-group launch proves

Sixteen friends can't validate retention, acquisition, pricing or how strangers treat each other in a game. Those questions need an audience this launch didn't have.

What it could test, it tested harshly. The launch did test the social mechanics on the people I'd designed them for. Hearts and doubts failed with this group, and I have counts for that. The honor model let the standings run: 845 squares stood. It didn't make those marks independently verifiable.

Offline-first's effect remains unresolved. Over the scoring window, Firestore holds 62 more marks than analytics logged. Offline queueing and ordinary analytics loss could both explain the gap. PostHog captured fifteen exception events containing `auth/network-request-failed`. They establish request failures, not successful offline marking or an effect on participation.

I also got evidence that one person and a fleet of agents could operate a live product at sea. Ninety-six changes landed, and a feature drop reached phones during the sailing.

My friends were a hard audience to delight with the mechanics and a forgiving audience for everything else. I need to keep those two tests separate.

## Before / after: the most changed passages

### Opening

**Before**

Every group trip has a printed bingo card somewhere—a sheet of inside jokes and dares that is funny for a day and then forgotten. The card is static: no shared state, no way to see who else got a square, no proof, no record of who won. The game wants to be live, and paper cannot be.

**After**

Five Across started as Gay Cruise Bingo, a phone-first game for a nine-night Mediterranean cruise from Trieste to Barcelona. I had eight days to build it.

### Honor-system cost

**Before**

The standings cannot be verified, only trusted. Because each player writes their own board, nothing in the record could tell a real mark from an invented one, and the escape hatch that would have caught it was pulled seven times in ten days, all by one player. The number at the top of the leaderboard is a claim rather than a proof.

**After**

The standings are claims, not independently verified results. A player writes their own board, so the record can't distinguish a real mark from an invented one. Any player could demand proof.

### Offline evidence boundary

**Before**

Restricted to the same window—embarkation to the freeze, which is what the standings count—the two records disagree by 62 marks: 845 squares in the frozen Firestore against 783 the analytics logged. The raw totals are not comparable, because the analytics also carry a pre-embarkation day and 30 marks made after the freeze on the ceremonial card, neither of which the standings include. The gap is consistent with offline queueing, but ordinary analytics loss could produce it too. It does not establish that marks were made out of coverage and synced later. The original rationale assumed that the moments worth capturing happened furthest from a signal. The marking data challenges the picture of immediate capture: 288 of 703 main-day marks, 41%, came after the next day's card unlocked, and 32% of all marks landed between 19:00 and 20:59 ship time. Players' debrief accounts describe recalling previous days together at dinner. Neither those timestamps nor the analytics gap establishes whether they had connectivity while marking. A September 26 PostHog query found fifteen cruise-era exception events containing auth/network-request-failed, across five recorded sessions for one recorded user on July 18–19. Those sessions contained no recorded marks. Request failures occurred, but their cause and offline support's effect on participation remain unmeasured.

**After**

Over the scoring window, from embarkation to the freeze, Firestore holds 845 squares and analytics logged 783 marks: a gap of 62. The raw analytics total also includes a pre-embarkation day and 30 marks after the freeze on the ceremonial card. Neither belongs in the standings comparison. Offline queueing could explain the gap. Ordinary analytics loss could too. It doesn't establish that players marked without coverage and synced later.

I'd assumed the moments worth capturing would happen furthest from a signal. The marking data challenges immediate capture: 288 of 703 main-day marks, 41%, came after the next day's card unlocked, and 32% of all marks landed between 19:00 and 20:59 ship time. Players' debrief accounts describe recalling previous days together at dinner. Those timestamps still don't tell me whether they had a connection while marking.

A September 26 PostHog query found fifteen cruise-era exception events containing auth/network-request-failed, across five recorded sessions for one recorded user on July 18–19. Those sessions had no recorded marks. Requests failed. Their cause, and whether offline support helped people participate, remain unmeasured.

### Scoreboard adoption

**Before**

What the group adopted was the scoreboard. Of 499 sessions across the ten days, 384—77%—contained no mark at all. The event log does not say what those sessions did instead; the natural reading, opening the app to check the standings and read the feed, is a reading rather than a measurement. The social mechanics built for exactly this audience collapsed outright: every heart traced to one player, nineteen of them, and every proof demand to one player, seven times, across ten days. Three of sixteen players ever spent a reshuffle—seven uses against a ceiling of 48, which is the roster times the per-player cap of three rather than a number anything recorded. The core loop still held broad: fourteen of sixteen players marked at least one square by the frozen Firestore's count, and PostHog, which logs fewer marks than the database holds and sees twelve markers, has nine of those twelve marking on five or more days. The frozen event totals 845 squares and 61 bingos, with zero blackouts.

**After**

My read is that the group adopted the scoreboard. Of 499 sessions across the ten days, 384, or 77%, contained no mark. Checking standings and reading the feed would explain those sessions, but the event log doesn't measure what people did instead.

### Operating at sea

**Before**

Ninety-six changes landed on main between embarkation and disembarkation, counting first-parent commits between the Rome midnights that bound the sailing. The log proves they landed, not that each one reached a phone mid-ocean—no deploy log survives in the repository, though Firebase Hosting's release history records 41 deploys between those same midnights, and an incident note records one mid-sailing rules deploy and its two days of stale-shell fallout—but the reshuffle settles the question for the drops that matter: the feature did not exist until the sea day, and all seven uses sit inside the sailing, so that build demonstrably reached players while the game was live. Nothing partitions those ninety-six into fixes and features, so calling most of them firefighting would be a guess; what the log does show is a skew toward auth and the PWA update path.

**After**

Ninety-six changes landed on main between embarkation and disembarkation. That's the first-parent commit count between the Rome midnights that bound the sailing.

Those commits don't prove that every change reached a phone at sea. No deploy log survives in the repository. Firebase Hosting's release history records 41 deploys between the same midnights, and an incident note records one mid-sailing rules deploy and two days of stale-shell fallout.

The reshuffle gives me evidence that a feature drop reached players. It didn't exist until the sea day, and all seven uses were recorded during the sailing. That build reached people while the game was live. I don't have a breakdown of the ninety-six changes into fixes and features, so calling most of them firefighting would be a guess. The log does show a skew toward authentication and the PWA update path.

### Reusing the engine

**Before**

The engine generalized. Gay Cruise Bingo is preserved as the original and still runs as a live edition, the default one, on its own domain against its own Firebase project; Vacay Bingo is the travel edition; Five Across is the platform under both. The repository states the relationship itself, in a comment on that edition's brand record: "It is an ENDORSEMENT, not a rename: the wordmark, the cruise vocabulary, the adult posture, gaycruisebingo.com and the legacy Firebase project are all unchanged—GCB is simply one Edition of Five Across now, on the same engine as Vacay…" The first non-cruise event, a Sonoma Coast weekend in August 2026 run by a different host, has since run on that build, live enough that unlock-copy fixes landed on its opening day. That demonstrated reuse, but participation stalled: four people marked 27 squares, nobody got a bingo, and the guests' last marks came on Saturday morning. The cruise combined working software, prompts written for that sailing, a group ritual and a host promoting and tuning the game live. Moving the engine to another occasion did not reproduce that combination. The two events do not isolate which contribution mattered most. The craft layer generalized too: fifteen themes shipped for the cruise—thirteen party plus two tutorial—out of twenty-two now across the platform, every one held to WCAG AA contrast by test suites that compute contrast from the CSS itself.

**After**

The engine did get reused. Gay Cruise Bingo remains the original and default live edition, on its own domain and Firebase project. Vacay Bingo is the travel edition. Five Across is the platform under both.

The comment on Gay Cruise Bingo's brand record is explicit: "It is an ENDORSEMENT, not a rename: the wordmark, the cruise vocabulary, the adult posture, gaycruisebingo.com and the legacy Firebase project are all unchanged—GCB is simply one Edition of Five Across now, on the same engine as Vacay…"

A different host ran the first non-cruise event on the same engine: a Sonoma Coast weekend in August 2026. Unlock-copy fixes landed on opening day. The software was reused, but participation stalled. Four people marked 27 squares, nobody got a bingo, and the guests' last marks came on Saturday morning.

On the cruise, the software had prompts written for that sailing, a group ritual, and a host promoting and tuning the game live. Moving the engine to another occasion didn't reproduce that combination. Two events don't isolate which contribution mattered most.

## Complete manual meaning review

This is a voice rewrite against the published source and its audited corrections, not a fresh production, Firestore or PostHog audit. Historical cruise outcomes remain historical. The dated September/October platform statements retain their published boundaries; this pass does not claim to verify subsequent live platform changes.

| Material | Preserved claim and qualification | Existing ledger evidence |
|---|---|---|
| Launch and game | Eight days to launch; nine-night Trieste–Barcelona cruise; ten seeded days; sixteen friends; frozen randomized 5×5 cards; community prompt pool; 8:00 a.m. unlocks after the first day; port/party themes; tutorial bookends; proofs, milestones, doubts and hearts; choreographed finale | R20–R30, R43, R67 |
| Trust | No server mark validation; players write their boards; client sorts standings; three event claim modes and Cross My Heart default; Phase 0 without Cloud Functions; standings are trusted claims; seven demand events by one player cannot be subtracted as seven distinct challenged squares | R9–R10, R29–R31 |
| Offline | Installable PWA, persistent cache, queued marks, reconnect sync and network-independent cold boot; auth/update operational problems; matched-window 845 versus 783, gap 62; pre-embarkation day and 30 post-freeze ceremonial marks excluded from comparison; queueing and analytics loss are competing explanations | R9, R16, R32–R36 |
| Capture timing and failures | 288/703 main-day marks, 41%, after the next unlock; 32% at 19:00–20:59 ship time; debrief dinner recall; September 26 query: fifteen exceptions, five recorded sessions, one recorded user, July 18–19, no recorded marks in those sessions; no inferred connectivity, cause or participation effect | R16, R34–R35 |
| Hearts | No stats/rank/win influence; Most-Loved Photo award at freeze carries no points; removing score incentive left no second lever; nineteen hearts from one person across ten days and sixteen players; failure limited to this group and standings unaffected | R37–R38 |
| Deal revision | Initial seeded frozen deal/no rerolls; fairness rationale and unusable-card cost; no main bingo two days into main-pool play; pristine-only reshuffle, three per player, no mid-play board shopping; real relaxation of initial rule; reshuffle vocabulary; sole sea day plus easy embark-pool blend; seven uses by three of sixteen, within sailing | R15, R39–R42, R60 |
| Platform boundary | One engine, edge router, single-use auth handoff; worker deployable/tested, not proven deployed; two route blocks, one per zone, as of 2026-10-06; routes unattached/no production traffic; handoff provisioned by 2026-09-10 and client-live by 2026-10-06 but no demonstrated traversal; registered hosts direct; path scoping is not tenant isolation; unrelated-group Firebase setup cost and deliberate human cutover remain | R2, R5–R8, R17, R46–R48 |
| Standings | Actual 08:00 ship-time disembarkation freeze, never moved; 27 embark bingos from seven players, none on embark day; two later cards one bingo each on last full day; event-wide bingo count ten independently in both systems; embark bingos included; 845 squares, 61 bingos, zero blackouts | R9, R11–R14, R33, R51–R52, R55 |
| Adoption | 384/499 sessions, 77%, without a mark; scoreboard/feed interpretation explicitly an inference; heart/demand concentrations retained; reshuffle ceiling 48 is arithmetic, not recorded usage; Firestore fourteen of sixteen markers versus PostHog twelve, nine on at least five days | R10, R31, R38, R42, R49, R56 |
| Champion and image | Zacaria Arab 16 bingos/124 squares; Logan Murdock 129 squares versus 124 and second place; bingos-first ordering; image caption/path and Day 10 honors unchanged, with no invented freeze time in image | R12, R57–R58 |
| Learning responses | Fresh-card expectation and no measured motive; final-share card at 10:47 on docking morning, not day's last feature, three later features; matching-window attribution of both square counts; moderation six days pre-embarkation, off-by-default Vision, no located use record rather than proved non-use; later auth work dated separately | R33, R49–R54 |
| Operating record | Ninety-six first-parent commits between Rome midnights, not ninety-six proven phone deployments or reviewed PRs; 41 Hosting releases, repository deploy-log absence, rules-deploy incident and two-day stale shell; seven reshuffle uses prove that feature reached players; fixes/features partition unknown; reviewed mid-cruise drops; specs/ADRs and exact finale, on-device shares, offline persistence, second project, CSS contrast and launch-checklist examples retained | R3, R36, R41–R42, R59–R62, R69 |
| Reuse and themes | Original/default Gay Cruise Bingo on its own domain/project; Vacay travel edition; Five Across platform; complete brand-record quotation/ellipsis unchanged; different-host Sonoma Coast August 2026 event and opening-day unlock fixes; four markers, 27 squares, no bingo, guests stop Saturday morning; cruise prompts/ritual/host combination and no isolated contribution; fifteen cruise themes, thirteen party/two tutorial, twenty-two platform themes, CSS-derived WCAG AA checks | R4, R63–R68 |
| Limits and accountability | Friends do not validate retention/acquisition/pricing/stranger behavior; social-mechanic counts test this group; honor marks remain unverified; offline effect unresolved; a live at-sea operating example, not general proof; my product decisions remain mine, agents expand build/test/review capacity | R9–R10, R34, R38, R49, R61, R69; original closing |

The only changed time label is **last full day**, correcting the ambiguity while preserving the recorded instants. No numerical value, percentage, timestamp, named actor, URL, edition relationship or status is swapped. The source quote and image caption are unchanged. Repeated spoken-number occurrences were reviewed by field: removed “nine” belongs to the replaced card rendition (nine-night remains in hero and body); removed “twelve” restates the twelve-marker antecedent; zero-mark eligibility, three-per-player cap, seven uses, three users, fifteen/thirteen/two/twenty-two themes and the ninety-six commit count all remain. The owner's final precision review removed duplicate proof-demand and early-card-result mentions; the qualified seven demand events remain in the trust evidence, and both last-full-day results remain in the reshuffle cost and learning record. Ordinary “one”/“first”/“two” setup phrases were shortened without dropping a distinct count.

## Supporting files

- `src/content/projects/five-across.mdx`: complete voice pass, three metadata renditions and last-full-day clarification.
- `plans/correctness-pass-2026-10-06/five-across-ledger.md`: R54 summary/detail corrected in place, using the ledger's already-settled R13 and R3. The audit header is explicitly historical, so it does not assert that the voice draft equals the October 6 page. Other rows, verdicts and source metrics are unchanged.
- `src/content/resume/projects/five-across.md`: claims-review case-study hash and date only, after comparing the unchanged canonical/site entry to this draft.
- `screenshots/og/projects-five-across.png`: refreshed generated social-card reference; the image visitors receive is still built from frontmatter. Product screenshots and the standings image are unchanged.
- `plans/correctness-pass-2026-10-06/five-across-voice-comparison.md`: this complete draft, comparison and manual-review record.

## Validation and checker limits

- Final approved source: 79 native test files passed; 1,849 tests passed, six skipped. The 43-page build, type check and all 369 browser assertions passed (51 conditional skips). The managed preview launcher exited early; the browser suite used the supported dedicated `E2E_BASE_URL` path, with Astro-equivalent `/404` routing. Its global setup compared every served build file against this worktree. No test or checker changed. The earlier complete rendered review at 1440×1000 and 390×844 found all decision/learning fields, no horizontal overflow and no page errors. The regenerated final social card passes the build fit check and was visually inspected.
- Lint: pass. Vale's sentence-case heading warnings are advisory; the six section headings are unchanged and retain the owner's sentence-case convention. No checker/configuration is weakened.
- `verify-brevity.py`: every URL, link, weekday, timestamp, numeral, code span, code/diagram/table block and pinned identity field passes. One intentional failure: `seoDescription` is a proposed metadata voice edit, not a facts-only brevity change. Before/after text is printed above; the owner explicitly approved the search-snippet change with the aboard correction. Spoken-number occurrence warnings are advisory and dispositioned in the meaning review. No checker changes.
- The separate blog voice CLI rejects this project MDX input with `Supply one blog Markdown (.md) file` (exit 2). That is a scope limitation, not a voice verdict. I did not disguise the page as a blog post or alter the checker. All structured frontmatter and rendered project text were reviewed manually instead.
- Protected metadata, four constraints, five decision records, three learning records, decision lenses/statuses, component/import order, links, quotation and image asset/caption are checked independently of prose style.
- Writing-style route: installed skill with sufficient supplied references and direct owner feedback in this chat; no additional retrieval, private-writing cache or learned profile. The approved blog revisions are owner-approved model revisions, not newly user-authored samples. Passing any check does not establish voice or factual fidelity; the owner's direct approval is for a PR after the three precision fixes below, all now applied.

## Owner precision review

On 2026-10-11, the owner approved opening a PR once three fixes were applied: replace the metadata's literal ten days at sea with aboard/through the cruise; name one second event in the hero; and put the first two main cards' poor results beside the problem that prompted the reshuffle, rather than opening its outcome. Those changes are applied throughout this packet and the source. The hero is 169 characters, card 199 and search snippet 154.

I also removed the proof-demand count from the trust decision's cost and the closing qualification, keeping the qualified event count in its evidence and the social-mechanics results. The early cards' last-full-day result remains in the reshuffle cost and learning record; the repeated results-paragraph sentence is removed. Restored: "The rule, not volume, crowned the champion" and "What it could test, it tested harshly." The final reader-facing count is recalculated excluding MDX component markup.

## Original approval prompt

Approve the complete Five Across rewrite for a PR, including its three metadata renditions, the last-full-day clarification, R54's in-place correction and the résumé review-stamp refresh? The figures, limitations, assets, links and decision statuses remain as reviewed above. This approval is for opening a PR after validation; merge and deployment remain separate decisions for this project-page revision.
