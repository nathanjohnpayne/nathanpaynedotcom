import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { blogSlugFromPath, findBlogMarkdownFiles } from '../scripts/lib/blog-file-inventory.mjs';
import {
  assertFullHistory,
  computeLastUpdated,
  effectiveModified,
  formatUpdatedMonth,
  getBlogLastUpdated,
  lastUpdatedFor,
  markdownBody,
  parseIgnoreRevs,
  showsUpdatedMonth,
} from '../scripts/lib/blog-last-updated.mjs';
import { readSitemapFrontmatter } from '../scripts/lib/sitemap-frontmatter.mjs';

// ── Fixture repositories ─────────────────────────────────────────────
//
// Every rule is tested against a throwaway repository with fixed commit
// dates, never against this repository's live history, which changes each
// time a post is edited. The fixture git runs with no user or system config
// so a contributor's settings (signing, hooks, identity) cannot leak in.

const fixtures = [];

function post(frontmatter, body) {
  return `---\n${frontmatter}\n---\n${body}`;
}

function makeRepo() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'last-updated-')));
  fixtures.push(dir);
  const env = {
    ...process.env,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Fixture',
    GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
    GIT_COMMITTER_NAME: 'Fixture',
    GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
  };
  const git = (args, extraEnv = {}) =>
    execFileSync('git', ['-C', dir, ...args], {
      env: { ...env, ...extraEnv },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  git(['init', '-q', '-b', 'main']);

  return {
    dir,
    git,
    path: (rel) => join(dir, rel),
    write(rel, text) {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), text);
    },
    move(from, to) {
      mkdirSync(dirname(join(dir, to)), { recursive: true });
      renameSync(join(dir, from), join(dir, to));
    },
    /** Commit everything at a fixed author and committer time; returns the SHA. */
    commit(message, when) {
      git(['add', '-A']);
      git(['commit', '-q', '--no-gpg-sign', '--no-verify', '-m', message], {
        GIT_AUTHOR_DATE: when,
        GIT_COMMITTER_DATE: when,
      });
      return git(['rev-parse', 'HEAD']).trim();
    },
  };
}

afterEach(() => {
  while (fixtures.length) rmSync(fixtures.pop(), { recursive: true, force: true });
});

const BLOG = 'src/content/blog';
const FM = 'title: Post\ndate: 2026-01-10';

