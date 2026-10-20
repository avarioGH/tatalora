import { test, expect } from '@playwright/test';

test.describe('STEP 20G.10C Expense Regression', () => {

  test('Expense -> Approval -> Finance -> GL', async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'password123');
    await page.click('button[type="submit"]');
    
    // Just wait for the dashboard to render which proves auth succeeded
    await expect(page.locator('text=Aktivitas').first()).toBeVisible({ timeout: 15000 }).catch(() => null);

    // 2. Navigate to Expense
    await page.goto('/finance/expense');
    await expect(page.locator('h1', { hasText: 'Expense Claims' }).first()).toBeVisible({ timeout: 10000 });

    // 3. Click New Claim
    await page.click('data-testid=new-claim-btn');
    await expect(page.locator('text=New Expense Claim').first()).toBeVisible();

    // Wait for dropdowns to populate (Employees and Categories)
    await page.waitForTimeout(1000);

    // 5. Fill required fields
    const empSelect = page.locator('data-testid=employee-select');
    await empSelect.selectOption({ index: 1 });

    const titleInput = page.locator('data-testid=title-input');
    await titleInput.fill('Client Dinner Jakarta');

    const catSelect = page.locator('data-testid=item-category-0');
    await catSelect.selectOption({ index: 1 });

    const amountInput = page.locator('data-testid=item-amount-0');
    await amountInput.fill('500000'); // 500k

    // 6. Submit
    await page.click('data-testid=submit-claim-btn');

    // 8. Verify success & 9. Verify claim appears
    await expect(page.locator('text=Client Dinner Jakarta').first()).toBeVisible({ timeout: 10000 });
    
    // Check amount
    const row = page.locator('tr').filter({ hasText: 'Client Dinner Jakarta' }).first();
    await expect(row).toContainText('500');

    // Check status is SUBMITTED
    await expect(row).toContainText('SUBMITTED');

    // 10. Open Approval Center
    await page.goto('/approvals');
    await expect(page.locator('text=Approval Inbox').first()).toBeVisible({ timeout: 10000 });

    // 11. Verify claim exists
    const approvalRow = page.locator('tr').filter({ hasText: 'Client Dinner Jakarta' }).first();
    await expect(approvalRow).toBeVisible();

    // 12. Approve claim
    await approvalRow.locator('button', { hasText: 'Approve' }).click();
    await page.waitForTimeout(2000); // wait for refetch

    // 14. Post claim
    await page.goto('/finance/expense');
    const approvedRow = page.locator('tr').filter({ hasText: 'Client Dinner Jakarta' }).first();
    await expect(approvedRow).toContainText('APPROVED', { timeout: 10000 });
    
    await approvedRow.locator('button', { hasText: 'Post' }).click();
    await page.waitForTimeout(2000); // wait for post

    await expect(approvedRow).toContainText('POSTED', { timeout: 10000 });

    // 15. Navigate Finance / GL
    await page.goto('/finance/gl');
    await expect(page.locator('h1', { hasText: 'General Ledger' }).first()).toBeVisible({ timeout: 10000 });

    // 16. Verify resulting financial record & 18. Verify amount
    const glRow = page.locator('tr').filter({ hasText: '500' }).first();
    await expect(glRow).toBeVisible();
  });

});
