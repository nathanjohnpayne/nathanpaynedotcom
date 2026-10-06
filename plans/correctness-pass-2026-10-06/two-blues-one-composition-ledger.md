# Facts ledger, 2026-10-06 correctness pass: `two-blues-one-composition`

Page source: `src/content/blog/two-blues-one-composition.md` (identical on `main` at `72d0949` and in this worktree). Surface: `https://nathanpayne.com/blog/two-blues-one-composition/` (HTTP 200; every checked phrase of the source is present on the live page). Retrieval timestamp for every API figure: 2026-10-06. Prior ledger: `plans/759/two-blues-one-composition-ledger.md` (read with its §N supersessions first; the §D2 verdict it records as overturned is the one whose correction PR #1025 repinned on 2026-09-12).

Prior-ledger status check. Every WRONG and UNPROVABLE row of the #759 ledger has its correction in the post as published today: A1 "actual red" (now "medians"), A3 pixel count (removed, L127), A4 "museum-grade" (now "two files, one with a cropped chart and one with nothing", L129), B1/B2 (samples and tokens both given, L39), C1 four to six scopes (L90), C2 "invisible to any hex search" (inverted correctly, L92), C3/E3 two to ten corrections (L184), C4 "hardcoded twice" (dropped), D2 as rewritten by §N.1 and repinned by #1025 (L194–208, both pairs reproduce below), D3 narrowed to the yellow (L210), D4 OG facts (L212), E2 four issues and four PRs (L35, L186, L228), F1 hedged as a model hypothesis (L41), F2 registers named for the two files (L53, L61), F3 Kunsthaus title and credit line (L102, L104). The one correction that overshot is new: the #806 revision replaced the June original's "a high-resolution scan" with "the Kunsthaus Zürich's digitization" and added a "two museum digitizations" tally, and the committed 1930 file is a Wikimedia Commons reproduction, not a museum file (R1, R2).

## Summary

| # | Claim (verbatim, abbreviated) | Location | Verdict | Corrected value or weaker form | Source |
|---|---|---|---|---|---|
| R1 | "the Kunsthaus Zürich's digitization of *Composition with Red, Blue and Yellow*" | L102 (also L108 "the Kunsthaus reproduction", L102 "primary sources") | WRONG | A Wikimedia Commons reproduction (5918 × 6000, uploaded 2016, source recorded there as a WordPress page), downscaled to 1183 × 1200; not an image the Kunsthaus publishes | Commons `File:Piet Mondriaan, 1930 - Mondrian Composition II in Red, Blue, and Yellow.jpg`; pixel diff vs committed file 1.8/1.6/2.8 (control 1.2/1.1/1.5); Kunsthaus's own 599 × 600 image differs by 24/24/26 |
| R2 | "two museum digitizations" / "Two museum scans" / "museum-file medians" | L5, L14, L35, L110, L123, L220, L228 | WRONG | One museum digitization (DMA, 1921) and one Commons reproduction (1930) | As R1; DMA IIIF `production__objects__4348683__261969916__image.jpg` |
| R3 | "no calibration transform was applied… because none is documented for either file"; "That absence is itself a finding" | L129 (L104 alt for the 1930 file is right) | WRONG | The DMA's served file carries an embedded `sRGB v4 ICC preference` (perceptual) profile; the committed 1921 copy is that file rendered through the profile and saved untagged, so its values are post-transform | DMA IIIF full image: ICC 60,960 bytes; diff vs committed after perceptual conversion 4.2/1.9/2.7, raw 24.0/5.9/4.5, control 1.9/1.8/2.2 |
| R4 | "The tickets say the same thing in four words—'treat sampled values as hue anchors'" | L176 | WRONG | Six words; only #498 carries the phrase | `gh api …/issues/498` body L13 |
| R5 | "The red sampled `#C01D18` on both screenshots… `#D9B314`… `#224089`… `#2280CA`"; "Claude called it mustard" | L39 | UNPROVABLE | Screenshots and transcript unpublished; the tokens are verified (R14) and the post already attributes the deltas to compression | No primary source |
| R6 | "Mondrian, Claude asserted, never ran two blues in a single painting"; "matching neither era"; "keep the ultramarine and kill the cerulean" | L41, L108 | UNPROVABLE | Already stated as an unverified model hypothesis; the quotations appear in no ticket body or edit | #497, #498, #501, #502 bodies and #498 edit history: no match |
| R7 | "The poster's blue read `#028DE2`" | L51 | UNPROVABLE | The value the ticket recorded that evening for an unpublished poster sample | #498 original body (edit 2026-06-12T01:12:08Z) D2: "the brighter `#028DE2` poster sample" |
| R8 | "Its first pass claimed the gray-blue `#DDE1E5` had no token behind it; the deeper pass found a per-scope `--project-bg` system"; "The addendum exists because I asked Claude to verify its own extraction" | L94 | UNPROVABLE | The ticket records both the three raw backgrounds and the independent `--project-bg` definition in one findings table (findings 1–4); the pass ordering and the motive are transcript-only | #497 body (zero edits); `git show 9d6139f:src/styles/global.css` L1404, L2320, L2331, L2344 |
| R9 | the "commonly cited screen approximations" of classic Mondrian | L100 | UNPROVABLE | The ticket called `#F8D000` the "1930 canonical target" and `#DD0100` / `#0A4A9F` the 1930 starting points; the quoted phrase is in neither ticket version | #498 edit history |
| R10 | "that file's black plane medians far darker, `#151A1A`" | L106, L210 | UNPROVABLE | No stated rule reproduces `#151A1A`; low-saturation dark bands on the committed 1930 file median `#131313`–`#212221`, all far darker than `#333333` | `median_neutral` sweep, s_max 0.12–0.50, v_hi 0.10–0.35 |
| R11 | "in about four seconds" | L218 | UNPROVABLE | "in seconds" | No primary source |
| R12 | "one sentence: scrutinize this layout against Mondrian colors and design principles"; "two screenshots"; "a Python script" | L35 | UNPROVABLE | Transcript-only; the date is supported (R13) | No primary source |
| R13 | `date: 2026-06-11`; "On June 11, 2026"; "#497 opened at 6:03 p.m. Pacific, #504 merged at 8:55"; "two hours and fifty-two minutes" | L9, L35, L186 | SUPPORTED | 01:03:07Z to 03:55:06Z = 2 h 51 m 59 s, all on June 11 PDT | `gh api …/issues/497`, `…/pulls/504`; `git log 9d6139f` 2026-06-11 16:05 -0700 |
| R14 | tokens `#C11D19`, `#D9B111`, `#223F89`, `#2080CA`; Mergepath blue, F&F Billing lightblue; "one-to-three-step deltas" | L39, L86–87 | SUPPORTED | Red delta is (1, 0, 1), so "one 8-bit step per channel" means at most one | `git show 9d6139f:src/styles/global.css` L36–39; `…:src/content/projects/{mergepath,friends-and-family-billing}.md` L9–10 |
| R15 | `#DDE1E5` gray-blue plane; `#333333` "the token I have been running since the beginning" | L51, L106 | SUPPORTED | `--accent-black: #333333` at `9d6139f` L41; present in `global.css`'s first commit `f5d752a` (2026-04-08) | `git log -S'#333333' --reverse -- src/styles/global.css` |
| R16 | "medians `#FC7C5A` and `#F1DF75`" | L53 | SUPPORTED | Exact | post's `median_plane` on the 1921 file, red 340–25, yellow 35–75 |
| R17 | homepage 1930, "every interior page… 1921… No page mixes"; "the homepage as the single page that opts in"; "still two blues on the site. One per room" | L59, L182, L214 | SUPPORTED | Live today | `curl` `<html … data-palette="1930">` on `/` only; `main` `src/pages/index.astro:167` sole `dataPalette="1930"`; live CSS has `--blue:#2080ca` and `--blue:#0a5c9e` |
| R18 | register map values `#DA2418 #F0C800 #0A5C9E` / `#E8784A #E3D477 #2080CA`; "`:root` carries… override carries…" | L61–77, L210 | SUPPORTED | Same at `8bebc31` and on `main` today and in the live stylesheet | `git show 8bebc31:src/styles/global.css` L36–38, L228–232; `global.m4fkiYMR.css` |
| R19 | "`/_astro/global.XofGYe7g.css`, fetched 2026-06-11… validated against `src/styles/global.css` on `main` at `9d6139f`" | L83, L192 | SUPPORTED | Verbatim in the ticket | #497 body L8 |
| R20 | hover ring `rgba(34, 63, 137, 0.18)` → `#223f892e`; "Six `[data-accent=*]` scopes… `rgba()` literals"; raw `--accent` `#5B5F64` | L90 | SUPPORTED | Source writes `0.12`, the post `.12`; 0.18 × 255 = 45.9 → `2e` | `9d6139f` L2211, L1365–L1405, L1401; lightningcss 1.32.0 minify of `9d6139f`: `223f892e` × 1 |
| R21 | minifier flattens `rgba()` to eight-digit hex; "finds `#223f891f` in the build" | L92, L15 | SUPPORTED | Minified `9d6139f`: `rgba(` 0, `223f891f` 1 | lightningcss 1.32.0 |
| R22 | "first pass found four of the six… the other two, and the raw `--accent`, arrived in an addendum the ticket labels 'same problem class, missed by the original audit'"; three raw `background` declarations | L90, L94 | SUPPORTED | Findings 6–9 plus A1, A2, A3 under that exact heading | #497 body L21–32 |
| R23 | "My pages already carry `data-accent` attributes that redefine `--accent` and `--accent-soft` per scope" | L96 | SUPPORTED | | `9d6139f` L1365–L1405 |
| R24 | recalled `#DD0100`, `#0A4A9F`, `#F8D000` | L100, L108, L110–121 | SUPPORTED | All three in #498 as first posted; the revision replaced red and blue | #498 edit history, 01:12:08Z body |
| R25 | Kunsthaus link; "*Composition with Red, Blue and Yellow*, 1930… oil on canvas, 45 × 45 cm… inventory 1987/0028, donated by Alfred Roth, 1987" | L102, L104 | SUPPORTED | The record's primary title is "Komposition mit Rot, Blau und Gelb"; the English title is listed under "Also known as" | `collection.kunsthaus.ch/en/collection/item/2455/` (200) |
| R26 | DMA link; "*Composition with Large Blue Plane, Red, Black, Yellow, and Gray*, 1921… oil on canvas… accession 1984.200.FA"; "This is the museum's digitization" | L47, L49 | SUPPORTED | With the R3 caveat: the committed copy is the DMA IIIF file (996 × 1200, the server's `maxArea`) rendered through its profile and re-encoded | `dma.org/art/collection/object/4348683` rendered in browser; IIIF `info.json`; pixel diff |
| R27 | X-Rite ColorChecker label bar along the 1921 top edge, patches cropped; 1930 shows no reference | L49, L104, L129 | SUPPORTED | Visible in both the committed file and the DMA file | top-60-row crops, visual |
| R28 | 1921 medians `#0383E3`; `#323137` "five steps from the dark band"; `#DADFE5` "three steps from the ground and forty from the mid band" | L106, L174 | SUPPORTED | Script gives `#0383E2`; max-channel deltas 5, 3, 40 | post's samplers on the committed file |
| R29 | 1930 medians `#DE2822`, `#025D9E`, `#EEDB6E` within three steps of the script's; `#C11D19` "hue-correct… and merely dark" | L108, L152 | SUPPORTED | Script: `#DE2923`, `#015D9D`, `#ECD971` | post's sampler; #498 L25 "already hue-correct for 1930" |
| R30 | earlier version "reported a pixel count, 468,315… that no stated mask rule reproduces" | L127 | SUPPORTED | Default rule returns 721,970; the count sits between `s_min` 0.82 and 0.83, a threshold no version stated | `git log -S'468,315'` → `d5d39bf`; sweep |
| R31 | 1183 × 1200, sha256 `cf3345af…`; 996 × 1200, sha256 `97e0ef73…`; no embedded profile in either committed file; `sips` says "sRGB IEC61966-2.1"; "both reproductions ship with this site" | L129 | SUPPORTED | Marker walk: 1930 APP0/APP1/APP13, 1921 APP0 only; live files hash-identical | `shasum -a 256`, `sips -g profile`, `curl` |
| R32 | script reproduces "1930 red `#DE2923`, blue `#015D9D`, yellow `#ECD971`; 1921 blue `#0383E2`"; "a reviewer running plausible bands got values one to two steps from mine" | L152 | SUPPORTED | Exact; reviewer values `#36363B / #BABBBB / #DCE0E6` | post's script; PR #806 review by `nathanpayne-codex` 2026-08-26T20:24:51Z |
| R33 | `median_neutral` bands `#36363B` n 113,001; `#BBBCBD` n 53,930; `#DDE1E6` n 493,897; 1,195,200 px; "41%"; red holds `#DE2922`–`#DE2923` for 0.1 to 0.75 | L167–174 | SUPPORTED | Exact; 493,897 / 1,195,200 = 41.3% | post's script as printed |
| R34 | "ninety-six and one hundred five years" | L176 | SUPPORTED | 2026 − 1930, 2026 − 1921 | arithmetic |
| R35 | PR #499 "changed zero rendered pixels"; criteria "`dde1e5`… exactly one match… `rgba()` plane literals… zero" | L180 | SUPPORTED | Ticket wording permitted a comment match; #499 reworded the comment, so the result is exactly one | `git show bd70b4f` (1 file, +23/−21); greps at `bd70b4f` |
| R36 | PR #500 shape; "#499 merged, #497 closed one second later, #500 did not open for another thirty-one minutes"; four checkboxes; "about 1.2:1 on two hover rules… red failed… blog, 404, and resume"; `--accent-text` 45% | L182 | SUPPORTED | 02:18:07Z, 02:18:08Z, 02:49:46Z | `gh api`; #498 D1–D4, A3; `8bebc31` L1377 |
| R37 | "ten entries… #497's five-row addendum, #498's four validation amendments, and a dated revision note"; amendment A1 | L184 | SUPPORTED | A4 and A5 sit in #497's P2 table, A-numbered | #497 body L30–32, L43–44; #498 L5, L44–50 |
| R38 | "#501/PR #503… fifty-five of the seventy-six"; "#502/PR #504 handled the OG images" | L186 | SUPPORTED | 21 at `4ab38cc` → 76 at `a3554ab` | `git show <c>:src/styles/global.css` counts |
| R39 | "all four implementation PRs ran on `codex/*` branches" | L188 | SUPPORTED | | `gh api …/pulls/{499,500,503,504}` `.head.ref` |
| R40 | "the deployed file is long gone" | L192 | SUPPORTED | 404; current bundle `global.m4fkiYMR.css` | `curl -sI` |
| R41 | "`ed24c72`, `main` on that date… Lightning CSS 1.32.0 (via Vite 8.0.16 inside Astro 7.2.4…)"; "`8bebc31`… declares `astro: ^6.1.0` and carries no lockfile" | L194 | SUPPORTED | `ed24c72` 2026-08-26 11:40 −0700, direct parent of the revision commit | `package-lock.json` at `ed24c72`; `git ls-tree 8bebc31`; artifact contains `--surface:#f4efe5f5` |
| R42 | `dist/_astro/global.CwkyM5F4.css`, sha256 `aaa52342…34bd2`; greps 1, 0, 0, 72 | L197–203 | SUPPORTED | Reproduced from a `git archive` of `ed24c72` | scratchpad build |
| R43 | 74/72 at `ed24c72`, 76/74 at `8bebc31`; "two… declarations each appear twice in source and once after minification"; every call takes `var()`; "6… 18… 21… 76" | L206–208 | SUPPORTED | Merged pairs: `var(--blue-contrast) 55%` and `82%` | lightningcss 1.32.0 minify; per-commit counts |
| R44 | ticket "calls the 1930 red and blue museum-derived"; "`#DA2418` a starting point"; "icon recognition argues for the `#F0C800`–`#F8D000` range; object fidelity argues softer"; D1 `#1A1814`, Community panel risk, kept `#333333` | L210 | SUPPORTED | Verbatim in #498 | #498 L25–27, L69; `8bebc31` L42 |
| R45 | "#502… filed thirty-seven seconds after #500 merged and closed by #504 forty-eight minutes later"; optional 1930 prop, home opt-in, vitest lock; "The projects card needed nothing" | L212 | SUPPORTED | 37 s exact; 47 m 54 s after #500 merged (47 m 18 s after filing) | `gh api`; `git show 8bebc31` |
| R46 | links `/projects/`, `/projects/mergepath/`, `/projects/friends-and-family-billing/`, issue and PR URLs, both image paths, OG image | L11, L35, L39, L47, L102, L180–186 | SUPPORTED | All 200 | `curl -sI` |
| R47 | "ten self-corrections, four issues, four pull requests, four decisions"; "two judgment calls recorded against those same sources" | L228, L226 | SUPPORTED | The "two museum digitizations" in the same sentence is R2 | R37, R38, R36, R44 |
| R48 | earlier-version attributions: "invisible to any hex search", "precomputes two", "museum-derived", "corrected itself twice", "two tickets", "museum-grade", "468,315" | L92, L127, L129, L184, L186, L208, L210 | SUPPORTED | All in the first commit `d5d39bf` | `git log -S` per phrase |

Counts: WRONG 4, STALE 0, UNPROVABLE 8, SUPPORTED 36.

## Rows

### R1: The 1930 file is a Wikimedia Commons reproduction, not the Kunsthaus's digitization
> "So Claude went and got primary sources—the Dallas Museum of Art's digitization of the 1921 painting and the Kunsthaus Zürich's digitization of [*Composition with Red, Blue and Yellow*](https://collection.kunsthaus.ch/en/collection/item/2455/), 1930" (line 102); "The red plane of the Kunsthaus reproduction medians `#DE2822`" (line 108)

**WRONG.** The committed `composition-ii-red-blue-yellow-1930.jpg` is a downscale of the Wikimedia Commons file `File:Piet Mondriaan, 1930 - Mondrian Composition II in Red, Blue, and Yellow.jpg` (5918 × 6000, sha1 `ce440a548b99aeba8d58640c89d14827dd9dc50c`, uploaded 2016-01-02 by Hannolans, untagged, JFIF only). Resized to 1183 × 1200 it differs from the committed file by a mean of 1.8/1.6/2.8 per channel (bicubic), against a JPEG re-encode control of 1.2/1.1/1.5, and its 1280 px thumbnail medians are `#DE2822` / `#025D9E` / `#ECD871`, the first two being exactly the medians the post publishes. The Commons page records the image's `|Source=` as `utopiadystopiawwi.wordpress.com/de-stijl/piet-mondrian/composition-with-red-yellow-and-blue/` and `|institution=` Kunsthaus Zürich as the painting's holder, not the image's origin. The Kunsthaus's own online-collection image (`collection.kunsthaus.ch/multimedia/9/multimedia-989209.large.jpg`) is 599 × 600 with medians `#E4301A` / `#024EB7` / `#DBB838` and differs from the committed file by 24/24/26 per channel. The June original (`fae2aef`) said "a high-resolution scan of *Composition II…*", which was defensible; the #806 revision (`44a7827`) introduced the museum attribution. Corrected value: "a high-resolution reproduction from Wikimedia Commons (source recorded there as a WordPress page), not a museum file; the Kunsthaus's online image is a 600 px file with different values". Source: `commons.wikimedia.org/w/api.php?…prop=imageinfo|revisions` -> size, sha1, `|Source=`; scratchpad pixel diff -> `[1.81, 1.55, 2.81]`.

### R2: The "two museum digitizations" tally is one too many
> "Two museum scans later" (line 5); "two museum digitizations" (lines 14, 35, 220, 228); "contact with a primary source" (line 123); "Recalled colors compared with museum-file medians" / "the corresponding museum reproduction" (line 110)

**WRONG.** Follows from R1: the 1921 file is the DMA's digitization (R26) and the 1930 file is a Commons reproduction of unrecorded digitization origin. Every tally and label that says two museum files, museum-file medians, or a primary source for the 1930 values overstates by one. The measurements themselves are unaffected (R29, R32); only the provenance labels move. Corrected value: "one museum digitization and one high-resolution Commons reproduction" (or "two reproductions"). Source: as R1; `grep -n 'museum digitizations\|museum scans\|museum-file\|museum reproduction'` on the page -> lines 5, 14, 35, 110, 220, 228.

### R3: The DMA file carries an embedded ICC profile, and the committed copy is its rendering through that profile
> "Neither file carries an embedded ICC profile. That absence is itself a finding… Both files are untagged, conventionally interpreted as sRGB, and no calibration transform was applied anywhere in this analysis, because none is documented for either file." (line 129)

**WRONG as applied to the 1921 file; right for the 1930 file.** The two committed JPEGs are untagged (R31). But the file the DMA serves at `image.dma.org/iiif/2/production__objects__4348683__261969916__image.jpg/full/full/0/default.jpg` (996 × 1200, 751,570 bytes, the server's `maxArea`) embeds a 60,960-byte `sRGB v4 ICC preference perceptual intent beta` profile. Compared pixel-wise with the committed 996 × 1200 copy, the DMA file's raw channels differ by a mean of 24.0/5.9/4.5, but after a perceptual profile-to-sRGB conversion they differ by 4.2/1.9/2.7, close to a re-encode control of 1.9/1.8/2.2 (relative colorimetric: 26.9/7.5/5.3). The committed copy is therefore the museum file after a colour-managed conversion that stripped the profile; the absence is a property of the copy's pipeline, not a finding about the museum's file, and its channel values are rendered values. The 1930 file is untagged at its Commons source (R1), so that half stands. Corrected value: "The DMA's file documents its encoding with an embedded sRGB v4 (perceptual) profile; the committed copy was rendered through it and saved untagged, so its values are the museum file's colour-managed sRGB rendering. The 1930 file is untagged at source. No calibration against the chart was applied anywhere." Source: `PIL.ImageCms.getProfileDescription` on the IIIF file; `ImageChops.difference` means as quoted.

### R4: "treat sampled values as hue anchors" is six words
> "The tickets say the same thing in four words—'treat sampled values as hue anchors'" (line 176)

**WRONG.** The quoted phrase has six words. It appears once in #498 ("Digitizations still embed gallery lighting, color profiles, and a century of paint aging—treat sampled values as hue anchors", body line 13) and in a five-word variant at line 65 ("treat them as hue anchors"); #497 does not carry it, so "the tickets" is also one quantifier wide. Corrected value: "says the same thing in six words" or drop the count. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/498 --jq .body` -> line 13.

### R5: The screenshot sample values
> "The red sampled `#C01D18` on both screenshots… The yellow sampled `#D9B314`… `#224089` on the Mergepath plane and `#2280CA` on the Friends & Family Billing plane… Claude called it mustard rather than cadmium" (line 39)

**UNPROVABLE.** The two screenshots and the transcript are unpublished, so the sampled values and the "mustard" remark cannot be reproduced; no ticket body carries any of them. The tokens the samples are compared against are verified (R14), and the post already gives both values and attributes the deltas to compression, which is the defensible form. Source: `grep -il 'C01D18\|D9B314\|224089\|2280CA\|mustard'` over the four issue bodies and #498's edit history -> no match.

### R6: The model's art-historical assertion and its quoted verdicts
> "Mondrian, Claude asserted, never ran two blues in a single painting—within a composition, each primary appears at exactly one hue. No citation came with it… so it stays a model hypothesis." (line 41); "matching neither era" (lines 41, 108); "keep the ultramarine and kill the cerulean" (line 41)

**UNPROVABLE.** The universal claim over Mondrian's corpus is not settleable from any source reachable here, and the post now labels it an unverified hypothesis, which is the defensible form; keep it. The two quoted verdicts and the prescription are transcript-only: neither "neither era" nor the prescription appears in #497, #498, #501, #502 or #498's two body versions. Weaker form: attribute them to the conversation without quotation marks, or keep them as the post's paraphrase. Source: issue bodies and `userContentEdits` for #498 -> no match.

### R7: The poster's blue
> "The poster's blue read `#028DE2`—my `#2080CA` token a slightly tempered but defensible match." (line 51)

**UNPROVABLE as a measurement, corroborated as a record.** The poster is not published, so the value cannot be re-sampled. The ticket written that evening recorded it: #498's first body (edit at 2026-06-12T01:12:08Z) says "keep it over the brighter `#028DE2` poster sample" and D2 calls it "the brighter poster sample `#028DE2`". Weaker form: "the value the ticket recorded for the poster sample". Source: `gh api graphql` `userContentEdits` on #498 -> 01:12:08Z diff.

### R8: The first-pass/deeper-pass story for the gray-blue plane, and the addendum's motive
> "Its first pass claimed the gray-blue `#DDE1E5` had no token behind it; the deeper pass found a per-scope `--project-bg` system that the three raw `background` declarations were bypassing. The addendum exists because I asked Claude to verify its own extraction before I would accept a ticket built on it." (line 94)

**UNPROVABLE.** Issue #497 has zero body edits (`userContentEdits.totalCount` 0, `lastEditedAt` null), and its main findings table as first posted already carries findings 1–3 (three raw `#DDE1E5` backgrounds at L2320, L2331, L2344) and finding 4 (the independent `--project-bg: #dde1e5` at L1404, "should share one source"). The ticket does not distinguish a first pass from a deeper pass for the gray-blue, and the motive for the addendum is transcript-only. The facts (three raw declarations bypassing an existing per-scope definition) are SUPPORTED (R22). Weaker form: "the audit recorded three raw `#DDE1E5` backgrounds bypassing an existing per-scope `--project-bg` definition". Source: `gh api graphql` on #497; `git show 9d6139f:src/styles/global.css` L1404, L2320, L2331, L2344.

### R9: The "commonly cited screen approximations" quotation
> "red `#DD0100`, blue `#0A4A9F`, yellow `#F8D000`—the 'commonly cited screen approximations' of classic Mondrian" (line 100)

**UNPROVABLE as a quotation.** The three values are in #498's first body (R24), but the quoted phrase is in neither version of the ticket; the first body calls `#F8D000` the "1930 canonical target" and gives `#DD0100` and `#0A4A9F` as the 1930 starting points. Weaker form: drop the quotation marks or quote the ticket's "canonical target". Source: #498 `userContentEdits` 01:12:08Z and 01:40:17Z diffs.

### R10: The 1930 black-plane reading
> "that file's black plane medians far darker, `#151A1A`—another neutral reading, and so subject to the same isolation caveat" (line 106); "the 1930 scan's `#151A1A`-reading black plane" (line 210)

**UNPROVABLE.** No published rule reaches it, as the post concedes. A `median_neutral` sweep over the committed 1930 file with `s_max` 0.12–0.50 and `v_hi` 0.10–0.35 returns `#131313` to `#272625`, closest `#151718` (`s_max` 0.50, `v_hi` 0.15), never `#151A1A`. The qualitative claim holds under every band: all are far darker than `#333333`. Weaker form: "a low-saturation dark band on the 1930 file medians in the `#13`–`#21` range, far darker than `#333333`". Source: scratchpad sweep.

### R11: "about four seconds"
> "turns a taste argument into a measurement in about four seconds" (line 218)

**UNPROVABLE.** No timing record. Weaker form: "in seconds". Source: none.

### R12: The opening prompt and inputs
> "I handed Claude two screenshots of my projects page and one sentence: scrutinize this layout against Mondrian colors and design principles… What I got back was a Python script" (line 35)

**UNPROVABLE.** Transcript-only; no ticket quotes the prompt or the script. The date and the evening are supported (R13). Source: none.

### R13: The date and the evening's bounds
> "On June 11, 2026" (line 35); "#497 opened at 6:03 p.m. Pacific, #504 merged at 8:55"; "all inside two hours and fifty-two minutes of one calendar evening" (line 186); `date: 2026-06-11` (line 9)

**SUPPORTED.** #497 `created_at` 2026-06-12T01:03:07Z is 18:03:07 PDT on June 11; #504 `merged_at` 2026-06-12T03:55:06Z is 20:55:06 PDT; the span is 2 h 51 m 59 s. The audit's baseline commit `9d6139f` is dated 2026-06-11 16:05:20 −0700, and all five merge commits carry −0700 dates on June 11. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/497`, `…/pulls/504`; `git log -1 --date=iso 9d6139f`.

### R14: The four tokens and the plane attribution
> "my `--red` token `#C11D19`… a token of `#D9B111`… `#224089` on the Mergepath plane and `#2280CA` on the Friends & Family Billing plane—tokens `#223F89` and `#2080CA`… The one-to-three-step deltas" (line 39); "`--blue: #223f89; --lightblue: #2080ca;`" (lines 86–87)

**SUPPORTED.** `git show 9d6139f:src/styles/global.css` L36–39 reads `--red: #c11d19; --yellow: #d9b111; --blue: #223f89; --lightblue: #2080ca;`. `mergepath.md` carries `accentColor: "#223f89"` / `accent: "blue"` and `friends-and-family-billing.md` carries `accentColor: "#2080ca"` / `accent: "lightblue"` at the same commit. Per-channel deltas are red (1, 0, 1), yellow (0, 2, 3), blue (0, 1, 0), lightblue (2, 0, 0): one to three steps, with the red's "one 8-bit step per channel" meaning at most one. Source: `git show 9d6139f:src/content/projects/mergepath.md` L9–10 and `…/friends-and-family-billing.md` L9–10.

### R15: The gray-blue plane token and the black "since the beginning"
> "close to the `#DDE1E5` gray-blue plane… not far from the `#333333` I use" (line 51); "the `#333333` token I have been running since the beginning" (line 106)

**SUPPORTED.** At `9d6139f`, `--accent-black: #333333` is L41 and `--project-bg: #dde1e5` is L1404 (with three raw `#DDE1E5` backgrounds). `global.css` was added in `f5d752a` (2026-04-08) and that first version already contains `#333333`, which is the loosest reading of "since the beginning". Source: `git show 9d6139f:src/styles/global.css` L41, L1404; `git log --diff-filter=A -- src/styles/global.css` -> `f5d752a`; `git log -S'#333333' --reverse` -> `f5d752a` first.

### R16: The 1921 red and yellow medians
> "medians `#FC7C5A` and `#F1DF75`" (line 53)

**SUPPORTED.** The post's `median_plane` on the committed 1921 file returns red (340°–25°) `(37869, '#FC7C5A')` and yellow (35°–75°) `(33452, '#F1DF75')`, exact. Source: scratchpad run of the function as printed at lines 133–150.

### R17: The register rule as current state
> "the homepage keeps the high-chroma 1930 register, and every interior page—projects, blog, resume, anything added later—moves to the softer 1921 register. No page mixes." (line 59); "the homepage as the single page that opts in" (line 182); "There are still two blues on the site. One per room." (line 214)

**SUPPORTED, today.** Live `https://nathanpayne.com/` serves `<html lang="en" data-palette="1930">`; `/projects/mergepath/`, `/resume/`, `/blog/` and this post serve `<html lang="en">` with no palette attribute. On `main`, `src/pages/index.astro:167` is the only `dataPalette="1930"` outside `OgCard`. The live stylesheet `global.m4fkiYMR.css` carries `--blue:#2080ca` in `:root` and `[data-palette="1930"]{--red:#da2418;--yellow:#f0c800;--blue:#0a5c9e}`. Source: `curl -s` on the five routes; `git grep -n dataPalette main -- src`.

### R18: The six shipped hexes
> `#DA2418`, `#F0C800`, `#0A5C9E`, `#E8784A`, `#E3D477`, `#2080CA` (lines 61–77); "The `:root` carries `#E8784A`, `#E3D477`, and `#2080CA`; the `[data-palette="1930"]` override carries `#DA2418`, `#F0C800`, and `#0A5C9E`." (line 210)

**SUPPORTED.** `git show 8bebc31:src/styles/global.css` L36–38 and L228–232 carry exactly those values; `main` today (L36–38, L246–249) and the live stylesheet carry the same. Source: as quoted.

### R19: The audit source line
> "the shipped artifact (`/_astro/global.XofGYe7g.css`, fetched 2026-06-11), validated against `src/styles/global.css` on `main` at `9d6139f`" (line 83); "The artifact Claude fetched on 2026-06-11 was the deployed `/_astro/global.XofGYe7g.css`" (line 192)

**SUPPORTED.** Issue #497 body line 8: "Audit source: production built CSS (`/_astro/global.XofGYe7g.css`, fetched 2026-06-11), **validated against source** `src/styles/global.css` on `main` @ 9d6139f on 2026-06-11." `9d6139f` is on `main`, committed 2026-06-11 16:05 −0700, the last commit before #499. Source: `gh api …/issues/497 --jq .body`; `git merge-base --is-ancestor 9d6139f main`.

### R20: The hover ring, the six scopes, the raw accent
> "The `.post-card` hover ring baked ultramarine in as `rgba(34, 63, 137, 0.18)`—blue at exactly 18% opacity, which the minifier ships as the eight-digit hex `#223f892e`. Six `[data-accent=*]` scopes defined `--accent-soft` as `rgba()` literals… `rgba(34, 63, 137, .12)` and friends—and one scope's `--accent` was itself a raw `#5B5F64` with no `:root` token behind it." (line 90)

**SUPPORTED.** At `9d6139f`: L2211 `box-shadow: inset 0 0 0 2px rgba(34, 63, 137, 0.18);`; six scopes `[data-accent="red"|"yellow"|"black"|"blue"|"lightblue"|"paper"]` at L1365–L1405, each with an `rgba()` `--accent-soft`; L1401 `--accent: #5b5f64;`. Minifying that file with the repository's `lightningcss` 1.32.0 yields `#223f892e` once (0.18 × 255 = 45.9, `0x2e`). One nit: the source writes the alpha as `0.12`, the post as `.12`. Source: `git show 9d6139f:src/styles/global.css`; `lightningcss.transform({minify:true})`.

### R21: The minifier flattens `rgba()` and exposes `#223f891f`
> "the minifier flattens every `rgba()` to eight-digit hex, so the same grep that misses the literal in source finds `#223f891f` in the build" (line 92); keyTakeaways line 15

**SUPPORTED.** The minified `9d6139f` stylesheet contains zero `rgba(` tokens and `#223f891f` once (0.12 × 255 = 30.6, `0x1f`). Source: `lightningcss` 1.32.0 over `git show 9d6139f:src/styles/global.css`.

### R22: Four of six, the addendum heading, the three raw backgrounds
> "Its first pass found four of the six `--accent-soft` literals; the other two, and the raw `--accent`, arrived in an addendum the ticket labels 'same problem class, missed by the original audit.'" (line 94); "the three raw `background` declarations" (line 94)

**SUPPORTED.** #497's main table lists findings 6–9 (red, yellow, blue, lightblue `--accent-soft`); the section headed "**Addendum—same problem class, missed by the original audit:**" lists A1 (`black`), A2 (`paper`) and A3 (`--accent: #5b5f64`). Findings 1–3 are the three raw `#DDE1E5` backgrounds (L2320, L2331, L2344) and finding 4 the independent `--project-bg` definition (L1404). Source: #497 body lines 14–32.

### R23: The theming machinery already existed
> "My pages already carry `data-accent` attributes that redefine `--accent` and `--accent-soft` per scope." (line 96)

**SUPPORTED.** Six `[data-accent=*]` scopes at `9d6139f` L1365–L1405 each define `--accent`, `--accent-contrast`, `--accent-soft` and `--project-bg`; `BaseLayout.astro` at `4ab38cc` wires `dataAccent` beside the new `dataPalette`. Source: `git show 9d6139f:src/styles/global.css`; `git show 4ab38cc:src/layouts/BaseLayout.astro` L16, L39, L62, L178.

### R24: The three recalled hexes were in the ticket as first posted
> "red `#DD0100`, blue `#0A4A9F`, yellow `#F8D000`" (line 100); diagram lines 110–121

**SUPPORTED.** #498 as created (2026-06-12T01:12:08Z) carried `--red` "`#DD0100` starting point", `--yellow` "1930 canonical target is ≈`#F8D000`", `--blue` "`#0A4A9F`". The 01:40:17Z revision replaced red and blue with the museum-anchored values and kept `#F8D000` only as the upper end of the recognition range. Source: `gh api graphql` `userContentEdits` on #498 -> both diffs.

### R25: The Kunsthaus record
> "[*Composition with Red, Blue and Yellow*](https://collection.kunsthaus.ch/en/collection/item/2455/), 1930" (line 102); "oil on canvas, 45 × 45 cm. Kunsthaus Zürich, inventory 1987/0028, donated by Alfred Roth, 1987" (line 104)

**SUPPORTED.** The item page (HTTP 200) reads "Komposition mit Rot, Blau und Gelb, 1930… Also known as Composition with Red, Blue and Yellow… Medium Oil on canvas, Dimensions image: 45 x 45 cm, Inventory number 1987/0028, Credit line Kunsthaus Zürich, Donated by Alfred Roth, 1987". The English title is the record's "Also known as" form; the primary title is German. This row is about the painting; the file's provenance is R1. Source: `curl -sL collection.kunsthaus.ch/en/collection/item/2455/`.

### R26: The DMA record and "the museum's digitization"
> "[*Composition with Large Blue Plane, Red, Black, Yellow, and Gray*](https://dma.org/art/collection/object/4348683), 1921, Dallas Museum of Art" (line 47); "oil on canvas, Dallas Museum of Art, accession 1984.200.FA. This is the museum's digitization—the file sampled later in this post" (line 49)

**SUPPORTED, with the R3 caveat.** The object page (a JavaScript app; rendered in the browser) reads "Composition with Large Blue Plane, Red, Black, Yellow, and Gray… Piet Mondrian… Date: 1921… Material and Technique: Oil on canvas… Object Number: 1984.200.FA… The DMA is an open-access institution." The page's IIIF image is 996 × 1200, the committed file's exact dimensions and the IIIF server's `maxArea` 1,195,200; both show the ColorChecker label bar; after a perceptual profile conversion the DMA file's medians are blue `#0B82E3`, red `#FD7B5A`, yellow `#F1DF74` against the committed `#0383E2`, `#FC7C5A`, `#F1DF75`, and the pixel diff is 4.2/1.9/2.7 against a 1.9/1.8/2.2 control. The committed copy is the museum's file, converted and re-encoded (238,851 bytes against 751,570). Source: `dma.org/art/collection/object/4348683` via browser; `image.dma.org/iiif/2/…/info.json`; scratchpad comparison.

### R27: What each file shows at its edge
> "Along the top edge sits the printed label bar of an X-Rite ColorChecker chart; the chart's color patches are cropped out" (line 49); "No calibration reference is visible anywhere in this frame" (line 104); "the 1921 file shows only the printed label bar… and the 1930 file shows no calibration reference at all" (line 129)

**SUPPORTED.** A 2× crop of the top 60 rows of the committed 1921 file (and of the DMA IIIF file) resolves "x-rite ColorChecker® Color Rendition Chart" with no patches below it; the 1930 file at 600 px shows only the canvas and a frame edge. Source: scratchpad crops `1921-top-edge.png`, `dma-top-edge.png`, `1930-small.png`, inspected visually.

### R28: The 1921 medians and the methods-note arithmetic
> "The museum file's blue medians `#0383E3`… The gray plane, `#DADFE5`… The black plane, `#323137`" (line 106); "The published black `#323137` sits five steps from the dark band. The published gray `#DADFE5` sits three steps from the ground and forty from the mid band" (line 174)

**SUPPORTED.** The post's sampler returns 1921 blue `#0383E2` (one step from `#0383E3`, as line 152 states). Against the published neutral bands, `#323137` versus `#36363B` is (4, 5, 4), maximum five; `#DADFE5` versus `#DDE1E6` is (3, 2, 1), maximum three; versus `#BBBCBD` is (31, 35, 40), maximum forty. Source: scratchpad run; arithmetic.

### R29: The 1930 medians and the hue-correct red
> "`#DE2822`… `#025D9E`… `#EEDB6E`" (line 108); "reproduces every chromatic median above to within three 8-bit steps per channel" (line 152); "my brick `#C11D19`… was hue-correct against this reproduction all along and merely dark" (line 108)

**SUPPORTED.** The sampler as printed returns `#DE2923` (Δ 0, 1, 1), `#015D9D` (Δ 1, 0, 1), `#ECD971` (Δ 2, 2, 3), all within three. #498's revised red row says "the current `#C11D19` (L36) is already hue-correct for 1930—this update is a value lift, not a hue shift". Source: scratchpad run; #498 body line 25.

### R30: The retracted pixel count
> "An earlier version of this post asserted these medians without the method, the inputs, or the uncertainty—and reported a pixel count, 468,315 for the 1930 red, that no stated mask rule reproduces. The count is gone." (line 127)

**SUPPORTED.** `git log -S'468,315'` on the post finds only the first commit `d5d39bf` (2026-06-12), which carries no method; the current source does not carry the count except in this retraction. The printed rule returns 721,970 at its defaults and 700,242–725,377 across `s_min` 0.1–0.75; the #759 ledger's finer sweep places 468,315 between `s_min` 0.82 and 0.83, a threshold no version of the post stated. Source: `git log -S`; scratchpad sweep; `plans/759/two-blues-one-composition-ledger.md` §N.8.

### R31: The committed files' facts
> "`composition-ii-red-blue-yellow-1930.jpg` (1183 × 1200 px, sha256 `cf3345af…`) and `composition-large-blue-plane-1921.jpg` (996 × 1200 px, sha256 `97e0ef73…`). Neither file carries an embedded ICC profile… macOS `sips` reports 'sRGB IEC61966-2.1' for both… both reproductions ship with this site… An earlier version called these 'two museum-grade color verifications'" (lines 127–129)

**SUPPORTED, as statements about the two committed files.** `shasum -a 256` reproduces both hashes locally and for the live URLs; Pillow reports (1183, 1200) and (996, 1200); a raw marker walk finds APP0/APP1/APP13 and no APP2 `ICC_PROFILE` in the 1930 file and APP0 only in the 1921 file; `sips -g profile` prints "sRGB IEC61966-2.1" for both; `d5d39bf` carries "museum-grade". What the untagged state means for the 1921 file is R3. Source: `shasum`, `sips`, `curl -s … | shasum`, Python marker walk, `git log -S'museum-grade'`.

### R32: The reproduction block and the reviewer's bands
> "1930 red `#DE2923`, blue `#015D9D`, yellow `#ECD971`; 1921 blue `#0383E2`… a reviewer running plausible bands got values one to two steps from mine" (line 152)

**SUPPORTED.** The four values are exact (R16, R28, R29). On PR #806, `nathanpayne-codex`'s CHANGES_REQUESTED review of 2026-08-26T20:24:51Z reports "plausible bands returned #36363B / #BABBBB / #DCE0E6"; against the now-published `#36363B / #BBBCBD / #DDE1E6` the deltas are (0, 0, 0), (1, 1, 2), (1, 1, 0). Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/pulls/806/reviews`.

### R33: The neutral bands, counts, share and sweep
> "`#36363B` n = 113,001… `#BBBCBD` n = 53,930… `#DDE1E6` n = 493,897" (lines 167–171); "996 x 1200 = 1,195,200 px"; "41% of the image"; "holds at `#DE2922`–`#DE2923` across every saturation threshold from 0.1 to 0.75" (line 174)

**SUPPORTED.** `median_neutral` as printed, `s_max` 0.12, returns exactly those three medians and counts; 996 × 1200 = 1,195,200; 493,897 / 1,195,200 = 0.413; the red sweep returns `#DE2923` at 0.1 and 0.2 and `#DE2922` at 0.3 through 0.75. Source: scratchpad runs of the functions at lines 133–150 and 155–165.

### R34: The ages
> "ninety-six and one hundred five years of aging" (line 176)

**SUPPORTED.** 2026 − 1930 = 96; 2026 − 1921 = 105. Source: arithmetic against the page's own date.

### R35: PR #499 as a zero-pixel refactor with grep criteria
> "The first, shipped as [PR #499], changed zero rendered pixels… grep for `dde1e5` and get exactly one match, grep for baked `rgba()` plane literals and get zero." (line 180)

**SUPPORTED.** `git show --stat bd70b4f` touches one file, +23/−21; every replacement is `var()` or `color-mix(in srgb, C N%, transparent)` at the alpha the `rgba()` carried. At `bd70b4f`, `grep -oi dde1e5` on `global.css` returns one (L40, the `--gray-plane` definition) because the PR also reworded the comment at L2317, and `grep -E 'rgba\(\s*(193|217|34|32|51|91)\s*,'` returns zero. The ticket's criterion as written allowed a comment match; the implementation went one better. Source: `git show bd70b4f`; #497 body lines 69–71.

### R36: PR #500, the strict sequence, the checkboxes, the contrast audit
> "1921 as the `:root` default, one `[data-palette="1930"]` override block, the homepage as the single page that opts in… #499 merged, #497 closed one second later, and #500 did not open for another thirty-one minutes… the homepage black plane, the interior blue, the wash derivation, the token retirement… 1921 yellow on cream measured about 1.2:1 on two hover rules… red failed the same way, and blog, 404, and resume all run red… `--accent-text` token, `color-mix(in srgb, var(--accent) 45%, var(--ink))`" (line 182)

**SUPPORTED.** `git show 4ab38cc:src/styles/global.css` L36–42 and L225–229 show the 1921 `:root` and the single override block; `index.astro` L73 `dataPalette="1930"`. #499 `merged_at` 02:18:07Z, #497 `closed_at` 02:18:08Z, #500 `created_at` 02:49:46Z (31 m 39 s). #498 § Decisions lists D1 homepage `--accent-black`, D2 interior `--blue`, D3 wash derivation, D4 `--lightblue` retirement, each with "recommend". #498 A3 names `.project-related__list a:hover` and `.blog-sidebar-toc-list a:hover`, "`#E3D477` on cream is ≈1.2:1", and "blog posts, 404, and resume are all `dataAccent="red"`". `8bebc31` L1377 reads `--accent-text: color-mix(in srgb, var(--accent) 45%, var(--ink));` (the ticket had suggested 55%). Source: as quoted.

### R37: Ten corrections and amendment A1
> "ten entries, not the two this post originally counted: #497's five-row addendum, #498's four validation amendments, and a dated revision note… amendment A1… frontmatter `accentColor` inline styles would beat the `[data-accent]` scopes" (line 184)

**SUPPORTED.** #497 carries A1–A3 under its Addendum heading and A4–A5, A-numbered, in its P2 table (five A rows); #498 carries A1–A4 under "Amendments from source validation" and a "**Revision 2026-06-11:**" note at line 5; 5 + 4 + 1 = 10, the loosest correct count. #498 A1: "Inline styles beat the `[data-accent=*]` scopes, so **a `:root` remap will not recolor project detail pages at all.**" Source: #497 body lines 26–44; #498 body lines 5, 44–50.

### R38: The third refactor and the OG follow-up
> "[#501]/[PR #503] routed the alpha-baked ink and veil colors through tokens… the source of fifty-five of the seventy-six `color-mix()` calls… [#502]/[PR #504] handled the OG images." (line 186)

**SUPPORTED.** `color-mix(` in `global.css`: 21 at `4ab38cc` (#500), 76 at `a3554ab` (#503): 55 added. #503's title is "Route alpha-baked ink and veil colors through tokens"; #504 touches `OgCard.astro`, `og-templates/home.astro`, `tests/og-palette.test.js` and `docs/css-architecture.md`. Source: `git show <c>:src/styles/global.css | grep -o 'color-mix(' | wc -l`; `gh api …/pulls/503`; `git show --stat 8bebc31`.

### R39: The `codex/*` branches
> "all four implementation PRs ran on `codex/*` branches" (line 188)

**SUPPORTED.** Head refs: #499 `codex/issue-497-color-token-cleanup`, #500 `codex/issue-498-palette-split`, #503 `codex/issue-501-contrast-token-cleanup`, #504 `codex/issue-502-og-home-palette`. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/pulls/{499,500,503,504} --jq .head.ref`.

### R40: The deployed artifact is gone
> "the deployed file is long gone and hash-named files are not addressable after a redeploy" (line 192)

**SUPPORTED.** `https://nathanpayne.com/_astro/global.XofGYe7g.css` returns 404; the homepage today links `/_astro/global.m4fkiYMR.css`. Source: `curl -sI`.

### R41: The toolchain pin and why `8bebc31` could not have built it
> "Reconstructed 2026-08-26 from `src/styles/global.css` at `ed24c72`, `main` on that date, with Lightning CSS 1.32.0 (via Vite 8.0.16 inside Astro 7.2.4—Astro's default CSS minifier, not esbuild)… `8bebc31`… declares `astro: ^6.1.0` and carries no lockfile" (line 194)

**SUPPORTED.** `ed24c72` is on `main`, dated 2026-08-26 11:40:38 −0700, and is the first-parent predecessor of the revision commit `44a7827` (13:35 the same day). Its `package-lock.json` resolves `astro` 7.2.4, `vite` 8.0.16, `lightningcss` 1.32.0. `git show 8bebc31:package.json` has `"astro": "^6.1.0"` and `git ls-tree 8bebc31` lists no lockfile. The rebuilt artifact contains `--surface:#f4efe5f5`, the custom-property fold only Lightning CSS performs. Source: `git log --first-parent main --since=2026-08-24 --until=2026-08-28`; lockfile JSON; artifact grep.

### R42: The rebuilt artifact's name, hash and greps
> "`# dist/_astro/global.CwkyM5F4.css` / `# sha256 aaa523420b6dfc790d5ea219fb506d2bf5e2d043b0592d87b59120fc33134bd2`" and greps "1… 0… 0… 72" (lines 197–203)

**SUPPORTED.** `git archive ed24c72` into the scratchpad, `npm ci`, `npx astro build` emitted `dist/_astro/global.CwkyM5F4.css` with sha256 `aaa523420b6dfc790d5ea219fb506d2bf5e2d043b0592d87b59120fc33134bd2`; `grep -o` counts are `dde1e5` 1, `223f89` 0, `rgba(` 0, `color-mix(` 72. The build then exited 1 on Markdown-loader errors specific to this environment, after the CSS bundle was written; the artifact and hash are unaffected. Source: scratchpad `build-ed24c72/`, `build-ed24c72.dist.txt`.

### R43: The two count pairs, the merge mechanism, the attribution
> "At `ed24c72`… seventy-four calls and the artifact seventy-two. At `8bebc31`… seventy-six and seventy-four… two of the `color-mix()` declarations each appear twice in source and once after minification… every one of those calls takes a `var()` custom property… it runs 6 at the pre-work baseline, 18 after #499, 21 after #500, and 76 after #503" (line 208); "Plane-color `rgba()` literals: zero in source" (line 206)

**SUPPORTED.** Source counts: `9d6139f` 6, `bd70b4f` 18, `4ab38cc` 21, `a3554ab` 76, `8bebc31` 76, `ed24c72` 74 (`main` today 77). `lightningcss` 1.32.0 minify: `8bebc31` 74, `ed24c72` 72. In `8bebc31` the declarations `color: color-mix(in srgb, var(--blue-contrast) 55%, transparent)` and the `82%` variant each appear twice in source and once in the minified output; a regex for a `color-mix(in srgb,` whose first argument is not `var(` finds nothing. At `ed24c72`, `grep -E 'rgba\(\s*(193|217|34|32|51|91)\s*,'` returns zero, and the 22 surviving `rgba(` are ink, white and cream, none a plane colour. Source: per-commit greps; `lightningcss.transform`.

### R44: The ticket's labels and decision D1
> "The ticket calls the 1930 red and blue museum-derived—`#DA2418` a starting point against the scan median `#DE2822`, `#0A5C9E` against `#025D9E`… 'icon recognition argues for the `#F0C800`–`#F8D000` range; object fidelity argues softer'… the checkbox recommended darkening it to `#1A1814`… named a risk to the interactive Community panel's affordance, and I resolved it to keep `#333333`" (line 210)

**SUPPORTED.** #498 L25: "`#DA2418` starting point… 1930 value is museum-derived (*Composition II*, 1930, scan median `#DE2822`)"; L27: "`#0A5C9E`… museum-derived (scan median `#025D9E`…)"; L26: "Icon recognition argues for the `#F0C800`–`#F8D000` range; object fidelity argues softer."; L69 D1: "recommend darkening `#333333` → `#1A1814`… Risk is real: `.panel--black` is the interactive Community panel… If the open/close affordance suffers, keep `#333333`." `8bebc31` L42 and `main` L41 ship `--accent-black: #333333`. Source: #498 body; `git show`.

### R45: #502's timing and #504's contents
> "#502… was filed thirty-seven seconds after #500 merged and closed by #504 forty-eight minutes later. #504 gave the OG card an optional 1930 palette prop, opted the home template in, and pinned the decision with a vitest lock asserting the opt-in is homepage-only. The projects card needed nothing" (line 212)

**SUPPORTED, with one precision note.** #500 `merged_at` 03:07:12Z, #502 `created_at` 03:07:49Z (37 s), #502 `closed_at` 03:55:07Z and #504 `merged_at` 03:55:06Z: 47 m 54 s after #500's merge, which rounds to forty-eight, but 47 m 18 s after #502's filing; the sentence reads either way, so saying "forty-seven minutes after it was filed" would remove the ambiguity. `git show 8bebc31` adds `palette?: '1930'` and `data-palette={palette}` to `OgCard.astro`, `palette="1930"` to `og-templates/home.astro` only, and `tests/og-palette.test.js` asserts `paletteUsers` equals `['home.astro']`; `og-templates/projects.astro` is untouched. Source: `gh api`; `git show 8bebc31`.

### R46: Every link and asset resolves
> `/projects/` (line 35); `/projects/mergepath/`, `/projects/friends-and-family-billing/` (line 39); the DMA and Kunsthaus links; issue and PR URLs (lines 180–186); both image paths; `image: "/og/blog/two-blues-one-composition.png"` (line 11)

**SUPPORTED.** All return HTTP 200 (`text/html`, `image/jpeg`, `image/png` as appropriate); the two served JPEGs hash-match the committed files. Source: `curl -sI`.

### R47: The closing tally
> "One critique, one counter-painting, two museum digitizations, ten self-corrections, four issues, four pull requests, four decisions… two judgment calls recorded against those same sources" (lines 226–228)

**SUPPORTED except "two museum digitizations" (R2).** Ten corrections (R37), four issues and four PRs (R13, R38), four decisions (R36), and the two choices against the evidence are the kept yellow and the kept homepage black (R44). Source: as cross-referenced.

### R48: What earlier versions said
> "An earlier version of this post called those literals 'invisible to any hex search'" (line 92); "asserted these medians without the method" (line 127); "'two museum-grade color verifications'" (line 129); "not the two this post originally counted" (line 184); "as an earlier version implied" (line 186); "This post originally said the minifier 'precomputes two'" (line 208); "the earlier version of this post got one wrong" (line 210)

**SUPPORTED.** The first commit `d5d39bf` (2026-06-12) contains "invisible to any hex search", "museum-grade", "precomputes", "museum-derived values", "corrected itself twice", "two tickets" (three times) and "468,315"; all were removed by `44a7827` (#806, 2026-08-26) or the #1025 repin (`c65b616`, 2026-09-12). Source: `git log -S'<phrase>' -- src/content/blog/two-blues-one-composition.md`; `git show d5d39bf:… | grep -c`.

## Fixes applied

Applied 2026-10-06 on `claude/correctness-pass-2026-10-06` to `src/content/blog/two-blues-one-composition.md` only (`git diff --stat origin/main` -> 19 insertions, 19 deletions). Vale at `--minAlertLevel=error`: exit 0, no findings. `scripts/verify-brevity.py` skipped: no text was cut for length. No test assertion needed updating: nothing in `tests/`, `src/plugins/` or `scripts/` pins any changed phrase; `tests/mermaid-diagrams.test.js` pins `fill:#DA2418` and `.edge-pattern-dotted`, both untouched; `tests/blog-pages.test.js:145` caps the ItemList description at 160 characters and L5 grew by one.

- R1: L102 "So Claude went and got primary sources—… the Kunsthaus Zürich's digitization of [*Composition with Red, Blue and Yellow*], 1930" -> "So Claude went and got reproductions—the Dallas Museum of Art's own digitization of the 1921 painting and, for [*Composition with Red, Blue and Yellow*], 1930, a high-resolution Wikimedia Commons file that records its source as a blog, not the Kunsthaus Zürich" (Kunsthaus link kept for the painting's record); L104 alt gained "The file is a Wikimedia Commons reproduction, not the museum's own."; L108 "the Kunsthaus reproduction medians" -> "the 1930 reproduction medians".
- R2: L5 "Two museum scans later" -> "Two reproductions later"; L14, L35, L220, L228 "two museum digitizations" -> "two reproductions"; L110 title "museum-file medians" -> "reproduction medians" and description "the corresponding museum reproduction" -> "the corresponding reproduction"; L123 "contact with a primary source" -> "contact with a reproduction"; L228 "overturned by primary sources, two judgment calls recorded against those same sources" -> "overturned by two reproductions, two judgment calls recorded against those same files". Same-class surfaces found while applying: L6 `seoDescription` "museum scans" -> "painting reproductions"; L176 "each museum's unrecorded imaging" -> "each source's unrecorded imaging"; L184 "after the museum sampling" -> "after the sampling"; L226 "against my own museum evidence" -> "against my own sampled evidence".
- R3: L129 "Neither file carries an embedded ICC profile. That absence is itself a finding… Both files are untagged… no calibration transform was applied… because none is documented for either file. The same goes for the charts: …" -> "Neither committed file carries an embedded ICC profile, and the absence means different things for the two. The DMA's served file does carry one, an sRGB v4 perceptual-intent profile; the committed copy was rendered through it and saved untagged, so its channel values are the museum file's color-managed sRGB rendering, not its raw channels. The 1930 file is untagged at its Commons source. … No calibration against the chart was applied anywhere in this analysis: …"; L134 code comment "No calibration transform is applied; none is documented." -> "No calibration against the chart is applied."
- R4: L176 "The tickets say the same thing in four words—… takes them at their word" -> "The palette ticket says the same thing in six words—… takes it at its word".
- R6 (quotations only): L41 "ranked my red as "matching neither era"" -> "ranked my red as matching neither era"; L108 "the token that "matched neither era,"" -> "the token that matched neither era,"; the "never ran two blues" sentence left as is, already labelled a model hypothesis.
- R9: L100 "the "commonly cited screen approximations" of classic Mondrian" -> "the commonly cited screen approximations of classic Mondrian".
- R11: L218 "in about four seconds" -> "in seconds".
- R5: left as is; the page already gives the tokens beside the samples and attributes the deltas to compression, and "mustard" is the author's own account of the exchange.
- R7: left as is; the author's own testimony, corroborated by #498's first body.
- R8: left as is; the author's own testimony about the conversation, and the ticket's facts (three raw backgrounds, one `--project-bg` definition) hold.
- R10: left as is; L106 already labels `#151A1A` "another neutral reading, and so subject to the same isolation caveat", and L127 says the published function does not reach the neutral planes.
- R12: left as is; the author's own testimony of his prompt.
- L210 "The ticket calls the 1930 red and blue museum-derived": left as is; it reports the ticket's own label (#498 grouped the 1930 scan under "museum digitizations"), not the post's assertion. Flagged for the coordinator in case a one-clause gloss is wanted.
- STALE rows: none.
- Other files: none needed.
