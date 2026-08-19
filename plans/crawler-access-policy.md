# Crawler Access Policy

## Decision

**All crawlers and bots are allowed full access to nathanpayne.com**, including
AI crawlers that collect content for model training as well as those that fetch
for retrieval and citation.

Decided 2026-08-19. Tracked in issue #615.

## Why this needed deciding

The permissive `public/robots.txt` in this repo was never the operative policy.
Cloudflare, which fronts Firebase Hosting for this domain, injects a managed
block into the served file. As of 2026-08-06 that block declared:

```
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

`ai-train=no` was an express reservation of rights under Article 4 of EU
Directive 2019/790. Dropping it forgoes that reservation. This is reversible for
retrieval—flip the setting and future crawls respect it—but not for training:
content already ingested does not un-ingest. That asymmetry was understood when
the decision was made.

## Operational notes

- The `Disallow` rules live in the **Cloudflare dashboard**, not in this repo.
  Editing `public/robots.txt` cannot remove them.
- The repo file's `User-agent: *` / `Allow: /` rules and the build-managed
  `Sitemap:` line survive Cloudflare's prepend, so `specs/seo-metadata.md`
  plumbing invariants are unaffected either way.
- The served file will contain two `User-agent: *` groups (Cloudflare's, then
  this repo's). Per RFC 9309 a crawler merges same-token groups, so this is
  cosmetic.
- Verify the live policy at the origin, never from the repo:
  `curl -s https://nathanpayne.com/robots.txt`
- Cloudflare caches robots.txt for 4 hours (`cache-control: max-age=14400`);
  re-check after that window before concluding a change did not take.

## Revisit when

- The site starts carrying content that should not be trained on.
- Crawler tokens gain a reliable train/retrieve split, making the middle option
  enforceable rather than aspirational.
