import { inflateSync } from 'node:zlib';

/**
 * Read the text out of a PDF **in content-stream order** — the order the
 * bytes are written into the file, not the order a renderer paints them onto
 * the page.
 *
 * ## Why this exists, and why `pdftotext` would not have caught the bug
 *
 * A PDF has two orders, and they are allowed to disagree. The *visual* order
 * is recovered from each glyph's coordinates, and that is what a page image
 * and what `pdftotext` (without `-raw`) show. The *stream* order is the
 * sequence the text-showing operators appear in, and it is what every
 * consumer that reads the file rather than looks at it gets: ATS parsers,
 * `pdftotext -raw`, assistive tech, and copy-paste in most viewers.
 *
 * Chromium writes each printed page's text into the stream in **paint**
 * order. So a CSS rule that changes paint order — `position: relative` puts
 * an element in step 8 of the painting algorithm (CSS 2.1 Appendix E), after
 * every non-positioned block and inline in the same stacking context —
 * silently reorders the document for those consumers while leaving the
 * rendered page pixel-identical. That is #923: the résumé's bullets were
 * emitted after all of their page's other text, which moved the four Disney
 * Streaming 2018–2021 bullets six sections past the role they belong to.
 *
 * A test that compares page images, or one that reads `pdftotext` output,
 * passes on that PDF. Only stream order fails. Hence this module.
 *
 * ## Scope, deliberately narrow
 *
 * This is not a general PDF parser and must not grow into one. It handles
 * exactly the shape Chromium's `printToPDF` emits for this site, and asserts
 * that shape rather than degrading quietly when it changes:
 *
 * - classic cross-reference layout, so every object is addressable as
 *   `N 0 obj` in the file (no object streams to unpack);
 * - `/Length` always a direct integer, so stream extents never require
 *   resolving another object;
 * - `/FlateDecode` as the only filter;
 * - a flat page tree, reached through the document catalog;
 * - text shown by hex strings only, never by literal `(...)` strings;
 * - one- or two-byte character codes, at the width each `/ToUnicode` CMap
 *   declares in its own `begincodespacerange` (uniform within a font, and read
 *   per font — a macOS build and a Linux CI build of the same page do not
 *   agree on this), mapped through `beginbfchar` and `beginbfrange`.
 *
 * Anything else throws. A loud failure is the point: a silent one would let a
 * reordering regression through as an empty or truncated extraction, and every
 * assertion built on this reader would then pass for the wrong reason. Each
 * constraint above is therefore checked in code rather than assumed in a
 * comment — including the ones today's output could not violate.
 */

/**
 * Character-code widths, in bytes, that this reader decodes.
 *
 * The width is **per font and read from that font's own CMap**, never assumed.
 * An earlier revision hardcoded one byte, which was true of every font in a
 * macOS build and false on CI, where Chromium subsets some faces as composite
 * fonts with two-byte codes. Guessing here does not fail loudly: a two-byte
 * CMap read as one-byte decodes each glyph pair as one wrong code and returns
 * plausible-looking garbage — the one outcome this module must never produce.
 */
const SUPPORTED_CODE_BYTES = [1, 2];

/**
 * Byte offsets of every `N 0 obj` header, keyed by object number.
 *
 * Matching is anchored to a preceding newline so the digits of a stream's
 * binary payload cannot be mistaken for an object header.
 *
 * @param {string} latin1 whole file decoded 1:1 as bytes
 * @returns {Map<number, number>} object number → offset of the byte after `obj`
 */
function indexObjects(latin1) {
  const index = new Map();
  const re = /(?:^|[\r\n])(\d+) 0 obj/g;
  let m;
  while ((m = re.exec(latin1)) !== null) {
    index.set(Number(m[1]), m.index + m[0].length);
  }
  return index;
}

/**
 * The dictionary text and (if present) the decompressed stream of one object.
 *
 * @param {Buffer} buf
 * @param {string} latin1
 * @param {Map<number, number>} index
 * @param {number} num
 * @returns {{ dict: string, stream: string | null }}
 */
