---
title: "The Product Did Not Travel"
description: "A bingo app built for a cruise ran a second event for a different host. By Saturday afternoon, nobody was marking squares. The host's account sent me back to the cruise data, where a dinner ritual had been hiding inside the engagement totals."
seoDescription: "A bingo app worked on a cruise and stalled at a house weekend. The second event changed what I thought had made the first one work."
category: "Agent Systems"
featured: true
homepageRank: 1
author: "Nathan Payne"
date: 2026-09-24
draft: false
tags: ["Product", "Consumer", "Live Ops", "Platforms", "Evidence"]
image: "/og/blog/the-product-did-not-travel.png"
keyTakeaways:
  - "The cruise logged 845 marks and 61 bingos. A different host's weekend logged 27 marks and no bingos. The events don't isolate causes, but my best explanation includes specific prompts, a dinner ritual, and active hosting alongside the software."
  - "On the cruise, 41% of main-day marks came after the next card unlocked, and 32% of all marks fell between 19:00 and 20:59. Players described catching up at dinner. I'd counted engagement without seeing the ritual."
  - "Ask about the experience without naming the bugs you already know. Guests stopped marking four hours and forty-one minutes before the recorded crash; the crash may still have kept the host from bringing them back."
  - "The rough six-week commit count favored platform and tooling work over prompts and notifications. A manual card, willing host, planned session, and return check would let me test participation before building more infrastructure."
pullquotes:
  - text: "The host was doing the work of keeping the game in the conversation. Whether the product should support that work or replace it is still an open question."
    label: "The host's role"
    accent: red
  - text: "The best explanation the two events support is that the product was never only the code: prompts written for one sailing, a dinner ritual, and a host who kept it going."
    label: "The inference"
    accent: yellow
  - text: "Two accounts opened a Sunday card: mine, and a guest's, which opened only the wrap-up at 14:12. Neither marked a square. That is the failure I need to explain."
    label: "The second event"
    accent: blue
sidebar:
  - type: text
    content: |
      How things are counted. A mark is a marked, non-free cell on a player's board in production Firestore, read on September 24, 2026. The standings window ends at the event's `frozenAt`; the cruise's 845 marks are the ones inside it, and 921 includes the ceremonial card and later marks. Backfill counts a main-day mark made after the next day's card unlocked, over main days one through eight before the freeze (288 of 703); tutorial days are excluded because they had no real deadline. Hours are local event time: Central European for the cruise, Pacific for Bodega Bay. Bingos are the players' standings totals (61), not the per-day tallies (64), which include three on the ceremonial card.
    caption: "Counting rules for every figure in this post."
  - type: text
    content: |
      What was checked against what. Marks, bingos, proofs and timestamps come from the two production Firestore projects. Crash timing and event counts come from PostHog; the connectivity check was run on September 26 over the cruise dates. PostHog undercounted Bodega Bay's marks (5 against Firestore's 27), so the game totals use Firestore; the connectivity check separately counts recorded analytics events. The host's words are from a debrief survey Kim answered on August 11 and from text messages Kim sent me around the event, all quoted with permission; one obvious typo is corrected in brackets. The players' words are from an anonymous cruise debrief with seven submissions, five complete. Commit and pull request figures come from the public repository's history; the post-debrief commit split is a rough keyword count, not a hand classification. The app screens come from the app repository's marketing harness: the real app running over a seeded demo event, with invented names, general-audience prompts and no player photographs. No screen shows production data.
    caption: "Sources and counting boundaries."
---

At 12:57 on Saturday, August 8, Kim, the host of a weekend in Bodega Bay, marked a bingo square. Nobody marked another square for the rest of the weekend. The guests had made their last marks three hours earlier.

The app was [Five Across](/projects/five-across/), the live multiplayer bingo game I'd built in eight days for a nine-night cruise with sixteen friends. The cruise logged 845 marks and 61 bingos inside the standings window. Two weeks and 76 pull requests later, I'd generalized it for a different host and five guests at a house weekend. Four people marked 27 squares, and nobody got a bingo.

The groups and trip lengths were different, so dividing one total by the other wouldn't tell me much. Bodega Bay was a failure without that comparison: the host made most of the marks, the guests stopped marking on Saturday morning, and Sunday's cards opened without anyone marking a square.

I'd planned to write about the generalization: the architecture, the work it took, and the second event running on it. The software did run the weekend. People barely played. The platform work succeeded, and the product still did not survive the trip.

The best explanation the two events support is that the product was never only the code: prompts written for one sailing, a dinner ritual, and a host who kept it going. The cruise group was big enough, and together long enough, for that ritual to take hold. I promoted the game and adjusted it while it ran. None of those three conditions came along with the generalized software. The cruise data had described them before Bodega Bay; I hadn't read it that way.

