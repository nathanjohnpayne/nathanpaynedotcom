#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { decodeNamedCharacterReference } from 'decode-named-character-reference';
import { gfm } from 'micromark-extension-gfm';

const CONTENT_ROOT = resolve(process.cwd(), 'src/content');

// Markdown is parsed; YAML is scanned line by line. `.mdx` is deliberately
// absent: the body is parsed as CommonMark + GFM, which does not recognize MDX
// expressions or JSX, so an `.mdx` file would have its embedded code read as
// prose and potentially rewritten. Adding it back requires an MDX-aware parser
// that can exclude expression and JSX node spans.
const MARKDOWN_EXTENSIONS = new Set(['.md']);
const YAML_EXTENSIONS = new Set(['.yaml', '.yml']);
const TARGET_EXTENSIONS = new Set([...MARKDOWN_EXTENSIONS, ...YAML_EXTENSIONS]);

// Padding is any rendered horizontal space. `\p{Zs}` covers the whole Unicode
// space-separator category — ordinary, no-break, narrow no-break, thin, and
// the rest — because pasted prose carries them and each renders as the gap
// the rule prohibits. A line break is deliberately excluded: the prose stream
// below turns a soft break into a space and everything else into `\n`, so a
// newline surviving in the stream is a boundary padding may not cross.
const PADDED_EM_DASH = /[\p{Zs}\t]*—[\p{Zs}\t]*/gu;

// `[DST-047 — Title]` keeps its separator: the dash after the identifier is a
// delimiter, not prose punctuation. Matched against raw source so it covers
// both a Markdown link label and a plain bracketed label; the match stops at
// the separator, so any *later* dash in the same label is still linted.
const IDENTIFIER_LABEL_EXCEPTION = /\[[A-Z]{2,}[A-Z0-9_-]*-\d+[\p{Zs}\t]+—[\p{Zs}\t]+/gu;

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

// Everything before a value on a YAML line: indentation, sequence dashes, and
// an optional `key:`. Whitespace that follows such a prefix is YAML syntax,
// not prose padding — rewriting it would turn `title: —` into `title:—` and
// break the frontmatter mapping.
const YAML_VALUE_PREFIX = /^[\p{Zs}\t]*(?:-[\p{Zs}\t]*)*(?:[^:\n]+:)?[\p{Zs}\t]*$/u;

// HTML elements whose content is raw text or code rather than prose. Their
// bodies are left alone: rewriting `<pre>a — b</pre>` would edit a code
// sample, and rewriting a `<script>` string would edit executable source.
const HTML_RAW_TEXT_ELEMENT = /<(script|style|pre|code|textarea)\b[\s\S]*?<\/\1\s*>/gi;
const HTML_MARKUP = /<!--[\s\S]*?-->|<[^>]*>/g;

// Block-level nodes. Padding may not run across their edges, because the
// rendered output puts a line break there.
const BLOCK_NODES = new Set([
  'blockquote',
  'definition',
  'footnoteDefinition',
  'heading',
  'list',
  'listItem',
  'paragraph',
  'table',
  'tableCell',
  'tableRow',
  'thematicBreak',
]);

// Nodes that render no prose at all. `code` and `inlineCode` are code;
// `image` alt text is not addressed by this rule; `break` is a hard line
// break, which is a boundary rather than padding.
const OPAQUE_NODES = new Set(['break', 'code', 'image', 'inlineCode']);

function collectMatchRanges(regex, source) {
  const cloned = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  const ranges = [];
  let match;
  while ((match = cloned.exec(source)) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
  }
  return ranges;
}

function frontmatterLength(source) {
  const match = source.match(FRONTMATTER);
  return match ? match[0].length : 0;
}

// ---------------------------------------------------------------------------
// Rendered prose stream
//
// The scan runs over what the Markdown *renders*, not over its source. That is
// what lets it see a dash padded through inline markup (`word **—** next`), a
// character reference (`word &mdash; next`), or a soft line break, none of
// which a raw-source regex can match. Every stream character carries the
// source span that produced it, so a fix can still be applied as a precise
// source edit.
// ---------------------------------------------------------------------------

function createProseStream() {
  return { text: '', spans: [] };
}

// One span per UTF-16 unit, not per code point: the stream is matched with a
// regex, whose indices are UTF-16 offsets. A supplementary-plane character
// (`&#x1F600;`) occupies two units, and pushing one span for it would
// desynchronize every span after it.
function pushCharacter(stream, character, span) {
  stream.text += character;
  for (let unit = 0; unit < character.length; unit += 1) {
    stream.spans.push(span);
  }
}

// A boundary is a newline the padding rule may not cross: a block edge, a hard
// break, code, an image. It has no source span, so it is never rewritten.
function pushBoundary(stream) {
  if (stream.text.length > 0 && !stream.text.endsWith('\n')) {
    pushCharacter(stream, '\n', null);
  }
}

// Decode a character reference body (the text between `&` and `;`).
function decodeReference(name) {
  if (name.startsWith('#')) {
    const digits = name.slice(1);
    const code = /^[xX]/.test(digits) ? Number.parseInt(digits.slice(1), 16) : Number.parseInt(digits, 10);
    if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) {
      return null;
    }
    try {
      return String.fromCodePoint(code);
    } catch {
      return null;
    }
  }

  return decodeNamedCharacterReference(name) || null;
}

