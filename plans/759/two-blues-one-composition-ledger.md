# Facts ledger—#742 `two-blues-one-composition`

Post source: `src/content/blog/two-blues-one-composition.md`, published `date: 2026-06-11`. Pre-revision baselines: **2,911 words** whole-file `wc -w` (the figure #742 quotes) and **2,455 words** body-only, counting from the closing frontmatter fence. Evidence repo: `nathanjohnpayne/nathanpaynedotcom`—**this** repository. Bare `#NNN` means this repo. Shared cache: `plans/759/refs.json`.

Verdicts: **SUPPORTED** · **WRONG** (corrected value given) · **UNPROVABLE** (defensible weaker form given).

**Six-digit hex values are not issue numbers.** `plans/759/refs.json` → `rejected_not_references` already records `#000`, `#224089`, `#323137`, `#333333` and `#333` as confirmed non-references. Do not re-litigate them. The only real citations in this post are issues #497 and #498 and PRs #499, #500 and #504.

**Method notes carried from #740, #739, #741 and #744.** An issue body is evidence of what someone believed at the time, not of what happened. A closure timestamp is not evidence of duration or success. Check chronology, do not assume it. Check what a review or an audit actually said, not that it exists. Count with the loosest correct matcher, then narrow. A figure quoted "as of `<date>`" must exclude observations after that date. Distinguish disprovable from unprovable. And when you assert something, grep for the *claim*, not for the phrasing you remember writing.

**This audit had an unusual advantage and the drafting pass should exploit it.** Both museum images ship in this repository, and both `git`-historical CSS states are recoverable. Almost every colour number in this post is independently reproducible from artifacts a reader can download. That turns most of #742's "a reader cannot reproduce the numbers" complaint into a publishing problem rather than an evidence problem—see §J for the recipe.

---

## A. The sampled museum values—reproduced, and they hold

Every figure below was re-measured from the two JPEGs committed at `public/blog/two-blues-one-composition/img/`, independently of the post, using per-channel medians over HSV-bucketed pixels (§J). No calibration transform was applied, because none is documented and none is possible from the files as shipped.

| File | sha256 | Pixels | Embedded profile |
|---|---|---|---|
| `composition-ii-red-blue-yellow-1930.jpg` | `cf3345af4c5c7456d061f853ed5e7749eae22392df87c8b1012a339c81f07ccd` | 1183 × 1200 | sRGB IEC61966-2.1 |
| `composition-large-blue-plane-1921.jpg` | `97e0ef7349d4346002045fa5b96339b8beb47a033284328a27adf8ab2f1b13cb` | 996 × 1200 | sRGB IEC61966-2.1 |

### A1—The 1930 scan values

> "The actual red is `#DE2822`… The blue sampled `#025D9E`… And the canvas yellow read `#EEDB6E`" (L111)

**SUPPORTED as measurements, WRONG as "the actual red."** My independent medians on the shipped file: red `#DE2922`, blue `#015D9D`, yellow `#ECD971`. Red and blue reproduce to within one 8-bit step per channel; yellow to within three. The red median is stable at `#DE2922`–`#DE2923` across every saturation threshold from 0.0 to 0.75, which is exactly the robustness the post claims for it.

What does not survive is the word **actual**. These are medians of one downscaled, JPEG-recompressed, sRGB-tagged reproduction of a 45 × 45 cm painted surface, carrying gallery lighting, an unrecorded imaging pipeline, and ninety-six years of paint chemistry. Issue #498's own token table says as much—"treat sampled values as hue anchors"—and #742's acceptance criteria ask for exactly this substitution. Defensible form: "the median of the red plane in this reproduction is `#DE2822`." Source: `public/blog/two-blues-one-composition/img/composition-ii-red-blue-yellow-1930.jpg`; §J script.

### A2—The 1921 scan values

> "Museum blue `#0383E3`… The gray plane read `#DADFE5`… The black plane sampled `#323137`" (L109)

**SUPPORTED, and the closest reproduction in the post.** My medians on the shipped 1921 file: blue `#0383E2`, gray `#DBDFE4`, black `#323339`. Blue is one step off, gray two, black two. Issue #498 independently records the same 1921 blue as `#0383E3` in its token table.

The same file also carries the two values the post asserts without a number: the 1921 red plane medians `#FC7C5A` (a vermilion orange-red—issue #498 records `#FC7E5A`) and the yellow `#F1DF75` (a pale lemon—issue #498 records `#F2DF75`). The post's sentence "the 1921 canvas pairs its cerulean with a vermilion orange-red and a pale lemon yellow" is therefore measurable, not impressionistic, and should carry those two numbers. Source: same file; §J script; `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/498` → `.body`, § Token specification.

### A3—"468,315 of them for the 1930 red alone"

> L105

**UNPROVABLE, and not reproducible from the published file at any natural threshold.** The shipped 1183 × 1200 image has 1,419,600 pixels total. My red mask returns 721,970 pixels at loose thresholds and 337,794 at saturation ≥ 0.85; 468,315 falls in a gap between two adjacent thresholds and corresponds to no stated rule. The post also describes the source as "a high-resolution scan," which the 1183 × 1200 web copy is not, so the count almost certainly came from a larger file that is not published.

Defensible form: drop the count, or publish the mask rule and the file it was counted on. The count is doing rhetorical work ("robust medians… to rule out highlight artifacts") that the median's *stability across thresholds* does far better and can be shown in one line. Source: §J script, threshold sweep.

### A4—"two museum-grade color verifications" / the X-Rite claim

> L58; image caption L72: "the X-Rite ColorChecker calibration chart visible at the top edge is what makes a scan like this usable as a color source"

**Half SUPPORTED, half WRONG, and the halves are not the ones the post implies.**

The chart is genuinely there. Zooming the top 40 pixels of the 1921 file resolves the legend "X-rite ColorChecker® Color Rendition Chart" along the upper edge. The caption is not inventing it.

But **only the chart's printed label bar is in frame; the colour patches themselves are cropped out of the published file.** A reader cannot use the chart to verify anything, and its presence proves only that a chart was in the frame at capture time—not that the JPEG was colour-managed against it, and not that any calibration transform was applied downstream. The caption's "is what makes a scan like this usable as a color source" asserts the transform from the chart's mere visibility.

And the 1930 file **shows no calibration reference at all**—no chart, no grey card, no scale. So "two museum-grade color verifications" is one shot with a cropped chart and one shot with nothing. Defensible form: name what is visible, say plainly that no calibration transform is documented for either file, and state the uncertainty (capture lighting, ageing, restoration, digitisation, compression, profile, display) once, as #742 asks. Source: `/tmp` crop of the 1921 file's top 40 rows; visual inspection of both files.

---

## B. The screenshot samples do not match the tokens they describe

### B1—The four opening hexes

> "The red came back as `#C01D18`… The yellow came back as `#D9B314`… `#224089` on the Mergepath plane and `#2280CA` on the Friends & Family Billing plane." (L62)

**WRONG as descriptions of the site's colours, though probably right as descriptions of the screenshots.** The tokens in force at the moment those screenshots were taken were:

| Post's sampled value | Actual token at `9d6139f` | Δ per channel |
|---|---|---|
| `#C01D18` | `--red: #c11d19` | 1, 0, 1 |
| `#D9B314` | `--yellow: #d9b111` | 0, 2, 3 |
| `#224089` | `--blue: #223f89` | 0, 1, 0 |
| `#2280CA` | `--lightblue: #2080ca` | 2, 0, 0 |

The project accents confirm the plane attribution exactly: `mergepath.md` carried `accent: "blue"` / `accentColor: "#223f89"` and `friends-and-family-billing.md` carried `accent: "lightblue"` / `accentColor: "#2080ca"`. So *which* plane held *which* blue is right; the values are one to three steps off, consistent with lossy screenshots.

This matters more than the size of the deltas, because it is the post's own thesis in miniature: the screenshot samples are themselves a reproduction with an unrecorded pipeline, and the post treats them as ground truth while treating the museum samples as approximations. Defensible form: give the sampled values *and* the tokens, and say the deltas are screenshot compression. Source: `git show 9d6139f:src/styles/global.css` L36–39; `git show 9d6139f:src/content/projects/*.md`.

### B2—The silent switch from `#C01D18` to `#C11D19` and from `#2280CA` to `#2080CA`

> L62 vs L74 ("my `#2080CA` was a slightly tempered but defensible match") and L111 ("my brick `#C11D19`")

**Internally inconsistent.** The post samples one value and later quotes a different one as "my" value, without noting that the second is the token and the first was the screenshot. A reader tracking the argument sees two different reds and two different blues attributed to the same object. Fixing §B1 fixes this too.

---

## C. The production-CSS audit

Issue #497 states the audit source: "production built CSS (`/_astro/global.XofGYe7g.css`, fetched 2026-06-11), **validated against source** `src/styles/global.css` on `main` @ `9d6139f`." The hashed artifact is long gone, but the source state is recoverable and I re-minified it with the repository's own `lightningcss` to reconstruct what a shipped artifact would have contained.

### C1—"four `[data-accent=*]` scopes defined `--accent-soft` as `rgba()` literals"

> L95

**WRONG. Six.** Issue #497's main table lists four (findings 6–9: red, yellow, blue, lightblue) and its **Addendum—same problem class, missed by the original audit** adds two more (A1 black `rgba(51, 51, 51, 0.12)`, A2 paper `rgba(91, 95, 100, 0.12)`), plus A3, a sixth scope whose `--accent` was itself a raw literal `#5b5f64` with no `:root` token behind it. PR #499 converted all six.

The post is quoting the pre-correction number in a paragraph whose whole point is that the deeper pass found more. Corrected value: six `--accent-soft` literals, four found on the first pass and two on the addendum, plus one raw `--accent` literal. Source: `git show 9d6139f:src/styles/global.css` L1368/1375/1382/1389/1396/1403; `git show bd70b4f -- src/styles/global.css`; issue #497 § Audit findings.

### C2—"Those are invisible to any hex search"

> L95

**WRONG for the artifact the post says was audited, right for the source.** Re-minifying the pre-change stylesheet with `lightningcss` converts every `rgba()` to eight-digit hex and leaves **zero** `rgba(` tokens. In that artifact the four plane literals are `#c11d191f`, `#d9b1112e`, `#223f891f` and `#2080ca1f`—all of which a plain `223f89` / `c11d19` grep finds.

The post cannot have it both ways, and says both in the same paragraph: "Search the shipped CSS for `223f89` and you find it" (true—the hover ring survives as `#223f892e`) sits four sentences from "invisible to any hex search" about literals the same minifier renders in the same form.

The corrected version is a **better** version of the post's own lesson. The `rgba()` literals were invisible in the **source**, which is where issue #497 located them and where its acceptance criterion greps (`grep -rnE 'rgba\(\s*(193|217|34|32|51|91)\s*,' src/styles/`). The build *flattens* them into hex-searchable form, which is the opposite of the drift-hides-in-the-artifact story—and the sharper point: source and artifact each hide a different class of drift, so you have to grep both. Source: `node -e` over `lightningcss.transform({minify:true})` on `git show 9d6139f:src/styles/global.css`; issue #497 § Acceptance criteria.

### C3—"The audit also corrected itself twice along the way"

> L97

**WRONG—an undercount, and the undercount hides the strongest evidence for the post's own thesis.** The record carries at least seven corrections across the two tickets:

- #497 addendum A1, A2 (two more `--accent-soft` scopes) and A3 (the untokenised `--accent: #5b5f64`), all labelled "missed by the original audit."
- #498 amendment A1—frontmatter `accentColor` inline styles beat the `[data-accent]` scopes, so "a `:root` remap will not recolor project detail pages at all." This is a **blocker for the ticket's own premise**, found in validation.
- #498 amendment A2—stale gradient washes in project frontmatter.
- #498 amendment A3—the contrast audit had been under-scoped to yellow; red was equally unsafe.
- #498's dated revision note: "**Revision 2026-06-11:** token spec updated against museum digitizations—1930 `--red` and `--blue` anchors revised, interior `--accent-black` now unchanged, D2 reframed."

Corrected value: two corrections to the CSS extraction plus five validation amendments across the two tickets, one of which (#498 A1) would have made the palette split a no-op on every project page. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/497` → `.body` § Addendum; `.../issues/498` → `.body` §§ Revision, Amendments.

### C4—"Its first pass claimed `#223F89` was hardcoded twice; the second occurrence was actually the alpha variant"

> L97

**UNPROVABLE as stated, and the reconstructed artifact points the other way.** The pre-change *source* contains exactly one literal `223f89` (the `--blue` token at L38) plus one in a comment at L3374. The reconstructed *artifact* contains **three**: `#223f89`, `#223f891f` (the 12% `--accent-soft`) and `#223f892e` (the 18% hover ring). Neither surface supports "twice." Defensible form: state the surface being grepped and the count on it, or drop the anecdote—§C3 has better self-correction material than this one. Source: `grep -ni '223f89'` on `git show 9d6139f:src/styles/global.css`; minified reconstruction as in §C2.

### C5—The claims about the hover ring and the gray-blue plane

**SUPPORTED.** `rgba(34, 63, 137, 0.18)` at source L2211 is ultramarine at 18% (0.18 × 255 = 45.9 → `0x2e`, so `#223f892e` in the artifact—the post's "roughly 18% opacity" is exact). And the gray-blue correction is right: `#DDE1E5` appeared as **three** raw `background` declarations (L2320, L2331, L2344) that were bypassing a fourth, independent definition inside the `[data-accent="paper"]` `--project-bg` system at L1404. The post's "the three raw usages were bypassing" matches the record exactly. Source: issue #497 findings 1–5; `git show 9d6139f:src/styles/global.css`.

### C6—"My pages already carry `data-accent` attributes that redefine `--accent` and `--accent-soft` per scope"

> L99

**SUPPORTED.** Six `[data-accent=*]` scopes exist at `9d6139f`, each defining `--accent`, `--accent-contrast`, `--accent-soft` and `--project-bg`. Issue #498 confirms the parallel `dataAccent` prop wiring in `BaseLayout.astro` and only needed a `dataPalette` prop beside it. The "the codebase had already voted" beat is real. Source: `git show 9d6139f:src/styles/global.css` L1367–1406; `git show 4ab38cc:src/layouts/BaseLayout.astro` L16/39/62/178.

---

## D. The post-ship audit

### D1—The greens that hold

> "`#dde1e5` appears exactly once, as the token definition. The old `#223f89` is gone entirely. Zero baked `rgba()` plane literals." (L136)

**SUPPORTED, all three, and reproducibly.** Minifying the post-#504 stylesheet (`8bebc31`) gives `#dde1e5` × 1, `223f89` × 0, and `rgba(` × 0—stronger than the post claims, since *no* `rgba()` survives at all, plane or otherwise. In source at the same commit the same three hold. Source: `git show 8bebc31:src/styles/global.css`, direct grep and `lightningcss` minified.

### D2—"Seventy-four `color-mix()` usages… the source carries seventy-six; the minifier precomputes two"

> L136

**WRONG, and the explanation is mechanically impossible.** The source figure is right: `src/styles/global.css` at `8bebc31` carries exactly **76** `color-mix(` calls, and it is the only file in `src/` that carries any. But **all 76 take a `var()` custom property as their first colour argument**—verified by parenthesis-balanced parse, zero calls with no `var()`. No minifier can statically resolve a custom property, so none of them can be precomputed. Running the repository's own `lightningcss` over that file with `minify: true` returns **76**, not 74.

Whatever produced 74 was not precomputation. The most likely explanation is that the audit grepped one hashed per-page bundle rather than the whole shipped CSS, which is a real and interesting source-versus-artifact gap—just not the one claimed. Defensible form: report 76 in source, say which artifact file was counted and what it returned, and explain the gap or drop it. Source: `git show 8bebc31:src/styles/global.css`; parenthesis-balanced parse; `lightningcss.transform({minify:true})`.

**And the attribution is wrong even where the number is right.** The two tickets the post credits took `color-mix(` from 6 → 21:

| Commit | PR | `color-mix(` in `global.css` |
|---|---|---:|
| `9d6139f` | (pre-work baseline) | 6 |
| `bd70b4f` | **#499**—route palette colors through custom properties | 18 |
| `4ab38cc` | **#500**—split palette registers | 21 |
| `a3554ab` | **#503**—route alpha-baked ink and veil colors through tokens | **76** |
| `8bebc31` | **#504**—opt the home OG card into 1930 | 76 |

Fifty-five of the 76 came from **PR #503**, a third ticket the post never mentions (§E2).

### D3—"the override scope carries `#DA2418`, `#F0C800`, and `#0A5C9E`—the museum-derived values"

> L136

**The hex values are SUPPORTED; "the museum-derived values" is WRONG, and wrong in the direction that matters most to this post's thesis.** The shipped 1930 override is exactly `--red: #da2418; --yellow: #f0c800; --blue: #0a5c9e;`, and the interior `:root` is exactly `#e8784a` / `#e3d477` / `#2080ca`. Both match the post and both diagrams.

None of the three 1930 values is a museum sample:

| Token | Shipped | Museum median (§A1) | What issue #498 says |
|---|---|---|---|
| `--red` | `#DA2418` | `#DE2822` | "`#DA2418` **starting point**… museum-derived (*Composition II*, 1930, scan median `#DE2822`)" |
| `--yellow` | `#F0C800` | `#EEDB6E` | "the actual canvas samples soft (`#EEDB6E`—aged cadmium)… **Icon recognition argues for the `#F0C800`–`#F8D000` range; object fidelity argues softer. Tune by eye and by conviction.**" |
| `--blue` | `#0A5C9E` | `#025D9E` | "`#0A5C9E`… museum-derived (scan median `#025D9E`)" |

The yellow is the sharp case: `#F0C800` is *the pop-culture value the museum scan contradicts*, kept deliberately for icon recognition over object fidelity. The post spends a whole section ("Make the model cite its sources") demolishing `#F8D000` as pop-culture Mondrian, then ships `#F0C800`—the same register—and labels it museum-derived. Red and blue are eye-tuned from museum anchors; the ticket's own final task says "Eye-tune all starting-point values at real plane scale… tuning happens in tokens, never in component rules."

Corrected value, and it is the better story: the museum scans set the **hue anchors**; the shipped values are eye-tuned from them, and one of the three was deliberately overruled in favour of recognisability. That is a designer making a judgment call *against* their own evidence and saying why—which is exactly the "human decisions vs agent contributions" split #742 asks the post to surface. Source: `git show 8bebc31:src/styles/global.css` L228–232 and `:root`; issue #498 § Token specification.

**Related, and worth its own line:** `--accent-black` stayed `#333333` everywhere. The post says the `#323137` sample proved it "museum-accurate the entire time," which is true **for the 1921 canvas**. My median for the 1930 canvas's black plane is `#151A1A`—far darker—and issue #498's Decision D1 recommended darkening the homepage black to `#1A1814` on exactly that reasoning, with a named risk about the interactive Community panel's affordance. D1 was resolved to keep `#333333`. So one of the four decision checkboxes was resolved *against* the museum evidence too, and the post's "a planned change to it got deleted from the ticket" collapses an interior spec change and a live homepage decision into one sentence.

### D4—"the OG images regenerated per register (PR #504), the homepage card sampling the 1930 set and the projects card sampling vermilion, lemon, and cerulean, with cache-busting params on both"

> L136

**WRONG on two of three counts.** PR #504 (`8bebc31`) touches exactly four files—`docs/css-architecture.md`, `src/layouts/OgCard.astro`, `src/pages/og-templates/home.astro`, `tests/og-palette.test.js`—adding an optional `palette?: '1930'` prop to `OgCard` and passing it from the home template only.

- **The projects card was not changed.** It inherits the 1921 `:root` default because the split already made 1921 the default; nothing in #504 "samples" anything for it. That is a *consequence* of #500, not a deliverable of #504.
- **#504 added no cache-busting.** `BaseLayout.astro` has carried `` const ogImageUrl = … `${ogImage}?v=${buildTime}` `` since before this exercise began—it is present at `9d6139f`, prior to #497. Attributing it here is wrong.
- The homepage card opting into 1930 is **SUPPORTED**, and #504 also added a vitest lock (`tests/og-palette.test.js`) asserting the opt-in is homepage-only—a better detail than the cache-busting claim it can replace.

Source: `git show 8bebc31 --stat` and full diff; `git show 9d6139f:src/layouts/BaseLayout.astro` L53–56.

### D5—"#497… changed zero rendered pixels" and its grep criteria

> L130

**SUPPORTED with one precision fix.** PR #499 is a single-file, 23/21-line diff; every replacement is `var()` or `color-mix(in srgb, C N%, transparent)` at the identical percentage the `rgba()` alpha carried, which is computed-value identical. The `#dde1e5` criterion does return exactly one match after #499, because the PR also reworded the comment at L2316 that had carried the raw hex—issue #497's criterion as written permitted a comment match ("returns only the `--gray-plane` definition plus code comments"), and the implementation went one better. The `rgba()` plane-literal criterion returns zero. Source: `git show bd70b4f`; `grep` over `git show bd70b4f:src/styles/global.css`.

### D6—The four decision checkboxes

> "Every judgment call—the homepage black plane, the interior blue, the wash derivation, the token retirement—was an explicit decision checkbox with a recommendation prefilled" (L132)

**SUPPORTED, exactly and in order.** Issue #498 § Decisions: D1 homepage `--accent-black`, D2 interior `--blue`, D3 wash derivation, D4 `--lightblue` retirement—each with a "recommend" clause. Source: `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/498` → `.body` § Decisions.

### D7—The contrast audit "found real cases"

> L132

**SUPPORTED, and the post undersells it.** Issue #498 amendment A3 names the two rules (`.project-related__list a:hover` L1978, `.blog-sidebar-toc-list a:hover` L2886), the two failing colours, and a measured ratio: 1921 yellow `#E3D477` on cream is "≈1.2:1", and it explicitly corrects the original audit for missing that red fails too, since blog posts, 404 and resume are all `dataAccent="red"`. The fix shipped as a `--accent-text` derivation at `color-mix(in srgb, var(--accent) 45%, var(--ink))` (issue #498 suggested 55%), routed through both named rules plus the project-link rules. Source: issue #498 § A3; `git show 8bebc31:src/styles/global.css` L1377, 1898, 1907, 1979, 2887.

---

## E. Chronology and ticket count

### E1—"On June 11, 2026, I handed Claude two screenshots"

> L56

**SUPPORTED.** Every artifact in the arc has a UTC timestamp on 2026-06-12 but a local timestamp on 2026-06-11—the repository's commits are all `-0700`. Issue #497 opened `2026-06-12T01:03:07Z` = 18:03 on June 11 Pacific; PR #504 merged `2026-06-12T03:55:06Z` = 20:55 the same evening. The entire exercise, from first ticket to last merge, fits inside **2 h 52 m of one calendar evening**, and the post's `date: 2026-06-11` is correct. Unlike #744, this post's chronology is sound. Source: `refs.json` → the five nathanpaynedotcom entries; `git log --date=iso`.

### E2—"two tickets" / "two tickets, four decisions"

> L58, L128, L130, L170

**WRONG as a description of the work, and the omission is load-bearing.** Four issues and four PRs shipped in that 2 h 52 m window:

| Opened (UTC) | Item | Kind | Closed / merged (UTC) |
|---|---|---|---|
| 2026-06-12 01:03:07 | **#497** Color token cleanup: route all palette colors through custom properties | issue | 02:18:08 |
| 2026-06-12 01:12:08 | **#498** Palette split: 1921 register for interior pages, 1930 register for homepage | issue | 03:07:13 |
| 2026-06-12 02:12:32 | **#499** Route all palette colors through custom properties | pull | merged 02:18:07 |
| 2026-06-12 02:49:46 | **#500** Split palette registers: 1921 interior, 1930 homepage | pull | merged 03:07:12 |
| 2026-06-12 03:05:25 | **#501** Contrast-color cleanup: route alpha-baked ink and veil colors through tokens | issue | 03:33:12 |
| 2026-06-12 03:07:49 | **#502** OG images render in 1921 register; decide whether home.png should carry 1930 | issue | 03:55:07 |
| 2026-06-12 03:23:38 | **#503** Route alpha-baked ink and veil colors through tokens | pull | merged 03:33:11 |
| 2026-06-12 03:48:04 | **#504** Opt the home OG card into the 1930 register | pull | merged 03:55:06 |

The "strict sequence" claim is **SUPPORTED**—#499 merged 02:18:07, #497 closed one second later, and #500 did not open until 02:49:46, thirty-one minutes after the refactor landed. That is real and worth keeping.

But #501/#503 is the exercise's *third* refactor, it produced fifty-five of the seventy-six `color-mix()` calls the post cites as its outcome (§D2), and the post never names it. #502 is the issue the post's "loose end I expected to become the punch list was already handled" line refers to—filed 37 seconds after #500 merged and fixed by #504 forty-eight minutes later, which is a fast follow, not a thing that was already done.

Corrected value: four issues and four PRs in one evening. The two-ticket refactor-then-values *sequence* is a genuine and defensible design choice and should stay the spine of the section; the tally sentences ("two tickets") should say four, or say "the two tickets at the centre of it" and name the two follow-ups. Source: `refs.json`; `gh api repos/nathanjohnpayne/nathanpaynedotcom/issues/{501,502,503}`.

### E3—"two self-corrections"

> L162, L170

**WRONG.** See §C3—the record carries seven, including one (#498 A1) that would have made the whole palette split a no-op on every project page. Correct the number upward; it is the post's best evidence.

### E4—Who did the plumbing

> "The agent does the plumbing. I ratify the judgment." (L132)

**SUPPORTED, with an unrecorded detail worth adding.** All three implementation PRs ran on `codex/*` branches—`codex/issue-497-color-token-cleanup`, `codex/issue-498-palette-split`, `codex/issue-502-og-home-palette`—while the sampling, the critique and the audit were Claude's. The post's "the agent" is really two agents in different roles: one analysed and wrote the tickets, another implemented against them. That is a stronger version of the same claim and costs one clause. Source: `refs.json` → `.head` on #499, #500, #504.

---

## F. The art-historical premises

### F1—"Mondrian never ran two blues in a single painting. Within a composition, each primary appears at exactly one hue."

> L64

**UNPROVABLE, and #742 is right that its provenance is the worst in the post.** It arrived from the same model whose recalled hexes the post later demolishes, it is a universal claim over a corpus of several hundred works, and no source is cited. Nothing in this repository can settle it.

Defensible form, and it costs the post nothing: the *design* argument never needed the universal. Two planes on one screen, sourced from two different canvases, read as disagreeing with each other regardless of what Mondrian did across his career. State the premise as the model's hypothesis, note that it was never verified, and rest the conclusion on the coherence argument the post already makes better—"a sourced decision and an accidental one look identical in the browser." That sentence does not depend on Mondrian at all.

### F2—"the 1930s register" / "the 1921 register"

> L76, L82, L84, both diagrams, the sidebar caption, and the `[data-palette="1930"]` selector name

**UNPROVABLE as an era-wide taxonomy.** Two paintings support "the values sampled from these two reproductions." They do not support a claim about what Mondrian's palette was in 1921 versus 1930 as periods. #742 asks for exactly this narrowing.

Defensible form, and note this one is cheap: the *code* can keep `[data-palette="1930"]`—it is a token name, and renaming it is a real diff across CSS, layouts, a test and a doc for no evidentiary gain. The *prose* should say the registers are named for the two specific works they were sampled from. One clause at first use covers every later mention. Source: `git show 8bebc31:src/styles/global.css` L228; `tests/og-palette.test.js`; `docs/css-architecture.md`.

### F3—Image provenance, titles, and rights

**Partly WRONG, partly unverified, and one caption is actively misleading.**

**The 1930 title does not match the museum's own record.** The post calls it *Composition II in Red, Blue, and Yellow*, 1930, Kunsthaus Zürich, and links `collection.kunsthaus.ch/en/collection/item/2455/`. That record titles the work **"Komposition mit Rot, Blau und Gelb" / "Composition with Red, Blue and Yellow"**, 1930, oil on canvas, **45 × 45 cm**, inventory **1987/0028**, credit line **"Kunsthaus Zürich, Donated by Alfred Roth, 1987."** The link is right and the object is right; the caption should carry the museum's title, inventory number and credit line, which #742 asks for and which costs one line.

**The 1921 caption points at a file the counter-argument did not use.** The post's counter is "I sent Claude a **poster reproduction**" and the poster's blue "read `#028DE2`." The image displayed under that paragraph is captioned as the **museum's own digitization**—and my measurement confirms the displayed file is the museum scan, not the poster: it medians to `#0383E2`, matching the museum value, not the poster's `#028DE2`. So the figure a reader sees is not the artifact the argument in that paragraph rests on. Either caption it as the DMA scan introduced later in the piece, or say plainly that the poster is not published.

**Reuse rights are unverified for both.** Mondrian died in 1944, so the paintings themselves are out of copyright in life-plus-70 jurisdictions, but a museum digitisation can carry its own claim depending on jurisdiction, and neither institution's terms were checked here. The DMA object page did not render for automated retrieval, so accession 1984.200.FA is unconfirmed beyond the two tickets that assert it. Flag as a human task, not an audit finding. Source: `collection.kunsthaus.ch/en/collection/item/2455/`; §J measurement of the published 1921 file.

---

## G. Where #742's own framing is contradicted by the evidence

**Read this section before drafting.** #742 was written from the same unverified prose this ledger audits, and three of its premises do not survive.

### G1—#742 says the numbers cannot be reproduced. Most of them can, from files already in this repository.

> "The post reports medians (including 468,315 red pixels) without the source image version, download URL, hash, color profile, crop/mask rule, conversion space, sampling script, or uncertainty. A reader cannot reproduce the numbers."

Both museum JPEGs are committed at `public/blog/two-blues-one-composition/img/`, both are sRGB-tagged, and a nine-line script reproduces every published median to within three 8-bit steps (§A1, §A2, §J). The missing pieces are the **hash, the profile, the mask rule and the script**—all publishable in a short methods note. The one figure that genuinely does not reproduce is the pixel count (§A3).

The acceptance criterion "Publish the sampling method and inputs" is therefore *satisfiable in full*, not a reason to soften the colour claims. Do not let the drafting pass hedge the medians into vagueness when they are the most solid evidence in the post.

### G2—#742 treats the X-Rite question as "overstates the documented method." It is worse and more specific than that.

> "A visible X-Rite chart does not by itself prove that the downloaded JPEG was calibrated… 'Museum-grade color verifications' overstates the documented method."

Correct as far as it goes, but it misses two facts the files settle. The chart's colour patches are **cropped out** of the published 1921 file—only the printed legend survives, so the chart is unusable even in principle. And the 1930 file, which carries the values the post leans on hardest, has **no calibration reference at all**. "Two museum-grade colour verifications" is not an overstatement of a method; it is a description of two files, one of which shows a cropped chart and one of which shows nothing.

### G3—#742 treats the CSS audit as merely unreproducible. Two of its published numbers are wrong, and one of the post's mechanisms runs backwards.

> "The production-CSS audit is numerically precise but not reproducible from the post: its command, artifact timestamp/hash, minifier version, and exact counting rules are absent."

The audit is largely reproducible from `git` and the repository's own `lightningcss`, and reproducing it turns up things #742 did not look for: the `--accent-soft` scope count is four when it should be six (§C1), the "minifier precomputes two" explanation is impossible because all 76 `color-mix()` calls take a `var()` argument (§D2), the OG cache-busting predates the whole exercise (§D4), and the "invisible to any hex search" claim is inverted for the artifact the post says was audited (§C2). #742's acceptance criterion asks for an as-of timestamp and asset hash; it should also ask for the *counts to be right*.

### G4—#742 asks to preserve "coherence can matter more than provenance." The evidence strengthens that, from an unexpected direction.

The shipped 1930 yellow `#F0C800` was chosen *against* the museum sample for icon recognition (§D3), and the homepage black stayed `#333333` against a scan that reads `#151A1A`. The post's own conclusion—provenance is invisible at render time—is demonstrated twice more by decisions the post currently mislabels as museum-derived. Restoring the labels makes the thesis land harder, not softer.

---

## H. Claims that stand as written

Do not re-audit these.

| Claim | Line | Source |
|---|---|---|
| Two blues co-existed on the projects page: `--blue` on the Mergepath plane, `--lightblue` on Friends & Family Billing | L62 | `git show 9d6139f:src/content/projects/{mergepath,friends-and-family-billing}.md` → `accent` / `accentColor` |
| `--blue: #223f89;` and `--lightblue: #2080ca;` sat side by side in `:root`, deliberate and adjacent | L88–93 | `git show 9d6139f:src/styles/global.css` L38–39 |
| The `.post-card` hover ring baked ultramarine at 18% (`#223f892e` in the artifact) | L95 | source L2211 `rgba(34, 63, 137, 0.18)`; 0.18 × 255 = 45.9 → `0x2e` |
| Three raw `#DDE1E5` backgrounds were bypassing a fourth, independent `--project-bg` definition | L97 | issue #497 findings 1–4; source L1404/2320/2331/2344 |
| The `[data-accent=*]` theming machinery already existed and needed no new work | L99 | source L1367–1406; issue #498 § Mechanism |
| PR #499 changed zero rendered pixels; every replacement is computed-value identical | L130 | `git show bd70b4f` |
| Grep criteria after #499: `dde1e5` exactly once, plane `rgba()` literals zero | L130 | `grep` over `bd70b4f:src/styles/global.css` |
| PR #500 shipped 1921 in `:root`, one `[data-palette="1930"]` block, homepage the only opt-in | L132 | `4ab38cc:src/styles/global.css` L225–229; `index.astro` L73 |
| Four decision checkboxes with prefilled recommendations | L132 | issue #498 § Decisions D1–D4 |
| The contrast audit found real failures | L132 | issue #498 § A3; shipped `--accent-text` |
| Post-ship: `#dde1e5` once, `#223f89` gone, zero baked `rgba()` | L136 | minified `8bebc31` |
| `:root` carries `#E8784A` / `#E3D477` / `#2080CA`; the override carries `#DA2418` / `#F0C800` / `#0A5C9E` | L136, both diagrams | `8bebc31:src/styles/global.css` |
| The homepage OG card opts into 1930 | L136 | `git show 8bebc31 -- src/pages/og-templates/home.astro` |
| Strict sequence: the refactor merged before the values PR opened | L130 | #499 merged 02:18:07Z; #500 opened 02:49:46Z |
| The date, 2026-06-11 | L56, frontmatter | all timestamps land on June 11 local (`-0700`) |
| 1921 canvas pairs a vermilion orange-red with a pale lemon yellow | L76 | measured `#FC7C5A` / `#F1DF75`; issue #498 records `#FC7E5A` / `#F2DF75` |

---

## I. Instructions to the drafting pass

1. Every number, date and causal claim must trace to a **SUPPORTED** row or to §J's reproduction.
2. **§D3 is the rewrite.** "The museum-derived values" is the post's most consequential error, because the yellow was chosen *against* the museum evidence and the post spends a section attacking that exact register. Replace with: the scans set hue anchors, the shipped values were eye-tuned from them, and one of the three was overruled on purpose—for icon recognition, by a human, with a reason. That is the portfolio signal #742 asks for.
3. **§A4 and §F3 are the provenance rewrite.** Say what is visible in each file, say no calibration transform is documented for either, and fix the two captions: the 1921 figure is the DMA scan and not the poster the counter-argument used; the 1930 figure needs the Kunsthaus's own title, inventory 1987/0028, and the Alfred Roth credit line. Reuse-rights verification is a human task—flag it, do not assert it.
4. **§C1, §C3 and §E3 all move numbers upward.** Six `--accent-soft` scopes, not four. Seven corrections, not two. These are the post's own evidence for its own thesis and it is undercounting them.
5. **§C2 inverts a mechanism.** Source and artifact each hide a different class of drift—`rgba()` literals are invisible to a hex grep of the *source* and the minifier flattens them into hex-searchable form in the *artifact*. Rewrite "audit the built artifact, not just the source" as "grep both, they hide different things." The `keyTakeaways` entry on L15 carries the same claim and must move with it.
6. **§D2**: 76 in source, verified; the "minifier precomputes two" explanation is impossible and must go. Either name the artifact file the 74 came from or drop the pair. And attribute the count honestly—55 of the 76 came from PR #503.
7. **§D4**: PR #504 opted the home OG card into 1930 and added a vitest lock. It did not touch the projects card and did not add cache-busting, which predates the exercise.
8. **§E2**: four issues and four PRs. Keep the refactor-then-values sequence as the spine; fix the tallies in L58 and L170.
9. **§B1/§B2**: give both the screenshot samples and the tokens, and say the deltas are compression. Do not quote a screenshot value and a token value for the same object without saying which is which.
10. Where a row says **UNPROVABLE** (§A3, §A4, §C4, §F1, §F2), use its defensible form.
11. **Two test pins constrain this post's diagrams.** `tests/mermaid-diagrams.test.js` asserts the built page contains a node styled `fill:#DA2418` **and** a `.edge-pattern-dotted` element—so the register map must keep the `#DA2418` fill and the cited-vs-canvas comparison must keep its `-.->` dotted edges, or the test moves with the post. `tests/blog-chronology.test.js` and `tests/helpers/blog-editorial-order.js` pin the slug; do not rename it. Unlike `six-prs-one-bug-agent-failure-modes`, this post has **no** pinned `headline` or `seoDescription` assertion, so frontmatter copy is free to change.
12. **The sidebar Mermaid (frontmatter L37–52) and the inline Mermaid (L141–155) are byte-identical.** #744's revision cut exactly this duplication. Either is enough to satisfy the `fill:#DA2418` pin; cutting one is the cheapest compression available here.
13. Compression: #742 sets the baseline at **2,911 words** and asks for **no percentage reduction**—"Tighten research mechanics or repeated provenance caveats only when the evidence standard remains reproducible." Per `plans/759/RUN.md` the reduction is a guideline, not a gate. Expect this post to *grow* in the methods note (§J) and *shrink* in the duplicated diagram and the repeated hex recitations, which state the same six values in prose, in a Mermaid block, and in the sidebar.
14. Recompute the word-count table as the **last** step before pushing. Three consecutive audits in this epic shipped a stale one.
15. Before pushing, grep the post for each corrected **claim**, not for the phrasing you remember writing. The count "four" (§C1), the word "museum-derived" (§D3) and the two-ticket tally (§E2) each appear in more than one place, including `keyTakeaways`, `description`, `seoDescription`, the pull quotes and the closing tally on L170.

---

## J. Reproduction recipe

Publishing this—or a two-sentence summary of it plus the hashes—satisfies #742's "Publish the sampling method and inputs" criterion outright.

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

Red `hue_lo=340, hue_hi=25`; yellow `35, 75`; blue `180, 260`; near-neutral planes by `s_min` inversion. Results on the two committed files, against the values the post publishes:

| Plane | Published | Reproduced | Δ per channel |
|---|---|---|---|
| 1930 red | `#DE2822` | `#DE2922` | 0, 1, 0 |
| 1930 blue | `#025D9E` | `#015D9D` | 1, 0, 1 |
| 1930 yellow | `#EEDB6E` | `#ECD971` | 2, 2, 3 |
| 1921 blue | `#0383E3` | `#0383E2` | 0, 0, 1 |
| 1921 gray | `#DADFE5` | `#DBDFE4` | 1, 0, 1 |
| 1921 black | `#323137` | `#323339` | 0, 2, 2 |

The 1930 red median is stable at `#DE2922`–`#DE2923` across saturation thresholds from 0.0 to 0.75, which is the robustness claim the pixel count was standing in for. Uncertainty not captured by any of this: gallery lighting at capture, the museums' unrecorded imaging and colour-management pipelines, downscaling and JPEG recompression for the web, ninety-six and one-hundred-and-five years of paint ageing and any restoration, and the reader's own display. Every number above is a property of a file, not of a painting.
