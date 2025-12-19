/**
 * E2E Tests: Full Game Flow
 *
 * Tests complete game flows with real browser and server.
 * Multiple browser contexts simulate different players.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

test.describe('Full Game Flow E2E', () => {
  test.describe('Single Player', () => {
    test('should create room and see room code', async ({ page }) => {
      // Navigate to home
      await page.goto('/');
      await expect(page.getByText('Rank Everything')).toBeVisible();

      // Create room
      await page.getByRole('button', { name: /create room/i }).click();
      await page.getByPlaceholder(/your nickname/i).fill('SoloPlayer');
      await page.getByRole('button', { name: /^create$/i }).click();

      // Should navigate to room lobby with 4-letter code
      await page.waitForURL(/\/[A-Z]{4}$/, { timeout: 10000 });
      await expect(page.getByText('SoloPlayer')).toBeVisible();
    });

    test('should allow starting game with 1 player', async ({ page }) => {
      // Navigate to home
      await page.goto('/');

      // Create room
      await page.getByRole('button', { name: /create room/i }).click();
      await page.getByPlaceholder(/your nickname/i).fill('SoloHost');
      await page.getByRole('button', { name: /^create$/i }).click();

      // Wait for room page
      await page.waitForURL(/\/[A-Z]{4}$/, { timeout: 10000 });

      // Should see start game button
      const startButton = page.getByRole('button', { name: /start/i });
      await expect(startButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Two Player Game', () => {
    test('should allow two players to join same room', async ({ browser }) => {
      // Create two browser contexts (simulating two different players)
      const hostContext = await browser.newContext();
      const guestContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      try {
        // HOST: Create room
        await hostPage.goto('/');
        await hostPage.getByRole('button', { name: /create room/i }).click();
        await hostPage.getByPlaceholder(/your nickname/i).fill('TheHost');
        await hostPage.getByRole('button', { name: /^create$/i }).click();

        // Wait for room page and get room code from URL
        await hostPage.waitForURL(/\/[A-Z]{4}$/, { timeout: 10000 });
        const roomCode = hostPage.url().split('/').pop()!;

        // GUEST: Join room via home page
        await guestPage.goto('/');
        await guestPage.getByRole('button', { name: /join room/i }).click();
        await guestPage.getByPlaceholder(/room code/i).fill(roomCode);
        await guestPage.getByPlaceholder(/your nickname/i).fill('TheGuest');
        await guestPage.getByRole('button', { name: /^join$/i }).click();

        // Both should see room code (it should be visible somewhere)
        await expect(guestPage.getByText(roomCode)).toBeVisible({ timeout: 5000 });

        // Host should see guest joined (player count should update)
        await expect(hostPage.getByText(/players.*2/i)).toBeVisible({ timeout: 5000 });

      } finally {
        await hostContext.close();
        await guestContext.close();
      }
    });

    test('should show real-time player count update', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const guestContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      try {
        // HOST: Create room
        await hostPage.goto('/');
        await hostPage.getByRole('button', { name: /create room/i }).click();
        await hostPage.getByPlaceholder(/your nickname/i).fill('HostPlayer');
        await hostPage.getByRole('button', { name: /^create$/i }).click();

        await hostPage.waitForURL(/\/[A-Z]{4}$/, { timeout: 10000 });
        const roomCode = hostPage.url().split('/').pop()!;

        // Host should see 1 player initially
        await expect(hostPage.getByText(/players.*1/i)).toBeVisible({ timeout: 5000 });

        // GUEST: Navigate directly to room URL
        await guestPage.goto(`/${roomCode}`);
        await guestPage.getByPlaceholder(/your nickname/i).fill('GuestPlayer');
        await guestPage.getByRole('button', { name: /join/i }).click();

        // Host should see player count update to 2
        await expect(hostPage.getByText(/players.*2/i)).toBeVisible({ timeout: 5000 });

      } finally {
        await hostContext.close();
        await guestContext.close();
      }
    });
  });

  test.describe('Direct URL Join', () => {
    test('should show join form when navigating directly to room URL', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const guestContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();

      try {
        // HOST: Create room
        await hostPage.goto('/');
        await hostPage.getByRole('button', { name: /create room/i }).click();
        await hostPage.getByPlaceholder(/your nickname/i).fill('RoomCreator');
        await hostPage.getByRole('button', { name: /^create$/i }).click();

        await hostPage.waitForURL(/\/[A-Z]{4}$/, { timeout: 10000 });
        const roomCode = hostPage.url().split('/').pop()!;

        // GUEST: Navigate directly to room URL (simulating link share)
        await guestPage.goto(`/${roomCode}`);

        // Should see join form with nickname input
        await expect(guestPage.getByPlaceholder(/your nickname/i)).toBeVisible({ timeout: 5000 });

      } finally {
        await hostContext.close();
        await guestContext.close();
      }
    });
  });
});

test.describe('UI Validation', () => {
  test('should convert room code to uppercase', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /join room/i }).click();

    const input = page.getByPlaceholder(/room code/i);
    await input.fill('abcd');

    await expect(input).toHaveValue('ABCD');
  });

  test('should limit room code to 4 characters', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /join room/i }).click();

    const input = page.getByPlaceholder(/room code/i);
    await input.fill('ABCDEF');

    await expect(input).toHaveValue('ABCD');
  });

  test('should show homepage with create and join buttons', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Rank Everything')).toBeVisible();
    await expect(page.getByRole('button', { name: /create room/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /join room/i })).toBeVisible();
  });
});