describe('last-updated: which commits count', () => {
  it('counts the newest body change, never the adding commit or a frontmatter-only edit', () => {
    const repo = makeRepo();
    repo.write(`${BLOG}/post.md`, post(FM, 'First draft.\n'));
    repo.commit('add', '2026-01-10T09:00:00Z');

    // Adding commit alone: no update yet.
    expect(computeLastUpdated({ repoRoot: repo.dir }).size).toBe(0);

    repo.write(`${BLOG}/post.md`, post(`${FM}\ntags: [a]`, 'First draft.\n'));
    repo.commit('frontmatter only', '2026-02-01T09:00:00Z');
    expect(computeLastUpdated({ repoRoot: repo.dir }).size).toBe(0);

    repo.write(`${BLOG}/post.md`, post(`${FM}\ntags: [a]`, 'Revised argument.\n'));
    repo.commit('body', '2026-03-05T12:00:00Z');

    repo.write(`${BLOG}/post.md`, post(`${FM}\ntags: [a, b]`, 'Revised argument.\n'));
    repo.commit('frontmatter again', '2026-04-01T09:00:00Z');

    const map = computeLastUpdated({ repoRoot: repo.dir });
    expect(lastUpdatedFor(map, repo.path(`${BLOG}/post.md`))?.toISOString()).toBe(
      '2026-03-05T12:00:00.000Z',
    );
  });

  it('follows a renamed post back through its history', () => {
    const repo = makeRepo();
    repo.write(`${BLOG}/old-name.md`, post(FM, 'Body.\n'));
    repo.commit('add', '2026-01-10T09:00:00Z');
    repo.write(`${BLOG}/old-name.md`, post(FM, 'Body, revised.\n'));
    repo.commit('body', '2026-02-02T09:00:00Z');
    repo.move(`${BLOG}/old-name.md`, `${BLOG}/series/new-name.md`);
    repo.commit('pure rename', '2026-03-03T09:00:00Z');

    const renamed = computeLastUpdated({ repoRoot: repo.dir });
    // The rename itself changes no body, and the post is not "added" by it.
    expect(lastUpdatedFor(renamed, repo.path(`${BLOG}/series/new-name.md`))?.toISOString()).toBe(
      '2026-02-02T09:00:00.000Z',
    );

    // A rename that also edits the body counts at the rename.
    repo.move(`${BLOG}/series/new-name.md`, `${BLOG}/final.md`);
    repo.write(`${BLOG}/final.md`, post(FM, 'Body, revised.\n\nA new closing paragraph.\n'));
    repo.commit('rename with edit', '2026-04-04T09:00:00Z');
    const edited = computeLastUpdated({ repoRoot: repo.dir });
    expect(lastUpdatedFor(edited, repo.path(`${BLOG}/final.md`))?.toISOString()).toBe(
      '2026-04-04T09:00:00.000Z',
    );
  });

  it('dates each post independently and ignores files outside the content directory', () => {
    const repo = makeRepo();
    repo.write(`${BLOG}/a.md`, post(FM, 'A.\n'));
    repo.write(`${BLOG}/b.md`, post(FM, 'B.\n'));
    repo.write('README.md', 'readme\n');
    repo.commit('add', '2026-01-10T09:00:00Z');
    repo.write(`${BLOG}/a.md`, post(FM, 'A, revised.\n'));
    repo.write('README.md', 'readme, revised\n');
    repo.commit('edit a', '2026-02-10T09:00:00Z');

    const map = computeLastUpdated({ repoRoot: repo.dir });
    expect([...map.keys()]).toEqual([repo.path(`${BLOG}/a.md`)]);
    expect(lastUpdatedFor(map, repo.path(`${BLOG}/b.md`))).toBeUndefined();
  });
});

describe('last-updated: .freshness-ignore-revs', () => {
  function sweptRepo() {
    const repo = makeRepo();
    repo.write(`${BLOG}/post.md`, post(FM, 'Body -- with dashes.\n'));
    repo.commit('add', '2026-01-10T09:00:00Z');
    repo.write(`${BLOG}/post.md`, post(FM, 'Body revised -- with dashes.\n'));
    repo.commit('real edit', '2026-02-10T09:00:00Z');
    repo.write(`${BLOG}/post.md`, post(FM, 'Body revised—with dashes.\n'));
    const sweep = repo.commit('em dash sweep', '2026-03-10T09:00:00Z');
    return { repo, sweep };
  }

  it('skips a listed sweep and falls back to the previous real edit', () => {
    const { repo, sweep } = sweptRepo();
    const target = repo.path(`${BLOG}/post.md`);

    expect(lastUpdatedFor(computeLastUpdated({ repoRoot: repo.dir }), target)?.toISOString()).toBe(
      '2026-03-10T09:00:00.000Z',
    );

    repo.write('.freshness-ignore-revs', `# em dash sweep\n${sweep}  # mechanical\n`);
    repo.commit('ignore the sweep', '2026-03-11T09:00:00Z');
    expect(lastUpdatedFor(computeLastUpdated({ repoRoot: repo.dir }), target)?.toISOString()).toBe(
      '2026-02-10T09:00:00.000Z',
    );
  });

  it('fails on a malformed line instead of silently skipping it', () => {
    expect(() => parseIgnoreRevs('# ok\nabc123\n')).toThrow(/line 2|:2: expected one full/);
    expect(() => parseIgnoreRevs('A'.repeat(40))).toThrow(/full 40-character lowercase/);
    expect(parseIgnoreRevs('\n# only comments\n\n').size).toBe(0);

    const { repo } = sweptRepo();
    repo.write('.freshness-ignore-revs', 'not-a-sha\n');
    expect(() => computeLastUpdated({ repoRoot: repo.dir })).toThrow(/expected one full/);
  });

  it('fails on a well-formed SHA the repository does not contain', () => {
    const { repo } = sweptRepo();
    repo.write('.freshness-ignore-revs', `${'0'.repeat(40)}\n`);
    expect(() => computeLastUpdated({ repoRoot: repo.dir })).toThrow(/does not contain: 0{40}/);
  });
});

