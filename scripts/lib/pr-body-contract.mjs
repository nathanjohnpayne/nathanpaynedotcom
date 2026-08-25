#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

function visibleText(node) {
  if (node.type === 'text') return node.value;
  if (node.type === 'break') return '\n';
  if (['html', 'inlineCode', 'image', 'imageReference'].includes(node.type)) return '';
  if (!Array.isArray(node.children)) return '';
  return node.children.map(visibleText).join('');
}

export function parsePrBodyContract(body) {
  const tree = unified().use(remarkParse).parse(body);
  const authorValues = [];
  let hasSelfReview = false;

  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth === 2) {
      if (visibleText(node).trim().toLowerCase() === 'self-review') hasSelfReview = true;
      continue;
    }

    if (node.type !== 'paragraph') continue;
    for (const line of visibleText(node).split(/\r?\n/)) {
      const match = line.match(/^\s*authoring-agent:\s*(.*?)\s*$/i);
      if (match != null) authorValues.push(match[1]);
    }
  }

  const author =
    authorValues.length === 1 && /^[A-Za-z0-9_-]+$/.test(authorValues[0])
      ? authorValues[0].toLowerCase()
      : '';

  return { author, authorCount: authorValues.length, hasSelfReview };
}

const mode = process.argv[2];
const contract = parsePrBodyContract(readFileSync(0, 'utf8'));

switch (mode) {
  case '--author':
    if (contract.author !== '') process.stdout.write(`${contract.author}\n`);
    break;
  case '--author-count':
    process.stdout.write(`${contract.authorCount}\n`);
    break;
  case '--has-self-review':
    process.exitCode = contract.hasSelfReview ? 0 : 1;
    break;
  default:
    process.stderr.write(
      'usage: pr-body-contract.mjs (--author|--author-count|--has-self-review) < pr-body.md\n',
    );
    process.exitCode = 2;
}
