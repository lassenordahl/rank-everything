/**
 * Turn Timer E2E Tests
 *
 * Tests for the turn timer and auto-advance functionality.
 */

import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { COPY } from '../src/lib/copy';

// Helper to setup logging
const setupLogging = (page: Page, name: string) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('Turn') || msg.text().includes('Timer')) {
      console.log(`[${name}] ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
};

// Helper to create a room and start a game (solo mode)
const createSoloGame = async (page: Page, nickname: string) => {
  await page.goto('/');
  await page.getByRole('button', { name: COPY.buttons.createRoom }).click();
  await page.getByPlaceholder(COPY.placeholders.nickname).fill(nickname);
  await page.getByRole('button', { name: COPY.buttons.create }).click();
  await page.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });

  // Start the game
  await page.getByRole('button', { name: COPY.buttons.startGame }).click();

  // Wait for navigation to game view
  await page.waitForURL(/\/game\/[A-Z]{4}$/, { timeout: 15000 });
};

test.describe('Turn Timer', () => {
  test('should display timer countdown in game view', async ({ page }) => {
    setupLogging(page, 'TimerDisplay');

    await createSoloGame(page, 'TimerTestHost');

    // Timer should be visible (look for a countdown element)
    // The timer displays seconds remaining
    await expect(page.getByText(/\d+s/)).toBeVisible({ timeout: 5000 });
  });

  test('should show "Your turn" indicator for current player', async ({ page }) => {
    setupLogging(page, 'TurnIndicator');

    await createSoloGame(page, 'TurnTestHost');

    // "Your turn" text should be visible
    await expect(page.getByText(COPY.game.yourTurn)).toBeVisible({ timeout: 5000 });
  });

  test('should allow item submission during turn', async ({ page }) => {
    setupLogging(page, 'Submission');

    await createSoloGame(page, 'SubmitTestHost');

    // Input should be visible
    const input = page.getByPlaceholder(COPY.game.enterItem);
    await expect(input).toBeVisible({ timeout: 5000 });

    // Type an item
    await input.fill('Pizza');

    // Submit button should be enabled
    const submitButton = page.getByRole('button', { name: COPY.game.submit });
    await expect(submitButton).toBeEnabled();

    // Submit the item
    await submitButton.click();

    // The item should appear in the UI somewhere (rankings section)
    await expect(page.getByText('Pizza')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Timer Auto-Advance (requires short timer)', () => {
  // Note: These tests require the server to be configured with a short timer
  // or the tests will take too long. They are marked as slow.

  test.skip('should auto-advance to next player when timer expires', async () => {
    // This test would require:
    // 1. Create a multi-player room
    // 2. Start game
    // 3. Wait for timer to expire (60s by default - too long for CI)
    // 4. Verify turn changed
    // For now, we skip this test as it requires server configuration
    // or mocking time, which isn't practical in E2E tests.
  });
});
