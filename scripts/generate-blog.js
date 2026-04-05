#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'blog');
const BLOG_DIR = path.join(ROOT, 'blog');
const SITE_URL = 'https://nathanpayne.com';
const STYLE_VERSION = '20260404e';

function main() {
  const posts = loadPosts().sort((left, right) => right.date.localeCompare(left.date));

  if (posts.length === 0) {
    throw new Error('No blog posts found in content/blog.');
  }

  fs.mkdirSync(BLOG_DIR, { recursive: true });
  writeFile(path.join(BLOG_DIR, 'index.html'), renderBlogIndex(posts));

  for (const post of posts) {
    const outputDir = path.join(BLOG_DIR, post.slug);
    fs.mkdirSync(outputDir, { recursive: true });
    writeFile(path.join(outputDir, 'index.html'), renderBlogPost(post, posts));
  }
}

function loadPosts() {
  return fs.readdirSync(CONTENT_DIR)
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => {
      const fullPath = path.join(CONTENT_DIR, entry);
      const source = fs.readFileSync(fullPath, 'utf8');
      const { frontmatter, body } = parseFrontmatter(source);
      const slug = path.basename(entry, '.md');
      const normalizedBody = stripStandaloneHeading(body, frontmatter.title);

      return {
        slug,
        title: frontmatter.title,
        description: frontmatter.description,
        author: frontmatter.author,
        date: frontmatter.date,
        image: frontmatter.image,
        tags: frontmatter.tags,
        readingTime: estimateReadingTime(normalizedBody),
        bodyHtml: renderMarkdown(normalizedBody),
      };
    });
}

function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Expected frontmatter in blog post.');
  }

  const raw = match[1];
  const body = match[2];
  const frontmatter = {};

  for (const line of raw.split('\n')) {
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (value.startsWith('[')) {
      frontmatter[key] = JSON.parse(value);
      continue;
    }

    if (value.startsWith('"') || value.startsWith('\'')) {
      frontmatter[key] = JSON.parse(value.replace(/^'/, '"').replace(/'$/, '"'));
      continue;
    }

    frontmatter[key] = value;
  }

  return { frontmatter, body };
}

function stripStandaloneHeading(body, title) {
  let normalized = body.trimStart();

  if (normalized.startsWith('---\n')) {
    normalized = normalized.slice(4).trimStart();
  }

  const heading = `# ${title}`;
  if (normalized.startsWith(heading)) {
    normalized = normalized.slice(heading.length).trimStart();
  }

  return normalized.trim();
}

function renderMarkdown(markdown) {
  const lines = markdown.split('\n');
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed === '---') {
      html.push('<hr class="blog-rule" />');
      index += 1;
      continue;
    }

    const codeFence = line.match(/^```([\w-]+)?$/);
    if (codeFence) {
      const language = codeFence[1] || 'text';
      const blockLines = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith('```')) {
        blockLines.push(lines[index]);
        index += 1;
      }

      html.push(renderCodeBlock(language, blockLines.join('\n')));
      index += 1;
      continue;
    }

    if (/^###\s+/.test(trimmed)) {
      html.push(`<h3>${renderInline(trimmed.replace(/^###\s+/, ''))}</h3>`);
      index += 1;
      continue;
    }

    if (/^##\s+/.test(trimmed)) {
      html.push(`<h2>${renderInline(trimmed.replace(/^##\s+/, ''))}</h2>`);
      index += 1;
      continue;
    }

    if (/^!\[.*\]\(.*\)$/.test(trimmed)) {
      const imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      html.push(
        `<figure class="blog-figure"><img src="${escapeAttribute(imageMatch[2])}" alt="${escapeAttribute(imageMatch[1])}" loading="lazy" /><figcaption>${escapeHtml(imageMatch[1])}</figcaption></figure>`
      );
      index += 1;
      continue;
    }

    if (/^-\s+/.test(trimmed)) {
      const items = [];
      while (index < lines.length && /^-\s+/.test(lines[index].trim())) {
        items.push(`<li>${renderInline(lines[index].trim().replace(/^-\s+/, ''))}</li>`);
        index += 1;
      }
      html.push(`<ul class="blog-list">${items.join('')}</ul>`);
      continue;
    }

    const paragraphLines = [];
    while (index < lines.length && canContinueParagraph(lines[index])) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    html.push(`<p>${renderParagraph(paragraphLines)}</p>`);
  }

  return html.join('\n');
}

