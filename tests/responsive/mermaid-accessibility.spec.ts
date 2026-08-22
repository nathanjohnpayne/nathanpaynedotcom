import { expect, test } from '@playwright/test';

test('Mermaid descriptions label diagrams without becoming duplicate navigable text', async ({
  page,
}) => {
  await page.goto('/blog/six-prs-one-bug-agent-failure-modes/');
  await expect(page.locator('.mermaid-figure svg')).toHaveCount(6);

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
