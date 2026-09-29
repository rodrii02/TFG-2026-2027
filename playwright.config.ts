import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 120_000, fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:4200', channel: 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel:'chrome' } }],
  webServer: { command: 'npm start -- --port 4200', url: 'http://127.0.0.1:4200', reuseExistingServer: !process.env['CI'], timeout: 60_000 },
});
