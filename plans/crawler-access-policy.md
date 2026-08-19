# Crawler Access Policy

## Decision

**All crawlers and bots are allowed full access to nathanpayne.com**, including
AI crawlers that collect content for model training as well as those that fetch
for retrieval and citation.

Decided 2026-08-19. Tracked in issue #615.

## Why this needed deciding

The permissive `public/robots.txt` in this repo was never the operative policy.
Cloudflare, which fronts Firebase Hosting for this domain, **used to inject** a
managed block into the served file. As of 2026-08-06 that block declared:

```robotstxt
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /
```

plus `Disallow: /` for `Amazonbot`, `Applebot-Extended`, `Bytespider`, `CCBot`,
`ClaudeBot`, `CloudflareBrowserRenderingCrawler`, `Google-Extended`, `GPTBot`,
and `meta-externalagent`.

Nobody chose that. It was a Cloudflare default, and it was invisible from the
repository—anyone reading `public/robots.txt` would conclude the site was fully
open. The point of this document is that the policy is now chosen rather than
inherited, whichever way it points.

**Current state (2026-08-19): the managed block is disabled.** Cloudflare's
"Manage your robots.txt" control is set to *Disable robots.txt configuration*
(`is_robots_txt_managed: false`, `cf_robots_variant: "off"` on zone
`2ea6932e7a6e86434297873a191bb123`). The served file is now the build output of
this repo's `public/robots.txt`—no `# BEGIN Cloudflare Managed content` block, no
`Content-Signal` line, no per-crawler `Disallow` rules. The build changes exactly
one thing: the `robots-sitemap` integration
(`src/integrations/robots-sitemap.mjs`) rewrites the `Sitemap:` line to match the
filename `@astrojs/sitemap` actually emits, and inserts a blank line above it
(#164). Everything else, comments included, is served verbatim. The block quoted
above is historical, retained to explain what was changed and why.

## Options weighed

| Option | Outcome |
|---|---|
| Keep the block | Content stays out of AI training sets and out of AI answers alike. |
| Allow retrieval, refuse training | Directionally attractive, but the crawler tokens do not cleanly separate the two behaviours—`ClaudeBot` and `GPTBot` each cover both, so the split is partly aspirational. |
| **Allow everything (chosen)** | Maximum reach. No reservation of rights asserted. |
| Split by path | Extra surface to maintain for a site that is almost entirely public writing anyway. |

## Rationale

The blog is positioned as *The AI-Augmented PM*, and its audience researches
through AI assistants. The six posts are the strongest hiring signal the site
carries. Blocking the crawlers behind those assistants made the best content
un-citable by exactly the tools the intended readers use—a recruiter asking an
assistant about multi-agent code review enforcement could not be pointed here.

The site exists to be found. Reach beats reservation of rights for this
particular body of work.

## What was given up

`ai-train=no` was the site's **intended machine-readable reservation** under
Article 4 of EU Directive 2019/790. Treat that as the signal we were publishing,
not as a settled legal conclusion: Content Signals are voluntary, `robots.txt` is
not access control, and only compliant crawlers honor either. Whether the signal
constituted an effective reservation of rights is a question for legal review,
not for this document.

Dropping the signal forgoes whatever reservation it carried. The asymmetry that
matters operationally: restoring it would guide **future** crawls by compliant
crawlers, but cannot affect content already collected. That was understood when
the decision was made.

Obtain legal review before relying on any part of this document as a compliance
conclusion.

## Operational notes

- Any Cloudflare-managed `Disallow` rules live in the **Cloudflare dashboard**,
  not in this repo; editing `public/robots.txt` cannot remove them. The control
  is Security → Settings → Bot traffic → "Manage your robots.txt", which maps to
  `is_robots_txt_managed` / `cf_robots_variant` on
  `PUT /zones/{zone_id}/bot_management`. Note that
  `GET /zones/{zone_id}/ai-audit/robots` keeps reporting the old rules after the
  change and must not be used to verify.
- The repo file's `User-agent: *` / `Allow: /` rules and the build-managed
  `Sitemap:` line survive Cloudflare's prepend, so `specs/seo-metadata.md`
  plumbing invariants are unaffected either way.
- While the managed block was active the served file contained two
  `User-agent: *` groups (Cloudflare's, then this repo's). Per RFC 9309 a crawler
  merges same-token groups, so that was cosmetic. With the block disabled only
  this repo's group is served.
- Verify the live policy at the **public served endpoint**, never from the repo
  (the response comes from Cloudflare, not from the origin):
  `curl -fsS https://nathanpayne.com/robots.txt`
- Cloudflare caches robots.txt for 4 hours (`cache-control: max-age=14400`);
  re-check after that window before concluding a change did not take.

## Revisit when

- The site starts carrying content that should not be trained on.
- Crawler tokens gain a reliable train/retrieve split, making the middle option
  enforceable rather than aspirational.
