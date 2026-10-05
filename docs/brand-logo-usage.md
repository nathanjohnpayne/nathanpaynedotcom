# NathanPayne.com logo system

The logo system lives in `public/images/brand/` and is served at `https://nathanpayne.com/images/brand/<file>`. It is built from the homepage's own composition: the cream field, the 9px ink grid line, and the 1930-register planes (`--red #da2418`, `--yellow #f0c800`, `--blue #0a5c9e`, `--ink #11100d`, `--cream #f5f0e4`). The name is set in Cormorant Garamond 600 and the domain in Inter 500 small capitals, matching the site's heading and eyebrow styles. Every SVG master has its type outlined to paths, so nothing depends on an installed font.

This document is the usage guide. It does not change what the site itself references: `public/favicon.svg`, `public/favicon-32x32.png`, `public/apple-touch-icon.png`, the `/og/**` cards, and `BaseLayout.astro`'s meta tags are untouched by the brand folder. Switching the site over is a separate, explicitly approved change.

## The mark

`np-mark.svg` is the primary square mark: the NP monogram in the cream field with the red plane at right and the yellow, charcoal, and blue planes along the bottom. It is full-bleed, like the homepage and the OG card, and it is designed to survive a circular crop: the monogram sits inside the inner circle with margin, and the planes read as the edge of the circle.

Three variants exist for specific jobs:

| File | Use |
|------|-----|
| `np-mark-tile.svg` | Below 24px (the 16px favicon). The monogram is dropped; the composition alone carries recognition. Never show this at a size where the monogram would be legible. |
| `np-mark-keyline.svg` | Only on cream or near-cream surfaces where the field would otherwise vanish. A 2-unit ink keyline frames the tile. Do not use it for avatars; the circle crop cuts the frame. |
| `np-mark-mono.svg` | One-color reproduction (print, engraving, grayscale UI). The planes become tints of the ink. |

## Lockups

| File | Use |
|------|-----|
| `np-lockup-horizontal.svg` | Primary lockup on white or light backgrounds: mark, "Nathan Payne", and `NATHANPAYNE.COM` beneath. Minimum width 180px, below which the eyebrow becomes unreadable; use the mark alone instead. |
| `np-lockup-horizontal-dark.svg` | Same lockup with cream type for dark backgrounds. The mark does not change. |
| `np-lockup-horizontal-mono.svg` | One-color horizontal lockup. |
| `np-lockup-stacked.svg`, `-dark.svg`, `-mono.svg` | Stacked lockup for square and portrait placements (social posts, slide title cards, print). |
| `np-wordmark.svg`, `np-wordmark-dark.svg` | Name and domain without the mark, for places where the mark already appears nearby. |
| `np-google-workspace-lockup.svg` | Mark and name only, name centered on the mark, for small badges where the eyebrow would be tiny. |

Clear space around any lockup is the width of the red plane (one quarter of the mark's height). Do not recolor the planes, add gradients or shadows, rotate the mark, or set the name in another typeface.

## Which file goes where

| Surface | File | Notes |
|---------|------|-------|
| Google Workspace organization logo (Admin console, Account settings, Personalization) | `np-google-workspace-logo-320x132.png` | Exactly 320×132 as Google's help page specifies. White background and under 5 KB, well inside the 30 KB limit third-party guides report. The Admin console offers both "Upload from device" and "By URL"; either works with this file. |
| Google Account profile picture | `np-google-profile-720.png` | 720×720 square, 12 KB. Google crops it to a circle; the monogram clears the circle with margin. Upload from device (the profile picture flow has no URL option). `np-google-profile-1024.png` is the same mark at 1024 if a larger source is wanted. |
| Browser favicon, `.ico` | `np-favicon.ico` | Contains 16 (tile), 32, and 48 (monogram). |
| Browser favicon, SVG | `np-mark.svg` | Browsers that take SVG favicons render the monogram at every size; pair with the ICO for the 16px case. |
| Apple touch icon | `np-apple-touch-icon-180.png` | iOS rounds the corners itself; the file is square. |
| PWA / Android icons | `np-mark-192.png`, `np-mark-512.png` | |
| Account avatars (GitHub, LinkedIn, X, Bluesky, Slack, Threads) | `np-google-profile-720.png` or `np-mark-1024.png` | Square source; every platform crops to its own shape. |
| Email signature, documents, slides | `np-lockup-horizontal-transparent-800.png` or `-1600.png` | Transparent PNG; `-light-` and `-dark-` versions have the background baked in. |
| Social post card | `np-social-1200x630.png` | Logo-only landscape card. This is not the site's Open Graph image; the built `/og/**` cards keep that role. |
| Square social image | `np-social-square-1080.png` | Stacked lockup on white. |

## Regenerating

The SVG masters were generated from the site's fonts with `opentype.js` (not a repo dependency) and rasterized with `sharp` (already a dependency). The generator is in `scripts/brand/`; see the header of `scripts/brand/build-logo-assets.mjs` for the one-off setup.
