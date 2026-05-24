import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';

const webServer = [
  ...(fs.existsSync('server/.env')
    ? [
        {
          command: 'cd server && npm start',
          url: 'http://127.0.0.1:8003/api/lives',
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      ]
    : []),
  {
    command: 'npm run dev -- --host 127.0.0.1 --port 5177 --strictPort',
    url: 'http://127.0.0.1:5177',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
];

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html'], ['github']] : [['html'], ['list']],
  use: {
    baseURL: 'http://127.0.0.1:5177',
    trace: 'on-first-retry',
  },
  webServer,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
