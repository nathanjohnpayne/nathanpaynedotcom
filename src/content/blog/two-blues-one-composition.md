---
title: "Two Blues, One Composition: How a Design Critique Became a Forensics Exercise"
seoTitle: "Two Blues, One Composition"
shortTitle: "Two Blues, One Composition"
description: "I asked Claude to scrutinize my projects page against Mondrian's principles, expecting adjectives. It sampled pixels instead and found two blues in one composition—one of which I had put there on purpose. The real problem was coherence: one interface quoting two paintings. Settling it took two museum digitizations, and the least reliable data in the entire exercise turned out to be the model's own memory."
seoDescription: "A design critique became a forensics exercise: pixel sampling, museum scans, and the palette rule behind this site's Mondrian-inspired pages."
category: "Building This Site"
author: "Nathan Payne"
date: 2026-06-11
tags: ["AI", "Design", "Systems", "Engineering"]
image: "/og/blog/two-blues-one-composition.png"
keyTakeaways:
  - "Ask an agent for data, not adjectives. A design argument that would stall on taste becomes a measurement as soon as the model samples the pixels—and the samples are themselves a reproduction, with a pipeline of their own."
  - "Make the model cite its sources exactly where it sounds most certain: three canonical color values recalled from training data did not survive contact with two museum digitizations. The medians that replaced them are properties of files, not of paintings—hue anchors, not targets."
  - "Grep the source and the built artifact; each hides a class of drift the other exposes. rgba() plane literals defeat a hex search of the source, then minify into hex-searchable form—while in the artifact, the minifier quietly merges duplicate rules and moves your counts."
  - "Sequence a zero-pixel refactor with grep-able acceptance criteria ahead of the change it enables, and the agent can verify its own plumbing while the judgment calls stay with you."
pullquotes:
  - text: "Provenance is invisible at render time. Coherence is the only thing that survives to the screen."
    label: "The design principle"
    accent: blue
  - text: "The least reliable data in the entire exercise was the model's memory."
    label: "Where the forensics pointed"
    accent: red
  - text: "The codebase had already voted for the solution; it just had not been asked the question."
    label: "What the built CSS knew"
    accent: yellow
  - text: "A museum hangs a 1921 canvas and a 1930 canvas in different rooms, and nobody calls that incoherent."
    label: "The page is the unit of consistency"
    accent: blue
  - text: "The agent does the plumbing. I ratify the judgment."
    label: "Four decisions, one evening"
    accent: red
sidebar:
  - type: mermaid
    title: "Two palette registers across one site"
    description: "Nathanpayne.com branches into a high-chroma 1930 register for the homepage and a softer 1921 register for interior pages, with distinct red, yellow, and blue values in each."
    content: |
      graph TD
          SITE["nathanpayne.com"] --> HOME["Homepage<br/>1930 register"]
          SITE --> INT["Interior pages<br/>1921 register"]
          HOME --> H1["#DA2418"]
          HOME --> H2["#F0C800"]
          HOME --> H3["#0A5C9E"]
          INT --> I1["#E8784A"]
          INT --> I2["#E3D477"]
          INT --> I3["#2080CA"]
          style H1 fill:#DA2418,stroke:#8a1610,color:#fff
          style H2 fill:#F0C800,stroke:#a08600,color:#333
          style H3 fill:#0A5C9E,stroke:#063a64,color:#fff
          style I1 fill:#E8784A,stroke:#9c4f2f,color:#000
          style I2 fill:#E3D477,stroke:#998e4a,color:#333
          style I3 fill:#2080CA,stroke:#14527f,color:#000
    caption: "One register per room: the homepage opts into 1930; every interior page defaults to 1921. No page mixes."
---

On June 11, 2026, I handed Claude two screenshots of my [projects page](/projects/) and one sentence: scrutinize this layout against Mondrian colors and design principles. The page quotes Mondrian openly—black lattice, colored planes, cream field—and I wanted to know how well the quotation held up. I expected adjectives. What I got back was a Python script, a measurement—two different blues in one composition, one of which I had put there on purpose—and, once the argument settled, a product problem sharper than the one I asked about: one interface mixing two visual registers, each color's defensible pedigree doing nothing for the coherence of the whole. By the end of one evening the work had produced sampled medians from two museum digitizations, four issues and four pull requests, one palette architecture, and a correction record in which the most confidently wrong source was not my CSS and not my screenshots. It was the model.

