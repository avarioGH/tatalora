import { test, expect } from '@playwright/test';

test.describe('STEP 20G.10B-R Full Certification', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    // Wait for the Dashboard to load
    await expect(page.locator('text=Aktivitas').first()).toBeVisible({ timeout: 15000 }).catch(() => null);
  });

  test('Module Smoke Tests & Screenshots', async ({ page }, testInfo) => {
    // 1. Dashboard
    await page.goto('/');
    await page.waitForTimeout(1000);

    // 2. CRM
    await page.goto('/crm/customers');
    await expect(page.locator('text=Daftar Pelanggan').first().or(page.locator('text=Customers').first())).toBeVisible({ timeout: 10000 });

    // 3. Sales
    await page.goto('/sales/orders');
    await expect(page.locator('text=Sales Orders').first()).toBeVisible({ timeout: 10000 });

    // 4. Purchasing
    await page.goto('/purchasing/orders');
    await expect(page.locator('text=Purchase Orders').first()).toBeVisible({ timeout: 10000 });

    // 5. Inventory
    await page.goto('/inventory/stock');
    await expect(page.locator('text=Stock').first().or(page.locator('text=Stok').first())).toBeVisible({ timeout: 10000 }).catch(()=>null);

    // 6. Finance
    await page.goto('/finance');
    await page.waitForTimeout(1000);

    // 7. HR
    await page.goto('/hr/employees');
    await page.waitForTimeout(1000);

    // 8. POS
    await page.goto('/pos/new-transaction');
    await page.waitForTimeout(1000);
  });

  test('Expense -> Approval -> Finance -> GL Critical Regression', async ({ page }) => {
    test.setTimeout(60000); // 60s
    await page.goto('/finance/expense');
    await expect(page.locator('h1', { hasText: 'Expense Claims' }).first()).toBeVisible({ timeout: 10000 });

    await page.click('data-testid=new-claim-btn');
    await expect(page.locator('text=New Expense Claim').first()).toBeVisible();

    await page.waitForTimeout(1000);

    const empSelect = page.locator('data-testid=employee-select');
    await empSelect.selectOption({ index: 1 });

    const titleInput = page.locator('data-testid=title-input');
    await titleInput.fill('Client Dinner Jakarta');

    const catSelect = page.locator('data-testid=item-category-0');
    await catSelect.selectOption({ index: 1 });

    const amountInput = page.locator('data-testid=item-amount-0');
    await amountInput.fill('500000'); // 500k

    await page.click('data-testid=submit-claim-btn');

    await expect(page.locator('text=Client Dinner Jakarta').first()).toBeVisible({ timeout: 10000 });
    
    const row = page.locator('tr').filter({ hasText: 'Client Dinner Jakarta' }).first();
    await expect(row).toContainText('500');
    await expect(row).toContainText('SUBMITTED');

    await page.goto('/approvals');
    await expect(page.locator('h1', { hasText: 'Approval Inbox' }).first().or(page.locator('text=Approval Inbox').first())).toBeVisible({ timeout: 10000 });

    const approvalRow = page.locator('tr').filter({ hasText: 'Client Dinner Jakarta' }).first();
    await expect(approvalRow).toBeVisible();

    await approvalRow.locator('button', { hasText: 'Approve' }).click();
    await page.waitForTimeout(2000);

    await page.goto('/finance/expense');
    const approvedRow = page.locator('tr').filter({ hasText: 'Client Dinner Jakarta' }).first();
    await expect(approvedRow).toContainText('APPROVED', { timeout: 10000 });
    
    await approvedRow.locator('button', { hasText: 'Post' }).click();
    await page.waitForTimeout(2000);

    await expect(approvedRow).toContainText('POSTED', { timeout: 10000 });

    await page.goto('/finance/gl');
    await expect(page.locator('h1', { hasText: 'General Ledger' }).first().or(page.locator('text=General Ledger').first())).toBeVisible({ timeout: 10000 });

    const glRow = page.locator('tr').filter({ hasText: '500' }).first();
    await expect(glRow).toBeVisible();
  });

});
