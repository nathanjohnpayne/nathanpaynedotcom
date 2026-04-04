# Repository Overview

### Project Summary
Static personal portfolio, project, and blog site for [nathanpayne.com](https://nathanpayne.com). Vanilla HTML + CSS + JavaScript — no frameworks, no runtime dependencies, no bundler. Deployed to Firebase Hosting.

### Architecture
Homepage plus dedicated static project pages and generated static blog pages:

| File | Role |
|------|------|
| `index.html` | Homepage markup. Contains homepage SEO meta, Open Graph tags, homepage JSON-LD, inline GA4 snippet, and font preconnects. |
| `projects/<slug>/index.html` | Dedicated project detail pages with project-specific meta, canonicals, and JSON-LD. |
| `content/blog/*.md` | Markdown source posts with frontmatter. |
| `blog/index.html` | Generated blog landing page. |
| `blog/<slug>/index.html` | Generated static blog post pages. |
| `style.css` | Shared styles for the Mondrian homepage and the project detail pages. |
| `script.js` | Homepage panel open/close logic, keyboard navigation, hover intent, scroll guard, analytics event tracking. Wrapped in an IIFE. |
| `scripts/generate-blog.js` | Generates static blog routes from `content/blog/*.md`. |
| `robots.txt` | Crawl directives for search engines. |
| `sitemap.xml` | Canonical URL inventory for search engines. |

There is no `src/` directory, no transpilation, and no bundler. Files are served as-is by Firebase Hosting.

### File Inventory
```
index.html              Markup + meta
blog/                   Generated static blog pages
content/blog/           Markdown source posts for the blog
style.css               Styles (homepage, project pages, motion system, responsive, a11y)
script.js               Homepage interactions (panels, keyboard, scroll guard, analytics)
scripts/generate-blog.js Blog page generator
package.json            Vitest metadata
tests/                  Smoke tests for routes, metadata, layout, and interactions
robots.txt              Crawl directives
sitemap.xml             Search-engine URL inventory
projects/               Dedicated static project detail pages
favicon.svg             SVG favicon (red with "NP")
favicon-32x32.png       Rasterized favicon (32px)
apple-touch-icon.png    Apple touch icon (180px)
og-image.png            Primary OG image (2400×1260)
og/                     Platform-specific OG images
firebase.json           Hosting config
.firebaserc             Firebase project alias
inspiration.jpg         Design reference (not deployed)
AGENTS.md               This file
README.md               Human-facing project documentation
DEPLOYMENT.md           Deploy instructions
CONTRIBUTING.md         Contribution guidelines
.ai_context.md          Supplemental AI agent context
rules/                  Repository-level binding constraints
plans/                  Feature rollout and migration plans
specs/                  Feature specifications and acceptance criteria
scripts/ci/             CI enforcement scripts
```

---
