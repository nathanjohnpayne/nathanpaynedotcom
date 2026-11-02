/**
 * The AI-use disclosure, rendered (#1493, epic #1490).
 *
 * Every blog post and case study that carries `aiUse` shows a short "AI use"
 * link near its top, and ends with a "How this was written" block holding its
 * own statement and a link to /how-i-write/. The layouts render both; no entry
 * can omit or move them. This suite reads the built site, so it describes what
 * a reader gets.
 *
 * It is vacuous against the built site until entries carry `aiUse` (#1495 and
 * #1496 backfill them; #1498 makes the field required and extends the loops
 * below to every non-draft entry). The source-contract block at the end is what
 * keeps the test meaningful in the meantime: it fails if either layout drops the
 * block or the link, whether or not any entry exercises it.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { splitEntry } from '../src/lib/ai-use-stamp.mjs';
import { blogSlugFromPath, findBlogMarkdownFiles } from '../scripts/lib/blog-file-inventory.mjs';
import { HOW_I_WRITE_PATH } from '../src/lib/how-i-write.ts';
import { AI_USE_ID, AI_USE_HEADING, AI_USE_LINK_LABEL } from '../src/lib/ai-use.ts';
import { readBuiltPage, readBuiltStylesheet, writeSanitizedDOM } from './helpers/dom.js';

const root = resolve(__dirname, '..');
const blogDir = resolve(root, 'src/content/blog');
const projectsDir = resolve(root, 'src/content/projects');

function entries(kind) {
  const files =
    kind === 'blog'
      ? findBlogMarkdownFiles(blogDir).map((file) => ({
          file,
          slug: blogSlugFromPath(file, blogDir),
        }))
      : readdirSync(projectsDir)
          .filter((name) => /\.mdx?$/.test(name))
          .map((name) => ({ file: resolve(projectsDir, name), slug: null }));
  return files
    .map(({ file, slug }) => {
      const { frontmatter } = splitEntry(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
      return {
        kind,
        slug: slug ?? frontmatter.slug,
        draft: frontmatter.draft === 'true',
        statement: frontmatter.aiUse?.statement,
        hasAiUse: Boolean(frontmatter.aiUse),
      };
    })
    .filter((entry) => !entry.draft)
    .map((entry) => ({
      ...entry,
      path:
        entry.kind === 'blog'
          ? `blog/${entry.slug}/index.html`
          : `projects/${entry.slug}/index.html`,
    }));
}

const published = [...entries('blog'), ...entries('projects')];
const withAiUse = published.filter((entry) => entry.hasAiUse);
const withoutAiUse = published.filter((entry) => !entry.hasAiUse);

const squash = (text) => text.replace(/\s+/g, ' ').trim();
const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Entries with aiUse render the link and the end block (#1493)', () => {
  // Vitest rejects an empty suite. Until #1495 and #1496 land an `aiUse` block
  // on real entries this is the only test here, and it asserts nothing about
  // rendering; the source-contract suite below carries the weight.
  it('reads the entries it will check', () => {
    expect(published.length).toBeGreaterThan(0);
  });

  for (const entry of withAiUse) {
    it(`${entry.kind}/${entry.slug}: the "AI use" link, on every surface`, () => {
      writeSanitizedDOM(readBuiltPage(entry.path));
      const surfaces =
        entry.kind === 'blog'
          ? ['.blog-sidebar-meta', '.blog-header-kicker']
          : ['.project-actions'];
      for (const surface of surfaces) {
        const links = document.querySelectorAll(`${surface} a.ai-use-link[href="#${AI_USE_ID}"]`);
        expect(links.length, `${entry.slug}: no AI-use link in ${surface}`).toBe(1);
        expect(squash(links[0].textContent), `${entry.slug}: link name`).toBe(AI_USE_LINK_LABEL);
        const icon = links[0].querySelector('svg');
        expect(icon?.getAttribute('aria-hidden'), `${entry.slug}: icon must be decorative`).toBe(
          'true',
        );
      }
      expect(document.querySelectorAll('a.ai-use-link').length).toBe(surfaces.length);
    });

    it(`${entry.kind}/${entry.slug}: section#ai-use holds the statement, before the closing blocks`, () => {
      writeSanitizedDOM(readBuiltPage(entry.path));
      const blocks = document.querySelectorAll(`section#${AI_USE_ID}`);
      expect(blocks.length, `${entry.slug}: expected one section#${AI_USE_ID}`).toBe(1);
      const block = blocks[0];
      expect(document.querySelectorAll(`#${AI_USE_ID}`).length, 'the id must be unique').toBe(1);

      const heading = block.querySelector('h2');
      expect(squash(heading.textContent)).toBe(AI_USE_HEADING);
      expect(block.getAttribute('aria-labelledby')).toBe(heading.id);
      expect(heading.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');

      const statement = block.querySelector('.ai-use__statement');
      expect(squash(statement.textContent).startsWith(squash(entry.statement))).toBe(true);
      const more = statement.querySelector('a.ai-use__more');
      expect(more?.getAttribute('href')).toBe(HOW_I_WRITE_PATH);
      expect(squash(more.textContent)).toBe('More about how I write');

      // The heading is layout chrome, so it never enters the table of contents.
      expect(document.querySelector('.blog-sidebar')?.textContent ?? '').not.toContain(
        AI_USE_HEADING,
      );

      if (entry.kind === 'blog') {
        expect(block.closest('.blog-content'), 'inside the article column').not.toBeNull();
        expect(block.closest('.blog-postscript'), 'outside .blog-postscript').toBeNull();
        expect(follows(document.querySelector('.blog-prose'), block), 'after the prose').toBe(true);
        const postscript = document.querySelector('.blog-postscript');
        expect(postscript, 'blog-postscript exists').not.toBeNull();
        expect(follows(block, postscript), 'before .blog-postscript').toBe(true);
      } else {
        expect(follows(document.querySelector('.project-copy'), block), 'after the prose').toBe(
          true,
        );
        const related = document.querySelector('.project-related');
        if (related) expect(follows(block, related), 'before .project-related').toBe(true);
        expect(follows(block, document.querySelector('.site-footer')), 'before the footer').toBe(
          true,
        );
      }
    });
  }
});

describe('Entries without aiUse render no link and no block (rollout)', () => {
  // Once every entry carries aiUse the loop below is empty, and Vitest fails
  // an empty suite; this case then records that the rollout is complete.
  // #1498 makes the field required and removes this suite.
  if (withoutAiUse.length === 0) {
    it('no entry is left without aiUse', () => {
      expect(withoutAiUse).toEqual([]);
    });
  }
  for (const entry of withoutAiUse) {
    it(`${entry.kind}/${entry.slug}`, () => {
      writeSanitizedDOM(readBuiltPage(entry.path));
      expect(document.querySelector('a.ai-use-link')).toBeNull();
      expect(document.querySelector(`#${AI_USE_ID}`)).toBeNull();
      expect(document.querySelector('.ai-use')).toBeNull();
      expect(document.querySelector('.blog-sidebar-ai')).toBeNull();
      expect(document.querySelector('.blog-header-ai')).toBeNull();
    });
  }
});

describe('Layout source contract (keeps the suite meaningful before any entry carries aiUse)', () => {
  const read = (path) => readFileSync(resolve(root, path), 'utf8');

  it('BlogPost renders the end block after the prose and before .blog-postscript, and both links', () => {
    const source = read('src/layouts/BlogPost.astro');
    const proseEnd = source.indexOf('</article>');
    const note = source.indexOf('<AiUseNote');
    const postscript = source.indexOf('<div class="blog-postscript">');
    expect(note, 'BlogPost must render <AiUseNote>').toBeGreaterThan(-1);
    expect(proseEnd).toBeGreaterThan(-1);
    expect(note).toBeGreaterThan(proseEnd);
    expect(note).toBeLessThan(postscript);
    expect(source).toMatch(/\{aiUse && <AiUseNote[^\n]*variant="blog"/);
    expect(source.match(/<AiUseLink/g)?.length, 'panel link + phone-header link').toBe(2);
    expect(source).toContain('class="blog-sidebar-ai"');
    expect(source).toContain('class="blog-header-ai"');
  });

  it('ProjectLayout renders the end block before .project-related and tells the hero', () => {
    const source = read('src/layouts/ProjectLayout.astro');
    const note = source.indexOf('<AiUseNote');
    expect(note, 'ProjectLayout must render <AiUseNote>').toBeGreaterThan(-1);
    expect(note).toBeGreaterThan(source.indexOf('<div class="project-copy">'));
    expect(note).toBeLessThan(source.indexOf('<section class="project-related"'));
    expect(source).toMatch(/\{aiUse && <AiUseNote[^\n]*variant="project"/);
    expect(source).toContain('aiUse={Boolean(aiUse)}');
  });

  it('ProjectHero closes the action row with the link', () => {
    const source = read('src/components/ProjectHero.astro');
    const link = source.indexOf('{aiUse && <AiUseLink />}');
    expect(link).toBeGreaterThan(source.indexOf('data-cta="github"'));
    expect(link).toBeLessThan(source.indexOf('</div>', link));
  });

  it("both pages pass the entry's aiUse to the layout", () => {
    expect(read('src/pages/blog/[...slug].astro')).toContain('aiUse={post.data.aiUse}');
    expect(read('src/pages/projects/[slug].astro')).toContain('aiUse={data.aiUse}');
  });

  it('the shipped stylesheet prints the block and drops the link', () => {
    const css = readBuiltStylesheet();
    const printBlocks = [...css.matchAll(/@media print\{([\s\S]*?\})\}/g)]
      .map((m) => m[1])
      .join('\n');
    expect(printBlocks).toMatch(/\.ai-use-link\{display:none!important\}/);
    expect(printBlocks).toMatch(/\.ai-use\{[^}]*break-inside:avoid/);
    expect(css).not.toMatch(/\.ai-use-link[^{]*\{[^}]*#[0-9a-f]{3,6}/i);
  });
});
