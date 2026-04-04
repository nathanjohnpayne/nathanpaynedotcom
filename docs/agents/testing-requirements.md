# Testing Requirements

Vitest smoke tests are in use for static route metadata, sitemap coverage, responsive behavior, and homepage interaction guards.

**Run before any PR:**

```bash
npm test
```

**Manual testing checklist (run before any PR):**

1. All four panels open/close correctly on desktop (hover)
2. Keyboard navigation works: Tab to focus, Enter/Space to open, Escape to close
3. Mobile view (375px): panels stack vertically, content always visible, no interaction handlers fire
4. `prefers-reduced-motion` respected: test in macOS Accessibility settings or Chrome DevTools emulation
5. No console errors in Chrome and Safari
6. OG metadata renders correctly (use a social card preview tool if OG image changed)
7. Blog routes load correctly (`/blog/` and the latest post page) if blog content or generation changed
8. Cache-bust query strings updated in HTML files that reference `style.css` or `script.js`
9. Security headers present (check in DevTools → Network → Response Headers)

**When to add more automated tests:** Add or extend Vitest coverage whenever new static routes, metadata surfaces, or generation scripts are introduced.

---
