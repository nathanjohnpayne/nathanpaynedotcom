# Vale Content Lint

Issue #719 introduces `styles/` as the repository-owned Vale style directory. The directory is intentionally top-level because `.vale.ini` and editor integrations use Vale's conventional `StylesPath = styles` lookup, and because the rule definitions may become the proven source for a later fleet kit without making this repository's scope configuration canonical.

The gate discovers tracked `.md` and `.mdx` prose across the repository plus tracked standalone `.yaml` and `.yml` content under `src/content`. It excludes deliberate violation fixtures and the exact canonical/kit paths propagated to this consumer by mergepath's sync manifest, with canonical-source headers as a defense-in-depth fallback; those mirrors must be fixed at their named source rather than rewritten in this consumer.

`CMOS.EmDash` is an error and blocks lint once the one-time backlog is removed. `CMOS.Titles` and `CMOS.Capitalization` report Chicago headline-case warnings while their judgment-heavy backlog is drained. The gate never writes source files.

## Compatibility Boundary

The Phase 4b review of #721 replayed all 174 assertions from the deleted legacy suite through the Vale gate. The gates agree on 149 cases; Vale does not report 18 legacy constructs and newly reports 7 raw-HTML constructs. Every divergent construct occurs zero times in the 37 content files that existed at migration, so the migration preserved the current corpus rather than every detection capability of the deleted parser. The complete inputs and counts are retained in #722.

The 18 unused legacy capabilities remain deliberately retired. Link and reference-definition titles, padding split by inline emphasis or HTML, and padding split across Markdown soft breaks are not worth rebuilding a custom rendered-prose parser for while the repository does not publish those constructs. The 7 additional raw-HTML reports are accepted because the gate is report-only; the legacy gate's fail-closed behavior protected a deleted rewrite path. If one of the retired constructs enters authored content, add the smallest Vale-native rule or extractor that covers the real example and its fixture rather than restoring the legacy parser or an autofix.

## Tool Version

`.vale-version` is the single source for the expected local and CI Vale version. The installer checksum-verifies that release in CI, and the prose gate fails closed when the executable on `PATH` reports another version so local and CI rule semantics cannot silently drift.
