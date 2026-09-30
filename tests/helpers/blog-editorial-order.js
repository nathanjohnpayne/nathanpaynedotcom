// Keep this literal independent of the production comparator so rendered-order
// tests can catch regressions in the ordering implementation.
export const EXPECTED_BLOG_EDITORIAL_ORDER = [
  'six-prs-one-bug-agent-failure-modes',
  'silence-is-not-an-approval',
  'the-product-did-not-travel',
  'every-reviewer-was-right',
  'autofix-was-the-whole-cost',
  'perfect-score-wrong-axis',
  'html-mockups-as-spec',
  'agent-approval-workflow-genesis-of-mergepath',
  'two-blues-one-composition',
  'how-a-responsive-fix-became-an-astro-migration',
];

// The homepage Writing list is hand-curated by each post's `homepageRank`
// (selectHomepageWriting in src/lib/blog-order.ts), not the editorial order
// above. Pinned as a literal for the same reason: a rendered-order test should
// catch a changed rank, not recompute it.
export const EXPECTED_HOMEPAGE_WRITING = [
  'the-product-did-not-travel',
  'every-reviewer-was-right',
  'silence-is-not-an-approval',
  'autofix-was-the-whole-cost',
  'html-mockups-as-spec',
];