function canContinueParagraph(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  if (trimmed === '---') {
    return false;
  }

  if (/^#{1,6}\s+/.test(trimmed)) {
    return false;
  }

  if (/^```/.test(trimmed)) {
    return false;
  }

  if (/^!\[.*\]\(.*\)$/.test(trimmed)) {
    return false;
  }

  if (/^-\s+/.test(trimmed)) {
    return false;
  }

  return true;
}

function renderParagraph(lines) {
  const parts = [];

  for (const line of lines) {
    const hasHardBreak = /\s{2}$/.test(line);
    const trimmed = line.trimEnd();

    if (parts.length > 0 && parts[parts.length - 1] !== '<br>') {
      parts.push(' ');
    }

    parts.push(renderInline(trimmed));

    if (hasHardBreak) {
      parts.push('<br>');
    }
  }

  return parts.join('').replace(/ <br>/g, '<br>');
}

function renderInline(text) {
  let output = escapeHtml(text);

  output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
  output = output.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/\*(.+?)\*/g, '<em>$1</em>');
  output = output.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  output = output.replace(/(^|[\s(])(https?:\/\/[^\s<]+)(?=$|[\s)])/g, '$1<a href="$2">$2</a>');

  return output;
}

function renderCodeBlock(language, code) {
  if (language === 'mermaid') {
    return renderMermaidDiagram(code);
  }

  return `<pre class="blog-code-block"><code class="language-${escapeAttribute(language)}">${escapeHtml(code)}</code></pre>`;
}

function renderMermaidDiagram(code) {
  const lines = code.split('\n').map((line) => line.trim()).filter(Boolean);
  const labels = new Map();
  const edges = [];

  for (const line of lines.slice(1)) {
    const nodeMatches = [...line.matchAll(/([A-Za-z0-9_]+)\["([^"]+)"\]/g)];
    for (const match of nodeMatches) {
      labels.set(match[1], match[2]);
    }

    const normalizedLine = line.replace(/\["[^"]+"\]/g, '');
    const edgeMatch = normalizedLine.match(/([A-Za-z0-9_]+)\s*-->\s*([A-Za-z0-9_]+)/);
    if (edgeMatch) {
      edges.push([edgeMatch[1], edgeMatch[2]]);
    }
  }

  const outDegree = new Map();
  const inDegree = new Map();
  const adjacency = new Map();

  for (const [from, to] of edges) {
    outDegree.set(from, (outDegree.get(from) || 0) + 1);
    inDegree.set(to, (inDegree.get(to) || 0) + 1);
    if (!adjacency.has(from)) {
      adjacency.set(from, []);
    }
    adjacency.get(from).push(to);
    if (!inDegree.has(from)) {
      inDegree.set(from, inDegree.get(from) || 0);
    }
    if (!outDegree.has(to)) {
      outDegree.set(to, outDegree.get(to) || 0);
    }
  }

  const fanoutRoot = [...outDegree.entries()].find(([, count]) => count > 1);
  if (fanoutRoot) {
    const root = fanoutRoot[0];
    const children = edges.filter(([from]) => from === root).map(([, to]) => to);
    return `
      <div class="blog-diagram blog-diagram--fanout" aria-label="Diagram">
        <div class="blog-diagram-node">${escapeHtml(labels.get(root) || root)}</div>
        <div class="blog-diagram-branch" aria-hidden="true"></div>
        <div class="blog-diagram-fanout-row">
          ${children.map((child) => `<div class="blog-diagram-node">${escapeHtml(labels.get(child) || child)}</div>`).join('')}
        </div>
      </div>
    `;
  }

  const start = [...labels.keys()].find((id) => (inDegree.get(id) || 0) === 0) || edges[0][0];
  const sequence = [];
  const visited = new Set();
  let current = start;

  while (current && !visited.has(current)) {
    visited.add(current);
    sequence.push(current);
    const next = (adjacency.get(current) || []).find((candidate) => !visited.has(candidate));
    current = next || null;
  }

  const loopBack = edges.some(([from, to]) => from === sequence[sequence.length - 1] && to === sequence[0]);

  return `
    <div class="blog-diagram blog-diagram--chain" aria-label="Diagram">
      ${sequence.map((node, index) => {
        const nodeHtml = `<div class="blog-diagram-node">${escapeHtml(labels.get(node) || node)}</div>`;
        if (index === sequence.length - 1) {
          return loopBack
            ? `${nodeHtml}<div class="blog-diagram-loop" aria-hidden="true">↺</div>`
            : nodeHtml;
        }
        return `${nodeHtml}<div class="blog-diagram-arrow" aria-hidden="true">↓</div>`;
      }).join('')}
    </div>
  `;
}

function renderBlogIndex(posts) {
  const latest = posts[0];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Blog | Nathan Payne</title>
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="description" content="Essays and notes from Nathan Payne on AI, systems, product, engineering, and debugging." />
  <meta name="author" content="Nathan Payne" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${SITE_URL}/blog/" />

  <meta property="og:type" content="website" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:site_name" content="Nathan Payne" />
  <meta property="og:title" content="Blog | Nathan Payne" />
  <meta property="og:description" content="Essays and notes from Nathan Payne on AI, systems, product, engineering, and debugging." />
  <meta property="og:url" content="${SITE_URL}/blog/" />
  <meta property="og:image" content="${SITE_URL}${latest.image}" />
  <meta property="og:image:secure_url" content="${SITE_URL}${latest.image}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeAttribute(latest.title)} open graph image" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Blog | Nathan Payne" />
  <meta name="twitter:description" content="Essays and notes from Nathan Payne on AI, systems, product, engineering, and debugging." />
  <meta name="twitter:url" content="${SITE_URL}/blog/" />
  <meta name="twitter:image" content="${SITE_URL}${latest.image}" />
  <meta name="twitter:image:width" content="1200" />
  <meta name="twitter:image:height" content="630" />
  <meta name="twitter:image:alt" content="${escapeAttribute(latest.title)} open graph image" />

  <script type="application/ld+json">
    ${JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          '@id': `${SITE_URL}/blog/#webpage`,
          url: `${SITE_URL}/blog/`,
          name: 'Blog | Nathan Payne',
          description: 'Essays and notes from Nathan Payne on AI, systems, product, engineering, and debugging.',
          isPartOf: { '@id': `${SITE_URL}/#website` }
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${SITE_URL}/blog/#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Nathan Payne', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog/` }
          ]
        }
      ]
    })}
  </script>

  <script async src="https://www.googletagmanager.com/gtag/js?id=G-7C29SRBXB1"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-7C29SRBXB1', {
      page_title: document.title,
      page_location: window.location.href
    });
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/style.css?v=${STYLE_VERSION}" />
</head>
<body class="project-page project-page--blue blog-index-page">
  <main class="project-shell">
    <article class="project-detail blog-index-detail">
      <header class="project-hero">
        <nav class="project-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Nathan Payne</a>
          <span>/</span>
          <span>Blog</span>
        </nav>
        <p class="project-kicker">Essays × Systems × Product</p>
        <h1>Blog</h1>
        <p class="project-deck">Essays and notes on AI agents, product systems, debugging, and the invisible constraints that shape what people actually experience.</p>
        <div class="project-actions">
          <a class="project-action" href="/">Back to Homepage</a>
        </div>
      </header>
      <div class="project-layout blog-index-layout">
        <section class="project-copy blog-index-copy" aria-labelledby="blog-posts">
          <div class="project-section blog-section">
            <h2 id="blog-posts">Posts</h2>
            <div class="blog-card-list">
              ${posts.map(renderBlogCard).join('')}
            </div>
          </div>
        </section>
        <aside class="project-sidebar">
          <section class="project-card" aria-labelledby="blog-about">
            <h2 id="blog-about">What lives here</h2>
            <p class="project-note">Writing about system boundaries, product judgment, engineering tradeoffs, and where AI-generated code breaks when the model never forms the right mental model.</p>
          </section>
        </aside>
      </div>
    </article>
  </main>