// Map each code point of a node's decoded value back to the source span that
// produced it. The two run at different lengths wherever the source used a
// character reference or a backslash escape — and a single reference can
// decode to several code points (`&NotEqualTilde;`) or to a supplementary-plane
// one (`&#x1F600;`), so the reference is decoded rather than assumed to be one
// character. Getting this wrong desynchronizes every span after it, which
// would make `--write` corrupt the file.
function alignValueToSource(value, raw) {
  const characters = [...value];
  const spans = new Array(characters.length);
  let index = 0;
  let cursor = 0;

  while (index < characters.length) {
    if (cursor >= raw.length) {
      spans[index] = [raw.length, raw.length];
      index += 1;
      continue;
    }

    if (raw.startsWith(characters[index], cursor)) {
      spans[index] = [cursor, cursor + characters[index].length];
      cursor += characters[index].length;
      index += 1;
      continue;
    }

    if (raw[cursor] === '&') {
      const semicolon = raw.indexOf(';', cursor);
      const decoded = semicolon !== -1 && semicolon - cursor <= 32
        ? decodeReference(raw.slice(cursor + 1, semicolon))
        : null;

      if (decoded !== null) {
        const span = [cursor, semicolon + 1];
        for (let produced = 0; produced < [...decoded].length && index < characters.length; produced += 1) {
          spans[index] = span;
          index += 1;
        }
        cursor = semicolon + 1;
        continue;
      }
    }

    if (raw[cursor] === '\\') {
      spans[index] = [cursor, cursor + 2];
      cursor += 2;
      index += 1;
      continue;
    }

    spans[index] = [cursor, cursor + 1];
    cursor += 1;
    index += 1;
  }

  return spans;
}

function emitText(node, body, stream) {
  const start = node.position.start.offset;
  const raw = body.slice(start, node.position.end.offset);
  const spans = alignValueToSource(node.value, raw);

  [...node.value].forEach((character, index) => {
    const [spanStart, spanEnd] = spans[index];
    const span = [spanStart + start, spanEnd + start];

    // A soft break renders as a space, so it is padding. Removing it is safe:
    // the parser has already established that both sides sit inside one text
    // node in one block, so closing the gap cannot glue two blocks together.
    if (character === '\n') {
      pushCharacter(stream, ' ', span);
      return;
    }

    pushCharacter(stream, character, span);
  });
}

