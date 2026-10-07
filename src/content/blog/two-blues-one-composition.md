---
title: "Two Blues, One Composition: How a Design Critique Became a Forensics Exercise"
seoTitle: "Two Blues, One Composition"
shortTitle: "Two Blues, One Composition"
description: "Claude found two blues in my Mondrian-inspired projects page. I could defend both sources; the page still looked wrong. Sampling two painting reproductions helped me choose a palette rule, and showed which of the model's numbers had no source."
seoDescription: "A design critique became a forensics exercise: pixel sampling, painting reproductions, and the palette rule behind this site's Mondrian-inspired pages."
category: "Building This Site"
author: "Nathan Payne"
date: 2026-06-11
tags: ["AI", "Design", "Systems", "Engineering"]
image: "/og/blog/two-blues-one-composition.png"
keyTakeaways:
  - "A source can explain why I chose a color without making the page coherent. I gave the homepage and interior pages separate palettes, with one register per page."
  - "The model's remembered hexes matched neither reproduction. The samples describe files, not paint; I used them as hue anchors and kept two deliberate exceptions."
  - "Check source and built CSS. A hex search misses rgba() plane colors in source; minification exposes them but merges duplicate rules and changes counts."
  - "Refactor before changing values. Zero rendered changes and explicit search criteria let the agent verify the plumbing while I made the design decisions."
pullquotes:
  - text: "Provenance is invisible at render time. Coherence is the only thing that survives to the screen."
    label: "The design principle"
    accent: blue
  - text: "The least traceable data in the entire exercise was the model's memory."
    label: "Where the forensics pointed"
    accent: red
  - text: "There are still two blues on the site. One per room."
    label: "The palette rule"
    accent: yellow
  - text: "A museum hangs a 1921 canvas and a 1930 canvas in different rooms, and nobody calls that incoherent."
    label: "The page is the unit of consistency"
    accent: blue
  - text: "Claude wrote the tickets. Codex implemented them. I made the design calls."
    label: "Four decisions, one evening"
    accent: red
---

On June 11, 2026, I handed Claude two screenshots of my [projects page](/projects/) and one sentence: scrutinize this layout against Mondrian colors and design principles. The black lattice, colored planes, and cream field were already there. I wanted to know whether they worked together. I expected adjectives. Claude came back with a Python script and two blues in the same composition. I'd put one of them there on purpose.

That became the real argument. I could defend each color's source, but the page still looked like it was quoting two paintings at once. By the end of the evening, I'd chosen a palette rule, and four issues and four pull requests had shipped it. Claude had sampled two reproductions and revised its own findings along the way. Its most confident color values had no source beyond its memory.

<span id="the-finding-two-blues-in-one-composition"></span>

## Two blues

Claude sampled red as `#C01D18` on both screenshots, at most one 8-bit step per channel from my `--red` token, `#C11D19`. The planes agreed. Yellow came back as `#D9B314` against `#D9B111`; Claude called it mustard rather than cadmium, a value step below anything Mondrian painted. That was Claude's judgment, not something I'd established.

The blues were `#224089` on the [Mergepath](/projects/mergepath/) plane and `#2280CA` on the [Friends & Family Billing](/projects/friends-and-family-billing/) plane, against tokens `#223F89` and `#2080CA`. Ultramarine and cerulean, side by side. The plane attribution was exact; the one-to-three-step sample deltas are what lossy screenshots do to flat color. I hadn't recorded the screenshot pipeline, so these samples carry the same limitation as the reproduced paintings later in the post.

Claude asserted that Mondrian never used two blues in one painting: each primary appeared at exactly one hue within a composition. It gave me no citation, and I never verified the claim. It remains a model hypothesis. From there, it diagnosed token drift, probably from different PRs, and recommended keeping ultramarine and removing cerulean. It also judged my red too dark for the 1930s cadmium and too red for anything earlier. The sampling would later qualify that last claim.

It also thought the page looked like rows wearing a Mondrian skin: every horizontal gutter ran the full width, and all the saturated color hugged the right rail. That deserves its own ticket and its own post. Here, the colors were enough to argue about.

