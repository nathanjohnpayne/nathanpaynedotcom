import { defineConfig } from '@playwright/test';

/**
 * Port the preview server binds and the suite connects to (#875).
 *
 * Pinned in one place and threaded through `baseURL`, `webServer.url` and the
 * `astro preview` invocation, so the port Playwright waits on cannot diverge
 * from the port the server was told to use. Override it to run two checkouts
 * at once: `E2E_PORT=4400 npm run test:e2e`.
 */
const PORT = Number(process.env.E2E_PORT ?? 4321);

/**
 * Point the suite at a server it does not manage (#875).
 *
 * When set, `webServer` is dropped entirely and Playwright connects to this
 * URL. The escape hatch exists because `astro preview` is not always a
 * foreground process: under an agent session's preview-server manager it
 * daemonizes and returns immediately, which Playwright reports as "Process
 * from config.webServer exited early" — so in that environment the managed
 * path cannot work at all and the alternative would be no e2e coverage.
 *
 * This is the one path where Playwright does adopt a server it did not start,
 * so it is exactly the path `globalSetup` exists to police: an adopted server
 * serving a different build fails before the first spec runs.
 */
const EXTERNAL_BASE_URL = process.env.E2E_BASE_URL;

const BASE_URL = EXTERNAL_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/responsive',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  /**
   * Runs once, after `webServer` is up and before any spec: asserts the server
   * on `baseURL` is serving this checkout's `dist/`. See the file for why.
   */
  globalSetup: './tests/responsive/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'iPhone SE (375px)',
      use: { viewport: { width: 375, height: 667 } },
    },
    {
      name: 'iPhone 14 (393px)',
      use: { viewport: { width: 393, height: 852 } },
    },
    {
      name: 'iPad Mini (768px)',
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'Desktop 1440',
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: EXTERNAL_BASE_URL
    ? undefined
    : {
        command: `npm run build && npm run preview -- --port ${PORT}`,
        url: BASE_URL,
        /**
         * Playwright owns the server (#875).
         *
         * This was `!process.env.CI`, which locally accepted ANY listener on
         * the port as the server under test. Worktrees under
         * `.claude/worktrees/` are separate checkouts with separate `dist/`
         * trees, so a sibling session's preview would be adopted and the suite
         * would report on a build that had nothing to do with the branch under
         * test — green or red, both fiction.
         *
         * With reuse off, a port already in use is a startup error naming the
         * URL rather than a silent adoption. Verified against the reported
         * scenario: with another worktree's preview on :4321, the run stops on
         * "http://localhost:4321 is already used" before any spec executes.
         *
         * The cost is a build per run, which is the price of the suite meaning
         * what it says. `E2E_PORT` is the way to run a second checkout
         * concurrently.
         */
        reuseExistingServer: false,
        /**
         * The command builds before it serves, and a full `astro build` here
         * takes roughly 25s. The previous 30s ceiling covered that only when
         * nothing else was competing for the CPU.
         */
        timeout: 180_000,
      },
});