function readObject(buf, latin1, index, num) {
  const start = index.get(num);
  if (start === undefined) throw new Error(`pdf: object ${num} not found`);

  const streamAt = latin1.indexOf('stream', start);
  const endObjAt = latin1.indexOf('endobj', start);
  if (endObjAt < 0) throw new Error(`pdf: object ${num} has no endobj`);

  // `stream` after this object's `endobj` belongs to a later object.
  if (streamAt < 0 || streamAt > endObjAt) {
    return { dict: latin1.slice(start, endObjAt), stream: null };
  }

  const dict = latin1.slice(start, streamAt);
  // `(?!\d)` first, so the digits cannot backtrack out of the indirect-length
  // guard: on `/Length 123 0 R` a greedy `\d+` with only the `\s+\d+\s+R`
  // lookahead gives up `3`, and `12` then satisfies the lookahead because the
  // next character is a digit rather than a space. The reader would inflate a
  // truncated prefix instead of reporting an unsupported shape (Codex, #924).
  const length = dict.match(/\/Length\s+(\d+)(?!\d)(?!\s+\d+\s+R)/);
  if (!length) {
    throw new Error(
      `pdf: object ${num} has no direct /Length — this reader does not resolve ` +
        `indirect stream lengths (see the module header for its scope).`,
    );
  }
  if (!/\/Filter\s*\/FlateDecode/.test(dict)) {
    throw new Error(`pdf: object ${num} is not /FlateDecode — unsupported filter`);
  }

  // Skip the EOL that must follow the `stream` keyword (CRLF or LF).
  let dataAt = streamAt + 'stream'.length;
  if (latin1[dataAt] === '\r') dataAt += 1;
  if (latin1[dataAt] === '\n') dataAt += 1;

  const raw = buf.subarray(dataAt, dataAt + Number(length[1]));
  return { dict, stream: inflateSync(raw).toString('latin1') };
}

/**
 * Page object numbers, in document order.
 *
 * Resolved through the document catalog — `/Type /Catalog` → `/Pages` → that
 * object's `/Kids` — rather than by matching the first `/Kids` in the file.
 * Chromium emits exactly one `/Kids` array for this document, so the two
 * agree today, but only the catalog route says *why* an array is the page
 * order instead of assuming the first one found is.
 *
 * A nested page tree is rejected rather than walked: every kid must be a
 * `/Type /Page`. Walking would be more code for a shape this generator does
 * not produce, and silently returning intermediate nodes as pages is exactly
 * the quiet wrong answer this module refuses to give.
 *
 * @param {Buffer} buf
 * @param {string} latin1
 * @param {Map<number, number>} index
 * @returns {number[]}
 */
function pageObjectNumbers(buf, latin1, index) {
  const catalog = latin1.match(/\/Type\s*\/Catalog[\s\S]{0,2000}?\/Pages\s+(\d+)\s+0\s+R/);
  if (!catalog) throw new Error('pdf: no /Type /Catalog with a /Pages reference');

  const root = readObject(buf, latin1, index, Number(catalog[1]));
  const kids = root.dict.match(/\/Kids\s*\[([^\]]*)\]/);
  if (!kids) throw new Error('pdf: the page-tree root has no /Kids array');

  const nums = [...kids[1].matchAll(/(\d+)\s+0\s+R/g)].map((m) => Number(m[1]));
  if (nums.length === 0) throw new Error('pdf: the page tree root /Kids array is empty');

  for (const num of nums) {
    if (!/\/Type\s*\/Page(?![a-zA-Z])/.test(readObject(buf, latin1, index, num).dict)) {
      throw new Error(
        `pdf: object ${num} under /Kids is not a /Page — nested page trees are not supported`,
      );
    }
  }
  return nums;
}

/**
 * A UTF-16BE hex destination, as text.
 *
 * A code may map to more than one unit — a ligature expanding back into its
 * letters, for example — so this is a string, not a character.
 *
 * @param {string} hex
 * @returns {string}
 */
function utf16beFromHex(hex) {
  let text = '';
  for (let i = 0; i + 4 <= hex.length; i += 4) {
    text += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  }
  return text;
}

