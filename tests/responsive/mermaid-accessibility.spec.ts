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
  // The figure is the semantic container; the element inside it is the image
  // (#989). Asserted from both sides so a regression that moved the role back
  // onto the figure fails here rather than in whatever it silently hides.
  await expect(figures.locator('.mermaid-figure__graphic[role="img"][tabindex="0"]')).toHaveCount(
    figureCount,
  );
  await expect(page.locator('.mermaid-figure[role="img"]')).toHaveCount(0);

  const diagramBounds = await page.locator('.blog-prose .mermaid-figure svg').evaluateAll((svgs) =>
    svgs.map((svg) => {
      const bounds = svg.getBoundingClientRect();
      // The scroll container is the graphic, not the figure that wraps it and
      // its caption (#989) — a caption in a sideways-scrolling box would slide
      // out from under the diagram it captions.
      const figure = svg.closest('.mermaid-figure__graphic');
      const containerBounds = figure?.getBoundingClientRect();
      return {
        width: bounds.width,
        height: bounds.height,
        containerWidth: containerBounds?.width ?? 0,
        // In a column too narrow to paint a wide diagram's 14px labels above
        // the legibility floor, the figure holds the diagram at the width
        // Mermaid drew it and scrolls rather than scaling the labels down with
        // the graphic — the article column below the stacked breakpoint
        // (#894). So a diagram may legitimately be wider than the box it sits
        // in. The blog sidebar did the same until #986 and now does neither:
        // it is too narrow for a wide diagram to be readable scrolled either,
        // so the build refuses one and the post body carries it instead.
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
      title:
        figure.querySelector('.mermaid-figure__graphic')?.getAttribute('aria-label')?.trim() ?? '',
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

/**
 * The visible caption (#989).
 *
 * A diagram's `title` and `description` are accessibility metadata and reach no
 * sighted reader; the caption is the one visible field, and it is a real
 * `<figcaption>` sitting outside the `role="img"` element rather than inside it.
 * That placement is the whole contract: inside, its contents would be
 * presentational and the caption would be readable only as part of the image's
 * name. The assertions below hold both halves — the caption is painted under the
 * diagram, and assistive technology reaches it exactly once, on its own terms.
 *
 * Both caption surfaces get a case, and the pair is the point (#994, Codex P1).
 *
 * The sidebar case is the original and stays gated to >=1024px, because the
 * sidebar is `display: none` below the desktop composition's breakpoint and
 * there is genuinely nothing on screen to assert about there. The body case is
 * the one #994 added, and it runs at every viewport — which is what the gate had
 * been hiding, since below the stacked breakpoint `.mermaid-figure__graphic`
 * becomes a horizontal scroll container and the caption has to stay with the
 * column while the diagram scrolls under it.
 *
 * Replacing the sidebar route with the body route rather than adding to it would
 * have traded one blind spot for another: `six-prs-one-bug-agent-failure-modes`
 * has no sidebar items, so a regression in the sidebar's painted placement or
 * its accessibility tree would have passed at every viewport.
 */
const CAPTION_ROUTES = [
  {
    surface: 'body',
    // The one captioned body fence on the site, and a project page rather than
    // a blog post — so `container` is what keeps this route table honest rather
    // than a formality. Two rounds of review cut the other two body captions as
    // restatements of their surrounding prose, which is the bar in
    // docs/agents/code-modification-rules.md working as intended.
    route: '/projects/mergepath/',
    // The surface, as a selector. Without it `surface` would be a label on a
    // query that does not honour it: the locator would take captions from every
    // visible figure on the page, so a body caption could satisfy the sidebar
    // case and hide a sidebar caption that had stopped rendering (CodeRabbit).
    // Each route asserts it found captions, so a renamed container fails here
    // rather than passing on an empty set.
    container: '.project-copy',
    minimumWidth: 0,
    // The viewport below which this route's captioned diagram MUST scroll, so
    // the scrolling arm cannot go quiet. It is a measured property of the
    // diagram against its column, not the stacked breakpoint: the diagram is
    // drawn 419px wide, and `.project-copy` measures 262px at a 375px viewport,
    // 280px at 393px, and 646px at 768px. So it scrolls on the two phone
    // projects and legitimately fits on the tablet one, and a guard keyed to
    // 1024px failed there for the right behaviour.
    mustScrollBelowViewport: 500,
  },
  {
    surface: 'sidebar',
    route: '/blog/agent-approval-workflow-genesis-of-mergepath/',
    container: '.blog-sidebar-item',
    minimumWidth: 1024,
    // A sidebar figure never scrolls at any width (#986), so this arm has
    // nothing to assert here rather than nothing to find.
    mustScrollBelowViewport: 0,
  },
];

for (const { surface, route, container, minimumWidth, mustScrollBelowViewport } of CAPTION_ROUTES) {
  test(`a ${surface} diagram caption is painted under its figure and announced exactly once`, async ({
    page,
  }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < minimumWidth,
      `the ${surface} surface is not rendered below ${minimumWidth}px`,
    );
    await page.goto(route);

    const captions = page.locator(`${container} .mermaid-figure:visible .mermaid-figure__caption`);
    const captionCount = await captions.count();
    expect(
      captionCount,
      `the route must exercise at least one captioned diagram in ${container}`,
    ).toBeGreaterThan(0);

    const placements = await captions.evaluateAll((elements) =>
      elements.map((caption) => {
        const figure = caption.closest('.mermaid-figure');
        const graphic = figure?.querySelector('.mermaid-figure__graphic');
        // Geometry belongs to the `<figcaption>`, text to the caption span
        // inside it (#998). The span is inline, so its rect is the extent of
        // its own text — measuring the column against that would compare a
        // sentence's width to a figure's and fail on any caption short enough
        // to fit on one line.
        const figcaption = caption.closest('figcaption');
        const captionBox = (figcaption ?? caption).getBoundingClientRect();
        const graphicBox = graphic?.getBoundingClientRect();

        return {
          tagName: figcaption?.tagName ?? caption.tagName,
          text: (caption.textContent ?? '').trim(),
          // The `Figure N` label the figcaption also carries, empty in the
          // sidebar, which is not part of the article's figure sequence.
          label: figcaption?.querySelector('.figure-label')?.textContent?.trim() ?? '',
          parentIsFigure: figcaption?.parentElement === figure,
          insideGraphic: Boolean(caption.closest('.mermaid-figure__graphic')),
          painted: captionBox.width > 0 && captionBox.height > 0,
          // "Under the diagram" measured rather than assumed: source order alone
          // would still pass if a stylesheet floated the caption over the SVG.
          belowGraphic: captionBox.top >= (graphicBox?.bottom ?? 0) - 1,
          // The graphic is the horizontal scroll container in a narrow column, so
          // the caption must not be in it — it would slide out from under the
          // diagram it captions.
          graphicScrolls: graphic ? graphic.scrollWidth > graphic.clientWidth + 1 : false,
          // Whether a reader can actually REACH that overflow, which is a
          // different question from whether it exists (Codex P2). Both halves
          // are needed and neither is sufficient on its own:
          //
          // `overflowX` alone — an `auto` container with nothing overflowing
          // passes while proving nothing.
          //
          // `scrollLeft` alone — `overflow-x: hidden` is still a programmatic
          // scroll container, so a script can move `scrollLeft` on a box no
          // user can scroll. Losing the `auto` rule to `hidden` is the exact
          // regression this arm exists to catch, and "move it and see if it
          // changes" does not catch it.
          //
          // Together: the computed value says the scroll is offered to the
          // reader, and the move says there is somewhere to go. `scrollLeft` is
          // restored so the print arm below reads an untouched box.
          graphicOverflowX: graphic ? getComputedStyle(graphic).overflowX : '',
          graphicScrollMoves: (() => {
            if (!graphic) return false;
            const before = graphic.scrollLeft;
            graphic.scrollLeft = graphic.scrollWidth;
            const moved = graphic.scrollLeft > before;
            graphic.scrollLeft = before;
            return moved;
          })(),
          // Measured together so the assertion can say "the caption kept the
          // column's width while the diagram overflowed it" rather than inferring
          // it from the DOM position alone.
          captionWidth: captionBox.width,
          figureWidth: figure?.getBoundingClientRect().width ?? 0,
          title: graphic?.getAttribute('aria-label')?.trim() ?? '',
          description:
            figure?.querySelector('.mermaid-figure__description')?.textContent?.trim() ?? '',
        };
      }),
    );

    const session = await page.context().newCDPSession(page);
    const { nodes } = await session.send('Accessibility.getFullAXTree');
    let scrollingCaptions = 0;

    for (const placement of placements) {
      expect(placement.tagName, 'the caption must live in a real figcaption').toBe('FIGCAPTION');
      // An article diagram is a numbered peer of the screenshots around it; a
      // sidebar diagram is not an article figure and carries no number (#998).
      if (surface === 'sidebar') {
        expect(placement.label, `${placement.text}: a sidebar diagram was numbered`).toBe('');
      } else {
        expect(placement.label, `${placement.text}: an article diagram lost its number`).toMatch(
          /^Figure \d+:?$/,
        );
      }
      expect(placement.text, 'the caption must carry text').not.toBe('');
      expect(placement.painted, `${placement.text}: caption paints nothing`).toBe(true);
      expect(placement.belowGraphic, `${placement.text}: caption is not under the diagram`).toBe(
        true,
      );
      expect(placement.parentIsFigure, `${placement.text}: caption is not the figure's own`).toBe(
        true,
      );
      // The one placement that would break it: inside role="img" the caption's
      // contents are presentational.
      expect(placement.insideGraphic, `${placement.text}: caption sits inside the image`).toBe(
        false,
      );
      // The narrow-column case the skip used to hide (#994): the graphic overflows
      // its box and scrolls, and the caption stays at the column's width.
      if (placement.graphicScrolls) {
        scrollingCaptions += 1;
        expect(
          ['auto', 'scroll'],
          `${placement.text}: the diagram overflows its box with overflow-x: ` +
            `${placement.graphicOverflowX}, so what does not fit is unreachable ` +
            'rather than scrollable',
        ).toContain(placement.graphicOverflowX);
        expect(
          placement.graphicScrollMoves,
          `${placement.text}: the diagram's box does not move when scrolled`,
        ).toBe(true);
        expect(
          Math.abs(placement.captionWidth - placement.figureWidth),
          `${placement.text}: caption is ${placement.captionWidth}px inside a ` +
            `${placement.figureWidth}px figure whose diagram scrolls`,
        ).toBeLessThanOrEqual(1);
      }

      // Exactly once, and as itself. The caption reaches the tree as one run of
      // document text, and nothing else takes it as its own name — a caption
      // folded into the diagram would announce as part of the image instead of
      // as the text it is.
      //
      // Two roles are exempt, and both exemptions are statements about how the
      // tree is built rather than hedges.
      //
      // `figure` — naming the figure is what a `figcaption` is for, and a screen
      // reader announcing the figure on entry and reading its caption inside is
      // the pairing working, not the text arriving twice.
      //
      // `InlineTextBox` — Chromium hangs one of these under a `StaticText` per
      // painted line. They are layout, not announcements. This one is here
      // because moving the test onto a body fence (#994) surfaced it: in the
      // 238px sidebar the caption wrapped, so every box carried a fragment and
      // none matched the whole string, and the assertion passed by accident of
      // column width. In the article column the caption fits one line, the single
      // box carries the entire caption, and the filter caught it. A test whose
      // result depends on where the text happens to wrap is not measuring what it
      // says it measures.
      const named = nodes.filter((node) => !node.ignored && node.name?.value === placement.text);
      expect(
        named.filter((node) => node.role?.value === 'StaticText'),
        `${placement.text}: not announced exactly once as document text`,
      ).toHaveLength(1);
      expect(
        named
          .map((node) => node.role?.value)
          .filter((role) => !['StaticText', 'InlineTextBox', 'figure'].includes(role ?? '')),
        `${placement.text}: something other than its own figure is named by the caption`,
      ).toEqual([]);
      expect(placement.title, `${placement.text}: absorbed into the accessible name`).not.toContain(
        placement.text,
      );
      expect(
        placement.description,
        `${placement.text}: absorbed into the accessible description`,
      ).not.toContain(placement.text);

      const diagram = nodes.find(
        (node) => node.role?.value === 'image' && node.name?.value === placement.title,
      );
      expect(diagram, `${placement.title}: the diagram lost its accessible name`).toBeDefined();
      expect(diagram?.description?.value, `${placement.title}: description changed`).toBe(
        placement.description,
      );
    }

    // The scrolling arm above is the reason this test stopped skipping, so it may
    // not go quiet. Below the stacked breakpoint this route's captioned diagram is
    // drawn far wider than the 262px column and must scroll; at desktop it fits,
    // and there is nothing there to assert.
    if ((page.viewportSize()?.width ?? 0) < mustScrollBelowViewport) {
      expect(
        scrollingCaptions,
        `below ${mustScrollBelowViewport}px the route must exercise a caption ` +
          'beside a scrolling diagram',
      ).toBeGreaterThan(0);
    }

    // Print keeps the caption with the figure it belongs to. `.mermaid-figure`
    // sets `break-inside: avoid`, which is what stops a page break landing
    // between the diagram and the line explaining it.
    await page.emulateMedia({ media: 'print' });
    const printed = await captions.evaluateAll((elements) =>
      elements.map((caption) => {
        const figure = caption.closest('.mermaid-figure');
        const box = caption.getBoundingClientRect();
        return {
          text: (caption.textContent ?? '').trim(),
          painted: box.width > 0 && box.height > 0,
          breakInside: figure ? getComputedStyle(figure).breakInside : '',
        };
      }),
    );
    expect(printed.length, 'the print arm must exercise a caption').toBeGreaterThan(0);
    for (const caption of printed) {
      expect(caption.painted, `${caption.text}: caption does not print`).toBe(true);
      expect(caption.breakInside, `${caption.text}: figure may break away from its caption`).toBe(
        'avoid',
      );
    }
  });
}
