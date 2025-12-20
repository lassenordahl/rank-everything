/**
 * Production Smoke Tests
 *
 * Lightweight E2E tests safe to run against production.
 * These tests create resources but clean up after themselves.
 */

import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { COPY } from '../src/lib/copy';

// Helper to setup logging
const setupLogging = (page: Page, name: string) => {
  page.on('console', (msg) => {
    if (
      msg.type() === 'error' ||
      msg.type() === 'warning' ||
      msg.text().includes('Room') ||
      msg.text().includes('Config')
    ) {
      console.log(`[${name}] ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      console.log(`[${name}] HTTP ${response.status()}: ${response.url()}`);
    }
  });
  page.on('requestfailed', (request) => {
    console.log(`[${name}] FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });
};

test.describe('Production Smoke Tests', () => {
  test.describe('Homepage', () => {
    test('should load homepage', async ({ page }) => {
      setupLogging(page, 'Home');
      await page.goto('/');

      // Title is displayed as "RANK" and "EVERYTHING" on separate lines
      await expect(page.getByText('RANK')).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('EVERYTHING')).toBeVisible({ timeout: 10000 });
      await expect(page.getByRole('button', { name: COPY.buttons.createRoom })).toBeVisible();
      await expect(page.getByRole('button', { name: COPY.buttons.joinRoom })).toBeVisible();
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
      await page.getByRole('button', { name: COPY.buttons.createRoom }).click();

      // Fill nickname
      await page.getByPlaceholder(COPY.placeholders.nickname).fill('SmokeTest');

      // Create room
      await page.getByRole('button', { name: COPY.buttons.create }).click();

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
      await page.getByRole('button', { name: COPY.buttons.joinRoom }).click();

      // Should see join form
      await expect(page.getByPlaceholder(COPY.placeholders.roomCode)).toBeVisible();
      await expect(page.getByPlaceholder(COPY.placeholders.nickname)).toBeVisible();

      // Room code should convert to uppercase
      const codeInput = page.getByPlaceholder(COPY.placeholders.roomCode);
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
        await page.getByRole('button', { name: COPY.buttons.createRoom }).click();
        await page.getByPlaceholder(COPY.placeholders.nickname).fill('WSTest');
        await page.getByRole('button', { name: COPY.buttons.create }).click();

        await page.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });

        // Should show player (indicates WebSocket is working)
        await expect(page.getByText('WSTest')).toBeVisible({ timeout: 5000 });

        // Should show player count (using regex since it includes count)
        await expect(page.getByText(new RegExp(`${COPY.labels.players}.*1`, 'i'))).toBeVisible({
          timeout: 5000,
        });
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
        await hostPage.getByRole('button', { name: COPY.buttons.createRoom }).click();
        await hostPage.getByPlaceholder(COPY.placeholders.nickname).fill('ProdHost');
        await hostPage.getByRole('button', { name: COPY.buttons.create }).click();

        await hostPage.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });
        const roomCode = hostPage.url().split('/').pop() || '';
        console.log(`Room created: ${roomCode}`);

        // GUEST: Join room via homepage
        console.log(`Guest joining room: ${roomCode}`);
        await guestPage.goto('/');
        await guestPage.getByRole('button', { name: COPY.buttons.joinRoom }).click();
        await guestPage.getByPlaceholder(COPY.placeholders.roomCode).fill(roomCode);
        await guestPage.getByPlaceholder(COPY.placeholders.nickname).fill('ProdGuest');
        await guestPage.getByRole('button', { name: COPY.buttons.join }).click();

        // Both should see the room code
        await expect(guestPage.getByText(roomCode)).toBeVisible({ timeout: 10000 });
        console.log('Guest joined successfully');

        // Host should see player count update
        await expect(hostPage.getByText(new RegExp(`${COPY.labels.players}.*2`, 'i'))).toBeVisible({
          timeout: 10000,
        });
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
        await pageA.getByRole('button', { name: COPY.buttons.createRoom }).click();
        await pageA.getByPlaceholder(COPY.placeholders.nickname).fill('HostA');
        await pageA.getByRole('button', { name: COPY.buttons.create }).click();
        await pageA.waitForURL(/\/[A-Z]{4}$/);
        const codeA = pageA.url().split('/').pop() || '';
        await expect(pageA.getByText(new RegExp(`${COPY.labels.players}.*1`, 'i'))).toBeVisible();
        console.log(`Room A created: ${codeA}`);

        // Create Room B
        await pageB.goto('/');
        await pageB.getByRole('button', { name: COPY.buttons.createRoom }).click();
        await pageB.getByPlaceholder(COPY.placeholders.nickname).fill('HostB');
        await pageB.getByRole('button', { name: COPY.buttons.create }).click();
        await pageB.waitForURL(/\/[A-Z]{4}$/);
        const codeB = pageB.url().split('/').pop() || '';
        await expect(pageB.getByText(new RegExp(`${COPY.labels.players}.*1`, 'i'))).toBeVisible();
        console.log(`Room B created: ${codeB}`);

        expect(codeA).not.toBe(codeB);

        // Join a guest to Room A via direct URL (tests RoomLobby join form)
        const guestA = await browser.newContext();
        const pageGuestA = await guestA.newPage();
        setupLogging(pageGuestA, 'GuestA');

        console.log(`GuestA joining Room A: ${codeA}`);
        await pageGuestA.goto(`/${codeA}`);
        await pageGuestA.getByPlaceholder(COPY.placeholders.nickname).fill('GuestA');
        await pageGuestA.getByRole('button', { name: COPY.buttons.join }).click();

        // Room A should now have 2 players
        await expect(pageA.getByText(new RegExp(`${COPY.labels.players}.*2`, 'i'))).toBeVisible({
          timeout: 15000,
        });
        console.log('Room A saw GuestA');

        // Room B should STILL have 1 player
        await expect(pageB.getByText(new RegExp(`${COPY.labels.players}.*1`, 'i'))).toBeVisible();
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
        await hostPage.getByRole('button', { name: COPY.buttons.createRoom }).click();
        await hostPage.getByPlaceholder(COPY.placeholders.nickname).fill('OriginalHost');
        await hostPage.getByRole('button', { name: COPY.buttons.create }).click();
        await hostPage.waitForURL(/\/[A-Z]{4}$/);
        const roomCode = hostPage.url().split('/').pop() || '';
        await expect(
          hostPage.getByText(new RegExp(`${COPY.labels.players}.*1`, 'i'))
        ).toBeVisible();
        console.log(`Room created for migration: ${roomCode}`);

        // Guest joins via direct URL
        await guestPage.goto(`/${roomCode}`);
        await guestPage.getByPlaceholder(COPY.placeholders.nickname).fill('NextInLine');
        await guestPage.getByRole('button', { name: COPY.buttons.join }).click();
        await expect(guestPage.getByText('NextInLine')).toBeVisible();
        await expect(hostPage.getByText(new RegExp(`${COPY.labels.players}.*2`, 'i'))).toBeVisible({
          timeout: 15000,
        });

        // CRITICAL: Also wait for the GUEST to see 2 players
        // This ensures their WebSocket is connected and receiving updates
        // Without this, the guest may miss the room_updated event when host leaves
        await expect(guestPage.getByText(new RegExp(`${COPY.labels.players}.*2`, 'i'))).toBeVisible(
          {
            timeout: 15000,
          }
        );
        console.log('Guest joined for migration (WebSocket confirmed)');

        // Host leaves
        console.log('Original host leaving...');
        await hostContext.close();

        // Guest should now be host (Settings/Start button should appear)
        await expect(guestPage.getByText(COPY.labels.settings)).toBeVisible({ timeout: 15000 });
        await expect(guestPage.getByText(COPY.labels.host)).toBeVisible();
        console.log('Host migration successful');
      } finally {
        await guestContext.close();
      }
    });
  });
});

