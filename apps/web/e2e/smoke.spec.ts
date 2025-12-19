/**
 * Production Smoke Tests
 *
 * Lightweight E2E tests safe to run against production.
 * These tests create resources but clean up after themselves.
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';

test.describe('Production Smoke Tests', () => {
  test.describe('Homepage', () => {
    test('should load homepage', async ({ page }) => {
      await page.goto('/');

      await expect(page.getByText('Rank Everything')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: /create room/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /join room/i })).toBeVisible();
    });

    test('should have correct meta tags', async ({ page }) => {
      await page.goto('/');

      const title = await page.title();
      expect(title).toContain('Rank');
    });
  });

  test.describe('Room Creation', () => {
    test('should create a room successfully', async ({ page }) => {
      await page.goto('/');

      // Click create room
      await page.getByRole('button', { name: /create room/i }).click();

      // Fill nickname
      await page.getByPlaceholder(/your nickname/i).fill('SmokeTest');

      // Create room
      await page.getByRole('button', { name: /^create$/i }).click();

      // Should navigate to room with 4-letter code
      await page.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });

      // Room code should be visible
      const roomCode = page.url().split('/').pop();
      expect(roomCode).toMatch(/^[A-Z]{4}$/);

      // Player should be visible in lobby
      await expect(page.getByText('SmokeTest')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Join Room Flow', () => {
    test('should show join form and validate input', async ({ page }) => {
      await page.goto('/');

      // Click join room
      await page.getByRole('button', { name: /join room/i }).click();

      // Should see join form
      await expect(page.getByPlaceholder(/room code/i)).toBeVisible();
      await expect(page.getByPlaceholder(/your nickname/i)).toBeVisible();

      // Room code should convert to uppercase
      const codeInput = page.getByPlaceholder(/room code/i);
      await codeInput.fill('abcd');
      await expect(codeInput).toHaveValue('ABCD');

      // Room code should be limited to 4 characters
      await codeInput.fill('ABCDEF');
      await expect(codeInput).toHaveValue('ABCD');
    });
  });

  test.describe('Real-time WebSocket', () => {
    test('should establish WebSocket connection in room', async ({ browser }) => {
      // Create a room
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto('/');
        await page.getByRole('button', { name: /create room/i }).click();
        await page.getByPlaceholder(/your nickname/i).fill('WSTest');
        await page.getByRole('button', { name: /^create$/i }).click();

        await page.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });

        // Should show player (indicates WebSocket is working)
        await expect(page.getByText('WSTest')).toBeVisible({ timeout: 5000 });

        // Should show player count
        await expect(page.getByText(/players.*1/i)).toBeVisible({ timeout: 5000 });

      } finally {
        await context.close();
      }
    });
  });

  test.describe('Multi-Player (Production)', () => {
    test('should allow two players to see each other', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const guestContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      try {
        // HOST: Create room
        await hostPage.goto('/');
        await hostPage.getByRole('button', { name: /create room/i }).click();
        await hostPage.getByPlaceholder(/your nickname/i).fill('ProdHost');
        await hostPage.getByRole('button', { name: /^create$/i }).click();

        await hostPage.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });
        const roomCode = hostPage.url().split('/').pop()!;

        // GUEST: Join room
        await guestPage.goto('/');
        await guestPage.getByRole('button', { name: /join room/i }).click();
        await guestPage.getByPlaceholder(/room code/i).fill(roomCode);
        await guestPage.getByPlaceholder(/your nickname/i).fill('ProdGuest');
        await guestPage.getByRole('button', { name: /^join$/i }).click();

        // Both should see the room code
        await expect(guestPage.getByText(roomCode)).toBeVisible({ timeout: 10000 });

        // Host should see player count update
        await expect(hostPage.getByText(/players.*2/i)).toBeVisible({ timeout: 10000 });

      } finally {
        await hostContext.close();
        await guestContext.close();
      }
    });
  });

  test.describe('Direct URL Access', () => {
    test('should show join form when accessing room directly', async ({ browser }) => {
      // First create a room to get a valid code
      const hostContext = await browser.newContext();
      const guestContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      try {
        // Create room
        await hostPage.goto('/');
        await hostPage.getByRole('button', { name: /create room/i }).click();
        await hostPage.getByPlaceholder(/your nickname/i).fill('URLHost');
        await hostPage.getByRole('button', { name: /^create$/i }).click();

        await hostPage.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });
        const roomCode = hostPage.url().split('/').pop()!;

        // Guest navigates directly to room URL
        await guestPage.goto(`/${roomCode}`);

        // Should see join form
        await expect(guestPage.getByPlaceholder(/your nickname/i)).toBeVisible({ timeout: 10000 });

      } finally {
        await hostContext.close();
        await guestContext.close();
      }
    });
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should be usable on mobile viewport', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only test');

    await page.goto('/');

    // Homepage should be visible
    await expect(page.getByText('Rank Everything')).toBeVisible();

    // Buttons should be tappable
    const createButton = page.getByRole('button', { name: /create room/i });
    await expect(createButton).toBeVisible();

    // Create room flow should work
    await createButton.tap();
    await expect(page.getByPlaceholder(/your nickname/i)).toBeVisible();
  });
});
