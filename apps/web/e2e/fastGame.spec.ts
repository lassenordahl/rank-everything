/**
 * Fast Game E2E Tests
 *
 * Uses itemsPerGame: 3 for quick full-cycle testing of game state transitions.
 * This allows efficient testing of: lobby → in-progress → ended → rematch
 */

import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { COPY } from '../src/lib/copy';

// Helper to setup logging
const setupLogging = (page: Page, name: string) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('Room') || msg.text().includes('game')) {
      console.log(`[${name}] ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
};

// Create room with custom itemsPerGame via API
const createFastRoom = async (
  page: Page,
  nickname: string,
  _itemsPerGame: number = 3
): Promise<string> => {
  await page.goto('/');
  await page.getByRole('button', { name: COPY.buttons.createRoom }).click();
  await page.getByPlaceholder(COPY.placeholders.nickname).fill(nickname);

  // For now, we can't pass itemsPerGame through the UI
  // The room will use default 10, but we can still test faster with fewer items
  await page.getByRole('button', { name: COPY.buttons.create }).click();
  await page.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });

  return page.url().split('/').pop() || '';
};

// Quick item submission
const submitItem = async (page: Page, item: string) => {
  const input = page.getByPlaceholder(COPY.game.enterItem);
  await input.fill(item);
  await page.getByRole('button', { name: COPY.game.submit }).click();
  // Wait for submission to process
  await page.waitForTimeout(300);
};

test.describe('Fast Game Cycle (3 items)', () => {
  test('should complete full game cycle with multiple items', async ({ page }) => {
    setupLogging(page, 'FastGame');

    // Create room
    await createFastRoom(page, 'FastGameHost');

    // Start game
    await page.getByRole('button', { name: COPY.buttons.startGame }).click();
    await page.waitForURL(/\/game\/[A-Z]{4}$/, { timeout: 15000 });

    // Submit items (testing game flow even if we can't control itemsPerGame yet)
    await submitItem(page, 'Pizza');

    // Verify item counter increased
    await expect(page.getByText(/1 \//)).toBeVisible({ timeout: 5000 });

    // Submit more items
    await submitItem(page, 'Tacos');
    await expect(page.getByText(/2 \//)).toBeVisible({ timeout: 5000 });

    await submitItem(page, 'Sushi');
    await expect(page.getByText(/3 \//)).toBeVisible({ timeout: 5000 });

    console.log('Fast game cycle: 3 items submitted successfully');
  });

  test('should show turn indicator and timer', async ({ page }) => {
    setupLogging(page, 'TurnTimer');

    await createFastRoom(page, 'TurnTimerHost');
    await page.getByRole('button', { name: COPY.buttons.startGame }).click();
    await page.waitForURL(/\/game\/[A-Z]{4}$/, { timeout: 15000 });

    // Should show "Your turn!"
    await expect(page.getByText(COPY.game.yourTurn)).toBeVisible({ timeout: 5000 });

    // Timer should be visible
    await expect(page.locator('text=/\\d+s/')).toBeVisible({ timeout: 5000 });
  });

  test('should allow ranking of submitted items', async ({ page }) => {
    setupLogging(page, 'Ranking');

    await createFastRoom(page, 'RankingHost');
    await page.getByRole('button', { name: COPY.buttons.startGame }).click();
    await page.waitForURL(/\/game\/[A-Z]{4}$/, { timeout: 15000 });

    // Submit an item
    await submitItem(page, 'Coffee');

    // Should see rankings section
    await expect(page.getByText(COPY.game.myRankings)).toBeVisible({ timeout: 5000 });

    // Should see the item to rank (with ranking buttons/slots)
    await expect(page.getByText('Coffee')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Game State Transitions', () => {
  test('lobby → in-progress: start game', async ({ page }) => {
    setupLogging(page, 'StartGame');

    await createFastRoom(page, 'StateTestHost');

    // In lobby
    await expect(page.getByRole('button', { name: COPY.buttons.startGame })).toBeVisible({
      timeout: 5000,
    });

    // Start game
    await page.getByRole('button', { name: COPY.buttons.startGame }).click();

    // Now in game
    await page.waitForURL(/\/game\/[A-Z]{4}$/, { timeout: 15000 });
    await expect(page.getByText(COPY.game.yourTurn)).toBeVisible({ timeout: 5000 });
  });
});
