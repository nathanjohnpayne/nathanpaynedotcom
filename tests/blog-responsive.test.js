import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, relative, resolve, sep } from 'path';
import { findFilesRecursively } from '../scripts/lib/blog-file-inventory.mjs';
import { readBuiltStylesheet, writeSanitizedDOM } from './helpers/dom.js';
import { printBlocks } from './helpers/print-css.js';

// Astro content-hashes CSS into dist/_astro/*.css, so the shared helper
// discovers the filenames and reads every emitted chunk rather than the first
// one readdirSync returns (#932).
const css = readBuiltStylesheet();

// Authored stylesheet. Vite 8's minifier rewrites some declarations into
// equivalent shorter serializations (e.g. `@media (max-width: 480px)` →
// `@media (width<=480px)`), so assertions whose intent is "the author wrote
// this rule" read the source and are paired with a normalized dist check that
// proves the rule survived the build. See #640.
const sourceCss = readFileSync(resolve(__dirname, '../src/styles/global.css'), 'utf-8');

// Media Queries Level 4 range syntax back to the Level 3 form the source uses.
// A pure re-serialization: it does not widen what the matcher accepts.
function normalizeMediaRanges(cssText) {
  return cssText
    .replace(/\(\s*width\s*<=\s*([\d.]+px)\s*\)/g, '(max-width: $1)')
    .replace(/\(\s*width\s*>=\s*([\d.]+px)\s*\)/g, '(min-width: $1)');
}

const blogIndexHtml = readFileSync(resolve(__dirname, '../dist/blog/index.html'), 'utf-8');

const blogRoot = resolve(__dirname, '../dist/blog');
const blogPostPaths = findFilesRecursively(
  blogRoot,
  (filePath) => filePath.endsWith(`${sep}index.html`) && dirname(filePath) !== blogRoot,
).map((filePath) => ({
  slug: relative(blogRoot, dirname(filePath)).split(sep).join('/'),
  html: readFileSync(filePath, 'utf-8'),
}));

function setupDOM(html) {
  // Scripts are removed on a detached document and the doctype preserved by
  // the shared helper — see tests/helpers/dom.js for why both matter.
  writeSanitizedDOM(html);
}

