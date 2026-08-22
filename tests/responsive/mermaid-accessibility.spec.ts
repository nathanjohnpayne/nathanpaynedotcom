import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

test('Mermaid descriptions label diagrams without becoming duplicate navigable text', async ({
  page,
}) => {
  await page.goto('/blog/six-prs-one-bug-agent-failure-modes/');
  await expect(page.locator('.mermaid-figure svg')).toHaveCount(6);
  await expect(page.locator('pre.mermaid')).toHaveCount(0);

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

  const descriptions = await page
    .locator('.mermaid-figure')
    .evaluateAll((figures) =>
      figures
        .filter((figure) => figure.getClientRects().length > 0)
        .map(
          (figure) =>
            figure.querySelector('.mermaid-figure__description')?.textContent?.trim() ?? '',
        ),
    );
  const session = await page.context().newCDPSession(page);
  const { nodes } = await session.send('Accessibility.getFullAXTree');

  const expectedOccurrences = new Map<string, number>();
  for (const description of descriptions.map((value) => value.trim())) {
    expectedOccurrences.set(description, (expectedOccurrences.get(description) ?? 0) + 1);
  }

  for (const [description, expectedCount] of expectedOccurrences) {
    const diagrams = nodes.filter(
      (node) => node.role?.value === 'image' && node.description?.value === description,
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

test('static Mermaid diagrams remain visible in print without JavaScript', async ({ page }) => {
  await page.emulateMedia({ media: 'print' });
  await page.goto('/blog/two-blues-one-composition/');

  const diagrams = page.locator('.blog-prose .mermaid-figure svg');
  await expect(diagrams).toHaveCount(2);

  for (const diagram of await diagrams.all()) {
    await expect(diagram).toBeVisible();
    const bounds = await diagram.boundingBox();
    expect(bounds?.width ?? 0).toBeGreaterThan(0);
    expect(bounds?.height ?? 0).toBeGreaterThan(0);
  }
});
