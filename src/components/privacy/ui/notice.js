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

  // An announcement stays up for STATUS_MS, then hides (#1348). It never hides
  // under the reader: while the pointer is over it or focus is inside it (the
  // privacy-page link, or the status line itself after focus lands there from
  // the closed notice), the hide waits until both have left.
  var STATUS_MS = 30000;
  var hideTimer = null;
  var hideDue = false;
  var pointerInside = false;

  // Focus holds the line only when the reader is using the keyboard. A mouse
  // click on a notice button also focuses it, and act() hands that focus to
  // the status line, but nobody is reading by focus then, so the line still
  // goes at 30 seconds.
  var keyboardInput = false;
  d.addEventListener(
    'keydown',
    function () {
      keyboardInput = true;
    },
    true,
  );
  d.addEventListener(
    'pointerdown',
    function () {
      keyboardInput = false;
    },
    true,
  );

  // Empties the line, which hides it (`:empty`). A hidden box gets no
  // mouseleave, so the hover state is reset here, on every path that hides it.
  function clearLine() {
    hideDue = false;
    pointerInside = false;
    status.textContent = '';
  }

  function hideIfDue() {
    if (!hideDue || pointerInside) return;
    if (keyboardInput && status.contains(d.activeElement)) return;
    clearLine();
  }

  status.addEventListener('mouseenter', function () {
    pointerInside = true;
  });
  status.addEventListener('mouseleave', function () {
    pointerInside = false;
    hideIfDue();
  });
  // focusout fires before focus lands on its next target; read where it went
  // once it has.
  status.addEventListener('focusout', function () {
    w.setTimeout(hideIfDue, 0);
  });

  /**
   * Writes an announcement into the status line and starts its timer. The
   * phrase "privacy page", wherever a message names it, becomes a link to
   * /privacy/ (#1348), so the message leads where it points.
   */
  function announce(text) {
    if (hideTimer) w.clearTimeout(hideTimer);
    hideTimer = null;
    hideDue = false;
    // Rewriting the line removes its link, and clearing it hides the line. If
    // focus was on either, keep it in a deliberate place rather than letting
    // it fall back to the document.
    var hadFocus = status.contains(d.activeElement);
    clearLine();
    if (!text) {
      if (hadFocus) {
        var first = notice.hidden ? null : notice.querySelector('[data-np-privacy-action]');
        if (first) first.focus();
        else d.body.focus();
      }
      return;
    }
    var phrase = 'privacy page';
    var at = text.indexOf(phrase);
    if (at < 0) {
      status.textContent = text;
    } else {
      var link = d.createElement('a');
      link.href = '/privacy/';
      link.textContent = phrase;
      status.appendChild(d.createTextNode(text.slice(0, at)));
      status.appendChild(link);
      status.appendChild(d.createTextNode(text.slice(at + phrase.length)));
    }
    if (hadFocus) status.focus();
    hideTimer = w.setTimeout(function () {
      hideTimer = null;
      hideDue = true;
      hideIfDue();
    }, STATUS_MS);
  }

  // True while act() changes the state itself: the gate calls onChange
  // synchronously, and that change is not one from another tab.
  var localChange = false;

  function act(action) {
    var hadFocus = notice.contains(d.activeElement);
    localChange = true;
    if (action === 'deny') {
      privacy.set('denied');
      announce(
        privacy.get().persisted
          ? 'PostHog, Google Analytics, and Mux Data are off for this site in this browser.'
          : 'PostHog, Google Analytics, and Mux Data are off for this page. Your browser did not save the choice, so it applies only to this page.',
      );
    } else if (action === 'dismiss') {
      // Dismissing is not a choice (§ Runtime API): the saved choice stays unset.
      privacy.notice.dismiss();
      announce(
        privacy.get().persisted
          ? 'Analytics stay on. You can turn them off anytime on the privacy page.'
          : 'Analytics stay on. Your browser did not save that, so this notice may appear again on the next page. You can turn them off anytime on the privacy page.',
      );
    } else {
      localChange = false;
      return;
    }
    localChange = false;
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

  // A choice or dismissal made in another tab, or picked up when a page is
  // restored from the back/forward cache, arrives through the gate. If
  // that hides the notice while keyboard focus is inside it, hand focus to
  // the visible announcement, as a local action does, rather than leaving it
  // in a hidden subtree.
  privacy.onChange(function () {
    if (localChange) return;
    var hadFocus = notice.contains(d.activeElement);
    var wasHidden = notice.hidden;
    sync();
    if (hadFocus && notice.hidden) {
      announce('The privacy notice closed because your setting changed.');
      status.focus();
    } else if (wasHidden && !notice.hidden) {
      // The notice is back (another tab cleared the setting): an earlier
      // announcement about closing it is no longer true, so drop it (#1258).
      announce('');
    }
  });

  placeAtTop();
  sync();
})(window, document);