describe('Blog Responsive Layout', () => {
  describe('viewport meta tag', () => {
    it('blog post pages have viewport meta tag with width=device-width and initial-scale=1', () => {
      for (const post of blogPostPaths) {
        setupDOM(post.html);
        const viewport = document.querySelector('meta[name="viewport"]');
        expect(viewport, `${post.slug}: missing viewport meta`).not.toBeNull();
        expect(viewport.getAttribute('content')).toContain('width=device-width');
        expect(viewport.getAttribute('content')).toMatch(/initial-scale\s*=\s*1(\.0)?/);
      }
    });

    it('blog index page has viewport meta tag with width=device-width and initial-scale=1', () => {
      setupDOM(blogIndexHtml);
      const viewport = document.querySelector('meta[name="viewport"]');
      expect(viewport).not.toBeNull();
      expect(viewport.getAttribute('content')).toContain('width=device-width');
      expect(viewport.getAttribute('content')).toMatch(/initial-scale\s*=\s*1(\.0)?/);
    });
  });

  describe('CSS responsive rules', () => {
    it('contains the 480px phone breakpoint', () => {
      // Authored form (#332: 480px matches the --bp-narrow token).
      expect(sourceCss).toMatch(/@media\s*\(\s*max-width:\s*480px\s*\)/);
      // …and it reached the bundle, whichever serialization the minifier chose.
      expect(normalizeMediaRanges(css)).toMatch(/@media\s*\(\s*max-width:\s*480px\s*\)/);
    });

    it('project-copy has min-width: 0 to prevent grid overflow', () => {
      expect(css).toMatch(/\.project-copy\s*\{[^}]*min-width:\s*0/);
    });

    it('blog prose uses overflow-wrap: break-word', () => {
      expect(css).toMatch(/\.blog-prose\s*>\s*p[\s\S]*?overflow-wrap:\s*break-word/);
    });

    it('project-detail has overflow-x: hidden as safety net', () => {
      expect(css).toMatch(/\.project-detail\s*\{[^}]*overflow-x:\s*hidden/);
    });

    it('blog code blocks have overflow-x: auto', () => {
      expect(css).toMatch(/\.blog-code-block\s*\{[^}]*overflow-x:\s*auto/);
    });

    it('blog code blocks have -webkit-overflow-scrolling: touch', () => {
      expect(css).toMatch(/\.blog-code-block\s*\{[^}]*-webkit-overflow-scrolling:\s*touch/);
    });

    it('blog figure images have width: 100% and height: auto', () => {
      expect(css).toMatch(/\.blog-figure\s+img\s*\{[^}]*width:\s*100%/);
      expect(css).toMatch(/\.blog-figure\s+img\s*\{[^}]*height:\s*auto/);
    });

    it('blog section headings carry a bottom margin', () => {
      // Paragraph spacing comes from `.blog-prose > p + p`, which does not fire
      // on the first paragraph after a heading. Without an explicit
      // margin-bottom on the heading itself, every section opener renders
      // flush against its h2.
      for (const tag of ['h2', 'h3']) {
        const block = css.match(new RegExp(`\\.blog-prose\\s*>\\s*${tag}\\s*\\{([^}]*)\\}`));
        expect(block, `.blog-prose > ${tag} rule missing`).not.toBeNull();
        // No trailing `;` on the last declaration of a minified block.
        const declared = block[1].match(/margin-bottom:\s*([^;}]+)/);
        expect(declared, `.blog-prose > ${tag} has no margin-bottom`).not.toBeNull();
        expect(
          parseFloat(declared[1]),
          `.blog-prose > ${tag} margin-bottom is zero`,
        ).toBeGreaterThan(0);
      }
    });
  });

  // Spec requirements 9–11 — the key-takeaways box (#621) and the
  // end-of-post block (#622) both live in the article column, so they
  // inherit its width and must not introduce a new overflow source.
  describe('article-column blocks (key takeaways, end-of-post)', () => {
    it('key takeaway list items break long words', () => {
      expect(css).toMatch(/\.blog-takeaways__list li\{[^}]*overflow-wrap:\s*break-word/);
    });

    it('the key-takeaways box renders in the article column, never the sidebar', () => {
      for (const post of blogPostPaths) {
        setupDOM(post.html);
        expect(
          document.querySelector('.blog-content .blog-takeaways'),
          `${post.slug}: takeaways box missing from the article column`,
        ).not.toBeNull();
        expect(
          document.querySelector('.blog-sidebar .blog-takeaways'),
          `${post.slug}: takeaways box must not render in the sidebar`,
        ).toBeNull();
      }
    });

    it('prev/next navigation collapses to one column via auto-fit, with no track-expanding cards', () => {
      expect(css).toMatch(
        /\.blog-postnav\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(16rem,\s*1fr\)\)/,
      );
      expect(css).toMatch(/\.blog-postnav__card\{[^}]*min-width:\s*0/);
    });

    it('the end-of-post block is hidden in print', () => {
      expect(css).toMatch(
        /@media print\{[\s\S]*?\.blog-postscript\{display:\s*none\s*!important\}/,
      );
    });

    it('pins the takeaway markers to print their fills, and leaves the panel out of it', () => {
      // The markers are CSS backgrounds, and Chrome's print dialog leaves
      // "Background graphics" off by default, so `background: #000 !important`
      // alone had never reached paper — four squares per post, absent from
      // every printed copy while the text and the indent survived (#953). The
      // defect is invisible to every other kind of check here: no build
      // artifact renders a blog post, so the assertion is against the emitted
      // stylesheet, which is where #950 put the same claim for the lifecycle
      // marks (tests/helpers/print-css.js explains why).
      //
      // The panel half is the decision, not a leftover. `print-color-adjust`
      // is inherited, so `.blog-takeaways` would reach the markers below it
      // and print an identical page — measured at the same four squares, the
      // same 506 differing pixels, the same coordinates. All it would add is
      // the panel's own `background: #fff`, which is the paper. What makes the
      // block read as a panel on paper is its border, and a border is not a
      // background, so it prints either way. The wider rule therefore buys no
      // ink and costs scope: `exact` on a content block inherits to every
      // future descendant, which is the "too wide" cost #950 had to rule out.
      const blocks = printBlocks(css).filter((b) => b.includes('blog-takeaways'));
      expect(blocks.length, 'no @media print block styles the takeaways').toBeGreaterThan(0);

      // Every block and every selector in a comma-joined list, not the first
      // match: a second blog print block sits behind a `.find()` and is never
      // reached, and a selector merged into an existing list is invisible to a
      // whole-block match. Same blind spot as #956.
      const pinned = blocks.flatMap((block) =>
        [...block.matchAll(/([^{}]+)\{[^{}]*print-color-adjust[^{}]*\}/g)]
          .flatMap((m) => m[1].split(','))
          .map((sel) => sel.trim())
          .filter((sel) => sel.includes('blog-takeaways')),
      );

      // Control: "the panel does not declare it" is worthless as a lone
      // assertion — an empty result satisfies it while meaning the scan
      // matched nothing. Requiring the marker rule to be found is what makes
      // the panel's absence evidence instead of silence.
      expect(
        pinned,
        'the takeaway markers are not pinned to print their fills; without ' +
          'print-color-adjust the background beside it never reaches paper (#953)',
      ).toHaveLength(1);

      // Single colon: the minifier emits the legacy `:before` form.
      expect(
        pinned[0],
        `${pinned[0]} is not the marker — the panel prints as a bordered block, ` +
          'not as a plane, so print-color-adjust belongs to the square whose fill ' +
          'is a background and to nothing that contains it',
      ).toMatch(/^\.blog-takeaways__list li::?before$/);
    });
  });

  describe('blog post image markup', () => {
    it('blog post images have intrinsic width and height attributes for CLS prevention', () => {
      // Inline width/height reserve space for the image during layout, which
      // prevents Cumulative Layout Shift as images load. They do NOT conflict
      // with responsive sizing — the `.blog-figure img { width: 100%; height:
      // auto }` rule (asserted above) overrides the inline values for display
      // while preserving the intrinsic aspect ratio. See the static dimension
      // map in src/plugins/rehype-figure-captions.mjs.
      for (const post of blogPostPaths) {
        setupDOM(post.html);
        const images = document.querySelectorAll('.blog-figure img');
        for (const img of images) {
          expect(
            img.hasAttribute('width'),
            `${post.slug}: image missing intrinsic width attribute`,
          ).toBe(true);
          expect(
            img.hasAttribute('height'),
            `${post.slug}: image missing intrinsic height attribute`,
          ).toBe(true);
        }
      }
    });

    it('all blog post images are inside figure elements', () => {
      for (const post of blogPostPaths) {
        setupDOM(post.html);
        const allImages = document.querySelectorAll('main img');
        for (const img of allImages) {
          expect(
            img.closest('.blog-figure'),
            `${post.slug}: image not in .blog-figure`,
          ).not.toBeNull();
        }
      }
    });
  });
});
