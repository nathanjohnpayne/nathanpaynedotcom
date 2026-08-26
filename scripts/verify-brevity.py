#!/usr/bin/env python3
"""Verify that a brevity-only edit changed no evidence.

A brevity pass rewrites prose and must leave every load-bearing token alone.
Reading carefully does not catch this reliably: a numeral written as a word
("across three platforms", "the seventeen") is invisible to a prose-focused
edit but is still evidence, and one such pass silently dropped two of them
inside phrases it cut.

Compares BEFORE and AFTER and fails on any change to:

  * URLs (absolute and repository-relative), #NNN references, timestamps,
    numerals including their sign, and inline code spans, compared by
    OCCURRENCE COUNT rather than distinct value, so a duplicate dropped from
    one of two mentions is still caught
  * fenced code and Mermaid blocks, frontmatter `content: |` block scalars
    (where sidebar diagrams live), and Markdown table rows, byte-for-byte
  * the frontmatter fields that automated tests pin as exact strings

Numbers written as words are reported as an advisory note rather than a
failure, because no regex separates "six PRs" from "one of the reasons".
The note is still what makes a dropped count visible.

Exit status is 0 when every check passes and 1 otherwise, so it can gate a
commit.

    scripts/verify-brevity.py before.md after.md
    scripts/verify-brevity.py --quiet before.md after.md && git commit

Advisory notes print even under --quiet, since suppressing them in the gate
path would hide exactly what they exist to surface.
"""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter
from pathlib import Path

# Frontmatter values that tests assert as exact strings. Changing one of these
# without updating its assertion breaks the suite; changing it deliberately is
# a content decision, not a brevity edit.
PINNED_FIELDS = ("title", "seoTitle", "shortTitle", "slug", "seoDescription")

# Numbers written as words. These are the reason this script exists: a prose
# pass does not see "across three platforms" as data, and dropping it loses a
# count as surely as deleting a digit would.
_WORD_NUMBERS = (
    "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|"
    "fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|"
    "fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|"
    "first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|"
    "eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|"
    "eighteenth|nineteenth|twentieth|dozen|twice|thrice"
)

TOKEN_CLASSES = (
    ("URLs", r"https?://[^\s\)\]\"'>]+"),
    ("relative links", r"\]\((/[^)\s]*)\)"),
    ("issue/PR refs", r"#\d{2,4}\b"),
    ("timestamps", r"\d{4}-\d{2}-\d{2}(?:T[\d:]+Z)?|\b\d{1,2}:\d{2}\s*(?:[ap]\.?m\.?)?\b|\b\d{1,2}\s*[ap]\.?m\.?\b"),
    ("numerals", r"[+-]?\b\d[\d,.]*\b"),
    ("code spans", r"`[^`\n]+`"),
)

# Advisory, never gating. "six PRs" is evidence and "one of the reasons" is
# idiom, and no regex separates them -- so a delta here is surfaced for a
# human to judge rather than failed. Surfacing it is still the point: this is
# how a dropped "across three platforms" becomes visible at all.
ADVISORY_CLASSES = (
    ("spelled-out numbers", rf"\b(?:{_WORD_NUMBERS})\b"),
)

BLOCK_CLASSES = (
    # Both fence forms; Astro's Markdown parser accepts either.
    ("code/mermaid blocks", r"(?:```.*?```|~~~.*?~~~)", re.S),
    # Sidebar diagrams live in frontmatter as a `- type: mermaid` item whose
    # title and description are as load-bearing as the content scalar -- the
    # description is the accessible text screen readers receive.
    ("frontmatter mermaid items", r"^\s*-\s+type:\s*mermaid\s*\n(?:[ \t]+.*\n?)+", re.M),
    # A GFM table is a header row, a delimiter row, and body rows. Matching
    # the whole construct catches tables written without the optional leading
    # pipe, which matching lines that merely contain a pipe does not -- that
    # false-positives on any prose sentence mentioning one.
    (
        "tables",
        r"^[^\n]*\|[^\n]*\n[ \t]*\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)+\|?[ \t]*\n(?:[^\n]*\|[^\n]*\n?)*",
        re.M,
    ),
)


def field(text: str, name: str) -> str | None:
    """Return a frontmatter field including any block-scalar body.

    `title: >-` followed by an indented value is a valid pinned field, and
    comparing only the declaration line would miss every change to it.
    """
    match = re.search(
        rf"^{re.escape(name)}:[^\n]*\n?(?:[ \t]+[^\n]*\n?)*", text, re.M
    )
    return match.group(0) if match else None


def compare(before: str, after: str, quiet: bool) -> int:
    failures = []

    def report(ok: bool, label: str, detail: str = "") -> None:
        if not ok:
            failures.append(label)
        if not quiet:
            status = "ok  " if ok else "FAIL"
            print(f"  {status}  {label}{detail}")

    for label, pattern in TOKEN_CLASSES:
        b, a = Counter(re.findall(pattern, before)), Counter(re.findall(pattern, after))
        lost = sorted(k for k in b if a[k] < b[k])
        added = sorted(k for k in a if b[k] < a[k])
        detail = f"  ({sum(b.values())} -> {sum(a.values())})"
        if lost or added:
            detail += f"  lost={lost[:4]} added={added[:4]}"
        report(not lost and not added, label, detail)

    for label, pattern in ADVISORY_CLASSES:
        b, a = Counter(re.findall(pattern, before, re.I)), Counter(re.findall(pattern, after, re.I))
        lost = sorted(k for k in b if a[k] < b[k])
        added = sorted(k for k in a if b[k] < a[k])
        if lost or added:
            # Printed even under --quiet. The documented gate usage is
            # `verify-brevity.py --quiet BEFORE AFTER && git commit`, and
            # swallowing the advisory there would recreate the silent loss
            # this class exists to expose. It still does not affect the exit
            # status, so the gate keeps working.
            print(f"  note  {label}  ({sum(b.values())} -> {sum(a.values())})"
                  f"  lost={lost[:6]} added={added[:6]}")
            print("        advisory only -- check whether any of these carried a count")

    for label, pattern, flags in BLOCK_CLASSES:
        same = re.findall(pattern, before, flags) == re.findall(pattern, after, flags)
        report(same, label)

    for name in PINNED_FIELDS:
        same = field(before, name) == field(after, name)
        report(same, f"pinned field {name}")

    if not quiet:
        wb, wa = len(before.split()), len(after.split())
        delta = (wa - wb) / wb * 100 if wb else 0.0
        print(f"\n  words {wb} -> {wa}  ({delta:+.1f}%)")
        print(f"  RESULT: {'PASS' if not failures else str(len(failures)) + ' FAILURE(S)'}")

    return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Verify a brevity-only edit changed no evidence.",
        epilog="Exits 0 when every check passes, 1 otherwise.",
    )
    parser.add_argument("before", type=Path, help="the file as it stood before the brevity pass")
    parser.add_argument("after", type=Path, help="the file as it stands after the brevity pass")
    parser.add_argument("--quiet", action="store_true", help="print nothing; use the exit status")
    args = parser.parse_args()

    for path in (args.before, args.after):
        if not path.is_file():
            print(f"verify-brevity: no such file: {path}", file=sys.stderr)
            return 2

    return compare(args.before.read_text(), args.after.read_text(), args.quiet)


if __name__ == "__main__":
    sys.exit(main())
