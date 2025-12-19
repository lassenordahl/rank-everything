import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Production E2E Test Configuration
 *
 * For testing against production Cloudflare deployment.
 *
 * Usage:
 *   BASE_URL=https://your-app.pages.dev pnpm e2e:prod
 *
 * Or set in .env.production.local:
 *   BASE_URL=https://your-app.pages.dev
 */

// Read production URL from environment
const baseURL = process.env.BASE_URL || process.env.PRODUCTION_URL;

if (!baseURL) {
  console.error(`
╔═══════════════════════════════════════════════════════════════════╗
║  ERROR: No production URL specified!                              ║
║                                                                   ║
║  Please set BASE_URL or PRODUCTION_URL environment variable:     ║
║                                                                   ║
║    BASE_URL=https://your-app.pages.dev pnpm e2e:prod             ║
║                                                                   ║
║  Or create .env.production.local with:                           ║
║    BASE_URL=https://your-app.pages.dev                           ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

export default defineConfig({
  testDir: './e2e',
  // Only run smoke tests in production
  testMatch: '**/smoke.spec.ts',

  fullyParallel: false, // Run sequentially to avoid rate limits
  forbidOnly: true,
  retries: 2, // Retry flaky tests in production
  workers: 1, // Single worker for production
  reporter: [['html'], ['list']],

  // Longer timeouts for production
  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  use: {
    baseURL,
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'production-desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'production-mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],

  // No webServer - we're testing against production
});
