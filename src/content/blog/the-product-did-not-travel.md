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
  - "A v1 that works is a bundle of code, content and circumstance, and usage totals will not say which part the customers were there for. Two weeks after a cruise logged 845 marks and 61 bingos, the same code ran a weekend for a different host and logged 27 marks and no bingos. The best explanation the two events support is that the product was the prompts, the ritual and the host, and none of them came along when the code generalized."
  - "The first event's data held the explanation before the second event ran. On the cruise, 41% of main-day marks were made after the next day's card had unlocked, and 32% of all marks landed between 19:00 and 20:59. Players were marking at dinner, recalling the night before. I had read those numbers as engagement. They were a description of the product."
  - "Design the debrief so your known bugs cannot steer the answers, and treat a last recorded action as a timestamp rather than a decision. The host's debrief pointed at prompts written for plans that did not exist and at a game that felt like work. The guests' last mark came four hours and forty-one minutes before the only recorded crash, so the crash did not open the gap, though it may have kept anyone from closing it."
  - "By a rough keyword count, six weeks of commits touched platform and tooling several times as often as prompts and notifications, while the evidence pointed at prompts and at keeping the game in the conversation. The cheaper next test needs no infrastructure: a hand-prepared card, a willing host, a planned session and a check on who returns at the next opportunity."
pullquotes:
  - text: "The host was doing the work of keeping the game in the conversation. Whether the product should support that work or replace it is still an open question."
    label: "The host's role"
    accent: red
  - text: "The best explanation the two events support is that the product was never only the code: prompts written for one sailing, a dinner ritual, and a host who kept it going."
    label: "The inference"
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

The app was [Five Across](/projects/five-across/), a live multiplayer bingo game I built in eight days for a nine-night cruise with sixteen friends. On the cruise it logged 845 marks and 61 bingos inside the standings window. Two weeks and 76 pull requests later, the generalized app ran a house weekend for a different host and five guests. Four people marked 27 squares between them, and nobody got a bingo. Those totals span different group sizes and trip lengths, so the ratio between them proves little on its own. Bodega Bay failed on its own terms: the host made most of the marks, guest marking ended Saturday morning, and Sunday's cards opened without anyone marking a square.

I had the story ready: here is what I generalized, here is the architecture, here is the second event running on it. The data does not support that story. The platform work succeeded, and the product still did not survive the trip. The best explanation the two events support is that the product was never only the code. It was prompts written for one specific sailing, a group big enough and together long enough to make the game a dinner ritual, and a host who promoted and adjusted it while it ran. None of those three came along when the software generalized. The cruise's own data described them before the second event started, and I did not read it that way until the second event failed.

That is an inference, and two events cannot isolate which of those parts mattered most. But it is the inference that transfers to any v1 that worked once. A first success is a bundle of code, content and circumstance, and usage totals will not say which of the three the customers were there for. Handing the second run to a different customer gets you closer. Debrief that customer so your known bugs cannot steer the answers, then go back to the first customer's data and read it for what the product was rather than for how much of it got used. That is the order the rest of this post follows.

## Built for One Event, Then Generalized

