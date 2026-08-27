# Placing frontmatter-driven components inside a project body

Epic #759, Workstream 2, Stage 1. This entry records the framework-level addition `rules/repo_rules.md` § Forbidden Patterns requires for introducing a new Astro integration, and the evidence behind choosing it.

**Decision: adopt `@astrojs/mdx` and widen the `projects` collection glob to `**/*.{md,mdx}`.** Pages convert to `.mdx` individually, as each page's PR reaches it. Nothing forces a page to convert; a `.md` project page keeps rendering exactly as it does today.

## The problem

`ProjectLayout.astro` renders the Markdown body as a single `<slot />`. Frontmatter-driven components can therefore render before or after the whole body, never between two of its sections. The target information architecture for #752 needs interleaving: prose(problem) → constraints → decisions → learnings → prose(live ops, platform, agent model, limits).

## Options evaluated

A Plan subagent researched three, read-only, without installing anything.

| Option | Mechanism | Why not chosen |
|---|---|---|
| (a) `@astrojs/mdx` | MDX registers a content entry type, so the entry compiles as a JS module rather than being rendered to an HTML string. That is what lets it instantiate real `.astro` components mid-body. | **Chosen.** |
| (b) remark/rehype plugin resolving an in-body marker | A plugin reads `file.data.astro.frontmatter` and emits markup where the marker sat. `file.data.astro.frontmatter` is genuinely populated, so the premise holds. | A remark plugin produces mdast and a rehype plugin produces hast; `createMarkdownProcessor` serializes to a string. There is no seam for a component instance, so the three components would exist as hast literals in a `.mjs` file rather than as `.astro` files, forking the component system Worker 2 is chartered to build. It also reads frontmatter before Zod runs, which cancels the schema work. |
| (c) fixed render slots | Components become props on `ProjectLayout` and render as siblings of the existing `<slot />`. Zero new dependencies, zero risk against the pins. | Cannot interleave. One collection entry yields exactly one `<Content />`, so prose → components → prose needs two bodies. Reaching it means splitting each project into two entries plus a `part` field and a route filter, because `getStaticPaths` derives `params.slug` from `data.slug` and two entries sharing a slug collide. That costs a route and schema change and breaks the same tests option (a) breaks, for less benefit. |

Option (c) remains the fallback if MDX is ever removed: the Five Across IA would become a two-band structure, prose then structured appendix.

## The spike

Run in a throwaway worktree at `~/GitHub/.nathanpaynedotcom-worktrees/mdx-spike`, branched from `main` at `c239dda`, deleted afterward with `git worktree remove --force`. Nothing it produced was committed. Six checks: the five the runbook specified, plus a sixth the Plan agent recommended after reading the plugins.

### 1. Resolution—PASS

`npm install --package-lock-only --save-dev @astrojs/mdx` resolved `@astrojs/mdx@7.0.8` with no ERESOLVE. 794 lockfile insertions, 47 new packages. The `astro` and `@astrojs/markdown-remark` lock entries were not touched by the diff, and both stayed at `7.2.4`.

`@astrojs/mdx@7.0.8` declares **no peer** on `@astrojs/markdown-remark`. It peers on `astro@^7.0.0` and, optionally, on `@astrojs/markdown-satteri@^0.3.1`. It carries `@astrojs/markdown-remark@7.2.4` as an **exact regular dependency**, byte-identical to the repo's pin, so npm dedupes to the single hoisted copy: `node_modules/@astrojs/mdx/node_modules` does not exist after `npm ci`.

### 2. It renders—PASS

`npm ci` installed flat. With the integration added, `src/content/projects/five-across.md` converted to `.mdx`, and a probe component imported and placed between the Overview prose and `## How it was built`, `astro build` completed: 37 pages, 18 OG images, resume PDF. The component rendered at exactly its authored position, verified by document offset rather than by eye: `Overview` < probe < `How it was built` < `Why it matters`. Array and string props both arrived intact.

### 3. The existing pipeline survives—PASS, byte for byte

