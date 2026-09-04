/**
 * em-dash-joint.ts — split a closed-em-dash construction so the dash cannot
 * start a line.
 *
 * An em dash is UAX #14 class B2: a break opportunity on BOTH sides. In a
 * narrow column a browser will happily take the one before it, and the
 * résumé's role—organization headings do exactly that at ordinary phone
 * widths — "Senior Product Manager" / "—Disney Entertainment and ESPN…",
 * measured in Chrome at 320px, 360px and 414px. The mark then reads as a
 * bullet on the second line instead of as a join on the first.
 *
 * The fix has to be structural rather than textual. A word joiner (U+2060)
 * before the dash would do it and is one character shorter to write, but this
 * page is parsed by ATS software and extracted from a generated PDF, so an
 * invisible character in the heading is a character in the text layer of a
 * document whose whole job is to be machine-read. A `white-space: nowrap`
 * span holds the same run together and adds nothing: the DOM's text content,
 * the PDF's text layer, and copy-paste are byte-identical either way.
 *
 * Only the word immediately before the dash is glued to it, so every other
 * break opportunity in the heading survives — including the one AFTER the
 * dash, which is the break that should happen and the one that reads
 * correctly when it does.
 */

const EM_DASH = '—';

export interface EmDashJoint {
  /** Everything before the glued run; ends in a space unless empty. */
  head: string;
  /** The word that closes on the dash, dash included. Must not break. */
  joint: string;
  /** Everything after the dash. Empty when the text carries no dash. */
  tail: string;
}

/**
 * Split `text` at its first em dash into head / joint / tail. Text with no em
 * dash comes back whole in `head`, so a caller can render the three parts
 * unconditionally and get an unchanged string.
 */
export function emDashJoint(text: string): EmDashJoint {
  const dash = text.indexOf(EM_DASH);
  if (dash < 0) return { head: text, joint: '', tail: '' };
  // The glued run starts after the preceding space; -1 + 1 = 0 puts the whole
  // leading fragment in the joint when the dash is in the first word.
  const wordStart = text.lastIndexOf(' ', dash) + 1;
  return {
    head: text.slice(0, wordStart),
    joint: text.slice(wordStart, dash + EM_DASH.length),
    tail: text.slice(dash + EM_DASH.length),
  };
}
