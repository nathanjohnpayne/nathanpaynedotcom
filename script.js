(function () {
  'use strict';

  const grid = document.getElementById('mondrian');
  if (!grid) return;

  const panels = Array.from(grid.querySelectorAll('.panel'));
  const leaveDelay = 120;
  let active = null;
  let leaveTimer = null;

  const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const mobile = () => window.matchMedia('(max-width: 920px)').matches;

  function openPanel(panel) {
    if (mobile()) return;
    if (active === panel) return;

    clearTimeout(leaveTimer);
    if (active) active.classList.remove('is-open');

    active = panel;
    active.classList.add('is-open');
    grid.dataset.focus = panel.dataset.panel;
  }

  function closePanel() {
    if (!active) return;
    active.classList.remove('is-open');
    active = null;
    delete grid.dataset.focus;
  }

  function scheduleClose() {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(closePanel, leaveDelay);
  }

  panels.forEach((panel) => {
    panel.addEventListener('mouseenter', () => {
      if (!canHover()) return;
      openPanel(panel);
    });

    panel.addEventListener('mouseleave', () => {
      if (!canHover()) return;
      scheduleClose();
    });

    panel.addEventListener('focusin', () => openPanel(panel));

    panel.addEventListener('focusout', (event) => {
      if (!panel.contains(event.relatedTarget)) scheduleClose();
    });

    panel.addEventListener('click', (event) => {
      if (event.target.closest('a')) return;
      if (mobile()) return;
      openPanel(panel);
    });

    panel.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closePanel();
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openPanel(panel);
      }
    });
  });

  document.addEventListener('click', (event) => {
    if (mobile()) return;
    if (!event.target.closest('.panel')) closePanel();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePanel();
  });

  window.addEventListener('resize', () => {
    if (mobile()) closePanel();
  });

  let scrollTimer = null;
  window.addEventListener('scroll', () => {
    document.body.classList.add('is-scrolling');
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      document.body.classList.remove('is-scrolling');
    }, 100);
  });

  panels.forEach((panel) => {
    let tracked = false;
    panel.addEventListener('mouseenter', () => {
      if (tracked || typeof gtag !== 'function') return;
      tracked = true;
      gtag('event', 'section_view', {
        section_name: panel.dataset.panel,
        event_category: 'engagement'
      });
    });
  });
})();
