import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: ['tests/responsive/**', 'node_modules/**', '**/.claude/**'],
    // Several suites parse every built page with JSDOM, which is slow enough
    // that the 5s default was already marginal under parallel load — the
    // failures it produced were timeouts, never assertions. #894 added a suite
    // that drives a real Chromium (tests/mermaid-mobile-legibility.test.js),
    // which tightened that margin further: measured over three full runs, the
    // 5s default failed on every one of them, and this ceiling on none.
    // The hook ceiling is separate because tearing a browser down is the one
    // step that has to finish after the workers have already been fighting
    // for the CPU for half a minute.
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