test.describe('Game Turn-Taking', () => {
  test('should only show submit input to current turn player', async ({ browser }) => {
    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    setupLogging(hostPage, 'TurnHost');
    setupLogging(guestPage, 'TurnGuest');

    try {
      console.log('--- Turn-Taking Test Start ---');

      // HOST: Create room
      await hostPage.goto('/');
      await hostPage.getByRole('button', { name: COPY.buttons.createRoom }).click();
      await hostPage.getByPlaceholder(COPY.placeholders.nickname).fill('TurnHost');
      await hostPage.getByRole('button', { name: COPY.buttons.create }).click();
      await hostPage.waitForURL(/\/[A-Z]{4}$/);
      const roomCode = hostPage.url().split('/').pop() || '';
      console.log(`Room created: ${roomCode}`);

      // GUEST: Join room
      await guestPage.goto('/');
      await guestPage.getByRole('button', { name: COPY.buttons.joinRoom }).click();
      await guestPage.getByPlaceholder(COPY.placeholders.roomCode).fill(roomCode);
      await guestPage.getByPlaceholder(COPY.placeholders.nickname).fill('TurnGuest');
      await guestPage.getByRole('button', { name: COPY.buttons.join }).click();
      await expect(guestPage.getByText(roomCode)).toBeVisible({ timeout: 10000 });
      console.log('Guest joined');

      // Wait for both to see 2 players
      await expect(hostPage.getByText(new RegExp(`${COPY.labels.players}.*2`, 'i'))).toBeVisible({
        timeout: 10000,
      });
      await expect(guestPage.getByText(new RegExp(`${COPY.labels.players}.*2`, 'i'))).toBeVisible({
        timeout: 10000,
      });
      console.log('Both players in room and see each other');

      // Wait longer for WebSocket connections to stabilize after page reload
      // Production mobile can have higher latency
      await guestPage.waitForTimeout(3000);

      // HOST: Start game
      await hostPage.getByRole('button', { name: COPY.buttons.startGame }).click();
      console.log('Game started');

      // Both should navigate to /game/{code}
      // Use longer timeout and check both pages
      await Promise.all([
        hostPage.waitForURL(/\/game\/[A-Z]{4}$/, { timeout: 15000 }),
        guestPage.waitForURL(/\/game\/[A-Z]{4}$/, { timeout: 15000 }),
      ]);
      console.log('Both on game page');

      // HOST (first player) should see "Your turn!" and input
      await expect(hostPage.getByText(COPY.game.yourTurn)).toBeVisible({ timeout: 5000 });
      await expect(hostPage.getByPlaceholder(COPY.game.enterItem)).toBeVisible();
      console.log('Host sees input (correct - their turn)');

      // GUEST should see "Waiting for TurnHost" and NO input
      await expect(
        guestPage.getByText(new RegExp(`${COPY.game.waitingFor}.*TurnHost`, 'i'))
      ).toBeVisible({ timeout: 5000 });
      await expect(guestPage.getByPlaceholder(COPY.game.enterItem)).not.toBeVisible();
      console.log('Guest does NOT see input (correct - not their turn)');

      // HOST: Submit an item
      await hostPage.getByPlaceholder(COPY.game.enterItem).fill('Pizza');
      await hostPage.getByRole('button', { name: COPY.game.submit }).click();
      console.log('Host submitted item');

      // Both players should see the item to rank
      await expect(hostPage.getByText('Pizza')).toBeVisible({ timeout: 5000 });
      await expect(guestPage.getByText('Pizza')).toBeVisible({ timeout: 5000 });
      console.log('Both players see the item to rank');

      // Turn has advanced to guest, but guest can't submit yet because they need to rank first
      // The input should NOT be visible while currentItem is set
      await expect(guestPage.getByPlaceholder(COPY.game.enterItem)).not.toBeVisible();
      console.log('Guest does NOT see input (must rank item first)');

      // Guest ranks the item - this clears their currentItem
      await guestPage.getByRole('button', { name: '5', exact: true }).click();
      console.log('Guest ranked item');

      // NOW guest should see "Your turn!" and the submit input
      await expect(guestPage.getByText(COPY.game.yourTurn)).toBeVisible({ timeout: 5000 });
      await expect(guestPage.getByPlaceholder(COPY.game.enterItem)).toBeVisible({ timeout: 5000 });
      console.log('Guest sees input (ranked item, now their turn)');

      // Host ranks their item too
      await hostPage.getByRole('button', { name: '1', exact: true }).click();
      console.log('Host ranked item');

      // Host should see "Waiting for TurnGuest" and NOT see input
      await expect(
        hostPage.getByText(new RegExp(`${COPY.game.waitingFor}.*TurnGuest`, 'i'))
      ).toBeVisible({ timeout: 5000 });
      await expect(hostPage.getByPlaceholder(COPY.game.enterItem)).not.toBeVisible();
      console.log('Host does NOT see input (not their turn)');

      console.log('Turn-taking test PASSED');
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should be usable on mobile viewport', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile only test');

    await page.goto('/');

    // Homepage should be visible (title is "RANK" and "EVERYTHING" on separate lines)
    await expect(page.getByText('RANK')).toBeVisible();

    // Buttons should be tappable
    const createButton = page.getByRole('button', { name: COPY.buttons.createRoom });
    await expect(createButton).toBeVisible();

    // Create room flow should work
    await createButton.tap();
    await expect(page.getByPlaceholder(COPY.placeholders.nickname)).toBeVisible();
  });
});

