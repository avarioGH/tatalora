# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: purchasing-cert.spec.ts >> Purchasing Certification 20H.2-C >> Double submission protection
- Location: tests\browser\purchasing-cert.spec.ts:189:7

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/login
Call log:
  - navigating to "http://localhost:3005/login", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // Configuration for viewports
  4   | const viewports = {
  5   |   desktop: { width: 1440, height: 900 },
  6   |   tablet: { width: 768, height: 1024 },
  7   |   mobile: { width: 390, height: 844 },
  8   | };
  9   | 
  10  | let unexpectedConsoleErrors = 0;
  11  | let networkErrors = 0;
  12  | 
  13  | test.beforeEach(async ({ page }) => {
  14  |   page.on('console', (msg) => {
  15  |     if (msg.type() === 'error') {
  16  |       const text = msg.text();
  17  |       // Ignore React 18 hydration/act warnings if any, just strict unexpected
  18  |       if (!text.includes('favicon') && !text.includes('401') && !text.includes('403') && !text.includes('400')) {
  19  |         unexpectedConsoleErrors++;
  20  |       }
  21  |     }
  22  |   });
  23  |   page.on('pageerror', () => {
  24  |     unexpectedConsoleErrors++;
  25  |   });
  26  |   page.on('response', (res) => {
  27  |     if (res.status() >= 500) {
  28  |       networkErrors++;
  29  |     }
  30  |   });
  31  | });
  32  | 
  33  | const login = async (page: any, username: string) => {
> 34  |   await page.goto('/login');
      |              ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:3005/login
  35  |   await page.fill('input#username', username);
  36  |   await page.fill('input#password', 'password123');
  37  |   await Promise.all([
  38  |     page.waitForURL('/'),
  39  |     page.click('button[type="submit"]')
  40  |   ]);
  41  | };
  42  | 
  43  | test.describe('Purchasing Certification 20H.2-C', () => {
  44  | 
  45  |   test('Auth: Invalid login', async ({ page }) => {
  46  |     await page.goto('/login');
  47  |     await page.fill('input#username', 'invalid_user');
  48  |     await page.fill('input#password', 'wrongpass');
  49  |     await page.click('button[type="submit"]');
  50  |     // Ensure we don't login
  51  |     await expect(page.locator('.text-destructive')).toBeVisible();
  52  |     expect(page.url()).toContain('/login');
  53  |   });
  54  | 
  55  |   test('RBAC: Restricted HR User cannot access Purchasing', async ({ page }) => {
  56  |     await login(page, 'hr_user');
  57  |     await page.goto('/purchasing');
  58  |     
  59  |     // Check that we can't see actual purchasing data
  60  |     // Usually it redirects, or shows empty, or 403. Let's just verify KPI is 0 if it renders
  61  |     const prCount = page.locator('text=Open Requests').locator('..').locator('..').locator('.text-2xl');
  62  |     if (await prCount.isVisible()) {
  63  |       expect(await prCount.innerText()).toBe('0');
  64  |     }
  65  |   });
  66  | 
  67  |   test('Purchasing Dashboard (Desktop)', async ({ page }) => {
  68  |     await page.setViewportSize(viewports.desktop);
  69  |     await login(page, 'admin');
  70  |     await page.goto('/purchasing');
  71  |     
  72  |     await expect(page.locator('h1', { hasText: 'Purchasing Dashboard' })).toBeVisible();
  73  |     // Check KPI cards
  74  |     await expect(page.locator('text=Open Requests')).toBeVisible();
  75  |     await expect(page.locator('text=Active RFQs')).toBeVisible();
  76  |     await expect(page.locator('text=Open POs')).toBeVisible();
  77  |     await expect(page.locator('text=Completed POs')).toBeVisible();
  78  |     
  79  |     // Values should not be NaN
  80  |     const prCount = await page.locator('text=Open Requests').locator('..').locator('..').locator('.text-2xl').innerText();
  81  |     expect(prCount).not.toBe('NaN');
  82  |     expect(prCount).not.toBe('undefined');
  83  |     
  84  |     await page.screenshot({ path: 'purchasing-dashboard-desktop.png', fullPage: true });
  85  |   });
  86  | 
  87  |   test('Purchase Request Workflow & Comparison', async ({ page }) => {
  88  |     await page.setViewportSize(viewports.desktop);
  89  |     await login(page, 'admin');
  90  |     await page.goto('/purchasing/requests');
  91  |     
  92  |     await expect(page.locator('h1', { hasText: 'Purchase Requests' })).toBeVisible();
  93  |     // Wait for data
  94  |     const row = page.locator('table tbody tr', { hasText: 'PR-CERT-001' }).first();
  95  |     await row.waitFor({ state: 'visible' });
  96  |     await row.click();
  97  |     
  98  |     // View details
  99  |     await expect(page.locator('h1.text-2xl', { hasText: 'PR-CERT-001' })).toBeVisible();
  100 |     
  101 |     // Compare suppliers
  102 |     const compareBtn = page.locator('button', { hasText: 'Compare Suppliers' }).first();
  103 |     await expect(compareBtn).toBeVisible();
  104 |     await page.screenshot({ path: 'purchasing-request-desktop.png', fullPage: true });
  105 |     
  106 |     // Click compare
  107 |     await compareBtn.click();
  108 |     await page.waitForURL(/\/purchasing\/comparison/);
  109 |     
  110 |     await expect(page.locator('h1', { hasText: 'Supplier Comparison' })).toBeVisible();
  111 |     await expect(page.locator('table', { hasText: 'Global Tech Suppliers' })).toBeVisible();
  112 |     await page.screenshot({ path: 'purchasing-comparison-desktop.png', fullPage: true });
  113 | 
  114 |     // Click award
  115 |     const awardBtn = page.locator('button', { hasText: 'Award & Create RFQ' }).first();
  116 |     await expect(awardBtn).toBeVisible();
  117 |     await awardBtn.click();
  118 |     
  119 |     // Should navigate to RFQs
  120 |     await page.waitForURL(/\/purchasing\/rfqs/);
  121 |     await expect(page.locator('h1', { hasText: 'Request for Quotation (RFQ)' })).toBeVisible();
  122 |   });
  123 | 
  124 |   test('PO Partial Receiving & 3-Way Match', async ({ page }) => {
  125 |     await page.setViewportSize(viewports.desktop);
  126 |     await login(page, 'admin');
  127 |     await page.goto('/purchasing/orders');
  128 |     
  129 |     // Find PO-CERT-002
  130 |     const row = page.locator('table tbody tr', { hasText: 'PO-CERT-002' }).first();
  131 |     await row.waitFor({ state: 'visible' });
  132 |     await row.click();
  133 |     
  134 |     await page.waitForURL(/\/purchasing\/orders\/.+/);
```