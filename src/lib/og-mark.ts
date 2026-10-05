/**
 * The NP mark as the OG cards paint it (#1110).
 *
 * `public/images/brand/np-mark.svg` is exported in the 1930 register with
 * literal hex fills. On site surfaces the mark follows the page register
 * instead, so each fill is swapped for the palette token it was drawn from:
 * the homepage card (`data-palette="1930"`) resolves the tokens back to the
 * exported colors, and interior cards get a mark that matches their 1921
 * planes. The exported files themselves stay 1930.
 *
 * A fill with no token here fails the build rather than shipping as a literal,
 * so a regenerated mark cannot silently fall out of the register.
 */

/** Exported 1930 hex → the palette token it represents. */
export const MARK_FILL_TOKENS: Record<string, string> = {
  '#f5f0e4': '--cream',
  '#da2418': '--red',
  '#f0c800': '--yellow',
  '#0a5c9e': '--blue',
  '#333333': '--accent-black',
  '#1a1814': '--grid-border',
  '#11100d': '--ink',
};

/** Replace every `fill="#hex"` in the mark with `style="fill: var(--token)"`. */
export function tokenizeMarkFills(svg: string): string {
  return svg.replace(/fill="(#[0-9a-fA-F]{3,8})"/g, (_, hex: string) => {
    const token = MARK_FILL_TOKENS[hex.toLowerCase()];
    if (!token) throw new Error(`np-mark.svg fill ${hex} has no palette token in og-mark.ts`);
    return `style="fill: var(${token})"`;
  });
}
