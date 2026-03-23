# Testing Requirements

No automated test framework is in use. This is a static site with no application logic requiring unit tests.

**Manual testing checklist (run before any PR):**

1. All four panels open/close correctly on desktop (hover)
2. Keyboard navigation works: Tab to focus, Enter/Space to open, Escape to close
3. Mobile view (375px): panels stack vertically, content always visible, no interaction handlers fire
4. `prefers-reduced-motion` respected: test in macOS Accessibility settings or Chrome DevTools emulation
5. No console errors in Chrome and Safari
6. OG metadata renders correctly (use a social card preview tool if OG image changed)
7. Cache-bust query strings updated in `index.html` if `style.css` or `script.js` changed
8. Security headers present (check in DevTools → Network → Response Headers)

**When to add automated tests:** If any JavaScript logic is extracted into importable modules, add unit tests for panel state management, hover intent logic, and analytics guards.

---