The first build deliberately served one cruise. The requirements document listed a multi-tenant product as a non-goal, and a [design-only spec](https://github.com/nathanjohnpayne/fiveacross/pull/109) written on day two kept future events in view at the cost of one document and no code. That was the right scope for eight days, and it matters for what follows: rigor was not the missing ingredient. The app had tests, security rules checked against an emulator and a contrast audit across eight themes before it had players.

The cruise ended on July 24; Bodega Bay started on August 7. In the thirteen days between, 76 pull requests merged, most of them turning "the cruise app" into something that could run an event it had never heard of: event selection by hostname, an explicit scoring policy and a server-controlled adult-content setting, because the next event was general-audience and the cruise was emphatically not.

The most revealing work was [a rename](https://github.com/nathanjohnpayne/fiveacross/pull/648). The schema had a Day field called `port`, event dates called `sailStart` and `sailEnd`, and prompt pools named `embark` and `farewell`. They became `place`, `startsOn`, `endsOn`, `easy` and `closing`. Every one of those names was an assumption the cruise had made for me without my noticing, and finding them was the right work. Bodega Bay's database still stores its easy pool under the legacy value `embark`, a small monument to how deep the cruise had gotten into the data model. None of those assumptions, it turned out, was the one that mattered.

<div class="figure-pair">

![The same engine in two editions. Gay Cruise Bingo's warm-up card, dealt from boarding-day prompts in the sailing's neon theme. Every screen in this post uses seeded demo data and invented names.](/blog/the-product-did-not-travel/img/gcb-card.png)

![Vacay Bingo's warm-up card for Bodega Bay: a new wordmark, new themes and general-audience prompts, over the same grid, deal and marking the cruise ran on.](/blog/the-product-did-not-travel/img/vacay-card.png)

</div>

Bodega Bay ran under its own hostname and brand, with three new day themes and a 120-prompt general-audience pool. By its own measure, the generalization worked. The weekend also had a client crash and a missing first-day email. I will come back to both, because their effect on participation is less clear than it first looked.

## What Did Not Travel

Kim hosted the weekend at a house on the coast, Friday through Sunday. I was not there. I set up the event, dropped off laminated player and admin guides the day before, and followed from home through an account that never marked a square. Seven accounts joined: Kim, five guests and me. Four ever marked anything. Kim made 15 of the 27 marks; the three guests who played made the other twelve.

The timeline is short enough to give in full. Friday's card collected thirteen marks between 18:03 and 20:13, most of them Kim's, and two more of Kim's just before 1:00. Saturday's busiest guest stretch was eight marks between 09:46 and 09:57, and no guest marked anything afterward. Kim marked four more squares at 12:56 and 12:57. Then nothing, on any card, for the rest of the event. Three people opened Sunday's cards. None marked a square. That is the failure I need to explain.

<span id="a-debrief-the-bugs-could-not-steer"></span>

### Asking About the Experience

Three days later I sent Kim a debrief. I already knew about the crash and the missing first-day email, and the easy survey would have asked about both and gotten the answer a leading question gets. So I wrote it to answer two questions, why participation collapsed on Saturday and whether a daily bingo card suited a group trip at all, without naming either bug anywhere in the questions. I wanted whatever Kim raised to be Kim's.

Kim rated the game three out of five for how it landed with the group, and was blunt about Saturday: "Friday was the biggest day with all the excitement. The morning maybe started strong but still need my enthusiasm to keep it going. Since a lot of the prompts were outside of the house, peeps gave up a bit since everybody stayed home."

On the squares themselves: "Too hard." On why nobody got a bingo: "I think the prompts weren't quite right for this trip. Or maybe people wanted to just relax and this felt like work." By the end of the weekend, Kim said, the game had become "a shared photo album." Asked about running it again: "Yes, but only if some things changed."

Kim's text to me that afternoon, before the survey, had already put the crash second: "[Mine] stopped working on Saturday but since they didn't seem super interested, generally, I didn't end up reaching out."

The survey put the prompt mismatch and the group's appetite for a game first. The text put low interest first. In both, the crash arrived as an aside, in Kim's proportion rather than mine. That is what a debrief the bugs cannot steer buys. It is still one host's account of the guests' experience. I have no debrief from the guests themselves.

<span id="the-host-was-the-notification-system"></span>

### The Host Was the Channel

Asked how people found out a new day's card was live, Kim picked "I told them in person." Asked whether the emails arrived when expected, Kim answered "Yes, felt right," although the first day's email had never gone out. That establishes the host as a channel people used. It cannot establish that nobody used email or noticed its absence, because one host's answer does not describe every guest's inbox.

PostHog recorded fourteen client errors at 14:38 on Saturday: a Firestore internal assertion followed by three crash screens, all on one device. Kim's text independently says the app stopped working that day. A crash on the day participation died looks like the cause, and the timestamps say it was not, at least not for the guests. Their last mark preceded the recorded crash by four hours and forty-one minutes, and Kim's last mark preceded it too. The crash cannot explain a gap that opened before it.

But a last mark is not a timestamp for a decision to quit. The morning pause might have ended with another invitation from Kim, and a broken host app could have prevented that invitation. Weak interest and the crash could both have contributed. The crash is worth fixing. A debrief that led with it would have let me fix it and call the weekend explained, and that is the outcome the neutral questions were there to prevent.

### Prompts for Plans That Did Not Exist

Kim's closing answer took responsibility: "I should've known we weren't going anywhere and had less prompts for exploration." That is generous, and not quite fair to Kim. The prompts started as an AI draft, 120 of them, written against the platform's general-audience rules, and Kim rewrote 65 of them over dinner the night before launch. When I asked beforehand whether there were plans to build the schedule around, Kim replied: "No, we have no real plans solidified bc nobody is as much of a Virgo as me." The product asked a host to write a weekend's worth of prompts for plans that did not exist yet, starting from a draft that assumed there would be some.

By my rough count, about a third of the final squares required leaving the house: a walk on the dunes, a whale spout, a boat name in the harbor. Of the 27 marks recorded, 26 were for things possible at home, and the dunes walk was marked once. That is consistent with Kim's explanation. It does not show that players marked every feasible square or that every line was blocked. Showing that would take each player's actual board against what happened that weekend.

<div class="figure-pair">

![A second-day card dealt from Bodega Bay's pool on demo data. The six marked prompts were marked by real players that weekend. This illustrates the indoor/outdoor mismatch; it does not reconstruct a player's board or prove that a bingo was impossible.](/blog/the-product-did-not-travel/img/vacay-saturday-card.png)

![A demo leaderboard with invented names and the real weekend's spread of marks: one player far ahead, a few squares for everyone else, and no daily First to BINGO on any day.](/blog/the-product-did-not-travel/img/vacay-bodega-ranks.png)

</div>

The occasion differed too, in ways no prompt pool fixes. Six people resting over a weekend had fewer chances to build a habit than sixteen people together for nine nights, and even the cruise did not work at first; a trip the length of a weekend would have ended before the fix that got it going. And there was no prize. I had asked Kim to set up something small for the most bingos, the first bingo and the most-liked photo; there was not one in the end. The cruise did not have a real prize either, but it had sixteen people keeping score of each other, which is its own kind of stakes. Better prompts might have helped Bodega Bay. The group might also simply have preferred a weekend without a game.

## Rereading the Success Case

A failure on the second event makes the first event legible, and this is the part I find most useful. I had read the cruise as a success of the build: offline marking at sea, daily cards, a leaderboard and a finale. With Bodega Bay in mind, I went back to when people marked squares and what they said about doing it.

**Players often marked yesterday's card, at the table.** Of 703 main-day marks before the standings froze, 288, or 41%, came after the next day's card had already unlocked. And 294 of all 921 marks, 32%, landed between 19:00 and 20:59 ship time, the busiest two hours of the day. The players supplied the setting. Asked to describe a moment they pulled out their phone to mark a square, one answered: "Group gatherings for lunch/dinner to recall the previous evenings activities." Another recalled sitting down to dinner the day after a big night out and realizing how many squares they could mark. A third learned during a group discussion that previous days' squares could still be marked. One deliberately played alone "to avoid having my phone be a social distraction," and joined in only when the group was already talking about it.

**Conversation and competition both mattered.** Asked what brought them back, four of the six respondents picked "People kept bringing it up in conversation," four picked "Not wanting to fall behind," and four picked "Chasing a bingo." None picked the photos, which Kim had described as the remaining use at Bodega Bay. The host mattered too: three of those six said my group-chat posts made them open the app often or almost every time.

<div class="figure-pair">

![The cruise's leaderboard on demo data with invented names. Shared rankings gave the group a way to compare progress.](/blog/the-product-did-not-travel/img/gcb-ranks.png)

![The feed for proofs, shared tallies and bingos, in the cruise's neon theme. The software gave the group's conversation a shared record.](/blog/the-product-did-not-travel/img/gcb-feed.png)

</div>

**Specific prompts stayed with people.** Three of the five respondents who named a memorable square chose one built around a drag star performing on that sailing. None of them could have appeared on any other event's card. One asked, unprompted, for more squares specific to the day. That is nearly the same request Kim made about Bodega Bay, from the opposite end of the success spectrum.

**The host adjusted the game while it ran.** The first two main cards each produced one bingo, both claimed days later. Before main day three I shipped [an easy mix](https://github.com/nathanjohnpayne/fiveacross/pull/394) that blended easier squares into the main cards, alongside [a reshuffle](https://github.com/nathanjohnpayne/fiveacross/pull/383) for untouched cards. Main day three's cards produced eight bingos and nearly twice day two's marks. The itinerary changed too, so that is a correlation and not proof, but four of the five respondents said they noticed the squares get easier and that bingos suddenly felt achievable. Only one of them ever used the reshuffle.

Put those together and the product the cruise was running on had more than one part: software that let players catch up on yesterday's card and see who was ahead, prompts written for that sailing, sixteen people who met at dinner for nine nights and made the talking a ritual, and a host who kept bringing it up and adjusted difficulty while the event ran. Bodega Bay had the software. It had prompts started from a general-audience draft for a weekend with no plans, six people who stayed home to rest, and a host supplying the enthusiasm in person, by Kim's own account, with the host's own app breaking on Saturday afternoon. The two events cannot rank those differences. They do show that the conditions around the software had never been specified as carefully as the data model, and that generalizing the software did not carry them along.

### A Rationale Is Not a Finding

One of the decisions on the project page for this app is "Assume the connection is already gone." Its rationale reads: "The moments worth capturing are the ones furthest from a signal." I wrote it, and at the time it seemed obviously true. The marking data describes a different world: people at a dinner table, recalling what happened yesterday. Whether they had a signal while they did it, the record does not say. A fresh PostHog check found real request failures on the cruise, fifteen exception events carrying `auth/network-request-failed` across five sessions for one recorded user on July 18–19, but none of those sessions contained a mark and none of the marks that carried a retry queue fell in the dinner window. The record neither confirms nor refutes that offline support earned its keep, and the [project page](/projects/five-across/) now says so.

That is a small error with a general shape. A rationale written before real use is a hypothesis, and it reads exactly like a finding. The only way to tell them apart is to go back after the event and check it against what people did, and to say plainly which parts the record still cannot settle.

## Where the Next Six Weeks Went

This is the part I would rather not write, so it is the part I should.

In the six weeks after Kim's debrief, the repository took 268 commits. By a rough keyword count, about 59 of them touched hostname routing, sign-in, the edge router and deployment, and about 58 touched dependencies, CI and review tooling. About 11 touched prompts or prompt pools, and about 14 touched email and notifications. Keyword matches are not a division of working time, the categories overlap, and the counts say nothing about what a different allocation would have produced. What they do show is where the commits went, and it was not where the evidence pointed.

Some of the work did answer the feedback. Six days after the debrief, the organizer-wizard spec added an [occasion matrix](https://github.com/nathanjohnpayne/fiveacross/pull/811): the first question a new host answers is what kind of occasion this is, and the answer picks starter prompts and a schedule shape. That is close to what Kim asked for. [Community prompts](https://github.com/nathanjohnpayne/fiveacross/pull/845) shipped the next day, letting players suggest squares, which three of the five cruise respondents had asked for.

The fair counterargument is that most of the plumbing is not optional. [Self-service event creation](https://github.com/nathanjohnpayne/fiveacross/issues/785), the thing that would let an organizer write prompts for their own occasion without me, is blocked on platform prerequisites, and every live event so far was, in the [epic's](https://github.com/nathanjohnpayne/fiveacross/issues/786) words, "hand-seeded, hand-hosted, and hand-registered." I accept that argument for some of the six weeks and not for all of them. The platform work was specified, reviewable and satisfying to close. The product work was none of those, and none of the prerequisites stood between me and a cheaper test: a card prepared by hand with a willing host around things possible at the house, a planned group session, and a check on whether anyone came back at the next opportunity. That experiment needs a group, not wildcard routing.

## The Stop Condition

It is worth being precise about what the second event did and did not test. It tested whether the platform could run an event it was not built for, and the answer was yes. It tested whether a host other than me could run it, and the answer was yes, with Kim doing by hand much of what the product should have been doing. It did not test whether the product works without me, because I seeded the event, registered the hostname, supplied the prompt draft and coached Kim by text.

The requirements document's self-service exit condition is that "an organizer can launch and run an event without developer intervention." That is a setup test, and a useful one. Sustained participation needs its own test, sized to the occasion. For a weekend, I would agree with the host in advance on the next planned opportunity to play after the introduction, then record who returns, whether the host had to invite them, whether the squares fit what happened, and what people say about playing or opting out. If people return only when invited and enjoy it, the next work is the host's tools. If they return on their own, the next work is finding out what prompted them. If they still find it work, the next work is the occasion or the format, before any reminders.

That leaves the host's role open on purpose. The product might help organizers lead a ritual, fit occasions where one already exists, or eventually keep itself in the conversation without a host. Two events do not choose among those. They do say which question to ask next, and it is not a question about routing.

## What Transfers

The specific lessons are about a bingo game. Three of them are about any one-off that someone wants to turn into a product.

**Hand the second event to someone else, and debrief them so your known bugs cannot lead the answers.** If I had hosted Bodega Bay myself, I would have done the nudging, blamed the crash and never heard that the prompts were wrong for the weekend. Keeping the questions neutral is what made Kim's answers about the prompts believable.

**When the second event fails, reread the first.** The best explanation for Bodega Bay was sitting in the cruise's timestamps the whole time: 41% of main-day marks backfilled, a third of all marks in the two dinner hours. I had read those numbers as engagement. They were a description of the product.

**Know which system is the truth.** PostHog recorded six marks at Bodega Bay. Firestore has twenty-seven. If I had published the analytics figure, this post would have described a different failure. Pick the system that holds the state, and count from there.

The cruise worked, and it is still the best week the app has had. What it was doing well is most of what I need to build next, and less of it than I assumed was in the code that traveled.
