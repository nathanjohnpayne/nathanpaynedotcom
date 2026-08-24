# Vale Content Lint

Issue #719 introduces `styles/` as the repository-owned Vale style directory. The directory is intentionally top-level because `.vale.ini` and editor integrations use Vale's conventional `StylesPath = styles` lookup, and because the rule definitions may become the proven source for a later fleet kit without making this repository's scope configuration canonical.

The gate discovers tracked and unignored `.md` and `.mdx` files across the repository. It excludes deliberate violation fixtures and the exact canonical/kit paths propagated to this consumer by mergepath's sync manifest, with canonical-source headers as a defense-in-depth fallback; those mirrors must be fixed at their named source rather than rewritten in this consumer.

`CMOS.EmDash` is an error and blocks lint once the one-time backlog is removed. `CMOS.Titles` and `CMOS.Capitalization` report Chicago headline-case warnings while their judgment-heavy backlog is drained. The gate never writes source files.
