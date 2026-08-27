# Prompt: finish epic #759 Workstream 2—decision-record infrastructure, then one PR per page

Close out the project-portfolio half of epic #759. Build the reusable decision-record infrastructure first, then rework all seven project pages and the index—**one PR per page**, landed in sequence, the same cadence `plans/759/RUN.md` already used for the blog audits and the project-page fact audit.

You have explicit authorization to use subagents for this run. Use them as directed below. Do not use Workflow or deep-research.

---

## A. Non-negotiable invariants

These hold for the entire run. Everything after this section is procedure; this section is not. If a later instruction appears to conflict with one of these, the invariant wins and the conflict is a defect in the runbook worth reporting.

1. **One child issue, one PR.** Never batch children.
2. **Never have two project-page content PRs in review at the same time.** Evidence work on the next page may overlap; the PR may not.
3. **Never state a number that is not in the evidence ledger.** Not a rounded one, not a recomputed one, not one that "must be about right."
4. **Never manufacture behavioral evidence.** If a page has no observed outcomes, it has no `learnings`. That is a finding, not a gap to fill.
5. **Never pad a decision count.** Four strong records beat eight weak ones.
6. **Never reintroduce a claim already corrected by PRs #811–#818.** See §0.5.
7. **Never merge with an undispositioned review finding.** Reply *and* resolve are separate requirements; satisfying one is not satisfying the other.
8. **Never change the canonical project ordering.** `specs/project-pages.md` documents it as a deliberate editorial decision that must not be "corrected." It will look unsorted by every mechanical rule, because it is.
9. **Never assert that Nathan is a strong PM or good at directing agents.** The decisions and the evidence carry it, or nothing does.
10. **Never add a fourth structured field without two named consumers.** `decisions`, `constraints` and `learnings` each earned their place by having at least two pages that need them (see §4). A field with one consumer is page composition wearing a schema.
11. **Never advance a stage before the previous stage's merges and mutations are complete.**

---

## B. State machine

Read this first on resume. After a compaction, an interruption, or a subagent failure, find the first incomplete line and continue from it. `plans/759/RUN.md` is the durable record—update it at every stage boundary, so this list can be rebuilt from the repo alone.

```text
Stage 0 — Repair stale sources          §0.5   ✅ COMPLETE, do not redo
  [x] PR 0a merged                       #824 → 5c7dbb7, typescript ceiling restored
  [x] RUN.md rows corrected              #821, both #805 and #814 now show merged
  [x] issues #753, #756, #758 annotated  disposition callouts added 2026-08-27

Stage 1 — Resolve placement             §2
  [ ] Plan agent reported
  [ ] MDX spike run in a THROWAWAY worktree, all 5 checks, worktree deleted
  [ ] approach chosen; the 5 outcomes recorded in plans/
  [ ] STOP only if NO option is safe (a failed spike is a completed stage)

Stage 2 — Infrastructure                §4, PR 1
  [ ] PR 1 merged                        (schema, components, CSS, spec, tests)

Stage 3 — Pages, in this order          §4
  [ ] #752 five-across merged            ← calibration; see the gate below
  [ ] #757 swipe-watch merged
  [ ] #753 mergepath merged
  [ ] #754 override merged
  [ ] #755 device-source-of-truth merged
  [ ] #756 matchline merged
  [ ] #758 friends-and-family-billing merged

Stage 4 — Index                         §4
  [ ] #751 projects index merged

Stage 5 — Close the epic
  [ ] #759 acceptance criteria checked off with evidence
```

**The Stage 3 calibration gate.** #752 is not merely first, it is the test of whether Stage 2 was right. Before starting #757, answer in `plans/759/RUN.md`: was the schema expressive enough, is the ledger scannable at 375px, did the status vocabulary hold, did `evidence` stay concise, does the ledger actually improve a hiring-manager skim? **If #752 exposes a schema or component problem, fix it in the shared infrastructure before writing the remaining six pages.** Do not work around it locally—a local workaround on page one becomes seven divergent workarounds, which is the outcome this whole structure exists to prevent.

---

## C. Merge authority—standing override for this run

