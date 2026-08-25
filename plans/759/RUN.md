# Epic #759—Blog audit run state

Working worktree: `.claude/worktrees/epic-759-blog-audits-5c2791` (branch `claude/epic-759-blog-audits-5c2791`).
Update this table at every phase boundary. On resume, read this first and continue from the first incomplete row.

Phase legend: `0` shared evidence cache · `1` facts ledger · `2` Fable prose draft · `3` verify + land (branch/PR/review/merge) · `done` merged.

## Order of work

Deliberate. #740 calibrates the ledger format and the Fable handoff; #739/#741 reuse #740's evidence cluster; #742 is last (sampled colour values, shares nothing with the others).

| # | Issue | Slug | Phase reached | Ledger path | Branch | PR | Status |
|---|-------|------|---------------|-------------|--------|----|--------|
| 0 | — | shared evidence cache | **0 complete** | `plans/759/refs.json` | `content/740-astro-migration-audit` | [#787](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787) | done |
| 1 | #740 | how-a-responsive-fix-became-an-astro-migration | 3 blocked | `plans/759/how-a-responsive-fix-became-an-astro-migration-ledger.md` | `content/740-astro-migration-audit` | [#787](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787) | **awaiting manual 4b** |
| 2 | #739 | agent-approval-workflow-genesis-of-mergepath | not started | `plans/759/agent-approval-workflow-genesis-of-mergepath-ledger.md`  | — | — | pending |
| 3 | #741 | html-mockups-as-spec | not started | `plans/759/html-mockups-as-spec-ledger.md`  | — | — | pending |
| 4 | #744 | six-prs-one-bug-agent-failure-modes | not started | `plans/759/six-prs-one-bug-agent-failure-modes-ledger.md`  | — | — | pending |
| 5 | #745 | autofix-was-the-whole-cost | not started | `plans/759/autofix-was-the-whole-cost-ledger.md`  | — | — | pending |
| 6 | #743 | perfect-score-wrong-axis | not started | `plans/759/perfect-score-wrong-axis-ledger.md`  | — | — | pending |
| 7 | #742 | two-blues-one-composition | not started | `plans/759/two-blues-one-composition-ledger.md`  | — | — | pending |

## Constraints carried across every row

- One issue, one PR. Never batch children. Never push to `main`.
- Only start the next issue's Phase 3 after the previous PR merges; Phase 1 of the next issue may overlap a PR in review.
- Soft-wrap Markdown prose (one physical line per paragraph). Em dashes closed up (CMOS).
- Lint via `~/GitHub/nathanpaynedotcom/node_modules/.bin/*`, not `npm run lint` (worktree has no local bin).
- Fable subagents get the ledger, the issue's positioning + acceptance criteria, and the current post. No repo write access, no PR driving.
- From issue three onward, also hand Fable the two most recent approved revisions as voice reference.
- Review loop per PR: fire `scripts/codex-review-request.sh` immediately on push, in parallel with `scripts/coderabbit-wait.sh`. Disposition each finding (reply AND resolve) before moving on. Codex findings get `scripts/codex-record-feedback.sh` (posts reaction + ledger); CodeRabbit findings get `scripts/coderabbit-record-feedback.sh` (ledger only, never a reaction).
- Out of scope for this run: portfolio issues #751–758.

## Log

- 2026-08-25—Run initialised. Read AGENTS.md, rules/repo_rules.md, .ai_context.md, .github/review-policy.yml, epic #759. Preflight cached. Seven issue bodies fetched to `plans/759/issues/`.
- 2026-08-25—**Phase 0 complete.** `plans/759/refs.json` holds 67 resolved references (nathanpaynedotcom 29, mergepath 28, friends-and-family-billing 9, swipewatch 1), each with type, title, author, created/closed/merged timestamps, merge commit, and the posts citing it. Zero unresolved.
  - Five `#NNN`-shaped tokens recorded as **rejected, not references**: `#333` (all seven posts), `#000`, `#224089`, `#323137`, `#333333`—all CSS hex colours. Do not re-litigate these.
  - The bare-`#NNN` ambiguity hazard is confirmed real and near-total: 45 of the resolved numbers **also** resolve to a different, unrelated item in the other candidate repo (e.g. mergepath#70 "Add Playwright responsive test suite" vs nathanpaynedotcom#70; nathanpaynedotcom#668 vs mergepath#668). Every citation in the posts is fully URL-qualified, so each was resolved against the repo named in its own URL, and `bare_number_collision` records the near-miss.
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
  - Length: body 2,351 → 2,677 words, but 238 of the increase is the two new tables required by the acceptance criteria (the decision record and the milestone timeline). Prose-only is 2,351 → 2,439, up 3.7%. #740 carries no reduction target ("tighten opportunistically").
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

**State as of 2026-08-25.** PR [#787](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787) is open at HEAD `c101bcc`, complete, and green on every local gate. It is **not merged** and cannot be merged by this agent.

- All 21 bot findings across five Codex rounds are dispositioned. **No P0 or P1 was ever raised.** Twenty were fixed; one is rebutted on its thread. `scripts/review-feedback-accounting.sh` reports `status: clear`; every review thread is resolved.
- Local gates green at `c101bcc`: `astro build` (37 pages, 18 OG images), `vitest run` (490 passed / 1 skipped), `eslint`, `lint-prose`.
- The [handoff message](https://github.com/nathanjohnpayne/nathanpaynedotcom/pull/787#issuecomment-5417925265) is posted per REVIEW_POLICY.md § Handoff Message Format, suggesting `nathanpayne-codex`.

**Why it is blocked.** `scripts/phase-4b-review.sh` returns exit 6 (barrier pending) every time: it wants a reviewer signal pinned to the *current* HEAD, and fixing a finding requires a commit, which moves the HEAD. Codex ran five rounds (the operator's cap)—0, 4, 5, 1, 7 findings—so convergence broke at round 5 and further rounds are not obviously terminating. CodeRabbit is unreliable here: rate-limited on first contact, and it edits its own root comments seconds after a disposition reply, which flips findings back to unaccounted (hit three times).

**What unblocks it.** A human takes the handoff to a `nathanpayne-codex` CLI session for an `APPROVED`, or merges directly. Branch protection wants one approving review and the authoring agent's own reviewer identity cannot supply it on a Phase 4 PR.

**Do not start #739's Phase 3 until #787 merges.** Phase 1 for #739 may begin now—#740 was the calibration run and both the ledger format and the Fable handoff survived a full review cycle, which was the gate.
