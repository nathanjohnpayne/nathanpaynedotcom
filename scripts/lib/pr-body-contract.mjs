#!/usr/bin/env node

import { readFileSync } from 'node:fs';

function stripHtmlComments(line, startsInComment) {
  let inComment = startsInComment;
  let index = 0;
  let visible = '';

  while (index < line.length) {
    if (inComment) {
      const commentEnd = line.indexOf('-->', index);
      if (commentEnd === -1) return { inComment, visible };
      inComment = false;
      index = commentEnd + 3;
      continue;
    }

    const commentStart = line.indexOf('<!--', index);
    if (commentStart === -1) {
      visible += line.slice(index);
      break;
    }

    visible += line.slice(index, commentStart);
    inComment = true;
    index = commentStart + 4;
  }

  return { inComment, visible };
}

export function parsePrBodyContract(body) {
  const authorValues = [];
  let hasSelfReview = false;
  let inHtmlComment = false;
  let inHtmlBlock = false;
  let fenceCharacter = '';
  let fenceLength = 0;

  for (const line of body.split(/\r?\n/)) {
    if (fenceCharacter !== '') {
      const closingFence = line.match(/^ {0,3}(`{3,}|~{3,})[ \t]*$/);
      if (
        closingFence != null &&
        closingFence[1][0] === fenceCharacter &&
        closingFence[1].length >= fenceLength
      ) {
        fenceCharacter = '';
        fenceLength = 0;
      }
      continue;
    }

    if (inHtmlBlock) {
      if (/^[ \t]*$/.test(line)) inHtmlBlock = false;
      continue;
    }

    const commentResult = stripHtmlComments(line, inHtmlComment);
    inHtmlComment = commentResult.inComment;
    const visibleLine = commentResult.visible;

    if (/^ {0,3}<[A-Za-z!?/]/.test(visibleLine)) {
      inHtmlBlock = true;
      continue;
    }

    const openingFence = visibleLine.match(/^ {0,3}(`{3,}|~{3,})/);
    if (openingFence != null) {
      fenceCharacter = openingFence[1][0];
      fenceLength = openingFence[1].length;
      continue;
    }

    if (/^( {4}|\t)/.test(visibleLine)) continue;

    if (/^## self-review[ \t]*$/i.test(visibleLine)) hasSelfReview = true;

    const authorMatch = visibleLine.match(/^[ \t]*authoring-agent:[ \t]*(.*?)[ \t]*$/i);
    if (authorMatch != null) authorValues.push(authorMatch[1]);
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