That's an inference. Two events don't isolate which part mattered most. A first success gives me a bundle of code, content, and circumstance; usage totals don't separate them. Letting a different host run the next event helped me see what I'd been supplying. I asked about that experience without naming the bugs I already knew about, then went back to the cruise's data.

## Built for one event, then generalized

I'd scoped the first build to one cruise. Multi-tenancy was a non-goal in the requirements, and a [design-only spec](https://github.com/nathanjohnpayne/fiveacross/pull/109) on day two left room for future events without writing code for them. That was the right choice for eight days. I hadn't skipped rigor: tests, emulator checks of the security rules, and a contrast audit across eight themes were in place before anyone played.

The cruise ended on July 24. Bodega Bay started on August 7. In the thirteen days between, 76 pull requests merged, mostly to let the app run events it hadn't been built for. Hostnames selected events. A scoring policy went into the event data; the app wouldn't read it until 2026-08-18. An adult-content setting moved under server control: the new event was general-audience, and the cruise emphatically wasn't.

[Renaming fields](https://github.com/nathanjohnpayne/fiveacross/pull/648) exposed how much of the cruise I'd built into the model. A Day's `port` became `place`; `sailStart` and `sailEnd` became `startsOn` and `endsOn`; the `embark` and `farewell` prompt pools became `easy` and `closing`. Those names had made assumptions for me. Bodega Bay still stores its easy pool as `embark`, which tells you how far the cruise vocabulary had reached. Finding those assumptions was useful. It didn't explain why people stopped playing.

<div class="figure-pair">

![The same engine in two editions. Gay Cruise Bingo's warm-up card, dealt from boarding-day prompts in the sailing's neon theme. Every screen in this post uses seeded demo data and invented names.](/blog/the-product-did-not-travel/img/gcb-card.png)

![Vacay Bingo's warm-up card for Bodega Bay: a new wordmark, new themes and general-audience prompts, over the same grid, deal and marking the cruise ran on.](/blog/the-product-did-not-travel/img/vacay-card.png)

</div>

Bodega Bay got its own hostname and brand, three new day themes, and a 120-prompt general-audience pool. The platform could run a second event. That event also had a client crash and no first-day email. Both needed attention, but their part in the participation failure was less clear.

## What did not travel

Kim hosted at a house on the coast, Friday through Sunday. I wasn't there. I set up the event, dropped off laminated player and admin guides the day before, and watched from home through an account that never marked a square. Seven accounts joined: Kim, five guests, and me. Four marked anything. Kim made 15 of the 27 marks; three guests made the other twelve.

Friday's card collected thirteen marks between 18:03 and 20:13, mostly Kim's, then two more from Kim just before 1:00. Guests made eight marks on Saturday between 09:46 and 09:57. They never marked again. Kim added four at 12:56 and 12:57. Nothing followed on any card. Two accounts opened a Sunday card: mine, and a guest's, which opened only the wrap-up at 14:12. Neither marked a square. That is the failure I need to explain.

<span id="a-debrief-the-bugs-could-not-steer"></span>

### Asking about the experience

Three days later, I sent Kim a debrief. I knew about the crash and missing email. Asking about them would have put my explanation into the questions. I wanted to know why Saturday's participation fell away and whether a daily bingo card fit a group trip at all. I didn't name either bug. Whatever Kim raised needed to come from Kim.

Kim gave the game three out of five for how it landed with the group. On Saturday: "Friday was the biggest day with all the excitement. The morning maybe started strong but still need my enthusiasm to keep it going. Since a lot of the prompts were outside of the house, peeps gave up a bit since everybody stayed home."

The squares were "Too hard." Asked why nobody got a bingo, Kim said, "I think the prompts weren't quite right for this trip. Or maybe people wanted to just relax and this felt like work." By the end, the game was "a shared photo album." Would Kim run it again? "Yes, but only if some things changed."

Kim's text that afternoon, before the survey, had already put the crash second: "[Mine] stopped working on Saturday but since they didn't seem super interested, generally, I didn't end up reaching out."

Kim led with the wrong prompts, low interest, and a game that felt like work. The crash was an aside in both the survey and the text. Neutral questions let me hear that instead of confirming the bug I was ready to blame. It's still one host's account. I don't have a debrief from the guests.

<span id="the-host-was-the-notification-system"></span>

### The host was the channel

Kim said people learned a new card was live because "I told them in person." On email timing, the answer was "Yes, felt right," even though the first email never went out. People used the host as a channel. That answer doesn't tell me who also used email or noticed the missing message; Kim couldn't speak for every inbox.

At 14:38 on Saturday, PostHog recorded fourteen client errors: a Firestore internal assertion followed by three crash screens, all on one device. Kim's text separately confirms the app stopped working that day. The guests' last mark came four hours and forty-one minutes before the recorded crash. Kim's last mark came before it, too. That crash didn't open the gap in marking.

A last mark doesn't tell me when someone decided to quit. Kim might have invited people back after the morning pause, and a broken host app might have prevented that. Weak interest and the crash could both have mattered. The crash still needs fixing. I don't want to fix it and call the weekend explained, which is why I kept it out of the questions.

### Prompts for plans that did not exist

Kim took responsibility: "I should've known we weren't going anywhere and had less prompts for exploration." That was generous, and not quite fair. The pool began with 120 AI-drafted prompts written to the platform's general-audience rules. Kim rewrote 65 over dinner the night before launch. I'd asked whether there were plans to build the schedule around. The answer was: "No, we have no real plans solidified bc nobody is as much of a Virgo as me." I'd asked a host to prepare prompts for plans that didn't exist, starting with a draft that assumed they would.

By my rough count, about a third of the final squares needed people to leave the house: a dunes walk, a whale spout, a boat name in the harbor. Of 27 recorded marks, 26 were possible at home. The dunes walk was marked once. That fits Kim's account. It doesn't establish that players marked every feasible square or that every bingo line was blocked; I'd need each actual board and what happened that weekend to show either.

<div class="figure-pair">

![A second-day card dealt from Bodega Bay's pool on demo data. The six marked prompts were marked by real players that weekend. This illustrates the indoor/outdoor mismatch; it does not reconstruct a player's board or prove that a bingo was impossible.](/blog/the-product-did-not-travel/img/vacay-saturday-card.png)

![A demo leaderboard with invented names and the real weekend's spread of marks: one player far ahead, a few squares for everyone else, and no daily First to BINGO on any day.](/blog/the-product-did-not-travel/img/vacay-bodega-ranks.png)

</div>

The occasion was different, too. Six people resting over a weekend had less time to build a habit than sixteen together for nine nights. Even the cruise started slowly; a weekend-length trip would have ended before the fix that got it going.

I'd asked Kim to arrange something small for the most bingos, first bingo, and most-liked photo, but there was not one in the end. The cruise had no real prize either. Sixteen people keeping score of one another supplied stakes of their own. Better prompts might have helped at Bodega Bay. People might also have preferred a weekend without a game.

## Rereading the success case

A failure on the second event makes the first event legible, and this is the part I find most useful.

I'd treated the cruise as a success of the build: offline marking at sea, daily cards, a leaderboard, a finale. Bodega Bay made me go back to when people marked squares and what they said about playing.

**Players often marked yesterday's card, at the table.** Of 703 main-day marks before the freeze, 288, or 41%, came after the next day's card unlocked. Of all 921 marks, 294, or 32%, landed between 19:00 and 20:59 ship time, the busiest two hours.

The debrief supplied the setting. One player described "Group gatherings for lunch/dinner to recall the previous evenings activities." Another remembered sitting down to dinner after a big night out and realizing how many squares they could mark. A third learned in a group discussion that previous days' squares stayed open. One played alone "to avoid having my phone be a social distraction," joining in when people were already talking about the game.

**Conversation and competition both mattered.** Of six respondents asked what brought them back, four chose "People kept bringing it up in conversation," four chose "Not wanting to fall behind," and four chose "Chasing a bingo." None chose photos, the use Kim said remained at Bodega Bay. Three of those six said my group-chat posts made them open the app often or almost every time.

<div class="figure-pair">

![The cruise's leaderboard on demo data with invented names. Shared rankings gave the group a way to compare progress.](/blog/the-product-did-not-travel/img/gcb-ranks.png)

![The feed for proofs, shared tallies and bingos, in the cruise's neon theme. The software gave the group's conversation a shared record.](/blog/the-product-did-not-travel/img/gcb-feed.png)

</div>

**Specific prompts stayed with people.** Of five respondents who named a memorable square, three chose one of the sailing's own squares naming a drag star. Those squares wouldn't fit another event's card. One asked, unprompted, for more squares specific to the day. Kim had asked for much the same thing after a weekend that barely worked.

**The host adjusted the game while it ran.** The first two main cards produced one bingo each, both claimed days later. Before main day three, I shipped [an easy mix](https://github.com/nathanjohnpayne/fiveacross/pull/394) to blend easier squares into the main cards, alongside [a reshuffle](https://github.com/nathanjohnpayne/fiveacross/pull/383) for untouched cards. The third main day's cards produced eight bingos and nearly twice day two's marks.

The itinerary changed as well, so the increase is a correlation. Four of five respondents noticed easier squares and said bingos suddenly felt achievable. Only one used the reshuffle.

The cruise combined software for catching up on yesterday's card and comparing scores, prompts for that sailing, sixteen people meeting at dinner over nine nights, and a host who promoted the game and changed its difficulty. Bodega Bay had the software, a general-audience draft for a weekend with no plans, and six people staying home to rest. Kim supplied the enthusiasm in person, then Kim's app broke on Saturday afternoon.

Those differences don't tell me which change mattered most. They do tell me I'd specified the data model more carefully than the conditions around the game. Generalizing the software didn't reproduce those conditions.

### A rationale is not a finding

The [project page](/projects/five-across/) records my decision to "Assume the connection is already gone." I'd written its original rationale: "The moments worth capturing are the ones furthest from a signal." It seemed obvious before launch. The marks describe people at dinner, recalling yesterday. They don't say whether those people had a signal.

A September 26 PostHog check found fifteen cruise exception events carrying `auth/network-request-failed`, across five sessions for one recorded user on July 18–19. None of those sessions contained a mark. None of the marks carrying a retry queue fell in the dinner window. That neither confirms nor refutes whether offline support earned its keep, and the project page now says so.

I'd written a rationale before real use and read it afterward as if it were a finding. Going back to the marks exposed the assumption. The record still leaves the connection question open.

## Where the next six weeks went

This is the part I would rather not write, so it is the part I should.

In the six weeks after Kim's debrief, roughly 270 commits landed. I counted keywords in their subjects, but didn't record the matchers. A re-run with fresh matchers gives different absolute counts and the same shape. In my original rough count, about 59 touched hostname routing, sign-in, the edge router, and deployment; about 58 touched dependencies, CI, and review tooling. Prompts or prompt pools appeared in about 11, email and notifications in about 14.

These aren't working-time categories. They overlap, and they can't tell me what another allocation would have achieved. They do show where the commits went. The counted commits touched platform and tooling several times as often as prompts and notifications. The debrief had pointed at prompts and keeping the game in the conversation.

Some work did answer the feedback. Six days after the debrief, the organizer-wizard spec added an [occasion matrix](https://github.com/nathanjohnpayne/fiveacross/pull/811). A host's first answer—what kind of occasion is this?—selects starter prompts and a schedule shape. That's close to what Kim needed. [Community prompts](https://github.com/nathanjohnpayne/fiveacross/pull/845) shipped the next day so players could suggest squares, as three of five cruise respondents had requested.

Some of the plumbing was necessary. [Self-service event creation](https://github.com/nathanjohnpayne/fiveacross/issues/785), which would let an organizer write prompts for their occasion without me, depends on platform prerequisites. That linked issue closed on 2026-10-03 as a historical record; the block persists under the epic. Every live event so far had been, in the [epic's](https://github.com/nathanjohnpayne/fiveacross/issues/786) words, "hand-seeded, hand-hosted, and hand-registered."

I accept that defense for some of the six weeks. Not all. The platform work had specs, reviews, and satisfying closures. The product work didn't. None of those prerequisites stopped a cheaper test: prepare a card by hand with a willing host, use things possible at the house, plan a group session, and check whether anyone returns at the next opportunity. That experiment needs a group, not wildcard routing.

<span id="the-stop-condition"></span>

## What I need to test next

Bodega Bay showed the platform could run an event it hadn't been built for. It also showed a different host could run it, with Kim doing by hand much of what the product should have supported. It didn't show independence from me. I'd seeded the event, registered its hostname, supplied the prompt draft, and coached Kim by text.

The self-service exit condition is "an organizer can launch and run an event without developer intervention." That's a useful setup test. Participation needs a test of its own, fitted to the occasion.

For a weekend, I'd agree with the host on the next opportunity to play after the introduction. I'd record who returns, whether the host had to invite them, whether the squares fit what happened, and what they say about playing or opting out. If people return only when invited and enjoy it, I'd work on the host's tools. If they return on their own, I'd investigate what brought them back. If it still feels like work, I'd revisit the occasion or format before adding reminders.

The host was doing the work of keeping the game in the conversation. Whether the product should support that work or replace it is still an open question. I could build for organizers leading a ritual, choose occasions that already have one, or eventually try to keep the game in the conversation without a host. Two events don't choose for me. They give me the next question, and it isn't about routing.

## What transfers

Three lessons from this bingo game apply to other one-offs I'd want to turn into products.

**Let someone else run the second event, then ask questions your known bugs can't lead.** Hosting Bodega Bay myself would have let me supply the enthusiasm and blame the crash. Neutral questions gave Kim room to tell me the prompts were wrong for that weekend.

**When the second event fails, reread the first.** The cruise had already shown 41% of main-day marks being backfilled, and a third of all marks in two dinner hours. I had read those numbers as engagement. They were a description of the product.

**Count from the system that holds the state.** PostHog recorded five Bodega Bay marks; Firestore held twenty-seven. Using the analytics total would have made this a different account of the failure.

The cruise worked. It's still the best week the app has had. What people were doing there tells me most of what I need to build next. Less of it than I'd assumed was in the code that traveled.
