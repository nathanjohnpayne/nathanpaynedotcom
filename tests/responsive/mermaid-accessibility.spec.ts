import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('Mermaid descriptions label diagrams without becoming duplicate navigable text', async ({
  page,
}) => {
  await page.goto('/blog/six-prs-one-bug-agent-failure-modes/');
  const figures = page.locator('.mermaid-figure:visible');
  const figureCount = await figures.count();
  expect(figureCount, 'the page must exercise at least one Mermaid diagram').toBeGreaterThan(0);
  await expect(page.locator('pre.mermaid')).toHaveCount(0);
  await expect(figures.locator('svg[aria-hidden="true"][focusable="false"]')).toHaveCount(
    figureCount,
  );

  const diagramBounds = await page.locator('.blog-prose .mermaid-figure svg').evaluateAll((svgs) =>
    svgs.map((svg) => {
      const bounds = svg.getBoundingClientRect();
      const figure = svg.closest('.mermaid-figure');
      const containerBounds = figure?.getBoundingClientRect();
      return {
        width: bounds.width,
        height: bounds.height,
        containerWidth: containerBounds?.width ?? 0,
        // In a column too narrow to paint a wide diagram's 14px labels above
        // the legibility floor, the figure holds the diagram at the width
        // Mermaid drew it and scrolls rather than scaling the labels down with
        // the graphic — the article column below the stacked breakpoint
        // (#894), the blog sidebar at any width (#897). So a diagram may
        // legitimately be wider than the box it sits in.
        scrollableWidth: figure?.scrollWidth ?? 0,
        pageWidth: document.documentElement.clientWidth,
        pageScrollWidth: document.documentElement.scrollWidth,
      };
    }),
  );

  for (const bounds of diagramBounds) {
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    // What has to hold is containment, not fit: whatever the diagram's width,
    // the overflow it creates belongs to the figure and never to the page.
    expect(bounds.width).toBeLessThanOrEqual(
      Math.max(bounds.containerWidth, bounds.scrollableWidth) + 1,
    );
    expect(bounds.pageScrollWidth).toBeLessThanOrEqual(bounds.pageWidth + 1);
  }

  const accessibleMetadata = await figures.evaluateAll((visibleFigures) =>
    visibleFigures.map((figure) => ({
      title: figure.getAttribute('aria-label')?.trim() ?? '',
      description: figure.querySelector('.mermaid-figure__description')?.textContent?.trim() ?? '',
    })),
  );
  const session = await page.context().newCDPSession(page);
  const { nodes } = await session.send('Accessibility.getFullAXTree');

  const expectedOccurrences = new Map<string, number>();
  for (const { title, description } of accessibleMetadata) {
    expect(title, 'every diagram must have an accessible title').not.toBe('');
    expect(description, 'every diagram must have a relational description').not.toBe('');
    const key = JSON.stringify({ title, description });
    expectedOccurrences.set(key, (expectedOccurrences.get(key) ?? 0) + 1);
  }

  for (const [metadata, expectedCount] of expectedOccurrences) {
    const { title, description } = JSON.parse(metadata) as {
      title: string;
      description: string;
    };
    const diagrams = nodes.filter(
      (node) =>
        node.role?.value === 'image' &&
        node.name?.value === title &&
        node.description?.value === description,
    );
    expect(
      diagrams,
      `every diagram must retain its computed description: ${description}`,
    ).toHaveLength(expectedCount);

    const duplicateText = nodes.filter(
      (node) =>
        !node.ignored && node.name?.value === description && node.role?.value === 'StaticText',
    );
    expect(
      duplicateText,
      `description must not be independently navigable: ${description}`,
    ).toEqual([]);
  }
});

// Every route carrying a Mermaid diagram gets the label-parity assertions
// below. Between them these cover both label containers Mermaid emits: the
// non-wrapping one it gives a label with explicit breaks, and the wrapping one
// it gives a label it decided may reflow. Project pages carry Mermaid since
// #753 and the accessibility contract is the same one, so the list includes
// that collection too.
const MERMAID_ROUTES = [
  '/blog/six-prs-one-bug-agent-failure-modes/',
  '/blog/autofix-was-the-whole-cost/',
  '/projects/mergepath/',
  '/projects/friends-and-family-billing/',
  '/projects/device-source-of-truth/',
];