// A raw-HTML span is not uniformly opaque: the tags are markup, the body of a
// raw-text element is code, and everything else between tags is visible prose.
function emitHtml(node, body, stream) {
  const start = node.position.start.offset;
  const raw = body.slice(start, node.position.end.offset);
  const skip = [
    ...collectMatchRanges(HTML_RAW_TEXT_ELEMENT, raw),
    ...collectMatchRanges(HTML_MARKUP, raw),
  ];

  pushBoundary(stream);
  for (let index = 0; index < raw.length; index += 1) {
    if (skip.some(([skipStart, skipEnd]) => index >= skipStart && index < skipEnd)) {
      pushBoundary(stream);
      continue;
    }
    pushCharacter(stream, raw[index], [index + start, index + start + 1]);
  }
  pushBoundary(stream);
}

// A link title (`[a](/url "title")`) is published text, so it is scanned. The
// destination never is.
function emitLinkTitle(node, body, stream) {
  if (!node.title) {
    return;
  }

  const nodeEnd = node.position.end.offset;
  const titleStart = body.lastIndexOf(node.title, nodeEnd);
  if (titleStart === -1 || titleStart < node.position.start.offset) {
    return;
  }

  pushBoundary(stream);
  // Indexed by UTF-16 unit, not code point: a supplementary character such as
  // an emoji occupies two units, and walking code points while treating the
  // index as a source offset shifts every span after it — which would make
  // `--write` delete prose instead of the padding around the dash.
  for (let unit = 0; unit < node.title.length; unit += 1) {
    pushCharacter(stream, node.title[unit], [titleStart + unit, titleStart + unit + 1]);
  }
  pushBoundary(stream);
}

function emitNode(node, body, stream) {
  if (OPAQUE_NODES.has(node.type)) {
    pushBoundary(stream);
    return;
  }

  if (node.type === 'text') {
    emitText(node, body, stream);
    return;
  }

  if (node.type === 'html') {
    emitHtml(node, body, stream);
    return;
  }

  const isBlock = BLOCK_NODES.has(node.type);
  if (isBlock) {
    pushBoundary(stream);
  }

  for (const child of node.children ?? []) {
    emitNode(child, body, stream);
  }

  if (node.type === 'link' || node.type === 'linkReference') {
    emitLinkTitle(node, body, stream);
  }

  if (isBlock) {
    pushBoundary(stream);
  }
}

