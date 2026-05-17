// eslint.config.js
//
// Auto-generated from nathanjohnpayne/mergepath's templated source
// at examples/eslint.config.js (per the Mergepath ESLint standard,
// mergepath#250). Edit upstream, not this rendered copy — local
// edits will be overwritten on the next propagation run.
//

import js from "@eslint/js";
import globals from "globals";

import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";

export default [
  // Ignore generated / vendored output. Customize per-consumer via
  // a follow-up commit on the propagation PR if a repo needs extras
  // (e.g., functions/lib for cloud-functions repos).
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".astro/**",
      ".next/**",
      ".vercel/**",
      // CONSUMER-LOCAL: agent-spawned git worktrees (e.g. parallel
      // PR exploration). Local state, not source — linting them
      // double-counts findings against the main tree.
      ".claude/worktrees/**",
    ],
  },

  // Baseline JS recommended — required by the Mergepath policy floor.
  js.configs.recommended,

  // Apply browser + node globals to all JS sources by default. Narrow
  // these per-file-pattern in a follow-up commit if the repo has a
  // clean split (e.g., scripts/* node-only, src/* browser-only).
  //
  // `*.cjs` files are split out so ESLint parses them as CommonJS
  // (`sourceType: "commonjs"`) rather than ES modules — otherwise
  // top-level `require`/`module.exports` and CommonJS scope rules
  // produce false-positive parse errors. The defaults ESLint applies
  // by extension are: `module` for `.js`/`.mjs`, `commonjs` for
  // `.cjs`; we make that explicit here so the policy is
  // self-documenting.
  {
    files: ["**/*.{js,mjs,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
  },

  // TypeScript recommended ruleset — applied to .ts / .tsx via the
  // typescript-eslint plugin's flat-config preset. Includes the
  // parser, the recommended rule set, and the file-glob targeting.
  ...tseslint.configs.recommended,

  // Astro flat-config recommended ruleset — applied to .astro files.
  // The plugin exposes its flat-config preset under the bracketed
  // `configs['flat/recommended']` key (NOT the legacy
  // `configs.recommended` which is the eslintrc-shape config).
  // Same key for ESM and CJS — the plugin's export shape is
  // module-system-agnostic.
  ...astro.configs['flat/recommended'],

  // ─────────────────────────────────────────────────────────────────
  // CONSUMER-LOCAL POLICY — TS + style-rule overrides. MUST be LAST.
  //
  // Same template policy class as dpr#83 / ffb#274 / tadlock#58:
  // - `@typescript-eslint/no-unused-vars`: standard `^_`-prefix
  //   ignore convention (covers catch-clause args, destructured
  //   leftovers, intentional shadow params).
  // - `@typescript-eslint/no-explicit-any`: demoted to warn —
  //   Playwright tests have legitimate `any` for cross-frame DOM
  //   types that aren't worth typing strictly (5 sites in
  //   tests/responsive/mondrian-rebalance-animation.spec.ts).
  {
    files: ["**/*.{js,mjs,ts,tsx,astro}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];