The strongest available form of this check: a baseline `astro build` of the same commit without MDX, diffed against the spike's build. Normalizing only the timestamp-derived OG cache-buster (`?v=NNNNNNNN`), **all seven blog posts and all six untouched `.md` project pages render byte-identical.** Mermaid inline SVG counts hold at 1/1/1/1/1/3/2, figure captions at 0/3/0/2/4/4/2, and the colour chips on `two-blues-one-composition` are unchanged. No smartypants drift: counts of every curly punctuation mark on the converted page match baseline exactly, across right and left single quotes, right and left double quotes, the ellipsis, and the en dash.

The converted `.mdx` page itself still receives `rehype-figure-captions`, rendering `<figure class="blog-figure blog-figure-portrait">` with a numbered `<figcaption>`.

The `markdown.remarkPlugins ... are deprecated` warning printed by every build is **pre-existing**; it appears in the baseline log too and is not caused by MDX.

### 4. Prose lint sees it—PASS

`node scripts/lint-prose.mjs` discovers `five-across.mdx` on its own; its `MARKDOWN_EXTENSIONS` set already contains `.mdx`. Confirmed rather than assumed, by planting a spaced em dash: two `CMOS.EmDash` **errors** at `src/content/projects/five-across.mdx:35`, gate exit 1.

### 5. The Mermaid restriction holds—PASS

A planted `mermaid` fence in the `.mdx` project entry failed the build with the adapter's own message, naming the `.mdx` path, thrown from `@astrojs/mdx/dist/vite-plugin-mdx.js`. MDX does not widen that surface. The plugin runs on `.mdx`, and `assertSupportedContentFile`'s regex ends `\.md$`, so an `.mdx` file takes the throw path.

### 6. Code fences and colour chips—PASS

Added after the Plan agent flagged the real exposure: MDX converts hast to estree, and both `rehype-color-chips` and `rehype-mermaid-accessibility` write `properties.style` as a **string**, which `hast-util-to-estree` re-parses. Five Across's current body has no code fence and no hex inline code, so the first project page to use one would have been the discovery.

Planting a hex inline-code span, a TypeScript fence and a CSS fence in the `.mdx` file: chips render (`<code class="color-chip">` with its swatch `<span>`), Shiki runs with the repo's own transformer (`class="astro-code css-variables blog-code-block"`, `data-language` preserved, inline `background-color`/`color` stripped from `<pre>`), and 36 token spans convert cleanly. `--red` is correctly not chipped.

Rendering the identical fixture as `.md` and as `.mdx` and diffing the two fragments isolates the entire difference to the cosmetic serialization classes described below.

## What Stage 2 has to do about it

Five findings bind the implementation. The first is the one that changes the design.

### `frontmatter.X` is raw YAML; `props.X` is the Zod-parsed value

An MDX body can reach its own frontmatter two ways, and they are not equivalent.

- `frontmatter.X` is the **raw, unvalidated YAML**. A field declared `.optional().default([])` in `src/content.config.ts` arrives as `undefined` when the key is absent from the file. Zod has not run.
- `props.X` is the **Zod-parsed `data.X`**, but only when the route forwards it: `<Content decisions={data.decisions} />` in `src/pages/projects/[slug].astro`, read as `props.decisions` in the body. A bare `decisions` is a `ReferenceError`.

Demonstrated by adding a throwaway `spikeItems: z.array(z.string()).optional().default([])` field and reading it three ways: present in frontmatter it resolved through `frontmatter.spikeItems`; absent, `frontmatter.spikeItems` was `undefined` while `props.spikeItems` was `[]`.

**Therefore: the route forwards `decisions`, `constraints` and `learnings` on `<Content />`, and pages author `<DecisionLedger decisions={props.decisions} />`.** This is the same defect class the runbook already identified for a `caseStudy: z.object({...}).optional()` wrapper, and it is worth stating plainly that it defeats a flat top-level `.default([])` too, on the `frontmatter` path. Components should still normalize internally (`decisions ?? []`) and return nothing when empty, so the `length > 0` conditional lives in one place rather than at every call site.

### Five `.md`-only call sites, two of which fail silently

Widening the collection glob is not sufficient. `git grep` finds five places that filter on `.md`:

| Site | Behavior under `.mdx` |
|---|---|
| `tests/project-pages.test.js:279` | **Fails loudly.** `expected 6 to be 7`, the one test that broke in the spike. |
| `tests/project-pages.test.js:287` | Silently stops accent-ramp-checking the converted page. |
| `tests/project-pages.test.js:318` | Same. |
| `scripts/refresh-mux-gifs.mjs:83` | **Silently skips.** A `prebuild` step. |
| `scripts/refresh-hero-images.mjs:78` | **Silently skips.** A `prebuild` step. |

