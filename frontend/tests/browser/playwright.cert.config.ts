import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  testMatch: 'customer-360-cert.spec.ts',
  timeout: 60000,
  reporter: [['list'], ['./reporter.ts']],
  use: {
    baseURL: 'http://localhost:3005',
    screenshot: 'on',
  },
  projects: [
    { name: 'Desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'Tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'Mobile', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
});
