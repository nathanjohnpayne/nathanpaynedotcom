import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { BLOG_CATEGORIES } from './lib/blog-order';

const projects = defineCollection({
  // `projects` is the only collection that takes .mdx. A case-study page
  // interleaves DecisionLedger / ConstraintStrip / LearningLedger between
  // runs of body prose, and MDX is the only mechanism that can place a
  // component mid-body. Every other collection stays narrowed to .md so
  // the wider surface is opt-in per collection rather than repo-wide.
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z
    .object({
      title: z.string(),
      slug: z.string(),
      description: z.string(),
      seoDescription: z.string().optional(),
      kicker: z.string(),
      // Non-negative integer: `accent` is derived as RAMP[order % 5], so a
      // fractional or negative value has no position in that walk. YAML numeric
      // spellings such as `1` and `1.0` both reach Zod as the integer-valued
      // number 1; the ramp assertion parses frontmatter the same way.
      order: z.number().int().nonnegative(),
      screenshotAspect: z.enum(['wide', 'narrow']),
      screenshotSrc: z.string(),
      // A companion capture rendered BESIDE `screenshotSrc` (side by side above
      // --bp-tablet, stacked below). For a platform that ships more than one
      // front end, one shot per Edition says more than either alone. `alt` is
      // required rather than optional so a second image cannot reach the page
      // without alt text — the primary derives its own from the project title.
      screenshotSecondary: z
        .object({
          src: z.string().trim().min(1),
          alt: z.string().trim().min(1),
          // Intrinsic pixel dimensions, required rather than optional. The
          // companion is `loading="lazy"` and stacks BELOW the primary on phones,
          // so without an aspect-ratio box it occupies zero height until fetched
          // and then shoves the stack caption and the whole article down by a
          // full frame (Codex P2 on #785). Assets in `public/` are not processed
          // by Astro, so nothing can infer these at build time.
          width: z.number().int().positive(),
          height: z.number().int().positive(),
        })
        .optional(),
      accent: z.enum(['red', 'yellow', 'black', 'blue', 'paper']),
      // Optional: in-progress projects (status "IN PROGRESS") may not have
      // a deployed app yet. When omitted, the "View Live Product" CTA is
      // suppressed on the detail page, the project card, and the homepage
      // Builds section. When present, must be a non-empty string.
      liveUrl: z.string().trim().min(1).optional(),
      // Optional, on the same terms as `liveUrl` above: a project whose
      // repository is private has no repository a reader can open, so the
      // "View on GitHub" CTA is suppressed rather than publishing a link
      // that returns GitHub's 404 to everyone who is not the owner (#874).
      // When present, must be a non-empty string.
      githubUrl: z.string().trim().min(1).optional(),
      tags: z.array(z.string()),
      // Status drives both the project-card kicker on /projects/ and the
      // Status column in the detail-page metadata table — single source of
      // truth, single short-form vocabulary across both surfaces. See #274.
      status: z.enum(['SHIPPED', 'EXPERIMENT', 'IN PROGRESS', 'PAUSED', 'ARCHIVED']),
      metadata: z.object({
        format: z.string(),
        focus: z.string(),
      }),
      stack: z.string().optional(),
      related: z
        .array(
          z.object({
            label: z.string(),
            href: z.string(),
          }),
        )
        .optional()
        .default([]),
      draft: z.boolean().default(false),

      // Opt-in: refresh `screenshotSrc` on each build from the GitHub
      // social preview of `githubUrl`. See scripts/refresh-hero-images.mjs.
      heroRefresh: z.enum(['github-social']).optional(),

      // Mux Playback ID. When set, the project page renders a MUX video
      // in the hero slot; `screenshotSrc` still serves as the JS-disabled
      // fallback and as the OG image source. Rejects empty strings so a
      // blank frontmatter value is a schema error, not a broken URL.
      muxPlaybackId: z.string().trim().min(1).optional(),

      // Case-study structured content — DecisionLedger / ConstraintStrip /
      // LearningLedger, epic #759. Flat top-level fields, deliberately NOT a
      // `caseStudy: z.object({...}).optional()` wrapper: the blog precedent
      // (`keyTakeaways`, `pullquotes`, `sidebar` above) is flat, and an
      // `.optional()` wrapper defeats every inner `.default([])` anyway —
      // Zod never runs the inner schema (or its defaults) when the outer
      // key is absent, so `data.caseStudy?.learnings` would come back
      // `undefined` despite the default.
      //
      // Even flat, `.default([])` is a property of the Zod-validated
      // `data.*`, not of the file. In an MDX body, `frontmatter.X` is the
      // RAW YAML — Zod has not run — so an absent key still reads as
      // `undefined` there. `props.X` is the validated value, forwarded
      // explicitly by src/pages/projects/[slug].astro on
      // `<Content decisions={data.decisions} .../>`; a body reads
      // `props.decisions`, never a bare `decisions` (a ReferenceError).
      // See plans/759/component-placement-decision.md.
      decisions: z
        .array(
          z.object({
            title: z.string().trim().min(1),
            // The editorial filter this decision answers to — rendered as an
            // eyebrow beside the record's index. Optional: a page that does not
            // organise its decisions around a thesis simply omits it.
            lens: z.string().trim().min(1).optional(),
            context: z.string().trim().min(1),
            // What was actually chosen. Presence of this field switches the
            // record to the assertion anatomy — What I encountered / What I
            // decided / Why / Cost / What it changed — relabelling `context`
            // and `evidence` in place. Absent, the record renders the original
            // Context / Rejected / Why / Evidence shape, which is what
            // five-across and swipe-watch author against.
            chosen: z.string().trim().min(1).optional(),
            // Optional since #754: under the encountered/decided anatomy the
            // rejected path often reads better inside `rationale` than as its
            // own slot ("the obvious answer would be X, but that is not
            // actually better"). five-across and swipe-watch author it.
            rejected: z.string().trim().min(1).optional(),
            rationale: z.string().trim().min(1),
            // What the choice gave up, stated as the uncomfortable consequence
            // rather than as "added complexity" — a sentence that could follow
            // almost any decision is not a cost. Optional for the same reason
            // `chosen` is.
            cost: z.string().trim().min(1).optional(),
            // Required for every status, `pending` included — not weakened
            // to optional. For a `pending` decision this field IS the
            // validation boundary: why the evidence isn't in yet and what
            // would resolve it. It must never restate `rationale` — rationale
            // is why the choice was made, evidence is what happened after.
            // Optional since #883. A `pending` record may omit it when the page
            // states the validation boundary once for the whole set and this
            // record has nothing decision-specific to add — see
            // specs/project-pages.md. Present means non-empty; the field must
            // never be filler that restates what was built.
            evidence: z.string().trim().min(1).optional(),
            status: z.enum(['validated', 'mixed', 'revised', 'pending']),
          }),
        )
        .optional()
        .default([]),

      // Constraint chips for ConstraintStrip: `value` is the headline
      // figure/spec, `label` the one-line gloss beneath it.
      constraints: z
        .array(
          z.object({
            value: z.string().trim().min(1),
            label: z.string().trim().min(1),
          }),
        )
        .optional()
        .default([]),

      // Expected/observed/response triples for LearningLedger — what was
      // expected going in, what actually happened, and how the approach
      // changed in response.
      learnings: z
        .array(
          z.object({
            expected: z.string().trim().min(1),
            observed: z.string().trim().min(1),
            response: z.string().trim().min(1),
          }),
        )
        .optional()
        .default([]),
    })
    // `githubUrl` is optional so a private-repo project can suppress its dead
    // CTA (#874), but `heroRefresh: 'github-social'` refreshes the hero from
    // that URL's GitHub social preview. Without it,
    // scripts/refresh-hero-images.mjs warns and skips, so the build stays green
    // while the hero silently goes stale forever. While the field was globally
    // required that pairing was unrepresentable; now it has to be rejected here.
    .superRefine((data, ctx) => {
      if (data.heroRefresh === 'github-social' && !data.githubUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['githubUrl'],
          message:
            "heroRefresh: 'github-social' requires githubUrl — it is the URL the refresh reads.",
        });
      }
    }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    shortTitle: z.string().optional(),
    description: z.string(),
    seoDescription: z.string().optional(),
    category: z.enum(BLOG_CATEGORIES),
    featured: z.boolean().default(false),
    author: z.string().default('Nathan Payne'),
    date: z.coerce.date(),
    tags: z.array(z.string()),
    image: z.string(),
    draft: z.boolean().default(false),

    // Key takeaways — 2–4 portable claims rendered above the article body
    // (#621). Each entry must stand alone out of context ("the fix is X"),
    // not summarize a section ("in this post I discuss X"). Optional with a
    // [] default so a post authored before the field still builds; the
    // route test in tests/blog-takeaways-cta.test.js asserts every
    // non-draft post actually ships a non-empty array, so a new post
    // cannot quietly skip it.
    keyTakeaways: z.array(z.string()).optional().default([]),

    // Sidebar content — optional, defaults to empty arrays.
    // Posts without these fields render the standard layout.
    pullquotes: z
      .array(
        z.object({
          text: z.string(),
          label: z.string().optional(),
          accent: z.enum(['red', 'yellow', 'blue']),
        }),
      )
      .optional()
      .default([]),
    sidebar: z
      .array(
        z.discriminatedUnion('type', [
          z.object({
            type: z.literal('mermaid'),
            content: z.string(),
            title: z.string().trim().min(1),
            description: z.string().trim().min(1),
            caption: z.string().optional(),
          }),
          z.object({
            type: z.literal('image'),
            content: z.string(),
            caption: z.string().optional(),
          }),
          z.object({
            type: z.literal('text'),
            content: z.string(),
            caption: z.string().optional(),
          }),
        ]),
      )
      .optional()
      .default([]),
  }),
});

