const indexGridGeometry = [
  'grid-row--1',
  'grid-row--2',
  'grid-row--3',
  'grid-row--4',
  'grid-row--overflow-a',
  'grid-row--overflow-b',
] as const;

const openingAccentCycle = [
  ['accent-red', 'accent-paper'],
  ['accent-blue'],
  ['accent-black'],
  ['accent-yellow', 'accent-paper'],
  ['accent-lightblue'],
  ['accent-red'],
] as const;

const repeatedCycleOpeningAccents = ['accent-yellow', 'accent-paper'] as const;

export function getIndexGridRow(index: number) {
  const cyclePosition = index % indexGridGeometry.length;
  const startsLaterCycle = index > 0 && cyclePosition === 0;

  return {
    rowClass: indexGridGeometry[cyclePosition],
    accentClasses: startsLaterCycle
      ? repeatedCycleOpeningAccents
      : openingAccentCycle[cyclePosition],
  };
}
