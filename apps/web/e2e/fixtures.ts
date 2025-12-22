import { Page, expect } from '@playwright/test';
import { COPY } from '../src/lib/copy';

export const setupLogging = (page: Page, name: string) => {
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

export const createRoom = async (page: Page, nickname: string) => {
  await page.goto('/');
  await page.getByRole('button', { name: COPY.buttons.createRoom }).click();
  await page.getByPlaceholder(COPY.placeholders.nickname).fill(nickname);
  await page.getByRole('button', { name: COPY.buttons.create }).click();
  await page.waitForURL(/\/[A-Z]{4}$/);
  const code = page.url().split('/').pop() || '';
  await expect(page.getByText(new RegExp(`${COPY.labels.players}.*1`, 'i'))).toBeVisible({
    timeout: 10000,
  });
  console.log(`[${nickname}] Created room: ${code}`);
  return code;
};

export const joinRoom = async (page: Page, roomCode: string, nickname: string) => {
  await page.goto('/');
  await page.getByRole('button', { name: COPY.buttons.joinRoom }).click();
  await page.getByPlaceholder(COPY.placeholders.roomCode).fill(roomCode);
  await page.getByPlaceholder(COPY.placeholders.nickname).fill(nickname);
  await page.getByRole('button', { name: COPY.buttons.join }).click();
  await expect(page.getByText(roomCode)).toBeVisible({ timeout: 10000 });
  console.log(`[${nickname}] Joined room: ${roomCode}`);
};

export const joinRoomDirect = async (page: Page, roomCode: string, nickname: string) => {
  await page.goto(`/${roomCode}`);
  await page.getByPlaceholder(COPY.placeholders.nickname).fill(nickname);
  await page.getByRole('button', { name: COPY.buttons.join }).click();
  await expect(page.getByText(nickname)).toBeVisible({ timeout: 10000 });
  console.log(`[${nickname}] Joined room direct: ${roomCode}`);
};

export const startGame = async (hostPage: Page) => {
  await hostPage.getByRole('button', { name: COPY.buttons.startGame }).click();
  // Host should typically see "Your turn!" after starting
  await expect(hostPage.getByText(COPY.game.yourTurn)).toBeVisible({ timeout: 10000 });
  console.log('[Host] Game started');
};
