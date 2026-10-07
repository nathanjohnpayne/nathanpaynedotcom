/** Local mechanical rules and a lossless manual-review packet. No style inference. */
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { JSDOM } from 'jsdom';
import { isAlias, isMap, isScalar, isSeq, parseDocument } from 'yaml';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { frontmatterOf, runVale } from '../lint-prose.mjs';
import { parseFrontmatter } from './parse-frontmatter.mjs';
import { parseMermaidMetadata } from '../../src/plugins/remark-mermaid.mjs';

export const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
export const meaningChecklist = [
  'Read the complete before and after articles, including all visible metadata and protected material.',
  'Preserve the thesis, title payoff, authentic jokes, self-deprecation and first-person product judgments.',
  'Check accountability and division of labor: who owned the other job, who supplied context, and who acted?',
  'Check negations and decision rights: did rejecting a second rulebook become adding one beside the policy?',
  'Check planned versus completed work: a critique deserving its own ticket and post must not sound published.',
  'Check actors, chronology and causal strength: generator drift preceded the mobile fix; later discovery is not causation.',
  'Preserve uncertainty, factual qualifications, validation boundaries and historical versus current outcomes.',
  'Review linked ledgers, diagrams (including accessible descriptions), captions, comparison passages and cross-post claims together.',
  'Disposition every warning with a reason; preserve intentional brevity-checker occurrence exceptions without weakening the checker.',
  "Run the composing/reviewing agent's Write Like Me pass with sufficient supplied references, retrieving relevant writing only when needed and available. Label user-authored references separately from owner-approved model revisions; if unavailable, explicitly use supplied references and feedback as the fallback.",
  'The owner judges voice and meaning. Passing mechanical checks does not establish semantic correctness or approval.',
];
const visibleRoots = new Set([
  'title',
  'shortTitle',
  'description',
  'seoTitle',
  'seoDescription',
  'ogDescription',
  'author',
  'tags',
  'keyTakeaways',
]);
const evidenceCue =
  /(?:\b(?:said|wrote|asked|replied|told|reads|quoted|prompt|transcript|quotation)\b)[\s\S]{0,160}$/iu;
const followingEvidenceCue =
  /^[\s,;:—-]*(?:[\p{L}\p{N}_]+\s+){0,5}(?:said|wrote|asked|replied|told|reads|quoted)\b/iu;
