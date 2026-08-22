import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    description: z.string(),
    seoDescription: z.string().optional(),
    kicker: z.string(),
    order: z.number(),
    screenshotAspect: z.enum(['wide', 'narrow']),
    screenshotSrc: z.string(),
    accent: z.enum(['red', 'yellow', 'black', 'blue', 'lightblue', 'paper']),
    // Optional: in-progress projects (status "IN PROGRESS") may not have
    // a deployed app yet. When omitted, the "View Live Product" CTA is
    // suppressed on the detail page, the project card, and the homepage
    // Builds section. When present, must be a non-empty string.
    liveUrl: z.string().trim().min(1).optional(),
    githubUrl: z.string(),
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
        z.object({
          type: z.enum(['mermaid', 'image', 'text']),
          content: z.string(),
          caption: z.string().optional(),
        }),
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