</body>
</html>
`;
}

function renderBlogCard(post) {
  return `
    <article class="blog-card">
      <p class="blog-card-meta">${escapeHtml(formatDate(post.date))} · ${escapeHtml(post.readingTime)}</p>
      <h3><a class="blog-card-link" href="/blog/${post.slug}/">${escapeHtml(post.title)}</a></h3>
      <p class="blog-card-desc">${escapeHtml(post.description)}</p>
      <div class="blog-tag-row">${post.tags.map((tag) => `<span class="blog-tag">${escapeHtml(tag)}</span>`).join('')}</div>
    </article>
  `;
}

function renderBlogPost(post) {
  const tagList = post.tags.join(' · ');
  const postUrl = `${SITE_URL}/blog/${post.slug}/`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(post.title)} | Nathan Payne</title>
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta name="description" content="${escapeAttribute(post.description)}" />
  <meta name="author" content="${escapeAttribute(post.author)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${postUrl}" />

  <meta property="og:type" content="article" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:site_name" content="Nathan Payne" />
  <meta property="og:title" content="${escapeAttribute(post.title)} | Nathan Payne" />
  <meta property="og:description" content="${escapeAttribute(post.description)}" />
  <meta property="og:url" content="${postUrl}" />
  <meta property="og:image" content="${SITE_URL}${post.image}" />
  <meta property="og:image:secure_url" content="${SITE_URL}${post.image}" />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeAttribute(post.title)} open graph image" />
  <meta property="article:published_time" content="${post.date}T00:00:00Z" />
  <meta property="article:author" content="${escapeAttribute(post.author)}" />
  ${post.tags.map((tag) => `<meta property="article:tag" content="${escapeAttribute(tag)}" />`).join('\n  ')}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeAttribute(post.title)} | Nathan Payne" />
  <meta name="twitter:description" content="${escapeAttribute(post.description)}" />
  <meta name="twitter:url" content="${postUrl}" />
  <meta name="twitter:image" content="${SITE_URL}${post.image}" />
  <meta name="twitter:image:width" content="1200" />
  <meta name="twitter:image:height" content="630" />
  <meta name="twitter:image:alt" content="${escapeAttribute(post.title)} open graph image" />

  <script type="application/ld+json">
    ${JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebPage',
          '@id': `${postUrl}#webpage`,
          url: postUrl,
          name: `${post.title} | Nathan Payne`,
          description: post.description,
          isPartOf: { '@id': `${SITE_URL}/#website` },
          breadcrumb: { '@id': `${postUrl}#breadcrumb` },
          primaryImageOfPage: { '@id': `${postUrl}#primaryimage` },
          mainEntity: { '@id': `${postUrl}#article` }
        },
        {
          '@type': 'ImageObject',
          '@id': `${postUrl}#primaryimage`,
          url: `${SITE_URL}${post.image}`,
          width: 1200,
          height: 630
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${postUrl}#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Nathan Payne', item: `${SITE_URL}/` },
            { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog/` },
            { '@type': 'ListItem', position: 3, name: post.title, item: postUrl }
          ]
        },
        {
          '@type': 'BlogPosting',
          '@id': `${postUrl}#article`,
          headline: post.title,
          description: post.description,
          image: `${SITE_URL}${post.image}`,
          datePublished: `${post.date}T00:00:00Z`,
          author: {
            '@type': 'Person',
            name: post.author,
            url: `${SITE_URL}/`
          },
          publisher: {
            '@type': 'Person',
            name: 'Nathan Payne',
            url: `${SITE_URL}/`
          },
          mainEntityOfPage: {
            '@id': `${postUrl}#webpage`
          },
          keywords: post.tags.join(', ')
        }
      ]
    })}
  </script>

  <script async src="https://www.googletagmanager.com/gtag/js?id=G-7C29SRBXB1"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-7C29SRBXB1', {
      page_title: document.title,
      page_location: window.location.href
    });
  </script>

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/style.css?v=${STYLE_VERSION}" />
</head>
<body class="project-page project-page--red blog-page">
  <main class="project-shell">
    <article class="project-detail blog-detail">
      <header class="project-hero">
        <nav class="project-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Nathan Payne</a>
          <span>/</span>
          <a href="/blog/">Blog</a>
          <span>/</span>
          <span>${escapeHtml(post.title)}</span>
        </nav>
        <p class="project-kicker">${escapeHtml(tagList)}</p>
        <h1>${escapeHtml(post.title)}</h1>
        <p class="project-deck">${escapeHtml(post.description)}</p>
        <div class="project-actions">
          <a class="project-action" href="/blog/">Back to Blog</a>
          <a class="project-action" href="/">Back to Homepage</a>
        </div>
      </header>

      <div class="project-layout blog-layout">
        <div class="project-copy">
          <article class="project-section blog-prose" aria-labelledby="post-body">
            <h2 id="post-body" class="blog-prose-title">Essay</h2>
            ${post.bodyHtml}
          </article>
        </div>

        <aside class="project-sidebar">
          <section class="project-card" aria-labelledby="post-meta">
            <h2 id="post-meta">Post details</h2>
            <dl class="project-facts">
              <div>
                <dt>Published</dt>
                <dd>${escapeHtml(formatDate(post.date))}</dd>
              </div>
              <div>
                <dt>Author</dt>
                <dd>${escapeHtml(post.author)}</dd>
              </div>
              <div>
                <dt>Reading time</dt>
                <dd>${escapeHtml(post.readingTime)}</dd>
              </div>
              <div>
                <dt>Tags</dt>
                <dd>${escapeHtml(tagList)}</dd>
              </div>
            </dl>
          </section>

        </aside>
      </div>
    </article>
  </main>
</body>
</html>
`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${date}T00:00:00Z`));
}

function estimateReadingTime(markdown) {
  const plainText = markdown
    .replace(/^---[\s\S]*?---/g, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/[#>*_\-`[\]()]/g, ' ');
  const words = plainText.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, `${content.trim()}\n`);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

main();
