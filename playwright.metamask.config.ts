import { defineConfig, devices } from '@playwright/test';
import walletConfig from './playwright.wallet.config';

export default defineConfig({
  ...walletConfig,
  testMatch: 'metamask-launch.spec.ts',
  timeout: 90_000,
  use: { ...walletConfig.use, trace: 'off', screenshot: 'off' },
  projects: [
    { name: 'android-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'ios-browser-profile', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
});
