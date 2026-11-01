const openingRows = [
  { rowClass: 'grid-row--1', accentClasses: ['accent-red', 'accent-paper'] },
  { rowClass: 'grid-row--2', accentClasses: ['accent-blue'] },
  { rowClass: 'grid-row--3', accentClasses: ['accent-black'] },
  { rowClass: 'grid-row--4', accentClasses: ['accent-yellow', 'accent-paper'] },
  { rowClass: 'grid-row--overflow-a', accentClasses: ['accent-blue'] },
  { rowClass: 'grid-row--overflow-b', accentClasses: ['accent-red'] },
] as const;

const repeatedCycleOpeningAccents = ['accent-yellow', 'accent-paper'] as const;

// Phone stack rails. Below --bp-stack the accent cells above are hidden and
// every stacked block (hero, card, band, footer) instead carries a colored
// rail on its left edge. Rails walk this cycle starting at the page's own
// accent, so the hero shows the page color and no two adjacent blocks repeat
// for any list length: four distinct colors in a wrapping cycle never put one
// next to itself. Gray is not in the cycle; at rail width it reads as a
// missing rail against parchment.
const RAIL_CYCLE = ['red', 'blue', 'yellow', 'black'] as const;

export type RailColor = (typeof RAIL_CYCLE)[number];

/**
 * Rail color for the block at `position` in a page's stack, where 0 is the
 * hero. A page accent outside the cycle starts the blocks after the hero at
 * red.
 */
export function getMobileRail(pageAccent: string, position: number): RailColor {
  const found = RAIL_CYCLE.indexOf(pageAccent as RailColor);
  const start = found === -1 ? RAIL_CYCLE.length - 1 : found;
  return RAIL_CYCLE[(start + position) % RAIL_CYCLE.length];
}

export function getIndexGridRow(index: number) {
  const cyclePosition = index % openingRows.length;
  const startsLaterCycle = index > 0 && cyclePosition === 0;
  const openingRow = openingRows[cyclePosition];

  return startsLaterCycle
    ? { ...openingRow, accentClasses: repeatedCycleOpeningAccents }
    : openingRow;
}
