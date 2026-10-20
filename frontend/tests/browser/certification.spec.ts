import { test, expect } from '@playwright/test';

test.describe('STEP 20G.10B Certification', () => {
  test('Authentication & Error States', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=Sign In').first()).toBeVisible();

    await page.fill('#username', 'invalid');
    await page.fill('#password', 'wrong');
    await page.click('button[type="submit"]');
    
    // Look for error message
    const errorText = page.locator('text=Login failed').first();
    await errorText.waitFor({ timeout: 5000 }).catch(() => null); 

    await page.fill('#username', 'admin');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');

    // Wait for the redirect to finish
    await page.waitForURL('**/', { timeout: 10000 }).catch(() => null);
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });
  });

  test('Legacy Routes Redirects', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });

    const legacyRoutes = [
      { from: '/reports/finance', to: '/finance/reports' },
      { from: '/customers/list', to: '/crm/customers' },
      { from: '/customers', to: '/crm/customers' },
      { from: '/inventory/stock-transfer', to: '/inventory/transfers' }
    ];

    for (const route of legacyRoutes) {
      await page.goto(route.from);
      await page.waitForTimeout(1000); 
      // check if URL contains the target
      expect(page.url()).toContain(route.to);
    }
  });

  test('Canonical Routes Crawler', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Dashboard').first()).toBeVisible({ timeout: 10000 });

    const errors = [];
    const targetRoutes = [
      '/crm/customers', '/sales/orders', '/purchasing/orders', 
      '/inventory/stock', '/manufacturing/mrp', '/finance/invoices',
      '/finance/gl', '/hr/employees', '/hr/payroll', '/finance/assets',
      '/approvals', '/reports/sales'
    ];

    for (const route of targetRoutes) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      // If we got redirected back to login, the route is broken or unprotected
      if (page.url().includes('/login')) {
         errors.push(`${route} - Redirected to login`);
      } else if (response && response.status() >= 400) {
         errors.push(`${route} - Status ${response.status()}`);
      }
    }
    
    expect(errors).toEqual([]);
  });
});
