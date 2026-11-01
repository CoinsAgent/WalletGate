import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'wallet-login.spec.ts', workers: 1,
  timeout: 90_000, expect: { timeout: 15_000 },
  outputDir: 'docs/plans/progress/PH-005-logs/browser-artifacts',
  reporter: [['list']],
  use: { headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.WALLET_TEST_CHROMIUM || '/home/ubuntu/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome', env: { ...process.env, XDG_CONFIG_HOME: '/tmp/walletgate-ph005-browser-config', XDG_CACHE_HOME: '/tmp/walletgate-ph005-browser-cache' } } },
  projects: [{ name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
});