describe('last-updated: missing history fails closed', () => {
  it('refuses a shallow clone', () => {
    const repo = makeRepo();
    repo.write(`${BLOG}/post.md`, post(FM, 'Body.\n'));
    repo.commit('add', '2026-01-10T09:00:00Z');
    repo.write(`${BLOG}/post.md`, post(FM, 'Body, revised.\n'));
    repo.commit('body', '2026-02-10T09:00:00Z');

    const shallow = realpathSync(mkdtempSync(join(tmpdir(), 'last-updated-shallow-')));
    fixtures.push(shallow);
    execFileSync('git', ['clone', '-q', '--depth', '1', `file://${repo.dir}`, shallow], {
      env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' },
      stdio: 'ignore',
    });

    // The control: the full repository dates the post.
    expect(computeLastUpdated({ repoRoot: repo.dir }).size).toBe(1);
    expect(() => assertFullHistory(shallow)).toThrow(/shallow clone/);
    expect(() => computeLastUpdated({ repoRoot: shallow })).toThrow(/fetch-depth: 0/);
  });

  it('refuses a directory that is not a git checkout', () => {
    const plain = realpathSync(mkdtempSync(join(tmpdir(), 'last-updated-plain-')));
    fixtures.push(plain);
    expect(() => computeLastUpdated({ repoRoot: plain })).toThrow(/git could not read/);
  });
});

describe('last-updated: body, month and time zone rules', () => {
  it('takes the body as everything after the frontmatter block', () => {
    expect(markdownBody('---\ntitle: A\n---\nBody\n')).toBe('\nBody\n');
    expect(markdownBody('---\r\ntitle: A\r\n---\r\nBody')).toBe('\r\nBody');
    expect(markdownBody('No frontmatter')).toBe('No frontmatter');
  });

  it('hides the row for an update in the publication month, and shows it for a later month', () => {
    const october1 = new Date('2026-10-01');
    const september6 = new Date('2026-09-06');
    const revised = new Date('2026-10-07T03:58:25Z'); // 20:58 Pacific, 6 October

    expect(showsUpdatedMonth(october1, revised)).toBe(false);
    expect(showsUpdatedMonth(september6, revised)).toBe(true);
    expect(showsUpdatedMonth(september6, undefined)).toBe(false);
    // Search surfaces still move for a same-month update.
    expect(effectiveModified(october1, revised)).toBe(revised);
  });

  it('reads the update month in Pacific time at a month boundary', () => {
    // 23:30 Pacific on 31 October is already 1 November in UTC.
    const lateOctober = new Date('2026-11-01T06:30:00Z');
    expect(formatUpdatedMonth(lateOctober)).toBe('October 2026');
    expect(showsUpdatedMonth(new Date('2026-10-01'), lateOctober)).toBe(false);
    expect(showsUpdatedMonth(new Date('2026-09-30'), lateOctober)).toBe(true);
  });

  it('never shifts the publication date out of its UTC calendar month', () => {
    // Midnight UTC on 1 November is 31 October in Pacific time; reading the
    // published date in Pacific would wrongly call a November update "later".
    const published = new Date('2026-11-01');
    expect(showsUpdatedMonth(published, new Date('2026-11-20T18:00:00Z'))).toBe(false);
    expect(showsUpdatedMonth(published, new Date('2026-12-02T18:00:00Z'))).toBe(true);
  });

  it('keeps the publication date when the recorded change predates it', () => {
    const published = new Date('2026-05-20');
    const earlier = new Date('2026-05-19T12:00:00Z');
    expect(effectiveModified(published, earlier)).toBe(published);
    expect(effectiveModified(published, undefined)).toBe(published);
  });
});

