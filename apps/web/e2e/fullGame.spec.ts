/**
 * E2E Tests: Full Game Flow
 *
 * Tests complete game flows with real browser and server.
 * Multiple browser contexts simulate different players.
 */

import { test, expect } from '@playwright/test';
import { COPY } from '../src/lib/copy';
import { setupLogging, createRoom, joinRoom, joinRoomDirect, startGame } from './fixtures';

test.describe('Full Game Flow E2E', () => {
  test.describe('Single Player', () => {
    test('should create room and see room code', async ({ page }) => {
      setupLogging(page, 'SoloCreate');
      await createRoom(page, 'SoloPlayer');
    });

    test('should allow starting game with 1 player', async ({ page }) => {
      setupLogging(page, 'SoloStart');
      await createRoom(page, 'SoloHost');

      // Should see start game button
      await expect(page.getByRole('button', { name: COPY.buttons.startGame })).toBeVisible({
        timeout: 5000,
      });
    });
  });

  test.describe('Two Player Game', () => {
    test('should allow two players to join same room', async ({ browser }) => {
      const hostContext = await browser.newContext();
      const guestContext = await browser.newContext();

      const hostPage = await hostContext.newPage();
      const guestPage = await guestContext.newPage();
      setupLogging(hostPage, 'Host');
      setupLogging(guestPage, 'Guest');

      try {
        // HOST: Create room
        const roomCode = await createRoom(hostPage, 'TheHost');

        // GUEST: Join room via home page
        await joinRoom(guestPage, roomCode, 'TheGuest');

        // Host should see guest joined (player count should update)
        await expect(hostPage.getByText(new RegExp(`${COPY.labels.players}.*2`, 'i'))).toBeVisible({
          timeout: 5000,
        });
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
      setupLogging(hostPage, 'Host');

      try {
        // HOST: Create room
        const roomCode = await createRoom(hostPage, 'RoomCreator');

        // GUEST: Navigate directly to room URL (simulating link share)
        await guestPage.goto(`/${roomCode}`);

        // Should see join form with nickname input
        await expect(guestPage.getByPlaceholder(COPY.placeholders.nickname)).toBeVisible({
          timeout: 5000,
        });
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
    await page.getByRole('button', { name: COPY.buttons.joinRoom }).click();

    const input = page.getByPlaceholder(COPY.placeholders.roomCode);
    await input.fill('abcd');

    await expect(input).toHaveValue('ABCD');
  });

  test('should limit room code to 4 characters', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: COPY.buttons.joinRoom }).click();

    const input = page.getByPlaceholder(COPY.placeholders.roomCode);
    await input.fill('ABCDEF');

    await expect(input).toHaveValue('ABCD');
  });

  test('should show homepage with create and join buttons', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Rank Everything')).toBeVisible();
    await expect(page.getByRole('button', { name: COPY.buttons.createRoom })).toBeVisible();
    await expect(page.getByRole('button', { name: COPY.buttons.joinRoom })).toBeVisible();
  });
});

test.describe('Game Termination', () => {
  test('should show reveal screen after 10 items are submitted', async ({ browser }) => {
    // Use longer timeout for this test
    test.setTimeout(120000);

    const hostContext = await browser.newContext();
    const guestContext = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    setupLogging(hostPage, 'Host');
    setupLogging(guestPage, 'Guest');

    try {
      // HOST: Create room
      const roomCode = await createRoom(hostPage, 'Host');

      // GUEST: Join room
      await joinRoomDirect(guestPage, roomCode, 'Guest');

      // Wait for both players to be visible
      await expect(hostPage.getByText(new RegExp(`${COPY.labels.players}.*2`, 'i'))).toBeVisible({
        timeout: 5000,
      });

      // HOST: Start game
      await startGame(hostPage);

      // Play 10 rounds - host submits all items for simplicity
      const items = [
        'Pizza',
        'Coffee',
        'Beach',
        'Snow',
        'Dogs',
        'Cats',
        'Music',
        'Movies',
        'Books',
        'Sleep',
      ];

      for (let i = 0; i < 10; i++) {
        // Find which page has the turn (look for input field enabled)
        const currentPlayer = i % 2 === 0 ? hostPage : guestPage;

        // Wait for turn indicator
        await expect(currentPlayer.getByText(COPY.game.yourTurn)).toBeVisible({ timeout: 10000 });

        // Submit item
        await currentPlayer.getByPlaceholder(COPY.game.enterItem).fill(items[i]);
        await currentPlayer.getByRole('button', { name: COPY.game.submit }).click();

        // Both players rank the item (pick first available slot, which is slot i+1)
        const slot = i + 1;

        // Wait for ranking buttons to appear and click for both players
        await hostPage
          .getByRole('button', { name: String(slot), exact: true })
          .click({ timeout: 5000 });
        await guestPage
          .getByRole('button', { name: String(slot), exact: true })
          .click({ timeout: 5000 });

        // Small delay to allow state to sync
        await hostPage.waitForTimeout(500);
      }

      // After 10 items, game should end - verify reveal screen appears
      await expect(hostPage.getByText(COPY.reveal.playAgain)).toBeVisible({ timeout: 10000 });
      await expect(guestPage.getByText(COPY.reveal.playAgain)).toBeVisible({ timeout: 10000 });
    } finally {
      await hostContext.close();
      await guestContext.close();
    }
  });
});