test.describe('Game Completion (Smoke)', () => {
  test('should show reveal screen after configured items are submitted (2 items)', async ({
    browser,
    baseURL,
  }) => {
    const hostContext = await browser.newContext();
    const page = await hostContext.newPage();
    setupLogging(page, 'SmokeGame');

    try {
      // Determine API URL
      const isLocal = baseURL?.includes('localhost') || baseURL?.includes('127.0.0.1');
      const apiBase = isLocal
        ? 'http://localhost:1999'
        : 'https://rank-everything.lassenordahl.partykit.dev';

      // 1. Create Room via API with Custom Config (itemsPerGame: 2)
      const roomCode = Array.from({ length: 4 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      ).join('');

      console.log(`[Smoke] Creating room ${roomCode} with 2 items/game via API at ${apiBase}`);

      const createRes = await page.request.post(`${apiBase}/party/${roomCode}`, {
        data: {
          action: 'create',
          nickname: 'SmokeHost',
          config: {
            itemsPerGame: 2, // Override for fast test
            submissionMode: 'host-only', // Simplify flow (only host submits)
          },
        },
      });

      expect(createRes.ok()).toBe(true);
      console.log(`[Smoke] Room created successfully`);

      // 2. Join Room via UI
      await page.goto(`/${roomCode}`);

      const createData = await createRes.json();
      const hostPlayerId = createData.playerId;

      // Set localStorage to simulate being the host
      await page.addInitScript(
        (arg) => {
          localStorage.setItem('playerId', arg.playerId);
          localStorage.setItem('playerNickname', 'SmokeHost');
        },
        { playerId: hostPlayerId }
      );

      // Now reload/go to room
      await page.goto(`/${roomCode}`);

      // Should see "Start Game" button (proof we are host)
      await expect(page.getByRole('button', { name: COPY.buttons.startGame })).toBeVisible({
        timeout: 10000,
      });
      console.log(`[Smoke] Joined as host`);

      // 3. Start Game
      await page.getByRole('button', { name: COPY.buttons.startGame }).click();
      await expect(page.getByText(COPY.game.yourTurn)).toBeVisible();
      console.log(`[Smoke] Game started`);

      // 4. Play 2 Rounds
      const items = ['ShortItem1', 'ShortItem2'];

      for (let i = 0; i < 2; i++) {
        console.log(`[Smoke] Round ${i + 1}`);
        // Verify it's our turn
        await expect(page.getByText(COPY.game.yourTurn)).toBeVisible();

        // Submit
        await page.getByPlaceholder(COPY.game.enterItem).fill(items[i]);
        await page.getByRole('button', { name: COPY.game.submit }).click();

        // Rank
        await expect(page.getByText(items[i])).toBeVisible();
        const slot = i + 1;
        await page.getByRole('button', { name: String(slot), exact: true }).click();

        await page.waitForTimeout(500);
      }

      // 5. Verify End Screen
      console.log(`[Smoke] Verifying end state`);
      await expect(page.getByText(COPY.reveal.playAgain)).toBeVisible({ timeout: 10000 });
      console.log(`[Smoke] Reveal screen visible! Bug is fixed!`);
    } finally {
      await hostContext.close();
    }
  });
});
