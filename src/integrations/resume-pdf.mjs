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
 *
 * Because the render happens over that local static server, the document base
 * URL is `http://127.0.0.1:<ephemeral port>` — and Chromium resolves every
 * link annotation it writes into the PDF against that base. Root-relative
 * hrefs (`/blog/`, `/projects/<slug>/`) therefore shipped as localhost links
 * that resolve to nothing on a reader's machine, with the port varying per
 * build (#683). `absolutizeLinks` below rewrites them to the production
 * origin before the file is written.
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
 * Rewrite same-origin links in the loaded page to absolute production URLs.
 *
 * The PDF is rendered off a localhost static server, so anything root-relative
 * would otherwise be frozen into the file as `http://127.0.0.1:<port>/...`
 * (#683). Only links that resolve to the *serving* origin are touched:
 *
 * - external URLs (github.com, the project live sites) already carry their own
 *   origin and are left alone;
 * - `mailto:` resolves to a null origin, so it never matches;
 * - pure in-page anchors (`#summary`) are skipped explicitly, so they stay
 *   intra-document jumps rather than becoming web links out of the PDF.
 *
 * Runs in the browser context, so it must be self-contained — no imports or
 * outer-scope references survive serialization into `page.evaluate`.
 *
 * @param {import('playwright').Page} page
 * @param {string} siteUrl  production origin, e.g. https://nathanpayne.com
 * @returns {Promise<number>} how many hrefs were rewritten
 */
export function absolutizeLinks(page, siteUrl) {
  // Resolved here rather than in the page: Astro's `site` may be a URL object,
  // which does not survive structured-clone into the browser context. Passing
  // a plain origin string keeps the evaluate argument serializable either way.
  const origin = new URL(String(siteUrl)).origin;
  return page.evaluate((productionOrigin) => {
    let rewritten = 0;
    for (const anchor of document.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href');
      // In-page anchors stay internal to the document.
      if (!href || href.startsWith('#')) continue;
      let resolved;
      try {
        resolved = new URL(href, document.baseURI);
      } catch {
        // Unparseable href — leave it exactly as authored.
        continue;
      }
      // Only the localhost render origin gets swapped; mailto: and external
      // links resolve elsewhere and fall through untouched.
      if (resolved.origin !== window.location.origin) continue;
      anchor.setAttribute(
        'href',
        productionOrigin + resolved.pathname + resolved.search + resolved.hash,
      );
      rewritten += 1;
    }
    return rewritten;
  }, origin);
}

/**
 * Render the built /resume/ route to a letter-size PDF.
 *
 * @param {object} options
 * @param {import('playwright').Browser} options.browser  already-launched Chromium
 * @param {string} options.baseUrl  origin of the static server serving dist/
 * @param {string} options.siteUrl  production origin from `site` in astro.config.mjs
 * @param {string} options.outputPath  absolute path of the .pdf to write
 * @param {{ info: (m: string) => void, warn: (m: string) => void }} options.logger
 */
export async function generateResumePdf({ browser, baseUrl, siteUrl, outputPath, logger }) {
  // Required, not optional-with-a-fallback: without it every root-relative
  // link in the file silently reverts to a localhost URL (#683). Failing the
  // build is better than shipping a PDF whose links go nowhere.
  if (!siteUrl) {
    throw new Error(
      'generateResumePdf: siteUrl is required — pass the `site` value from astro.config.mjs. ' +
        'Without it the PDF\'s links would be frozen at the localhost render origin (#683).',
    );
  }
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
    // Must happen after load and before the write: Chromium bakes the link
    // annotations at printToPDF time, resolved against the document base.
    const rewritten = await absolutizeLinks(page, siteUrl);
    logger.info(`  rewrote ${rewritten} relative link(s) to ${siteUrl}`);
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