// Astro enables GFM by default, so the gate parses with it too. Without the
// extension a table row is read as a paragraph and its cell-separator padding
// looks like prose padding, which `--write` would then "fix" into the table.
function buildProseStream(body) {
  const stream = createProseStream();
  const tree = fromMarkdown(body, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  emitNode(tree, body, stream);
  return stream;
}

// ---------------------------------------------------------------------------
// Violations
// ---------------------------------------------------------------------------

// A violation is a dash plus the source spans of the padding around it. The
// spans are what a fix deletes; the dash itself is never touched.
function bodyViolations(source) {
  const bodyStart = frontmatterLength(source);
  const stream = buildProseStream(source.slice(bodyStart));
  const exceptionRanges = collectMatchRanges(IDENTIFIER_LABEL_EXCEPTION, source);
  const violations = [];

  for (const [start, end] of collectMatchRanges(PADDED_EM_DASH, stream.text)) {
    const padding = new Map();
    let dashOffset = null;
    let dashKey = null;

    for (let index = start; index < end; index += 1) {
      const span = stream.spans[index];
      if (!span) {
        continue;
      }
      const key = `${span[0]}:${span[1]}`;
      if (stream.text[index] === '—') {
        dashOffset = span[0] + bodyStart;
        dashKey = key;
        continue;
      }
      padding.set(key, [span[0] + bodyStart, span[1] + bodyStart]);
    }

    // A single character reference can decode to both the dash and something
    // adjacent; never delete the span that produced the dash.
    padding.delete(dashKey);
    const removals = [...padding.values()];

    if (dashOffset === null || end - start < 2) {
      continue;
    }
    if (exceptionRanges.some(([rangeStart, rangeEnd]) => dashOffset >= rangeStart && dashOffset < rangeEnd)) {
      continue;
    }

    violations.push({ offset: dashOffset, removals });
  }

  return violations;
}

// Strip a YAML end-of-line comment, without mistaking a `#` inside a quoted
// scalar for one.
// A `key: |` or `key: >` line opens a block scalar, whose following indented
// lines are literal content: a `#` there is prose, not a comment. Returns the
// indentation of the opening line, or null when the line opens nothing.
const BLOCK_SCALAR_OPENER = /^([\p{Zs}\t]*)(?:-[\p{Zs}\t]+)*(?:[^:\n]+:)?[\p{Zs}\t]*[|>][-+]?\d*[\p{Zs}\t]*$/u;

function blockScalarIndentOf(line) {
  const match = line.match(BLOCK_SCALAR_OPENER);
  return match ? match[1].length : null;
}

function indentOf(line) {
  return line.length - line.replace(/^[\p{Zs}\t]*/u, '').length;
}

function yamlCommentStart(line) {
  let quote = null;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (quote) {
      if (character === '\\' && quote === '"') {
        index += 1;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }

    if (character === '#' && (index === 0 || /[\p{Zs}\t]/u.test(line[index - 1]))) {
      return index;
    }
  }

  return line.length;
}

// YAML carries a lot of this repo's published prose: frontmatter titles, card
// copy and pull quotes, and the `src/content/skills/**` collection, which is
// authored as standalone YAML and rendered onto the resume. It is scanned line
// by line rather than parsed as Markdown: a line break separates scalars
// rather than joining them, structural prefixes are not padding, and comments
// are not published.
function yamlViolations(source, end) {
  if (end === 0) {
    return [];
  }

  const exceptionRanges = collectMatchRanges(IDENTIFIER_LABEL_EXCEPTION, source);
  const violations = [];
  let lineStart = 0;
  let blockScalarIndent = null;

  while (lineStart < end) {
    const newline = source.indexOf('\n', lineStart);
    const lineEnd = newline === -1 || newline > end ? end : newline;
    const line = source.slice(lineStart, lineEnd).replace(/\r$/, '');

    // A block scalar runs until a non-blank line dedents back to its opener.
    const isBlank = line.trim() === '';
    if (blockScalarIndent !== null && !isBlank && indentOf(line) <= blockScalarIndent) {
      blockScalarIndent = null;
    }
    const inBlockScalar = blockScalarIndent !== null;
    if (!inBlockScalar && !isBlank) {
      blockScalarIndent = blockScalarIndentOf(line);
    }

    // Inside a block scalar the whole line is literal content: no comment to
    // strip, and no structural prefix to step past.
    const scanEnd = inBlockScalar ? lineEnd : lineStart + yamlCommentStart(line);

    for (const [start, matchEnd] of collectMatchRanges(PADDED_EM_DASH, line)) {
      const absoluteStart = lineStart + start;
      const absoluteEnd = Math.min(lineStart + matchEnd, scanEnd);
      const dashOffset = source.indexOf('—', absoluteStart);
      if (dashOffset === -1 || dashOffset >= scanEnd) {
        continue;
      }

      // Whitespace after `key:` or a sequence `-` is YAML syntax.
      const prefixIsStructural =
        !inBlockScalar && YAML_VALUE_PREFIX.test(source.slice(lineStart, absoluteStart));
      const paddingStart = prefixIsStructural ? dashOffset : absoluteStart;

      const removals = [];
      if (paddingStart < dashOffset) {
        removals.push([paddingStart, dashOffset]);
      }
      if (absoluteEnd > dashOffset + 1) {
        removals.push([dashOffset + 1, absoluteEnd]);
      }

      if (removals.length === 0) {
        continue;
      }
      if (exceptionRanges.some(([rangeStart, rangeEnd]) => dashOffset >= rangeStart && dashOffset < rangeEnd)) {
        continue;
      }

      violations.push({ offset: dashOffset, removals });
    }

    lineStart = lineEnd + 1;
  }

  return violations;
}

function isYamlPath(filePath) {
  return YAML_EXTENSIONS.has(extname(filePath));
}

function collectViolations(source, filePath = '') {
  if (isYamlPath(filePath)) {
    return yamlViolations(source, source.length);
  }

  return [...yamlViolations(source, frontmatterLength(source)), ...bodyViolations(source)].sort(
    (a, b) => a.offset - b.offset,
  );
}

function buildLineIndex(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') {
      starts.push(index + 1);
    }
  }
  return starts;
}

