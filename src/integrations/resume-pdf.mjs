/**
 * resume-pdf.mjs — build-time PDF export of the /resume/ route.
 *
 * Issue #616. A recruiter should not have to know that Cmd-P produces a clean
 * document; ATS pipelines and "attach your resume" forms want a file. The
 * print stylesheet already exists (`@media print` in src/styles/global.css,
 * US-Letter `@page`, sidebar/margin hidden, the 0.6in margin floor tuned for
 * Safari in #420) — this module is the missing half: it renders that exact
 * stylesheet to a real file.
 *
 * Generation is at BUILD TIME, over the already-built `dist/resume/index.html`,
 * so the file cannot drift from the page. A committed static PDF is the drift
 * bug class this repo has already fixed twice (#163 sitemap, #164 robots);
 * regenerating on every `astro build` removes the failure mode instead of
 * policing it with a CI check.
 *
 * It reuses the Playwright Chromium and the static file server that
 * `og-images.mjs` already stands up during `astro:build:done` — the marginal
 * cost of the PDF is one more page render. This module is invoked from that
 * integration rather than registered as its own Astro integration because
 * `astro.config.mjs` is on the repository's Do Not Touch list (.ai_context.md).
 *
 * The output is written to the dist root, so Firebase serves it at
 * https://nathanpayne.com/Nathan-Payne-Resume.pdf. It is not a page, so
 * `@astrojs/sitemap` (which enumerates routes) never lists it.
 */

/** Recruiter-legible filename — not `resume.pdf`. */
export const RESUME_PDF_FILENAME = 'Nathan-Payne-Resume.pdf';

/** Site-root path the download affordance links to. */
export const RESUME_PDF_PATH = `/${RESUME_PDF_FILENAME}`;

/**
 * Page margin, kept in sync with the `@page { margin }` value in the
 * `@media print` block of src/styles/global.css (#420 Contingency B floor).
 * Chromium's printToPDF takes its margins from these parameters rather than
 * from the CSS `@page` rule, so the value has to be restated here; the
 * constant is exported so a test can assert the two agree.
 */
export const RESUME_PDF_MARGIN = '0.6in';

/**
 * Render the built /resume/ route to a letter-size PDF.
 *
 * @param {object} options
 * @param {import('playwright').Browser} options.browser  already-launched Chromium
 * @param {string} options.baseUrl  origin of the static server serving dist/
 * @param {string} options.outputPath  absolute path of the .pdf to write
 * @param {{ info: (m: string) => void, warn: (m: string) => void }} options.logger
 */
export async function generateResumePdf({ browser, baseUrl, outputPath, logger }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/resume/`, { waitUntil: 'networkidle' });
    // Company logos are remote (Logo.dev) and hidden in print anyway; fonts
    // are what actually move the layout, so wait on those explicitly.
    await page.evaluate(() => document.fonts.ready);
    // Playwright renders screen media by default. Force print media so the
    // @media print cascade — the calibrated resume layout — is what lands in
    // the file.
    await page.emulateMedia({ media: 'print' });
    await page.pdf({
      path: outputPath,
      format: 'Letter',
      printBackground: false,
      margin: {
        top: RESUME_PDF_MARGIN,
        right: RESUME_PDF_MARGIN,
        bottom: RESUME_PDF_MARGIN,
        left: RESUME_PDF_MARGIN,
      },
    });
    logger.info(`  ${RESUME_PDF_FILENAME}`);
  } finally {
    await page.close();
    await context.close();
  }
}
