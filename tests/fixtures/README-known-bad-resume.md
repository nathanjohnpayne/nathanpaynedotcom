# `known-bad-resume-pre-923.pdf`

The résumé PDF exactly as it was published before #923 and #925 were fixed —
downloaded from `https://nathanpayne.com/Nathan-Payne-Resume.pdf` on
2026-09-02, before this branch shipped.

It is committed because the PDF tests are only worth having if they can be
shown to **fail** on a file that has the defects. Asserting against a good file
proves the assertions run; asserting against this one proves they discriminate.
`tests/resume.test.js` runs the reading-order and marker checks against both,
and requires this file to fail each.

Two defects are baked into it, and it must keep both:

- **#923** — the four Disney Streaming 2018–2021 bullets are written into the
  content stream after the Five Across project, two sections below the role
  they belong to. Visible with `pdftotext -raw`; invisible to any extraction
  that reconstructs order from glyph coordinates.
- **#925** — every bullet marker rectangle is painted white (`1 1 1 rg`)
  because the generator ran with `printBackground: false`, so no marker shows
  on the page at all.

Do not regenerate it, and do not "fix" it. Its value is that it is the actual
broken artifact.
