import { JSDOM } from 'jsdom';

/**
 * Read BaseLayout's static loader or gated define:vars declaration as data.
 * jsdom's default runs no scripts and loads no resources. Unrecognized or
 * ambiguous markup stays unavailable; this does not guess a property ID.
 * @param {string} html
 * @returns {string | undefined}
 */
export function productionGaId(html) {
  const dom = new JSDOM(html);
  const ids = new Set();
  const validId = (id) => typeof id === 'string' && /^G-[A-Z0-9]+$/.test(id);
  try {
    for (const script of dom.window.document.querySelectorAll('head > script')) {
      const type = (script.getAttribute('type') || '').trim().toLowerCase();
      if (type && type !== 'text/javascript') continue;
      if (script.hasAttribute('src')) {
        let url;
        try {
          url = new URL(script.getAttribute('src'));
        } catch {
          continue;
        }
        if (url.origin !== 'https://www.googletagmanager.com' || url.pathname !== '/gtag/js')
          continue;
        const candidates = url.searchParams.getAll('id');
        if (url.username || url.password || candidates.length !== 1 || !validId(candidates[0]))
          return undefined;
        ids.add(candidates[0]);
        continue;
      }
      const code = script.textContent.trim();
      if (
        !code.includes(
          "loader.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);",
        )
      )
        continue;
      if (
        !code.includes('const privacy = window.npPrivacy;') ||
        !code.includes("gate.boot.effective === 'granted'") ||
        !code.includes("privacy.get().effective === 'granted'")
      )
        return undefined;
      // Astro serializes define:vars as a JSON string at the start of its IIFE.
      // Decode only that literal, never evaluate the surrounding JavaScript.
      const declaration = /^\(function\(\)\{\s*const gaId\s*=\s*("(?:[^"\\]|\\.)*")\s*;/.exec(code);
      if (!declaration) return undefined;
      const id = JSON.parse(declaration[1]);
      if (!validId(id)) return undefined;
      ids.add(id);
    }
    return ids.size === 1 ? [...ids][0] : undefined;
  } catch {
    return undefined;
  } finally {
    dom.window.close();
  }
}
