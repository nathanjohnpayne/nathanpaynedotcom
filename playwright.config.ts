import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/responsive',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
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
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
