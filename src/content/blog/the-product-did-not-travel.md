---
title: "The Product Did Not Travel"
description: "A bingo app built for a cruise ran a second event for a different host. By Saturday afternoon, nobody was marking squares. The host's account sent me back to the cruise data, where a dinner ritual had been hiding inside the engagement totals."
seoDescription: "A bingo app worked on a cruise and stalled at a house weekend. The second event changed what I thought had made the first one work."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-09-24
draft: false
tags: ["Product", "Consumer", "Live Ops", "Platforms", "Evidence"]
image: "/og/blog/the-product-did-not-travel.png"
keyTakeaways:
  - "A first success bundles software, content, hosting and circumstance. A different host and occasion can expose dependencies that engagement totals conceal, without isolating which one caused the outcome."
  - "The cruise's timestamps and player accounts point to a dinner ritual: people recalled the previous day's events and marked squares together. The software helped that ritual work. Generalizing the software did not reproduce it."
  - "Ask about the experience before naming the bugs you know about. Treat the host's explanation as evidence to investigate, and distinguish the last recorded action from the moment someone decided to stop."
  - "Test the occasion and the host's role before automating them. A manually prepared card and a planned group session can test whether people return at the next opportunity, without waiting for self-service infrastructure."
pullquotes:
  - text: "The host was doing the work of keeping the game in the conversation. Whether the product should support that work or replace it is still an open question."
    label: "The host's role"
    accent: red
  - text: "A second event can expose what the first success depended on. It cannot, by itself, tell me which dependency to build next."
    label: "The test"
    accent: yellow
  - text: "Three people opened Sunday's cards. None marked a square. That is the failure I need to explain."
    label: "The second event"
    accent: blue
sidebar:
  - type: text
    content: |
      How things are counted. A mark is a marked, non-free cell on a player's board in production Firestore, read on September 24, 2026. The standings window ends at the event's `frozenAt`; the cruise's 845 marks are the ones inside it, and 921 includes the ceremonial card and later marks. Backfill counts a main-day mark made after the next day's card unlocked, over main days one through eight before the freeze (288 of 703); tutorial days are excluded because they had no real deadline. Hours are local event time: Central European for the cruise, Pacific for Bodega Bay. Bingos are the players' standings totals (61), not the per-day tallies (64), which include three on the ceremonial card.
    caption: "Counting rules for every figure in this post."
  - type: text
    content: |
      What was checked against what. Marks, bingos, proofs and timestamps come from the two production Firestore projects. Crash timing and event counts come from PostHog; the connectivity check was run on September 26 over the cruise dates. PostHog undercounted Bodega Bay's marks (6 against Firestore's 27), so the game totals use Firestore; the connectivity check separately counts recorded analytics events. The host's words are from a debrief survey Kim answered on August 11 and from text messages Kim sent me around the event, all quoted with permission; one obvious typo is corrected in brackets. The players' words are from an anonymous cruise debrief with seven submissions, five complete. Commit and pull request figures come from the public repository's history; the post-debrief commit split is a rough keyword count, not a hand classification. The app screens come from the app repository's marketing harness: the real app running over a seeded demo event, with invented names, general-audience prompts and no player photographs. No screen shows production data.
    caption: "Sources and counting boundaries."
---

At 12:57 on Saturday, August 8, the host of a weekend at Bodega Bay marked a bingo square. Nobody marked another one for the rest of the weekend. The guests' last marks had come three hours earlier.

The app was [Five Across](/projects/five-across/), a live multiplayer bingo game I built in eight days for a nine-night cruise with sixteen friends. It logged 845 marks and 61 bingos inside the standings window.

Two weeks and 76 pull requests later, the generalized app ran a house weekend for a different host and five guests. Four people marked 27 squares between them. Nobody got a bingo.

Those totals span different group sizes and trip lengths. Bodega Bay failed on its own terms: the host made most of the marks, guest marking ended Saturday morning, and Sunday's cards opened without anyone marking a square.

