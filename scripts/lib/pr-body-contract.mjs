#!/usr/bin/env node

import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parse, postprocess, preprocess } from 'micromark';

const AUTHOR_TOKEN_TYPES = new Set(['content', 'paragraph', 'data']);
const SELF_REVIEW_TOKEN_TYPES = new Set(['atxHeading', 'atxHeadingSequence']);

/**
 * Read the PR-body contract from CommonMark's maintained token tree.
 * Contract markers count only as plain top-level Markdown, never inside a
 * container, code span/block, raw HTML, link, comment, or other inline markup.
 */
export function parsePrBodyContract(body) {
  const authorValues = [];
  let hasSelfReview = false;
  let events;

  // micromark replaces NUL with U+FFFD before tokenization. Reject it before
  // normalization so an invalid autolink cannot swallow a code-span opener.
  if (body.includes('\0')) {
    return { author: '', authorCount: 0, hasSelfReview: false };
  }

  try {
    events = postprocess(
      parse()
        .document()
        .write(preprocess()(body, 'utf8', true)),
    );
  } catch {
    return { author: '', authorCount: 0, hasSelfReview: false };
  }

  for (const { line, offset } of sourceLines(body)) {
    const authorMatch = line.match(/^ {0,3}Authoring-Agent:[ \t]*(.*?)[ \t]*$/i);
    if (authorMatch) {
      const markerOffset = offset + line.search(/Authoring-Agent:/i);
      if (hasOnlyTokenTypes(events, markerOffset, AUTHOR_TOKEN_TYPES, 'paragraph', 'data')) {
        authorValues.push(authorMatch[1]);
      }
    }

    if (/^ {0,3}##[ \t]+Self-Review(?:[ \t]+#*)?[ \t]*$/i.test(line)) {
      const markerOffset = offset + line.indexOf('#');
      if (
        hasOnlyTokenTypes(
          events,
          markerOffset,
          SELF_REVIEW_TOKEN_TYPES,
          'atxHeading',
          'atxHeadingSequence',
        )
      ) {
        hasSelfReview = true;
      }
    }
  }

  const author =
    authorValues.length === 1 && /^[A-Za-z0-9_-]+$/.test(authorValues[0])
      ? authorValues[0].toLowerCase()
      : '';

  return { author, authorCount: authorValues.length, hasSelfReview };
}

function hasOnlyTokenTypes(events, offset, allowedTypes, ...requiredTypes) {
  const tokenTypes = events
    .filter(
      ([event, token]) =>
        event === 'enter' && offset >= token.start.offset && offset < token.end.offset,
    )
    .map(([, token]) => token.type);

  return (
    requiredTypes.every((type) => tokenTypes.includes(type)) &&
    tokenTypes.every((type) => allowedTypes.has(type))
  );
}

function* sourceLines(body) {
  let offset = 0;

  while (offset <= body.length) {
    const lineFeed = body.indexOf('\n', offset);
    const end = lineFeed === -1 ? body.length : lineFeed;
    const rawLine = body.slice(offset, end);
    yield {
      line: rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine,
      offset,
    };

    if (lineFeed === -1) break;
    offset = lineFeed + 1;
  }
}

function isDirectExecution(entryPath) {
  if (!entryPath) return false;

  try {
    return import.meta.url === pathToFileURL(realpathSync(entryPath)).href;
  } catch {
    return false;
  }
}

if (isDirectExecution(process.argv[1])) {
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
}