// ── The built site agrees with the rule ──────────────────────────────
//
// The expected values come from the helper over this repository's live
// history, so these assertions hold as posts are edited. What they pin is
// that every surface reads the same answer.

const blogDirectory = resolve(__dirname, '../src/content/blog');
const sitemap = readFileSync(resolve(__dirname, '../dist/sitemap-0.xml'), 'utf-8');
const liveMap = getBlogLastUpdated(resolve(__dirname, '..'));

const builtPosts = findBlogMarkdownFiles(blogDirectory)
  .map((filePath) => ({ filePath, frontmatter: readSitemapFrontmatter(filePath) }))
  .filter(({ frontmatter }) => frontmatter.draft !== true)
  .map(({ filePath, frontmatter }) => {
    const slug = blogSlugFromPath(filePath, blogDirectory);
    const published = new Date(frontmatter.date);
    const updated = lastUpdatedFor(liveMap, filePath);
    return { slug, published, updated, modified: effectiveModified(published, updated) };
  });

function sitemapLastmodFor(path) {
  const loc = `<loc>https://nathanpayne.com${path}</loc>`;
  const at = sitemap.indexOf(loc);
  expect(at, `sitemap has no entry for ${path}`).toBeGreaterThan(-1);
  const entry = sitemap.slice(at, sitemap.indexOf('</url>', at));
  return entry.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
}

describe('last-updated: rendered surfaces', () => {
  it('has posts to check, at least one of which shows the Updated row', () => {
    expect(builtPosts.length).toBeGreaterThan(0);
    expect(builtPosts.some((p) => showsUpdatedMonth(p.published, p.updated))).toBe(true);
  });

  it.each(builtPosts.map((p) => [p.slug, p]))(
    '%s: sidebar row, JSON-LD, Open Graph and sitemap agree with the history',
    (slug, { published, updated, modified }) => {
      const htmlPath = resolve(__dirname, `../dist/blog/${slug}/index.html`);
      expect(existsSync(htmlPath), `${slug} was not built`).toBe(true);
      const doc = new DOMParser().parseFromString(readFileSync(htmlPath, 'utf-8'), 'text/html');

      const terms = [...doc.querySelectorAll('.blog-sidebar-meta dt')].map((dt) =>
        dt.textContent.trim(),
      );
      const row = doc.querySelector('.blog-sidebar-updated');
      if (showsUpdatedMonth(published, updated)) {
        expect(terms.indexOf('Updated')).toBe(terms.indexOf('Published') + 1);
        const time = row.querySelector('dd time');
        expect(time.textContent.trim()).toBe(formatUpdatedMonth(updated));
        expect(time.getAttribute('datetime')).toBe(updated.toISOString());
      } else {
        expect(terms).not.toContain('Updated');
        expect(row).toBeNull();
      }

      const posting = JSON.parse(
        doc.querySelector('script[type="application/ld+json"]').textContent,
      )['@graph'].find((entry) => entry['@type'] === 'BlogPosting');
      expect(posting.datePublished).toBe(published.toISOString());
      expect(posting.dateModified).toBe(modified.toISOString());

      const modifiedMeta = doc.querySelector('meta[property="article:modified_time"]');
      if (modified === published) {
        expect(modifiedMeta).toBeNull();
      } else {
        expect(modifiedMeta?.getAttribute('content')).toBe(modified.toISOString());
      }

      expect(sitemapLastmodFor(`/blog/${slug}/`)).toBe(modified.toISOString());
    },
  );

  it('dates the blog index with the newest post value', () => {
    const newest = builtPosts
      .map((p) => p.modified.toISOString())
      .sort()
      .at(-1);
    expect(sitemapLastmodFor('/blog/')).toBe(newest);
  });
});