**This section supersedes the Phase 4 merge path in `CLAUDE.md` and `REVIEW_POLICY.md` for every PR in this run.** The repository owner authorized it in chat on 2026-08-27. It exists because Phase 4's merge gate has deadlocked repeatedly on this epic—`plans/759/RUN.md` records #787 reaching "all gates pass" and staying `BLOCKED`, because branch protection wants an approving review that no available identity can supply on a same-agent Phase 4 PR. Five rounds of Codex is more review than that gate was delivering, not less.

### The procedure

1. **Open the PR** the normal way: `scripts/gh-as-author.sh -- gh pr create`, with `Authoring-Agent: claude` and a `## Self-Review` section.
2. **Run up to five rounds of `@codex review`**, via `scripts/codex-review-request.sh <PR#>`. Each round: read every finding, fix it or post a reasoned rebuttal on its thread, then request the next round. Reply **and** resolve—they are separate requirements (invariant 7 still holds).
3. **A 👍 from `chatgpt-codex-connector[bot]`, at any round, ends the loop.** You may then break-glass merge immediately:
   ```bash
   BREAK_GLASS_ADMIN=1 BREAK_GLASS_MERGE_STATE=1 scripts/gh-as-author.sh -- \
     gh pr merge <PR#> --repo nathanjohnpayne/nathanpaynedotcom --squash --admin --delete-branch
   ```
4. **Otherwise merge once round five's findings are fixed.** Same command.
5. **If the five rounds run out with findings still open, merge anyway and move on.** Do not stop, do not escalate, do not post a manual handoff.

### What you still owe when rounds run out

Merging with open findings is authorized; merging *silently* is not. Before moving to the next page, in the same session:

- Record in `plans/759/RUN.md`: the PR, the round count, and **each unresolved finding with why it was not taken**—disagreed, out of scope, or simply not reached.
- File one GitHub issue per unresolved finding, as `nathanjohnpayne`, labels `post-review` and `observation` or `risk`. That is the repository's own step 11, and it is the reason an authorized shortcut stays auditable instead of becoming an untracked defect.

A finding you rebutted is dispositioned, not unresolved—it needs no issue. This applies only to findings that were never answered.

### What has not changed

- CI still has to be green. The override is about the *review* gate, not the build.
- CodeRabbit findings are still dispositioned as usual, including the PR-level `[mergepath-comment-ack: <id> <fingerprint>]` comment the accounting harness demands—the `Codex P1 unresolved threads` check fails without it even when CodeRabbit reported no issue at all. Expect this on every PR.
- Your own reviewer identity (`nathanpayne-claude`) still does a pass and still posts. Under-threshold PRs may still take the ordinary `--approve` route and skip all of the above; it is faster and it is the intended path when it applies.
- `scripts/phase-4b-review.sh` is not needed for this run. If you invoke it anyway and it returns exit 6, that is the HEAD barrier, not an error—ignore it and follow the procedure above.

---

## 0. Read first

In this order, before touching anything:

