/**
 * Production Smoke Tests
 *
 * Lightweight E2E tests safe to run against production.
 * These tests create resources but clean up after themselves.
 */

import { test, expect } from '@playwright/test';
import { COPY } from '../src/lib/copy';
import { setupLogging, createRoom, joinRoom, joinRoomDirect, startGame } from './fixtures';

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
      setupLogging(page, 'CreateRoom');
      const code = await createRoom(page, 'SmokeTest');
      expect(code).toMatch(/^[A-Z]{4}$/);
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
      const context = await browser.newContext();
      const page = await context.newPage();
      setupLogging(page, 'WSTest');

      try {
        await createRoom(page, 'WSTest');

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
        const roomCode = await createRoom(hostPage, 'ProdHost');

        // GUEST: Join room via homepage
        await joinRoom(guestPage, roomCode, 'ProdGuest');

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
      test.setTimeout(90000); // Allow more time for parallel room creation
      const roomAHost = await browser.newContext();
      const roomBHost = await browser.newContext();

      const pageA = await roomAHost.newPage();
      const pageB = await roomBHost.newPage();
      setupLogging(pageA, 'HostA');
      setupLogging(pageB, 'HostB');

      try {
        console.log('--- Multi-Room Conflict Test Start ---');

        // Create rooms in parallel to save time
        const [codeA, codeB] = await Promise.all([
          createRoom(pageA, 'HostA'),
          createRoom(pageB, 'HostB'),
        ]);

        console.log(`Room A created: ${codeA}`);
        console.log(`Room B created: ${codeB}`);

        expect(codeA).not.toBe(codeB);

        // Join a guest to Room A via direct URL (tests RoomLobby join form)
        const guestA = await browser.newContext();
        const pageGuestA = await guestA.newPage();
        setupLogging(pageGuestA, 'GuestA');

        console.log(`GuestA joining Room A: ${codeA}`);

        // Use custom join logic here since duplication is minimal and specific
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
        const roomCode = await createRoom(hostPage, 'OriginalHost');

        // Guest joins via direct URL
        await joinRoomDirect(guestPage, roomCode, 'NextInLine');

        await expect(hostPage.getByText(new RegExp(`${COPY.labels.players}.*2`, 'i'))).toBeVisible({
          timeout: 15000,
        });

        // CRITICAL: Also wait for the GUEST to see 2 players
        await expect(guestPage.getByText(new RegExp(`${COPY.labels.players}.*2`, 'i'))).toBeVisible(
          {
            timeout: 15000,
          }
        );
        console.log('Guest joined for migration (WebSocket confirmed)');

        // Wait a small amount to allow any pending WS messages
        await guestPage.waitForTimeout(1000);

        // Host leaves
        console.log('Original host leaving...');
        await hostContext.close();

        // Guest should now be host
        console.log('Waiting for guest to become host...');
        await expect(guestPage.getByText(COPY.labels.settings)).toBeVisible({ timeout: 15000 });

        console.log('Host migration successful');
      } finally {
        await guestContext.close();
      }
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
        const roomCode = await createRoom(hostPage, 'TurnHost');

        // GUEST: Join room
        await joinRoom(guestPage, roomCode, 'TurnGuest');

        // Wait for both to see 2 players
        await expect(hostPage.getByText(new RegExp(`${COPY.labels.players}.*2`, 'i'))).toBeVisible({
          timeout: 10000,
        });
        await expect(guestPage.getByText(new RegExp(`${COPY.labels.players}.*2`, 'i'))).toBeVisible(
          {
            timeout: 10000,
          }
        );
        console.log('Both players in room and see each other');

        // Wait longer for WebSocket connections to stabilize
        await guestPage.waitForTimeout(3000);

        // HOST: Start game
        await startGame(hostPage);

        // Guest check
        await guestPage.waitForURL(/\/game\/[A-Z]{4}$/, { timeout: 15000 });
        console.log('Both on game page');

        // HOST (first player) should see "Your turn!" and input
        await expect(hostPage.getByText(COPY.game.yourTurn)).toBeVisible({ timeout: 5000 });
        await expect(hostPage.getByPlaceholder(COPY.game.enterItem)).toBeVisible();
        console.log('Host sees input (correct - their turn)');

        // GUEST should see "TurnHost's turn" and NO input
        await expect(guestPage.getByText(new RegExp(`TurnHost's turn`, 'i'))).toBeVisible({
          timeout: 5000,
        });
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
        await expect(guestPage.getByPlaceholder(COPY.game.enterItem)).not.toBeVisible();
        console.log('Guest does NOT see input (must rank item first)');

        // Guest ranks the item - this clears their currentItem
        await guestPage.getByRole('button', { name: '5', exact: true }).click();
        console.log('Guest ranked item');

        // NOW guest should see "Your turn!" and the submit input
        await expect(guestPage.getByText(COPY.game.yourTurn)).toBeVisible({ timeout: 5000 });
        await expect(guestPage.getByPlaceholder(COPY.game.enterItem)).toBeVisible({
          timeout: 5000,
        });
        console.log('Guest sees input (ranked item, now their turn)');

        // Host ranks their item too
        await hostPage.getByRole('button', { name: '1', exact: true }).click();
        console.log('Host ranked item');

        // Host should see "TurnGuest's turn" and NOT see input
        await expect(hostPage.getByText(new RegExp(`TurnGuest's turn`, 'i'))).toBeVisible({
          timeout: 5000,
        });
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
      test.setTimeout(60000); // Allow more time for full game flow
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
        await startGame(page);
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
          if (i < 1) {
            await expect(page.locator('p.text-xl', { hasText: items[i] })).toBeVisible();
            const slot = i + 1;
            await page.getByRole('button', { name: String(slot), exact: true }).click();
          }

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
});