<span id="the-counter-i-had-a-source"></span>

## Where my blue came from

The cerulean hadn't drifted in. It came from a poster of [*Composition with Large Blue Plane, Red, Black, Yellow, and Gray*](https://dma.org/art/collection/object/4348683), 1921, Dallas Museum of Art. I sent Claude that poster. It isn't published here; the image below is the museum digitization Claude sampled later.

![Composition with Large Blue Plane, Red, Black, Yellow, and Gray, 1921. Piet Mondrian, oil on canvas, Dallas Museum of Art, accession 1984.200.FA. This is the museum's digitization—the file sampled later in this post, not the poster the argument here ran on, which is not published. Along the top edge sits the printed label bar of an X-Rite ColorChecker chart; the chart's color patches are cropped out of this copy, so it documents that a reference was present at capture, not that the file was calibrated against it.](/blog/two-blues-one-composition/img/composition-large-blue-plane-1921.jpg)

Claude sampled the poster and conceded the point. Its blue read `#028DE2`, a brighter version of my `#2080CA` token. It also found cool gray fields close to the `#DDE1E5` gray-blue plane it had criticized, and a soft charcoal near the `#333333` I use. Three alleged violations had a source.

That still didn't make the page coherent. I was citing two paintings in one composition. Ultramarine belonged with the palette sampled from the 1930 reproduction; cerulean, gray-blue, and charcoal belonged with the 1921 one. From here on, I call those the 1921 and 1930 registers. The names refer to these two reproductions, not periods in Mondrian's work.

The 1921 painting pairs cerulean with vermilion orange-red and pale lemon yellow, medians `#FC7C5A` and `#F1DF75`. I'd paired it with brick red and mustard. A viewer sees the mismatch without seeing any of my sources.

Provenance is invisible at render time. Coherence is the only thing that survives to the screen. A deliberate choice with a citation can look just as wrong in the browser as an accident. That was the useful part of the critique, and it didn't depend on Claude's unverified rule about Mondrian.

## The page is the unit of consistency

I decided each page needed a consistent palette. The whole site didn't need just one. A museum hangs a 1921 canvas and a 1930 canvas in different rooms, and nobody calls that incoherent. The homepage kept the high-chroma 1930 register. Every interior page—projects, blog, resume, and anything added later—moved to the softer 1921 register. No page mixes. That's the whole rule.

```mermaid title="Two palette registers across one site" description="Nathanpayne.com branches into a high-chroma register sampled from the 1930 reproduction for the homepage, and a softer register sampled from the 1921 reproduction for interior pages, with distinct red, yellow, and blue values in each. Both names refer to those two files, not to the paintings or to Mondrian's periods."
graph LR
    SITE["nathanpayne.com"] --> HOME["Homepage<br/>1930-scan register"]
    SITE --> INT["Interior pages<br/>1921-scan register"]
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
```

The homepage is a poster: little text, high impact, instant Mondrian recognition. I wanted the 1930 primaries there. Blog and project pages are for reading; quieter cerulean, vermilion, and lemon sit beside body text without shouting at it. The finished statement goes out front, and the softer working-period palette goes where the writing and process live.

<span id="what-the-built-css-knew-that-i-did-not"></span>

## What a token change would miss

Before implementing that rule, Claude audited the deployed stylesheet, `/_astro/global.XofGYe7g.css`, fetched 2026-06-11. It checked the findings against `src/styles/global.css` on `main` at `9d6139f`. My two blues were already separate tokens in `:root`:

```css
--blue: #223f89;
--lightblue: #2080ca;
```

The tokens confirmed I'd chosen both colors. They didn't cover every use. The `.post-card` hover ring hard-coded ultramarine as `rgba(34, 63, 137, 0.18)`, exactly 18% opacity; the minifier ships that as `#223f892e`. Six `[data-accent=*]` scopes defined `--accent-soft` with literal plane colors, including `rgba(34, 63, 137, .12)`. One scope's `--accent` was a raw `#5B5F64` with no `:root` token. Remapping the palette would have left all those colors behind.

