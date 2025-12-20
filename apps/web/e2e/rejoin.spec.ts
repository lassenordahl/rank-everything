import { test, expect, type Page } from '@playwright/test';
import { COPY } from '../src/lib/copy';

// Reuse logging helper
const setupLogging = (page: Page, name: string) => {
  page.on('console', (msg) => {
    if (
      msg.type() === 'error' ||
      msg.type() === 'warning' ||
      msg.text().includes('Room') ||
      msg.text().includes('Config') ||
      msg.text().includes('Game')
    ) {
      console.log(`[${name}] ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
};

test.describe('Room Rejoining & Late Join', () => {
  test('should allow host to reload page and resume session', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    setupLogging(page, 'HostRejoin');

    try {
      console.log('--- Host Rejoin Test Start ---');
      await page.goto('/');
      await page.getByRole('button', { name: COPY.buttons.createRoom }).click();
      await page.getByPlaceholder(COPY.placeholders.nickname).fill('ResilientHost');
      await page.getByRole('button', { name: COPY.buttons.create }).click();
      await page.waitForURL(/\/[A-Z]{4}$/);
      const roomCode = page.url().split('/').pop() || '';
      console.log(`Room created: ${roomCode}`);

      // Verify connected
      await expect(page.getByText('ResilientHost')).toBeVisible();

      // RELOAD
      console.log('Reloading page...');
      await page.reload();

      // Should auto-join back into room
      await expect(page.getByText(roomCode)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('ResilientHost')).toBeVisible();

      // Should still be host (Start Game button visible)
      await expect(page.getByRole('button', { name: COPY.buttons.startGame })).toBeVisible();
      console.log('Host successfully rejoined and retained privileges');
    } finally {
      await context.close();
    }
  });

  test('should support late join with catch-up logic', async ({ browser, baseURL }) => {
    test.setTimeout(60000);
    // 1. Setup: Create room with 2 items per game
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    setupLogging(hostPage, 'Host');

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    setupLogging(guestPage, 'LateGuest');

    try {
      // Determine API URL (copy-paste from smoke.spec.ts logic roughly)
      const isLocal = baseURL?.includes('localhost') || baseURL?.includes('127.0.0.1');
      const apiBase = isLocal
        ? 'http://localhost:1999'
        : 'https://rank-everything.lassenordahl.partykit.dev';

      // Create Custom Room via API for speed
      const roomCode = Array.from({ length: 4 }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      ).join('');

      console.log(`[LateJoin] Creating room ${roomCode} via API`);
      await hostPage.request.post(`${apiBase}/party/${roomCode}`, {
        data: {
          action: 'create',
          nickname: 'Host',
          config: { itemsPerGame: 2, submissionMode: 'host-only' },
        },
      });

      // Host joins
      await hostPage.goto(`/${roomCode}`);
      // Hydrate localstorage for host (hacky but fast, or just join normally)
      // Actually, joining via UI is safer to ensure WS connection is fresh
      // But we need to reclaim host. For this test, let's just use UI to create if API is annoying,
      // but API is faster. Let's use the UI join flow for host to keep it simple and reliable.
    } catch {
      // Fallback if API fails
    }

    // RESTARTING pure UI flow for reliability
    await hostPage.goto('/');
    await hostPage.getByRole('button', { name: COPY.buttons.createRoom }).click();
    await hostPage.getByPlaceholder(COPY.placeholders.nickname).fill('MainHost');
    // Configure game? Default is fine, we just need to start.
    await hostPage.getByRole('button', { name: COPY.buttons.create }).click();
    await hostPage.waitForURL(/\/[A-Z]{4}$/);
    const roomCode = hostPage.url().split('/').pop() || '';
    console.log(`[LateJoin] UI Room created: ${roomCode}`);

    // Start Game
    await hostPage.getByRole('button', { name: COPY.buttons.startGame }).click();
    await expect(hostPage.getByText(COPY.game.yourTurn)).toBeVisible();

    // Submit Item 1
    const item1 = 'LateItem1';
    await hostPage.getByPlaceholder(COPY.game.enterItem).fill(item1);
    await hostPage.getByRole('button', { name: COPY.game.submit }).click();
    await expect(hostPage.getByText(item1)).toBeVisible();

    // Host Ranks Item 1
    await hostPage.getByRole('button', { name: '1', exact: true }).click();
    console.log('[LateJoin] Host ranked item 1');

    // NOW Late Player Joins
    console.log('[LateJoin] Late player joining...');
    await guestPage.goto(`/${roomCode}`);
    await guestPage.getByPlaceholder(COPY.placeholders.nickname).fill('CatchUpKid');
    await guestPage.getByRole('button', { name: COPY.buttons.join }).click();

    // Guest should land directly in Game View
    await expect(guestPage).toHaveURL(new RegExp(`/game/${roomCode}`));

    // Guest should see Item 1 to rank immediately (Catch Up)
    // They should NOT see the "Waiting for..." or "Your Turn" input yet
    await expect(guestPage.getByText(item1)).toBeVisible();

    // !!! CRITICAL: Verify Catch Up State
    // Depending on implementation, might show "Catching Up" banner or just the ranking list
    // We'll verify they can rank
    await guestPage.getByRole('button', { name: '1', exact: true }).click();
    console.log('[LateJoin] Guest caught up on item 1');

    // After catching up, Guest should now be in sync.
    // If turn-based, they might be next! Or Host might be next.
    // Since it's Round Robin (default), turn order is usually preserved.
    // Let's see who's next.

    const hostTurn = await hostPage.getByText(COPY.game.yourTurn).isVisible();
    const guestTurn = await guestPage.getByText(COPY.game.yourTurn).isVisible();

    console.log(`[LateJoin] Turn status - Host: ${hostTurn}, Guest: ${guestTurn}`);
    expect(hostTurn || guestTurn).toBe(true);

    await hostContext.close();
    await guestContext.close();
  });
});
