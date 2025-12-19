import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 *
 * Tests run against the actual dev servers (web + api).
 * Ensure both servers are running before running E2E tests.
 */

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Dev servers should already be running via `pnpm dev`
  // Set reuseExistingServer to true to use them
  // Only start servers automatically in CI
  webServer: process.env.CI ? [
    {
      command: 'pnpm dev',
      cwd: '../api',
      url: 'http://localhost:1999',
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command: 'pnpm dev',
      cwd: '.',
      url: 'http://localhost:5173',
      reuseExistingServer: false,
      timeout: 30000,
    },
  ] : undefined,
});