/**
 * Character-code → text mapping from a `/ToUnicode` CMap stream.
 *
 * Chromium's subsets use both sections: `beginbfchar` for one-off codes and
 * `beginbfrange` for runs of codes whose destinations are consecutive (the
 * duplicate glyphs a subset picks up for `f`, `j`, `q` and friends). Both
 * `bfrange` forms are decoded — a consecutive destination, and an explicit
 * array of destinations — and anything else throws, so a font whose codes
 * went unmapped can never be mistaken for a font with no text.
 *
 * @param {string} cmap
 * @returns {{ map: Map<number, string>, codeBytes: number }}
 */
function parseToUnicode(cmap) {
  // Every code width in the CMap's own codespace declaration. A CMap may list
  // several ranges; this reader requires them to agree, because a mixed-width
  // codespace needs range-by-range decoding and silently reading it at one
  // width would return convincing nonsense.
  const widths = new Set();
  for (const block of cmap.matchAll(/begincodespacerange([\s\S]*?)endcodespacerange/g)) {
    for (const range of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      widths.add(range[1].length / 2);
      widths.add(range[2].length / 2);
    }
  }
  if (widths.size === 0) throw new Error('pdf: /ToUnicode CMap declares no codespace range');
  if (widths.size > 1) {
    throw new Error(
      `pdf: /ToUnicode CMap mixes ${[...widths].sort().join('- and ')}-byte codes, which this reader does not decode`,
    );
  }
  const codeBytes = [...widths][0];
  if (!SUPPORTED_CODE_BYTES.includes(codeBytes)) {
    throw new Error(
      `pdf: /ToUnicode CMap uses ${codeBytes}-byte codes; this reader decodes ` +
        `${SUPPORTED_CODE_BYTES.join('- or ')}-byte codes only`,
    );
  }

  const map = new Map();

  // Each section states how many entries it holds. Checking the decoded count
  // against it is what keeps an unrecognised entry form from silently
  // dropping characters — the failure this reader must never have, since a
  // dropped character reads as absent text rather than as a broken reader.
  const expectCount = (declared, decoded, section) => {
    if (Number(declared) !== decoded) {
      throw new Error(
        `pdf: /ToUnicode declared ${declared} ${section} entries but ${decoded} were decoded`,
      );
    }
  };

  for (const block of cmap.matchAll(/(\d+)\s+beginbfchar([\s\S]*?)endbfchar/g)) {
    let seen = 0;
    for (const pair of block[2].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) {
      seen += 1;
      map.set(parseInt(pair[1], 16), utf16beFromHex(pair[2]));
    }
    expectCount(block[1], seen, 'bfchar');
  }

  for (const block of cmap.matchAll(/(\d+)\s+beginbfrange([\s\S]*?)endbfrange/g)) {
    const entries = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]*)>|\[([^\]]*)\])/g;
    let seen = 0;
    for (const range of block[2].matchAll(entries)) {
      seen += 1;
      const lo = parseInt(range[1], 16);
      const hi = parseInt(range[2], 16);
      if (range[3] !== undefined) {
        // Consecutive destinations: the last UTF-16 unit increments per code.
        const base = utf16beFromHex(range[3]);
        const head = base.slice(0, -1);
        const tail = base.charCodeAt(base.length - 1);
        for (let code = lo; code <= hi; code += 1) {
          map.set(code, head + String.fromCharCode(tail + (code - lo)));
        }
      } else {
        const dsts = [...range[4].matchAll(/<([0-9A-Fa-f]*)>/g)].map((d) => utf16beFromHex(d[1]));
        for (let code = lo; code <= hi && code - lo < dsts.length; code += 1) {
          map.set(code, dsts[code - lo]);
        }
      }
    }
    expectCount(block[1], seen, 'bfrange');
  }

  if (map.size === 0) throw new Error('pdf: /ToUnicode CMap yielded no mappings');
  return { map, codeBytes };
}

/**
 * The `/Font` resource dictionary of a page: PDF font name → object number.
 *
 * @param {string} pageDict
 * @returns {Map<string, number>}
 */
function pageFontRefs(pageDict) {
  const fonts = new Map();
  const block = pageDict.match(/\/Font\s*<<([\s\S]*?)>>/);
  if (!block) return fonts;
  for (const ref of block[1].matchAll(/\/(\w+)\s+(\d+)\s+0\s+R/g)) {
    fonts.set(ref[1], Number(ref[2]));
  }
  return fonts;
}

