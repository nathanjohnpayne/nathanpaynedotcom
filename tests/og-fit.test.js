/**
 * Unit tests for the OG card rendered-fit judgment in og-images.mjs (#1088).
 *
 * The build measures each card in Chromium after fonts load and fails when a
 * block crowds or crosses the clipping edge of `.og-content`, or the tag line
 * wraps. These pin the judgment on synthetic geometry; the end-to-end control
 * is the build itself, which renders every real card through the same check.
 */
import { describe, expect, it } from 'vitest';
import {
  OG_EDGE_COVERAGE,
  OG_MIN_CLEARANCE,
  OG_SAFE_ZONE,
  ogEdgeProblems,
  ogFitProblems,
} from '../src/integrations/og-images.mjs';

const card = (children, metaLines = 1) => ({
  box: { top: 0, bottom: 500 },
  children,
  metaLines,
});

describe('ogFitProblems', () => {
  it('passes a card whose blocks keep their clearance and whose tag line is one line', () => {
    const fits = card([
      { className: 'og-label', top: 60, bottom: 78 },
      { className: 'og-heading og-heading--with-description', top: 92, bottom: 268 },
      { className: 'og-meta', top: 400, bottom: 420 },
    ]);
    expect(ogFitProblems(fits)).toEqual([]);
  });

  it('accepts a block that reaches into the padding but keeps the minimum clearance', () => {
    // The top is the image edge, so its floor is the safe zone; the bottom
    // meets an interior grid line, so OG_MIN_CLEARANCE governs there.
    const tight = card([
      { className: 'og-label', top: OG_SAFE_ZONE.top, bottom: 60 },
      { className: 'og-meta', top: 460, bottom: 500 - OG_MIN_CLEARANCE },
    ]);
    expect(ogFitProblems(tight)).toEqual([]);
  });

  it('holds text that clears the cell but not the crop to the safe zone (#1292)', () => {
    // 30px clears OG_MIN_CLEARANCE, but X crops ~15px off the top and the
    // text would sit against the edge of the preview.
    const nearTop = card([{ className: 'og-label', top: 30, bottom: 50 }]);
    expect(ogFitProblems(nearTop)).toEqual([
      `.og-label is 30px from the top edge (needs ${OG_SAFE_ZONE.top})`,
    ]);
  });

  it('reports a block that crosses the clipping edge, by class and distance', () => {
    const clipped = card([
      { className: 'og-heading og-heading--long', top: -20, bottom: 200 },
      { className: 'og-description', top: 300, bottom: 510 },
    ]);
    expect(ogFitProblems(clipped)).toEqual([
      `.og-heading is -20px from the top edge (needs ${OG_SAFE_ZONE.top})`,
      `.og-description is -10px from the bottom edge (needs ${OG_MIN_CLEARANCE})`,
    ]);
  });

  it('reports a block inside the frame but closer than the minimum clearance', () => {
    const crowded = card([{ className: 'og-meta', top: 470, bottom: 490 }]);
    expect(ogFitProblems(crowded)).toEqual([
      `.og-meta is 10px from the bottom edge (needs ${OG_MIN_CLEARANCE})`,
    ]);
  });

  describe('horizontal clearance (#1092)', () => {
    // Ink edges, as a Range over the block's contents reports them. The box is
    // 0–1000 wide, so a line inked OG_SAFE_ZONE.left from the left (the image
    // edge) and OG_MIN_CLEARANCE from the right fits.
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
      // The home name's ink starts ~100px in and ends ~58px short of the
      // right edge: it renders correctly, so it must pass.
      expect(ogFitProblems(wide([row('og-heading', 100, 942)]))).toEqual([]);
    });

    it('reports a nowrap line that runs past the right edge', () => {
      expect(ogFitProblems(wide([row('og-description', 100, 1040)]))).toEqual([
        `.og-description is -40px from the right edge (needs ${OG_MIN_CLEARANCE})`,
      ]);
    });

    it('reports a line crowding the left edge', () => {
      expect(ogFitProblems(wide([row('og-label', 10, 400)]))).toEqual([
        `.og-label is 10px from the left edge (needs ${OG_SAFE_ZONE.left})`,
      ]);
    });

    it('holds the left edge to the safe zone, which wide-card crops reach (#1292)', () => {
      // LinkedIn messaging takes up to ~33px off each side, so 40px of ink
      // inset can end up a few pixels from the preview's edge.
      expect(ogFitProblems(wide([row('og-label', 40, 400)]))).toEqual([
        `.og-label is 40px from the left edge (needs ${OG_SAFE_ZONE.left})`,
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

/**
 * Unit tests for the OG card edge judgment (#1292). Synthetic geometry in the
 * shape `measureOgEdges` returns; the build renders every real card through
 * the same check.
 */
describe('ogEdgeProblems', () => {
  const SURFACE = 'rgba(244, 239, 229, 0.96)';
  const cell = (className, left, top, right, bottom, background) => ({
    className,
    left,
    top,
    right,
    bottom,
    background,
  });
  // The shipped grid: content 950×460 top left, red over gray on the right,
  // yellow/blue/black along the bottom, 9px interior lines.
  const fullBleedCells = () => [
    cell('og-content', 0, 0, 950, 460, SURFACE),
    cell('og-block og-red', 959, 0, 1200, 390, 'rgb(232, 120, 74)'),
    cell('og-block og-gray', 959, 399, 1200, 630, 'rgb(212, 212, 212)'),
    cell('og-block og-yellow', 0, 469, 400, 630, 'rgb(227, 212, 119)'),
    cell('og-block og-blue', 409, 469, 640, 630, 'rgb(32, 128, 202)'),
    cell('og-block og-black', 649, 469, 950, 630, 'rgb(51, 51, 51)'),
  ];
  const measurement = (overrides = {}) => ({
    viewport: { width: 1200, height: 630 },
    card: { left: 0, top: 0, right: 1200, bottom: 630 },
    shellPadding: [0, 0, 0, 0],
    cardBorder: [0, 0, 0, 0],
    cardShadow: 'none',
    cells: fullBleedCells(),
    ...overrides,
  });

  it('passes the full-bleed grid', () => {
    expect(ogEdgeProblems(measurement())).toEqual([]);
  });

  it('reports the old framed card: stage margin, border, shadow, and no cell at any edge', () => {
    // The pre-#1292 interior card: 40px stage padding, a 1px border, the
    // canvas shadow, and an outer --line track, so every cell sits inset.
    const inset = fullBleedCells().map((c) => ({
      ...c,
      left: c.left * (1102 / 1200) + 49,
      right: c.right * (1102 / 1200) + 49,
      top: c.top * (532 / 630) + 49,
      bottom: c.bottom * (532 / 630) + 49,
    }));
    expect(
      ogEdgeProblems(
        measurement({
          card: { left: 40, top: 40, right: 1160, bottom: 590 },
          shellPadding: [40, 40, 40, 40],
          cardBorder: [1, 1, 1, 1],
          cardShadow: 'rgba(17, 16, 13, 0.12) 14px 14px 0px 0px',
          cells: inset,
        }),
      ),
    ).toEqual([
      '.og-card spans 40,40–1160,590, not the full 1200×630 image',
      '.og-shell has a stage margin (padding)',
      '.og-card has a border',
      '.og-card has a box-shadow',
      'color cells cover 0% of the top edge (needs 95%)',
      'color cells cover 0% of the bottom edge (needs 95%)',
      'color cells cover 0% of the left edge (needs 95%)',
      'color cells cover 0% of the right edge (needs 95%)',
    ]);
  });

  it('reports a frame track along one edge only', () => {
    // A --line row across the top pushes the top cells down 9px: the card
    // fills the image and carries no border, but the top edge is black line.
    const cells = fullBleedCells().map((c) => (c.top === 0 ? { ...c, top: 9 } : c));
    expect(ogEdgeProblems(measurement({ cells }))).toEqual([
      'color cells cover 0% of the top edge (needs 95%)',
    ]);
  });

  it('reports a near-white edge cell by name and edge', () => {
    const cells = fullBleedCells().map((c) =>
      c.className.includes('og-gray')
        ? { ...c, className: 'og-block og-white-c', background: 'rgb(255, 255, 255)' }
        : c,
    );
    expect(ogEdgeProblems(measurement({ cells }))).toEqual([
      '.og-white-c on the bottom edge is near white (rgb(255, 255, 255))',
      '.og-white-c on the right edge is near white (rgb(255, 255, 255))',
    ]);
  });

  it('reports an edge cell with no solid background', () => {
    const cells = fullBleedCells().map((c) =>
      c.className.includes('og-yellow') ? { ...c, background: 'rgba(0, 0, 0, 0)' } : c,
    );
    expect(ogEdgeProblems(measurement({ cells }))).toEqual([
      '.og-yellow on the bottom edge has no solid background',
      '.og-yellow on the left edge has no solid background',
    ]);
  });

  it('allows the interior lines that meet an edge, and no more', () => {
    // Three 9px lines on the bottom edge are 2.25%, inside OG_EDGE_COVERAGE.
    expect(1 - (3 * 9) / 1200).toBeGreaterThanOrEqual(OG_EDGE_COVERAGE);
    // Dropping the black cell leaves 640–959 uncovered: 73% covered.
    const cells = fullBleedCells().filter((c) => !c.className.includes('og-black'));
    expect(ogEdgeProblems(measurement({ cells }))).toEqual([
      'color cells cover 73% of the bottom edge (needs 95%)',
    ]);
  });

  it('fails closed when there is nothing to measure', () => {
    expect(ogEdgeProblems(null)).toEqual(['no .og-shell or .og-card element to measure']);
  });
});
