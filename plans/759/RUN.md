# Epic #759—Blog audit run state

Working worktree: `.claude/worktrees/epic-759-blog-audits-5c2791` (branch `claude/epic-759-blog-audits-5c2791`). Update this table at every phase boundary. On resume, read this first and continue from the first incomplete row.

Phase legend: `0` shared evidence cache · `1` facts ledger · `2` Fable prose draft · `3` verify + land (branch/PR/review/merge) · `done` merged.

## Order of work

Deliberate. #740 calibrates the ledger format and the Fable handoff; #739/#741 reuse #740's evidence cluster; #742 is last (sampled colour values, shares nothing with the others).

| # | Issue | Slug | Phase reached | Ledger path | Branch | PR | Status |
|---|-------|------|---------------|-------------|--------|----|--------|
| 0 | — | shared evidence cache | **0 complete** | `plans/759/refs.json` | `content/740-astro-migration-audit` | [#787](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787) | done |
| 1 | #740 | how-a-responsive-fix-became-an-astro-migration | **done** | `plans/759/how-a-responsive-fix-became-an-astro-migration-ledger.md` | `content/740-astro-migration-audit` | [#787](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787) | **merged** `28e81a7` |
| 2 | #739 | agent-approval-workflow-genesis-of-mergepath | **done** | `plans/759/agent-approval-workflow-genesis-of-mergepath-ledger.md` | `content/739-mergepath-genesis-audit` | [#791](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/791) | **merged** `bef2a56` |
| 3 | #741 | html-mockups-as-spec | **done** | `plans/759/html-mockups-as-spec-ledger.md` | `content/741-html-mockups-audit` | [#796](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/796) | **merged** `89e82c1` |
| 4 | #744 | six-prs-one-bug-agent-failure-modes | **done** | `plans/759/six-prs-one-bug-agent-failure-modes-ledger.md` | `content/744-six-prs-audit` | [#798](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/798) | **merged** `29d864e` |
| 5 | #745 | autofix-was-the-whole-cost | **done** | `plans/759/autofix-was-the-whole-cost-ledger.md` | `content/745-autofix-audit` | [#803](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/803) | **merged** `6a016ef` |
| 6 | #743 | perfect-score-wrong-axis | **done** | `plans/759/perfect-score-wrong-axis-ledger.md` | `content/743-perfect-score-audit` | [#805](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/805) | **merged** `957b977` |
| 7 | #742 | two-blues-one-composition | **done** | `plans/759/two-blues-one-composition-ledger.md` | `content/742-two-blues-audit` | [#806](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/806) | **merged** `44a7827` |

### Brevity retrofits (pass 2 of the standard procedure)

One pass for prose and facts, a separate pass for tightening, then the PR process. Applied to the four posts that merged before the two-pass order was set.

| Post | PR | Status |
|------|----|--------|
| six-prs-one-bug-agent-failure-modes | [#799](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/799) | **merged** `06f3b96` |
| how-a-responsive-fix-became-an-astro-migration | [#800](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/800) | **merged** `0ef7938` |
| html-mockups-as-spec | [#801](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/801) | **merged** `c176326` |
| agent-approval-workflow-genesis-of-mergepath | [#802](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/802) | **merged** `c6ac210` |

### Project pages—full audit, one PR per page

Shared evidence: `plans/759/project-pages-ledger.md` (151 rows, PR [#810](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/810), **merged** `0654c0a`).

| Page | PR | Status |
|------|----|--------|
| override | [#811](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/811) | **merged** `eb92c02` |
| mergepath | [#812](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/812) | **merged** `36bd72a` |
| matchline | [#813](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/813) | **merged** `af1f55b` |
| swipe-watch | [#814](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/814) | **merged** `194c7df` |
| five-across | [#815](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/815) | **merged** `8a1b80e` |
| device-source-of-truth | [#816](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/816) | **merged** `0b8dd03` |
| friends-and-family-billing | [#817](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/817) | **merged** `57d0272` |
| matchline—approval gate follow-up | [#818](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/818) | **merged** `6173aca` |

**#818 is a follow-up, not the seventh page.** Counting it as one is how a report of "all seven landed" was produced while `#814` was still open; the seventh page is swipe-watch.

### Tooling

| What | PR | Status |
|------|----|--------|
| `scripts/verify-brevity.py` + `docs/agents/blog-revision-process.md` | [#809](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/809) | **open** |

## Constraints carried across every row

- One issue, one PR. Never batch children. Never push to `main`.
- Only start the next issue's Phase 3 after the previous PR merges; Phase 1 of the next issue may overlap a PR in review.
- Soft-wrap Markdown prose (one physical line per paragraph). Em dashes closed up (CMOS).
- Lint via `~/GitHub/nathanpaynedotcom/node_modules/.bin/*`, not `npm run lint` (worktree has no local bin).
- Fable subagents get the ledger, the issue's positioning + acceptance criteria, and the current post. No repo write access, no PR driving.
- From issue three onward, also hand Fable the two most recent approved revisions as voice reference.
- Review loop per PR: fire `scripts/codex-review-request.sh` immediately on push, in parallel with `scripts/coderabbit-wait.sh`. Disposition each finding (reply AND resolve) before moving on. Codex findings get `scripts/codex-record-feedback.sh` (posts reaction + ledger); CodeRabbit findings get `scripts/coderabbit-record-feedback.sh` (ledger only, never a reaction).
- Out of scope for **the blog run above**: portfolio issues #751–758. That exclusion scoped the seven blog audits and the project-page fact audit, both of which are complete. It does not scope the portfolio-narratives run, which is those eight issues and is tracked in its own section below.

## Log

- 2026-08-25—Run initialised. Read AGENTS.md, rules/repo_rules.md, .ai_context.md, .github/review-policy.yml, epic #759. Preflight cached. Seven issue bodies fetched to `plans/759/issues/`.
- 2026-08-25—**Phase 0 complete.** `plans/759/refs.json` holds 70 resolved references (nathanpaynedotcom 32, mergepath 28, friends-and-family-billing 9, swipewatch 1)—67 at Phase 0, plus #501, #502 and #503 added during the #742 audit, each with type, title, author, created/closed/merged timestamps, merge commit, and the posts citing it. Zero unresolved.
  - Five `#NNN`-shaped tokens recorded as **rejected, not references**: `#333` (all seven posts), `#000`, `#224089`, `#323137`, `#333333`—all CSS hex colours. Do not re-litigate these.
  - The bare-`#NNN` ambiguity hazard is confirmed real and near-total: 44 of the resolved numbers **also** resolve to a different, unrelated item in the other candidate repo (e.g. mergepath#70 "Add Playwright responsive test suite" vs nathanpaynedotcom#70; nathanpaynedotcom#668 vs mergepath#668). Every citation in the posts is fully URL-qualified, so each was resolved against the repo named in its own URL, and `bare_number_collision` records the near-miss.
  - Two citation-kind mismatches surfaced for the ledgers: `how-a-responsive-fix-became-an-astro-migration` links `/pull/173` but nathanpaynedotcom#173 is an **issue**; `html-mockups-as-spec` links `/pull/90` but nathanpaynedotcom#90 is an **issue**. Carry into the #740 and #741 ledgers respectively.
  - Local checkouts confirmed present for git-level facts: `~/GitHub/mergepath`, `~/GitHub/friends-and-family-billing`.
- 2026-08-25—**#740 Phase 1 complete.** Ledger at `plans/759/how-a-responsive-fix-became-an-astro-migration-ledger.md` (335 lines, 8 sections A–H). Post baseline: 2,351 body words / 2,856 with frontmatter.
  - Verdict counts: 12 SUPPORTED, 11 WRONG, 8 UNPROVABLE.
  - The issue's own "Evidence to reconcile" bullets all **verified true**—no contradiction with #740's framing. The ledger is additive to it.
  - Largest defect found that the issue did **not** catch—ledger §E: the OG-image `fileURLToPath` story is wrong in three ways at once. The fix was PR #174 (+ test PR #175), not "#171 and #173"; #171 is the sibling robots.txt fix and #173 is an **issue**, not a PR (the post links `/pull/173`, which GitHub silently redirects, hiding the error). The bug is **not Linux-CI-specific and has zero production impact**—it breaks on Windows, and on POSIX too whenever the checkout path contains a character a URL escapes (§J3); it matches `fileURLToPath` only on plain-ASCII POSIX paths, which is what CI and the workstation use. And it was caught by the `nathanpayne-codex` reviewer on PR #171, not by "a deploy that produced empty OG images"—that was a separate real incident, issue #163.
  - Other new findings: seven hand-maintained `index.html` files at PR #30, not four (§C1, and the Mermaid node says the same wrong thing); no standalone About page has ever existed (§C2); `overflow-x: auto` on code blocks pre-dated PR #30 (§B1); "twenty-five lines of CSS" is actually the spec file's line count, the CSS diff is 52 insertions (§B2); eleven phases shipped as eight PRs, not one-per-phase (§A6); Cursor reviewed none of the migration PRs while CodeRabbit reviewed three (§F4).
  - §F4's review table is unused evidence that proves the post's own reversible-phasing claim: Codex blocked PRs #54, #62, and #63, taking three CHANGES_REQUESTED rounds on #63.
- 2026-08-25—**#740 Phase 2 + 3.** Fable subagent drafted the revision from the ledger; verified claim by claim and applied to `src/content/blog/how-a-responsive-fix-became-an-astro-migration.md`.
  - One correction applied to the draft before landing: it returned **five** `keyTakeaways`, but `tests/blog-takeaways-cta.test.js` caps them at **2–4**. The two that both hung on the four-hour PR #30 → PR #47 interval were merged into one.
  - Verification: all 17 GitHub links resolve to the correct item kind (`/issues/N` for issues, `/pull/N` for PRs)—the §E1 defect where the post linked `/pull/173` at an issue is gone. Every figure traces to a SUPPORTED ledger row. No spaced em dashes. Prose soft-wrapped, one line per paragraph.
  - Gates green: `astro build` (37 pages, 18 OG images), `vitest run` (490 passed, 1 skipped, 40 files), `eslint .` clean, `lint-prose.mjs` exit 0 (warnings only, all sentence-case headings matching the repo-wide convention).
  - Length at the time of the first commit: body 2,351 → 2,677 words. **Superseded—see the final-head accounting below.**
  - **Worktree note for later rows:** this worktree has no `node_modules`. Symlink the parent's (`ln -s ~/GitHub/nathanpaynedotcom/node_modules node_modules`) to run `astro build` / `vitest`, then **remove the symlink before committing**—`.gitignore` has `node_modules/` with a trailing slash, which does not match a symlink, so it shows up as untracked. Parent tree was verified against this lockfile (astro 7.2.4, @astrojs/markdown-remark 7.2.4) before use.
  - `plans/759/issues/` (raw `gh issue view` JSON dumps) is gitignored—noise in a diff, trivially refetched. `refs.json` is committed once here so the later six PRs read it without touching it.
- 2026-08-25—**#740 PR [#787](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787) opened**, 2,249 insertions, so above `external_review_threshold: 300` → Phase 4 routing.
  - Reviewers fired in parallel on push, as intended. **Codex cleared HEAD `11abc52` with a 👍 and zero findings after 163s.** **CodeRabbit was rate-limited immediately**, exactly as anticipated; `coderabbit-wait.sh` parsed no window from the comment, fell back to 60s, and slept before re-triggering.
  - `nathanpayne-claude` reviewer pass posted `--comment` only (above threshold, per § No-self-approve scoping). Three findings, all fixed in the same PR and recorded in ledger §I:
    - **I1 (blocking):** the Fable draft grew `seoDescription` from 143 to **242** characters. `specs/seo-metadata.md` §6 gives that field the opposite job, and the other six posts sit in a 129–150 band. Rewritten to 144.
    - **I2:** the timeline's last row cited a bare `#163–#175` range spanning a mix of issues and PRs—the exact ambiguity class this epic audits for, and the last unlinked citation in the post. Replaced with a single link to issue #163.
    - **I3:** "Apr 8, evening" was the only timeline cell without a stamped time. Split into 7:31pm (PR #70) and 7:54pm (PR #73), both derived from UTC `merged_at`.
  - **Gate trap found, worth carrying forward:** `scripts/lint-prose.mjs` lints `plans/**/*.md` as well as content, and `CMOS.EmDash` is an **error** there, not a warning. The ledger and this file both used spaced em dashes and failed the gate the moment they were committed—untracked files are not linted, so it passes silently until you `git add`. 91 dashes closed up across the two files. **Write later ledgers with closed-up em dashes from the start.**
- 2026-08-25—**#740 review loop, rounds 2–3, and the Phase 4 routing.** All bot feedback dispositioned; `review-feedback-accounting.sh` reports `clear` (6/6). Merge gate still pending.
  - **Codex round 2** on `8001191`: `COMMENTED`, 4 findings, all P2 (non-blocking, so this was already clearance). All four were correct and all four were taken, because three were factual-precision defects of exactly the kind this audit exists to catch. Ledger §J. Reactions posted via `codex-record-feedback.sh`; threads replied to and resolved via `resolve-pr-threads.sh --resolve-actioned`.
  - **CodeRabbit** posted one `potential_issue`—that "Phase 10 closes: production deploy verified" infers a verification event from an issue-closure timestamp. Correct, and worse than stated: issue #45 carries a **25-item verification checklist, all 25 unticked, zero comments**. Ledger §K, and §A5 amended. Recorded via `coderabbit-record-feedback.sh` (ledger only, no reaction, per the asymmetry).
  - **The predicted accounting deadlock fired.** After the disposition reply, CodeRabbit edited its own root comment at `21:59:02Z` (appending "✅ Addressed in commits…"), pushing `updated_at` above the reply and flipping the finding back to unaccounted. Fixed by replying again above the new floor. The PR-level restatement of the same finding needed a separate `[mergepath-comment-ack: <id> <fingerprint>]` comment—replying on the inline thread does not satisfy it.
  - **Signing agent refusal.** `git commit -S` began failing with `agent refused operation` mid-run even though `--check` reported the cache warm. `scripts/op-preflight.sh --agent claude --mode all --refresh` cleared it immediately. **Use `--refresh`, not `--check`, when signing starts refusing.**
  - **Phase 4 routing is the live blocker.** PR is 2,278 additions → `needs-external-review`, `mergeStateStatus: BLOCKED`, `reviewDecision: REVIEW_REQUIRED`. `phase-4b-review.sh` (run from the `main` checkout, never this one) returns **exit 6 = barrier pending**: it needs a reviewer signal pinned to the current HEAD, and fix commits keep moving the HEAD out from under the prior signals.
    - Codex arm: round 3 returned exit 4 with **`blocked_reason: not_connected`**—the Codex GitHub App is unavailable (issue #722's condition), which is an unambiguous "4a unavailable" → Phase 4b. The barrier now reports `codex: waived`.
    - CodeRabbit arm: `coderabbit-wait.sh` cleared `10db69b` with 0 findings, but the barrier's probe still reads `not-yet` (it wants a review object pinned to the head, not the issues-endpoint comment `coderabbit-wait` matches). On the third run the barrier posted its own CodeRabbit trigger (`trigger: triggered`).
  - **Round-count judgement, recorded on the PR** ([comment](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787#issuecomment-5417415317)): firing a third `@codex review` is not the runaway case. `max_review_rounds` escalates on *repeated substantive disagreement*; rounds 1 and 2 both ended in clearance (👍/0 findings, then 0 P0/P1) and every finding was accepted rather than disputed. The counter is agent-maintained, not enforced in `codex-review-request.sh`. Moot in the end—Codex turned out to be `not_connected`.
- 2026-08-25—**#740 round 3.** Codex recovered from `not_connected` and reviewed `10db69b` alongside CodeRabbit: **7 more findings, all P2, all correct, all fixed** (ledger §L). Two were corrections to the ledger rather than the post. Highlights: the frontmatter `description`/`seoDescription` still carried the deployment claim §K1 retracted, which are the two most publicly visible surfaces on the page; `robots.txt` is hand-maintained and only its `Sitemap:` line is generated; `firebase.json` caches HTML/JS/CSS only, not "assets"; and §F4's review table omitted PR #49, so "eight reviewed PRs" was true but unsourced (row fetched and added rather than narrowing the prose).
  - **Fill the PR cell in the table at creation time, not in the log afterwards**—§L4 was Codex catching that this table said "in review" with an empty PR column, which a resumed agent could read as not-yet-filed.
  - **CodeRabbit's committable suggestion for §L7 would have reintroduced the claim §L1 removes** ("a same-day deployment"). Two findings in one round pulling opposite ways. Take the count from one and the verb from the other; a suggestion is not an instruction.
  - **Careful with blanket dash normalisation.** A `replace('—','—')` sweep over this file collapsed the table's `|—|` placeholder cells into `|—|`. Normalise prose lines only, never table rows.


---

## Round-5 findings and the round limit

- 2026-08-25—**Codex round 5 on `42297a4`: 7 findings, and convergence broke** (4 → 7 → 1 → 7). Round budget for this PR is 5 per the operator's instruction, so this is the cap. Six of the seven were correct and are fixed in one final commit; the seventh is rebutted. **No round 6**—the PR goes to a manual Phase 4b handoff.
- The striking thing about round 5: **five of the seven were internal inconsistencies in the ledger and this file, not in the post.** Correcting a claim in the prose while leaving the same claim standing in the evidence artifact is its own defect class, and it is worse than a prose error, because §H tells every later drafting pass to reuse the ledger's corrected values verbatim. A stale row propagates into the six remaining audits.
  - §A7 still said the full implementation "completed"/"shipped" that day, the exact verb §K1 retracted.
  - §A6's defensible form still implied every phase had a PR, which yields nine rather than the audited eight.
  - §F4's prose still asserted the universal co-author claim that §J2 had already narrowed.
  - This file still called the `dir.pathname` defect "Windows-only", disproved in §J3.
  - This file's table row was flagged as needing a `done` status—**rebutted**, see below.
- **The one rebuttal.** Codex read the presence of the commit as proof PR #787 had landed and asked for the row to be marked `done`. It has not merged; `done` is defined in this file as merged, so "3 in progress"/"in review" is the accurate state. Marking it done pre-merge would create exactly the resume hazard the finding is worried about, in the opposite direction.
- **Rule for the remaining six audits: when a review finding corrects a claim, grep the ledger and this file for every other instance of that claim before pushing.** Four of the five self-inconsistencies above would have been caught by one grep.

---

## BLOCKED: #740 is at a manual Phase 4b handoff

**State as of 2026-08-25.** PR [#787](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787) is open at HEAD `7e6e03e`, complete, and green on every local gate. It is **not merged** and cannot be merged by this agent.

- All 21 bot findings across five Codex rounds are dispositioned. **No P0 or P1 was ever raised.** Twenty were fixed; one is rebutted on its thread. `scripts/review-feedback-accounting.sh` reports `status: clear`; every review thread is resolved.
- Local gates green at `c101bcc`, the last commit that touches shipped content (`7e6e03e` is state-only, editing this file): `astro build` (37 pages, 18 OG images), `vitest run` (490 passed / 1 skipped), `eslint`, `lint-prose`.
- The [handoff message](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787#issuecomment-5417925265) is posted per REVIEW_POLICY.md § Handoff Message Format, suggesting `nathanpayne-codex`.

**Why it is blocked.** `scripts/phase-4b-review.sh` returns exit 6 (barrier pending) every time: it wants a reviewer signal pinned to the *current* HEAD, and fixing a finding requires a commit, which moves the HEAD. Codex ran five rounds (the operator's cap)—0, 4, 5, 1, 7 findings—so convergence broke at round 5 and further rounds are not obviously terminating. CodeRabbit is unreliable here: rate-limited on first contact, and it edits its own root comments seconds after a disposition reply, which flips findings back to unaccounted (hit three times).

**What unblocks it.** A human takes the handoff to a `nathanpayne-codex` CLI session for an `APPROVED`, or merges directly. Branch protection wants one approving review and the authoring agent's own reviewer identity cannot supply it on a Phase 4 PR.

**Do not start #739's Phase 3 until #787 merges.** Phase 1 for #739 may begin now—#740 was the calibration run and both the ledger format and the Fable handoff survived a full review cycle, which was the gate.

---

## Final length accounting for #740 (head `7e6e03e`)

Recomputed at the reviewed head with the same body-only method as the baseline (`wc -w` over everything after the frontmatter). Earlier figures in the PR body and the handoff were measured at intermediate commits and are superseded.

| Measure | Baseline | Final head | Change |
| --- | ---: | ---: | ---: |
| Body words, total | 2,351 | **3,065** | +714 (+30.4%) |
| Table words | 0 | 302 | +302 |
| Prose words, tables excluded | 2,351 | 2,763 | +412 (+17.5%) |

Where the 714 words went, in rough order of size: the four-option decision record and the milestone timeline (302 words, both explicitly required by #740's acceptance criteria, and neither present in the original); the honest-gap paragraph naming the unrecorded production cutover (§K1, plus the milestone row itself); the separated telling of the reviewer-caught portability bug and the LinkedIn crawler incident as two distinct events (§E3, where the original conflated them into one wrong story); the facts-versus-estimates split in the agent-economics section; and the review record showing Codex blocking three of the eight phase PRs.

#740 sets **no reduction target** for this post—the epic's compression table says "tighten opportunistically; no percentage target"—so the growth is not a criterion violation. It is still growth, and the reason is that the audit replaced four wrong or unprovable claims with correctly-evidenced ones, and correct evidence is longer than a confident sentence.

**Skim claim, re-evaluated at the final text.** The 3–5 minute portfolio skim is carried by eight H2 headings that run problem → decision → pivot → delivery → benefit → cost → agents → lesson, plus two tables and the diagram. A reader taking only the headings, the decision table, and the milestone timeline gets the user problem, the consequential decision and its criteria, the material tradeoff, the agent collaboration model, and the outcome including its evidentiary gap. At roughly 200–250 wpm a skim of that furniture plus the opening and closing paragraphs lands inside the window; the 3,065-word figure is the deep-read length, which is the second reading mode the epic asks each post to support.

---

## #740 landed

- 2026-08-25—**PR [#787](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787) merged** as `28e81a7`; issue #740 closed. Squash-merged with `BREAK_GLASS_ADMIN=1 BREAK_GLASS_MERGE_STATE=1` on the repository owner's explicit chat instruction, because branch protection wants an approving review that no available identity could supply: the authoring agent's own reviewer identity cannot approve a Phase 4 PR, and the standing manual 4b review was `CHANGES_REQUESTED`. CI was 24 pass / 1 fail at merge, the single failure being `Label Gate` on the `needs-external-review` label, which cannot auto-clear while a change request stands.
- **Final Phase 4b review** (`nathanpayne-codex`, `pullrequestreview-5025137358`) raised four P2 items, all verified and fixed in `33fe1f5`: the missing evidence-bounded production milestone; a collision count of 45 against an actual 44 and a self-invalidating head claim; the `plans/*.md` soft-wrap convention, which I had wrongly scoped to content only; and stale length figures measured at intermediate commits.
- **Verified in the browser after merge.** Both new tables render (5-row decision record, 11-row milestone timeline including the "Not recorded" cutover row), the Mermaid diagram renders to inline SVG, 4 key takeaways, no horizontal overflow, no console errors.
- **Carry into the remaining six:**
  1. `plans/*.md` is inside the one-physical-line-per-paragraph rule. Write ledgers that way from the start; the canonical render-preserving implementation is mergepath's `scripts/lib/md_reflow.py`, driven by `scripts/lint-md-prose-wrap.sh --write`. The rule, if you are doing it by hand: join consecutive non-blank lines into one physical line per paragraph, leaving fenced blocks, tables, headings, list items and blockquotes untouched, and folding a lazy continuation onto its list item. Verify with a whitespace-normalised equality check—the transform must not change a single word.
  2. Re-measure word counts at the **final** head before writing them into a PR body or handoff.
  3. Grep the ledger and this file for every instance of a claim when a review corrects it—round 5 on #787 was five stale-copy findings.
  4. Fill the PR cell in the table at creation time.
  5. Close up em dashes when writing; the blanket `replace(' — ','—')` sweep mangles table placeholder cells, so normalise prose lines only.
  6. Batch fix commits before running `phase-4b-review.sh`—every push re-opens its HEAD barrier.

---

## Operator guidance: compression is a guideline, not a gate

Recorded 2026-08-26, from the operator in chat: **"If you think the length reduction ruins the post, you don't have to do it; it is a guideline."**

This supersedes any reading of the epic's compression table as a target that must be hit. It applies to the four remaining posts that carry a 20–30% figure—#741, #744, #745, #743—as well as to #742, which carries none.

How to apply it. Cut what is genuinely repetition: restated setup, implementation chronology that adds no decision, inventories the issue says not to lead with, and quoted config or code whose content the prose already carries. Do **not** cut evidence, decision records, tradeoffs, the boundary or provenance material the acceptance criteria require, or a correction that is longer than the wrong claim it replaces.

The #739 experience is the cautionary case. Body prose reached −20.8% at first draft and then **drifted back to −8.0% across five automated rounds, the manual Phase 4b correction, and the final CodeRabbit follow-up**, because every round replaced a short wrong claim with a longer right one: naming which of two round limits was actually tested, attributing a rejection to the wrapper's contract rather than the hook, distinguishing Codex findings from CodeRabbit's, publishing the raw observations behind the response-time statistic, and separating that population from the April 16 snapshot. Chasing the percentage back down would have meant reinstating an error. Ledger §J documents it.

State the accounting honestly in the PR body and the ledger either way, and say what was cut and what was kept. A documented miss is the sanctioned outcome; an undocumented one is not.

---

## #739 manual Phase 4b review

**State as of 2026-08-26.** PR [#791](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/791) is open and **not merged**. The author handoff targeted content head `6e08d74`; its state-only follow-up commit immediately made that mutable-head claim stale. The [`nathanpayne-codex` manual review](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/791#pullrequestreview-5025965954) requested five changes before approval.

- The automated audit produced **24 inline findings across five human-directed Codex rounds** (6, 4, 5, 3, 6), plus one PR-level P1 comment and two findings from the `nathanpayne-claude` reviewer pass. The inline rounds had no P0 or P1; the issue-level P1 remained in the universal lede at handoff because `review-feedback-accounting.sh` accounts for inline comments, not issue comments.
- The manual review's five findings are corrected in the author response: the universal claim is scoped, all 18 response-time observations are linked, the diagram carries the full seven-stage progression, stale boundary descriptions agree, and the handoff accounting is stable.
- CodeRabbit's post-sync pass raised four P2 findings: three were fixed, and the request to pin a mutable current HEAD in this file was dismissed because the next state commit would make it stale. Ledger §R records the dispositions.
- Final validation on the merged-current branch: `npm run lint`; `npm run typecheck` (0 errors); `npm test` (42 files, 497 passed / 1 skipped); isolated-port `npm run test:e2e` (327 passed / 45 skipped). The updated article was also checked directly at 375, 768, and 1440 px: seven Mermaid nodes, no label spill, and no horizontal overflow at each width.
- The original [handoff message](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/791#issuecomment-5419174028) remains the record of the transfer to `nathanpayne-codex`; this section supersedes its stale totals and head claim.

**Two repeated failures worth carrying, both mine.** §F2 inferred propagation duration from the timestamps at which four tracking issues were closed—the identical reasoning #740's §K1 had already named. And §L4's "fill the PR cell at creation time" rule, written after #787, was broken in the very next PR. **Writing a rule into this file does not cause it to be followed.** For #741 onward, the mechanical fixes are: fill the table cell in the same step that creates the PR, and never treat a closure timestamp as evidence of duration or success.

**Ledger–post drift is the dominant defect class.** Eleven of the 24 inline findings were in the ledger, 11 in the prose, and 2 in this file. Four were claims an earlier round had already corrected elsewhere in the same file. Before pushing a fix, grep **both** artifacts for every instance of the claim—a review names the instances it happened to read, not the instances that exist.

**Do not start #741's Phase 3 until #791 merges.** Phase 1 for #741 may begin now.

---

## #739 landed

- 2026-08-26—**PR [#791](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/791) merged** as `bef2a56`; issue #739 closed. Squash-merged with `BREAK_GLASS_ADMIN=1 BREAK_GLASS_MERGE_STATE=1` on the operator's explicit chat instruction, because the manual Phase 4b `CHANGES_REQUESTED` stayed pinned to a superseded commit and kept `reviewDecision` red after the findings were addressed.
- Reviewed across five automated Codex rounds, a manual Phase 4b review, and a CodeRabbit post-sync pass. **No P0 or P1 in any automated round.** Every finding dispositioned—fixed, or dismissed with reasoning on its thread.
- **Two corrections came from the parallel 4b session and beat my own work.** Its check-script count of **71** is right and my 66 was wrong: my regex `check_[a-z_]+$` silently dropped every name containing a digit, such as `check_canonical_bugs_263caf3`. And it reverted my "pin the current HEAD in this table" change with better reasoning—pinning a mutable HEAD inside a file that is itself part of the commit is self-invalidating, since committing the `RUN.md` that names HEAD X makes the HEAD Y. **Count with the loosest correct matcher, then narrow; and never pin a HEAD in a tracked file.**
- **Phantom test failure, diagnosed not reported.** `tests/mermaid-diagrams.test.js` failed on `autofix-was-the-whole-cost` and reproduced on a clean `main` checkout, which looked like main being red. It was a stale `node_modules/.astro` and `.vite` cache, shared because a single `node_modules` was symlinked across several worktrees. Clearing both directories made all 499 tests pass. **Clear the Astro and Vite caches before believing a cross-worktree test failure**—see the standing note in memory about stale worktree `node_modules`.

---

## #744 Phase 1 complete—the chronology inverts

The brief predicted #744's six-PR chronology as the most likely place for evidence to contradict an issue's framing. **It does not: issue #744's framing is exactly right**, and the contradiction is between the issue and the *post*.

All six PRs were opened **before** issue #159 existed. The last of them, #158, closed at `2026-04-04T16:16:41Z`; #159 was filed at `16:52:16Z`, thirty-six minutes later. Only #161, the fix, comes after. The post's opening—"I opened issue #159… Over roughly twenty hours, one agent opened six PRs trying to resolve it"—reverses cause and effect.

The corrected arc is a better case study and the drafting pass should be built on it: an implementation ships (#144, TipTap), three PRs chase the parity symptom with no invariant attached to the work or the review (#146, #153, #158) while two more fix orthogonal defects (#154, #155), the failures force the problem to be **named** (#159), and a reframed brief to a different agent fixes it (#161). The missing artifact was not a definition of correct—the design spec had carried one since before #144—but any link between that definition and the work under review, and that gap is precisely why six locally-reasonable PRs could each miss.

Second substantive finding: the post credits `nathanpayne-codex` with flagging the invariant on **PR #146**. It did not—it **approved** #146 and reported the round-trip working, with zero blocking reviews and zero inline comments from either reviewer. The "reviewers saw it and it shipped anyway" beat is real but belongs to **#155**, which carries three `CHANGES_REQUESTED` rounds. Blocking rounds across the six total **seven**, not the post's "nine."

Ledger: `plans/759/six-prs-one-bug-agent-failure-modes-ledger.md`.



## Ledger hygiene—learned on #798, applies to every remaining audit

**Three ledgers now live untracked on disk** (`#745`, `#743`, `#742`), excluded via `.git/info/exclude`. They were written while #744's branch was checked out, and a `git add -A` swept two of them into PR #798. Each belongs to its own PR. **Stage explicitly from here on—never `git add -A` in this worktree.**

### The ledger is a source, so audit its prose too

Five Codex rounds on #798 removed the same retracted claim five times, in five vocabularies sharing almost no substrings. Round 5 found the cause: §A1 of the ledger still asserted it, in the corrected-value column of the row meant to fix that very chronology. Every drafting pass re-seeded the error from the correction.

Two rules, now in that ledger's §M3:

1. **Audit the ledger's own prose against the ledger's own evidence.** A row can be right about its headline finding and wrong in the sentence explaining why it matters—and only the headline gets checked.
2. **When a claim survives removal, stop editing the post and go find its source.** Rounds 2–5 each removed an instance and each assumed it was the last. The recurrence was the signal; treating it as five slips instead of one upstream defect cost four rounds.

### Enumerate on the claim, not on one noun

`grep -oE '[^.]*invariant[^.]*\.'` cleared the post twice while an instance saying *definition* survived. The check that works is a disjunction over the claim's whole vocabulary, run over **both** the post and the ledger.

### Watch for quantifier scope creep

Three of round 3's five findings were a true claim stated one quantifier too wide—*every* prompt, *every* piece of HTML, *every* time. The underlying facts held; the universals did not. Flag any universal that cannot be verified exhaustively.

### Recount word counts at final HEAD

The `#744` compression figure went stale twice mid-review. Review rounds add words about as often as they remove them. Recount immediately before merge, never trust a recorded value.

### Fix the diagrams with the prose

Narrowing a claim in prose left the adjacent Mermaid diagram asserting the retracted version—in its `description=`, which is the accessible text screen-reader users receive. When a claim changes, grep the diagram titles, descriptions and node labels for it too.

## State as of 2026-08-26 evening

**Merged:** all seven blog audits (#740, #739, #741, #744, #745, #742, #743), four brevity retrofits, the project-pages ledger, all seven project pages, the matchline approval-gate follow-up, and the post-merge recount ([#823](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/823), closing #822).

**All seven blog audits and all seven project pages are merged.** Two PRs remain open: [#809](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/809), the brevity harness, and [#821](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/821), which is this update itself. **Any row above may be stale for exactly that reason**—a status file written from inside an open PR cannot record that PR's own merge, so verify against the API before resuming from a row rather than trusting it.

**#805 took a second Fable pass after review had begun.** Its thesis changed mid-review—from correlated verification to knowledge-transfer failure—and only the metadata followed. The transfer argument appeared seven times, every one in `description`, `seoDescription`, a takeaway, or the diagram, and not once in the running prose, whose explanatory core still quoted the superseded diagnosis. Patching further would have kept producing contradictions, because the argument itself had never been rewritten. **When a thesis changes, the body needs rewriting, not the surfaces that describe it.**

### The defect that produced more findings than every other cause combined

**A correction applied where a reviewer reported it, and nowhere else.** Across three blog PRs, seven project-page PRs and roughly fifteen review rounds, this outproduced every other cause. The surfaces it hides in, all observed in this run: frontmatter `description` and `seoDescription`; a Mermaid diagram's `description=` attribute, its node labels, and its caption; summary tables; worked arithmetic further down the same row; sibling files; the résumé mirror; a string pinned in a test; and the homepage card. One correction to the swipe-watch description needed **four** surfaces. One matchline sentence was fixed at line 48 and survived at line 50.

**Grep for the claim, not the phrasing, and fix every hit before dispositioning.**

### The second-order form of it, found on the ledger

A verdict downgrades a claim correctly, and the "corrected value" beneath it restates the claim in gentler words. Five of #810's twelve round-2 findings were this: a causal attribution the row had just called unprovable, a qualifier applied to two settings of three, a coverage adjective swapped for a roster-sizing one. **The replacement is the part the next pass copies, so fixing the verdict alone fixes nothing.**

### A reviewer can be right about the doubt and wrong about the half

`#810` marked the matchline extraction row SUPPORTED on the strength of a NaN guard in a review UI. Codex was right that the guard could not carry the sentence, and wrong about which clause failed. Tracing it: the field list is solid—`resume.v1.schema.ts` is `.strict()` with `skills`, `tools`, `domains`, `metrics` and `confidence_score` all required. The *approval* clause was false: `functions/src/extraction/resume.ts:237` stamps every Unit `user_approved: false` at insertion, and approval gates entry into **matching** (`functions/src/matching/pipeline.ts:278`), not into the graph. Taking the finding at face value would have weakened a true claim and shipped the false one. Fixed in [#818](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/818) after the page had already merged.

### Verification tooling is not exempt from audit

`scripts/verify-brevity.py` took roughly twenty findings across four review rounds, every one a real hole in the tool meant to catch value corruption. The two with live consequences on this collection: `$4/M` → `$4/B` compared equal, because the slash denominator was outside the numeral token; and `July 30, 2026` → `August 30, 2026` compared equal, because month-name dates—the dominant form in these posts—were outside every class. Two rounds of fixes each introduced a regression that the existing tests caught before commit. **Test both directions every round: that each hole closes, and that the epic's already-merged brevity edits still pass.**

### Rate limits

The reviewer PAT (`nathanpayne-claude`, user ID 270731004) exhausts first, and the `rate_limit` endpoint under-reports it—the authoritative signal is a `403` naming the user ID on a real call. Recovery took about nine minutes when it tripped.

**The standing rule is unchanged:** review-loop reads belong on `$OP_PREFLIGHT_REVIEWER_PAT`, per `REVIEW_POLICY.md` § PAT lookup. PR comments, review threads and check state are reviewer commands, and routing them through the author token quietly converts a rate-limit problem into an identity switch.

**Falling back to `$OP_PREFLIGHT_AUTHOR_PAT` for reads is an operator-authorized exception**, granted in chat on 2026-08-26 for this run when the reviewer credential was exhausted. It is not a replacement for the token split, and it does not extend to a later session without a fresh instruction. Prefer waiting out the window; use the fallback when waiting would block work the operator is waiting on.

**Writes never move.** Replies and thread resolutions must stay on the reviewer identity: `scripts/resolve-pr-threads.sh` runs an identity check before any mutation and refuses the author token, which is correct—resolutions attributed to the author would misrepresent who cleared the finding.

### CodeRabbit's edit floor

CodeRabbit edits its root comment to append "Addressed in commit `<sha>`" seconds to minutes after a reply, which pushes the accounting floor above that reply and makes an already-posted disposition read as stale. A settle-and-sweep loop clears it: wait ~90s, resolve, re-check accounting, re-reply above the new floor if still unaccounted, repeat. On `#805` this cleared on the second pass.

### Security thread—closed 2026-08-26, with the exposure stated correctly

The `device-source-of-truth` questionnaire blobs remain in git history and were **not** purged. Closed on the operator's decision.

**Current access is genuinely narrow, and verified:** `private: true`, `forks_count: 0`, `network_count: 0`, and collaborators limited to `nathanjohnpayne` plus the four agent bot accounts.

**But those figures do not bound the past, and an earlier draft of this section wrongly said they did.** The repository was created `2026-02-24` and went private `2026-08-26`. The blobs were committed between `2026-02-24` and `2026-03-04`. They therefore sat in the history of a **public** repository for roughly six months. `network_count: 0` rules out GitHub-side forks only—a plain `git clone` during that window leaves no API-visible trace, so no retrievable figure can testify about it.

The correct statement: **exposure during the public window is unknowable rather than zero.** Nothing indicates anyone cloned it. Going private stops all future access and was the right move. Neither fact reaches backwards.

**Decision—closed 2026-08-26, no further action.** The operator reviewed the corrected assessment above, including the six-month public window, and accepted the risk. No history purge, no rotation, no sibling-repo sweep. This is a settled decision, not an open item: do not re-raise it in a later session absent new information, such as evidence of an actual clone or a change in what the blobs are understood to contain.

Recorded only so the reasoning is accurate rather than reassuring: going private is containment from here, not remediation for what was already public. That distinction is what the operator accepted.

**Method note worth keeping.** The original close-out cited private/fork/network/collaborator counts as if they bounded total exposure. They bound *current* access. Asking "was this ever public while the data was present" is a separate question that current-state fields cannot answer, and it is the question that decides whether a residual is conditional or already realised.

---

# Portfolio narratives—decision-record infrastructure, then one PR per page

The second half of epic #759: issues #751–758. Runbook: `plans/759/portfolio-narratives-runbook.md`. Working worktree `.claude/worktrees/portfolio-narratives-runbook-fc3a84`, branch `claude/portfolio-narratives-runbook-fc3a84`.

**Merge authority for this run is the standing override in the runbook's §C**, authorized by the repository owner in chat on 2026-08-27: up to five `@codex review` rounds, then break-glass merge, recording every unresolved finding here and filing one issue per finding. It supersedes the Phase 4 merge path in `CLAUDE.md` and `REVIEW_POLICY.md` for these PRs only.

## Stage board

| Stage | What | State |
|---|---|---|
| 0 | Repair stale sources (#824, #821, issue annotations) | **complete**, do not redo |
| 1 | Resolve component placement | **complete**—MDX chosen, see below |
| 2 | Infrastructure (PR 1: schema, components, CSS, spec, tests) | **complete**—[#830](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/830) merged `949f5c2` |
| 3 | Seven pages, one PR each | in progress—#752, #757 and #754 merged; #753 open as [#848](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/848); three to follow (#755, #756, #758) |
| 4 | `/projects/` index | not started |
| 5 | Close the epic | not started |

## One PR per page

| # | Issue | Page | Ledger | Components | PR | Status |
|---|-------|------|--------|-----------|----|--------|
| 1 | — | infrastructure | — | all three | [#830](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/830) | **merged** `949f5c2` |
| 2 | #752 | `five-across` | §B | decisions, constraints, learnings | [#834](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/834) | **merged** `44c0a59` |
| 3 | #757 | `swipe-watch` | §G | decisions, constraints, learnings | [#836](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/836), [#839](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/839) | **merged** `512b4af`, `6011e2c`—#836 ran **9 Codex triggers, 7 reviews, 38 findings** all dispositioned, past the §C ceiling under explicit human authorisation (see log); #839 was the follow-up tightening pass |
| 4 | #753 | `mergepath` | §E | decisions, constraints, learnings | [#848](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/848) | open—5 decisions, 4 constraints, 1 learning; delta audit §E28–§E62 (35 rows) |
| 5 | #754 | `override` | §F | decisions | [#840](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/840), [#841](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/841), [#842](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/842), [#843](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/843), [#844](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/844), [#845](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/845) | **merged** `64f6a89`, `e88d4da`, `bce8858`, `c455f5a`, `71c4f57`, `962f558`—one build plus five operator-directed passes; see log |
| 6 | #755 | `device-source-of-truth` | §A | decisions, constraints | | not started |
| 7 | #756 | `matchline` | §D | decisions | | not started |
| 8 | #758 | `friends-and-family-billing` | §C | decisions | | not started |
| 9 | #751 | `/projects/` index | §H | none | | not started |

Fill the PR cell in the same step that creates the PR. That rule is here because it has already been broken twice in this epic—and a third time on #754, where six PRs landed before this table was touched.

**Cross-cutting, outside the page rows:** [#846](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/846), merged `0963021`, migrated five-across and swipe-watch onto the assertion decision anatomy #754 introduced. All three pages carrying records now use one shape.

**#752 is the calibration gate.** Before starting #757, answer here: was the schema expressive enough, is the ledger scannable at 375px, did the status vocabulary hold, did `evidence` stay concise, does the ledger actually improve a hiring-manager skim? A schema or component problem found on page one gets fixed in the shared infrastructure, never worked around locally.

## Log

- 2026-08-27—**Stage 1 complete. MDX chosen.** Full evidence in `plans/759/component-placement-decision.md`; the summary is that all five runbook checks passed, plus a sixth the Plan agent added.
  - The Plan agent evaluated all three options and ranked MDX first. Its most useful contribution was not the ranking but the sixth check: MDX converts hast to estree, and both `rehype-color-chips` and `rehype-mermaid-accessibility` write `properties.style` as a **string** that `hast-util-to-estree` re-parses. Five Across's body has no code fence and no hex inline code, so the runbook's five checks would all have passed and the *next* project page would have been the discovery. Planting a fence and a chip proved the conversion clean.
  - Check 3 was run as a byte-for-byte diff against a baseline build of the same commit rather than as a spot check. Normalizing only the timestamp OG cache-buster, **all seven blog posts and all six untouched `.md` project pages are identical.** That is a stronger claim than "figure captions still work," and it is the claim worth having.
  - The spike ran in a throwaway worktree branched from `main` at `c239dda` and was deleted with `git worktree remove --force`. Nothing it produced was committed.
  - **The finding that changed the design: in an MDX body, `frontmatter.X` is raw YAML and `props.X` is the Zod-parsed value.** A field declared `.optional().default([])` reads as `undefined` through `frontmatter` when the key is absent, because Zod has not run at that point. It reads as `[]` through `props`, but only if `[slug].astro` forwards it on `<Content />`; a bare identifier is a `ReferenceError`. So the route forwards the three fields and pages author `<DecisionLedger decisions={props.decisions} />`. This is the same defect class the runbook flagged for a `caseStudy: z.object({}).optional()` wrapper—worth recording that it defeats a flat top-level `.default([])` too, on the `frontmatter` path.
  - **Five `.md`-only call sites, and the two dangerous ones are silent.** `tests/project-pages.test.js:279` fails loudly (`expected 6 to be 7`, the only test that broke). Lines 287 and 318 silently stop accent-ramp-checking a converted page. `scripts/refresh-mux-gifs.mjs:83` and `scripts/refresh-hero-images.mjs:78` silently skip one—both `prebuild` steps. Only `swipe-watch.md` carries `muxPlaybackId`, so converting Five Across breaks nothing, but converting Swipe Watch at page three would silently stop refreshing its Mux fallback GIF, which is the exact failure that script's own header warns about. All five widen in PR 1, not in the PR that first needs them.
  - **`astro check` is already red on `main`**, 2 errors at `tests/responsive/mermaid-accessibility.spec.ts:107` and `:109` (`Property 'ownerSVGElement' does not exist on type 'HTMLElement'`). CI runs `npm test` and `npm run lint`, not `npm run typecheck`, which is why they survived. Not this workstream's to fix, but the runbook lists `npx astro check` as a per-PR gate and a gate listed as green should not be assumed green.
  - `@astrojs/mdx` joins `astro` and `@astrojs/markdown-remark` in the exact-pin lockstep set, with a failure mode the existing bullet does not cover: mdx pins `@astrojs/markdown-remark` exact **per release**, so bumping the other two without it nests a second copy of the markdown pipeline. That is a silent duplicate, not the loud ERESOLVE of #630/#631.

### PR [#830](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/830)—infrastructure, review record

- 2026-08-27—**Opened at `d1d3e85`**, 18 files, +2,028/−44. Above `external_review_threshold`, so `needs-external-review` and the `nathanpayne-claude` pass posts `--comment` only.
- **My own reviewer pass found two things before either bot reported**, both taken:
  - **R1—a `.md` page can declare `decisions` and render nothing.** The schema accepts the three fields on any project and the route forwards them for every page, but only an `.mdx` body can *place* a component. A page that authors twelve records would build clean, pass the suite, and show nothing. That is the natural mistake while converting pages one PR at a time, and neither the build nor a diff can see it. Now guarded by a test that is vacuous today and fires on the first occurrence.
  - **R2—the explanatory note in `[slug].astro` was an HTML comment in template position.** It did not in fact leak, checked against the built output, but Astro emits those in general and the note explains a `ReferenceError`. Switched to the expression form.
- **The R2 fix broke the build on the first attempt.** The rewritten note quoted the comment delimiters it was describing, and the closing pair ended the comment early: `astro build` failed, `eslint` reported a parse error, 173 tests went red. Reworded to name the form rather than quote it. Recorded because the failure mode is invisible until you try it.
- **Round 1: eight findings across both bots, four distinct issues, all four taken.**
  1. **Pin `@astrojs/mdx` exact** (Codex P2 + CodeRabbit Major). The caret contradicted the toolchain rule *this same PR added*—`rules/repo_rules.md` says the three move as a triple while `package.json` let mdx drift alone. Both bots found it independently, which is a fair signal it was the real defect in the change. **A rule and the manifest it describes can disagree inside a single commit; the #738 lesson applies to the PR that writes the rule, not only to later ones.**
  2. **Both spec MDX examples omitted their component imports** (Codex P2 + CodeRabbit Minor). The route supplies the *data*, never the components, so the first page to follow the example verbatim would have failed on a missing reference. My own temp verification had the imports and the spec did not—**the working proof and the documented recipe drifted, and only the recipe ships.**
  3. **`.ai_context.md`** (Codex P1) still inventoried project sources as `.md`-only and omitted `@astrojs/mdx` from the load-bearing-dependency section—the section that exists precisely so a dependency no source file imports does not look removable.
  4. **`docs/agents/code-modification-rules.md`** (Codex P1) documented the project frontmatter fields but not the three new ones, and agents are routed through that guide before editing content.
- **CodeRabbit found a fifth on the fix commit**: the new guard used `readdirSync`, flat, while the collection glob is `**/*.{md,mdx}`, recursive. Correct—and **three older enumerations in the same file had the identical hole**, so a nested project would also have escaped the raw-palette check and the accent-ramp assertion. Of the four, only the count-versus-index test would have said anything. All four now share one `projectSourceFiles()` helper mirroring the glob on both extension and depth.
- **Every guard added in this PR was negative-tested rather than trusted**: injecting `font-weight: 700` on a status modifier fails the four-peers test; removing one `.default([])` fails the schema test; planting `decisions` on a `.md` page fails the placement guard; planting a *nested* `.md` project fails it only after the recursive fix.
- **Two resolver frictions worth carrying to the next eight PRs:**
  - `resolve-pr-threads.sh --resolve-actioned` binds evidence to the file a finding is *anchored* to. A finding of the form "changing this file obliges updating that one" can never satisfy that gate, because the fix lands elsewhere. Both Codex P1s skipped as `not demonstrably actioned` until an explicit reply named the file and commit; then they resolved. Not a defect—the gate is fail-closed by design—but it is a predictable two-step on any documentation-coupling finding.
  - **CodeRabbit's edit floor fired once, exactly as recorded.** It amended its root comment at `13:47:12Z`, seconds after the disposition reply, flipping the finding back to unaccounted. One re-reply above the new floor cleared it. Accounting then read `clear`, 8/8.
- **Round 2 on `858ecb8`: 👍 from `chatgpt-codex-connector[bot]`, zero findings, after 215s.** Under the §C override a thumbs-up at any round ends the loop, so the review loop for #830 closed at two rounds rather than five.
- **Rounds 3 to 6: eight more findings, all correct, all taken.** The loop ran past the §C five-round cap because the operator chose the Phase 4b route (2026-08-27), which needs a reviewer signal pinned to the *current* HEAD—and every fix commit moves the HEAD out from under it. That is the treadmill, and the way off it is to batch every remaining edit, including this file, into the commit before the round you intend to be last.
  - **Round 3 caught a test that was verifying nothing.** The per-field schema assertion spanned `[\s\S]*?` from the field name, and the lazy quantifier walks past that field's own closing paren to match the `.optional().default([])` of the NEXT array. Breaking `decisions` or `constraints` still passed. Only `learnings`, last in the sequence, actually failed—**and `learnings` is the one the negative test had picked.** The test written to prove the guard confirmed the single case where it worked. Negative-test every member of a set, not a representative.
  - Round 3 also found the recursion bug **in the two refresh scripts, one commit after fixing it in the tests**. Same defect class, same session, two files over.
  - **Round 4**: the documented `../../` import depth is right for a flat project and wrong for a nested one, which the recursive glob accepts. Documented rather than aliased—an Astro path alias is a repo-wide config surface with no precedent here.
  - **Round 5**: the placement guard searched raw MDX source, so a component sitting only in a fenced example satisfied it while rendering nothing. Now asserts the built page carries the component's root class, which no example or comment can fake, and which subsumes the import check.
  - **Round 6, the one worth remembering**: `DecisionLedger` labelled `evidence` "Observed" unconditionally, so a `pending` row rendered "Observed: Not yet validated…"—a self-contradiction on the page, in the component built to keep observation and argument apart. The label now varies by status; the treatment does not, because the four have to stay peers. Round 6 also caught that asserting rendered markup crashes on a draft, whose page `getStaticPaths` never emits.
- **`gh api` without `--paginate` silently truncated the finding list once**, and the record script reported `not-found` for a finding that existed. Always paginate when collecting findings.
- **CI note, expect it again.** `Codex P1 unresolved threads` failed twice while the disposition replies were still landing, both times after logging `review feedback accounting clear` and `Codex blocking-tier unresolved: 0`. The workflow computes a feedback fingerprint, then re-reads it immediately before publishing, and fails closed when a comment lands in the gap—which is exactly what posting replies during the run does. Running `scripts/codex-p1-gate.sh` locally against the same HEAD exits 0. **Finish dispositioning, then re-run the check; do not chase it mid-loop.**

### The Stage 3 calibration gate—answered at #752, before page two

The runbook makes #752 the test of whether Stage 2 was right. Answering its five questions honestly, because the point is to fix the shared infrastructure now rather than work around it six more times.

**Was the schema expressive enough?** Yes, and I did not want a fourth field. Six decision records, four constraints and three learnings covered the page without strain, and nothing had to be smuggled into the wrong field. One thing the schema did *not* cover surfaced during PR 1 and was fixed there: `evidence` means something different under `pending`—the validation boundary rather than an observation—so the component now labels it "Validation boundary" instead of "Observed". That was a rendering fix, not a schema change; the field held.

**Is the ledger scannable at 375px?** Yes. Verified on the real page, not a fixture: no horizontal overflow at 375, 768 or 1440, no console errors, the constraint strip collapsing to 2×2 and the decision body to a single labelled column. The one thing to watch is **decision titles**, which wrap to two lines past roughly forty characters against the 30ch cap. "The cutover is a decision, not a deploy" wraps at every width. Not a defect—the wrap is balanced and the title is still the biggest thing in the record—but the remaining six pages should aim shorter.

**Did the status vocabulary hold?** Yes, and the strongest evidence is that **all four appeared on one page**: three `validated`, one `mixed`, one `revised`, one `pending`. A calibration page that reached only for `validated` would have told us the other three were decorative. `revised` in particular earned its place—the frozen-deal decision is not a success or a failure, it is a design that changed at sea, and neither of the other labels fits it.

**Did `evidence` stay concise?** Less than the first draft of this answer claimed. Counted: **four of six** run one to three sentences. Two do not—the offline record at four, and the `revised` record at seven.

Two things worth carrying rather than smoothing over. The `revised` record grew to seven **because of a later review round**, which required it to name the reformulation it had been hiding rather than assert the principle survived intact; the length is the honesty, and shortening it would restore the defect. And this paragraph originally said five of six, written mid-review and already stale by the time the fix landed—**a calibration figure written before the review loop closes will be wrong by the end of it.** Count at the final head, the same rule this epic already carries for word counts.

**Does it improve a hiring-manager skim?** Yes—titles left, statuses right, dotted leaders between, and the six titles alone reconstruct the product argument. **But this page is the easy case and the gate should say so.** Five Across has the richest evidence in the portfolio. The real test of the ledger is Override, which has no behavioral evidence at all, and Matchline, which is mostly `pending`. A ledger that reads well only when the evidence is good is a ledger that flatters. Watch those two.

**No infrastructure change is required before page two.**

### #834 went to a manual Phase 4b handoff, on the operator's instruction

- 2026-08-27—**Five automated Codex rounds plus two CodeRabbit passes produced 17 findings. Every one was correct and every one was taken.** Accounting `clear` 17/17, no unresolved threads, and `codex-p1-gate.sh` exits 0 locally at head `f951bcc`. The [handoff](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/834#issuecomment-5445497067) is posted per REVIEW_POLICY.md § Handoff Message Format, suggesting `nathanpayne-codex`.
- **The loop did not converge: 3, 1, 3, 4, 2.** The operator authorised one further round with a manual 4b if it did not clear; round 5 returned two more, so it did not. Worth recording *why* it did not, because the shape is reusable: almost every finding was an inconsistency **between artifacts I had corrected separately**, and several were introduced by the previous round's own fix. Fixing a claim in the page while the ledger kept asserting it; moving a verdict without moving the tally that sums it; a calibration figure that went stale because a later round lengthened the record it was counting. **A fix is not done when the reported instance is fixed—it is done when every artifact holding that claim agrees.**
- **The single most useful finding was not about a number.** Codex read the `revised` decision record and observed that it rejected mulligans on the grounds that no board is negotiable, then described shipping a reshuffle and called the principle intact. The record was concealing the revision its own status exists to record. The repository settles it better than the page did: `specs/reshuffle.md:14` defines pristine as zero player-marked squares and `:12` tells authors to avoid the word mulligan for this feature, so the principle was reformulated—the deal is final *once you act on it*—not preserved.
- **Two figures did not survive my own trace and never reached the page**: a post-freeze mark count I wrongly believed absent from the ledger (it was in §B34; my grep matched `:41` line references elsewhere and I concluded absence without opening the row), and a quotation from `src/editions.ts` that was accurate but unrecorded, added to §BM1 before it was allowed on the page.
- **Carry into the remaining six pages.** Trace each figure to its row *and* read the sentence around it—existence and correct use are different checks, and three findings landed in that gap. Grep the claim across every artifact before dispositioning. Recompute derived tallies from their inputs rather than hand-adjusting. Write calibration figures at the final head, never mid-review.
- **The Codex poller under-reported twice**, returning zero findings while the API held four and then two on the same head; once it died on a network error 90 seconds before Codex posted. **Read the API, not the poll result.**
- **CodeRabbit's edit floor fired four times**, each amendment landing three to four seconds after a disposition reply. A settle-and-sweep of roughly 150 seconds then a re-reply cleared all four at once.

- 2026-08-27—**Page two (#757, swipe-watch) opened as [#836](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/836).** Five decisions, four constraints, three learnings. The #820 delta audit added §GM1, §GM2 and §G19–§G25; this PR added §G26, §G27 and §G28 and corrected §G19 and §G25.
  - **A false claim was live on five surfaces, and a correction pass is what put it there.** The page said the app builds a watchlist. It does not: three localStorage keys, none holding a title, and two controls labelled "watchlist" writing an in-memory counter the next session zeroes. `git log -L` dates the wording to `194c7df`, PR #814—the audit-driven correction pass—which traded a vague claim for a false one on two surfaces in one commit, while this ledger was open on the same file. A test fixture pinned a third surface. This is §M's "correction applied where a reviewer reported it, and nowhere else", committed by the correction itself.
  - **Executing the screenshot criterion found a defect that reading the stylesheet did not.** Rather than waive #757's "annotated screenshots at realistic mobile sizes", the prototype was captured at 390px. `.card-description` declares a two-line clamp *and* `flex: 1`; the box lands between 2.0 and 3.4 lines, so some cards paint an ellipsis with a third line beneath it and 3 of 40 sampled cards lose synopsis text outright (§G26). Filed against swipewatch, not fixed here. The lesson generalises: a criterion that reads like asset-production can be evidence-production.
  - **Codex round 1 returned six P2s and every one was real.** Two changed what the page asserts. The three screenshots were unregistered in `rehype-figure-captions`, so they rendered with no CLS reservation and no portrait cap—and the existing assertion was slug-specific to five-across and structurally could not catch it, so it was generalised to every project page and verified to fail when an entry is removed. The categorical "every session ever recorded has coins in it" was retired: the initial commit carries a Firebase hosting deploy cache and the GA4 snippet, so a pre-coin production window existed, live and instrumented, for 3 d 10 h (§G28). The before-period is unexamined, not absent.
  - **A success criterion was refuted by its own supporting screenshot.** The reconstruction said users would swipe "without instruction" while the walkthrough naming all three gestures sat further down the same page. Now explicitly post-onboarding, with discoverability marked unobservable by construction.
  - **One finding was closed by running the query rather than narrowing the claim.** `/issues/{N}/comments` excludes PR review bodies and inline review comments; both were queried across all 84 swipewatch pull requests for the demo terms, returning zero matches. The no-artifact claim now holds by execution at every layer.
  - Codex round 2 timed out at 600 s with no review on the new HEAD (exit 4), the documented route to Phase 4b. The 4b run then returned exit 6—HEAD barrier pending, not an error—awaiting Codex on `efc23f9`.

- 2026-08-27—**#836 review log, kept current because the recorded round count decides whether the next operator continues, hands off, or escalates.** Five Codex triggers used, which is the §C ceiling. Rounds 1, 3 and 5 returned 6, 10 and 6 P2 findings; rounds 2 and 4 hit the 600 s deadline with no review posted, which is exit 4 and the documented route to Phase 4b. Every one of the 22 findings was correct. Four more were caught here before Codex reached them. Phase 4b has returned exit 6—barrier pending, not an error—on every attempt, because each fix commit moves HEAD and re-opens it.
  - **One defect class accounts for most of this run, and fixing instances did not retire it.** In every round, a claim was corrected where the reviewer pointed and left standing in its siblings: the coin categorical fixed in the body and left in the decision card, then left again in ledger §G21; the telemetry/persistence split fixed in three places and left in a fourth; a denominator fixed in five digit-form sites and left in the one spelled "Ninety"; and, worst, a corrective sentence about the analytics access history that reintroduced the overclaim it was written to remove. The fix is not another instance patch. It is to enumerate every surface of a claim first—`grep` the claim, not the phrasing—and change them in one pass, which is what round 5 was finally handled with.
  - **A factual error survived four rounds because every round only checked what it was told to.** The page said six analytics actions were wired in the first commit. `git show 2ca43ff:app.js` carries five; `unlock_mode` arrived with the economy three days later and could not have reported on a mechanic that did not exist. It had been repeated in a constraint chip, a decision, a learning, a criterion and the narrative.
  - **A stale denominator ran the whole PR.** "90 issues and pull requests" came from a ledger row that was true when written; the repository now holds 97, numbered to #98. A broadened sweep written to answer a Codex finding compounded it by bounding its own loop at 1…95 and silently missing three items.
  - **Case-insensitive sweeps over this corpus manufacture matches.** Re-running the demo search at the correct scope returned one `EVP` hit, which is a substring inside a base64 payload in an HTML comment—one of ten such CodeRabbit diagram blobs. Case-sensitive returns zero. Read the hit before counting it.

- 2026-08-28—**#836 continued past the §C five-round ceiling, and this is the authorisation record for that.** At round 5 the run stopped and put the choice to the human, who chose one more round; after round 6 the instruction was "keep going then". Rounds 6–9 were run under that authorisation. **A future operator reading this row should not treat the over-ceiling count as drift**—but should also not extend it further without asking, which is what §C is for.
  - Standing at round 9: **9 triggers, 7 Codex reviews landed, 38 root findings** (36 Codex, 2 CodeRabbit), every one correct and every one dispositioned. Findings per landed review: 6, 10, 6, 4, 3, 3, 4. That is flattening rather than converging to zero, and each round still returns something real.
  - **Two of the poller's exit codes are false negatives and cost several rounds before this was understood.** `exit 4` means the 600 s deadline passed, and Codex has posted after it every single time—round 7 reported zero findings while three sat in the API, filed fourteen seconds late. `exit 6` is not a timeout at all but the accounting gate: CodeRabbit edits its own root comment up to a minute after you reply, which pushes the accounting floor past the disposition and makes a handled finding read as unhandled. Read the API, not the poller.
  - **The single-comment endpoint 404s for review comments.** `/pulls/{pr}/comments/{id}` returns 404 for these IDs while the list endpoint returns them; a settle-watcher built on the former silently compares empty strings and reports success immediately.
  - **The claim that would not die.** The coin-baseline assertion has now been corrected **seven times across five rounds** in seven wordings—every recorded session had coins; nothing in the data separates the two periods; a before-and-after with no before; the before was never captured; nobody has queried it; holding the economy back would have preserved the baseline; and one milder variant. Every fix was applied where reported and every time a differently-worded sibling survived. What finally worked was grouping sentences by *what they claim* rather than grepping how they are phrased.
  - **Round 8 caught a live drift hazard, not a hypothetical one.** Five §G commands still read `origin/main` while the section header guaranteed every command carried the pinned SHA—and a fix to the §G26 card-synopsis defect was already in flight against that repository, so an unpinned re-run would have measured a different tree while the PR was open.

- 2026-08-28—**Page five (#754, override) opened as [#840](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/840).** Four decisions, four constraints, no learnings—there is no behavioral evidence on this page and none was manufactured. The delta audit added §F15–§F43, twenty-nine rows, and it is the largest evidence delta of the run so far: §F held 7 rows before it.
  - **The audit refuted two facts the coordinator had verified personally**, which is the ledger-under-audit rule paying for itself. "86 tests assert arithmetic" was the right count and the wrong framing—8 touch the engine, 3 of those assert nothing when their `if` guard is false, and the assertion most likely to be cited checks the engine against its own output (§F26). "The UI never re-derives" was simply false; at least six places re-derive, one of them recomputing by hand a reduction it already holds in scope (§F25). Both had already been handed to the drafting agent and had to be retracted mid-draft.
  - **The strongest row is §F21, and it is strong because the mechanism was executed rather than read.** `deriveWaterfallPhaseState` genuinely never reads `hasProfitSharing`—a universal that survives, which most do not. But `calculations.ts:232` honours the toggle one file over, and running the two against a constructed deal shows the badge reading "Post-Recoup · Profit Sharing Active" while investors receive zero. The audit then refuted the obvious defence with a second configuration the coordinator had not tried: at split 1.0 the GP takes a share while the flag reports false, because `gpShareOfInvestorPool` is not in the read set. **And it reaches the investor**—`src/app/deal-room/` reads the toggle zero times, so the Deal Room shows "Investor Pool (post-recoup) 50%" as a headline term for a deal paying nothing. The repository already records it and says "preserve this behavior," which is what makes the record `mixed` rather than a bug report.
  - **The brief's four-surface scope exception was not needed.** An exhaustive sweep for the Override primacy claim—every wording, not every phrasing—returned **zero** surfaces still asserting it; earlier PRs had corrected all four. The sweep's value was the adjacent finding instead: `mergepath.md:78`'s "extracted from the projects that needed it first" is §F12's directional error generalised to an unnamed plural, and it belongs to #753.
  - **A four-surface defect the brief did not flag turned up anyway.** "shares live deals with backers" is false once decision record 4 is stated, and it lived in the frontmatter `description`, the `seoDescription`, the homepage card and the test pinning that card verbatim. Zod (§F36) was the same shape across two surfaces—the page stack line and the résumé entry. The lesson generalises: sweep the claims the *new* page makes, not only the ones a landmine list names.
  - **Screenshots came from the public no-auth deal room**, which is the only reason they exist at all—the authenticated producer surface needs credentials this session cannot enter. The one deal room in production is a demonstration whose own producer note calls every figure fictional, so the captures self-label and the confidentiality question does not arise. The Documents section was excluded deliberately: §F24 found production document URLs sitting in the token-readable document.
  - **Image sizing is a render-measured decision, not an eyeball one.** The first pair rendered 1,339px tall combined at 1440. Recropping to wide, short bands took it to 673px while staying legible at 375px. Measure the rendered height before committing a capture; the intrinsic size says nothing about how much page it eats.
  - Word count 1,032 prose against an 800–950 target, stated in the PR body with its justification: the target was set off 7 ledger rows and the page now stands on 32.

- 2026-08-28—**Page four (#754, override) merged across six PRs**, not one: [#840](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/840) `64f6a89` built it, then five operator-directed passes—[#841](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/841) `e88d4da` reframed the origin story, [#842](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/842) `bce8858` cut it back and swept six late review findings, [#843](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/843) `c455f5a` did seven surgical edits, [#844](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/844) `71c4f57` swapped the exhibits, [#845](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/845) `962f558` corrected the ledger. Merge authority throughout was the §C override plus explicit per-PR instruction. Four decisions, three constraints, no learnings—there is no behavioral evidence on this page and none was manufactured. Delta audit §F15–§F43, twenty-nine rows.
  - **The delta audit refuted two facts the coordinator had verified personally**, which is the ledger-under-audit rule paying for itself twice in one run. "86 tests assert arithmetic" was the right count and the wrong framing (§F26); "the UI never re-derives" was simply false (§F25). Both had already been handed to the drafting agent and had to be retracted mid-draft.
  - **The strongest row is §F21 because the mechanism was executed rather than read.** `deriveWaterfallPhaseState` genuinely never reads `hasProfitSharing`, but `calculations.ts:232` honours it one file over, and running the two against a constructed deal shows the badge reading "Profit Sharing Active" while investors receive zero. The audit then refuted the obvious defence with a configuration the coordinator had not tried. **And it reaches the investor**: the deal room reads the toggle zero times, so a prospective backer sees a 50% investor pool on a deal paying nothing. Filed against overridebroadway as issue #139, with #140 (the snapshot date renders `createdAt`, which a republish never moves) and #141 (`external_review_paths` gates two directories that do not exist while the financial engine is ungated).
  - **A defect was shipped and caught by post-merge review.** #841's "where does it calculate" edit closed with "which is why the two cannot quietly disagree", one paragraph below the passage describing where they demonstrably do, and dropped the caveat that had been bounding the claim. Live until #842. This epic's signature defect, committed by the coordinator: a fix applied in one place that broke the claim beside it. **Six findings landed on #841 after it merged**—three Codex, three CodeRabbit, two locations flagged independently by both. Read the API after merging, not only before.
  - **The brief itself contained a false premise.** It stated the PRD "already carries the competitive framing that matters (Carta, AngelList SPV, film finance ledger, as UX references)." Carta appears nowhere—not the repo, not the PRD, not ARCHITECTURE.md, and there is no competitive analysis in the record at all (§F41). A task brief is not evidence.
  - **§F12 was wrong and the operator caught it.** It asserted "nothing was extracted from Override into it," inferred from timestamps without opening the commit. Mergepath's seed commit carries Override's `pr-review-policy.yml` (75 identical unique lines), `pr-audit.yml`, and the `docs/agents/` layout from the day before. Extraction ran both ways, a week apart (§F43). The consequence reversed a finding: `mergepath.md:78` was flagged as defective during the #754 sweep and is in fact **accurate**; the flag is withdrawn and §F12 is corrected inline, not merely superseded. **A first commit is not evidence of first authorship**—the repo was called "AI agent repo template" and later renamed, which is what made the timestamp inference look safe.
  - **Screenshots are a render-measured decision.** The first exhibit pair rendered 1,339px tall combined at 1440; recropping to wide short bands took it to 673px. Later, #844 replaced the weakest exhibit rather than adding to it. Measure the rendered height before committing a capture.
  - **Word count moved with the operator, not with a target.** 742 → 1,107 → 1,032 (−6.8% brevity pass) → 1,333 → 1,439 → 1,520 → 1,475. The issue's 800–950 band was derived off seven ledger rows; the page ended on twenty-nine.

- 2026-08-28—**Page six (#753, mergepath) opened as [#848](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/848).** Five decisions, four constraints, one learning. Delta audit §E28–§E62, thirty-five rows, pinned to `mergepath@3d961050e203e8b7a55bb551e89aa4da834356f6`. Prose 1,531 → 1,368 words (−10.6%), a restructure rather than an expansion. The figure moved every single round—1,190 at the build commit, then 1,228, 1,261, 1,311, 1,368—because every correction narrows a claim and narrowing costs words. **The restructure's −22.3% has given back more than half of itself to accuracy across four review rounds**, which is the cleanest measurement anyone on this epic has produced of why the facts pass and the brevity pass must not be merged. Recount immediately before merge; Codex caught this entry stale once already.
  - **The fleet shrank and nobody had noticed on this site.** It is **nine repositories, eight consumers**, not ten and nine. `device-platform-reporting` was archived 2026-08-26 and dropped by `mergepath#1116` on the 27th—two days before this page was written. The stale figure lived in three places on the page plus the résumé mirror. If you are writing any page that counts the fleet, read `.mergepath-sync.yml` at a pinned SHA; do not copy §E13, §E27 or §H9, which are now annotated as superseded.
  - **The decaying negative claim decayed inside fourteen hours.** The page said `phase-4b-classifier.sh` "is written and configured but nothing in the repository executes it today." `#1084` wired it into `coderabbit-should-invoke.sh:486` fourteen hours before the pinned SHA. The audit found it by *running* the script rather than grepping for call sites—the grep returns comments, a CI fixture and the live call, and only execution separates them. Any sentence of the form "X exists but nothing uses it" should be re-derived on the day it ships, not inherited.
  - **The audit refuted three facts the coordinator had personally verified**, which is the second consecutive run where that happened. All three were counts read from the wrong repository or the wrong matcher: `scripts/ci/ | grep -c check_` returns **72 in `nathanpaynedotcom`** as well as in mergepath, so a sweep agent counting in the consumer produced a number that looked right and was about the wrong tree. Pin the repo *and* the SHA in the command, every time.
  - **§E10's own corrected value was wrong.** It recorded 71/70/**85**; the 85 came from a matcher that counted comment lines as invocations. The real figures are 72 on disk, 71 wired, 80 invocations. A ledger's corrected value is not more trustworthy than the claim it replaced—§E28 re-derived all three from scratch rather than adjusting the old ones.
  - **The §E summary row was miscounted in exactly the shape §B was, and the same thing hid it.** It read 14/8/0/5 against rows that resolve 11/7/0/9—a wrong distribution that sums to the right row total, so arithmetic checking passes. Two of the two section rows anyone has ever recounted have been wrong. The remaining six have still never been checked; treat them as unaudited.
  - **A citation inside the evidence contradicted itself.** `docs/architecture/0002-...md:64` cites `mergepath#427`/`#428` as "admin merges past a required check." Both are **issues, not PRs**, and both describe an *auto-merge* escape—neither body contains `admin`. The drafting agent had already written the claim into a learning record from the ADR's summary. Recorded as §E61; the citation was dropped rather than shipped. Read the artifact a document cites, not the document's description of it.
  - **The strongest new material was not on the brief.** `docs/architecture/0002-branch-protection-enforcement-posture.md` records that on 2026-07-28 eight of ten fleet repos enforced **zero of five** canonical required checks and the hub enforced two, with the remediation still an unaccepted recommendation. That refutes the page's own opening premise ("branch protection is mandatory") and is now its failure-evidence section. Nobody asked for it; it came out of asking whether a page claim was still true.
  - **§E58 is the coordinator's own row and the pattern is worth keeping.** The `.sync-overrides.yml` registry is empty across all eight consumers, while `#1132`—a propagation wave overwriting a consumer's hardened workflow—happened on a path that registry covers. The finding came from checking whether an exhibit was usable, not from a claim under audit. Verifying an artifact you intend to *show* turns up things auditing the prose does not.
  - **1Password would not sign the commit.** `ssh-keygen -Y sign` succeeds standalone but the agent refuses git's invocation non-interactively ("agent refused operation", then "communication with agent failed"). The commit is unsigned. The machine note that `ssh-keygen` is the non-interactive workaround holds only for a direct call, not for `git commit -S`.

- 2026-08-28—**[#846](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/846) `0963021` migrated five-across and swipe-watch onto the assertion anatomy**, so all three pages carrying decision records use one shape. **Not a rename**: `cost` is required whenever `chosen` is present, so it meant authoring nine genuine costs for records written before anyone asked what the choice gave up. Several had real answers hiding in plain sight—the Five Across standings **cannot be verified, only trusted**, because each player writes their own board; the last-night freeze cost nine hours of play on a schedule players already had. The record expected to fail the test, "Hearts never touch the score", turned out to have both an outcome and a separable cost. One record needed restructuring rather than extending: "Let the prototype fake its payoff" already had its cost sitting inside `evidence`.
  - **The legacy anatomy stays in the component and stays tested.** The four unwritten pages may hold a record with no honest cost, and the optional fields are the escape hatch for exactly that. Inventing a cost to satisfy a schema is the failure this structure exists to prevent.
  - **The remaining four pages should be authored against the assertion anatomy.** That was the actual argument for migrating: with four pages still holding zero records, leaving two exceptions would have grown the inconsistency rather than held it.

