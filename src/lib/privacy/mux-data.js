/*
 * #1264: Mux Data (mux-embed's playback analytics) under the #1079 privacy
 * controls. Video playback is unchanged; only the analytics follow the gate.
 *
 * Contract: specs/analytics-privacy.md (§ Choice Model, § Withdrawal) and
 * nathanpaynedotcom#1264. What this does with each mux-embed option, and what
 * it cannot recall, is recorded in specs/analytics.md § Privacy Runtime.
 *
 * src/components/ProjectMuxPlayer.astro inlines this file verbatim as a
 * classic inline script, only when privacyControlsEnabled() and the page has
 * a Mux hero, ahead of the component's bundled module script. Module scripts
 * run after the document is parsed, so this always runs first, and always
 * after the head gate (src/lib/privacy/gate.js). It has no imports and no
 * network access. tests/privacy-runtime.test.js executes this exact file;
 * like the gate, it must never contain script-tag or HTML-comment markup.
 *
 * The seam is `globalThis.mux`, the only hook @mux/mux-background-video
 * 0.2.3 offers: its load() calls `mux.monitor(video, { debug, data })` when
 * that global is set and skips monitoring when it is not, and playback
 * (`super.load()`) never depends on it (the package's
 * src/mux-background-video.ts). The component's loader in
 * ProjectMuxPlayer.astro imports mux-embed and assigns it to that global. This
 * script turns the global into an accessor:
 *
 * - Granted (the gate exists, and its boot decision and the current state are
 *   both granted): the assigned mux-embed is replaced by a wrapper whose
 *   monitor() adds `disableCookies: true` (no `muxData` cookie),
 *   `respectDoNotTrack: true` (nothing is sent while the browser sends Do Not
 *   Track, a signal separate from GPC), and `data.page_url` reduced by the
 *   gate's own scrubUrl. All three are documented mux-embed 5.18.1 options
 *   (the package's dist/types/mux-embed.d.ts, `Options` and `Metadata`);
 *   without the last, it sends `window.location.href` whole.
 * - Otherwise (denied by choice or by GPC, or the gate missing or broken: fail
 *   closed): the assignment is discarded and the global reads as undefined,
 *   so the component never starts a monitor. The mux-embed chunk still
 *   downloads from this site, but it never monitors, sets a cookie, or sends.
 * - Withdrawn mid-visit: the global reads as undefined from then on, active
 *   monitors are destroyed, and the gate's transport guard refuses anything
 *   mux-embed still sends to litix.io, including the final flush that
 *   destroying a monitor triggers.
 */
(function (w) {
  'use strict';

  var privacy = w.npPrivacy;
  var gate = privacy && privacy[Symbol.for('np-privacy.internal')];
  var granted =
    !!gate && gate.boot.effective === 'granted' && privacy.get().effective === 'granted';
  var real = null;
  var wrapped;
  var monitored = [];

  /** The component's monitor options, plus the three this site requires. */
  function monitorOptions(options) {
    var out = Object.assign({}, options, { disableCookies: true, respectDoNotTrack: true });
    out.data = Object.assign({}, options && options.data, {
      page_url: gate.scrubUrl(w.location.href),
    });
    return out;
  }

  function wrap(mux) {
    var out = Object.create(mux);
    out.monitor = function (target, options) {
      var result = mux.monitor(target, monitorOptions(options));
      monitored.push(target);
      return result;
    };
    return Object.freeze(out);
  }

  /** § Withdrawal: the gate arms its transport guard before calling this. */
  function stop() {
    var targets = monitored;
    monitored = [];
    for (var i = 0; i < targets.length; i++) {
      try {
        real.destroyMonitor(targets[i]);
      } catch (_e) {
        // The guard still refuses whatever this monitor tries to send.
      }
    }
  }

  if (granted) gate.registerTool('mux-data', { stop: stop });

  Object.defineProperty(w, 'mux', {
    configurable: true,
    enumerable: true,
    get: function () {
      return granted && !gate.withdrawn() ? wrapped : undefined;
    },
    set: function (mux) {
      if (!granted || real || !mux || typeof mux.monitor !== 'function') return;
      real = mux;
      wrapped = wrap(mux);
    },
  });
})(window);
