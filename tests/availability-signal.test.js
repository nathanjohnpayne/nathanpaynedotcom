import { describe, it, expect } from 'vitest';
import { readBuiltPage, writeSanitizedDOM } from './helpers/dom.js';

/**
 * Where availability is allowed to be stated (#969).
 *
 * Availability is a site-level fact, and it had accumulated onto four
 * surfaces: the NOW paragraph, the Connect line, the home page's metadata,
 * and the end of every blog post. #969 kept two of them — the résumé, and
 * one statement on the home page — on the grounds that the other two spend
 * scarce copy budget saying something the reader can get once.
 *
 * The invariant this file guards is a COUNT, not a string. A regression here
 * does not look like wrong copy; it looks like correct copy appearing a
 * second time, which reads fine in a diff and only shows up when the page is
 * read end to end. So the home page assertion counts occurrences and pins
 * where the surviving one lives, rather than asserting the NOW sentence is
 * present — a page carrying both would satisfy that weaker check.
 *
 * Each "should not be here" assertion is paired with a positive on the same
 * search: the home page count must be exactly 1 and the résumé assertions
 * must find their statements. A zero-hit search that is broken and a
 * zero-hit search that is correct are otherwise the same result.
 *
 * The blog post footer is covered in tests/blog-takeaways-cta.test.js, next
 * to that block's other contracts.
 */

/** Every occurrence of an "Open to…" availability statement in `text`. */
function availabilityStatements(text) {
  return text.match(/Open to\s/g) ?? [];
}

const HOME_DESCRIPTION =
  'Product manager working with AI coding agents and platform products. ' +
  'Previously led product work for the device platform behind Disney+, Hulu, and ESPN.';

describe('home page availability signal (#969)', () => {
  it('states availability exactly once, in the NOW paragraph', () => {
    writeSanitizedDOM(readBuiltPage('index.html'));
    const main = document.querySelector('main');
    expect(main, 'no <main> on the built homepage').not.toBeNull();

    const found = availabilityStatements(main.textContent);
    expect(
      found.length,
      `expected one "Open to…" statement on the home page, found ${found.length}. ` +
        'Two of them is the #969 regression: NOW names the kind of role, and ' +
        'a second one restates it with less.',
    ).toBe(1);

    const now = document.querySelector('.about-block--now');
    expect(now, 'no .about-block--now on the built homepage').not.toBeNull();
    expect(
      availabilityStatements(now.textContent).length,
      'the surviving statement is not the NOW one',
    ).toBe(1);
  });

  it('leaves the Connect line as contact affordances only', () => {
    writeSanitizedDOM(readBuiltPage('index.html'));
    const signal = document.querySelector('.availability-signal');
    expect(signal, '.availability-signal missing from the built homepage').not.toBeNull();
    expect(
      availabilityStatements(signal.textContent).length,
      'the Connect line restated availability above its links',
    ).toBe(0);
  });

  it('describes the work, not the job search, in every metadata surface', () => {
    writeSanitizedDOM(readBuiltPage('index.html'));

    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ]) {
      const tag = document.querySelector(selector);
      expect(tag, `${selector} missing from the built homepage`).not.toBeNull();
      expect(tag.getAttribute('content'), selector).toBe(HOME_DESCRIPTION);
    }

    const graph = JSON.parse(
      document.querySelector('script[type="application/ld+json"]').textContent,
    )['@graph'];
    for (const type of ['WebSite', 'ProfilePage']) {
      const entity = graph.find((node) => node['@type'] === type);
      expect(entity, `no ${type} entity in the homepage JSON-LD`).toBeDefined();
      expect(entity.description, `${type} description`).toBe(HOME_DESCRIPTION);
    }
  });
});

describe('résumé availability is untouched by the trim (#969)', () => {
  it('keeps the Availability row and the end-of-page CTA lede', () => {
    writeSanitizedDOM(readBuiltPage('resume/index.html'));

    const rows = [...document.querySelectorAll('dt')];
    const availability = rows.find((dt) => dt.textContent.trim() === 'Availability');
    expect(availability, 'the résumé lost its Availability row').toBeDefined();
    expect(availabilityStatements(availability.nextElementSibling.textContent).length).toBe(1);

    const lede = document.querySelector('.resume-cta__lede');
    expect(lede, 'the résumé lost its end-of-page CTA lede').not.toBeNull();
    expect(lede.textContent.replace(/\s+/g, ' ').trim()).toBe(
      'Open to senior product/platform roles.',
    );
  });
});
