/**
 * Production Smoke Tests
 *
 * Lightweight E2E tests safe to run against production.
 * These tests create resources but clean up after themselves.
 */

import { test, expect, BrowserContext, Page } from '@playwright/test';

// Helper to setup logging
const setupLogging = (page: Page, name: string) => {
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning' || msg.text().includes('Room') || msg.text().includes('Config')) {
      console.log(`[${name}] ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[${name}] HTTP ${response.status()}: ${response.url()}`);
    }
  });
  page.on('requestfailed', request => {
    console.log(`[${name}] FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });
};

test.describe('Production Smoke Tests', () => {
  test.describe('Homepage', () => {
    test('should load homepage', async ({ page }) => {
      setupLogging(page, 'Home');
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
      setupLogging(hostPage, 'Host');
      setupLogging(guestPage, 'Guest');

      try {
        console.log('--- Multi-Player Test Start ---');
        // HOST: Create room
        await hostPage.goto('/');
        await hostPage.getByRole('button', { name: /create room/i }).click();
        await hostPage.getByPlaceholder(/your nickname/i).fill('ProdHost');
        await hostPage.getByRole('button', { name: /^create$/i }).click();

        await hostPage.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });
        const roomCode = hostPage.url().split('/').pop()!;
        console.log(`Room created: ${roomCode}`);

        // GUEST: Join room
        console.log(`Guest joining room: ${roomCode}`);
        await guestPage.goto('/');
        await guestPage.getByRole('button', { name: /join room/i }).click();
        await guestPage.getByPlaceholder(/room code/i).fill(roomCode);
        await guestPage.getByPlaceholder(/your nickname/i).fill('ProdGuest');
        await guestPage.getByRole('button', { name: /^join$/i }).click();

        // Both should see the room code
        await expect(guestPage.getByText(roomCode)).toBeVisible({ timeout: 10000 });
        console.log('Guest joined successfully');

        // Host should see player count update
        await expect(hostPage.getByText(/players.*2/i)).toBeVisible({ timeout: 10000 });
        console.log('Host saw guest join');

      } finally {
        await hostContext.close();
        await guestContext.close();
      }
    });
  });

  test.describe('Multi-Room Conflict Isolation', () => {
    test('should keep rooms separate', async ({ browser }) => {
      const roomAHost = await browser.newContext();
      const roomBHost = await browser.newContext();

      const pageA = await roomAHost.newPage();
      const pageB = await roomBHost.newPage();
      setupLogging(pageA, 'HostA');
      setupLogging(pageB, 'HostB');

      try {
        console.log('--- Multi-Room Conflict Test Start ---');
        // Create Room A
        await pageA.goto('/');
        await pageA.getByRole('button', { name: /create room/i }).click();
        await pageA.getByPlaceholder(/your nickname/i).fill('HostA');
        await pageA.getByRole('button', { name: /^create$/i }).click();
        await pageA.waitForURL(/\/[A-Z]{4}$/);
        const codeA = pageA.url().split('/').pop()!;
        await expect(pageA.getByText(/players.*1/i)).toBeVisible();
        console.log(`Room A created: ${codeA}`);

        // Create Room B
        await pageB.goto('/');
        await pageB.getByRole('button', { name: /create room/i }).click();
        await pageB.getByPlaceholder(/your nickname/i).fill('HostB');
        await pageB.getByRole('button', { name: /^create$/i }).click();
        await pageB.waitForURL(/\/[A-Z]{4}$/);
        const codeB = pageB.url().split('/').pop()!;
        await expect(pageB.getByText(/players.*1/i)).toBeVisible();
        console.log(`Room B created: ${codeB}`);

        expect(codeA).not.toBe(codeB);

        // Join a guest to Room A
        const guestA = await browser.newContext();
        const pageGuestA = await guestA.newPage();
        setupLogging(pageGuestA, 'GuestA');

        console.log(`GuestA joining Room A: ${codeA}`);
        await pageGuestA.goto(`/${codeA}`);
        await pageGuestA.getByPlaceholder(/your nickname/i).fill('GuestA');
        await pageGuestA.getByRole('button', { name: /^join$/i }).click();

        // Room A should now have 2 players
        await expect(pageA.getByText(/players.*2/i)).toBeVisible({ timeout: 15000 });
        console.log('Room A saw GuestA');

        // Room B should STILL have 1 player
        await expect(pageB.getByText(/players.*1/i)).toBeVisible();
        await expect(pageB.getByText('GuestA')).not.toBeVisible();
        console.log('Room B is still isolated');

        await guestA.close();
      } finally {
        await roomAHost.close();
        await roomBHost.close();
      }
    });
  });

  test.describe('Host Migration (Production)', () => {
    test('should migrate host when original host leaves', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const guestContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();
      setupLogging(hostPage, 'MigrateHost');
      setupLogging(guestPage, 'MigrateGuest');

      try {
        console.log('--- Host Migration Test Start ---');
        // Create room
        await hostPage.goto('/');
        await hostPage.getByRole('button', { name: /create room/i }).click();
        await hostPage.getByPlaceholder(/your nickname/i).fill('OriginalHost');
        await hostPage.getByRole('button', { name: /^create$/i }).click();
        await hostPage.waitForURL(/\/[A-Z]{4}$/);
        const roomCode = hostPage.url().split('/').pop()!;
        await expect(hostPage.getByText(/players.*1/i)).toBeVisible();
        console.log(`Room created for migration: ${roomCode}`);

        // Guest joins
        await guestPage.goto(`/${roomCode}`);
        await guestPage.getByPlaceholder(/your nickname/i).fill('NextInLine');
        await guestPage.getByRole('button', { name: /^join$/i }).click();
        await expect(guestPage.getByText('NextInLine')).toBeVisible();
        await expect(hostPage.getByText(/players.*2/i)).toBeVisible({ timeout: 15000 });
        console.log('Guest joined for migration');

        // Host leaves
        console.log('Original host leaving...');
        await hostContext.close();

        // Guest should now be host (Settings/Start button should appear)
        await expect(guestPage.getByText('Settings')).toBeVisible({ timeout: 15000 });
        await expect(guestPage.getByText('(host)')).toBeVisible();
        console.log('Host migration successful');

      } finally {
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
