#!/usr/bin/env node

import { readFileSync, realpathSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { micromark } from 'micromark';
import { gfmFootnote, gfmFootnoteHtml } from 'micromark-extension-gfm-footnote';
import { gfmTable, gfmTableHtml } from 'micromark-extension-gfm-table';
import { math, mathHtml } from 'micromark-extension-math';
import { parseFragment } from 'parse5';

const SENTINEL_SECRET = randomBytes(16).toString('base64url');
let sentinelSequence = 0n;

/**
 * Label literal contract candidates, render them with maintained GitHub
 * Markdown semantics, and accept only sentinels that reach the document root.
 * This delegates both Markdown containers and raw-HTML ancestry to parsers.
 */
export function parsePrBodyContract(body) {
  const authorValues = [];
  // micromark replaces NUL with U+FFFD before tokenization. Reject it before
  // normalization so an invalid autolink cannot swallow a code-span opener.
  if (body.includes('\0')) {
    return { author: '', authorCount: 0, hasSelfReview: false };
  }

  try {
    const labeled = labelContractCandidates(body);
    const renderedRoot = parseFragment(
      micromark(labeled.body, {
        allowDangerousHtml: true,
        extensions: [gfmFootnote(), gfmTable(), math()],
        htmlExtensions: [gfmFootnoteHtml(), gfmTableHtml(), mathHtml()],
      }),
    );

    const topLevelTextLines = renderedRoot.childNodes
      .filter((node) => node.nodeName === 'p')
      .flatMap((paragraph) => paragraph.childNodes)
      .filter((node) => node.nodeName === '#text')
      .flatMap((node) => node.value.split(/\r\n|\r|\n/))
      .map((line) => line.trim());

    for (const candidate of labeled.authors) {
      if (topLevelTextLines.includes(candidate.sentinel)) {
        authorValues.push(candidate.value);
      }
    }

    const hasSelfReview = labeled.selfReviews.some((sentinel) =>
      renderedRoot.childNodes.some(
        (node) =>
          node.nodeName === 'h2' &&
          node.childNodes.length === 1 &&
          node.childNodes[0].nodeName === '#text' &&
          node.childNodes[0].value.trim() === sentinel,
      ),
    );

    const author =
      authorValues.length === 1 && /^[A-Za-z0-9_-]+$/.test(authorValues[0])
        ? authorValues[0].toLowerCase()
        : '';

    return { author, authorCount: authorValues.length, hasSelfReview };
  } catch {
    return { author: '', authorCount: 0, hasSelfReview: false };
  }
}

function labelContractCandidates(body) {
  // The rendered DOM decodes character references. A deterministic sentinel
  // could therefore be forged in source as numeric entities even when its
  // literal spelling was absent. Combine a process-private 128-bit secret with
  // a per-parse sequence so user-authored source cannot predict the marker.
  const sequence = sentinelSequence;
  sentinelSequence += 1n;
  let prefix = `Z${SENTINEL_SECRET}${sequence}Z`;
  while (body.includes(prefix)) prefix += 'X';

  const authors = [];
  const selfReviews = [];
  const parts = body.split(/(\r\n|\r|\n)/);

  for (let index = 0; index < parts.length; index += 2) {
    const line = parts[index];
    const authorMatch = line.match(/^( {0,3})Authoring-Agent:[ \t]*(.*?)[ \t]*$/i);
    if (authorMatch) {
      const sentinel = `${prefix}AUTHOR${authors.length}END`;
      authors.push({ sentinel, value: authorMatch[2] });
      parts[index] = `${authorMatch[1]}${sentinel}`;
      continue;
    }

    const selfReviewMatch = line.match(
      /^( {0,3})##[ \t]+Self-Review(?:[ \t]+#*)?[ \t]*$/i,
    );
    if (selfReviewMatch) {
      const sentinel = `${prefix}SELFREVIEW${selfReviews.length}END`;
      selfReviews.push(sentinel);
      parts[index] = `${selfReviewMatch[1]}## ${sentinel}`;
    }
  }

  return { body: parts.join(''), authors, selfReviews };
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
    case '--summary':
      process.stdout.write(
        `${contract.authorCount}\n${contract.author}\n${contract.hasSelfReview ? '1' : '0'}\n`,
      );
      break;
    default:
      process.stderr.write(
        'usage: pr-body-contract.mjs (--author|--author-count|--has-self-review|--summary) < pr-body.md\n',
      );
      process.exitCode = 2;
  }
}
