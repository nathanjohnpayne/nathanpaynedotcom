---
title: "I Generalized the Code, Not the Product"
description: "A bingo app built for one nine-night cruise logged 845 marks and 61 bingos. Two weeks and 76 pull requests later, the same code ran a weekend at Bodega Bay for a different host and logged 27 marks and no bingos, with nothing after 12:57 on Saturday. The platform work had succeeded. What made the first event work—prompts written for that sailing, a group that made it a dinner ritual, a host tuning it live—had never been in the code, and the cruise's own data said so the whole time. A second, different customer is how you find out which parts of a v1 were the product."
seoDescription: "Same code, second event, different host: 845 marks became 27. The platform generalized; the product—occasion-fit prompts, a group that talked about it at dinner, a host tuning it live—did not."
category: "Agent Systems"
author: "Nathan Payne"
date: 2026-09-24
draft: false
tags: ["Product", "Consumer", "Live Ops", "Platforms", "Evidence"]
image: "/og/blog/the-product-did-not-travel.png"
keyTakeaways:
  - "A v1 that works is a bundle of code, content and circumstance, and usage totals will not say which part the customers were there for. A second, different customer will. Two weeks after a cruise logged 845 marks and 61 bingos, the same code ran a weekend for a different host and logged 27 marks and no bingos. The code was the part that traveled. The prompts, the ritual and the host were the product, and none of them was in the repository."
  - "The first event's data held the explanation before the second event ran. On the cruise, 41% of main-day marks were made after the next day's card had already unlocked, and 32% of all marks landed between 19:00 and 20:59. Players were marking at dinner, recalling the night before. I had read those numbers as engagement. They were a description of the product."
  - "Design the debrief so your known bugs cannot steer the answers. The host's debrief pointed at prompts written for plans that did not exist and at a game that felt like work on a weekend meant for resting. The timestamps then split the crash story in two: the guests had stopped four hours and forty-one minutes before the only crash, which plausibly ended the host's promoting and nothing else."
  - "Six weeks of commits went against the evidence. Of 268 commits after the debrief, about 59 went to routing, sign-in and deployment and about 58 to dependencies and tooling; about 11 touched prompts and about 14 touched notifications. The next investment is not hosting infrastructure. It is occasion-fit prompts and a way for the game to stay in the conversation without the host, and the stop condition is a group still playing after day two."
pullquotes:
  - text: "The host was the notification system. When the host's app broke on Saturday afternoon and the host stopped reaching out, nothing else in the product was going to."
    label: "The real channel"
    accent: red
  - text: "Rigor does not make a one-off a product. A second, different use does."
    label: "The test"
    accent: yellow
  - text: "The platform held. Of the 27 squares anyone marked, 26 could be done without leaving the house."
    label: "The layer that failed"
    accent: blue
sidebar:
  - type: text
    content: |
      How things are counted. A mark is a marked, non-free cell on a player's board in production Firestore, read on September 24, 2026. The standings window ends at the event's `frozenAt`; the cruise's 845 marks are the ones inside it, and 921 includes the ceremonial card and later marks. Backfill counts a main-day mark made after the next day's card unlocked, over main days one through eight before the freeze (288 of 703); tutorial days are excluded because they had no real deadline. Hours are local event time: Central European for the cruise, Pacific for Bodega Bay. Bingos are the players' standings totals (61), not the per-day tallies (64), which include three on the ceremonial card.
    caption: "Counting rules for every figure in this post."
  - type: text
    content: |
      What was checked against what. Marks, bingos, proofs and timestamps come from the two production Firestore projects. Crash timing and event counts come from PostHog, which undercounted Bodega Bay's marks (6 against Firestore's 27), so no mark count here comes from analytics. The host's words are from a debrief survey Kim answered on August 11 and from text messages Kim sent me around the event, all quoted with permission; one obvious typo is corrected in brackets. The players' words are from an anonymous cruise debrief with seven submissions, five complete. Commit and pull request figures come from the public repository's history; the post-debrief commit split is a rough keyword count, not a hand classification. The app screens come from the app repository's marketing harness: the real app running over a seeded demo event, with invented names, general-audience prompts and no player photographs. No screen shows production data.
    caption: "Provenance, so a reader can re-check it."
---

At 12:57 on Saturday, August 8, the host of a weekend at Bodega Bay marked a bingo square. Nobody marked another one for the rest of the weekend. The guests had already stopped three hours earlier.