A hex search catches different things in source and in the build. In source, `rgba(34, 63, 137, .12)` won't match a search for `223f89`. The minifier rewrites `rgba()` as hex, so that search finds `#223f891f` in the artifact. The artifact hides other details, including duplicate rules it has merged. I needed to check both.

I asked Claude to verify its extraction before I accepted the ticket. Its first pass had found four of the six `--accent-soft` literals; the other two and the raw `--accent` appeared in an addendum labeled "same problem class, missed by the original audit." It had also claimed the gray-blue `#DDE1E5` had no token. A deeper pass found a per-scope `--project-bg` definition that three raw `background` declarations were bypassing. Asking it to check caught errors in the audit as well as the CSS.

The theming machinery was already there. My pages used `data-accent` attributes to redefine `--accent` and `--accent-soft` by scope. I could use the same approach for the palette split.

## Make the model cite its sources

The palette ticket needed 1930 target values. Claude supplied red `#DD0100`, blue `#0A4A9F`, and yellow `#F8D000` from memory, as commonly cited screen approximations of classic Mondrian. Before accepting them, I asked whether it had confirmed any of those values beyond the two images I'd supplied.

It hadn't. My site's colors traced to its live CSS. The 1921 palette traced to my marketing poster. The 1930 targets traced to training data. Claude then got the Dallas Museum of Art's digitization of the 1921 painting and a high-resolution [Wikimedia Commons reproduction](https://commons.wikimedia.org/wiki/File:Piet_Mondriaan,_1930_-_Mondrian_Composition_II_in_Red,_Blue,_and_Yellow.jpg) of [*Composition with Red, Blue and Yellow*](https://collection.kunsthaus.ch/en/collection/item/2455/), 1930. The Commons file records a blog as its source, not the Kunsthaus Zürich. It sampled both files with per-channel medians over the pixels in each plane.