1. `AGENTS.md` and the files it indexes under `docs/agents/`
2. `rules/repo_rules.md`
3. `specs/project-pages.md`
4. `.ai_context.md`, `DEPLOYMENT.md`
5. `plans/759/RUN.md`—the epic's run state, and the procedure this run continues
6. `plans/759/project-pages-ledger.md` §B—the 24 audited Five Across claims (PR #815, merged)
7. `.github/review-policy.yml` and `REVIEW_POLICY.md`
8. Issues #759 (epic) and all eight children: #751, #752, #753, #754, #755, #756, #757, #758. Read all eight before designing the schema—the components have eight consumers, and a field shaped around Five Across alone will not fit Matchline or Swipe Watch.

Run the credential preflight once at session start: `eval "$(scripts/op-preflight.sh --agent claude --mode all)"`

---

## 0.5. Stale sources—already repaired, and what that means for you

**Stage 0 is done. Do not redo any of it.** It is recorded here because the *consequences* bind everything downstream.

| What was stale | State |
|---|---|
| `package.json` typescript ceiling had drifted to `<7.1.0` while `rules/repo_rules.md` declared `<6.1.0`—widened by #738, a grouped Dependabot bump that auto-merged | Restored in **#824** (`5c7dbb7`). The missing prose-vs-manifest check is tracked as **#825**. |
| `plans/759/RUN.md` showed PRs #805 and #814 as open; both had merged | Corrected in **#821**. |
| Issues #753, #756, #758 described defects the pages no longer have | Annotated 2026-08-27 with `[!IMPORTANT]` disposition callouts per `docs/agents/decision-records.md`. |

### The one rule that survives from it

**The seven project pages are clean.** PRs #811–#818 landed every correction in `plans/759/project-pages-ledger.md`. Verified by spot check: swipe-watch reads 106, DST 100–150 and 332 commits, FFB 581 commits and PR `#161` and twenty-two hours, mergepath seventy-one CI checks with dates attached, override "more than a hundred", matchline the 2026-07-31 handover, five-across with the mockup champion stat gone. Matchline additionally retracts the "can never quietly invent" universal in its own prose and labels its performance budgets as budgets.

**If a source tells you one of those is wrong, the source is stale, not the page.** The three annotated issues carry struck-through items marked with the PR that closed them. A struck item is a record, not a task. Re-applying a correction to already-corrected prose is the specific way a fixed claim gets reintroduced, and it has happened in this epic before.

### One line of Stage 0 deliberately left for you

`plans/759/RUN.md:65` reads "Out of scope for this run: portfolio issues #751–758." That is still true of the *blog* run it describes. Scope it to that run and open your own section for this one, as part of your first RUN.md update in Stage 2—not as a separate PR.

---

## 1. The design brief you are implementing

The source design plan is committed alongside this runbook at `plans/759/portfolio-case-study-component-plan.md`. It is input, not instruction. **The decisions below supersede it wherever they conflict**—it proposes several things this run deliberately rejects, listed in the table further down. Read it for the field semantics and for its §9 design principles, which are adopted in full.

### Adopted from the plan

- A reusable `decisions` frontmatter array on the `projects` collection, with `title` / `context` / `rejected` / `rationale` / `evidence` / `status`.
- `status: 'validated' | 'mixed' | 'revised' | 'pending'`. Failure states must render as comfortably as `validated`—a portfolio where every bet retrospectively looks correct reads as marketing. Style them as four peers: `validated` must not read as success, and the other three must not read as error states. No green checks, no red warnings.

### The `DecisionLedger` semantic contract

Write these definitions into `specs/project-pages.md`. Without them, seven pages authored by seven subagents will classify the same situation four different ways.

| status | means |
|---|---|
| `validated` | Observed evidence materially supports the decision. |
| `mixed` | Evidence supports part of it and exposes a real limitation—weak adoption, a contradictory signal, a benefit that arrived for a different reason than predicted. |
| `revised` | Observed evidence caused the decision or its implementation to change. The change is the outcome. |
| `pending` | The decision is real and consequential, but adequate outcome evidence does not yet exist. |

**`evidence` stays required (`min(1)`) for every status, `pending` included.** Do not weaken the schema to accommodate `pending`. For a pending decision the field carries the validation boundary—why the evidence is not in, and what would resolve it:

```yaml
status: pending
evidence: "Not yet validated. The product was paused before enough post-launch usage accumulated to test whether the approval gate changed reviewer behavior; a second event with an unrelated group would resolve it."
```

An empty-feeling `evidence` is the schema doing its job—it is telling you the decision has no observed outcome, which is a fact about the work, not a formatting problem. What it must never contain is a restatement of `rationale`. Rationale is why the choice was made; evidence is what happened afterward. If the two read alike, the row has no evidence.

**The bar for a decision at all:** *could a reasonable PM have chosen the rejected alternative, under the same constraints, without being wrong to?* If no, it is implementation description. Cut it and find a real one.
- A vertically stacked **ledger**, not a card grid, not a four-column KPI row. Skim order is (1) the decision, (2) whether the evidence validated it. Everything else is secondary.
- Evidence must be visually distinguishable from rationale. They are different epistemic objects and must not be interchangeable typographic blocks.
- A `constraints` strip (`value` + `label`)—context, not vanity metrics. Two consumers: #752 and #755.
- `learnings`: expected → observed → response. The third field must say what *changed*, never "we were right." Two consumers: #752 and #757.

Three fields, and each one is here because at least two pages need it—that is the whole admission test, and it is why `principles` and `evolution` were cut below. Do not add a fourth without naming its two consumers first (invariant 10).
- Mobile is first-class. No multi-column relationships that collapse ambiguously.

### Rejected from the plan, and why

| Rejected | Reason |
|---|---|
| `CaseStudyEvidence` wrapper component | Bundles four unrelated layouts, and cannot produce the plan's own §5 IA—see §2 below. Build the leaf components; let the page place them. |
| `principles` as a schema field | Four slogans are a list. The plan's own "no card grids" rule leaves it rendering as a list. Author them as prose. |
| `evolution` as a schema field | Exactly one consumer, forever. The plan's own §10 forbids project-specific variants. Author the Gay Cruise Bingo → Vacay Bingo → Five Across arc as prose plus the existing `screenshotSecondary` paired-figure treatment. |
| `caseStudy: z.object({...}).optional()` | The blog precedent (`keyTakeaways`, `pullquotes`, `sidebar`) is flat top-level. An `.optional()` wrapper also defeats every inner `.default([])`, so `data.caseStudy?.learnings` is `undefined` despite the default. Use flat top-level fields. |
| The plan's example `learnings` table | It presents the reshuffle as validated demand. `plans/759/project-pages-ledger.md` §B records 7 of 48 reshuffles spent—a *mixed* result, and a better story. Use the ledger, never the plan's illustrative numbers. |
| Naming the component `DecisionRecords` | `docs/agents/decision-records.md` is an existing propagated mergepath process doc about PR/issue disposition records. Name it `DecisionLedger` (`src/components/projects/DecisionLedger.astro`). |

---

## 2. Resolve this before building anything

**The placement problem.** `ProjectLayout.astro` renders the Markdown body as a single `<slot />`. Frontmatter-driven components can therefore render *before* or *after* the whole body, but not *between* two of its sections. The target IA for #752 requires interleaving: prose(problem) → constraints → decisions → learnings → prose(live ops, platform, agent model, limits).

Spawn a **Plan** subagent to settle this before any implementation. Its brief:

> Determine how frontmatter-driven Astro components can be placed at arbitrary points inside
> a project's Markdown body in this repo. Evaluate at least: (a) adding `@astrojs/mdx` and
> converting `five-across.md` to `.mdx`; (b) a remark/rehype plugin in `src/plugins/` that
> resolves an in-body marker against `file.data.astro.frontmatter`, following the existing
> `remark-mermaid.mjs` / `rehype-figure-captions.mjs` pattern; (c) accepting fixed render
> slots and designing the IA around them. Report the build-stability risk of each against
> `astro@7.2.4` + `@astrojs/markdown-remark@7.2.4`, which `rules/repo_rules.md` pins exact
> and requires to move together. Do not implement.

**Prefer MDX, but it is not selected until a disposable spike proves it.** MDX is the idiomatic Astro answer, `scripts/lint-prose.mjs` already accepts `.mdx`, and `extendMarkdownConfig` is supposed to preserve the three existing plugins. What could kill it is the pin: `rules/repo_rules.md` § Toolchain Constraints pins `astro` and `@astrojs/markdown-remark` **exact and moving together**, because a floating range on either side breaks `npm ci` on an exact optional peer. Adding `@astrojs/mdx` to that tree is precisely the operation those pins exist to make dangerous.

### The MDX spike, and where it happens

**The spike runs in a throwaway git worktree that is deleted afterward. Nothing it produces is committed, and none of it counts as Stage 2 implementation.** This matters because the first step mutates `package-lock.json`, and a lockfile edit sitting in the real branch before the placement decision is recorded is indistinguishable from having started the build. Create the worktree, run the gate, read the result, `git worktree remove` it, and only then record the decision.

```bash
git -C ~/GitHub/nathanpaynedotcom worktree add ~/GitHub/.nathanpaynedotcom-worktrees/mdx-spike main
# …run the five checks below inside it…
git -C ~/GitHub/nathanpaynedotcom worktree remove ~/GitHub/.nathanpaynedotcom-worktrees/mdx-spike --force
```

**All five must pass. A clean install proves package-tree compatibility, which is not the same claim as build stability—it is the cheapest check, not the sufficient one.**

1. **Resolution.** `npm install --package-lock-only` with `@astrojs/mdx` added. Read the actual output; an ERESOLVE against the `astro` / `@astrojs/markdown-remark` optional peer is a hard stop.
2. **It renders.** `npm ci`, add the MDX integration, convert one project entry to `.mdx` with a component imported and placed mid-body, and `astro build`. The page must build and the component must appear where it was placed—that is the whole reason MDX is a candidate.
3. **The existing pipeline survives.** The three plugins in `src/plugins/` must still run over both `.md` and `.mdx`. Check a rendered blog post for figure captions and colour chips, not just the absence of a build error.
4. **Prose lint sees it.** `node scripts/lint-prose.mjs` must actually lint the `.mdx` file. Its `MARKDOWN_EXTENSIONS` set includes `.mdx`, so this should hold—confirm it rather than assuming, by planting a spaced em dash and watching the gate fail.
5. **The Mermaid restriction holds.** The adapter must still reject Mermaid fences outside `src/content/blog/**`. Plant one in the `.mdx` project entry; the build must fail. If MDX silently widens that surface, that is a regression in an invariant `rules/repo_rules.md` states explicitly.

**If all five pass, take MDX.** Record the evidence—the five outcomes, not "it worked"—in a `plans/` entry, which `rules/repo_rules.md` requires for a framework-level addition anyway, plus the collection glob widening to `**/*.{md,mdx}`.

**If any fails, do not fight it.** Fall back to (c), design the Five Across IA as a two-band structure, and record which check failed and why. A failed spike is a completed Stage 1, not a blocked one—the STOP condition is only for the case where *no* option is safe.

---

## 3. Work split

### Fable—design direction and prose (`model: fable`)

Spawn **two** Fable subagents. Neither gets repo write access and neither drives a PR; they return drafts, you verify and apply. This mirrors the handoff proven across the seven blog audits in `plans/759/RUN.md`.

**Fable A—visual design of the decision ledger.** Hand it: the plan's §2 and §9, the design tokens in `docs/agents/code-modification-rules.md`, `src/styles/global.css`, `src/layouts/ProjectLayout.astro`, `src/components/MetadataStrip.astro`, and a rendered Five Across page for context. Ask for the ledger's typographic and spatial system at 375px, 768px and 1440px: how the decision title, the status token, and the four supporting fields are ranked; how `evidence` reads as observation rather than argument; how `mixed` and `revised` carry equal visual weight to `validated` without becoming an alert state. Constraints it must respect: accent derives from `data-accent`, never a literal hex; every duration and easing is a motion token, never a bare `ms` or `ease`; typography is Cormorant Garamond for headings and Inter for body, with no new font loads. Ask for CSS, not a mockup.

**Fable B—page prose. One Fable subagent per page, spawned when that page's PR begins.** Not one agent for all seven. Hand each: its issue in full, its section of `plans/759/project-pages-ledger.md` (mapped in §4 below), the current page source, and—from the third page onward—the two most recently merged page revisions as voice reference. Ask for the reworked body plus that page's `decisions` / `constraints` / `learnings` frontmatter values.

Bind every Fable B to these:

- Every number traces to a **SUPPORTED** row in the ledger. A **WRONG** row's corrected value is used verbatim. An **UNPROVABLE** row gets the ledger's defensible weaker form or is cut. No number appears that the ledger does not carry.
- Do not claim Nathan is a strong PM or good at directing agents. The work demonstrates it or it does not. Every one of the eight issues carries this instruction.
- Keep what the work demonstrated separate from what it did not. Every page has a validation boundary and every issue asks for it to be explicit.
- The agent operating model stays compact and is not a model/tool/commit inventory.
- CMOS em dashes, closed up, no surrounding spaces.
- Soft-wrap: one physical line per paragraph.
- The decision count its own issue specifies, each with a real rejected alternative. A decision without a credible alternative is implementation description—cut it and pick another.

### Mechanical workers

Model per worker, not one setting for all four. Workers 1–3 are deterministic against a settled schema—`model: sonnet`. Worker 4 is an evidence audit and makes SUPPORTED / WRONG / UNPROVABLE judgments that later pages copy verbatim; a wrong verdict there propagates into every page that reuses the row, so run it on `model: opus`.

Spawn these in parallel once §2 is settled. Each is independent:

1. **Schema + tests.** Add flat top-level `decisions`, `constraints`, `learnings` to the `projects` collection in `src/content.config.ts`, each `.optional().default([])`, with the inline-comment density the surrounding fields use. Extend `tests/content-schema.test.js`—it asserts schema strings against the config source, so new fields need new assertions.
2. **Components + CSS.** `src/components/projects/DecisionLedger.astro`, `ConstraintStrip.astro`, `LearningLedger.astro`, built to Fable A's system. Wire the conditional render (`length > 0`) per the resolution from §2.
3. **Spec + route tests.** Extend `specs/project-pages.md`: document the three new frontmatter fields in the field-reference table, and—**required**—amend its "Body content structure" section, which currently mandates the Overview / What the product does / Why it matters shape that #752 explicitly removes and that six of the other seven pages will also leave behind. Leaving it is a spec/behavior divergence across the whole workstream. Extend `tests/project-pages.test.js` with render assertions. Do **not** add new files under `specs/` without a matching `tests/` file—`scripts/ci/check_spec_test_alignment` enforces 1:1.
4. **Delta evidence audit**—re-spawned per page, not once. Each restructure asserts things the existing ledger does not cover, particularly the expected→observed→changed framings, which reinterpret audited data rather than restate it. Audit only that page's new claims, append them to `plans/759/project-pages-ledger.md` under a new subsection, using the same SUPPORTED / WRONG / UNPROVABLE vocabulary and the same "check it against the mechanism" method notes. Never re-audit rows §A–§G already carry.

---

## 4. Nine PRs: one infrastructure, one per page, index last

`external_review_threshold` is 300 lines, so most of these are Phase 4 anyway. Batching two pages into one PR would drag two independent content reviews through the same feedback loop and is forbidden by the epic's own standing constraint: **one issue, one PR, never batch children.**

**PR 0a / 0b and the issue edits** come first—see §0.5. They are small, none is above the 300-line threshold, and the issue edits are not PRs at all. Do not start PR 1 until the issue bodies are corrected; §3 feeds them to Fable as primary input.

**PR 1—infrastructure.** Schema, components, CSS, spec, tests. No page consumes it yet, or one minimal adoption to prove the render path. Reviewable as code, by a code reviewer, without a content argument attached. Everything else waits on this merging.

Then one PR per page, in this order:

| # | Issue | Page | Ledger | Components it needs | The trap in this one |
|---|---|---|---|---|---|
| 2 | #752 | `five-across` | §B | decisions (4–6), constraints, learnings | Calibration run—it is the only page needing all three components, so it proves the whole system. Do not start page 3 until it merges. |
| 3 | #757 | `swipe-watch` | §G | decisions (≥3), learnings | Second `learnings` consumer, and a small page—cheap proof the field generalizes. The EVP demo is qualitative stakeholder feedback, not hypothesis confirmation. Separate swipe evidence from the coin/unlock mechanic. |
| 4 | #753 | `mergepath` | §E | decisions (3–5) | Its "Phase 4b is described as manual" bullet is **already fixed**—see §0.5. Remaining work is the reframe: replace the component inventory with decision records, and reconcile PR/check/finding/fleet counts against the API rather than "100+", each with a date attached. |
| 5 | #754 | `override` | §F | decisions (3–5) | No behavioral evidence exists—do not manufacture `learnings`. The hypothetical $15M production is not adoption evidence. State the validation boundary plainly. |
| 6 | #755 | `device-source-of-truth` | §A | decisions (3–5), constraints | Confidentiality. The synthetic-data boundary must be prominent enough that no reader mistakes demo data for Disney production data. §A already carries two WRONG rows on the 350-question claim—use the corrected 100–150. |
| 7 | #756 | `matchline` | §D | decisions (3–5, several `pending`) | This page stress-tests the `pending` and `revised` states. Its issue asks every capability labelled observed / designed / implemented / validated / future—resolve that as prose, not a second schema field. The pause is a resource-allocation decision, not an apology. |
| 8 | #758 | `friends-and-family-billing` | §C | decisions (3–5) | `Blocked by` is cleared—#744 merged as `29d864e`. The `#161`/`#178` correction is **already on the page**; do not re-apply it. Bare `#NNN` on this page means the friends-and-family-billing repo, not this one. |
| 9 | #751 | `/projects/` index | §H | none | Last, deliberately. #759 and #751 both say the index copy finalizes after the page narratives settle. Layout, navigation and ordering tests may start earlier; hero and card copy may not. Do not re-sort the canonical order—`specs/project-pages.md` documents it as an editorial decision that must not be "corrected." |

**Cadence.** Land them in sequence, pipelined the way RUN.md already runs this epic: only start a page's Phase 3 (branch, PR, review, merge) after the previous page's PR merges, but a page's Phase 1 and 2 (evidence delta, Fable draft) may overlap the PR ahead of it in review. That is what keeps a review loop from forking across two open content PRs.

Add a **Portfolio narratives—one PR per page** table to `plans/759/RUN.md` mirroring the one above, and fill each PR cell in the same step that creates the PR.

---

## 5. Gates and process

Per PR, in this order:

- `npx eslint .`—this works because §0 had you run `npm ci` **inside** the worktree. If it reports a missing binary, you skipped that step or symlinked the parent's `node_modules`; fix that rather than reaching across to the parent checkout's bin, which also drags in the parent's stale Astro render cache.
- `node scripts/lint-prose.mjs`—note `plans/**/*.md` is linted too, and `CMOS.EmDash` is an **error** there, not a warning. Untracked files are not linted, so it passes silently until you `git add`.
- `npx astro check`
- `npm test` (`astro build && vitest run`)
- Check the rendered page at 375, 768 and 1440px before opening the PR. No horizontal overflow, no console errors.

PR body carries `Authoring-Agent: claude` and a `## Self-Review` section. Create via `scripts/gh-as-author.sh -- gh pr create ...`. Fill the PR cell in `plans/759/RUN.md` in the same step that creates the PR—that rule is in RUN.md because it has already been broken once.

Review loop: fire `scripts/codex-review-request.sh` on push in parallel with `scripts/coderabbit-wait.sh`. Disposition every finding—**reply and resolve are separate requirements**. Codex findings go through `scripts/codex-record-feedback.sh`; CodeRabbit findings through `scripts/coderabbit-record-feedback.sh` (ledger only, never a reaction). Batch fix commits before running `scripts/phase-4b-review.sh`—every push re-opens its HEAD barrier, and run it from the trusted `main` checkout, never from this worktree.

When a review finding corrects a claim, grep the ledger and `plans/759/RUN.md` for every other instance of that claim before pushing. Five of seven findings in one round of PR #787 were stale copies of an already-corrected claim.

Append a log entry to `plans/759/RUN.md` at each phase boundary.

---

## 6. Stop and ask me if

These are the only cases that stop the run. Everything else—including merging, and including merging with findings still open—is yours under §C.

- The §2 Plan agent concludes none of the three placement options is safe.
- A Fable B cannot source a decision's `evidence` field from the ledger. That means the decision has no observed outcome, and inventing one is the failure mode this whole epic exists to fix. Use `pending` if the decision is real and the evidence simply is not in yet—but say so.
- A page cannot reach the decision count its issue specifies with credible rejected alternatives. Do not pad to hit a number.
- ~~A PR exhausts its review rounds.~~ **No longer a stop condition**—see §C. Exhausting five Codex rounds means merge and move on, recording the unresolved findings.
- Two pages in a row need a schema field PR 1 does not have. One is a miss; two means the infrastructure was designed against the wrong consumers and should be revised before page five rather than worked around seven times.
