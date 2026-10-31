import { describe, expect, it } from 'vitest';
import { getIndexGridRow, getMobileRail } from '../src/lib/index-grid';

// `src/lib/index-grid.ts` is a 20-line function shared by /projects/ and
// /blog/, and it had no tests at all (#910). Both indexes render from it, so a
// regression here is visible on two pages at once.

const CYCLE = 6;

// The prescribed palette, stated here rather than read back from the module.
// Deriving the expectation from the thing under test only proves it is
// self-consistent, which it is by construction — row 2 turning from blue to red
// would pass.
const OPENING_ROWS = [
  { rowClass: 'grid-row--1', accentClasses: ['accent-red', 'accent-paper'] },
  { rowClass: 'grid-row--2', accentClasses: ['accent-blue'] },
  { rowClass: 'grid-row--3', accentClasses: ['accent-black'] },
  { rowClass: 'grid-row--4', accentClasses: ['accent-yellow', 'accent-paper'] },
  { rowClass: 'grid-row--overflow-a', accentClasses: ['accent-blue'] },
  { rowClass: 'grid-row--overflow-b', accentClasses: ['accent-red'] },
];

const LATER_CYCLE_OPENING = ['accent-yellow', 'accent-paper'];

describe('index grid geometry', () => {
  it('walks the six opening rows with their prescribed accents', () => {
    expect(OPENING_ROWS).toHaveLength(CYCLE);
    OPENING_ROWS.forEach((expected, index) => {
      const row = getIndexGridRow(index);
      expect(row.rowClass, `row ${index} class`).toBe(expected.rowClass);
      expect([...row.accentClasses], `row ${index} accents`).toEqual(expected.accentClasses);
    });
  });

  it('repeats the row classes on every later cycle', () => {
    for (let i = 0; i < CYCLE; i += 1) {
      expect(getIndexGridRow(i + CYCLE).rowClass, `row ${i + CYCLE}`).toBe(
        OPENING_ROWS[i].rowClass,
      );
      expect(getIndexGridRow(i + CYCLE * 2).rowClass, `row ${i + CYCLE * 2}`).toBe(
        OPENING_ROWS[i].rowClass,
      );
    }
  });

  it('gives a later cycle its own opening accents rather than repeating row 1', () => {
    // The boundary the module exists for. Index 6 opens the same ROW as index 0
    // but must not re-open with the same accents, or the ramp restarts mid-grid
    // and two entries six apart look identical.
    expect([...getIndexGridRow(0).accentClasses]).toEqual(['accent-red', 'accent-paper']);
    expect([...getIndexGridRow(CYCLE).accentClasses]).toEqual(LATER_CYCLE_OPENING);
    expect([...getIndexGridRow(CYCLE * 2).accentClasses]).toEqual(LATER_CYCLE_OPENING);
  });

  it('leaves every non-boundary row on its prescribed accents', () => {
    // So the later-cycle override cannot leak into mid-cycle rows unnoticed.
    for (const index of [1, 2, 3, 4, 5, 7, 8, 11, 13]) {
      expect([...getIndexGridRow(index).accentClasses], `row ${index}`).toEqual(
        OPENING_ROWS[index % CYCLE].accentClasses,
      );
    }
  });
});

// Phone-stack rails: the hero shows the page accent, and no two adjacent
// stacked blocks share a color for any list length.
describe('phone-stack rails', () => {
  it('opens on the page accent and walks the stated cycle', () => {
    expect(
      ['red', 'blue', 'yellow', 'black', 'red', 'blue'].map((_, i) => getMobileRail('red', i)),
    ).toEqual(['red', 'blue', 'yellow', 'black', 'red', 'blue']);
    expect(getMobileRail('blue', 0)).toBe('blue');
    expect(getMobileRail('blue', 1)).toBe('yellow');
    expect(getMobileRail('yellow', 1)).toBe('black');
  });

  it('never repeats a color on adjacent blocks', () => {
    for (const accent of ['red', 'blue', 'yellow', 'black', 'paper']) {
      for (let i = 1; i < 40; i += 1) {
        expect(getMobileRail(accent, i), `${accent} block ${i}`).not.toBe(
          getMobileRail(accent, i - 1),
        );
      }
    }
  });

  it('starts a page accent outside the cycle at red after the hero', () => {
    expect(getMobileRail('paper', 1)).toBe('red');
  });
});
