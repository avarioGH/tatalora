import { test, expect } from '@playwright/test';

test('Login Debug', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#username', 'admin');
  await page.fill('#password', 'password123');
  
  // Wait for response from API
  const [response] = await Promise.all([
    page.waitForResponse(resp => resp.url().includes('login') || resp.status() >= 400, { timeout: 10000 }).catch(() => null),
    page.click('button[type="submit"]')
  ]);
  
  await page.waitForTimeout(2000); // Give it a moment to render errors
  await page.screenshot({ path: 'tests/browser/debug-screenshot.png' });
  
  if (response) {
    console.log(`Login Response Status: ${response.status()}`);
    try {
      const body = await response.json();
      console.log('Login Response Body:', JSON.stringify(body));
    } catch(e) {}
  }
});