const semanticTokens =
  /\b(?:not|never|no|nobody|neither|cannot|can['’]t|could|should|would|may|might|must|will|planned|intended|deserves)\b|n['’]t\b/giu;
export const hash = (source) => createHash('sha256').update(source).digest('hex');

export class VoiceError extends Error {
  constructor(message, exitCode = 2) {
    super(message);
    this.exitCode = exitCode;
  }
}
export function readGit(args) {
  const result = spawnSync('git', ['-C', repositoryRoot, ...args], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_LAZY_FETCH: '1' },
  });
  if (result.error) throw new VoiceError(`Git could not run: ${result.error.message}`, 3);
  if (result.status !== 0)
    throw new VoiceError(`Cannot read local baseline: ${result.stderr.trim()}`);
  return result.stdout;
}
function point(source, offset) {
  const prefix = source.slice(0, offset);
  return { line: prefix.split('\n').length, column: offset - prefix.lastIndexOf('\n'), offset };
}
function location(source, start, end) {
  return { start: point(source, start), end: point(source, end), precision: 'source-range' };
}
function rawOf(source, node) {
  return source.slice(node.position.start.offset, node.position.end.offset);
}
function entry(source, node, kind, text, field) {
  return {
    kind,
    field: field ?? null,
    text,
    excerpt: rawOf(source, node),
    location: location(source, node.position.start.offset, node.position.end.offset),
  };
}
function finding(rule, severity, item, reason, file) {
  return {
    rule,
    severity,
    file,
    location: item.location,
    excerpt: item.excerpt,
    reason,
    surface: item.field ?? item.kind,
  };
}
function normalize(text) {
  return text.replace(/\s+/gu, ' ').trim();
}
function escapeProse(text) {
  // These are decoded AST values, not Markdown source. Serialize punctuation
  // literally so Vale cannot reinterpret a tag, code span or heading.
  return text.replace(/[\\`*_[\]()<>#!~]/gu, '\\$&');
}
function maskSource(text) {
  // Preserve UTF-16 offsets, including both code units of astral characters.
  return text.replace(/[^\r\n]/g, ' ');
}
function containsVerbatim(text, quote, prose = text) {
  let start = text.indexOf(quote);
  const word = (c) => c !== undefined && /[\p{L}\p{N}]/u.test(c);
  while (start !== -1) {
    if (
      !(word(quote[0]) && word(text[start - 1])) &&
      !(word(quote.at(-1)) && word(text[start + quote.length])) &&
      /[\p{L}\p{N}]/u.test(prose.slice(start, start + quote.length))
    )
      return true;
    start = text.indexOf(quote, start + 1);
  }
  return false;
}
const blockContainers = new Set(['root', 'list', 'listItem', 'blockquote', 'table', 'tableRow']);
function joinedText(node, values) {
  return values.join(blockContainers.has(node.type) ? ' ' : '');
}
function inlineText(node, includeCode = false) {
  if (node.type === 'inlineCode' || node.type === 'code') return includeCode ? node.value : ' ';
  if (node.type === 'html') return '';
  if (node.type === 'image' || node.type === 'imageReference') return '';
  if (node.type === 'break') return ' ';
  if (typeof node.value === 'string') return node.value;
  return joinedText(node, (node.children ?? []).map((child) => inlineText(child, includeCode)));
}
async function markdownTree(source) {
  let tree;
  const processor = await createMarkdownProcessor({
    syntaxHighlight: false,
    smartypants: false,
    remarkPlugins: [
      () => (parsed) => {
        tree = parsed;
      },
    ],
  });
  await processor.render(source);
  return tree;
}
function quotationPass(item, context, findings, file) {
  let projected = item.text;
  const quotes = [
    ...item.text.matchAll(
      /(?<!\p{N})"[^"]+"|“[^”]+”|(?<![\p{L}\p{N}])'(?:[^']|(?<=[\p{L}\p{N}])'(?=[\p{L}\p{N}]))+'(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])‘(?:[^’]|(?<=[\p{L}\p{N}])’(?=[\p{L}\p{N}]))+’(?![\p{L}\p{N}])/gu,
    ),
  ];
  const styles = new Set();
  const uncertainQuotes = [];
  for (const match of quotes) {
    const attributed = evidenceCue.test(
      (context + ' ' + item.text.slice(0, match.index)).slice(-200),
    ) || followingEvidenceCue.test(item.text.slice(match.index + match[0].length, match.index + match[0].length + 200));
    if (!attributed) {
      if (match[0][0] === '"') styles.add('straight');
      if (match[0][0] === '“') styles.add('curly');
      uncertainQuotes.push(match[0]);
    }
    // Never silently rewrite quotations. Uncertain attribution is surfaced above.
    projected =
      projected.slice(0, match.index) +
      ' '.repeat(match[0].length) +
      projected.slice(match.index + match[0].length);
  }
  if (styles.size > 1)
    findings.push(
      finding(
        'voice.quotation-treatment',
        'error',
        item,
        'This authored surface mixes straight and curly double quotation marks. Preserve any attributed source treatment and use one treatment for the remaining quotations.',
        file,
      ),
    );
  return { ...item, projected, uncertainQuotes, quoteStyles: [...styles] };
}
function htmlQuotations(source, node, context, dom, textWithin) {
  const textNodes = [];
  const walker = dom.window.document.createTreeWalker(dom.window.document.body, dom.window.NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const text = walker.currentNode;
    if (text.parentElement?.closest('pre, code, script, style, blockquote, q')) continue;
    const range = dom.nodeLocation(text);
    if (range) textNodes.push({ text: text.data, start: node.position.start.offset + range.startOffset, end: node.position.start.offset + range.endOffset });
  }
  return [...dom.window.document.querySelectorAll('blockquote, q')]
    .filter((n) => !n.closest('pre, code, script, style'))
    .map((n) => {
      const range = dom.nodeLocation(n);
      const start = node.position.start.offset + range.startOffset;
      const end = node.position.start.offset + range.endOffset;
      const text = textWithin?.(start, end) ?? (n.textContent ?? '');
      return {
        kind: 'quotation',
        text,
        excerpt: source.slice(start, end),
        location: location(source, start, end),
        attributed: Boolean(n.closest('blockquote[cite]:not([cite=""]), q[cite]:not([cite=""])')) ||
          evidenceCue.test(context.slice(-200)) ||
          evidenceCue.test((textWithin?.(node.position.start.offset, start, false) ?? textNodes.filter((t) => t.end <= start).map((t) => t.text).join(' ')).slice(-200)) ||
          followingEvidenceCue.test((textWithin?.(end, node.position.end.offset, false) ?? textNodes.filter((t) => t.start >= end).map((t) => t.text).join(' ')).slice(0, 200)) ||
          evidenceCue.test(text.slice(0, 160)),
      };
    });
}
function htmlText(source, node, context = '') {
  const dom = new JSDOM(node.value, { includeNodeLocations: true });
  const document = dom.window.document;
  const passages = [];
  let passageText = '';
  let passageProse = '';
  const flush = () => {
    if (passageText.trim()) passages.push(normalizePassage(passageText, passageProse));
    passageText = passageProse = '';
  };
  // DOM structure supplies paragraph/cell boundaries; CSS and custom elements
  // remain explicit manual-review limitations rather than inferred layout.
  const blocks = new Set([
    'p', 'div', 'section', 'article', 'main', 'aside', 'header', 'footer',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'dt', 'dd', 'th', 'td',
    'blockquote', 'pre', 'hr', 'figcaption', 'caption',
  ]);
  const collectPassage = (child, code = false, includeCaptions = false) => {
    if (child.nodeType === 3) {
      passageText += child.data;
      passageProse += code ? ' '.repeat(child.data.length) : child.data;
      return;
    }
    const tag = child.localName;
    if (child.nodeType !== 1) return;
    if (['script', 'style', 'img'].includes(tag) ||
        (!includeCaptions && ['figcaption', 'caption'].includes(tag))) {
      flush();
      return;
    }
    if (tag === 'br') {
      passageText += ' ';
      passageProse += ' ';
      return;
    }
    const display = blocks.has(tag) ? 'block' : dom.window.getComputedStyle(child).display;
    const isBlock = ['block', 'list-item', 'table', 'table-row', 'table-cell', 'table-caption', 'table-row-group', 'table-header-group', 'table-footer-group', 'flow-root', 'flex', 'grid'].includes(display);
    if (isBlock) flush();
    for (const descendant of child.childNodes)
      collectPassage(descendant, code || tag === 'code' || tag === 'pre', includeCaptions);
    if (isBlock) flush();
  };
  collectPassage(document.body);
  flush();
  const bodyPassages = [...passages];
  passages.length = 0;
  collectPassage(document.body, false, true);
  flush();
  const semanticText = normalize(passages.map((p) => p.prose).join(' '));
  const quotations = htmlQuotations(source, node, context, dom);
  document
    .querySelectorAll('script, style, pre, code, blockquote, q')
    .forEach((n) => n.replaceWith('\0'));
  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((n) => {
    const range = dom.nodeLocation(n);
    const start = node.position.start.offset + range.startOffset;
    const end = node.position.start.offset + range.endOffset;
    return {
      kind: 'heading',
      convention: 'HTML',
      field: null,
      text: n.textContent.replaceAll('\0', ' '),
      // The containing HTML surface retains all semantic words exactly once.
      semanticText: '',
      excerpt: source.slice(start, end),
      location: location(source, start, end),
    };
  });
  const captions = [...document.querySelectorAll('img')].map((n) => {
    const range = dom.nodeLocation(n);
    const start = node.position.start.offset + range.startOffset;
    const end = node.position.start.offset + range.endOffset;
    return {
      kind: 'caption',
      field: null,
      text: n.getAttribute('alt') ?? '',
      excerpt: source.slice(start, end),
      location: location(source, start, end),
    };
  });
  document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((n) => n.replaceWith('\0'));
  passages.length = 0;
  collectPassage(document.body, false, true);
  flush();
  const text = passages.map((p) => p.prose).join(' ');
  dom.window.close();
  return {
    item: {
      ...entry(source, node, 'html', normalize(text.replaceAll('\0', ' '))),
      semanticText,
    },
    headings,
    captions,
    passages: bodyPassages,
    quotations,
  };
}
function htmlSkeleton(source, node) {
  // Only AST-classified HTML reaches the DOM parser. Escapes, code and link
  // destinations remain masked source, with original UTF-16 offsets intact.
  let raw = maskSource(rawOf(source, node));
  const retainHtml = (child) => {
    if (child.type === 'html' && child.position) {
      const start = child.position.start.offset - node.position.start.offset;
      const end = child.position.end.offset - node.position.start.offset;
      raw = raw.slice(0, start) + rawOf(source, child) + raw.slice(end);
    }
    for (const descendant of child.children ?? []) retainHtml(descendant);
  };
  retainHtml(node);
  return raw;
}
function inlineHtmlQuotations(source, node, context) {
  const skeleton = htmlSkeleton(source, node);
  if (!skeleton.trim()) return [];
  const dom = new JSDOM(skeleton, { includeNodeLocations: true });
  const contextRanges = [...dom.window.document.querySelectorAll('code, pre, script, style, blockquote, q')]
    .map((n) => dom.nodeLocation(n)).filter(Boolean);
  const textWithin = (start, end, includeCode = true) => {
    const containsRawHtml = (child) =>
      (child.type === 'html' && child.position.start.offset <= start &&
        child.position.end.offset >= end) ||
      (child.children ?? []).some(containsRawHtml);
    // A complete HTML block is one AST leaf: the maintained DOM supplies its
    // quotation text. Inline HTML still needs decoded Markdown child values.
    if (containsRawHtml(node)) return null;
    const collectText = (child) => {
      if (child.children) return joinedText(child, child.children.map(collectText));
      if (child.position.start.offset < start || child.position.end.offset > end) return '';
      if (!includeCode && contextRanges.some((range) =>
        child.position.start.offset >= node.position.start.offset + range.startOffset &&
        child.position.start.offset < node.position.start.offset + range.endOffset)) return ' ';
      return inlineText(child, includeCode);
    };
    return collectText(node);
  };
  const quotations = htmlQuotations(source, node, context, dom, textWithin);
  dom.window.close();
  return quotations;
}
function protectedHtmlText(
  source,
  node,
  boundary = ' ',
  includeQuotedText = false,
  preserveLength = false,
) {
  const skeleton = htmlSkeleton(source, node);
  const dom = skeleton.trim() ? new JSDOM(skeleton, { includeNodeLocations: true }) : null;
  const protectedSelector = includeQuotedText
    ? 'code, pre, script, style'
    : 'code, pre, script, style, blockquote, q';
  const ranges = dom ? [...dom.window.document.querySelectorAll(protectedSelector)]
    .map((n) => dom.nodeLocation(n))
    .filter(Boolean) : [];
  const flatten = (child, parent) => {
    if (child.type === 'html' && blockContainers.has(parent?.type)) {
      const html = htmlText(source, child);
      return [
        includeQuotedText ? html.item.semanticText : html.item.text,
        ...(!includeQuotedText ? html.headings.map((h) => h.text) : []),
        ...html.captions.map((caption) => caption.text),
      ].join(' ');
    }
    if (child.children) return joinedText(child, child.children.map((value) => flatten(value, child)));
    const start = child.position?.start.offset - node.position.start.offset;
    if (
      ranges.some((r) => start >= r.startOffset && start < r.endOffset) ||
      child.type === 'inlineCode' || child.type === 'code'
    )
      return preserveLength ? ' '.repeat(inlineText(child, true).length) : boundary;
    if (['image', 'imageReference'].includes(child.type)) return preserveLength ? '' : boundary;
    return inlineText(child);
  };
  const text = flatten(node);
  dom?.window.close();
  return text;
}
function normalizePassage(text, prose = text) {
  let normalized = '';
  let normalizedProse = '';
  for (const match of text.matchAll(/\S+|\s+/gu)) {
    const whitespace = /^\s/u.test(match[0]);
    normalized += whitespace ? ' ' : match[0];
    normalizedProse += whitespace ? ' ' : prose.slice(match.index, match.index + match[0].length);
  }
  const start = normalized.length - normalized.trimStart().length;
  const length = normalized.trim().length;
  return {
    text: normalized.slice(start, start + length),
    prose: normalizedProse.slice(start, start + length),
  };
}

export async function parseArticle(source, file) {
  const extraction = frontmatterOf(source, file);
  if (extraction.kind === 'unterminated') throw new VoiceError(`${file}: unterminated frontmatter`);
  let metadata = {};
  let yamlDocument;
  const fields = [];
  const packetMetadata = [];
  const protectedMaterial = [];
  const findings = [];
  let body = source;
  if (extraction.kind === 'complete') {
    const sourceLines = source.split('\n');
    const openingOffset = sourceLines.slice(0, extraction.openingLine).join('\n').length + 1;
    const closingOffset = sourceLines.slice(0, extraction.closingLine - 1).join('\n').length + 1;
    const yamlSource =
      maskSource(source.slice(0, openingOffset)) +
      source.slice(openingOffset, closingOffset);
    try {
      metadata = parseFrontmatter(`---\n${extraction.yaml}\n---\n`);
      yamlDocument = parseDocument(yamlSource, { schema: 'failsafe', keepSourceTokens: true });
      if (yamlDocument.errors.length || !isMap(yamlDocument.contents))
        throw new Error('frontmatter must be a YAML mapping with unique keys');
    } catch (error) {
      throw new VoiceError(`${file}: invalid frontmatter: ${error.message}`);
    }
    const closeOffset = source.split('\n').slice(0, extraction.closingLine).join('\n').length;
    body = maskSource(source.slice(0, closeOffset)) + source.slice(closeOffset);
    const walkYaml = (node, path = []) => {
      if (isAlias(node)) {
        const item = {
          kind: 'metadata',
          field: path.join('.'),
          excerpt: source.slice(...node.range.slice(0, 2)),
          location: location(source, ...node.range.slice(0, 2)),
        };
        packetMetadata.push(item);
        findings.push(
          finding(
            'review.yaml-alias',
            'warning',
            item,
            'An aliased metadata value needs a manual review at both its definition and use. Raw frontmatter remains complete in the packet.',
            file,
          ),
        );
        return;
      }
      if (isMap(node)) {
        for (const pair of node.items) walkYaml(pair.value, [...path, String(pair.key.value)]);
      } else if (isSeq(node)) {
        node.items.forEach((value, index) => walkYaml(value, [...path, index]));
      } else if (isScalar(node)) {
        const [start, end] = node.range;
        const item = {
          kind: 'metadata',
          field: path.join('.'),
          text: node.value ?? '',
          excerpt: source.slice(start, end),
          location: location(source, start, end),
        };
        const root = path[0];
        const last = path.at(-1);
        packetMetadata.push(item);
        if (
          typeof node.value === 'string' && (visibleRoots.has(root) ||
          (root === 'pullquotes' && ['text', 'label'].includes(last)) ||
          (root === 'sidebar' && ['title', 'description', 'caption'].includes(last)) ||
          (root === 'sidebar' && last === 'content' && metadata.sidebar?.[path[1]]?.type === 'text'))
        )
          fields.push(item);
        if (
          root === 'sidebar' &&
          last === 'content' &&
          metadata.sidebar?.[path[1]]?.type === 'mermaid'
        )
          protectedMaterial.push(item);
      }
    };
    walkYaml(yamlDocument.contents);
  }
  const tree = await markdownTree(body);
  const surfaces = [];
  const bodyText = [];
  const headings = [];
  let diagramIndex = 0;
  const reviewHtml = (item) => findings.push(finding(
    'review.html', 'warning', item,
    'Review rendered HTML and its complete source. Custom hidden elements, component semantics and broken markup need manual verification.', file,
  ));
  const reviewHtmlQuotations = (html) => {
    for (const quotation of html.quotations)
      if (!quotation.attributed)
        findings.push(finding(
          'review.quotation-attribution', 'warning', quotation,
          'HTML quotation or prompt has no mechanically clear attribution. Preserve its source language and confirm provenance manually.', file,
        ));
  };
  const pullquotePassages = (node) => {
    if (node.type === 'html') return htmlText(source, node).passages;
    if (['heading', 'paragraph', 'tableCell'].includes(node.type))
      return [
        normalizePassage(
          inlineText(node, true),
          protectedHtmlText(source, node, ' ', true, true),
        ),
      ];
    return (node.children ?? []).flatMap(pullquotePassages);
  };
  const quotedSemanticText = (node) => {
    if (['heading', 'paragraph', 'tableCell'].includes(node.type))
      return protectedHtmlText(source, node, ' ', true);
    if (node.type === 'html') return htmlText(source, node).item.semanticText;
    return (node.children ?? []).map(quotedSemanticText).join(' ');
  };
  const collect = (node, context = '', following = '') => {
    if (['code', 'inlineCode', 'table', 'html', 'definition', 'blockquote'].includes(node.type))
      protectedMaterial.push({
        ...entry(source, node, node.type, inlineText(node, true)),
        ...(node.type === 'blockquote' ? { semanticText: quotedSemanticText(node) } : {}),
      });
    if (node.type === 'code') {
      if (node.lang === 'mermaid') {
        let attributes;
        try {
          attributes = parseMermaidMetadata(node.meta);
        } catch (error) {
          throw new VoiceError(`${file}: ${error.message}`);
        }
        for (const [name, value] of Object.entries(attributes))
          fields.push(
            entry(source, node, 'diagram-metadata', value, `body.diagram.${diagramIndex}.${name}`),
          );
        diagramIndex++;
      }
      return;
    }
    if (node.type === 'definition') return;
    if (node.type === 'blockquote') {
      const item = entry(source, node, 'quotation', inlineText(node, true));
      bodyText.push(...pullquotePassages(node));
      if (htmlSkeleton(source, node).trim()) reviewHtml(item);
      if (!evidenceCue.test(context.slice(-200)) && !evidenceCue.test(item.text.slice(0, 160)) &&
          !followingEvidenceCue.test(following.slice(0, 200)))
        findings.push(
          finding(
            'review.quotation-attribution',
            'warning',
            item,
            'Block quotation or prompt has no mechanically clear attribution. Preserve it and confirm provenance manually.',
            file,
          ),
        );
      return;
    }
    if (node.type === 'heading' || node.type === 'paragraph' || node.type === 'tableCell') {
      const item = {
        ...entry(source, node, node.type, protectedHtmlText(source, node)),
        semanticText: protectedHtmlText(source, node, ' ', true),
      };
      bodyText.push(...pullquotePassages(node));
      if (node.type === 'heading') headings.push(item);
      surfaces.push(quotationPass(item, context, findings, file));
      const quotations = inlineHtmlQuotations(source, node, context);
      protectedMaterial.push(...quotations);
      reviewHtmlQuotations({ quotations });
      let hasInlineHtml = false;
      const collectInline = (child) => {
        if (child.type === 'inlineCode' || child.type === 'html')
          protectedMaterial.push(entry(source, child, child.type, inlineText(child, true)));
        if (child.type === 'html') {
          hasInlineHtml = true;
          const html = htmlText(source, child, context);
          for (const caption of html.captions)
            surfaces.push(quotationPass(caption, context, findings, file));
        }
        if (child.type === 'image' || child.type === 'imageReference')
          surfaces.push(
            quotationPass(
              entry(source, child, 'caption', child.alt ?? ''),
              context,
              findings,
              file,
            ),
          );
        for (const grandchild of child.children ?? []) collectInline(grandchild);
      };
      for (const child of node.children ?? []) collectInline(child);
      if (hasInlineHtml) reviewHtml(item);
      return;
    }
    if (node.type === 'html') {
      const html = htmlText(source, node, context);
      reviewHtmlQuotations(html);
      for (const h of html.headings) {
        headings.push(h);
        surfaces.push(quotationPass(h, context, findings, file));
      }
      for (const caption of html.captions)
        surfaces.push(quotationPass(caption, context, findings, file));
      const item = html.item;
      if (item.text || item.semanticText)
        surfaces.push(quotationPass(item, context, findings, file));
      reviewHtml(item);
      bodyText.push(...html.passages);
      return;
    }
    let previous = context;
    const children = node.children ?? [];
    for (const [index, child] of children.entries()) {
      const next = children[index + 1];
      collect(child, previous, next?.type === 'paragraph' ? inlineText(next) : '');
      previous = inlineText(child);
    }
  };
  collect(tree);
  for (const item of fields) {
    // BlogPost.astro escapes these expressions as plain text. Backticks,
    // image syntax and HTML-like strings are visible characters, not markup.
    surfaces.push(quotationPass({ ...item, semanticText: item.text, rendered: item.text }, '', findings, file));
  }
  const headingForms = new Set(
    headings.map((h) => h.convention ?? (h.excerpt.trimStart().startsWith('#') ? 'ATX' : 'setext')),
  );
  if (headingForms.size > 1)
    findings.push(
      finding(
        'voice.heading-convention',
        'error',
        headings.at(-1),
        'Body headings mix ATX, setext or HTML conventions. Preserve fragment anchors when making the convention consistent.',
        file,
      ),
    );
  const quoteStyles = new Set(surfaces.flatMap((s) => s.quoteStyles));
  if (quoteStyles.size > 1 && !findings.some((f) => f.rule === 'voice.quotation-treatment'))
    findings.push(
      finding(
        'voice.quotation-treatment',
        'error',
        surfaces.find((s) => s.quoteStyles.includes('curly')),
        'Body and metadata mix straight and curly double quotation treatment outside attributed source quotations.',
        file,
      ),
    );
  for (const item of fields.filter((f) => /^pullquotes\.\d+\.text$/u.test(f.field))) {
    const quote = normalize(item.text);
    if (!quote || !bodyText.some(({ text, prose }) => containsVerbatim(text, quote, prose)))
      findings.push(
        finding(
          'voice.pullquote-verbatim',
          'error',
          item,
          'The decoded pullquote must occur verbatim within one body passage after Markdown formatting and whitespace normalization. Punctuation, case and wording are preserved; paraphrase is not equivalent.',
          file,
        ),
      );
  }
  packetMetadata.push(...fields.filter((item) => item.kind === 'diagram-metadata'));
  return { source, file, metadata, fields, packetMetadata, surfaces, headings, protectedMaterial, findings };
}

function runMechanical(article, properNouns) {
  const version = spawnSync('vale', ['--version'], { encoding: 'utf8' });
  const pinned = readFileSync(join(repositoryRoot, '.vale-version'), 'utf8').trim();
  if (version.status !== 0 || version.stdout.trim().split(/\s/u).at(-1) !== pinned)
    throw new VoiceError(
      `The checker requires local Vale ${pinned}; install the repository-pinned version. No automatic install or partial success.`,
      3,
    );
  const temporary = mkdtempSync(join(tmpdir(), 'blog-voice-'));
  try {
    const style = join(temporary, 'styles', 'Voice');
    mkdirSync(style, { recursive: true });
    for (const name of readdirSync(join(repositoryRoot, 'styles', 'Voice')))
      writeFileSync(join(style, name), readFileSync(join(repositoryRoot, 'styles', 'Voice', name)));
    const sentenceRulePath = join(style, 'SentenceCase.yml');
    const rule = parseDocument(readFileSync(sentenceRulePath, 'utf8'));
    const acronyms = article.headings.flatMap((h) => h.text.match(/\b[A-Z][A-Z0-9]{1,}\b/gu) ?? []);
    for (const noun of [...new Set([...properNouns, ...acronyms])])
      rule.get('exceptions', true).add(noun);
    writeFileSync(sentenceRulePath, String(rule));
    const config = join(temporary, 'vale.ini');
    writeFileSync(
      config,
      `StylesPath = ${join(temporary, 'styles')}\nMinAlertLevel = warning\n[*.md]\nBasedOnStyles = Voice\n[*.txt]\nBasedOnStyles = Voice\n`,
    );
    const projection = join(temporary, 'authored.md');
    const lineMap = new Map();
    const fileMaps = new Map();
    const files = [];
    const lines = [];
    const addProse = (text, item, ambiguous) => {
      const path = join(temporary, `prose-${files.length}.txt`);
      writeFileSync(path, normalize(text) + '\n');
      files.push(path);
      fileMaps.set(realpathSync(path), new Map([[1, { item, ambiguous }]]));
    };
    for (const surface of article.surfaces) {
      const text = normalize(surface.projected);
      // The approved batch permits a capital first word in a colon-delimited subtitle.
      const parts = surface.kind === 'heading' ? text.split(/:\s+/u) : [text];
      for (const [index, rawPart] of parts.entries()) {
        if (!rawPart) continue;
        const part =
          surface.kind === 'heading' && index > 0
            ? rawPart.replace(/^[a-z]+(?=\b)/u, (word) => word[0].toUpperCase() + word.slice(1))
            : rawPart;
        if (surface.kind === 'heading') {
          lineMap.set(lines.length + 1, { item: surface, ambiguous: false });
          lines.push('## ' + escapeProse(part), '');
        } else addProse(part, surface, false);
      }
      for (const quotation of surface.uncertainQuotes ?? []) {
        addProse(quotation, surface, true);
      }
    }
    if (lines.length) {
      writeFileSync(projection, lines.join('\n'));
      files.push(projection);
      fileMaps.set(realpathSync(projection), lineMap);
    }
    const report = runVale(files, { config });
    const ids = {
      'Voice.SentenceCase': 'voice.heading-sentence-case',
      'Voice.AmericanEnglish': 'voice.american-spelling',
      'Voice.SourceApostrophes': 'voice.source-apostrophe',
      'Voice.NarratorPlural': 'voice.narrator-plural',
    };
    for (const [path, alerts] of Object.entries(report))
      for (const alert of alerts) {
        const mapped = fileMaps.get(realpathSync(path))?.get(alert.Line);
        if (!mapped || !ids[alert.Check])
          throw new VoiceError('Vale returned an unmapped finding', 3);
        article.findings.push(
          mapped.ambiguous
            ? finding(
                'review.quotation-attribution',
                'warning',
                mapped.item,
                `Quoted text matches ${ids[alert.Check]}, but attribution is ambiguous. Preserve it and confirm the speaker, source or hypothetical use manually.`,
                article.file,
              )
            : finding(ids[alert.Check], 'error', mapped.item, alert.Message, article.file),
        );
      }
  } catch (error) {
    if (error instanceof VoiceError) throw error;
    throw new VoiceError(error.message, 3);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
function editorialWarnings(article) {
  const seenSentences = new Map();
  const seenOpenings = new Map();
  const seenDurations = new Map();
  const rules = [
    [
      'review.vague-signpost',
      /\b(?:it is worth noting|it's worth noting|the key takeaway|at the end of the day|in this post|the lesson here)\b/iu,
      'Check whether this signpost earns its place or can name the decision directly.',
    ],
    [
      'review.abstract-narration',
      /\b(?:this (?:highlights|underscores|demonstrates)|the (?:journey|landscape|paradigm)|serves as a reminder)\b/iu,
      'Check whether an actor, action or concrete example would carry this thought better.',
    ],
    [
      'review.defensive-hedging',
      /\b(?:to be fair|arguably|perhaps|in some sense|it could be argued|just to be clear)\b/iu,
      'Check whether this is a necessary factual qualification or defensive setup. Preserve real uncertainty.',
    ],
    [
      'review.formulaic-contrast',
      /\b(?:not .{1,100},? but |was never .{1,100}\. It was |isn't .{1,100}\. It(?:'s| is) )/iu,
      'Judge this contrast in context. Authentic lines such as the trust-burden contrast are allowed; this warning never rejects prose.',
    ],
  ];
  for (const item of article.surfaces.filter((s) => s.kind === 'paragraph')) {
    const text = normalize(item.projected);
    for (const [rule, pattern, reason] of rules)
      if (pattern.test(text))
        article.findings.push(finding(rule, 'warning', item, reason, article.file));
    const opening = text.split(/\s+/u).slice(0, 4).join(' ').toLowerCase();
    if (
      /^(?:at first|the first|what helped|what changed|this was|the problem|i wanted)\b/iu.test(
        opening,
      )
    ) {
      if (seenOpenings.has(opening))
        article.findings.push(
          finding(
            'review.repeated-opening',
            'warning',
            item,
            `Repeated opening '${opening}'. Compare with line ${seenOpenings.get(opening)}; variation is a judgment, not a quota.`,
            article.file,
          ),
        );
      else seenOpenings.set(opening, item.location.start.line);
    }
    for (const sentence of text.split(/(?<=[.!?])\s+/u)) {
      if (sentence.split(/\s+/u).length < 6) continue;
      if (seenSentences.has(sentence))
        article.findings.push(
          finding(
            'review.repeated-explanation',
            'warning',
            item,
            `Exact repeated sentence also appears at line ${seenSentences.get(sentence)}. Check whether repetition is intentional; paraphrased repetition is a manual-review blind spot.`,
            article.file,
          ),
        );
      else seenSentences.set(sentence, item.location.start.line);
    }
    for (const match of text.matchAll(
      /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve|twenty)[ -](?:seconds?|minutes?|hours?|days?|weeks?|months?|years?)\b/giu,
    )) {
      const duration = match[0].toLowerCase();
      if (seenDurations.has(duration))
        article.findings.push(
          finding(
            'review.repeated-duration',
            'warning',
            item,
            `Duration '${duration}' also appears at line ${seenDurations.get(duration)}. Distinct events may legitimately have the same duration.`,
            article.file,
          ),
        );
      else seenDurations.set(duration, item.location.start.line);
    }
  }
}
function sourceDiff(before, after) {
  const temporary = mkdtempSync(join(tmpdir(), 'voice-diff-'));
  try {
    const a = join(temporary, 'before.md');
    const b = join(temporary, 'after.md');
    writeFileSync(a, before);
    writeFileSync(b, after);
    const result = spawnSync(
      'git',
      ['diff', '--no-index', '--no-ext-diff', '--no-textconv', '--', a, b],
      {
        encoding: 'utf8',
        maxBuffer: 20 * 1024 * 1024,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', GIT_NO_LAZY_FETCH: '1' },
      },
    );
    if (result.error || ![0, 1].includes(result.status))
      throw new VoiceError(
        `Cannot produce review diff: ${result.error?.message ?? result.stderr}`,
        3,
      );
    return result.stdout.replaceAll(temporary + '/', '');
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
function tokenCounts(article) {
  const tokens =
    article.surfaces
      .map((s) => s.semanticText ?? s.text)
      .concat(article.protectedMaterial.filter((s) => s.kind === 'blockquote').map((s) => s.semanticText))
      .join(' ')
      .match(semanticTokens) ?? [];
  return tokens.map((t) => t.toLowerCase().replaceAll('’', "'")).sort();
}
export async function checkVoice({
  source,
  file,
  beforeSource = null,
  baseline = { kind: 'new-post', commit: null },
  properNouns = [],
  reviewContext = {},
}) {
  const after = await parseArticle(source, file);
  const before =
    beforeSource === null ? null : await parseArticle(beforeSource, baseline.path ?? file);
  runMechanical(after, properNouns);
  editorialWarnings(after);
  if (before && before.source !== after.source) {
    const item = after.surfaces[0] ?? {
      kind: 'article',
      excerpt: source,
      location: location(source, 0, source.length),
    };
    after.findings.push(
      finding(
        'review.changed-passages',
        'warning',
        item,
        'Read every changed passage and both complete articles. Lexical checks cannot establish thesis, accountability, actor attribution, chronology or causal strength.',
        file,
      ),
    );
    if (JSON.stringify(tokenCounts(before)) !== JSON.stringify(tokenCounts(after)))
      after.findings.push(
        finding(
          'review.negation-modal-change',
          'warning',
          item,
          'Negation, modal or planned-work tokens changed. Compare their subjects and scopes; token counts cannot prove semantics or detect every inversion.',
          file,
        ),
      );
    if (JSON.stringify(before.metadata) !== JSON.stringify(after.metadata))
      after.findings.push(
        finding(
          'review.metadata-change',
          'warning',
          item,
          'Metadata changed. Read it alongside the body, diagrams, ledgers and cross-post claims; a deck can strengthen causation even when the body stays correct.',
          file,
        ),
      );
    if (
      JSON.stringify(before.protectedMaterial.map((p) => p.excerpt)) !==
      JSON.stringify(after.protectedMaterial.map((p) => p.excerpt))
    )
      after.findings.push(
        finding(
          'review.protected-material-change',
          'warning',
          item,
          'Protected material or its order changed. Inspect the complete sources and the unchanged brevity checker; document each intentional exception with its reason.',
          file,
        ),
      );
  }
  const unique = new Map();
  for (const f of after.findings)
    unique.set([f.rule, f.location.start.offset, f.reason].join(':'), f);
  const findings = [...unique.values()].sort(
    (a, b) => a.location.start.offset - b.location.start.offset || a.rule.localeCompare(b.rule),
  );
  const fieldNames = [...new Set([...(before?.packetMetadata ?? []), ...after.packetMetadata].map((f) => f.field))];
  const packet = {
    manualMeaningReviewRequired: true,
    responsibilities:
      'Codex applies the writing style with Write Like Me or an explicit supplied-reference fallback. The checker reports mechanical rules and advisory prompts. The owner judges voice and meaning.',
    baseline,
    before: before
      ? { file: before.file, sha256: hash(before.source), source: before.source }
      : null,
    after: { file, sha256: hash(source), source },
    changedPassages: before
      ? sourceDiff(before.source, source)
      : 'New post: review the complete article; no before article was supplied.',
    visibleMetadata: fieldNames.map((field) => ({
      field,
      before: before?.packetMetadata.find((f) => f.field === field) ?? null,
      after: after.packetMetadata.find((f) => f.field === field) ?? null,
    })),
    protectedMaterial: { before: before?.protectedMaterial ?? [], after: after.protectedMaterial },
    approvalSummary: {
      writingStylePass:
        reviewContext.writingStylePass ??
        'Not supplied: the agent must state the actual skill/reference/retrieval route used, or the unavailable-feature fallback. The CLI does not invoke or verify it.',
      structuralChoices:
        reviewContext.structuralChoices ??
        'Not supplied: record structural choices before approval.',
      qualifications:
        reviewContext.qualifications ?? 'Not supplied: record preserved factual qualifications.',
      validation: reviewContext.validation ?? 'Not supplied: record validation and its limits.',
      occurrenceExceptions:
        reviewContext.occurrenceExceptions ??
        'Not supplied: run verify-brevity.py for revisions and explain intentional occurrence exceptions.',
      referenceProvenance:
        reviewContext.referenceProvenance ??
        'Not supplied: distinguish user-authored references from owner-approved model revisions.',
      linkedRecords:
        reviewContext.linkedRecords ??
        'Not supplied: enumerate linked ledgers and cross-post claims.',
    },
    checklist: meaningChecklist,
    warnings: findings.filter((f) => f.severity === 'warning'),
    warningDisposition:
      reviewContext.warningDispositions ??
      'Not yet supplied: for each warning record keep/fix plus reason. Warnings are advisory; this packet is not owner approval.',
  };
  return {
    schemaVersion: 1,
    file,
    baseline,
    properNouns,
    manualMeaningReviewRequired: true,
    findings,
    exitCode: findings.some((f) => f.severity === 'error') ? 1 : 0,
    packet,
  };
}
export function readableReport(report, packet = false) {
  const lines = [
    `Blog voice check: ${report.file}`,
    `Baseline: ${JSON.stringify(report.baseline)}`,
  ];
  for (const f of report.findings)
    lines.push(
      `${f.file}:${f.location.start.line}:${f.location.start.column}: ${f.severity} ${f.rule}: ${f.reason}`,
      `  ${f.excerpt.replace(/\n/gu, '\n  ')}`,
    );
  lines.push(
    `Mechanical result: ${report.exitCode ? 'violations' : 'pass'}. Editorial warnings are advisory.`,
    'Complete manual meaning review remains required. The owner judges voice and meaning.',
  );
  if (packet) {
    lines.push(
      '\n# Manual review packet',
      report.packet.responsibilities,
      '\n## Approval summary',
      JSON.stringify(report.packet.approvalSummary, null, 2),
      '\n## Meaning checklist',
      ...report.packet.checklist.map((s) => `- [ ] ${s}`),
      '\n## Visible metadata together',
      JSON.stringify(report.packet.visibleMetadata, null, 2),
      '\n## Source integrity',
      JSON.stringify({
        before: report.packet.before
          ? { file: report.packet.before.file, sha256: report.packet.before.sha256 }
          : null,
        after: { file: report.packet.after.file, sha256: report.packet.after.sha256 },
      }, null, 2),
      '\n## Protected material together',
      JSON.stringify(report.packet.protectedMaterial, null, 2),
      '\n## Changed passages',
      report.packet.changedPassages,
      '\n## Complete before article',
      report.packet.before?.source ?? '(New post; no baseline supplied.)',
      '\n## Complete after article',
      report.packet.after.source,
      '\n## Warning disposition',
      typeof report.packet.warningDisposition === 'string'
        ? report.packet.warningDisposition
        : JSON.stringify(report.packet.warningDisposition, null, 2),
    );
  }
  return lines.join('\n') + '\n';
}
