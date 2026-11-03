import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', testMatch: ['**/extension.spec.ts', '**/protection.spec.ts'], workers: 1, timeout: 30000, retries: 0,
  // Chrome storage notifications and dynamic script registration can be delayed on busy Windows hosts.
  expect: { timeout: 10000 },
  reporter: [['list']], use: { screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
