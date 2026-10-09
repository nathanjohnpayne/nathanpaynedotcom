/**
 * Decoding of what the browser sent to the local sink (#1230).
 *
 * An absence assertion ("no canary in any payload") is only meaningful if the
 * payload was actually readable, so every body is decoded as far as the SDKs
 * encode it, and a body that could not be read is flagged `undecoded` so the
 * absence helpers can refuse to pass over it.
 *
 * Encodings handled, from the vendors' own code (posthog-js 1.438.3):
 *   - request body: gzip (`1f 8b`), plain JSON, and `data=<base64 JSON>` forms;
 *   - replay snapshot items: rrweb events whose `data` field posthog-js
 *     compresses (`cv: "2024-10"`) as a latin-1 string of gzip bytes, and
 *     base64-gzip strings (`H4sI…`).
 * GA4 hits are URL-encoded `key=value` lines (Google Analytics Measurement
 * Protocol shape), one event per body line.
 */
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

export interface PostHogEvent {
  event: string;
  properties: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Ga4Event {
  name: string;
  params: Record<string, string>;
}

export interface DecodedBody {
  /** Everything searchable: decompressed text, URL-decoded variants, expanded JSON. */
  searchable: string;
  /**
   * The decompressed body as sent, without decoded variants and WITHOUT the request URL: what the URL-allowlist
   * check should scan. The transport URL (SDK parameters such as ip, _, ver, compression) is not captured content;
   * it stays in `searchable`, so canary and contact searches still cover it.
   */
  plain: string;
  /** True when part of the body could not be decoded and so cannot be searched. */
  undecoded: boolean;
  json?: unknown;
}

const GZIP_MAGIC = Buffer.from([0x1f, 0x8b]);

function tryGunzip(buf: Buffer): Buffer | undefined {
  try {
    return gunzipSync(buf);
  } catch {
    return undefined;
  }
}

function safeDecodeURIComponent(s: string): string {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '));
  } catch {
    return s;
  }
}

/**
 * rrweb trees add two levels per DOM level (node, then its childNodes array), so the cap is far deeper than any
 * real page; hitting it is reported as undecoded, never as success.
 */
const MAX_EXPAND_DEPTH = 400;

/** Recursively expand compressed strings that posthog-js embeds inside JSON. */
export function deepExpand(value: unknown, depth = 0): { value: unknown; undecoded: boolean } {
  if (depth > MAX_EXPAND_DEPTH) {
    // Out of depth: whatever is left may hold compressed values this walk will never inflate, so say so
    // rather than reporting a clean decode. (Scalars that cannot hide anything stay clean.)
    const mayHide =
      (typeof value === 'object' && value !== null) ||
      (typeof value === 'string' && (value.startsWith('\u001f\u008b') || /^H4sI/.test(value)));
    return { value, undecoded: mayHide };
  }
  let undecoded = false;
  if (typeof value === 'string') {
    if (value.startsWith('\u001f\u008b')) {
      const inflated = tryGunzip(Buffer.from(value, 'latin1'));
      if (!inflated) return { value, undecoded: true };
      const text = inflated.toString('utf8');
      try {
        return deepExpand(JSON.parse(text), depth + 1);
      } catch {
        return { value: text, undecoded: false };
      }
    }
    if (/^H4sI[A-Za-z0-9+/=]{16,}$/.test(value)) {
      const inflated = tryGunzip(Buffer.from(value, 'base64'));
      if (!inflated) return { value, undecoded: true };
      const text = inflated.toString('utf8');
      try {
        return deepExpand(JSON.parse(text), depth + 1);
      } catch {
        return { value: text, undecoded: false };
      }
    }
    return { value, undecoded: false };
  }
  if (Array.isArray(value)) {
    const out = value.map((item) => {
      const r = deepExpand(item, depth + 1);
      undecoded ||= r.undecoded;
      return r.value;
    });
    return { value: out, undecoded };
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const r = deepExpand(v, depth + 1);
      undecoded ||= r.undecoded;
      out[k] = r.value;
    }
    return { value: out, undecoded };
  }
  return { value, undecoded: false };
}

/** The request body as text, inflated first when it is gzip (undefined when it claims gzip and is not). */
export function bodyAsText(body: Buffer): string | undefined {
  if (!body.subarray(0, 2).equals(GZIP_MAGIC)) return body.toString('utf8');
  return tryGunzip(body)?.toString('utf8');
}

