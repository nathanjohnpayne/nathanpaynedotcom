#!/usr/bin/env python3
"""Build the self-hosted site fonts in public/fonts/site/ (#1250).

The site's two families, Cormorant Garamond and Inter, are shipped as static
woff2 instances cut from the upstream variable fonts in the google/fonts
repository, pinned to one commit and checked by SHA-256. Run it by hand when
the pin changes; nothing in the build calls it, and the output is committed.

Why static instances rather than the variable files Google serves:

- Skia names a variable font's instance from the platform's font scaler, so
  the same file embeds in a PDF as `CormorantGaramond-Light` on Linux and
  `CormorantGaramond-SemiBold` on macOS. A static file carries its own
  PostScript name, so both platforms embed the same name.
- The variable files Google serves are chosen by user agent (the Linux ones
  carry a `prep` hinting program, the macOS ones do not), so a build's
  typefaces depended on the machine that ran it. A committed file does not.

Each file holds the Latin range Google serves plus the arrows U+2190-2193.
Google's own Latin subsets leave out U+2192 and U+2190, so `→` and `←` fell
through to a system face (DejaVu Sans on Linux, SF on macOS).

Needs fonttools and brotli: `pip install fonttools brotli`.

    python3 scripts/fonts/build-site-fonts.py --fetch
    python3 scripts/fonts/build-site-fonts.py --src /path/to/ttfs
"""

import argparse
import hashlib
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

GOOGLE_FONTS_COMMIT = "51303ca9e8ac9dcea7b12d307ba568fd0e6fcfca"
RAW = f"https://raw.githubusercontent.com/google/fonts/{GOOGLE_FONTS_COMMIT}/ofl"

# source file -> (path under ofl/, sha256)
SOURCES = {
    "CormorantGaramond[wght].ttf": (
        "cormorantgaramond",
        "b20b7d9626dd956b2c5e558692ad328b1f19e3275e2782db4fa07670d83f35e0",
    ),
    "CormorantGaramond-Italic[wght].ttf": (
        "cormorantgaramond",
        "0f48ea6abb2084537854f7174c470991a463b13036309e3b50a81511611c530d",
    ),
    "Inter[opsz,wght].ttf": (
        "inter",
        "29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031",
    ),
}

STYLE_NAMES = {400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold"}

# (source file, output stem, PostScript family, weights, extra axis pins)
FAMILIES = [
    ("CormorantGaramond[wght].ttf", "cormorant-garamond", "CormorantGaramond", [400, 500, 600, 700], {}, False),
    ("CormorantGaramond-Italic[wght].ttf", "cormorant-garamond-italic", "CormorantGaramond", [400, 600], {}, True),
    # opsz 14 is the axis default and what Google serves when a page does not
    # request opsz, so these match the Inter visitors have been getting.
    ("Inter[opsz,wght].ttf", "inter", "Inter", [400, 500, 600, 700], {"opsz": 14}, False),
]

# Google's `latin` subset (the range the site has always used) plus the four
# arrows. Keep in step with the unicode-range in src/styles/global.css.
UNICODES = (
    list(range(0x0000, 0x0100))
    + [0x0131, 0x0152, 0x0153, 0x02BB, 0x02BC, 0x02C6, 0x02DA, 0x02DC, 0x0304, 0x0308, 0x0329]
    # Combining marks Google ships inside its Latin files as dependencies.
    + [0x0300, 0x0301, 0x0303, 0x0309, 0x0323]
    + list(range(0x2000, 0x2070))
    + [0x20AC, 0x2122, 0x2191, 0x2193, 0x2212, 0x2215, 0xFEFF, 0xFFFD]
    + [0x2190, 0x2191, 0x2192, 0x2193]
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def fetch(dest: Path) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    for name, (folder, _digest) in SOURCES.items():
        target = dest / name
        if target.exists():
            continue
        url = f"{RAW}/{folder}/{urllib.parse.quote(name, safe=',')}"
        print(f"fetching {url}")
        urllib.request.urlretrieve(url, target)


def verify(src: Path) -> None:
    for name, (_folder, digest) in SOURCES.items():
        path = src / name
        if not path.exists():
            sys.exit(f"missing source font {path}; run with --fetch")
        actual = sha256(path)
        if actual != digest:
            sys.exit(f"{name}: sha256 {actual} does not match the pin {digest}")


def set_names(font: TTFont, ps_family: str, weight: int, italic: bool) -> None:
    """Give the instance a clean, deterministic PostScript name (nameID 6)."""
    style = STYLE_NAMES[weight]
    if italic:
        style = "Italic" if weight == 400 else f"{style}Italic"
    for rec in list(font["name"].names):
        if rec.nameID == 6:
            font["name"].removeNames(nameID=6)
            break
    font["name"].setName(f"{ps_family}-{style}", 6, 3, 1, 0x409)
    font["name"].setName(f"{ps_family}-{style}", 6, 1, 0, 0)


def build(src: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    for source, stem, ps_family, weights, pins, italic in FAMILIES:
        for weight in weights:
            font = TTFont(src / source, recalcTimestamp=False)
            font = instancer.instantiateVariableFont(
                font, {"wght": weight, **pins}, updateFontNames=True
            )
            set_names(font, ps_family, weight, italic)
            options = subset.Options()
            options.layout_features = ["*"]
            options.name_IDs = ["*"]
            options.name_legacy = True
            options.name_languages = ["*"]
            options.notdef_outline = True
            options.glyph_names = False
            options.hinting = False
            options.flavor = "woff2"
            options.recalc_timestamp = False
            subsetter = subset.Subsetter(options)
            subsetter.populate(unicodes=UNICODES)
            subsetter.subset(font)
            target = out / f"{stem}-{weight}.woff2"
            subset.save_font(font, str(target), options)
            print(f"{target.name}: {target.stat().st_size} bytes")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--src", type=Path, default=Path("/tmp/np-font-sources"))
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parents[2] / "public/fonts/site")
    parser.add_argument("--fetch", action="store_true", help="download the pinned sources into --src first")
    args = parser.parse_args()
    if args.fetch:
        fetch(args.src)
    verify(args.src)
    build(args.src, args.out)


if __name__ == "__main__":
    main()