## The finding: two blues in one composition

The sampled palette told a story I half knew and half did not. The red sampled `#C01D18` on both screenshots—one 8-bit step per channel off my `--red` token `#C11D19`, consistent across planes, so token discipline was holding there. The yellow sampled `#D9B314` against a token of `#D9B111`; Claude called it mustard rather than cadmium, a value step down from anything Mondrian painted. And the blues came back as two different colors: `#224089` on the [Mergepath](/projects/mergepath/) plane and `#2280CA` on the [Friends & Family Billing](/projects/friends-and-family-billing/) plane—tokens `#223F89` and `#2080CA`. An ultramarine and a cerulean, sitting in the same composition. The one-to-three-step deltas between samples and tokens are what lossy screenshots do to flat color; the plane attribution was exact. Worth noticing already: the screenshot samples are themselves a reproduction with an unrecorded pipeline—the same epistemic status the rest of this post assigns to museum JPEGs.

The verdict was direct: Mondrian, Claude asserted, never ran two blues in a single painting—within a composition, each primary appears at exactly one hue. No citation came with it; it arrived from the same memory whose canonical hexes collapse later, and I never verified it, so it stays a model hypothesis. The diagnosis built on it was that the cerulean looked like token drift—two blues that probably arrived in different PRs rather than a deliberate choice—and the prescription was to keep the ultramarine and kill the cerulean. It also ranked my red as "matching neither era": too dark for the 1930s cadmium, too red for anything earlier. Hold that claim; it gets half retracted later.

There was a structural critique too—the page reads as rows wearing a Mondrian skin, every horizontal gutter slicing the full width, all the saturated color hugging the right rail—but that work deserves its own ticket and its own post. This one is about the colors, where the argument happened.

## The counter: I had a source