// `bio` collection — long-lived, hand-edited copy that lives on the
// homepage but isn't the page template. Currently a single entry: NOW
// (the current-state signal under About). Content stays in MD so an
// edit doesn't require a template change; `lastUpdated` is explicit
// (not file mtime) so unrelated edits to the file don't drift the
// timestamp. See #272.
const bio = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/bio' }),
  schema: z.object({
    // Month + year for the human-facing "LAST UPDATED · APRIL 2026"
    // line. Author edits this whenever they refresh the body — the
    // whole point of the section is freshness, so an explicit value
    // beats anything auto-derived. Format: "Month YYYY" in title case
    // (e.g., "April 2026"); the template uppercases it for display.
    lastUpdated: z
      .string()
      .regex(
        /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/,
        'lastUpdated must be "Month YYYY" (e.g., "April 2026")',
      ),
  }),
});

// ── /resume collections ────────────────────────────────────────────
// The resume page (`src/pages/resume.astro`) renders Nathan's resume as
// native content using the same glob() loader + render() conventions as
// `blog`/`projects`/`bio`. Each section maps 1:1 to a collection so a
// future resume edit is a one-file change. See specs/resume.md and #394.
//
// NOTE: `resumeProjects` is intentionally distinct from `projects` — the
// `projects` collection above is reserved for /projects and the homepage
// Builds grid (a ~20-field schema). Do not merge the two.

