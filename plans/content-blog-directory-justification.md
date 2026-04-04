# Content And Blog Directory Justification

## Why `content/` and `blog/` exist

This repository now includes:

- `content/blog/` as the source location for long-form NathanPayne.com posts written in Markdown with frontmatter
- `blog/` as the generated, deployable static route tree that Firebase Hosting serves directly

These directories are intentionally separate from the existing root-level homepage files and the `projects/` case-study pages so editorial content can be authored in Markdown and still ship as plain static HTML without introducing a runtime renderer.

## Scope

- `content/blog/*.md` stores post source files and publication metadata.
- `blog/index.html` and `blog/<slug>/index.html` are generated static outputs checked into the repo.
- Adding `content/` and `blog/` does not introduce a framework or runtime dependency.
- Future publication wiring should continue to respect the repository's static-site constraints unless a human explicitly approves a broader architecture change.