The drift diagnosis was wrong, and I could prove it. The cerulean was not an accident. It was sampled from a specific painting: [*Composition with Large Blue Plane, Red, Black, Yellow, and Gray*](https://dma.org/art/collection/object/4348683), 1921, Dallas Museum of Art. I sent Claude a poster reproduction of it (not published here; the image below is the museum's digitization, which enters the story two sections down).

![Composition with Large Blue Plane, Red, Black, Yellow, and Gray, 1921. Piet Mondrian, oil on canvas, Dallas Museum of Art, accession 1984.200.FA. This is the museum's digitization—the file sampled later in this post, not the poster the argument here ran on, which is not published. Along the top edge sits the printed label bar of an X-Rite ColorChecker chart; the chart's color patches are cropped out of this copy, so it documents that a reference was present at capture, not that the file was calibrated against it.](/blog/two-blues-one-composition/img/composition-large-blue-plane-1921.jpg)

Claude sampled the poster the same way it had sampled my screenshots and conceded the point with interest. The poster's blue read `#028DE2`—my `#2080CA` token a slightly tempered but defensible match. The concession went further than I pushed it: the same painting's field planes sampled as cool grays close to the `#DDE1E5` gray-blue plane Claude had dinged, and its black plane as soft charcoal, not far from the `#333333` I use. Three of the audit's "violations" turned out to have citations.

But the critique did not dissolve. It transformed into something sharper that no longer needed the unverified universal at all. The problem was never any single hue, and never what Mondrian did across his career. It was that I was citing two paintings in one composition. The ultramarine sits with the palette of a 1930 canvas; the cerulean, the gray-blue, and the charcoal with the 1921 one. (From here on, "the 1921 register" and "the 1930 register" name the palettes sampled from those two specific reproductions—not eras of Mondrian's work.) Each painting is internally consistent: the 1921 canvas pairs its cerulean with a vermilion orange-red and a pale lemon yellow—medians `#FC7C5A` and `#F1DF75`—not with a brick red and a mustard. A viewer sees none of that provenance—only one composition whose planes disagree.

Provenance is invisible at render time. Coherence is the only thing that survives to the screen. That is the design principle I took away, and it generalizes past Mondrian: a sourced decision and an accidental one look identical in the browser if the result is incoherent either way.

## The page is the unit of consistency

The resolution was not to pick a winner. It was to notice that the unit of compositional consistency is the viewport, not the site. A museum hangs a 1921 canvas and a 1930 canvas in different rooms, and nobody calls that incoherent. So the site got rooms: the homepage keeps the high-chroma 1930 register, and every interior page—projects, blog, resume, anything added later—moves to the softer 1921 register. No page mixes. That is the entire rule.

The functional logic runs the same direction. The homepage is a poster: high impact, low text, the place where the instant "Mondrian" recognition needs to land. The 1930 primaries earn their chroma there. Blog and project pages are reading surfaces, and 1921's quieter cerulean, vermilion, and lemon sit next to body text without shouting at it. The conceit is honest: finished statement out front, working-period palette where the process and the writing live. Form maps to content.

## What the built CSS knew that I did not

Before writing the change, Claude pulled the production stylesheet and audited it—not my source repo but the shipped artifact (`/_astro/global.XofGYe7g.css`, fetched 2026-06-11), validated against `src/styles/global.css` on `main` at `9d6139f`. The first thing it found was that my two blues were not just two colors. They were two tokens, sitting side by side in `:root`:

```css
--blue: #223f89;
--lightblue: #2080ca;
```

Deliberate, exactly as I had said. But the audit kept going, into the places a hex search of the source cannot see. The `.post-card` hover ring baked ultramarine in as `rgba(34, 63, 137, 0.18)`—blue at exactly 18% opacity, which the minifier ships as the eight-digit hex `#223f892e`. Six `[data-accent=*]` scopes defined `--accent-soft` as `rgba()` literals with the plane colors baked in numerically—`rgba(34, 63, 137, .12)` and friends—and one scope's `--accent` was itself a raw `#5B5F64` with no `:root` token behind it. Every one of those would have silently survived a token remap, shipping a mixed register through the back door of the exact feature meant to prevent one.

An earlier version of this post called those literals "invisible to any hex search," and that is true of exactly one surface. In the source, `rgba(34, 63, 137, .12)` defeats a grep for `223f89`. In the shipped artifact it does not: the minifier flattens every `rgba()` to eight-digit hex, so the same grep that misses the literal in source finds `#223f891f` in the build—while the artifact conceals different things instead, like the duplicate-rule merging that moves counts in the post-ship audit below. Source and artifact each hide a class of drift the other exposes. The audit had to grep both.

The audit also corrected itself along the way. Its first pass found four of the six `--accent-soft` literals; the other two, and the raw `--accent`, arrived in an addendum the ticket labels "same problem class, missed by the original audit." Its first pass claimed the gray-blue `#DDE1E5` had no token behind it; the deeper pass found a per-scope `--project-bg` system that the three raw `background` declarations were bypassing. The addendum exists because I asked Claude to verify its own extraction before I would accept a ticket built on it. The errors were real, the corrections were real, and neither would have surfaced without the demand.

The best discovery was architectural. My pages already carry `data-accent` attributes that redefine `--accent` and `--accent-soft` per scope. The theming machinery the palette split needed was not new work. The codebase had already voted for the solution; it just had not been asked the question.

## Make the model cite its sources

The palette ticket needed target values for the 1930 register, and Claude supplied them from memory: red `#DD0100`, blue `#0A4A9F`, yellow `#F8D000`—the "commonly cited screen approximations" of classic Mondrian. I asked one question before accepting them: did you confirm these anywhere beyond the two images I provided?

The honest answer was no. My site's colors had been verified against the live CSS, ground truth for a website. The 1921 palette traced to exactly one source, my marketing poster. The 1930 values traced to nothing but training data. So Claude went and got primary sources—the Dallas Museum of Art's digitization of the 1921 painting and the Kunsthaus Zürich's digitization of [*Composition with Red, Blue and Yellow*](https://collection.kunsthaus.ch/en/collection/item/2455/), 1930—and sampled both with per-channel medians over each plane's pixels.

![Composition with Red, Blue and Yellow, 1930. Piet Mondrian, oil on canvas, 45 × 45 cm. Kunsthaus Zürich, inventory 1987/0028, donated by Alfred Roth, 1987. No calibration reference is visible anywhere in this frame, and the file carries no embedded ICC profile—at plane scale the sampled red leans orange, the blue leans cyan, and the yellow carries ninety-six years of softening that no pop-culture reproduction shows.](/blog/two-blues-one-composition/img/composition-ii-red-blue-yellow-1930.jpg)

The 1921 medians vindicated my poster. The museum file's blue medians `#0383E3` against the poster's `#028DE2`: nearly identical. The gray plane, `#DADFE5` against my `#DDE1E5`: inside the noise. The black plane, `#323137`—so the `#333333` token I have been running since the beginning sits within noise of *that canvas's* black. Whether it suits the 1930 canvas is a different question: that file's black plane medians far darker, `#151A1A`, and the homepage black became one of the decision checkboxes below.

The 1930 medians dismantled the model's own numbers. The red plane of the Kunsthaus reproduction medians `#DE2822`—visibly orange-leaning, with a real green channel, nothing like the pure `#DD0100` Claude had cited. Which means my brick `#C11D19`, the token that "matched neither era," was hue-correct against this reproduction all along and merely dark. The blue medians `#025D9E`, distinctly more cyan than the violet-leaning `#0A4A9F`. And the yellow medians `#EEDB6E`—soft, aged cadmium, nowhere near the `#F8D000` of pop-culture Mondrian, because ninety-six years of paint chemistry have opinions that posters do not.

```mermaid title="Cited colors compared with museum-file medians" description="Each color recalled by the model—red, blue, and yellow—is paired with the median sampled from the corresponding museum reproduction, revealing material differences between citation and file."
graph LR
    MR["Cited red<br/>#DD0100"] -.->|"scan median"| CR["Sampled red<br/>#DE2822"]
    MB["Cited blue<br/>#0A4A9F"] -.->|"scan median"| CB["Sampled blue<br/>#025D9E"]
    MY["Cited yellow<br/>#F8D000"] -.->|"scan median"| CY["Sampled yellow<br/>#EEDB6E"]
    style MR fill:#DD0100,stroke:#8a0100,color:#fff
    style CR fill:#DE2822,stroke:#8d1a16,color:#fff
    style MB fill:#0A4A9F,stroke:#062f66,color:#fff
    style CB fill:#025D9E,stroke:#013a63,color:#fff
    style MY fill:#F8D000,stroke:#a68b00,color:#333
    style CY fill:#EEDB6E,stroke:#9c8f47,color:#333
```

The least reliable data in the entire exercise was the model's memory. Not my CSS, not my screenshots, not even my marketing poster. The confidently recalled canonical values were the ones that did not survive contact with a primary source. The fix was not a better model; it was a procedural habit. Ask where a number came from. If the answer is "everybody cites it," make the agent go find the object.

### The numbers, and how to reproduce them

An earlier version of this post asserted these medians without the method, the inputs, or the uncertainty—and reported a pixel count, 468,315 for the 1930 red, that no stated mask rule reproduces. The count is gone. Everything else is checkable, because both reproductions ship with this site.

The inputs are the two JPEGs committed at `public/blog/two-blues-one-composition/img/`: `composition-ii-red-blue-yellow-1930.jpg` (1183 × 1200 px, sha256 `cf3345af4c5c7456d061f853ed5e7749eae22392df87c8b1012a339c81f07ccd`) and `composition-large-blue-plane-1921.jpg` (996 × 1200 px, sha256 `97e0ef7349d4346002045fa5b96339b8beb47a033284328a27adf8ab2f1b13cb`). Neither file carries an embedded ICC profile. That absence is itself a finding: macOS `sips` reports "sRGB IEC61966-2.1" for both, but that is ColorSync substituting its default for untagged RGB—the tool supplying a value, not reading one. Both files are untagged, conventionally interpreted as sRGB, and no calibration transform was applied anywhere in this analysis, because none is documented for either file. The same goes for the charts: the 1921 file shows only the printed label bar of an X-Rite ColorChecker, its color patches cropped out, and the 1930 file shows no calibration reference at all. An earlier version called these "two museum-grade color verifications"; they are two files, one with a cropped chart and one with nothing.

The statistic is a per-channel median over an HSV-masked plane:

```python
# python3, Pillow only. No calibration transform is applied; none is documented.
from PIL import Image
import colorsys, statistics

def median_plane(path, hue_lo, hue_hi, s_min=0.18, v_min=0.25):
    px = list(Image.open(path).convert('RGB').getdata())
    hit = []
    for (r, g, b) in px:
        mx, mn = max(r, g, b), min(r, g, b)
        if mx / 255 < v_min or (mx and (mx - mn) / mx < s_min):
            continue
        h = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)[0] * 360
        if (hue_lo > hue_hi and (h >= hue_lo or h < hue_hi)) or (hue_lo <= h < hue_hi):
            hit.append((r, g, b))
    med = [int(statistics.median([p[i] for p in hit])) for i in range(3)]
    return len(hit), '#%02X%02X%02X' % tuple(med)
```

Hue windows: red 340°–25°, yellow 35°–75°, blue 180°–260°. On the committed files this reproduces every chromatic median above to within three 8-bit steps per channel—1930 red `#DE2923`, blue `#015D9D`, yellow `#ECD971`; 1921 blue `#0383E2`. The two near-neutral 1921 planes cannot be isolated by hue, and the function above does not isolate them either—so those two rows are **not** reproducible from what is published here, and the honest thing is to say so. Adding a value split to a low-saturation mask (`s < 0.12`, then banding on value) separates three neutral regions rather than two: a dark band returning `#35353B`, a mid band returning `#BABBBB`, and the canvas ground at `#DDE1E6`. The published black is within four steps of the dark band. The published gray is within three steps of **the ground**, not of the mid band—which suggests that measurement was reading the canvas rather than a gray plane. And the robustness the deleted pixel count was standing in for is better shown directly: the 1930 red median holds at `#DE2922`–`#DE2923` across every saturation threshold from 0.1 to 0.75.

What none of this measures is paint. Between canvas and number sit gallery lighting at capture, each museum's unrecorded imaging and color-management pipeline, downscaling and JPEG recompression for the web, ninety-six and one hundred five years of ageing and any restoration, and the display you are reading this on. Every median above is a property of a file, not of a painting. The tickets say the same thing in four words—"treat sampled values as hue anchors"—and the shipped palette below takes them at their word.

## Four decisions, in sequence

The work at the center shipped as two tickets in strict sequence—[#497](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/497) and [#498](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/498)—and the sequencing is the part I would defend hardest. The first, shipped as [PR #499](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/499), changed zero rendered pixels: pure plumbing that routed every palette color through a custom property and re-derived every baked wash from its token. Because nothing visible was allowed to change, the acceptance criteria could be brutal and mechanical—grep for `dde1e5` and get exactly one match, grep for baked `rgba()` plane literals and get zero. A refactor with falsifiable acceptance criteria is a refactor an agent can verify itself against.

The second, shipped as [PR #500](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/500), was the values diff the plumbing made safe: 1921 as the `:root` default, one `[data-palette="1930"]` override block, the homepage as the single page that opts in. The sequence was strict in the literal sense: #499 merged, #497 closed one second later, and #500 did not open for another thirty-one minutes. Every judgment call—the homepage black plane, the interior blue, the wash derivation, the token retirement—was an explicit decision checkbox with a recommendation prefilled. The one genuinely risky item, a contrast audit for accent-colored text on cream, got its own line and found real failures: 1921 yellow on cream measured about 1.2:1 on two hover rules, and the amendment recording it widened the audit's own scope—red failed the same way, and blog, 404, and resume all run red. The fix shipped as a derived `--accent-text` token, `color-mix(in srgb, var(--accent) 45%, var(--ink))`.

The correction record across those two tickets runs to ten entries, not the two this post originally counted: #497's five-row addendum, #498's four validation amendments, and a dated revision note that re-anchored the 1930 red and blue after the museum sampling. The sharpest, amendment A1, was a blocker for the ticket's own premise, caught in validation: frontmatter `accentColor` inline styles would beat the `[data-accent]` scopes, so a `:root` remap alone would not have recolored a single project page. An agent that corrects its own plan ten times in one evening sounds bad until you consider the alternative—an agent that corrects it zero times and ships all ten.

And the evening did not stop at two tickets, as an earlier version implied. [#501](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/501)/[PR #503](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/503) routed the alpha-baked ink and veil colors through tokens—a third refactor in the same mold as the first, and the source of fifty-five of the seventy-six `color-mix()` calls the audit below counts. [#502](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/502)/[PR #504](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/504) handled the OG images. Four issues and four pull requests, all inside two hours and fifty-two minutes of one calendar evening: #497 opened at 6:03 p.m. Pacific, #504 merged at 8:55.

The agent does the plumbing. I ratify the judgment. Even "the agent" undersells the division: all four implementation PRs ran on `codex/*` branches, while the sampling, the critique, and the audits were Claude's—one agent analyzed and wrote the tickets, another implemented against them. That division of labor is the whole trick, and the checkbox format makes it enforceable instead of aspirational.

## Auditing the shipped site

The post-ship audit came back green where it matters, and it is reproducible: the source is `src/styles/global.css` at `8bebc31`, the commit PR #504 merged, and the artifact is what Astro's default CSS minifier—esbuild—makes of it. `#dde1e5` appears exactly once, as the token definition. The old `#223f89` is gone entirely. Plane-color `rgba()` literals: zero in source, and the artifact carries no `rgba()` notation at all, because the minifier hex-folds it.

The `color-mix()` count is the source-versus-artifact gap this exercise kept finding: seventy-six calls in source, seventy-four in the artifact. This post originally said the minifier "precomputes two," which is mechanically impossible—all seventy-six take a `var()` custom property as their first color argument, and no minifier can resolve a custom property statically. What actually happens is duplicate-rule merging: two of the `color-mix()` declarations each appear twice in source and once after minification, which is why the source carries 76 and the shipped artifact 74. Both counts reproduce; only the explanation was wrong. The attribution matters too, because the count did not come from the two center tickets: it runs 6 at the pre-work baseline, 18 after #499, 21 after #500, and 76 after #503. The third refactor did most of it.

The shipped values need honest labels, and the earlier version of this post got one wrong in the exact register it had just spent a section attacking. The `:root` carries `#E8784A`, `#E3D477`, and `#2080CA`; the `[data-palette="1930"]` override carries `#DA2418`, `#F0C800`, and `#0A5C9E`. The ticket calls the 1930 red and blue museum-derived—`#DA2418` a starting point against the scan median `#DE2822`, `#0A5C9E` against `#025D9E`, with eye-tuning at real plane scale left to the tokens. The yellow is different, and I had mislabeled it. `#F0C800` is not the scan's `#EEDB6E`; it is the pop-culture register the scan contradicts, kept on purpose. The ticket states the tradeoff in as many words—"icon recognition argues for the `#F0C800`–`#F8D000` range; object fidelity argues softer"—and I chose recognition. The homepage black is the same shape of decision: the checkbox recommended darkening it to `#1A1814` on the strength of the 1930 scan's `#151A1A`-reading black plane, named a risk to the interactive Community panel's affordance, and I resolved it to keep `#333333`. Two of the shipped choices sit deliberately against my own evidence, with the reasons on the ticket. On screen you cannot tell—which is the post's thesis doing its job twice more.

The loose end became a ticket before I could list it: #502—OG images still rendered in the 1921 register everywhere, homepage included—was filed thirty-seven seconds after #500 merged and closed by #504 forty-eight minutes later. #504 gave the OG card an optional 1930 palette prop, opted the home template in, and pinned the decision with a vitest lock asserting the opt-in is homepage-only. The projects card needed nothing; #500's default had already put every non-opting surface in 1921.

There are still two blues on the site. One per room.

## What I generalized

Ask for data, not adjectives. An agent with a filesystem and an image library turns a taste argument into a measurement in about four seconds, and everything downstream of a measurement is a better conversation than everything downstream of a vibe. Just keep the epistemics straight: a sample of a screenshot, a poster, or a museum JPEG is a property of that file and its unrecorded pipeline, not of the thing photographed.

Make the model cite its sources, especially when it sounds most certain. The canonical Mondrian hexes arrived with the confidence of a textbook and the sourcing of a rumor; one verification prompt sent the exercise to two museum digitizations that overturned all three values. The failure mode was never the model being wrong—it would have been shipping its memory unexamined.

Grep the source and the artifact both. The `rgba()` plane literals were invisible to a hex search of the source and perfectly findable in the minified build, while the artifact moves counts for reasons of its own, like merged duplicate rules. Each surface conceals a class of drift the other exposes; an audit that reads only one will miss something real.

Sequence the refactor before the change, and keep judgment separate from plumbing. A zero-pixel ticket with grep-able acceptance criteria is the cheapest insurance in this workflow, and decision checkboxes with prefilled recommendations meant the agent never had to guess what I wanted—or I to review whether it had guessed right.

And keep the design principle the argument itself produced: coherence beats provenance. A choice you can cite and a choice you cannot are indistinguishable on screen—I shipped two choices made deliberately against my own museum evidence, and no viewer will ever see the difference. The viewer gets the composition, not the footnotes.

One critique, one counter-painting, two museum digitizations, ten self-corrections, four issues, four pull requests, four decisions. The argument started with an agent telling me my deliberate choice looked like a bug. It ended with the agent's own canonical knowledge overturned by primary sources, two judgment calls recorded against those same sources, and a color system that can prove its own consistency with a grep—of both the source and the build.
