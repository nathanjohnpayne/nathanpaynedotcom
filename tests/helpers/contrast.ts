/**
 * Computed-color parsing and WCAG contrast math, shared by the Playwright
 * specs that measure ink against the plane it renders on.
 *
 * `parseComputedColor` exists in this shape for one reason. Chrome serializes
 * any `color-mix()` result as `color(srgb r g b / a)` with channels in the
 * **0-1** range, while plain `rgb()`/`rgba()`/hex values serialize with
 * channels in 0-255. A parser that reads the first form with the second form's
 * scale reports every mixed color as near-black — and does so silently, since
 * the number it produces is a perfectly plausible contrast ratio. That defect
 * put two wrong figures into issue #979 before it was caught, so the three
 * accepted forms are handled explicitly and anything else returns `null`
 * rather than being coerced.
 *
 * Channels are rounded to integers: that is what the browser actually paints,
 * and `shared-chrome.spec.ts` asserts exact channel values against tokens.
 */
export type ParsedColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export function parseComputedColor(value: string): ParsedColor | null {
  const commaRgb = value.match(
    /^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)$/,
  );
  if (commaRgb) {
    return {
      r: Math.round(Number(commaRgb[1])),
      g: Math.round(Number(commaRgb[2])),
      b: Math.round(Number(commaRgb[3])),
      a: commaRgb[4] === undefined ? 1 : Number(commaRgb[4]),
    };
  }

  const spaceRgb = value.match(
    /^rgb\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/,
  );
  if (spaceRgb) {
    return {
      r: Math.round(Number(spaceRgb[1])),
      g: Math.round(Number(spaceRgb[2])),
      b: Math.round(Number(spaceRgb[3])),
      a: spaceRgb[4] === undefined ? 1 : Number(spaceRgb[4]),
    };
  }

  const srgb = value.match(
    /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/,
  );
  if (srgb) {
    return {
      r: Math.round(Number(srgb[1]) * 255),
      g: Math.round(Number(srgb[2]) * 255),
      b: Math.round(Number(srgb[3]) * 255),
      a: srgb[4] === undefined ? 1 : Number(srgb[4]),
    };
  }

  return null;
}

export function relativeLuminance({ r, g, b }: ParsedColor): number {
  const channel = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: ParsedColor, background: ParsedColor): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}