/**
 * Walk one page's content stream and return its text in emission order.
 *
 * Spacing in a Chromium-generated PDF is carried by positioning operators as
 * often as by space glyphs, so the text this returns is not word-for-word
 * what a reader sees. Callers must compare it whitespace-insensitively —
 * `normalizeForOrder` below is the intended way. Order, which is the whole
 * point, is exact.
 *
 * A `BT` (begin-text) block starts a new line, which keeps the output roughly
 * line-shaped and readable in a failure message.
 *
 * @param {string} content decompressed content stream
 * @param {Map<string, { map: Map<number, string>, codeBytes: number }>} fonts
 *   PDF font name → that font's code map and its own code width
 * @returns {string}
 */
function decodeContentStream(content, fonts) {
  // Only hex strings are decoded below, so any literal string would be lost:
  // `(text) Tj` contributes nothing, and a literal nested in a TJ array —
  // `[(foo) -10 <4142>] TJ` — is worse, because a `)` or `]` inside it also
  // terminates the array match early and drops the rest of the line.
  //
  // The guard is therefore "no literal string anywhere in the stream", not
  // "no `) Tj`": an earlier version matched only a literal immediately before
  // the operator and let the nested case through (Codex, #924). Chromium
  // writes no `(` at all in these streams — verified, 0 across all three — so
  // this is conservative in the safe direction. Rejecting a stream that turns
  // out to contain a parenthesis for some other reason is a loud failure that
  // gets looked at; decoding one that contains a literal string is a quiet
  // truncation that every ordering assertion above would then run on.
  if (content.includes('(')) {
    throw new Error(
      'pdf: content stream contains a literal string, which this reader does not decode ' +
        '(only hex strings are; a literal would be silently dropped)',
    );
  }

  let out = '';
  let current = null;

  // Text-showing operators, plus the two operators that change what they
  // mean: `Tf` selects the font whose CMap decodes the codes, `BT` starts a
  // new text object.
  const re = /BT\b|\/(\w+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]*)>\s*Tj|\[([^\]]*)\]\s*TJ/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (m[0] === 'BT') {
      out += '\n';
    } else if (m[1] !== undefined) {
      current = fonts.get(m[1]) ?? null;
    } else if (m[2] !== undefined) {
      out += decodeHex(m[2], current);
    } else {
      // A TJ array interleaves strings with kerning numbers; the numbers only
      // move the pen, so only the strings contribute text.
      for (const str of m[3].matchAll(/<([0-9A-Fa-f]*)>/g)) {
        out += decodeHex(str[1], current);
      }
    }
  }
  return out;
}

/**
 * Decode one hex string with the current font's own code width.
 *
 * The stride is the font's, not a constant: the same document can mix a
 * one-byte simple font with a two-byte composite one, and reading either at
 * the other's width produces text rather than an error.
 *
 * Every way this can fail throws, and none of them returns short text. An
 * earlier version fell back to `''` for a string shown with no current font
 * and for a code absent from the font's CMap, and let the loop bound discard a
 * trailing partial code — three silent truncations in the one function whose
 * output every ordering assertion is built on (Codex, #924). The real document
 * exercises none of them: 8,813 glyphs, zero unmapped, zero fontless, zero
 * partial. That is what makes throwing safe as well as correct.
 *
 * @param {string} hex
 * @param {{ map: Map<number, string>, codeBytes: number } | null} font
 * @returns {string}
 */
function decodeHex(hex, font) {
  if (hex.length === 0) return '';
  if (!font) {
    throw new Error('pdf: text shown with no current font, so its codes cannot be decoded');
  }
  const stride = font.codeBytes * 2;
  if (hex.length % stride !== 0) {
    throw new Error(
      `pdf: hex string of ${hex.length / 2} bytes is not a whole number of ` +
        `${font.codeBytes}-byte codes`,
    );
  }
  let text = '';
  for (let i = 0; i < hex.length; i += stride) {
    const code = parseInt(hex.slice(i, i + stride), 16);
    const glyph = font.map.get(code);
    if (glyph === undefined) {
      throw new Error(`pdf: code 0x${hex.slice(i, i + stride)} is absent from the font's CMap`);
    }
    text += glyph;
  }
  return text;
}

