/*
 * #1079 privacy notice behaviour (specs/analytics-privacy.md § UI Hooks,
 * § Runtime API). src/components/privacy/ui/PrivacyNotice.astro inlines this
 * file verbatim as one classic script after the notice markup, only when
 * privacyControlsEnabled(). It talks to window.npPrivacy and to nothing
 * else: no analytics global, no network, no storage of its own.
 *
 * tests/privacy-ui.test.js executes this exact file in JSDOM against the real
 * gate, so it must never contain script-tag or HTML-comment markup.
 */
(function (w, d) {
  'use strict';

  var privacy = w.npPrivacy;
  var notice = d.getElementById('np-privacy-notice');
  var status = d.getElementById('np-privacy-notice-status');
  // Without the gate there is no choice to offer, so the notice stays as it
  // was rendered: hidden. Showing buttons that could do nothing would be worse.
  if (!notice || !status || !privacy || !privacy.notice) return;
  // On the page that carries the controls (/privacy/), the controls are the
  // surface; a second copy of the same choice above them would only repeat it.
  // Nothing is saved, so the notice still shows on the next page until the
  // visitor chooses or dismisses it there.
  if (d.getElementById('np-privacy-controls')) return;

  /**
   * BaseLayout mounts the notice at the end of <body>. It is moved to the top
   * so it sits in the document flow above the page content: never positioned
   * over anything, never trapping focus or scroll, on any viewport (§ UI
   * Hooks: non-modal; PRIV-6, PRIV-14). The status line follows it so an
   * announcement made as the notice closes has a place to land.
   */
  function placeAtTop() {
    var body = d.body;
    if (!body) return;
    if (body.firstChild !== notice) body.insertBefore(notice, body.firstChild);
    if (notice.nextSibling !== status) body.insertBefore(status, notice.nextSibling);
  }

  /** § Runtime API: shown exactly while the gate says so. */
  function sync() {
    notice.hidden = !privacy.notice.shouldShow();
  }

  function announce(text) {
    status.textContent = text;
  }

  function act(action) {
    var hadFocus = notice.contains(d.activeElement);
    if (action === 'deny') {
      privacy.set('denied');
      announce(
        privacy.get().persisted
          ? 'Analytics are off on this site.'
          : 'Analytics are off for this page. Your browser did not save the choice, so it applies only to this page.',
      );
    } else if (action === 'dismiss') {
      // Dismissing is not a choice (§ Runtime API): the saved choice stays unset.
      privacy.notice.dismiss();
      announce('Notice dismissed. The privacy page has the analytics controls.');
    } else {
      return;
    }
    sync();
    // The control that had focus leaves with the notice. Land on the visible
    // announcement instead of letting focus fall back to the document.
    if (hadFocus && notice.hidden) status.focus();
  }

  notice.addEventListener('click', function (event) {
    var target = event.target;
    while (target && target !== notice) {
      if (target.getAttribute && target.hasAttribute('data-np-privacy-action')) {
        act(target.getAttribute('data-np-privacy-action'));
        return;
      }
      target = target.parentNode;
    }
  });

  // Escape closes the notice like any transient message; it is not a choice.
  notice.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') act('dismiss');
  });

  // A choice or dismissal made in another tab arrives through the gate.
  privacy.onChange(sync);

  placeAtTop();
  sync();
})(window, document);
