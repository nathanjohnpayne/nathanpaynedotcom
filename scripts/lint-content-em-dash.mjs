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
// The key may be quoted, in which case it can legally contain a colon
// (`"a:b": value`), so a bare `[^:]+` would mistake the key's own colon for the
// mapping separator and treat the required space after it as prose padding.
const YAML_VALUE_PREFIX =
  /^[\p{Zs}\t]*(?:-[\p{Zs}\t]*)*(?:(?:"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^:\n]+):)?[\p{Zs}\t]*$/u;

// HTML elements whose content is raw text or code rather than prose. Their
// bodies are left alone: rewriting `<pre>a — b</pre>` would edit a code
// sample, and rewriting a `<script>` string would edit executable source.
const HTML_RAW_TEXT_ELEMENT = /<(script|style|pre|code|textarea)\b[\s\S]*?<\/\1\s*>/gi;
const HTML_RAW_TEXT_OPENER = /<(script|style|pre|code|textarea)\b[^>]*>/gi;
// A tag ends at the first `>` that is NOT inside a quoted attribute value.
// `<div title="a > b">` is one tag, not a tag plus stray prose.
const HTML_MARKUP = /<!--[\s\S]*?-->|<[^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/g;

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

function createProseStream(protectedRanges = []) {
  return { text: '', spans: [], protectedRanges };
}

function isProtectedOffset(stream, span) {
  return (
    span !== null &&
    stream.protectedRanges.some(([start, end]) => span[0] >= start && span[0] < end)
  );
}

// One span per UTF-16 unit, not per code point: the stream is matched with a
// regex, whose indices are UTF-16 offsets. A supplementary-plane character
// (`&#x1F600;`) occupies two units, and pushing one span for it would
// desynchronize every span after it.
function pushCharacter(stream, character, span) {
  // mdast splits inline HTML into separate opener, text, and closer nodes, so
  // `<code>a — b</code>` reaches this function as three siblings. Raw-text
  // ranges are computed over the whole body and applied here, or the middle
  // text node would be linted and `--write` would edit the code sample.
  if (isProtectedOffset(stream, span)) {
    pushBoundary(stream);
    return;
  }

  stream.text += character;
  for (let unit = 0; unit < character.length; unit += 1) {
    stream.spans.push(span);
  }
}

// A boundary is a newline the padding rule may not cross: a block edge, a hard
// break, code, an image. It has no source span, so it is never rewritten.
function pushBoundary(stream) {
  if (stream.text.length > 0 && !stream.text.endsWith('\n')) {
    stream.text += '\n';
    stream.spans.push(null);
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

// Tags that render as a break even inline.
const HTML_BREAK_TAG = /^<\/?(?:br|hr)\b/i;

// Emit one run of visible HTML text, decoding character references so
// `<div>word &mdash; next</div>` is seen the way it renders. Returns the index
// just past the run's first character.
function emitVisibleCharacter(raw, index, start, stream) {
  if (raw[index] === '&') {
    const semicolon = raw.indexOf(';', index);
    const decoded =
      semicolon !== -1 && semicolon - index <= 32
        ? decodeReference(raw.slice(index + 1, semicolon))
        : null;

    if (decoded !== null) {
      const span = [index + start, semicolon + 1 + start];
      for (const character of decoded) {
        pushCharacter(stream, character, span);
      }
      return semicolon + 1;
    }
  }

  pushCharacter(stream, raw[index], [index + start, index + start + 1]);
  return index + 1;
}

// A raw-HTML span is not uniformly opaque: the tags are markup, the body of a
// raw-text element is code, and everything else between tags is visible prose.
// `inline` marks HTML sitting inside a paragraph — omitting its tags must not
// break adjacency, or `word <em>—</em> next` would read as three fragments and
// the rendered padding would go unseen.
function emitHtml(node, body, stream, inline) {
  const start = node.position.start.offset;
  const raw = body.slice(start, node.position.end.offset);
  const markup = collectMatchRanges(HTML_MARKUP, raw);

  if (!inline) {
    pushBoundary(stream);
  }

  let index = 0;
  while (index < raw.length) {
    const markupRange = markup.find(([rangeStart, rangeEnd]) => index >= rangeStart && index < rangeEnd);
    if (markupRange) {
      const tag = raw.slice(markupRange[0], markupRange[1]);
      // A comment or a visual break separates prose; an ordinary inline tag
      // does not.
      if (tag.startsWith('<!--') || HTML_BREAK_TAG.test(tag)) {
        pushBoundary(stream);
      }
      index = markupRange[1];
      continue;
    }

    // Raw-text bodies are filtered by the shared protected ranges in
    // pushCharacter, so they need no special case here.
    index = emitVisibleCharacter(raw, index, start, stream);
  }

  if (!inline) {
    pushBoundary(stream);
  }
}

// The raw span of a title, found from the source syntax rather than by
// searching for the decoded value — a title containing an entity or escape has
// no raw occurrence of what it decodes to. Covers the inline form
// (`[a](/url "title")`) and the reference definition (`[a]: /url "title"`),
// which differ only in whether a closing paren wraps the whole thing.
function linkTitleRange(node, body) {
  const nodeStart = node.position.start.offset;
  const raw = body.slice(nodeStart, node.position.end.offset);

  let index = raw.length - 1;
  while (index >= 0 && /\s/.test(raw[index])) {
    index -= 1;
  }

  // A definition ends at its title; an inline link ends at the paren that
  // closes the destination.
  if (node.type !== 'definition') {
    if (raw[index] !== ')') {
      return null;
    }
    index -= 1;
    while (index >= 0 && /\s/.test(raw[index])) {
      index -= 1;
    }
  }

  const closer = raw[index];
  if (closer !== '"' && closer !== "'" && closer !== ')') {
    return null;
  }
  const opener = closer === ')' ? '(' : closer;

  let cursor = index - 1;
  while (cursor >= 0 && !(raw[cursor] === opener && raw[cursor - 1] !== '\\')) {
    cursor -= 1;
  }
  if (cursor < 0) {
    return null;
  }

  return [nodeStart + cursor + 1, nodeStart + index];
}

// A link title is published text, so it is scanned. The destination never is.
function emitLinkTitle(node, body, stream) {
  if (!node.title) {
    return;
  }

  const range = linkTitleRange(node, body);
  if (!range) {
    return;
  }

  pushBoundary(stream);
  const [titleStart, titleEnd] = range;
  const raw = body.slice(titleStart, titleEnd);
  let index = 0;
  while (index < raw.length) {
    index = emitVisibleCharacter(raw, index, titleStart, stream);
  }
  pushBoundary(stream);
}

// Children of these contain blocks; children of anything else are inline.
const BLOCK_CONTAINERS = new Set([
  'blockquote',
  'footnoteDefinition',
  'list',
  'listItem',
  'root',
  'table',
  'tableRow',
]);

function emitNode(node, body, stream, inline = false) {
  if (OPAQUE_NODES.has(node.type)) {
    pushBoundary(stream);
    return;
  }

  if (node.type === 'text') {
    emitText(node, body, stream);
    return;
  }

  if (node.type === 'html') {
    emitHtml(node, body, stream, inline);
    return;
  }

  const isBlock = BLOCK_NODES.has(node.type);
  if (isBlock) {
    pushBoundary(stream);
  }

  const childrenAreInline = !BLOCK_CONTAINERS.has(node.type);
  for (const child of node.children ?? []) {
    emitNode(child, body, stream, childrenAreInline);
  }

  // A definition's title publishes wherever its reference is used, so it is
  // scanned like an inline link title — but only the definition that actually
  // resolves.
  const isEffectiveDefinition =
    node.type === 'definition' && stream.effectiveDefinitions?.has(node);

  if (node.type === 'link' || node.type === 'linkReference' || isEffectiveDefinition) {
    emitLinkTitle(node, body, stream);
  }

  if (isBlock) {
    pushBoundary(stream);
  }
}

// Astro enables GFM by default, so the gate parses with it too. Without the
// extension a table row is read as a paragraph and its cell-separator padding
// looks like prose padding, which `--write` would then "fix" into the table.
// Every raw-text element span in the body, closed or left open through EOF.
function rawTextRanges(source) {
  const ranges = collectMatchRanges(HTML_RAW_TEXT_ELEMENT, source);
  const openers = new RegExp(HTML_RAW_TEXT_OPENER.source, 'gi');
  let opener;

  while ((opener = openers.exec(source)) !== null) {
    const openerStart = opener.index;
    if (ranges.some(([start, end]) => openerStart >= start && openerStart < end)) {
      continue;
    }
    if (!new RegExp(`</${opener[1]}\\s*>`, 'i').test(source.slice(openers.lastIndex))) {
      ranges.push([openerStart, source.length]);
    }
  }

  return ranges;
}

// The definitions whose titles actually publish. CommonMark resolves a
// reference to the FIRST definition with that identifier, and a definition
// nothing references renders nothing at all — so scanning every definition
// would lint, and `--write` would rewrite, titles that never reach a reader.
function collectEffectiveDefinitions(tree) {
  const referenced = new Set();
  const firstByIdentifier = new Map();

  (function walk(node) {
    if (node.type === 'linkReference' || node.type === 'imageReference') {
      referenced.add(node.identifier);
    } else if (node.type === 'definition' && !firstByIdentifier.has(node.identifier)) {
      firstByIdentifier.set(node.identifier, node);
    }
    for (const child of node.children ?? []) {
      walk(child);
    }
  })(tree);

  const effective = new Set();
  for (const identifier of referenced) {
    const definition = firstByIdentifier.get(identifier);
    if (definition) {
      effective.add(definition);
    }
  }

  return effective;
}

function buildProseStream(body) {
  const stream = createProseStream(rawTextRanges(body));
  const tree = fromMarkdown(body, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
  stream.effectiveDefinitions = collectEffectiveDefinitions(tree);
  emitNode(tree, body, stream);
  return stream;
}

// ---------------------------------------------------------------------------
// Violations
// ---------------------------------------------------------------------------

// A violation is a dash plus the source spans of the padding around it. The
// spans are what a fix deletes; the dash itself is never touched.
// Turn padding matches on a rendered stream into violations. A violation is a
// dash plus the source spans of the padding around it; the spans are what a fix
// deletes, and the dash itself is never touched.
function violationsFromStream(stream, offsetBase, exceptionRanges) {
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
        dashOffset = span[0] + offsetBase;
        dashKey = key;
        continue;
      }
      padding.set(key, [span[0] + offsetBase, span[1] + offsetBase]);
    }

    // A single character reference can decode to both the dash and something
    // adjacent; never delete the span that produced the dash.
    padding.delete(dashKey);
    const removals = [...padding.values()];

    if (dashOffset === null || removals.length === 0) {
      continue;
    }
    if (exceptionRanges.some(([rangeStart, rangeEnd]) => dashOffset >= rangeStart && dashOffset < rangeEnd)) {
      continue;
    }

    violations.push({ offset: dashOffset, removals });
  }

  return violations;
}

function bodyViolations(source) {
  const bodyStart = frontmatterLength(source);
  const stream = buildProseStream(source.slice(bodyStart));
  const exceptionRanges = collectMatchRanges(IDENTIFIER_LABEL_EXCEPTION, source);

  return violationsFromStream(stream, bodyStart, exceptionRanges);
}

// Strip a YAML end-of-line comment, without mistaking a `#` inside a quoted
// scalar for one.
// A `key: |` or `key: >` line opens a block scalar, whose following indented
// lines are literal content: a `#` there is prose, not a comment. Returns the
// indentation of the opening line, or null when the line opens nothing.
// YAML allows the chomping and indentation indicators in either order, so
// `|2-` is as valid as `|-2`.
const BLOCK_SCALAR_OPENER =
  /^([\p{Zs}\t]*)(?:-[\p{Zs}\t]+)*(?:(?:"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^:\n]+):)?[\p{Zs}\t]*([|>])((?:[-+]\d*|\d+[-+]?)?)[\p{Zs}\t]*$/u;

function blockScalarOpenerOf(line) {
  const match = line.match(BLOCK_SCALAR_OPENER);
  if (!match) {
    return null;
  }

  // An explicit indentation indicator (`>2`) fixes the content indentation
  // relative to the opener, and that is what decides which lines are folded
  // and which are more-indented literal lines. Without one it is inferred from
  // the first non-blank content line.
  const digits = match[3].match(/\d+/);
  const indent = match[1].length;

  return {
    indent,
    // `>` folds line breaks into spaces; `|` keeps them literal.
    folded: match[2] === '>',
    contentIndent: digits ? indent + Number(digits[0]) : null,
  };
}

function indentOf(line) {
  return line.length - line.replace(/^[\p{Zs}\t]*/u, '').length;
}

// Scan one YAML line for its comment boundary while tracking quote state.
// `openQuote` carries the state in from a previous line, because a quoted
// scalar may span lines — without it, quoting resets every line and a `#`
// inside a continuation reads as a comment.
function scanYamlLine(line, openQuote = null) {
  let quote = openQuote;
  let quoteStart = -1;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (quote) {
      if (character === '\\' && quote === '"') {
        index += 1;
      } else if (character === quote) {
        // In a single-quoted scalar `''` is an escaped apostrophe, not the
        // closing delimiter.
        if (quote === "'" && line[index + 1] === "'") {
          index += 1;
        } else {
          quote = null;
          quoteStart = -1;
        }
      }
      continue;
    }

    if (character === '"' || character === "'") {
      quote = character;
      quoteStart = index;
      continue;
    }

    if (character === '#' && (index === 0 || /[\p{Zs}\t]/u.test(line[index - 1]))) {
      return { commentStart: index, quote, quoteStart };
    }
  }

  return { commentStart: line.length, quote, quoteStart };
}

// Index at which an already-open quote closes on this line, or -1.
function closeQuoteIndex(line, quote) {
  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === '\\' && quote === '"') {
      index += 1;
      continue;
    }
    if (line[index] === quote) {
      // `''` inside a single-quoted scalar is an escaped apostrophe.
      if (quote === "'" && line[index + 1] === "'") {
        index += 1;
        continue;
      }
      return index;
    }
  }
  return -1;
}

// Emit content segments that YAML folds together. The gap between consecutive
// folded segments renders as a single space, and deleting that gap joins them —
// exactly what the fold already does semantically. `null` marks a blank line,
// which renders as a break rather than a space; a `literal` segment is
// more-indented content that is not folded at all.
function emitFoldedSegments(stream, source, segments) {
  let pendingFold = null;

  for (const segment of segments) {
    if (segment === null) {
      pendingFold = null;
      pushBoundary(stream);
      continue;
    }

    const [segmentStart, segmentEnd, literal] = segment;

    if (literal) {
      // Reset happens after the content is emitted, below.
      pushBoundary(stream);
    } else if (pendingFold !== null) {
      pushCharacter(stream, ' ', [pendingFold, segmentStart]);
    }

    for (let index = segmentStart; index < segmentEnd; index += 1) {
      pushCharacter(stream, source[index], [index, index + 1]);
    }

    if (literal) {
      pushBoundary(stream);
      pendingFold = null;
    } else {
      pendingFold = segmentEnd;
    }
  }
}

// A folded (`>`) scalar joins its lines with spaces, so a dash at the end of
// one line renders padded against the next. Build the folded text as a stream
// whose fold-space carries the source span of the line break plus the following
// indentation — deleting that span joins the lines, which is exactly what the
// fold already does semantically.
function foldedScalarViolations(source, regionStart, regionEnd, baseIndent, exceptionRanges) {
  const segments = [];
  let lineStart = regionStart;

  while (lineStart < regionEnd) {
    const newline = source.indexOf('\n', lineStart);
    const lineEnd = newline === -1 || newline > regionEnd ? regionEnd : newline;
    const line = source.slice(lineStart, lineEnd).replace(/\r$/, '');
    const indent = indentOf(line);

    if (line.trim() === '') {
      segments.push(null);
    } else if (indent > baseIndent) {
      // A more-indented line is literal content: the fold does not apply.
      segments.push([lineStart + indent, lineStart + line.length, true]);
    } else {
      segments.push([
        lineStart + indent,
        lineStart + line.replace(/[\p{Zs}\t]+$/u, '').length,
        false,
      ]);
    }

    lineStart = lineEnd + 1;
  }

  const stream = createProseStream();
  emitFoldedSegments(stream, source, segments);
  return violationsFromStream(stream, 0, exceptionRanges);
}

// A quoted YAML scalar may span lines, and YAML folds each break into a space,
// so `title: "word—\n  continuation"` publishes `word— continuation`. The
// line-at-a-time scan cannot see that, because neither line holds padding
// adjacent to the dash.
function flowScalarViolations(source, contentStart, contentEnd, exceptionRanges) {
  const segments = [];
  let lineStart = contentStart;
  let isFirst = true;

  while (lineStart < contentEnd) {
    const newline = source.indexOf('\n', lineStart);
    const endsRegion = newline === -1 || newline >= contentEnd;
    const lineEnd = endsRegion ? contentEnd : newline;
    const line = source.slice(lineStart, lineEnd).replace(/\r$/, '');

    // The opening quote sits mid-line; continuation lines have their leading
    // indentation stripped by the fold.
    const segmentStart = isFirst ? lineStart : lineStart + indentOf(line);
    // Whitespace before the closing quote is part of the value; whitespace
    // before a fold is not.
    const segmentEnd = endsRegion
      ? contentEnd
      : lineStart + line.replace(/[\p{Zs}\t]+$/u, '').length;

    segments.push(segmentStart >= segmentEnd ? null : [segmentStart, segmentEnd, false]);

    isFirst = false;
    lineStart = lineEnd + 1;
  }

  const stream = createProseStream();
  emitFoldedSegments(stream, source, segments);
  return violationsFromStream(stream, 0, exceptionRanges);
}

// YAML carries a lot of this repo's published prose: frontmatter titles, card
// copy and pull quotes, and the `src/content/skills/**` collection, which is
// authored as standalone YAML and rendered onto the resume. It is scanned line
// by line rather than parsed as Markdown: outside a folded scalar a line break
// separates scalars rather than joining them, structural prefixes are not
// padding, and comments are not published.
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
      const opener = blockScalarOpenerOf(line);

      if (opener?.folded) {
        // Consume the whole folded region here and hand it to the stream
        // scanner, so its lines are not also scanned one at a time.
        let cursor = lineEnd + 1;
        let baseIndent = null;
        while (cursor < end) {
          const nextNewline = source.indexOf('\n', cursor);
          const nextEnd = nextNewline === -1 || nextNewline > end ? end : nextNewline;
          const nextLine = source.slice(cursor, nextEnd).replace(/\r$/, '');
          if (nextLine.trim() !== '') {
            const nextIndent = indentOf(nextLine);
            if (nextIndent <= opener.indent) {
              break;
            }
            if (baseIndent === null) {
              baseIndent = opener.contentIndent ?? nextIndent;
            }
            // A line shallower than the declared content indent ends the
            // scalar even though it is still deeper than the opener.
            if (nextIndent < baseIndent) {
              break;
            }
          }
          cursor = nextEnd + 1;
        }

        if (baseIndent !== null) {
          violations.push(
            ...foldedScalarViolations(source, lineEnd + 1, Math.min(cursor, end), baseIndent, exceptionRanges),
          );
        }
        lineStart = cursor;
        continue;
      }

      blockScalarIndent = opener ? opener.indent : null;
    }

    // Inside a block scalar the whole line is literal content: no comment to
    // strip, and no structural prefix to step past.
    const scan = scanYamlLine(line);
    const scanEnd = inBlockScalar ? lineEnd : lineStart + scan.commentStart;

    // A quote still open at end of line means the scalar continues onto the
    // next one, where YAML folds the break into a space. Hand the whole scalar
    // to the folding scanner and consume its lines here.
    // Only when the quote is the value's opening delimiter. A quote appearing
    // after plain-scalar content (`title: He said "word`) is an ordinary
    // character, and treating it as a scalar opener would let the fixer join
    // two mapping entries into one.
    if (
      !inBlockScalar &&
      scan.quote &&
      scan.quoteStart !== -1 &&
      YAML_VALUE_PREFIX.test(line.slice(0, scan.quoteStart))
    ) {
      const openOffset = lineStart + scan.quoteStart;
      let cursor = lineEnd + 1;
      let closeOffset = -1;

      while (cursor < end) {
        const nextNewline = source.indexOf('\n', cursor);
        const nextEnd = nextNewline === -1 || nextNewline > end ? end : nextNewline;
        const nextLine = source.slice(cursor, nextEnd).replace(/\r$/, '');
        const closeIndex = closeQuoteIndex(nextLine, scan.quote);
        if (closeIndex !== -1) {
          closeOffset = cursor + closeIndex;
          cursor = nextEnd + 1;
          break;
        }
        cursor = nextEnd + 1;
      }

      if (closeOffset !== -1) {
        // Anything before the opening quote is ordinary YAML and still scanned.
        violations.push(...lineViolations(source, lineStart, openOffset, false, exceptionRanges));
        violations.push(...flowScalarViolations(source, openOffset + 1, closeOffset, exceptionRanges));
        lineStart = cursor;
        continue;
      }
      // Unterminated quote: fall through to the ordinary per-line scan.
    }

    violations.push(...lineViolations(source, lineStart, scanEnd, inBlockScalar, exceptionRanges));
    lineStart = lineEnd + 1;
  }

  return violations;
}

