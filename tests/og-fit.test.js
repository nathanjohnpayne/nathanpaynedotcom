/**
 * Unit tests for the OG card rendered-fit judgment in og-images.mjs (#1088).
 *
 * The build measures each card in Chromium after fonts load and fails when a
 * block crowds or crosses the clipping edge of `.og-content`, or the tag line
 * wraps. These pin the judgment on synthetic geometry; the end-to-end control
 * is the build itself, which renders every real card through the same check.
 */
import { describe, expect, it } from 'vitest';
import { OG_MIN_CLEARANCE, ogFitProblems } from '../src/integrations/og-images.mjs';

const card = (children, metaLines = 1) => ({
  box: { top: 0, bottom: 500 },
  children,
  metaLines,
});

describe('ogFitProblems', () => {
  it('passes a card whose blocks keep their clearance and whose tag line is one line', () => {
    const fits = card([
      { className: 'og-label', top: 52, bottom: 70 },
      { className: 'og-heading og-heading--with-description', top: 84, bottom: 260 },
      { className: 'og-meta', top: 400, bottom: 420 },
    ]);
    expect(ogFitProblems(fits)).toEqual([]);
  });

  it('accepts a block that reaches into the padding but keeps the minimum clearance', () => {
    // The projects index card does this: its label sits 41px from the top.
    const tight = card([{ className: 'og-label', top: OG_MIN_CLEARANCE, bottom: 60 }]);
    expect(ogFitProblems(tight)).toEqual([]);
  });

  it('reports a block that crosses the clipping edge, by class and distance', () => {
    const clipped = card([
      { className: 'og-heading og-heading--long', top: -20, bottom: 200 },
      { className: 'og-description', top: 300, bottom: 510 },
    ]);
    expect(ogFitProblems(clipped)).toEqual([
      '.og-heading is -20px from the top edge',
      '.og-description is -10px from the bottom edge',
    ]);
  });

  it('reports a block inside the frame but closer than the minimum clearance', () => {
    const crowded = card([{ className: 'og-meta', top: 470, bottom: 490 }]);
    expect(ogFitProblems(crowded)).toEqual(['.og-meta is 10px from the bottom edge']);
  });

  describe('horizontal clearance (#1092)', () => {
    // Ink edges, as a Range over the block's contents reports them. The box is
    // 0–1000 wide, so a line inked 24px or more from each side fits.
    const wide = (children) => ({
      box: { top: 0, bottom: 500, left: 0, right: 1000 },
      children,
      metaLines: 1,
    });
    const row = (className, inkLeft, inkRight) => ({
      className,
      top: 100,
      bottom: 200,
      inkLeft,
      inkRight,
    });

    it('passes a line whose ink keeps the clearance on both sides', () => {
      // #1090's home name sits 78px inside the clip edge (14px inside the
      // padding edge): it renders correctly, so it must pass.
      expect(ogFitProblems(wide([row('og-heading', 64, 922)]))).toEqual([]);
    });

    it('reports a nowrap line that runs past the right edge', () => {
      expect(ogFitProblems(wide([row('og-description', 64, 1040)]))).toEqual([
        '.og-description is -40px from the right edge',
      ]);
    });

    it('reports a line crowding the left edge', () => {
      expect(ogFitProblems(wide([row('og-label', 10, 400)]))).toEqual([
        '.og-label is 10px from the left edge',
      ]);
    });
  });

  it('reports a tag line that wraps', () => {
    expect(ogFitProblems(card([], 2))).toEqual(['.og-meta wraps to 2 lines']);
  });

  it('fails closed when there is nothing to measure', () => {
    expect(ogFitProblems(null)).toEqual(['no .og-content element to measure']);
  });
});
