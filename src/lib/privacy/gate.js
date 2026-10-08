/*
 * #1079 analytics privacy gate and runtime.
 *
 * Contract: specs/analytics-privacy.md (§ Choice Model, § Storage, § Gate,
 * § Runtime API, § Withdrawal, § Re-Enable, § Capture Minimization). What the
 * runtime does with each vendor, and what it cannot recall, is recorded in
 * specs/analytics.md § Privacy Runtime.
 *
 * src/components/privacy/PrivacyHead.astro inlines this file verbatim as one
 * synchronous inline script in the document head, before the analytics
 * blocks, and only when privacyControlsEnabled(). It is a classic script: no
 * imports, no network access, and nothing global but `window`. The PostHog
 * block (src/components/posthog.astro) and the GA4 block
 * (src/layouts/BaseLayout.astro) read `window.npPrivacy` and its internal
 * channel; if either is missing they load nothing (fail closed).
 *
 * tests/privacy-runtime.test.js executes this exact file. Because it is
 * inlined into HTML, it must never contain script-tag or HTML-comment markup;
 * that test fails if it does.
 */
(function (w) {
  'use strict';

  var STORAGE_KEY = 'np-privacy';
  var CHANGE_EVENT = 'np:privacy-change';
  var INTERNAL = Symbol.for('np-privacy.internal');

  /**
   * The only query parameters a URL keeps on its way to PostHog or GA4
   * (§ Capture Minimization 3). The five UTM parameters, plus the Google click
   * identifiers, which stay until Nathan decides (decision item 4). This is the
   * one allowlist; there is deliberately no blocklist anywhere.
   */
  var ALLOWED_QUERY_PARAMS = Object.freeze([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
    'gbraid',
    'wbraid',
    'dclid',
  ]);

  /** Replay never records these paths or anything under them (§ Capture Minimization 2). */
  var REPLAY_EXCLUDED_PATHS = Object.freeze(['/privacy/']);

  /** Replay masks text inside this selector and blocks these regions (§ Capture Minimization 1). */
  var MASK_SELECTOR = '[data-np-privacy="mask"]';
  var BLOCK_SELECTOR = 'form, [data-np-privacy="block"]';

  /**
   * Element attributes an autocapture event may carry: the structural ones
   * PostHog selectors match on (§ Capture Minimization 4). Every other
   * attribute, and every data-* attribute, is dropped from event payloads.
   */
  var STRUCTURAL_ATTRIBUTES = Object.freeze([
    'id',
    'class',
    'href',
    'name',
    'type',
    'role',
    'aria-label',
  ]);

  /**
   * data-* attributes whose values replay keeps, because src/styles/global.css
   * selects on them and the recording would not render without them. Their
   * values are site-authored enums. Every other data-* value is emptied in
   * replay. tests/privacy-runtime.test.js fails if one stops being a selector.
   */
  var REPLAY_DATA_ATTRIBUTES = Object.freeze([
    'data-accent',
    'data-focus',
    'data-fonts-pending',
    'data-palette',
    'data-playback-state',
  ]);

  /**
   * Hosts the transport guard refuses once analytics are withdrawn, matched on
   * a label boundary. Mirrors ANALYTICS_HOSTS in src/integrations/resume-pdf.mjs,
   * plus doubleclick.net, where GA4 sends Google signals hits when they are on.
   */
  var ANALYTICS_HOSTS = Object.freeze([
    'd.nathanpayne.com',
    'posthog.com',
    'googletagmanager.com',
    'google-analytics.com',
    'analytics.google.com',
    'doubleclick.net',
  ]);

  var ABSOLUTE_HTTP = /^https?:\/\//i;
  var HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
  // Property keys whose relative values are URLs too ($current_url, $referrer,
  // href, attr__href, to_post_href, $session_entry_url, ...).
  var URL_KEY = /(^|[_$])(url|href|referrer)$/i;
  var TEXT_KEYS = ['$el_text', '$selected_content'];

  // ---------------------------------------------------------------- storage

  function unsetState() {
    return { choice: 'unset', noticeDismissed: false };
  }

  /** § Storage 2: missing, unparseable, unknown `v`, or unknown `choice` reads as unset. */
  function parseStored(raw) {
    if (typeof raw !== 'string') return unsetState();
    var value;
    try {
      value = JSON.parse(raw);
    } catch (_e) {
      return unsetState();
    }
    if (!value || typeof value !== 'object' || value.v !== 1) return unsetState();
    if (value.choice !== 'granted' && value.choice !== 'denied' && value.choice !== 'unset') {
      return unsetState();
    }
    return { choice: value.choice, noticeDismissed: value.noticeDismissed === true };
  }

  /** § Storage 3: a read that throws is treated as unset. */
  function readStorage() {
    var raw;
    try {
      raw = w.localStorage.getItem(STORAGE_KEY);
    } catch (_e) {
      return unsetState();
    }
    return parseStored(raw);
  }

  /** § Storage 3: returns false when the write throws; the caller keeps the choice in memory. */
  function writeStorage(choice, noticeDismissed) {
    try {
      w.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ v: 1, choice: choice, noticeDismissed: noticeDismissed }),
      );
      return true;
    } catch (_e) {
      return false;
    }
  }

  // ----------------------------------------------------------------- choice

  /** Global Privacy Control: https://w3c.github.io/gpc/#javascript-property-to-detect-preference */
  function gpc() {
    try {
      return !!w.navigator && w.navigator.globalPrivacyControl === true;
    } catch (_e) {
      return false;
    }
  }

  /** § Choice Model 2–3: GPC wins over any saved choice; unset is default-on. */
  function resolve(saved, gpcActive) {
    if (gpcActive) return { effective: 'denied', reason: 'gpc' };
    if (saved === 'denied') return { effective: 'denied', reason: 'choice' };
    if (saved === 'granted') return { effective: 'granted', reason: 'choice' };
    return { effective: 'granted', reason: 'default' };
  }

  var stored = readStorage();
  var state = {
    saved: stored.choice,
    noticeDismissed: stored.noticeDismissed,
    persisted: true,
    loadedThisPage: false,
  };
  var current = resolve(state.saved, gpc());
  var boot = Object.freeze({ effective: current.effective, reason: current.reason });
  var tools = [];
  var listeners = [];
  // True once a withdrawal stopped the tools in this page view. Never reset:
  // re-enabling takes effect on the next page load only (§ Re-Enable 1).
  var withdrawn = false;

  function snapshot() {
    return {
      saved: state.saved,
      effective: current.effective,
      reason: current.reason,
      persisted: state.persisted,
      loadedThisPage: state.loadedThisPage,
    };
  }

  function fingerprint() {
    var s = snapshot();
    return [s.saved, s.effective, s.reason, s.persisted, state.noticeDismissed].join('|');
  }

  function stamp() {
    var root = w.document.documentElement;
    root.setAttribute('data-np-privacy', current.effective);
    root.setAttribute('data-np-privacy-reason', current.reason);
  }

  /**
   * § Withdrawal: stop every registered tool, then (in the caller) dispatch.
   * Setting `withdrawn` first arms the transport guard, so nothing the SDKs
   * still hold in memory can leave the page even if a stop hook throws.
   */
  function withdraw() {
    if (withdrawn) return;
    withdrawn = true;
    for (var i = 0; i < tools.length; i++) {
      try {
        tools[i].stop();
      } catch (_e) {
        // One tool failing to stop must not keep the other running.
      }
    }
  }

  function emit() {
    try {
      w.dispatchEvent(new w.CustomEvent(CHANGE_EVENT, { detail: snapshot() }));
    } catch (_e) {
      // A listener throwing must not undo the change.
    }
    var fns = listeners.slice();
    for (var i = 0; i < fns.length; i++) {
      try {
        fns[i](snapshot());
      } catch (_e) {
        // Same.
      }
    }
  }

  function apply(saved, noticeDismissed, persisted) {
    var before = fingerprint();
    state.saved = saved;
    state.noticeDismissed = noticeDismissed;
    if (typeof persisted === 'boolean') state.persisted = persisted;
    current = resolve(state.saved, gpc());
    if (current.effective === 'denied') withdraw();
    stamp();
    if (fingerprint() !== before) emit();
  }

  function set(choice) {
    if (choice !== 'granted' && choice !== 'denied') return false;
    // § Choice Model 3: GPC rejects granting; denying is saved so it survives GPC being turned off.
    if (choice === 'granted' && gpc()) return false;
    apply(choice, state.noticeDismissed, writeStorage(choice, state.noticeDismissed));
    return true;
  }

  function onChange(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.push(fn);
    return function () {
      var at = listeners.indexOf(fn);
      if (at >= 0) listeners.splice(at, 1);
    };
  }

  /** § Storage 4: another tab's change arrives through `storage` and applies as if made here. */
  function resync() {
    var next = readStorage();
    apply(next.choice, next.noticeDismissed);
  }

  // ------------------------------------------------------------------- URLs

  /** Keeps allowlisted `name=value` pairs verbatim and in order; drops the rest. */
  function keepAllowedQuery(search) {
    if (!search || search.length < 2) return '';
    var kept = [];
    var pairs = search.slice(1).split('&');
    for (var i = 0; i < pairs.length; i++) {
      var pair = pairs[i];
      if (!pair) continue;
      var eq = pair.indexOf('=');
      var name;
      try {
        name = decodeURIComponent((eq < 0 ? pair : pair.slice(0, eq)).replace(/\+/g, ' '));
      } catch (_e) {
        continue;
      }
      if (ALLOWED_QUERY_PARAMS.indexOf(name) >= 0) kept.push(pair);
    }
    return kept.length ? '?' + kept.join('&') : '';
  }

  /**
   * § Capture Minimization 3: reduce a URL to origin and path plus allowlisted
   * query parameters, always dropping the fragment. Relative input stays
   * relative (root-relative after resolution). Non-HTTP schemes (mailto:,
   * tel:, data:, blob:) are not page URLs and pass through. Anything that will
   * not parse is cut at its first `?` or `#`, which fails closed.
   */
  function scrubUrl(value) {
    if (typeof value !== 'string' || value === '') return value;
    var input = value.trim();
    var form;
    if (ABSOLUTE_HTTP.test(input)) form = 'absolute';
    else if (input.slice(0, 2) === '//') form = 'scheme-relative';
    else if (HAS_SCHEME.test(input)) return value;
    else form = 'relative';
    var url;
    try {
      url = new w.URL(input, w.location.href);
    } catch (_e) {
      return input.split(/[?#]/)[0];
    }
    var rest = url.pathname + keepAllowedQuery(url.search);
    if (form === 'absolute') return url.origin + rest;
    if (form === 'scheme-relative') return '//' + url.host + rest;
    return rest;
  }

  function isReplayExcluded(pathOrUrl) {
    var path;
    try {
      path = new w.URL(String(pathOrUrl), w.location.href).pathname;
    } catch (_e) {
      return true;
    }
    try {
      path = decodeURI(path);
    } catch (_e) {
      // Keep the encoded form; a malformed escape cannot match a prefix anyway.
    }
    for (var i = 0; i < REPLAY_EXCLUDED_PATHS.length; i++) {
      var prefix = REPLAY_EXCLUDED_PATHS[i];
      if (path === prefix.slice(0, -1) || path.indexOf(prefix) === 0) return true;
    }
    return false;
  }

  function isAnalyticsUrl(input) {
    var raw =
      typeof input === 'string'
        ? input
        : input && typeof input.url === 'string'
          ? input.url
          : input
            ? String(input)
            : '';
    if (!raw) return false;
    var host;
    try {
      host = new w.URL(raw, w.location.href).hostname.toLowerCase();
    } catch (_e) {
      return false;
    }
    for (var i = 0; i < ANALYTICS_HOSTS.length; i++) {
      var h = ANALYTICS_HOSTS[i];
      if (host === h || host.slice(-(h.length + 1)) === '.' + h) return true;
    }
    return false;
  }

  // --------------------------------------------------------- event payloads

  function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  function normalizeText(text) {
    return String(text == null ? '' : text)
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Text of every masked or blocked region on the page, for the autocapture text check. */
  function protectedTexts() {
    var out = [];
    try {
      var nodes = w.document.querySelectorAll(MASK_SELECTOR + ', ' + BLOCK_SELECTOR);
      for (var i = 0; i < nodes.length; i++) {
        var text = normalizeText(nodes[i].textContent);
        if (text) out.push(text);
      }
    } catch (_e) {
      // No document: nothing to protect.
    }
    return out;
  }

  function isProtectedText(value, ctx) {
    var text = normalizeText(value);
    if (!text) return false;
    if (!ctx.texts) ctx.texts = protectedTexts();
    for (var i = 0; i < ctx.texts.length; i++) {
      if (ctx.texts[i].indexOf(text) >= 0 || text.indexOf(ctx.texts[i]) >= 0) return true;
    }
    return false;
  }

  function scrubString(key, value) {
    // Classify the trimmed value: scrubUrl trims too, so a URL with leading
    // whitespace must not slip past as plain text.
    var trimmed = value.trim();
    // Absolute and scheme-relative URLs are URLs under any key.
    if (ABSOLUTE_HTTP.test(trimmed) || trimmed.slice(0, 2) === '//') return scrubUrl(value);
    // Under a URL-shaped key, any relative form that could carry a query or
    // fragment (`next/?x`, `../p?x`, `?x`, `#x`, `/p`) is a URL too. Values
    // with another scheme (mailto:, data:) and `$`-prefixed sentinels such as
    // PostHog's `$direct` are left alone, as are plain words, which have
    // nothing to scrub.
    if (
      URL_KEY.test(key) &&
      trimmed.charAt(0) !== '$' &&
      !HAS_SCHEME.test(trimmed) &&
      /[/?#]/.test(trimmed)
    ) {
      return scrubUrl(value);
    }
    return value;
  }

  /** One `$elements` entry: structural attributes only, URLs scrubbed, protected text dropped. */
  function scrubElement(element, ctx) {
    if (!isPlainObject(element)) return element;
    var out = {};
    for (var key in element) {
      if (!Object.prototype.hasOwnProperty.call(element, key)) continue;
      var value = element[key];
      if (key.indexOf('attr__') === 0) {
        var name = key.slice(6);
        if (STRUCTURAL_ATTRIBUTES.indexOf(name) < 0) continue;
        out[key] = name === 'href' ? scrubUrl(value) : value;
      } else if (key === 'href') {
        out[key] = scrubUrl(value);
      } else if (key === '$el_text') {
        if (!isProtectedText(value, ctx)) out[key] = value;
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  /**
   * `$elements_chain`: elements joined by `;`, each `tag.class1.class2:` then
   * `key="value"` pairs with `"` escaped as `\"`. Format from posthog-js
   * browser-common/src/utils/autocapture-utils.ts (elementsToString), v1.438.3:
   * https://github.com/PostHog/posthog-js/blob/posthog-js%401.438.3/packages/browser-common/src/utils/autocapture-utils.ts
   * Returns null when the string does not have that shape.
   */
  function parseChain(chain) {
    var elements = [];
    var i = 0;
    var n = chain.length;
    while (i < n) {
      var colon = chain.indexOf(':', i);
      if (colon < 0) return null;
      var head = chain.slice(i, colon);
      if (/[;"]/.test(head)) return null;
      i = colon + 1;
      var attrs = [];
      while (i < n && chain.charAt(i) !== ';') {
        var open = chain.indexOf('="', i);
        if (open < 0) return null;
        var key = chain.slice(i, open);
        if (!key || /[;"]/.test(key)) return null;
        var j = open + 2;
        while (j < n) {
          var c = chain.charAt(j);
          if (c === '\\' && chain.charAt(j + 1) === '"') {
            j += 2;
          } else if (c === '"') {
            break;
          } else {
            j += 1;
          }
        }
        if (j >= n) return null;
        attrs.push({ key: key, raw: chain.slice(open + 2, j) });
        i = j + 1;
      }
      elements.push({ head: head, attrs: attrs });
      if (i < n) i += 1;
    }
    return elements;
  }

  /*
   * Chain values use posthog-js's own encoding, not a general string escape.
   * Its escapeQuotes (`input.replace(/"|\\"/g, '\\"')`, autocapture-utils.ts
   * at the link above) puts a backslash before every `"` and never escapes a
   * backslash, so `\` stays a single `\` in the chain. Escaping backslashes
   * here would therefore double them in every value PostHog reads back.
   *
   * The pair below is round-trip-safe on everything that format produces:
   * parseChain only ends a value at a `"` with no backslash before it, so every
   * `"` inside a raw value is the second half of a `\"`; decode removes exactly
   * that backslash and encode puts it back, so encode(decode(raw)) === raw,
   * including for `\\"` and lone backslashes. tests/privacy-runtime.test.js
   * checks this against posthog-js's escapeQuotes. A value that itself ends in
   * a backslash is ambiguous in PostHog's format (`\` + closing `"` reads as
   * `\"`); parseChain then runs into the next value's opening quote and the
   * chain is dropped whole (also tested).
   */
  function decodeChainValue(raw) {
    return raw.replace(/\\"/g, '"');
  }

  function encodeChainValue(value) {
    return String(value).replace(/"/g, '\\"');
  }

  /**
   * Keeps the chain attributes PostHog selectors use (nth-child, nth-of-type,
   * attr_id, text) plus structural `attr__*` ones, scrubs hrefs, and drops
   * text from masked or blocked regions. A chain that will not parse is
   * dropped whole: an unknown shape could carry anything.
   */
  function scrubChain(chain, ctx) {
    var elements = parseChain(chain);
    if (!elements) return '';
    var out = [];
    for (var e = 0; e < elements.length; e++) {
      var kept = '';
      var attrs = elements[e].attrs;
      for (var a = 0; a < attrs.length; a++) {
        var key = attrs[a].key;
        var raw = attrs[a].raw;
        if (key === 'href' || key === 'attr__href') {
          raw = encodeChainValue(scrubUrl(decodeChainValue(raw)));
          // Scrubbing can leave a trailing backslash a raw value never had
          // (`?utm_source=a\&email=x` becomes `?utm_source=a\`), and `\` before
          // the closing quote reads as `\"` in PostHog's format, so the value
          // would run into the next attribute. Drop that attribute instead.
          if (raw.charAt(raw.length - 1) === '\\') continue;
        } else if (key === 'text') {
          if (isProtectedText(decodeChainValue(raw), ctx)) continue;
        } else if (key.indexOf('attr__') === 0) {
          if (STRUCTURAL_ATTRIBUTES.indexOf(key.slice(6)) < 0) continue;
        } else if (key !== 'nth-child' && key !== 'nth-of-type' && key !== 'attr_id') {
          continue;
        }
        kept += key + '="' + raw + '"';
      }
      out.push(elements[e].head + ':' + kept);
    }
    return out.join(';');
  }

  function mergeInto(out, key, value) {
    if (!Object.prototype.hasOwnProperty.call(out, key)) {
      out[key] = value;
    } else if (Array.isArray(out[key]) && Array.isArray(value)) {
      out[key] = out[key].concat(value);
    }
  }

  /**
   * Walks properties (and $set / $set_once) scrubbing every URL-valued string,
   * every URL-shaped key ($heatmap_data is keyed by page URL), autocapture
   * element data, and masked-region text.
   */
  function scrubTree(node, depth, parentKey, ctx) {
    if (node === null || typeof node !== 'object') return node;
    // Fail closed: a branch nested past the limit is dropped, never returned
    // unexamined, so no URL can ride below it.
    if (depth > 8) return null;
    if (Array.isArray(node)) {
      return node.map(function (item) {
        return typeof item === 'string'
          ? scrubString(parentKey, item)
          : scrubTree(item, depth + 1, parentKey, ctx);
      });
    }
    if (!isPlainObject(node)) return node;
    var out = {};
    for (var key in node) {
      if (!Object.prototype.hasOwnProperty.call(node, key)) continue;
      var value = node[key];
      if (key === '$elements_chain' && typeof value === 'string') {
        value = scrubChain(value, ctx);
      } else if (key === '$elements' && Array.isArray(value)) {
        value = value.map(function (element) {
          return scrubElement(element, ctx);
        });
      } else if (TEXT_KEYS.indexOf(key) >= 0 && typeof value === 'string') {
        if (isProtectedText(value, ctx)) continue;
      } else if (typeof value === 'string') {
        value = scrubString(key, value);
      } else {
        value = scrubTree(value, depth + 1, key, ctx);
      }
      mergeInto(out, ABSOLUTE_HTTP.test(key.trim()) ? scrubUrl(key) : key, value);
    }
    return out;
  }

  /**
   * PostHog `before_send`. Runs for every event the SDK captures, `$snapshot`
   * included, after the SDK builds the payload and before it is queued;
   * returning null drops the event.
   * https://posthog.com/docs/libraries/js/features#amending-or-sampling-events
   *
   * Replay content is minimized at its source (maskAttributeFn,
   * maskCapturedNetworkRequestFn, the masking selectors), because full
   * snapshots and mutations arrive here already gzip-compressed; for
   * `$snapshot` everything except `$snapshot_data` is scrubbed.
   */
  function scrubEvent(event) {
    if (withdrawn) return null;
    if (!event || typeof event !== 'object') return event;
    var ctx = { texts: null };
    if (event.event === '$snapshot' && isPlainObject(event.properties)) {
      // The compressed recording is minimized at its source; every other
      // property, and $set / $set_once below, is scrubbed as on any event.
      var props = event.properties;
      var hasData = Object.prototype.hasOwnProperty.call(props, '$snapshot_data');
      var data = props.$snapshot_data;
      var rest = {};
      for (var key in props) {
        if (key !== '$snapshot_data' && Object.prototype.hasOwnProperty.call(props, key)) {
          rest[key] = props[key];
        }
      }
      event.properties = scrubTree(rest, 0, '', ctx);
      if (hasData) event.properties.$snapshot_data = data;
    } else if (event.properties) {
      event.properties = scrubTree(event.properties, 0, '', ctx);
    }
    if (event.$set) event.$set = scrubTree(event.$set, 0, '', ctx);
    if (event.$set_once) event.$set_once = scrubTree(event.$set_once, 0, '', ctx);
    return event;
  }

  // ----------------------------------------------------------------- replay

  /**
   * Attributes whose value is a single URL, on any element, HTML or SVG.
   * Covers every attribute rrweb itself resolves as a URL (src, href,
   * xlink:href, background, object data; rrweb-snapshot transformAttribute,
   * v1.438.3) plus the other HTML URL attributes, and rr_src, which rrweb
   * synthesizes from an iframe's src.
   */
  var REPLAY_URL_ATTRIBUTES = Object.freeze([
    'href',
    'src',
    'xlink:href',
    'action',
    'formaction',
    'poster',
    'data',
    'cite',
    'background',
    'longdesc',
    'manifest',
    'codebase',
    'rr_src',
  ]);
  /** Attributes holding srcset-style candidate lists: a URL plus optional descriptors each. */
  var REPLAY_SRCSET_ATTRIBUTES = Object.freeze(['srcset', 'imagesrcset']);
  var SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
  var SRCSET_SEPARATORS = /^[, \t\n\r\f]+/;
  var SRCSET_URL = /^[^ \t\n\r\f]+/;

  /**
   * Scrubs every candidate URL in a srcset and keeps its descriptors. Splits
   * the way rrweb does (rrweb-snapshot getAbsoluteSrcsetString, after the HTML
   * spec's srcset parser): a URL is a run of non-whitespace, so a comma inside
   * one (a data: URL) does not split it, and descriptors run to the next comma
   * outside parentheses.
   */
  function scrubSrcset(value) {
    var out = [];
    var pos = 0;
    var n = value.length;
    while (pos < n) {
      var separators = SRCSET_SEPARATORS.exec(value.slice(pos));
      if (separators) pos += separators[0].length;
      if (pos >= n) break;
      var url = SRCSET_URL.exec(value.slice(pos))[0];
      pos += url.length;
      if (url.slice(-1) === ',') {
        out.push(scrubUrl(url.replace(/,+$/, '')));
        continue;
      }
      var descriptors = '';
      var inParens = false;
      while (pos < n) {
        var c = value.charAt(pos);
        if (!inParens && c === ',') {
          pos += 1;
          break;
        }
        if (c === '(') inParens = true;
        else if (c === ')') inParens = false;
        descriptors += c;
        pos += 1;
      }
      out.push((scrubUrl(url) + descriptors).trim());
    }
    return out.join(', ');
  }

  /**
   * PostHog `session_recording.maskAttributeFn` (rrweb `maskAttributeFn`): called
   * for every non-empty attribute rrweb serializes, in full snapshots and
   * mutations, after rrweb has made URLs absolute. Typed option, v1.438.3:
   * https://github.com/PostHog/posthog-js/blob/posthog-js%401.438.3/packages/types/src/posthog-config.ts
   *
   * - data-* values outside the rendering allowlist are emptied.
   * - Every URL is reduced to the allowlist, whatever the element: the URL
   *   attributes above, each srcset candidate, each `ping` URL, and any other
   *   attribute whose whole value is an absolute http(s) URL (`<meta content>`).
   *   Replay then refetches images, fonts, and stylesheets without their query
   *   strings, so some third-party assets may not render in playback.
   * - An SVG `href="#id"` is a reference to an element, not a URL, and is kept
   *   (rrweb treats it the same way).
   * - `style` and inlined stylesheets (`_cssText`) pass through: rrweb hands
   *   them over as whole CSS text, and scrubbing their `url(...)` values would
   *   take a CSS tokenizer. Recorded in specs/analytics.md § Privacy Runtime.
   */
  function maskReplayAttribute(name, value, element) {
    var attr = String(name).toLowerCase();
    if (attr.indexOf('data-') === 0) {
      return REPLAY_DATA_ATTRIBUTES.indexOf(attr) >= 0 ? value : '';
    }
    if (typeof value !== 'string' || value === '') return value;
    if (REPLAY_URL_ATTRIBUTES.indexOf(attr) >= 0) {
      var isSvg = !!element && element.namespaceURI === SVG_NAMESPACE;
      if (isSvg && value.charAt(0) === '#') return value;
      return scrubUrl(value);
    }
    if (REPLAY_SRCSET_ATTRIBUTES.indexOf(attr) >= 0) return scrubSrcset(value);
    if (attr === 'ping') {
      return value
        .split(/[ \t\n\r\f]+/)
        .filter(Boolean)
        .map(scrubUrl)
        .join(' ');
    }
    if (attr === 'style' || attr === '_csstext') return value;
    return ABSOLUTE_HTTP.test(value.trim()) ? scrubUrl(value) : value;
  }

  /**
   * PostHog `session_recording.maskCapturedNetworkRequestFn`. The recorder
   * also runs it on the page URL it stores in replay metadata (the Meta event
   * href and the `$pageview` / `$url_changed` custom events), so this is the
   * supported way to scrub those hrefs.
   * https://posthog.com/docs/session-replay/network-recording
   * https://posthog.com/docs/session-replay/privacy#url-redaction
   */
  function maskNetworkRequest(request) {
    if (!request || typeof request !== 'object') return request;
    var out = {};
    for (var key in request) {
      if (Object.prototype.hasOwnProperty.call(request, key)) out[key] = request[key];
    }
    if (typeof out.name === 'string' && out.name) out.name = scrubUrl(out.name);
    return out;
  }

  // -------------------------------------------------------- transport guard

  var guardInstalled = false;

  /**
   * After a withdrawal, refuses every fetch, sendBeacon, and XHR to an
   * analytics host, so nothing an SDK still holds in memory leaves the page.
   * Installed when the first tool registers, before its SDK script exists:
   * posthog-js captures `fetch` and `XMLHttpRequest` at module load, and its
   * batch queue flushes on a timer without rechecking consent and has no
   * public API to empty it (request-queue.ts, v1.438.3:
   * https://github.com/PostHog/posthog-js/blob/posthog-js%401.438.3/packages/browser/src/request-queue.ts).
   * Until a withdrawal it passes everything through untouched.
   */
  function installGuard() {
    if (guardInstalled) return;
    guardInstalled = true;
    var nativeFetch = w.fetch;
    if (typeof nativeFetch === 'function' && typeof w.Response === 'function') {
      w.fetch = function (input) {
        if (withdrawn && isAnalyticsUrl(input)) {
          return Promise.resolve(new w.Response(null, { status: 204 }));
        }
        return nativeFetch.apply(this, arguments);
      };
    }
    var nav = w.navigator;
    if (nav && typeof nav.sendBeacon === 'function') {
      var nativeBeacon = nav.sendBeacon;
      nav.sendBeacon = function (url) {
        if (withdrawn && isAnalyticsUrl(url)) return true;
        return nativeBeacon.apply(this, arguments);
      };
    }
    var Xhr = w.XMLHttpRequest;
    if (Xhr && Xhr.prototype && typeof w.WeakMap === 'function') {
      var urls = new w.WeakMap();
      var nativeOpen = Xhr.prototype.open;
      var nativeSend = Xhr.prototype.send;
      Xhr.prototype.open = function (_method, url) {
        urls.set(this, url);
        return nativeOpen.apply(this, arguments);
      };
      Xhr.prototype.send = function () {
        if (withdrawn && isAnalyticsUrl(urls.get(this))) return undefined;
        return nativeSend.apply(this, arguments);
      };
    }
  }

  // ------------------------------------------------------------- navigation

  var navListeners = [];
  var navInstalled = false;

  function notifyNavigation(url, phase) {
    for (var i = 0; i < navListeners.length; i++) {
      try {
        navListeners[i](url, phase);
      } catch (_e) {
        // A listener failing must not break navigation.
      }
    }
  }

  /**
   * Calls `fn(url, phase)` on every client-side navigation the browser can
   * perform (§ Capture Minimization 2): `pushState` and `replaceState` with
   * phase 'before' (the target, before the URL changes) and 'after'; and
   * `popstate`, `hashchange`, and back/forward-cache restores with 'after'.
   */
  function onNavigate(fn) {
    if (typeof fn !== 'function') return;
    navListeners.push(fn);
    if (navInstalled) return;
    navInstalled = true;
    var hist = w.history;
    ['pushState', 'replaceState'].forEach(function (method) {
      var native = hist && hist[method];
      if (typeof native !== 'function') return;
      hist[method] = function (_state, _unused, url) {
        if (url !== undefined && url !== null) {
          var target = null;
          try {
            target = new w.URL(String(url), w.location.href).href;
          } catch (_e) {
            // The native call will throw for this URL too.
          }
          if (target) notifyNavigation(target, 'before');
        }
        var result = native.apply(this, arguments);
        notifyNavigation(w.location.href, 'after');
        return result;
      };
    });
    w.addEventListener('popstate', function () {
      notifyNavigation(w.location.href, 'after');
    });
    w.addEventListener('hashchange', function () {
      notifyNavigation(w.location.href, 'after');
    });
    w.addEventListener('pageshow', function (event) {
      if (event.persisted) notifyNavigation(w.location.href, 'after');
    });
  }

  // ------------------------------------------------------------------ tools

  /**
   * Called by an analytics block immediately before it creates its SDK script.
   * `hooks.stop` must stop that tool for the rest of the page view.
   */
  function registerTool(name, hooks) {
    var tool = { name: String(name), stop: hooks && hooks.stop };
    if (typeof tool.stop !== 'function') tool.stop = function () {};
    state.loadedThisPage = true;
    installGuard();
    tools.push(tool);
    if (withdrawn || current.effective !== 'granted') {
      withdrawn = true;
      try {
        tool.stop();
      } catch (_e) {
        // Fail closed through the guard.
      }
    }
  }

  // -------------------------------------------------------------------- API

  var internal = Object.freeze({
    boot: boot,
    withdrawn: function () {
      return withdrawn;
    },
    registerTool: registerTool,
    onNavigate: onNavigate,
    scrubUrl: scrubUrl,
    scrubEvent: scrubEvent,
    maskReplayAttribute: maskReplayAttribute,
    maskNetworkRequest: maskNetworkRequest,
    isReplayExcluded: isReplayExcluded,
    isAnalyticsUrl: isAnalyticsUrl,
    ALLOWED_QUERY_PARAMS: ALLOWED_QUERY_PARAMS,
    REPLAY_EXCLUDED_PATHS: REPLAY_EXCLUDED_PATHS,
    MASK_SELECTOR: MASK_SELECTOR,
    BLOCK_SELECTOR: BLOCK_SELECTOR,
    STRUCTURAL_ATTRIBUTES: STRUCTURAL_ATTRIBUTES,
    REPLAY_DATA_ATTRIBUTES: REPLAY_DATA_ATTRIBUTES,
    ANALYTICS_HOSTS: ANALYTICS_HOSTS,
  });

  var api = {
    version: 1,
    get: snapshot,
    set: set,
    gpc: gpc,
    onChange: onChange,
    notice: Object.freeze({
      shouldShow: function () {
        return state.saved === 'unset' && !state.noticeDismissed && !gpc();
      },
      dismiss: function () {
        apply(state.saved, true, writeStorage(state.saved, true));
      },
    }),
  };
  Object.defineProperty(api, INTERNAL, { value: internal });
  Object.freeze(api);

  stamp();
  w.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY || event.key === null) resync();
  });
  // A page restored from the back/forward cache missed every storage event
  // while it was frozen, so it re-reads the saved choice.
  w.addEventListener('pageshow', function (event) {
    if (event.persisted) resync();
  });
  w.npPrivacy = api;
})(window);
