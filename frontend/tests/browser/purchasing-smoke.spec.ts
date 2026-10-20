import { test, expect } from '@playwright/test';

test.describe('Purchasing Smoke Test', () => {
  const loginAs = async (page: any, username: string, password = 'password123') => {
    await page.goto('/login');
    await page.fill('input#username', username);
    await page.fill('input#password', password);
    await Promise.all([
      page.waitForURL('/'),
      page.click('button[type="submit"]')
    ]);
  };

  test('Purchasing workflow smoke', async ({ page }) => {
    // Authenticate
    await loginAs(page, 'admin');

    // 1. Open Purchasing Dashboard
    await page.goto('/purchasing');
    await expect(page.locator('h1', { hasText: 'Purchasing Dashboard' })).toBeVisible();

    // 2. Open Purchase Requests
    await page.goto('/purchasing/requests');
    await expect(page.locator('h1', { hasText: 'Purchase Requests' })).toBeVisible();
    
    // Find PR table and click first row (Empty State test if no data)
    const hasPRs = await page.locator('table tbody tr').first().isVisible();
    if (hasPRs) {
      await page.locator('table tbody tr').first().click();
      // Ensure detail is rendered
      await expect(page.locator('h1.text-2xl')).toBeVisible();
    }

    // 3. Open RFQ
    await page.goto('/purchasing/rfqs');
    await expect(page.locator('h1', { hasText: 'Request for Quotation (RFQ)' })).toBeVisible();

    // 4. Open PO
    await page.goto('/purchasing/orders');
    await expect(page.locator('h1', { hasText: 'Purchase Orders' })).toBeVisible();
    
    const hasPOs = await page.locator('table tbody tr').first().isVisible();
    if (hasPOs) {
      // Find a row
      const firstRow = page.locator('table tbody tr').first();
      // Wait for it to be clickable
      await firstRow.waitFor({ state: 'visible' });
      // The view button or clicking the row navigates to /purchasing/orders/[id]
      // Let's just click the link in the order number column or wait, in the list it usually has a Link or click handler
      // If it's a Link, we can click it
      await firstRow.click();
      
      // Wait for navigation
      await page.waitForURL(/\/purchasing\/orders\/.+/);

      // 6. Inspect fulfillment
      await expect(page.locator('h3', { hasText: 'Procurement Items' })).toBeVisible();
      
      // 8. Inspect matching
      await expect(page.locator('h3', { hasText: 'Three-Way Matching Status' })).toBeVisible();

      // Check for empty state / loaded state
      await expect(page.locator('text=Loading PO...')).not.toBeVisible();
    }

    // 5. Open Receipt
    await page.goto('/purchasing/receipts');
    await expect(page.locator('h1', { hasText: 'Goods Receipts' })).toBeVisible();

  });
});