![Composition with Red, Blue and Yellow, 1930. Piet Mondrian, oil on canvas, 45 × 45 cm. Kunsthaus Zürich, inventory 1987/0028, donated by Alfred Roth, 1987. The file is a Wikimedia Commons reproduction, not the museum's own. No calibration reference is visible anywhere in this frame, and the file carries no embedded ICC profile—at plane scale the sampled red leans orange, the blue leans cyan, and the yellow is much softer than the pop-culture approximations discussed below.](/blog/two-blues-one-composition/img/composition-ii-red-blue-yellow-1930.jpg)

The 1921 file largely supported what I'd seen in the poster. Its blue median, `#0383E3`, was almost identical to the poster's `#028DE2`. Its reported gray, `#DADFE5`, was close to my `#DDE1E5`, but that reading turned out to be canvas ground rather than a plane; the methods section withdraws it. The reported black, `#323137`, was close to the `#333333` token I'd used since the beginning. The neutral readings need their own isolation rule, so I treat those comparisons more cautiously than the chromatic ones.

The 1930 file's reported black, `#151A1A`, was much darker. That reading has the same neutral-isolation caveat. Keeping or changing the homepage black became an explicit decision.

The 1930 reproduction didn't match Claude's remembered values. Red came back as `#DE2822`, visibly leaning orange, with a green channel absent from its `#DD0100`. My brick `#C11D19`, which it had rejected as belonging to neither era, was hue-correct against this file and merely dark. Blue was `#025D9E`, more cyan than the violet-leaning `#0A4A9F`. Yellow was `#EEDB6E`, much softer in this reproduction than pop-culture Mondrian's `#F8D000`.

```mermaid title="Recalled colors compared with reproduction medians" description="Each color recalled by the model from memory, with no confirmed source—red, blue, and yellow—is paired with the median sampled from the corresponding reproduction, revealing material differences between citation and file."
graph LR
    MR["Recalled red<br/>#DD0100"] -.->|"scan median"| CR["Sampled red<br/>#DE2822"]
    MB["Recalled blue<br/>#0A4A9F"] -.->|"scan median"| CB["Sampled blue<br/>#025D9E"]
    MY["Recalled yellow<br/>#F8D000"] -.->|"scan median"| CY["Sampled yellow<br/>#EEDB6E"]
    style MR fill:#DD0100,stroke:#8a0100,color:#fff
    style CR fill:#DE2822,stroke:#8d1a16,color:#fff
    style MB fill:#0A4A9F,stroke:#062f66,color:#fff
    style CB fill:#025D9E,stroke:#013a63,color:#fff
    style MY fill:#F8D000,stroke:#a68b00,color:#333
    style CY fill:#EEDB6E,stroke:#9c8f47,color:#333
```

The least traceable data in the entire exercise was the model's memory. Those canonical values matched neither reproduction. The reproductions also disagree enough that neither establishes the canvas's colors. I hadn't found the right blue; I'd found which numbers had a source. When an agent gives me a confident value, I ask where it came from. If the answer is "everybody cites it," I ask it to find the object.

## Four decisions, in sequence

The order is the part I'd defend hardest. I split the central work into two tickets, [#497](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/497) and [#498](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/498), and shipped them in order. [PR #499](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/499) changed zero rendered pixels. It routed palette colors through custom properties and derived each baked wash from its token. Its acceptance criteria were mechanical: searching for `dde1e5` should return exactly one match, and searching for literal `rgba()` plane colors should return zero. Codex could check the refactor without making a design call.

[PR #500](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/500) then changed the values: 1921 became the `:root` default, one `[data-palette="1930"]` block supplied the override, and only the homepage opted in. #499 merged, #497 closed one second later, and #500 opened thirty-one minutes after that.

The homepage black, interior blue, wash derivation, and token retirement each had a decision checkbox with a recommendation. Contrast got its own audit. The 1921 yellow on cream measured about 1.2:1 in two hover rules. Red failed too, and blog, 404, and resume all used red, so the amendment widened the audit. The fix was a derived `--accent-text` token: `color-mix(in srgb, var(--accent) 45%, var(--ink))`.

Those two tickets recorded ten corrections: #497's five-row addendum, #498's four validation amendments, and a dated note re-anchoring the 1930 red and blue after sampling. Amendment A1 caught a blocker in the plan itself. Frontmatter `accentColor` inline styles would beat the `[data-accent]` scopes; changing `:root` alone wouldn't recolor a single project page. Ten corrections in an evening sounds bad until you consider shipping all ten errors.

[#501](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/501)/[PR #503](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/503) extended the refactor to ink and veil colors with baked alpha values. It supplied fifty-five of the seventy-six `color-mix()` calls in the June source. [#502](https://github.com/nathanjohnpayne/nathanpaynedotcom/issues/502)/[PR #504](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/504) handled the OG images. Four issues and four pull requests took two hours and fifty-two minutes: #497 opened at 6:03 p.m. Pacific, and #504 merged at 8:55, all on the same evening.

Claude wrote the tickets. Codex implemented them. I made the design calls. All four implementation PRs used `codex/*` branches; Claude did the sampling, critique, and audits. The decision checkboxes recorded which recommendations I'd accepted.

The shipped `:root` values are `#E8784A`, `#E3D477`, and `#2080CA`. The `[data-palette="1930"]` override uses `#DA2418`, `#F0C800`, and `#0A5C9E`. The ticket calls the 1930 red and blue museum-derived: `#DA2418` starts from the scan median `#DE2822`, and `#0A5C9E` from `#025D9E`. In that ticket, museum-derived means derived from the reproduction, with eye-tuning at plane scale left to the tokens.

An earlier version of this post mislabeled the yellow. `#F0C800` doesn't follow the file's softer `#EEDB6E`; I kept pop-culture recognition deliberately. The ticket states the tradeoff: "icon recognition argues for the `#F0C800`–`#F8D000` range; object fidelity argues softer." I chose recognition.

I also kept `#333333` for the homepage black. The checkbox recommended `#1A1814` against the 1930 file's reported `#151A1A` black, but flagged the risk to the interactive Community panel's affordance. I kept the existing value because of that risk. Two shipped choices run against my sampled evidence, with their reasons in the ticket.

The OG images were a separate loose end. They still used 1921 everywhere, including the homepage. #502 was filed thirty-seven seconds after #500 merged; #504 closed it forty-eight minutes after that merge. It added an optional 1930 palette prop to the OG card, opted the home template in, and added a vitest lock requiring that opt-in to remain homepage-only. The projects card needed no change: #500's default had already put non-opting surfaces in 1921.

There are still two blues on the site. One per room.

<span id="the-numbers-and-how-to-reproduce-them"></span>

## Checking the numbers later

Later checks exposed mistakes in what I'd published, too. I'd called the reproductions museum-grade, overstated what a hex search could miss, and given an incorrect explanation for minified CSS counts. I'd also published a 1930 red pixel count of 468,315 that no stated mask reproduces. I've removed that count and supplied the methods here. Both reproductions ship with the site, so the chromatic medians can be checked; near-neutral regions require a separate rule.

The inputs are the JPEGs at `public/blog/two-blues-one-composition/img/`: `composition-ii-red-blue-yellow-1930.jpg` (1183 × 1200 px, sha256 `cf3345af4c5c7456d061f853ed5e7749eae22392df87c8b1012a339c81f07ccd`) and `composition-large-blue-plane-1921.jpg` (996 × 1200 px, sha256 `97e0ef7349d4346002045fa5b96339b8beb47a033284328a27adf8ab2f1b13cb`). Neither committed file has an embedded ICC profile.

That absence means different things. The DMA's served file has an sRGB v4 perceptual-intent profile. The committed copy was rendered through it and saved untagged; its values are the museum file's color-managed sRGB rendering, not its raw channels. The Commons source is already untagged. macOS `sips` reports "sRGB IEC61966-2.1" for both because ColorSync supplies its default for untagged RGB. It isn't reading a profile from either file.

This analysis applied no calibration against the chart. The 1921 file shows the label bar of an X-Rite ColorChecker with the patches cropped out. The 1930 file has no visible calibration reference. One file has a cropped chart; the other has nothing.

The chromatic statistic is a per-channel median over an HSV-masked plane:

```python
# python3, Pillow only. No calibration against the chart is applied.
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

The hue windows are red 340°–25°, yellow 35°–75°, and blue 180°–260°. On the committed files, the function gets within three 8-bit steps per channel of every chromatic median above: 1930 red `#DE2923`, blue `#015D9D`, yellow `#ECD971`; 1921 blue `#0383E2`.

Hue won't isolate the two near-neutral 1921 planes. A reviewer using plausible bands got values one to two steps from mine, which showed how much the rule mattered. The separate function below states the rule and the counts on the committed file:

```python
def median_neutral(path, s_max, v_lo, v_hi):
    # Median of low-saturation pixels inside one value band.
    import colorsys, statistics
    from PIL import Image
    hit = []
    for r, g, b in Image.open(path).convert("RGB").getdata():
        _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if s < s_max and v_lo <= v < v_hi:
            hit.append((r, g, b))
    med = tuple(int(statistics.median(c[i] for c in hit)) for i in range(3))
    return "#%02X%02X%02X" % med, len(hit)

# composition-large-blue-plane-1921.jpg, 996 x 1200 = 1,195,200 px
# s_max = 0.12, whole image, no crop
#   v in [0.00, 0.35)  ->  #36363B   n = 113,001
#   v in [0.55, 0.85)  ->  #BBBCBD   n =  53,930
#   v in [0.85, 1.01)  ->  #DDE1E6   n = 493,897
```

The rule finds three neutral regions, not two. The ground band contains 493,897 pixels, 41% of the image: canvas rather than a colored plane. The published black `#323137` is five steps from the dark band. **The published gray `#DADFE5` is three steps from the ground and forty from the middle band.** That reading was canvas. For the 1930 red, the median stays at `#DE2922`–`#DE2923` through every saturation threshold from 0.1 to 0.75. That says more about robustness than the deleted pixel count did.

Every median here describes a file. Between paint and number sit gallery lighting, each source's unrecorded imaging and color-management pipeline, web downscaling and JPEG recompression, ninety-six and one hundred five years of aging and any restoration, and the display you're reading on. None of these measurements isolates paint. The palette ticket puts it in six words: "treat sampled values as hue anchors." I used them that way.

<span id="auditing-the-shipped-site"></span>

### The rebuilt CSS

**The stylesheet Claude fetched on 2026-06-11 was the deployed `/_astro/global.XofGYe7g.css`. The artifact below is a later local rebuild.** The old deployed file is gone; hash-named assets aren't addressable after a redeploy. This checks a reconstruction, not the file served that evening.

The 2026-08-26 rebuild used `src/styles/global.css` at `ed24c72`, `main` on that date. The pinned toolchain was Lightning CSS 1.32.0, via Vite 8.0.16 inside Astro 7.2.4—Astro's default CSS minifier, not esbuild. The June commit merged by PR #504, `8bebc31`, declares `astro: ^6.1.0` and has no lockfile. It couldn't have produced this build:

```bash
git checkout ed24c72 && npm ci && npx astro build
# dist/_astro/global.CwkyM5F4.css
# sha256 aaa523420b6dfc790d5ea219fb506d2bf5e2d043b0592d87b59120fc33134bd2
grep -o 'dde1e5'      dist/_astro/global.CwkyM5F4.css | wc -l   # 1
grep -o '223f89'      dist/_astro/global.CwkyM5F4.css | wc -l   # 0
grep -o 'rgba('       dist/_astro/global.CwkyM5F4.css | wc -l   # 0
grep -o 'color-mix('  dist/_astro/global.CwkyM5F4.css | wc -l   # 72
```

`#dde1e5` occurs once, in the token definition. The old `#223f89` is gone. Source has zero plane-color `rgba()` literals. The artifact has no `rgba()` notation at all because the minifier folds it into hex.

The `color-mix()` counts belong to different commits. At `ed24c72`, source has seventy-four calls and the artifact has seventy-two. At `8bebc31`, the June state this post describes, it's seventy-six and seventy-four. Both pairs have a two-call gap.

The minifier merges duplicate rules: two declarations each occur twice in source and once in output. It can't precompute these calls because every first color argument is a `var()` custom property, which it can't resolve statically. The source count also shows which work added the calls: 6 before the refactor, 18 after #499, 21 after #500, and 76 after #503. The third refactor accounts for most of them.

<span id="what-i-generalized"></span>

## What I took from it

Asking for measurements gave me something to argue with. An agent with a filesystem and an image library can sample a file in seconds. I still have to judge the result, and a screenshot, poster, or reproduced painting only tells me about that file and its pipeline.

I now ask for a source when the model sounds certain. Its remembered Mondrian hexes had textbook confidence and no traceable source. One verification prompt found two reproductions that matched none of the three values. I could compare those files; I still couldn't use either to declare the canvas's correct colors.

I check source and built CSS together. Source searches missed literal `rgba()` plane colors that were easy to find as hex in the build. The build merged duplicate rules and changed counts. Either surface alone would have hidden a real part of the problem.

I also separate the refactor from the visible change. The zero-pixel ticket let Codex verify its plumbing with searches before it touched the palette. Checkboxes with recommendations left the design decisions with me, instead of asking it to infer what I wanted and then making me review its guesses.

The sources mattered to the decision, but they couldn't make the page look coherent. I'd deliberately shipped a brighter yellow and a softer homepage black than my samples suggested. The viewer gets the composition, not the footnotes.

One critique, one counter-painting, two reproductions, ten corrections, four issues, four pull requests, and four decisions. I'd started by defending a blue I'd chosen. I ended with a rule for where each palette belonged, two deliberate exceptions to the sampled values, and CSS whose consistency I could check in both source and build.