// Padded dashes on a single physical YAML line, between `lineStart` and
// `scanEnd`.
function lineViolations(source, lineStart, scanEnd, inBlockScalar, exceptionRanges) {
  const violations = [];
  const line = source.slice(lineStart, scanEnd);

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

    // Whitespace running to the end of the scannable region is not rendered
    // padding: YAML strips trailing whitespace from a scalar. It is also the
    // separator an end-of-line comment requires, so deleting it would fold
    // the comment into the published value.
    const trailingEnd = absoluteEnd >= scanEnd ? dashOffset + 1 : absoluteEnd;

    const removals = [];
    if (paddingStart < dashOffset) {
      removals.push([paddingStart, dashOffset]);
    }
    if (trailingEnd > dashOffset + 1) {
      removals.push([dashOffset + 1, trailingEnd]);
    }

    if (removals.length === 0) {
      continue;
    }
    if (exceptionRanges.some(([rangeStart, rangeEnd]) => dashOffset >= rangeStart && dashOffset < rangeEnd)) {
      continue;
    }

    violations.push({ offset: dashOffset, removals });
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

  if (args.includes('-h') || args.includes('--help')) {
    printUsageAndExit(0);
  }

  // A typo such as `--wrtie` must not silently degrade to a read-only check
  // and report success without applying the requested fix.
  const unknown = args.filter((arg) => arg !== '--write');
  if (unknown.length > 0) {
    console.error(`content em-dash lint: unknown argument(s): ${unknown.join(', ')}`);
    printUsageAndExit(2);
  }

  const applyWrite = args.includes('--write');

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
