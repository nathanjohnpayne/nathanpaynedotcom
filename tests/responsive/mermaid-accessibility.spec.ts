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
      const containerBounds = svg.closest('.mermaid-figure')?.getBoundingClientRect();
      return {
        width: bounds.width,
        height: bounds.height,
        containerWidth: containerBounds?.width ?? 0,
      };
    }),
  );

  for (const bounds of diagramBounds) {
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    expect(bounds.width).toBeLessThanOrEqual(bounds.containerWidth + 1);
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

test('every label line stays inside the node box Mermaid measured for it', async ({ page }) => {
  await page.goto('/blog/six-prs-one-bug-agent-failure-modes/');

  const labels = await page
    .locator('.mermaid-figure svg.mermaid g.node')
    .evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        const label = node.querySelector('g.label');
        const shape = node.querySelector('rect, polygon, path, circle, ellipse');
        if (!label || !shape) return [];

        const labelBounds = label.getBoundingClientRect();
        const shapeBounds = shape.getBoundingClientRect();
        if (!labelBounds.height || !shapeBounds.height) return [];

        return [
          {
            text: label.textContent?.trim() ?? '',
            lines: label.querySelectorAll('p').length,
            breaks: label.querySelectorAll('br').length,
            below: labelBounds.bottom - shapeBounds.bottom,
            above: shapeBounds.top - labelBounds.top,
          },
        ];
      }),
    );

  expect(
    labels.filter((label) => label.lines > 1).length,
    'the assertion must exercise multiline labels',
  ).toBeGreaterThan(0);

  for (const label of labels) {
    // Mermaid sizes the box for the lines it measured. A `br` that survives
    // serialization is read back as two breaks and pushes the last line out
    // through the bottom border (#788).
    expect(label.breaks, `${label.text}: a doubled line break survived`).toBe(0);
    expect(label.below, `${label.text}: label spills below its node box`).toBeLessThanOrEqual(1);
    expect(label.above, `${label.text}: label spills above its node box`).toBeLessThanOrEqual(1);
  }
});

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