The two script sites are the dangerous ones. Only `swipe-watch.md` carries `muxPlaybackId` and no project currently carries `heroRefresh`, so converting Five Across breaks nothing. Converting Swipe Watch, which is page three in the sequence, would silently stop refreshing its Mux fallback GIF, which is precisely the "a silent miss would serve stale content indefinitely" failure `scripts/refresh-mux-gifs.mjs`'s own header warns about. Widen all five in PR 1, not in the PR that first needs them.

### Three cosmetic serialization differences

Rendering identical source as `.md` and as `.mdx` differs in exactly three ways, none of which change what a browser paints:

- CSS declarations lose their space: `style="background-color: #e8784a"` becomes `style="background-color:#e8784a"`, because MDX parses the style string into a JSX object and re-serializes it.
- Apostrophes in text are entity-encoded: `'red'` becomes `&#39;red&#39;`. In attributes the inverse happens, `&#x27;` becomes a literal `'`.
- Void elements self-close: `<img ...>` becomes `<img ... />`.

No existing assertion broke on any of these, but a test matching a raw HTML substring that contains an apostrophe, a spaced CSS declaration, or a non-self-closed void element will break the moment its page becomes `.mdx`. Assert on parsed DOM, not on HTML strings.

### The exact-pin set becomes a triple

`rules/repo_rules.md` § Toolchain Constraints pins `astro` and `@astrojs/markdown-remark` exact and requires them to move together. `@astrojs/mdx` joins them, with two distinct coupling failures:

- Its dependency on `@astrojs/markdown-remark` is exact **per mdx release**. Bumping `astro` and `@astrojs/markdown-remark` to 7.2.5 without a matching mdx release makes npm nest a second copy of `markdown-remark` under `node_modules/@astrojs/mdx`. **That is a silent duplicate, not an ERESOLVE**, so it will not announce itself the way #630 and #631 did.
- `astro@7.2.4` depends on `@astrojs/markdown-satteri@0.3.7` exactly, while mdx peers `^0.3.1`. The first `astro` release that moves to `0.4.x` breaks `npm ci` on that peer, which is a clean ERESOLVE of the #631 class.

`rules/repo_rules.md` needs the third package added to that bullet in PR 1.

### `astro check` covers `.mdx`

File count goes 121 → 122 with the conversion, hints 123 → 125, errors unchanged at 2. The two errors are **pre-existing on `main`** and unrelated: `tests/responsive/mermaid-accessibility.spec.ts:107` and `:109`, `Property 'ownerSVGElement' does not exist on type 'HTMLElement'`. CI runs `npm test` and `npm run lint`, not `npm run typecheck`, which is why they have survived. They are not this workstream's to fix, but a gate listed as green should not be assumed green.

## What the spike did not prove

- That MDX's hast-to-estree conversion survives a **Mermaid** diagram, since Mermaid is rejected outside `src/content/blog/**` by design and could not be planted. Project pages cannot carry Mermaid, so this is unreachable rather than untested.
- Behavior under any `astro` version other than `7.2.4`.
- That `eslint` covers `.mdx`. It does not: `eslint-plugin-mdx` is not installed and `eslint.config.js` declares no `.mdx` glob, so imports and JSX inside an `.mdx` body are unlinted. Vale does lint them, and will read an `import` line as prose.

## One cleanup this surfaced, deliberately not taken here

`astro.config.mjs` uses `markdown.remarkPlugins` / `markdown.rehypePlugins`, which Astro 7 deprecates and rewrites at config-validation time into `markdown.processor = unified()`. **That shim is the load-bearing link that carries the three custom plugins into MDX**, and it prints a deprecation warning on every build. Rewriting the config to the non-deprecated `unified({...})` form would remove the warning, make the `@astrojs/markdown-remark` devDependency genuinely imported by source rather than a dependency-scan false positive, and make the MDX inheritance path explicit instead of an artifact of a shim scheduled for removal.

It is out of scope for this workstream and belongs in its own PR: it changes how every page in the repo is rendered, and bundling it with a content-infrastructure change would put a whole-site rendering migration inside a portfolio PR.
