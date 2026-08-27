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

Known blind spot: comparisons are global multisets, so an edit that SWAPS two
protected values between claims passes with every count unchanged. "PR #30
merged at 10:04am; PR #47 at 2:11pm" becoming the reverse is invisible here.
Catching that needs token-to-claim association, which is a different and much
larger tool; this one is a cheap occurrence check by design.
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
    # An inline destination may carry an optional title: `](/path "Title")`.
    ("relative links", r"\]\((?P<t>/[^)\s]*)(?:[ \t]+[\"'(][^)]*)?\)"),
    # A reference definition is the other half of `[text][id]`, and its
    # destination is as load-bearing as an inline one. Matching only the
    # inline form let `[p]: /blog/original/` be repointed silently.
    ("reference link targets", r"(?m)^\[[^\]]+\]:[ \t]*(?P<t>/[^\s]*)"),
    # Single digits count: dropping the `#` from `#5` leaves the numeral
    # class unchanged, so a one-digit reference could vanish silently.
    ("issue/PR refs", r"#\d{1,4}\b"),
    # A clock time without its zone is a different instant, so the zone is
    # part of the token when one is written. That includes an ISO offset:
    # `...T10:20:30+05:00` and `...-05:00` are ten hours apart, and stopping
    # the ISO alternative at the date left the sign outside the comparison.
    # Month-name dates are the collection's dominant form; without them,
    # "July 30, 2026" -> "August 30, 2026" leaves 30 and 2026 unchanged and
    # moves the event a month with every protected token equal.
    ("timestamps", r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?"
                   r"|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?"
                   r"|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?"
                   r"(?:,?\s+\d{4})?"
                   r"|\d{4}-\d{2}-\d{2}"
                   r"(?:[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?"
                   r"|\b\d{1,2}:\d{2}\s*(?:[ap]\.?m\.?)?(?:\s+[A-Z][a-zA-Z]+)?"
                   r"|\b\d{1,2}\s*[ap]\.?m\.?(?:\s+[A-Z][a-zA-Z]+)?"),
    # The token carries whatever changes the claim: a currency symbol, a
    # sign, a percent, or a unit. `$4` and `EUR4` are different prices, `-3.8%`
    # and `+3.8%` opposite directions, `9px` and `8px` different grids.
    # Separators are only real between digits -- anchoring the tail on a digit
    # keeps sentence punctuation out, so retightening "took 22, which" into
    # "took 22. It" is not read as a changed value.
    # A slash denominator is part of the rate: `$4/M` and `$4/B` differ by a
    # factor of a thousand while every other token compares equal.
    ("numerals", r"(?<![A-Za-z0-9_.])[$\u20ac\u00a3]?[+-]?\d(?:[\d,.]*\d)?"
                 r"(?:%|[A-Za-z]{1,3}\b)?(?:/[A-Za-z]{1,6}\b)?"),
    # Delimiters pair by length, as CommonMark specifies: a span holding a
    # literal backtick opens with two or more, and assuming one delimiter
    # captured a partial span and left the rest unprotected.
    ("code spans", r"(?P<d>`+)(?:[^`]|(?!(?P=d))`+)+?(?P=d)(?!`)"),
)

# Advisory, never gating. "six PRs" is evidence and "one of the reasons" is
# idiom, and no regex separates them -- so a delta here is surfaced for a
# human to judge rather than failed. Surfacing it is still the point: this is
# how a dropped "across three platforms" becomes visible at all.
ADVISORY_CLASSES = (
    ("spelled-out numbers", rf"\b(?:{_WORD_NUMBERS})\b"),
)

