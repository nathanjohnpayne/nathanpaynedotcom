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
  //
  // `.claude/worktrees/**` is the per-agent worktree root that
  // Claude Code creates for parallel sub-tasks; linting the working
  // copies inside it is duplicative and noisy on every agent run.
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".astro/**",
      ".next/**",
      ".vercel/**",
      ".claude/worktrees/**",
    ],
  },

  // Baseline JS recommended — required by the Mergepath policy floor.
  js.configs.recommended,

  // Baseline rule policy applied to all JS sources. `^_`-prefix
  // unused-vars is the standard convention for marking intentionally-
  // unused locals (args, vars, caught errors, destructured-array
  // leftovers); the `allowEmptyCatch` setting permits the
  // `catch (_) {}` swallow idiom that appears in legacy code.
  // Both relaxations were added by hand by 5 of 6 consumers during
  // the Phase D fanout (#250) — folding them into the baseline
  // removes the per-consumer churn.
  {
    rules: {
      "no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      }],
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },

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

  // Tighten the TS-specific unused-vars rule to match the JS baseline
  // `^_`-prefix convention, and demote `no-explicit-any` to warn —
  // legitimate `any` usage shows up in Playwright cross-frame DOM
  // bridges, Firestore type-erasure, and WIP design-direction code;
  // an error blocks CI on signals the team has already considered.
  // Both demotions were hand-added by every TS consumer during the
  // Phase D fanout (#250); folding into the template removes the
  // per-consumer churn.
  {
    files: ["**/*.{ts,tsx}"],
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

  // Astro flat-config recommended ruleset — applied to .astro files.
  // The plugin exposes its flat-config preset under the bracketed
  // `configs['flat/recommended']` key (NOT the legacy
  // `configs.recommended` which is the eslintrc-shape config).
  // Same key for ESM and CJS — the plugin's export shape is
  // module-system-agnostic.
  ...astro.configs['flat/recommended'],



// React Compiler advisory disables are now INSIDE the React block(s)
// above (so they inherit the same `files:` and `plugins:` scope and
// don't reference react-hooks/* on files where the plugin isn't
// loaded — codex P1 #327 round 3). The standalone block previously
// at this position has been removed.


];
