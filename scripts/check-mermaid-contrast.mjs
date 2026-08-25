#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { isAlias, isMap, isScalar, isSeq, parseDocument } from 'yaml';
import { findBlogMarkdownFiles as findMarkdownFiles } from './lib/blog-file-inventory.mjs';

const MINIMUM_CONTRAST = 4.5;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const blogDirectory = join(repositoryRoot, 'src/content/blog');
const markdownParser = unified().use(remarkParse);

function parseHexColor(value) {
  const match = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  if (match == null) return null;

  const digits =
    match[1].length === 3
      ? [...match[1]].map((digit) => `${digit}${digit}`).join('')
      : match[1];

  return [0, 2, 4].map((offset) => Number.parseInt(digits.slice(offset, offset + 2), 16));
}

function relativeLuminance(value) {
  const rgb = parseHexColor(value);
  if (rgb == null) return null;

  const [red, green, blue] = rgb.map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  if (firstLuminance == null || secondLuminance == null) return null;

  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function parseStyleProperties(source) {
  const properties = new Map();
  const propertyPattern = /(?:^|,)\s*([a-z-]+)\s*:\s*([^,\s]+)\s*/gi;
  let match;

  while ((match = propertyPattern.exec(source)) != null) {
    properties.set(match[1].toLowerCase(), match[2]);
  }

  return properties;
}

function mermaidStatements(line) {
  const statements = [];
  const openingBrackets = new Map([
    ['[', ']'],
    ['(', ')'],
    ['{', '}'],
  ]);
  const closingBrackets = new Set(openingBrackets.values());
  const bracketStack = [];
  let quote = null;
  let escaped = false;
  let start = 0;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (quote != null) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }

    if (character === '"' || character === '`') {
      quote = character;
      continue;
    }

    if (openingBrackets.has(character)) {
      bracketStack.push(openingBrackets.get(character));
      continue;
    }

    if (closingBrackets.has(character)) {
      if (bracketStack.at(-1) === character) bracketStack.pop();
      continue;
    }

    if (character === '%' && line[index + 1] === '%' && bracketStack.length === 0) {
      const statement = line.slice(start, index).trim();
      if (statement !== '') statements.push(statement);
      return statements;
    }

    if (character === ';' && bracketStack.length === 0) {
      const statement = line.slice(start, index).trim();
      if (statement !== '') statements.push(statement);
      start = index + 1;
    }
  }

  const statement = line.slice(start).trim();
  if (statement !== '') statements.push(statement);
  return statements;
}

function failureForStatement(statement, lineNumber, filePath) {
  if (/^classDef(?:\s|$)/i.test(statement)) {
    return {
      filePath,
      line: lineNumber,
      kind: 'unsupported-class-def',
    };
  }

  const style = statement.match(/^style\s+\S+\s+(.+)$/i);
  if (style == null) return null;

  const properties = parseStyleProperties(style[1]);
  const fill = properties.get('fill');
  const color = properties.get('color');
  if (fill == null || color == null) return null;

  const ratio = contrastRatio(color, fill);
  if (ratio != null && ratio >= MINIMUM_CONTRAST) return null;

  return {
    filePath,
    line: lineNumber,
    kind: 'contrast',
    fill,
    color,
    ratio,
  };
}

function failuresForLine(line, lineNumber, filePath) {
  return mermaidStatements(line)
    .map((statement) => failureForStatement(statement, lineNumber, filePath))
    .filter((failure) => failure != null);
}

function splitMarkdownDocument(markdown) {
  const lines = markdown.split(/\r?\n/);
  if (lines[0]?.replace(/^\uFEFF/, '') !== '---') {
    return { frontmatter: null, body: markdown, bodyStartLine: 1 };
  }

  const closingIndex = lines.findIndex((line, index) => index > 0 && /^---[ \t]*$/.test(line));
  if (closingIndex === -1) {
    return { frontmatter: null, body: markdown, bodyStartLine: 1 };
  }

  return {
    frontmatter: lines.slice(1, closingIndex).join('\n'),
    body: lines.slice(closingIndex + 1).join('\n'),
    bodyStartLine: closingIndex + 2,
  };
}

function resolveYamlAliases(node, document) {
  const seen = new Set();
  let resolved = node;

  while (isAlias(resolved)) {
    if (seen.has(resolved)) return null;
    seen.add(resolved);
    resolved = resolved.resolve(document);
  }

  return resolved;
}