BLOCK_CLASSES = (
    # Both fence forms; Astro's Markdown parser accepts either. The closing
    # fence must use the opener's character and be at least as long, so a
    # four-backtick block quoting a three-backtick line stays one block --
    # hard-coding three delimiters ended the match early and left the
    # remainder of the block unguarded.
    # CommonMark allows up to three spaces of indentation on both the opener
    # and the closer, and this repo's parser honours that.
    ("code/mermaid blocks",
     r"(?ms)^[ ]{0,3}(?P<f>(?P<fc>[`~])(?P=fc){2,})[^\n]*\n.*?(?:^[ ]{0,3}(?P=f)(?P=fc)*[ \t]*$|\Z)", 0),
    # Sidebar diagrams live in frontmatter as a `- type: mermaid` item whose
    # title and description are as load-bearing as the content scalar -- the
    # description is the accessible text screen readers receive.
    # Matching the whole list item and filtering on the discriminator, rather
    # than requiring `type:` to be the first key: the content schema accepts
    # mapping keys in any order, so a diagram declared title-first was
    # invisible to a pattern anchored on `- type:`.
    ("frontmatter mermaid items", r"^[ \t]*-[ \t]+[^\n]*\n(?:[ \t]+[^\n]*\n?)*", re.M,
     "type: mermaid"),
    # A GFM table is a header row, a delimiter row, and body rows. Matching
    # the whole construct catches tables written without the optional leading
    # pipe, which matching lines that merely contain a pipe does not -- that
    # false-positives on any prose sentence mentioning one.
    (
        "tables",
        # A one-column table is a legal GFM table: `| State |` over `| --- |`.
        # Requiring a second delimiter cell dropped the whole construct.
        # Two legal delimiter shapes. With a leading pipe, one cell is enough
        # -- `| State |` over `| --- |` is a one-column table. Without one, at
        # least two cells are needed, or any prose line containing a dash
        # would qualify.
        r"^[^\n]*\|[^\n]*\n[ \t]*"
        r"(?:\|[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?"
        r"|:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)+\|?)"
        r"[ \t]*\n(?:[^\n]*\|[^\n]*\n?)*",
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


def _find(pattern: str, text: str, flags: int = 0) -> list[str]:
    """Extract matches, preferring a `t` group when the pattern names one.

    `re.findall` returns groups rather than whole matches once a pattern has
    any, which the backreferences these patterns need would otherwise turn
    into a comparison of bare delimiters. Matching on `group(0)` keeps the
    whole token, while a `t` group lets a pattern say that only part of the
    match is the value -- a link's destination, not its surrounding syntax.
    """
    out = []
    for m in re.finditer(pattern, text, flags):
        named = m.groupdict()
        out.append(m.group("t") if named.get("t") is not None else m.group(0))
    return out


def _blocks():
    """Yield (label, pattern, flags, needle) for each block class.

    A class may carry a fourth element: a substring the match must contain.
    That lets a pattern match a whole YAML list item and then keep only the
    items that declare the discriminator, instead of demanding the
    discriminator be the item's first key.
    """
    for entry in BLOCK_CLASSES:
        label, pattern, flags = entry[0], entry[1], entry[2]
        needle = entry[3] if len(entry) > 3 else None
        yield label, pattern, flags, needle


def _find_block(pattern: str, text: str, flags: int, needle: str | None) -> list[str]:
    out = _find(pattern, text, flags)
    return [m for m in out if needle is None or needle in m]


def _prose_words(text: str) -> int:
    """Count words outside frontmatter, fences, diagrams and tables.

    Whole-file word count is the metric the revision process documents as
    misleading on evidence-heavy posts: tables and code are incompressible,
    so counting them with the prose understates how deep a nominal target
    actually cuts.
    """
    body = re.sub(r"\A---\n.*?\n---\n", "", text, flags=re.S)
    for _label, pattern, flags, _needle in _blocks():
        body = re.sub(pattern, " ", body, flags=flags)
    return len(body.split())


def compare(before: str, after: str, quiet: bool) -> int:
    failures = []

    def report(ok: bool, label: str, detail: str = "") -> None:
        if not ok:
            failures.append(label)
        if not quiet:
            status = "ok  " if ok else "FAIL"
            print(f"  {status}  {label}{detail}")

    for label, pattern in TOKEN_CLASSES:
        b, a = Counter(_find(pattern, before)), Counter(_find(pattern, after))
        lost = sorted(k for k in b if a[k] < b[k])
        added = sorted(k for k in a if b[k] < a[k])
        detail = f"  ({sum(b.values())} -> {sum(a.values())})"
        if lost or added:
            detail += f"  lost={lost[:4]} added={added[:4]}"
        report(not lost and not added, label, detail)

    for label, pattern in ADVISORY_CLASSES:
        # Case-folded: the class is matched case-insensitively, so counting
        # "Seventeen" and "seventeen" as different tokens reported a sentence
        # moving to the start of a sentence as a lost count. This note prints
        # even under --quiet, so a false one costs more than most.
        b = Counter(t.lower() for t in _find(pattern, before, re.I))
        a = Counter(t.lower() for t in _find(pattern, after, re.I))
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

    for label, pattern, flags, needle in _blocks():
        same = (_find_block(pattern, before, flags, needle)
                == _find_block(pattern, after, flags, needle))
        report(same, label)

    for name in PINNED_FIELDS:
        same = field(before, name) == field(after, name)
        report(same, f"pinned field {name}")

    if not quiet:
        wb, wa = len(before.split()), len(after.split())
        pb, pa = _prose_words(before), _prose_words(after)
        pd = (pa - pb) / pb * 100 if pb else 0.0
        print(f"\n  words {wb} -> {wa}  (whole file, including tables and code)")
        print(f"  prose {pb} -> {pa}  ({pd:+.1f}%)  <- the figure to report")
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
