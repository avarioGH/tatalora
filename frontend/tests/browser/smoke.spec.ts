import { test, expect } from '@playwright/test';

test.describe('STEP 20G.10A Smoke Test', () => {
  test('Dashboard and Smoke flows', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    // Wait for element instead of URL
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'tests/browser/dashboard-screenshot.png' });

    await page.goto('/inventory/products');
    await expect(page.locator('text=Product').first()).toBeVisible({ timeout: 10000 });
    await page.reload();
    await expect(page.locator('text=Product').first()).toBeVisible({ timeout: 10000 });

    const logoutBtn = page.locator('text=Logout');
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click();
    }
  });

  test('Viewport - Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'tests/browser/mobile-screenshot.png' });
  });

  test('Viewport - Tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 15000 });
    await page.screenshot({ path: 'tests/browser/tablet-screenshot.png' });
  });
});