// Single-entry resume header. Social handles are stored bare (no URL
// scheme) and the full URL is composed in ResumeHeader/SummarySection.
// No `phone` — the canonical resume is email-only. The two-paragraph
// summary lives in the markdown body, rendered with render().
const myself = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/myself' }),
  schema: z.object({
    name: z.string(),
    title: z.string(),
    email: z.string(),
    website: z.string(),
    linkedin: z.string(),
    github: z.string(),
    blog: z.string(),
    location: z.string(),
  }),
});

// Work history. `company` + `website` drive the Logo.dev lookup in
// CompanyLogo; `logo` is an explicit override (used for defunct brands
// with no live domain — Current TV). `order` sorts most-recent-first.
// Bullets / descriptive paragraph live in the markdown body.
const experience = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/experience' }),
  schema: z.object({
    company: z.string(),
    title: z.string(),
    // The bold sub-line on the canonical resume (e.g. "Native Client
    // Platform (NCP) & ADK"). Optional — AJ+/Current TV/CNN have none.
    team: z.string().optional(),
    location: z.string().optional(),
    startYear: z.number(),
    endYear: z.number().optional(), // omit ⇒ rendered as "Present"
    order: z.number(),
    badges: z.array(z.string()).optional(),
    website: z.string().optional(), // drives Logo.dev domain lookup
    logo: z.string().optional(), // explicit override (path or data-URI)
    // Density flag (#618). Pre-2016 roles are background depth, not headline
    // work: `compact: true` renders the entry with a smaller logo tile and
    // tighter vertical rhythm so LAYOUT, not prose, controls how much of the
    // skim they consume. Reversible — flip the flag, the copy is unchanged.
    compact: z.boolean().optional(),
  }),
});

// Education. One entry (George Mason). `website` drives the Logo.dev
// lookup (gmu.edu); `logo` overrides it.
const education = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/education' }),
  schema: z.object({
    degree: z.string(),
    school: z.string(),
    location: z.string(),
    year: z.number(),
    website: z.string().optional(),
    logo: z.string().optional(),
  }),
});

// Selected projects for the resume. Distinct from `projects` (see note
// above). Description lives in the markdown body; `order` sorts the list.
const resumeProjects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resume/projects' }),
  schema: z.object({
    name: z.string(),
    tech: z.array(z.string()),
    url: z.string().optional(),
    repo: z.string().optional(),
    order: z.number(),
  }),
});

// Core skills — one YAML file per category. `priority` sorts the
// categories; `skills` is rendered as an inline · / comma-joined list.
const skills = defineCollection({
  loader: glob({ pattern: '**/*.{yaml,yml}', base: './src/content/skills' }),
  schema: z.object({
    label: z.string(),
    priority: z.number(),
    skills: z.array(z.string()),
  }),
});

// Certifications. `issuer` + `website` drive the Logo.dev lookup; `logo`
// overrides it for defunct issuers with no live domain (Turner).
const certifications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/certifications' }),
  schema: z.object({
    name: z.string(),
    issuer: z.string(),
    year: z.number(),
    order: z.number().optional(),
    website: z.string().optional(),
    logo: z.string().optional(),
  }),
});

export const collections = {
  blog,
  projects,
  bio,
  myself,
  experience,
  education,
  resumeProjects,
  skills,
  certifications,
};