The app was [Five Across](/projects/five-across/), a live multiplayer bingo game I built in eight days for a nine-night cruise in July, for a friend group of sixteen. On the cruise it logged 845 marks and 61 bingos inside the standings window. Two weeks and 76 pull requests later, the same code, now a platform that could run an event it had never heard of, ran its second event for a different host and a different group. It logged 27 marks, from four people, and no bingos. Sunday's two cards collected no marks at all.

I set out to write a post about turning a one-off build into a product, and I had the story ready: here is what I generalized, here is the architecture, here is the second event running on it. The data does not support that story. The platform work succeeded, and the product still did not survive the trip, because what made the cruise work was never in the code. It was in prompts written for one specific sailing, a group big enough and together long enough to make the game a nightly dinner ritual, and a host who promoted it and adjusted it while it ran. The cruise's own data said so before the second event started, and I did not read it that way until the second event failed.

The useful part is the method, because it transfers to any v1 that worked once. A first success is a bundle of code, content and circumstance, and the usage totals will not say which of the three the customers were there for. Handing the second run to a different customer will. Debrief that customer in a way your known bugs cannot steer, then go back to the first customer's data and read it for what the product was rather than for how much of it got used. That is the order the rest of this post follows.

## Built for One Event, Then Generalized

The app was built for one event on purpose. The requirements document listed a multi-tenant product as a non-goal: the schema was scoped to an event, so a future cruise would be cheap, but v1 shipped one active event with no room browsing and no join codes. On day two I wrote a design-only spec for [multi-event schema readiness](https://github.com/nathanjohnpayne/fiveacross/pull/109), a hedge that cost one document and no code. That was the right scope for eight days, and it matters for what follows: rigor was not the missing ingredient. The app had tests, security rules checked against an emulator and a contrast audit across eight themes before it had players. If the gap between a one-off and a product were engineering discipline, this would have been a product on day one.

The cruise ended on July 24. Bodega Bay started on August 7. In the thirteen days between, 76 pull requests merged, most of them turning "the cruise app" into something that could run an event it had never heard of: its own tenant, an event resolved from the hostname instead of baked into the build, a scoring policy stated rather than inferred, and an adult-content posture decided on the server, because the next event was general-audience and the cruise was emphatically not.

The most revealing work was a rename. The schema had a Day field called `port` and event dates called `sailStart` and `sailEnd`, and the prompt pools were named `embark` and `farewell`. [One pull request](https://github.com/nathanjohnpayne/fiveacross/pull/648) renamed them to `place`, `startsOn`, `endsOn`, `easy` and `closing`. Every one of those names was an assumption the cruise had made for me without my noticing, and finding them was the right work. Bodega Bay's production database still stores its easy pool under the legacy value `embark`, a small monument to how deep the cruise had gotten into the data model. None of those assumptions, it turned out, was the one that mattered.

<div class="figure-pair">

![The same engine in two editions. Gay Cruise Bingo's warm-up card, dealt from the cruise's boarding-day prompts in the neon theme the sailing used. Every screen in this post is the real app running over a seeded demo event, with invented names.](/blog/the-product-did-not-travel/img/gcb-card.png)

![Vacay Bingo's warm-up card for Bodega Bay: a new wordmark, new themes and general-audience prompts, over the same grid, deal and marking the cruise ran on.](/blog/the-product-did-not-travel/img/vacay-card.png)

</div>

By its own measure, the generalization worked. Bodega Bay ran under its own hostname and brand, with three new day themes and a 120-prompt general-audience pool. Apart from one client crash on Saturday afternoon and a daily email that skipped the first day, both of which I will come back to, the platform did its job.

## What Did Not Travel

Kim hosted Bodega Bay: a weekend at a house on the coast, Friday through Sunday, with a handful of friends. I was not there. I set the event up, dropped off a laminated player guide and admin guide the day before, and followed along from home through my own account, which never marked a square.

Seven accounts joined: Kim, five guests and me. Four ever marked a square, and Kim made 15 of the 27 marks. The three guests who played made the other twelve between them.

The timeline is short enough to give in full. Friday's card collected thirteen marks between 18:03 and 20:13, the first evening, most of them Kim's, and two more of Kim's just before 1:00. On Saturday morning the guests had their best stretch of the weekend: eight marks between 09:46 and 09:57. That was the last time any guest marked anything. Kim marked four more squares at 12:56 and 12:57, alone. Then nothing, on any card, for the rest of the event. Three people opened Sunday's cards, and none of them marked a square.

### A Debrief the Bugs Could Not Steer

Three days later I sent Kim a debrief. I already knew about the crash and the missing first-day email, and the easy survey would have asked about both and gotten the answer a leading question gets. So I wrote it to answer two questions, why engagement collapsed on Saturday and whether a daily bingo card was the right format for a group trip at all, and I wrote it so that neither was named anywhere in the questions. I wanted whatever Kim raised to be Kim's.

Kim rated the game three out of five for how it landed with the group, and was blunt about Saturday: "Friday was the biggest day with all the excitement. The morning maybe started strong but still need my enthusiasm to keep it going. Since a lot of the prompts were outside of the house, peeps gave up a bit since everybody stayed home."

On the squares themselves: "Too hard." On why nobody got a bingo: "I think the prompts weren't quite right for this trip. Or maybe people wanted to just relax and this felt like work." By the end of the weekend, Kim said, the bingo was mostly doing one thing for the group: it was "a shared photo album." Asked about running it again: "Yes, but only if some things changed."

Kim's text to me that afternoon, before the survey, was plainer still: "They didn't end up wanting to leave the house so I think they felt it was a little overkill .. and most of them are not tech/game savvy so the tolerance was pretty low. [Mine] stopped working on Saturday but since they didn't seem super interested, generally, I didn't end up reaching out. I still think it's a great idea though."

The prompts and the shape of the weekend come first in both. The crash arrives as an aside, in Kim's proportion rather than mine. That is what a debrief the bugs cannot steer buys.

### The Host Was the Notification System

Asked how people found out a new day's card was live, Kim picked one answer: "I told them in person."

That is the detail I keep coming back to. The daily email had a bug that weekend: no email went out for the first day. When the debrief asked whether the emails arrived when expected, Kim answered "Yes, felt right." That is not a contradiction. Nobody was using the email to find the cards, so nobody noticed it was broken. The only channel that worked was the host, and the timestamps show what happened when it stopped. The guests quit on Saturday morning. Kim kept playing into the afternoon. Then Kim's app broke, the group did not seem interested, and Kim, reasonably, stopped reaching out. Nobody else was going to.

There is an easy story available here, and it is half right. PostHog recorded a burst of fourteen client errors on Saturday at 14:38, a Firestore internal assertion and then three crash screens, all on one device, and Kim's text says the app "stopped working on Saturday." A crash on the day engagement died looks like the cause. It was not the cause for the group: the guests' last mark came four hours and forty-one minutes before it. Kim's own last mark came before it too. What the crash plausibly ended was the promoting, by the one person still doing it. The crash is worth fixing. It is not why the guests stopped, and a debrief that led with it would have let me fix it and call the weekend explained.

### Prompts for Plans That Did Not Exist

Kim's closing answer takes the blame for the mismatch: "Thinking about what type of experience this would be good for and how to customize it specifically to that type. I should've known we weren't going anywhere and had less prompts for exploration."

That is generous, and it is not quite fair to Kim. The prompts started as an AI draft, 120 of them, written against the platform's general-audience rules, and Kim rewrote 65 of them over dinner the night before launch. When I asked before launch whether there were event plans to build the schedule around, Kim's answer was "No, we have no real plans solidified bc nobody is as much of a Virgo as me." The product asked a host to write a weekend's worth of prompts for plans that did not exist yet, starting from a draft that assumed there would be some. By my rough count, about a third of the final squares needed the group to leave the house: a walk on the dunes, a whale spout, a boat name in the harbor. The marks show exactly what that did. Of the 27 squares anyone marked, 26 could be done at the house—a toast, a compliment, the hot tub, the fog through the window. The only square that needed the group to go anywhere was a walk on the dunes, marked once. The people who played did every square the weekend allowed, and the rest of each card stood between them and a line of five. That is why there were no bingos. Why most of the group barely played at all is Kim's other explanation: it felt like work.

<div class="figure-pair">

![A second-day card from the real Bodega Bay pool and theme, dealt on demo data. The six marked squares are ones players at the house really marked that weekend: the windblown selfie, the fog, a toast about friendship. The harbor, the trail, the beach and the whale spout are what stood between them and a line.](/blog/the-product-did-not-travel/img/vacay-saturday-card.png)

![The leaderboard that never moved, with invented names and the real weekend's spread of marks: one player far ahead, a few squares for everyone else, and no daily First to BINGO on any day.](/blog/the-product-did-not-travel/img/vacay-bodega-ranks.png)

</div>

Two more differences are structural, and no prompt pool fixes them. Bodega Bay was six people over a single weekend. The cruise was sixteen people for nine nights, and even the cruise did not work at first: its first two days of main cards produced one bingo each, both claimed days later, and things only picked up after the fix I shipped on the night before day three. A cruise the length of a weekend would have ended before the fix. And there was no prize. I had asked Kim to set up something small for the most bingos, the first bingo and the most-liked photo; there was not one in the end. The cruise did not have a real prize either, but it had sixteen people keeping score of each other, which is its own kind of stakes. Six people, most of whom Kim describes as not game-savvy, on a weekend meant for resting, do not generate that on their own.

## Rereading the Success Case

A failure on the second event makes the first event legible, and this is the part of the story I find most useful. I had read the cruise as a success of the build: offline-first marking at sea, frozen daily cards, a leaderboard, a finale. Reading its data again with Bodega Bay in hand, the cruise was a success of something the build only hosted.

**Players marked the day before, at the table.** Of the 703 marks made on main-day cards before the standings froze, 288, or 41%, were made after the next day's card had already unlocked. People were not marking squares in the moment. They were going back to yesterday's card. And 294 of the cruise's 921 marks, 32%, landed between 19:00 and 20:59 ship time, the busiest two hours of the day by a wide margin.

The players' own words match the timestamps. The cruise debrief asked each player to describe a specific moment they pulled out their phone to mark a square. One answered: "Group gatherings for lunch/dinner to recall the previous evenings activities." Another: "Usually when we were sitting down for a dinner the next day after a big night out and talking about what happened then I realized how many bingo squares we probably checked off." A third described learning at dinner, "after discussing with as a group," that a square from a previous day could still be marked. One played alone on purpose, "to avoid having my phone be a social distraction," and joined in only when the group was already talking about it.

**The pull was social, not mechanical.** Asked what kept them coming back, four of the six players who answered picked "People kept bringing it up in conversation," four picked "Not wanting to fall behind," and four picked "Chasing a bingo." None picked the photos—the thing Kim said the game had turned into at Bodega Bay. The biggest day of the trip, the second-to-last, which alone carried more than a third of the standings marks, was explained the same way: "We were done with excursions and parties and had the opportunity to come together and discuss as a group." The host mattered too: when I posted about the game in the group chat, three of the six players who answered said it made them open the app often or almost every time.

<div class="figure-pair">

![The cruise's social loop, on demo data with invented names: a leaderboard where everyone can see who is ahead and who is falling behind.](/blog/the-product-did-not-travel/img/gcb-ranks.png)

![The feed that carried the running conversation: proofs, shared tallies and bingos, in the cruise's neon theme.](/blog/the-product-did-not-travel/img/gcb-feed.png)

</div>

**The memorable prompts were specific to that sailing.** Asked which square they still remembered, three of the five players who answered named a square built around a drag star performing on that sailing. None of them could have appeared on any other event's card. One player, unprompted, asked for more of that: "could be fun to have a square or two each day that are more specific to that day." That is nearly the same request Kim made about Bodega Bay, from the opposite end of the success spectrum.

**The host tuned it live.** The first two days of main cards were hard enough that each produced exactly one bingo across the whole group, and both of those were claimed days later. On the night before day three, I shipped [an easy mix](https://github.com/nathanjohnpayne/fiveacross/pull/394) that blended easier squares into the main cards, alongside [a reshuffle](https://github.com/nathanjohnpayne/fiveacross/pull/383) for untouched cards. Day three's cards produced eight bingos and nearly twice the marks of day two. The itinerary changed too, so that is a correlation and not proof. But the debrief is consistent with it: four of the five players who answered said they noticed the squares get easier and that bingos "suddenly felt achievable." Only one of them ever used the reshuffle.

Put those together and the product the cruise was actually running on has three parts:

1. prompts written for that sailing, which gave the group something specific to talk about;
2. sixteen people who met at dinner for nine nights and made the talking a ritual; and
3. a host who kept bringing it up in the group chat and adjusted difficulty while the event ran.

None of the three is in the code that generalized. Bodega Bay had the code. It had prompts started from a general-audience AI draft for a weekend with no plans, six people who stayed home to rest for two nights, and a host supplying the enthusiasm in person, by Kim's own account, until the host's own app broke on Saturday afternoon.

## A Rationale Is Not a Finding

One of the decisions on the project page for this app is "Assume the connection is already gone." Its rationale reads: "The moments worth capturing are the ones furthest from a signal." I wrote it, and at the time it seemed obviously true. A ship has satellite internet and dead zones, a game that needs the network at tap time dies exactly when the group is together, and so the app queues marks offline and syncs later.

The marking data does not describe that world. It describes people at a dinner table, recalling what happened yesterday. Offline support was not wasted. Some marks may have been made out of coverage, and the gap between Firestore and analytics on the cruise runs in the direction offline queueing predicts. But the claim that the valuable moments were the disconnected ones was a builder's story, told before there was any usage to check it against, and it was mostly wrong. The project page now says so.

That is a small error with a general shape. A rationale written before real use is a hypothesis, and it reads exactly like a finding. The only way to tell them apart is to go back after the event and check it against what people did.

## Where the Next Six Weeks Went

This is the part I would rather not write, so it is the part I should.

In the six weeks after Kim's debrief, the repository took 268 commits. By a rough keyword count, about 59 of them went to hostname routing, sign-in, the edge router and deployment, and about 58 to dependencies, CI and review tooling. About 11 touched prompts or prompt pools, and about 14 touched email and notifications. The work the evidence pointed at—prompts that fit the occasion, and something other than the host to keep the game in the conversation—got the smallest share.

Two pieces of that work do answer Kim. Six days after the debrief, the organizer-wizard spec added an [occasion matrix](https://github.com/nathanjohnpayne/fiveacross/pull/811): the first question a new host answers is what kind of occasion this is, and the answer picks a starter pack of prompts and a schedule shape. That is close to what Kim asked for when suggesting a customized experience "specifically to that type." And [community prompts](https://github.com/nathanjohnpayne/fiveacross/pull/845) shipped the next day, letting players suggest squares, which three of the five cruise players who answered had asked for.

The fair counterargument is that most of the plumbing is not optional. Self-service event creation, the thing that would let an organizer write prompts for their own occasion without me, is [blocked on four platform prerequisites](https://github.com/nathanjohnpayne/fiveacross/issues/785): wildcard routing, sign-in on arbitrary hostnames, and two more. Every live event so far was, in the [epic's](https://github.com/nathanjohnpayne/fiveacross/issues/786) words, "hand-seeded, hand-hosted, and hand-registered." You cannot hand prompt authorship to hosts without a surface for them to author on.

I accept that argument for some of the six weeks and not for all of them. The tell is where the commits went relative to the evidence. The evidence said the platform worked and the things around it did not, and platform and tooling work received several times the commits that prompts and notifications did. The platform work was specified, reviewable and satisfying to close. The product work was none of those, and it is the work that would have moved the number.

## The Stop Condition

It is worth being precise about what the second event did and did not test. It tested whether the platform could run an event it was not built for, and the answer was yes. It tested whether a host other than me could run it, and the answer was yes, with Kim doing by hand much of what the product should have been doing. It did not test whether the product works without me, because I seeded the event, registered the hostname, supplied the prompt draft and coached the host by text.

The requirements document already names the real test. Its exit condition for self-service is that "an organizer can launch and run an event without developer intervention." I would add one thing to it: the group is still playing after the second day. Both events started with a burst of interest. The cruise had something that carried it through a slow second and third day, and Bodega Bay did not. That is the measurement that separates a product from an app a group tries once.

The next investment follows from that. It is not more hosting infrastructure. It is prompts that fit the occasion, written or at least chosen by someone who will be there, and a way for the game to keep itself in the conversation without the host doing it by hand.

## What Transfers

The specific lessons are about a bingo game. The general ones are about any one-off that someone wants to turn into a product.

**Rigor does not make a one-off a product. A second, different use does.** This app was carefully built from its first day, and it still took a second event, for a different host and a different kind of trip, to find out which parts were the product.

**Hand the second event to someone else, and debrief them so your known bugs cannot lead the answers.** If I had hosted Bodega Bay myself, I would have done the nudging, blamed the crash and never learned that the email was irrelevant. Keeping the questions neutral is what made Kim's answers about the prompts believable.

**When the second event fails, reread the first.** The explanation for Bodega Bay was sitting in the cruise's timestamps the whole time: 41% of main-day marks backfilled, a third of all marks in the two dinner hours. I had read those numbers as engagement. They were a description of the product.

**Separate the reusable code from the content, and do not assume the code is the product.** Here the content was the product: the prompts, the ritual and the host who kept both going. The code was the part that traveled, and it traveled well.

**Know which system is the truth.** PostHog recorded six marks at Bodega Bay. Firestore has twenty-seven. If I had published the analytics figure, this post would have described a different failure. Pick the system that holds the state, and count from there.

The cruise worked, and it is still the best week the app has had. What it was doing well turns out to be most of what I would need to build next.
