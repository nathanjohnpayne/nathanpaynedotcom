# Header typography audit (#455)

Pages × widths: 7 × 1440/1024/768/480/390. Flags: 53 (full detail in header-audit.json).

## Flags (grouped)

| page | role | flag | widths | example |
|---|---|---|---|---|
| blog-index | breadcrumbs | contrast | 1440 1024 768 480 390 | 2.49:1 (rgba(17, 16, 13, 0.38) on rgb(255, 255, 255)) |
| blog-post | breadcrumbs+h1+deck | left-drift | 1440 1024 768 480 390 | content-left spans 25.6px (breadcrumbs@322.57, h1@296.97, deck@322.57) |
| blog-post | breadcrumbs | contrast | 1440 1024 768 480 390 | 2.49:1 (rgba(17, 16, 13, 0.38) on rgb(255, 255, 255)) |
| blog-post | eyebrow | tiny-text | 1440 1024 | computed 10.37px |
| blog-post | eyebrow | contrast | 1440 1024 | 3.2:1 (rgba(17, 16, 13, 0.48) on rgb(235, 230, 220)) |
| projects-index | breadcrumbs | contrast | 1440 1024 768 480 390 | 2.49:1 (rgba(17, 16, 13, 0.38) on rgb(255, 255, 255)) |
| project-page | first-h2 | faux-italic | 1440 1024 768 480 390 | font-style italic on Cormorant Garamond 700 with no italic face loaded |
| resume | breadcrumbs | contrast | 1440 1024 768 480 390 | 2.49:1 (rgba(17, 16, 13, 0.38) on rgb(255, 255, 255)) |
| resume | deck | faux-italic | 1440 1024 768 480 390 | font-style italic on Cormorant Garamond 400 with no italic face loaded |
| resume | first-h2 | faux-italic | 1440 1024 768 480 390 | font-style italic on Cormorant Garamond 700 with no italic face loaded |
| resume | eyebrow | tiny-text | 1440 1024 | computed 10.37px |
| resume | eyebrow | contrast | 1440 1024 | 3.2:1 (rgba(17, 16, 13, 0.48) on rgb(235, 230, 220)) |
| 404 | breadcrumbs | contrast | 1440 1024 768 480 390 | 2.41:1 (rgba(17, 16, 13, 0.38) on rgb(235, 230, 220)) |

## h1 treatments at 1440px

| page | h1 | letter-spacing |
|---|---|---|
| home | 64px/0.95 w700 Cormorant Garamond | normal |
| blog-index | 86.4px/0.92 w600 Cormorant Garamond | normal |
| blog-post | 43.2px/1.08 w600 Cormorant Garamond | -0.5184px |
| projects-index | 86.4px/0.92 w600 Cormorant Garamond | normal |
| project-page | 72px/0.94 w700 Cormorant Garamond | normal |
| resume | 64px/0.98 w600 Cormorant Garamond | -0.64px |
| 404 | 72px/1.05 w600 Cormorant Garamond | normal |

## First body h2 at 1440px

| page | h2 | letter-spacing |
|---|---|---|
| home | 24px/1.05 w700 Cormorant Garamond | 0.48px |
| blog-index | 31.68px/1.05 w600 Cormorant Garamond | normal |
| blog-post | 24.96px/1.15 w600 Cormorant Garamond | normal |
| projects-index | 31.68px/1.05 w600 Cormorant Garamond | normal |
| project-page | 34.56px/1.08 w700 italic Cormorant Garamond | normal |
| resume | 31.68px/1.08 w700 italic Cormorant Garamond | normal |
