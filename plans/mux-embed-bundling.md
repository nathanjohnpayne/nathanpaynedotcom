# Bundle `mux-embed` From npm

## Decision

**`mux-embed` is a direct npm dependency, imported as a dynamic same-origin chunk, instead of a `<script>` injected at runtime from `cdn.jsdelivr.net`.** The version stays `5.18.0`, the version the CDN URL pinned, so Mux Data behaviour does not change.

Decided 2026-09-29, as the owner-directed fix for a security review finding: the site loaded third-party executable code from a public CDN with no Subresource Integrity. PR #1077.

## Why this needed deciding

`docs/agents/code-modification-rules.md` requires explicit discussion before adding an npm dependency. This one does not add a runtime to the site. The same library already ran in production on every page with a Mux hero, fetched from jsDelivr by `ProjectMuxPlayer.astro`. The decision is only about where that code comes from.

## Options considered

1. **Keep the CDN load and add `integrity` + `crossOrigin="anonymous"`.** This closes the tampering gap for one exact version. But the page still depends on a third-party script origin at runtime, that origin has to stay in the Content-Security-Policy `script-src`, and each version bump means hand-computing a new hash.
2. **Bundle from npm (chosen).** The lockfile pins the code and its registry integrity hash. Vite emits it as a separate chunk, so the "only Mux pages pay for it" property is preserved. No public CDN belongs in `script-src`, and Dependabot tracks updates like any other dependency.
3. **Drop Mux Data.** Not chosen: the owner uses it for hero playback analytics, and removing it is a product decision rather than a security one.

## Consequences

- `package.json` `dependencies` gains `mux-embed`; `package-lock.json` gains one entry with no transitive dependencies.
- `src/mux-embed.d.ts` declares the default export, because the package's own ambient type file is not referenced from its `package.json`.
- `tests/project-pages.test.js` asserts that no emitted script references a public script CDN, that the Mux module imports a local chunk carrying mux-embed, and that loading the built module sets `globalThis.mux` without injecting a `<script>`.
- The Content-Security-Policy in `firebase.json` (PR #1076) does not list `cdn.jsdelivr.net`.
