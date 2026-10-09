/*
 * #1079 privacy controls behaviour (specs/analytics-privacy.md § UI Hooks,
 * § Runtime API, § Re-Enable, § Storage 3). src/components/privacy/ui/
 * PrivacyControls.astro inlines this file verbatim as one classic script
 * after the controls markup, on /privacy/ only. It talks to window.npPrivacy
 * and to nothing else.
 *
 * tests/privacy-ui.test.js executes this exact file in JSDOM against the real
 * gate, so it must never contain script-tag or HTML-comment markup.
 */
(function (w, d) {
  'use strict';

  var privacy = w.npPrivacy;
  var root = d.getElementById('np-privacy-controls');
  if (!root || !privacy) return;
  var status = root.querySelector('[data-np-privacy-ui="status"]');
  var gpcNote = root.querySelector('[data-np-privacy-ui="gpc-explanation"]');
  var denyButton = root.querySelector('[data-np-privacy-action="deny"]');
  var grantButton = root.querySelector('[data-np-privacy-action="grant"]');
  if (!status || !gpcNote || !denyButton || !grantButton) return;

  // § Re-Enable 1: a grant after a withdrawal loads nothing in this page view.
  // Set when the effective state goes denied → granted here, by this page's
  // buttons or by another tab, and never cleared: the note is true until the
  // next load.
  var resumesNextLoad = false;
  var lastEffective = privacy.get().effective;

  function describe(state) {
    var parts = [];
    if (state.reason === 'gpc') {
      parts.push('Analytics are off because your browser sends Global Privacy Control.');
      if (state.saved === 'denied') {
        parts.push(
          'You also turned them off here, so they stay off if your browser stops sending the signal.',
        );
      }
    } else if (state.effective === 'denied') {
      parts.push('Analytics are off. You turned them off.');
    } else if (state.reason === 'choice') {
      parts.push('Analytics are on. You turned them on.');
    } else {
      parts.push('Analytics are on. You have not made a choice, so they run by default.');
    }
    if (state.effective === 'granted' && resumesNextLoad) {
      parts.push('They start on the next page you load.');
    }
    if (!state.persisted) {
      // § Storage 3: the write failed; the choice is in memory for this page.
      parts.push('Your browser did not save this choice, so it applies only to this page.');
    }
    return parts.join(' ');
  }

  function render() {
    var state = privacy.get();
    if (lastEffective === 'denied' && state.effective === 'granted') resumesNextLoad = true;
    lastEffective = state.effective;
    status.textContent = describe(state);
    if (privacy.gpc()) {
      // § UI Hooks, GPC state: re-enabling is unavailable with a plain reason.
      root.setAttribute('data-np-privacy-gpc', '');
      gpcNote.hidden = false;
      grantButton.disabled = true;
      grantButton.setAttribute('aria-describedby', gpcNote.id);
    } else {
      root.removeAttribute('data-np-privacy-gpc');
      gpcNote.hidden = true;
      grantButton.disabled = false;
      grantButton.removeAttribute('aria-describedby');
    }
  }

  denyButton.addEventListener('click', function () {
    privacy.set('denied');
    render();
  });

  grantButton.addEventListener('click', function () {
    privacy.set('granted');
    render();
  });

  // Changes from the notice, from another tab, or from a back/forward-cache
  // restore arrive through the gate.
  privacy.onChange(render);

  render();
})(window, document);
