import { defineConfig, devices } from '@playwright/test';

// 合成API専用。既存の.env/バックエンド起動設定や稼働中サーバーを利用しない。
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'live-metadata.spec.js',
  outputDir: 'test-results/metadata',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/metadata', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5188',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5188 --strictPort',
    url: 'http://127.0.0.1:5188',
    reuseExistingServer: false,
    env: { VITE_API_URL: 'http://127.0.0.1:9' }, // 未処理APIも既存DBへ到達させない。
    timeout: 60000,
  },
  projects: [
    { name: 'metadata-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'metadata-mobile', use: { ...devices['Pixel 5'] } },
  ],
});