function yamlMapValue(map, key, document, ancestors = new Set()) {
  if (ancestors.has(map)) return null;
  const nextAncestors = new Set(ancestors).add(map);

  const directPair = map.items.find((pair) => pair.key?.source === key);
  if (directPair != null) return resolveYamlAliases(directPair.value, document);

  for (const pair of map.items) {
    if (pair.key?.source !== '<<') continue;

    const mergedValue = resolveYamlAliases(pair.value, document);
    const mergedMaps = isSeq(mergedValue) ? mergedValue.items : [mergedValue];
    for (const mergedMapValue of mergedMaps) {
      const mergedMap = resolveYamlAliases(mergedMapValue, document);
      if (!isMap(mergedMap)) continue;

      const value = yamlMapValue(mergedMap, key, document, nextAncestors);
      if (value != null) return value;
    }
  }

  return null;
}

function frontmatterFailures(frontmatter, filePath) {
  const failures = [];
  const document = parseDocument(frontmatter, { merge: true });
  const root = resolveYamlAliases(document.contents, document);
  if (!isMap(root)) return failures;

  const sidebar = yamlMapValue(root, 'sidebar', document);
  if (!isSeq(sidebar)) return failures;

  for (const sidebarItem of sidebar.items) {
    const item = resolveYamlAliases(sidebarItem, document);
    if (!isMap(item)) continue;

    const type = yamlMapValue(item, 'type', document);
    if (!isScalar(type) || type.value !== 'mermaid') continue;

    const content = yamlMapValue(item, 'content', document);
    if (!isScalar(content) || typeof content.value !== 'string' || content.range == null) continue;

    const scalarLine = frontmatter.slice(0, content.range[0]).split('\n').length;
    const contentStartsOnFollowingLine = content.type?.startsWith('BLOCK_') ?? false;
    const firstContentLine = scalarLine + (contentStartsOnFollowingLine ? 2 : 1);

    for (const [index, line] of content.value.split(/\r?\n/).entries()) {
      failures.push(...failuresForLine(line, firstContentLine + index, filePath));
    }
  }

  return failures;
}

function bodyFailures(body, bodyStartLine, filePath) {
  const failures = [];
  const tree = markdownParser.parse(body);

  function visit(node) {
    if (node.type === 'code' && node.lang?.toLowerCase() === 'mermaid' && node.position != null) {
      const firstContentLine = bodyStartLine + node.position.start.line;
      for (const [index, line] of node.value.split(/\r?\n/).entries()) {
        failures.push(...failuresForLine(line, firstContentLine + index, filePath));
      }
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) visit(child);
    }
  }

  visit(tree);
  return failures;
}

export function findMermaidContrastFailures(markdown, filePath) {
  const { frontmatter, body, bodyStartLine } = splitMarkdownDocument(markdown);
  return [
    ...(frontmatter == null ? [] : frontmatterFailures(frontmatter, filePath)),
    ...bodyFailures(body, bodyStartLine, filePath),
  ];
}

export function findBlogMarkdownFiles(directory = blogDirectory) {
  return findMarkdownFiles(directory);
}

function displayPath(filePath) {
  const pathFromRoot = relative(repositoryRoot, filePath);
  return pathFromRoot.startsWith('..') ? filePath : pathFromRoot;
}

function run(filePaths) {
  const failures = filePaths.flatMap((filePath) => {
    const absolutePath = resolve(filePath);
    return findMermaidContrastFailures(readFileSync(absolutePath, 'utf8'), displayPath(absolutePath));
  });

  for (const failure of failures) {
    if (failure.kind === 'unsupported-class-def') {
      console.error(
        `${failure.filePath}:${failure.line}: Mermaid classDef is unsupported by the contrast gate; use explicit style directives instead`,
      );
      continue;
    }

    const detail =
      failure.ratio == null
        ? `unsupported colors ${failure.color} on ${failure.fill}`
        : `${failure.color} on ${failure.fill} is ${failure.ratio.toFixed(2)}:1`;
    console.error(
      `${failure.filePath}:${failure.line}: Mermaid label contrast ${detail}; minimum ${MINIMUM_CONTRAST.toFixed(2)}:1`,
    );
  }

  return failures.length === 0 ? 0 : 1;
}

if (process.argv[1] != null && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = run(
    process.argv.slice(2).length > 0 ? process.argv.slice(2) : findBlogMarkdownFiles(),
  );
}