/**
 * Every page's text, in content-stream order, one string per page.
 *
 * @param {Buffer} buf the raw PDF
 * @returns {string[]}
 */
export function pdfPagesInStreamOrder(buf) {
  const latin1 = buf.toString('latin1');
  if (latin1.includes('/Encrypt')) throw new Error('pdf: encrypted documents are not supported');
  if (/\/Type\s*\/ObjStm/.test(latin1)) {
    throw new Error('pdf: object streams are not supported by this reader');
  }

  const index = indexObjects(latin1);
  const cmapCache = new Map();

  return pageObjectNumbers(buf, latin1, index).map((pageNum) => {
    const page = readObject(buf, latin1, index, pageNum);

    const fonts = new Map();
    for (const [name, fontNum] of pageFontRefs(page.dict)) {
      if (!cmapCache.has(fontNum)) {
        const font = readObject(buf, latin1, index, fontNum);
        const ref = font.dict.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
        cmapCache.set(
          fontNum,
          ref ? parseToUnicode(readObject(buf, latin1, index, Number(ref[1])).stream) : null,
        );
      }
      const decoded = cmapCache.get(fontNum);
      if (decoded) fonts.set(name, decoded);
    }

    const ref = page.dict.match(/\/Contents\s+(\d+)\s+0\s+R/);
    if (!ref) throw new Error(`pdf: page object ${pageNum} has no /Contents reference`);
    const content = readObject(buf, latin1, index, Number(ref[1])).stream;
    if (content === null) throw new Error(`pdf: page object ${pageNum} /Contents is not a stream`);

    return decodeContentStream(content, fonts);
  });
}

/**
 * Each page's raw, decompressed content stream, in page order.
 *
 * Text is what this module is mostly for, but the résumé's bullet markers are
 * not text — they are filled rectangles, painted from a CSS background — and
 * whether they reach the file at all is its own regression (#925). Exposing
 * the streams lets a test count them without this module growing an opinion
 * about what a marker looks like.
 *
 * @param {Buffer} buf
 * @returns {string[]}
 */
export function pdfPageContentStreams(buf) {
  const latin1 = buf.toString('latin1');
  const index = indexObjects(latin1);
  return pageObjectNumbers(buf, latin1, index).map((pageNum) => {
    const page = readObject(buf, latin1, index, pageNum);
    const ref = page.dict.match(/\/Contents\s+(\d+)\s+0\s+R/);
    if (!ref) throw new Error(`pdf: page object ${pageNum} has no /Contents reference`);
    const content = readObject(buf, latin1, index, Number(ref[1])).stream;
    if (content === null) throw new Error(`pdf: page object ${pageNum} /Contents is not a stream`);
    return content;
  });
}

/**
 * The whole document's text in content-stream order, pages concatenated.
 *
 * @param {Buffer} buf
 * @returns {string}
 */
export function pdfTextInStreamOrder(buf) {
  return pdfPagesInStreamOrder(buf).join('\n');
}

/**
 * Strip everything that only affects appearance, so an order comparison is
 * about order.
 *
 * Whitespace goes entirely: Chromium emits some inter-word gaps as space
 * glyphs and some as pen movements, so the same visible sentence can extract
 * with or without its spaces depending on whether it is set in bold.
 *
 * Quotes and dashes fold to ASCII, and the fold is wider than the characters
 * the source actually contains, because a `/ToUnicode` CMap reports whatever
 * codepoint the subsetted font assigned its glyph — not the one the HTML was
 * authored with. This résumé's bold face maps its apostrophe to U+02BC
 * MODIFIER LETTER APOSTROPHE, so `Disney’s` in the page extracts as `Disneyʼs`
 * from the PDF. Folding both to `'` lets an expected string be written in
 * plain characters and compared against either.
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeForOrder(text) {
  return text
    .replace(/[‘’‚‛ʻʼʽ′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐‑‒–—―]/g, '-')
    .replace(/\s+/g, '');
}