function locationOf(offset, lineStarts, source) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (lineStarts[mid] <= offset) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  const lineStart = lineStarts[low];
  const newline = source.indexOf('\n', lineStart);
  return {
    line: low + 1,
    column: offset - lineStart + 1,
    snippet: source.slice(lineStart, newline === -1 ? source.length : newline).trim(),
  };
}

export function findSpacedEmDashViolations(filePath, source) {
  const lineStarts = buildLineIndex(source);

  return collectViolations(source, filePath).map((violation) => ({
    filePath,
    ...locationOf(violation.removals[0]?.[0] ?? violation.offset, lineStarts, source),
  }));
}

export function closeUpSpacedEmDashesInText(source, filePath = '') {
  const removals = collectViolations(source, filePath)
    .flatMap((violation) => violation.removals)
    .sort((a, b) => a[0] - b[0]);

  let fixed = '';
  let cursor = 0;

  for (const [start, end] of removals) {
    if (start < cursor) {
      continue;
    }
    fixed += source.slice(cursor, start);
    cursor = end;
  }

  // Splicing the original string leaves every byte outside a removal
  // untouched, so a CRLF file stays CRLF.
  return fixed + source.slice(cursor);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function collectContentFiles(dir) {
  const fileEntries = readdirSync(dir, { withFileTypes: true });
  let files = [];

  for (const entry of fileEntries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectContentFiles(fullPath));
      continue;
    }

    if (TARGET_EXTENSIONS.has(extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return files;
}

function scanFiles(files) {
  let violations = [];

  for (const filePath of files) {
    violations = violations.concat(
      findSpacedEmDashViolations(filePath, readFileSync(filePath, 'utf8')),
    );
  }

  return violations;
}

function reportViolations(violations) {
  for (const violation of violations) {
    console.error(
      `${violation.filePath}:${violation.line}:${violation.column}: use an unspaced em dash (—).`,
    );
    if (violation.snippet) {
      console.error(`  ${violation.snippet}`);
    }
  }
}

function printUsageAndExit(code = 0) {
  console.log(`Usage:
  node scripts/lint-content-em-dash.mjs [--write]

Checks for spaced em dashes in src/content markdown files and reports violations.
Exceptions: bracketed ID-title labels such as [DST-047 — Title] remain allowed.`);
  process.exit(code);
}

function main() {
  const args = process.argv.slice(2);
  const applyWrite = args.includes('--write');

  if (args.includes('-h') || args.includes('--help')) {
    printUsageAndExit(0);
  }

  const files = collectContentFiles(CONTENT_ROOT);

  if (!applyWrite) {
    const violations = scanFiles(files);
    if (violations.length > 0) {
      reportViolations(violations);
      process.exit(1);
    }
    return;
  }

  let fixedCount = 0;

  for (const filePath of files) {
    const source = readFileSync(filePath, 'utf8');
    const fixedSource = closeUpSpacedEmDashesInText(source, filePath);
    if (fixedSource !== source) {
      writeFileSync(filePath, fixedSource, 'utf8');
      fixedCount += 1;
    }
  }

  console.log(`content em-dash lint: fixed ${fixedCount} file${fixedCount === 1 ? '' : 's'}`);

  // A write pass that leaves violations behind must not report success.
  const remaining = scanFiles(files);
  if (remaining.length > 0) {
    console.error('content em-dash lint: violations remain after --write.');
    reportViolations(remaining);
    process.exit(1);
  }
}

// Importing this module for its helpers must not run a repository-wide scan
// or call process.exit().
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
