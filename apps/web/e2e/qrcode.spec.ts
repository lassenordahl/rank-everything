/**
 * QR Code Modal E2E Tests
 *
 * Tests for the QR code room sharing functionality.
 */

import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { COPY } from '../src/lib/copy';

// Helper to setup logging
const setupLogging = (page: Page, name: string) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('Room')) {
      console.log(`[${name}] ${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
};

test.describe('QR Code Modal', () => {
  test('should show QR code button in room lobby', async ({ page }) => {
    setupLogging(page, 'QRTest');

    // Create a room
    await page.goto('/');
    await page.getByRole('button', { name: COPY.buttons.createRoom }).click();
    await page.getByPlaceholder(COPY.placeholders.nickname).fill('QRTestHost');
    await page.getByRole('button', { name: COPY.buttons.create }).click();

    // Wait for room to load
    await page.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });

    // QR code button should be visible
    await expect(page.getByRole('button', { name: new RegExp(COPY.buttons.shareQR) })).toBeVisible({
      timeout: 5000,
    });
  });

  test('should open and close QR modal', async ({ page }) => {
    setupLogging(page, 'QRModal');

    // Create a room
    await page.goto('/');
    await page.getByRole('button', { name: COPY.buttons.createRoom }).click();
    await page.getByPlaceholder(COPY.placeholders.nickname).fill('QRModalHost');
    await page.getByRole('button', { name: COPY.buttons.create }).click();
    await page.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });

    // Click QR code button
    await page.getByRole('button', { name: new RegExp(COPY.buttons.shareQR) }).click();

    // Modal should appear with scan to join text
    await expect(page.getByText(COPY.labels.scanToJoin)).toBeVisible({ timeout: 5000 });

    // QR code image should be present
    await expect(page.locator('img[alt*="QR code"]')).toBeVisible({ timeout: 5000 });

    // Close button should work
    await page.getByRole('button', { name: COPY.buttons.close }).click();

    // Modal should close
    await expect(page.getByText(COPY.labels.scanToJoin)).not.toBeVisible();
  });

  test('should display the correct room code in QR modal', async ({ page }) => {
    setupLogging(page, 'QRRoomCode');

    // Create a room
    await page.goto('/');
    await page.getByRole('button', { name: COPY.buttons.createRoom }).click();
    await page.getByPlaceholder(COPY.placeholders.nickname).fill('QRCodeHost');
    await page.getByRole('button', { name: COPY.buttons.create }).click();
    await page.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });

    // Extract the room code from URL
    const roomCode = page.url().split('/').pop() || '';

    // Open QR modal
    await page.getByRole('button', { name: new RegExp(COPY.buttons.shareQR) }).click();

    // Room code should be displayed in the modal
    await expect(page.locator('h1').filter({ hasText: roomCode })).toBeVisible({ timeout: 5000 });
  });

  test('should close modal when clicking outside', async ({ page }) => {
    setupLogging(page, 'QRClickOutside');

    // Create a room
    await page.goto('/');
    await page.getByRole('button', { name: COPY.buttons.createRoom }).click();
    await page.getByPlaceholder(COPY.placeholders.nickname).fill('QRClickOutsideHost');
    await page.getByRole('button', { name: COPY.buttons.create }).click();
    await page.waitForURL(/\/[A-Z]{4}$/, { timeout: 15000 });

    // Open QR modal
    await page.getByRole('button', { name: new RegExp(COPY.buttons.shareQR) }).click();
    await expect(page.getByText(COPY.labels.scanToJoin)).toBeVisible({ timeout: 5000 });

    // Click the backdrop (outside the modal content)
    await page.locator('.fixed.inset-0').click({ position: { x: 10, y: 10 } });

    // Modal should close
    await expect(page.getByText(COPY.labels.scanToJoin)).not.toBeVisible();
  });
});
