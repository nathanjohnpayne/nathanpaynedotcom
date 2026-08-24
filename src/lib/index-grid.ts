const openingRows = [
  { rowClass: 'grid-row--1', accentClasses: ['accent-red', 'accent-paper'] },
  { rowClass: 'grid-row--2', accentClasses: ['accent-blue'] },
  { rowClass: 'grid-row--3', accentClasses: ['accent-black'] },
  { rowClass: 'grid-row--4', accentClasses: ['accent-yellow', 'accent-paper'] },
  { rowClass: 'grid-row--overflow-a', accentClasses: ['accent-lightblue'] },
  { rowClass: 'grid-row--overflow-b', accentClasses: ['accent-red'] },
] as const;

const repeatedCycleOpeningAccents = ['accent-yellow', 'accent-paper'] as const;

export function getIndexGridRow(index: number) {
  const cyclePosition = index % openingRows.length;
  const startsLaterCycle = index > 0 && cyclePosition === 0;
  const openingRow = openingRows[cyclePosition];

  return startsLaterCycle
    ? { ...openingRow, accentClasses: repeatedCycleOpeningAccents }
    : openingRow;
}