I had the story ready: here is what I generalized, here is the architecture, here is the second event running on it. Instead, the second event sent me back to the first one's data. What had the cruise players been coming back for?

Their answers and timestamps pointed to a dinner ritual: recalling the day, comparing squares and catching up with each other. The software helped that ritual work. Moving the software to another event had not reproduced the conditions around it.

## Built for One Event, Then Generalized

The first build deliberately served one cruise. A [design-only spec](https://github.com/nathanjohnpayne/fiveacross/pull/109) kept future events in view, but a multi-tenant product was a non-goal. That was a reasonable scope for eight days.

The cruise ended on July 24; Bodega Bay started on August 7. In the thirteen days between, 76 pull requests merged. The app gained event selection by hostname, an explicit scoring policy and a server-controlled adult-content setting.

The most revealing work was [a rename](https://github.com/nathanjohnpayne/fiveacross/pull/648). `port` became `place`; `sailStart` and `sailEnd` became `startsOn` and `endsOn`; the `embark` and `farewell` pools became `easy` and `closing`.

Those names exposed assumptions the cruise had made for me. Bodega Bay's database still stores its easy pool under the legacy value `embark`, a small monument to how the cruise had shaped the model.

<div class="figure-pair">

![The same engine in two editions. Gay Cruise Bingo's warm-up card, dealt from boarding-day prompts in the sailing's neon theme. Every screen in this post uses seeded demo data and invented names.](/blog/the-product-did-not-travel/img/gcb-card.png)

![Vacay Bingo's warm-up card for Bodega Bay: a new wordmark, new themes and general-audience prompts, over the same grid, deal and marking the cruise ran on.](/blog/the-product-did-not-travel/img/vacay-card.png)

</div>

Bodega Bay ran under its own hostname and brand, with three new day themes and a 120-prompt general-audience pool. That demonstrated reuse. A client crash and a missing first-day email also shaped the weekend.

## What Did Not Travel

Kim hosted the weekend at a house on the coast, Friday through Sunday. I was not there. I set up the event, dropped off laminated player and admin guides, and followed from home through an account that never marked a square.

Seven accounts joined: Kim, five guests and me. Four ever marked anything. Kim made 15 of the 27 marks; the three guests who played made the other twelve.

Friday's card collected thirteen marks between 18:03 and 20:13, most of them Kim's, and two more of Kim's just before 1:00. Saturday's busiest guest stretch was eight marks between 09:46 and 09:57. No guest marked anything afterward.

Kim marked four more squares at 12:56 and 12:57. Then nothing, on any card, for the rest of the event. Three people opened Sunday's cards. None marked a square. That is the failure I need to explain.

<span id="a-debrief-the-bugs-could-not-steer"></span>

### Asking About the Experience

Three days later I sent Kim a debrief. I knew about the crash and the missing email. I wanted to understand the loss of participation and whether a daily bingo card suited the trip, without putting those explanations into the questions.

Kim rated the game three out of five and described needing to supply enthusiasm after Friday's initial excitement. The group had stayed home, while many prompts assumed they would go out.

On the squares themselves: "Too hard." On why nobody got a bingo: "I think the prompts weren't quite right for this trip. Or maybe people wanted to just relax and this felt like work."

By the end, Kim said, the game had become "a shared photo album." Asked about running it again: "Yes, but only if some things changed."

Kim's text before the survey made the same distinction: "[Mine] stopped working on Saturday but since they didn't seem super interested, generally, I didn't end up reaching out."

The prompt mismatch and the group's appetite for a game came through without a question naming either bug. They were worth investigating. This was still one host's account of the guests' experience; this account does not include a debrief from each guest.

### The Host Was the Notification System

Asked how people found out a new day's card was live, Kim picked "I told them in person." Asked whether the emails arrived when expected, Kim answered "Yes, felt right," although the first day's email had not gone out.

That establishes the host as a channel people used. It cannot establish that nobody used email or noticed its absence. A host's answer cannot describe every guest's inbox or attention.

PostHog recorded fourteen client errors at 14:38 on Saturday: a Firestore internal assertion followed by three crash screens, all on one device. Kim's text independently says the app stopped working that day.

The guests' last mark preceded the recorded crash by four hours and forty-one minutes. Kim's last mark preceded it too. The crash came after the last activity; it cannot explain that earlier gap by itself.

But a last mark is not a timestamp for a decision to quit. The morning pause might have ended with another invitation from Kim. A broken host app could have prevented that return. Weak interest and a crash could both have contributed.

### Prompts for Plans That Did Not Exist

Kim's closing answer took responsibility: "I should've known we weren't going anywhere and had less prompts for exploration." That is generous. I had supplied an AI draft of 120 prompts, and Kim rewrote 65 over dinner the night before launch.

When I asked beforehand about plans for the schedule, Kim replied: "No, we have no real plans solidified bc nobody is as much of a Virgo as me." The draft assumed activities that the host could not yet know would happen.

By my rough count, about a third of the final squares required leaving the house: a walk on the dunes, a whale spout, a boat name in the harbor. Of the 27 marks recorded, 26 were for things possible at home. The dunes walk was marked once.

That is consistent with Kim's explanation. It does not show that players marked every feasible square, or that every possible bingo line was blocked. That would require checking each player's actual board against what happened.

<div class="figure-pair">

![A second-day card dealt from Bodega Bay's pool on demo data. The six marked prompts were marked by real players that weekend. This illustrates the indoor/outdoor mismatch; it does not reconstruct a player's board or prove that a bingo was impossible.](/blog/the-product-did-not-travel/img/vacay-saturday-card.png)

![A demo leaderboard with invented names and the real weekend's spread of marks: one player far ahead, a few squares for everyone else, and no daily First to BINGO on any day.](/blog/the-product-did-not-travel/img/vacay-bodega-ranks.png)

</div>

The occasion also differed. Six people resting over a weekend had fewer opportunities to build a habit than sixteen people together for nine nights. Better prompts might help; the group might also prefer a weekend without a game.

## Rereading the Success Case

I had read the cruise as a success of the build: offline marking at sea, daily cards, a leaderboard and a finale. With Bodega Bay in mind, I went back to when people marked squares and what they said about doing it.

**Players often marked yesterday's card.** Of 703 main-day marks before the standings froze, 288, or 41%, came after the next day's card unlocked. And 294 of all 921 marks, 32%, landed between 19:00 and 20:59 ship time.

Players supplied the setting. One described "Group gatherings for lunch/dinner to recall the previous evenings activities." Another recalled discussing the previous night at dinner and realizing how many squares they could mark.

A third learned during a group discussion that previous days' squares could still be marked. One deliberately played alone "to avoid having my phone be a social distraction," joining in when the group was already talking about it.

**Conversation and competition both mattered.** Asked what brought them back, four of six respondents picked "People kept bringing it up in conversation," four picked "Not wanting to fall behind," and four picked "Chasing a bingo."

None picked photos, which Kim had described as the remaining use at Bodega Bay. Three of those six respondents said my group-chat posts made them open the app often or almost every time.

<div class="figure-pair">

![The cruise's leaderboard on demo data with invented names. Shared rankings gave the group a way to compare progress.](/blog/the-product-did-not-travel/img/gcb-ranks.png)

![The feed for proofs, shared tallies and bingos, in the cruise's neon theme. The software gave the group's conversation a shared record.](/blog/the-product-did-not-travel/img/gcb-feed.png)

</div>

**Specific prompts stayed with people.** Three of five respondents who named a memorable square chose one about a drag star performing on that sailing. One asked for more squares specific to the day. Kim had asked for a better fit to the occasion too.

**The host adjusted the game.** The first two main cards each produced one bingo, both claimed days later. Before main day three I shipped [an easy mix](https://github.com/nathanjohnpayne/fiveacross/pull/394) and [a reshuffle](https://github.com/nathanjohnpayne/fiveacross/pull/383) for untouched cards.

Main day three's cards produced eight bingos and nearly twice day two's marks. The itinerary also changed, so the increase cannot be attributed to the fix alone. Four of five respondents reported noticing that bingos felt achievable.

Only one of those respondents used the reshuffle. Easier cards were one plausible contributor; a second event with a different audience does not isolate their effect from the host, schedule or group.

The records suggest a product built from software, prompts, a social routine and active hosting. Previous-day marking let players catch up at dinner. Rankings supported competition. The feed gave their conversation a shared record.

The reusable software was part of that experience. The conditions that made it useful had not been specified as carefully as the data model. Bodega Bay exposed that gap without telling me which condition mattered most.

### A Rationale Is Not a Finding

My original rationale for offline support was that the moments worth capturing happened furthest from a signal. The data gives me a different picture of marking: often retrospective, with players describing a dinner-table catch-up.

A fresh PostHog check found request failures. On July 18–19, fifteen exception events contained `auth/network-request-failed`, across five recorded sessions for one recorded user. None of those sessions contained a recorded mark.

Thirteen marking events in the cruise window carried a nonempty analytics retry queue. That is evidence of queued retries, not a measurement of whether Firestore writes succeeded or whether the browser had lost its connection.

Neither set fell in the 19:00–20:59 dinner window. The request failures were real; their cause and the role of offline support in dinner-time marking remain unresolved. The Firestore–analytics gap cannot settle either question.

The [project page](/projects/five-across/) now distinguishes those observations from the original rationale. A rationale written before use is a hypothesis. Returning to it after an event means checking both what the record challenges and what it cannot settle.

## Where the Next Six Weeks Went

In the six weeks after Kim's debrief, the repository took 268 commits. A rough keyword count found about 59 touching routing, sign-in and deployment; 58 dependencies, CI and review tooling; 11 prompts or pools; and 14 email or notifications.

Those are keyword matches, not a division of working time. Categories need not be exclusive. They cannot tell me how much effort each area took or what would have happened if I had chosen differently.

Some work answered the feedback. The organizer-wizard spec added an [occasion matrix](https://github.com/nathanjohnpayne/fiveacross/pull/811), matching an occasion to starter prompts and a schedule. [Community prompts](https://github.com/nathanjohnpayne/fiveacross/pull/845) let players suggest squares.

The infrastructure had a purpose too. [Self-service creation](https://github.com/nathanjohnpayne/fiveacross/issues/785) depended on platform prerequisites. The [epic](https://github.com/nathanjohnpayne/fiveacross/issues/786) described existing events as hand-seeded, hand-hosted and hand-registered.

What those dependencies did not require was waiting to test a better weekend. I could have prepared a card with a host around things possible at the house, arranged a group session, and checked whether people returned at the next opportunity.

That experiment would still need a willing group. It would not need wildcard routing or a self-service wizard. It could guide the build while setup stayed manual. The commit counts cannot tell me what its result would have been.

## The Stop Condition

Bodega Bay showed that a different host could run an event on the app. It did not test independence from me: I seeded the event, registered the hostname, supplied the prompt draft and coached Kim by text.

The requirements document's self-service exit condition is that "an organizer can launch and run an event without developer intervention." That is a useful setup test. Sustained participation needs its own test, sized to the occasion.

For a weekend, I would check the next planned opportunity to play after the introduction. Record who returns, whether the host invites them, whether the squares fit what happened, and what people say about playing or opting out.

That leaves the host's role open. The product might help organizers lead a ritual, fit occasions where one already exists, or eventually encourage returns without a host. These events do not choose among those directions.

<span id="what-transfers"></span>

The next test I would run is a manually prepared house-weekend card with a willing host and a planned group session. Before it starts, I would agree with the host on a later opportunity to play and check the card for achievable lines.

If people return only when invited and enjoy it, I would develop the host's tools. If they return on their own, I would investigate what prompted them. If they still find it work, I would reconsider the occasion or the format before adding reminders.

A second event can expose what the first success depended on. It cannot, by itself, tell me which dependency to build next. The cruise gave me a promising experience. The next event should help me learn how to make it repeatable.