export function decodeBody(
  body: Buffer,
  contentType: string | undefined,
  url: string,
): DecodedBody {
  const urlText = safeDecodeURIComponent(url);
  if (body.length === 0) return { searchable: urlText, plain: '', undecoded: false };

  let bytes = body;
  if (body.subarray(0, 2).equals(GZIP_MAGIC)) {
    const inflated = tryGunzip(body);
    if (!inflated) return { searchable: urlText, plain: '', undecoded: true };
    bytes = inflated;
  }
  let text = bytes.toString('utf8');

  // Form-encoded `data=<base64>` bodies (posthog-js's non-gzip fallback).
  if ((contentType ?? '').includes('application/x-www-form-urlencoded') && /^data=/.test(text)) {
    // URLSearchParams turns an unencoded `+` into a space; base64 has no spaces, so put the `+` back.
    const data = new URLSearchParams(text).get('data')?.replace(/ /g, '+');
    if (data) {
      const raw = Buffer.from(data, 'base64');
      // Node's decoder never throws: it skips invalid characters and accepts missing padding, so `!!!` becomes
      // an empty buffer. Accept only canonical base64 (re-encoding gives the input back), else flag the body.
      if (raw.toString('base64') !== data) {
        return { searchable: urlText + text, plain: text, undecoded: true };
      }
      const inflated = raw.subarray(0, 2).equals(GZIP_MAGIC) ? tryGunzip(raw) : raw;
      if (!inflated) return { searchable: urlText + text, plain: text, undecoded: true };
      text = inflated.toString('utf8');
    }
  }

  const trimmed = text.trimStart();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const expanded = deepExpand(JSON.parse(text));
      const flat = JSON.stringify(expanded.value);
      return {
        searchable: `${urlText}\n${flat}\n${safeDecodeURIComponent(flat)}`,
        plain: flat,
        undecoded: expanded.undecoded,
        json: expanded.value,
      };
    } catch {
      // A body that opens like JSON but does not parse (truncated, corrupted) cannot be searched reliably: a
      // compressed value inside it stays opaque. Flag it so an absence check refuses to pass over it.
      return {
        searchable: `${urlText}\n${text}\n${safeDecodeURIComponent(text)}`,
        plain: text,
        undecoded: true,
      };
    }
  }
  // A body that is mostly non-printable and was not recognised cannot be searched.
  // eslint-disable-next-line no-control-regex
  const printable = /^[\x09\x0a\x0d\x20-\x7e]*$/.test(text);
  return {
    searchable: `${urlText}\n${text}\n${safeDecodeURIComponent(text)}`,
    plain: text,
    undecoded: !printable,
  };
}

/** Flatten a decoded PostHog body into events (single event, array, or `{batch}`). */
export function postHogEvents(json: unknown): PostHogEvent[] {
  const out: PostHogEvent[] = [];
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    const obj = node as Record<string, unknown>;
    if (Array.isArray(obj.batch)) return visit(obj.batch);
    if (typeof obj.event === 'string') {
      out.push({
        ...obj,
        event: obj.event,
        properties: (obj.properties as Record<string, unknown>) ?? {},
      });
    }
  };
  visit(json);
  return out;
}

/** Parse a GA4 `collect` request into its events (common params merged into each). */
export function ga4Events(url: string, body: string): Ga4Event[] {
  const u = new URL(url);
  const common: Record<string, string> = {};
  for (const [k, v] of u.searchParams) common[k] = v;
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return common.en ? [{ name: common.en, params: common }] : [];
  }
  return lines.map((line) => {
    const params: Record<string, string> = { ...common };
    for (const [k, v] of new URLSearchParams(line)) params[k] = v;
    return { name: params.en ?? '(none)', params };
  });
}

// ---------------------------------------------------------------------------
// Canary search

export interface Hit {
  canary: string;
  form: string;
}

/** Variants a literal could be transmitted as: raw, URL-encoded, lowercased. */
export function literalVariants(canary: string): string[] {
  const variants = new Set<string>([
    canary,
    canary.toLowerCase(),
    encodeURIComponent(canary),
    encodeURIComponent(canary).toLowerCase(),
  ]);
  variants.add(canary.replace(/ /g, '+'));
  variants.add(canary.replace(/@/g, '%40'));
  return [...variants];
}

export function findLiterals(searchable: string, canaries: readonly string[]): Hit[] {
  const hits: Hit[] = [];
  const lower = searchable.toLowerCase();
  for (const canary of canaries) {
    for (const form of literalVariants(canary)) {
      if (searchable.includes(form) || lower.includes(form.toLowerCase())) {
        hits.push({ canary, form });
        break;
      }
    }
  }
  return hits;
}

/** SHA-256 of a normalized value, in the encodings Google's documentation shows (hex) plus base64 and base64url. */
export function digestForms(normalized: string): string[] {
  const digest = createHash('sha256').update(normalized).digest();
  return [digest.toString('hex'), digest.toString('base64'), digest.toString('base64url')];
}

export function findDigests(searchable: string, normalizedValues: readonly string[]): Hit[] {
  const hits: Hit[] = [];
  const lower = searchable.toLowerCase();
  for (const value of normalizedValues) {
    for (const form of digestForms(value)) {
      // hex is compared case-insensitively; base64 forms are case-sensitive.
      const found = /^[0-9a-f]{64}$/.test(form) ? lower.includes(form) : searchable.includes(form);
      if (found) {
        hits.push({ canary: `sha256(${value})`, form });
        break;
      }
    }
  }
  return hits;
}
