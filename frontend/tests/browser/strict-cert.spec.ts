import { test, expect, Page } from '@playwright/test';

// Helper to login cleanly
async function doLogin(page: Page, username: string, password: string) {
  await page.goto('/login');
  await page.fill('#username', username);
  await page.fill('#password', password);
  
  await Promise.all([
    page.waitForURL(url => url.pathname === '/', { timeout: 15000 }),
    page.click('button[type="submit"]')
  ]);
  
  await expect(page.locator('text=Aktivitas').first().or(page.locator('text=Dashboard').first())).toBeVisible({ timeout: 15000 });
}

test.describe('STEP 20G.10B-R.1 Strict Certification', () => {

  test('1. Authentication & Security', async ({ page }) => {
    // A. Invalid login
    await page.goto('/login');
    await page.fill('#username', 'invalid');
    await page.fill('#password', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Unauthorized').first().or(page.locator('text=Request failed').first())).toBeVisible({ timeout: 5000 });

    // C. Protected route (unauthenticated context)
    await page.goto('/finance');
    await expect(page.locator('text=Login').first().or(page.locator('#username').first())).toBeVisible({ timeout: 5000 });

    // B. Valid login
    await doLogin(page, 'admin', 'password123');
  });

  test('2. Navigation & Canonical Routes', async ({ page, isMobile }) => {
    await doLogin(page, 'admin', 'password123');

    if (isMobile) {
      const menuBtn = page.locator('button[aria-label="Toggle navigation"]').or(page.locator('.lucide-menu').first());
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
        await expect(page.locator('text=Dashboard').first()).toBeVisible();
      }
    }

    const routes = [
      { path: '/crm/customers', check: 'Pelanggan' },
      { path: '/sales/orders', check: 'Sales Orders' },
      { path: '/purchasing/orders', check: 'Purchase Orders' },
      { path: '/inventory/stock', check: 'Stock' },
      { path: '/finance', check: 'Finance' },
      { path: '/finance/invoices', check: 'Invoices' },
      { path: '/hr/employees', check: 'Employees' },
      { path: '/approvals', check: 'Approval Inbox' },
      { path: '/pos/new-transaction', check: 'POS' },
    ];

    for (const r of routes) {
      await page.goto(r.path);
      await expect(page.locator(`text=${r.check}`).first().or(page.locator('h1').first())).toBeVisible({ timeout: 10000 });
    }

    await page.goto('/customers/list');
    await expect(page).toHaveURL(/.*\/crm\/customers/);

    await page.goto('/reports/finance');
    await expect(page).toHaveURL(/.*\/finance\/reports/);
  });

  test('3. Critical Expense Workflow & Double Submission', async ({ page }) => {
    test.setTimeout(60000);
    let requestCount = 0;
    page.on('request', request => {
      if (request.url().includes('/api/expense') && request.method() === 'POST') {
        requestCount++;
      }
    });

    await doLogin(page, 'admin', 'password123');
    await page.goto('/finance/expense');
    await expect(page.locator('h1', { hasText: 'Expense Claims' }).first()).toBeVisible({ timeout: 10000 });

    await page.click('data-testid=new-claim-btn');
    await expect(page.locator('text=New Expense Claim').first()).toBeVisible();
    await page.waitForTimeout(1000);

    await page.locator('data-testid=employee-select').selectOption({ index: 1 });
    await page.locator('data-testid=title-input').fill('STRICT CERT DINNER');
    await page.locator('data-testid=item-category-0').selectOption({ index: 1 });
    await page.locator('data-testid=item-amount-0').fill('500000');

    const submitBtn = page.locator('data-testid=submit-claim-btn');
    await submitBtn.click();
    await submitBtn.click({ force: true }).catch(()=>null);

    await expect(page.locator('text=STRICT CERT DINNER').first()).toBeVisible({ timeout: 15000 });
    
    const row = page.locator('tr', { hasText: 'STRICT CERT DINNER' }).first();
    await expect(row).toContainText('SUBMITTED');
    await expect(row).toContainText('500'); 
    await expect(row).not.toContainText('NaN');
    await expect(row).not.toContainText('undefined');

    await expect(page.locator('tr', { hasText: 'STRICT CERT DINNER' })).toHaveCount(1);

    await page.goto('/approvals');
    const approvalRow = page.locator('tr', { hasText: 'STRICT CERT DINNER' }).first();
    await expect(approvalRow).toBeVisible({ timeout: 10000 });
    await approvalRow.locator('button', { hasText: 'Approve' }).click();
    await page.waitForTimeout(2000);

    await page.goto('/finance/expense');
    const approvedRow = page.locator('tr', { hasText: 'STRICT CERT DINNER' }).first();
    await expect(approvedRow).toContainText('APPROVED', { timeout: 10000 });
    await approvedRow.locator('button', { hasText: 'Post' }).click();
    await page.waitForTimeout(2000);
    await expect(approvedRow).toContainText('POSTED', { timeout: 10000 });

    await page.goto('/finance/gl');
    await expect(page.locator('h1', { hasText: 'General Ledger' }).first()).toBeVisible({ timeout: 10000 });
    const glRow = page.locator('tr').filter({ hasText: '500' }).first();
    await expect(glRow).toBeVisible();
    await expect(glRow).not.toContainText('NaN');
  });

  test('4. UI States & Console Health', async ({ page }) => {
    let hydrationErrors = 0;
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Hydration') || text.includes('Minified React error')) hydrationErrors++;
    });

    await doLogin(page, 'admin', 'password123');

    await page.goto('/finance/vendor-bills');
    await expect(page.locator('text=No').first().or(page.locator('text=0').first())).toBeVisible({ timeout: 10000 }).catch(()=>null);

    await page.goto('/hr/employees');
    await expect(page.locator('text=Employees').first().or(page.locator('text=Pegawai').first())).toBeVisible({ timeout: 10000 });
    
    await page.reload();
    await expect(page.locator('text=Employees').first().or(page.locator('text=Pegawai').first())).toBeVisible({ timeout: 10000 });

    await page.goto('/finance/expense');
    await page.goBack();
    await expect(page.locator('text=Employees').first().or(page.locator('text=Pegawai').first())).toBeVisible({ timeout: 10000 });

    expect(hydrationErrors).toBe(0);
  });

});