// The fixture-coverage assertion — "this route actually exercises a label
// Mermaid measured as more than one line" — can only hold where the diagram
// contains a wrapped label, so it is a subset rather than the whole list.
// `/projects/device-source-of-truth/` is deliberately outside it: its
// five-feed diagram uses short single-line labels by design ("Excel
// questionnaire", "Device registry"), whose tallest measures 21 against this
// assertion's threshold of 30. Adding the route to the coverage list without
// checking that failed the suite, which CI does not run (build-and-test
// installs Chromium for the *build's* Playwright, not `npm run test:e2e`), so
// it took a reviewer to catch it (#873). Before adding a route here, measure:
// the built page's `<foreignObject height="...">` values are the same numbers
// this test reads.
const MULTILINE_LABEL_ROUTES = new Set([
  '/blog/six-prs-one-bug-agent-failure-modes/',
  '/blog/autofix-was-the-whole-cost/',
  '/projects/mergepath/',
  '/projects/friends-and-family-billing/',
]);

for (const route of MERMAID_ROUTES) {
  test(`${route} paints every label at the height Mermaid measured`, async ({ page }) => {
    await page.goto(route);

    // `evaluateAll` widens its handles to `SVGElement | HTMLElement`, and
    // `ownerSVGElement` lives only on the SVG half, so the callback has to name
    // what the selector already guarantees: a `g.node` inside `svg.mermaid` is
    // an `SVGGElement`. Untyped, the two reads below fail `astro check`.
    const labels = await page
      .locator('.mermaid-figure svg.mermaid g.node')
      .evaluateAll((nodes: SVGGElement[]) =>
        nodes.flatMap((node) => {
          const label = node.querySelector('g.label');
          const shape = node.querySelector('rect, polygon, path, circle, ellipse');
          if (!label || !shape) return [];

          const labelBounds = label.getBoundingClientRect();
          const shapeBounds = shape.getBoundingClientRect();
          if (!labelBounds.height || !shapeBounds.height) return [];

          // Mermaid wrote the height it measured onto the foreignObject and sized
          // the node box to match, so that attribute is the contract the painted
          // label has to meet. Compare the two in the SVG's own units: rects come
          // back in viewport pixels, so undo however far the diagram was scaled.
          const host = label.querySelector('foreignObject');
          const content = host?.firstElementChild;
          if (!host || !content) return [];

          const viewBoxWidth = node.ownerSVGElement?.viewBox.baseVal.width ?? 0;
          const scale = viewBoxWidth
            ? (node.ownerSVGElement?.getBoundingClientRect().width ?? 0) / viewBoxWidth
            : 1;

          return [
            {
              text: (label.textContent ?? '').trim(),
              measured: host.height.baseVal.value,
              painted: scale ? content.getBoundingClientRect().height / scale : 0,
              scale,
              breaks: label.querySelectorAll('br').length,
              below: labelBounds.bottom - shapeBounds.bottom,
              above: shapeBounds.top - labelBounds.top,
            },
          ];
        }),
      );

    expect(labels.length, 'the route must render at least one Mermaid node label').toBeGreaterThan(
      0,
    );

    if (MULTILINE_LABEL_ROUTES.has(route)) {
      expect(
        labels.filter((label) => label.measured > 30).length,
        'the assertion must exercise labels Mermaid measured as more than one line',
      ).toBeGreaterThan(0);
    }

    for (const label of labels) {
      // A `br` that survives serialization is read back as two breaks, so the
      // label paints a line taller than the box Mermaid measured for it (#788).
      // Painting shorter is the same defect inverted: a break that stopped
      // breaking, or one that took the label's wrapping away with it (#789).
      expect(label.breaks, `${label.text}: a doubled line break survived`).toBe(0);
      // Half a unit, held flat across viewports rather than scaled by `scale`.
      // Dividing a viewport rect back into SVG units would amplify rounding if
      // rects were integers, but Chromium's are subpixel: measured worst case
      // is 0.008 units at scale 0.29, roughly 65x inside this bound. `scale` is
      // reported so a failure says whether the diagram was scaled down.
      expect(
        Math.abs(label.painted - label.measured),
        `${label.text}: painted ${label.painted.toFixed(2)} against a measured ` +
          `${label.measured} at scale ${label.scale.toFixed(3)}`,
      ).toBeLessThanOrEqual(0.5);
      expect(label.below, `${label.text}: label spills below its node box`).toBeLessThanOrEqual(1);
      expect(label.above, `${label.text}: label spills above its node box`).toBeLessThanOrEqual(1);
    }
  });
}

test('static Mermaid diagrams remain visible in print without JavaScript', async ({ page }) => {
  await page.emulateMedia({ media: 'print' });
  await page.goto('/blog/two-blues-one-composition/');

  const diagrams = page.locator('.blog-prose .mermaid-figure svg');
  expect(
    await diagrams.count(),
    'the print assertion must exercise at least one Mermaid diagram',
  ).toBeGreaterThan(0);

  for (const diagram of await diagrams.all()) {
    await expect(diagram).toBeVisible();
    const bounds = await diagram.boundingBox();
    expect(bounds?.width ?? 0).toBeGreaterThan(0);
    expect(bounds?.height ?? 0).toBeGreaterThan(0);
  }
});
