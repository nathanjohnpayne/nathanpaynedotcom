/**
 * Launch flags for the build's Chromium.
 *
 * `--font-render-hinting=none` removes most of the difference in how the
 * résumé PDF wrapped on the Linux CI runner and on a Mac (#1250). Headless Chromium
 * on Linux applies FreeType hinting to every face, and hinting rounds each
 * glyph advance to a whole pixel, so a line's width, and where it breaks,
 * depends on the font size and the hinting mode rather than on the font's own
 * metrics. macOS never hints. With hinting off, both platforms lay text out
 * from the unhinted advances in the font file, which the bundled fonts under
 * public/fonts/site/ make identical. The flag is a no-op on macOS.
 *
 * Measured on one dist/ rendered on both platforms, as lines of `pdftotext
 * -layout` output that differ: 38 with Google's fonts and no flag, 8 with the
 * flag, 4 with the flag and the bundled static fonts. The 4 are one paragraph
 * line that sits within 0.2px of the margin (the text measures 701.17px on
 * macOS and 700.95px on Linux), so its last word breaks differently. That is
 * font-size rounding (Blink floors to 0.01px, Linux FreeType to 1/64px), which
 * no flag removes. See docs/agents/code-modification-rules.md § Typography.
 */
export const BUILD_CHROMIUM_ARGS = ['--font-render-hinting=none'];
