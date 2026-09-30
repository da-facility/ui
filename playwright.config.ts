import {defineConfig} from '@playwright/test';

// Viewports follow AGENTS.md: desktop 1920×1080 and mobile 390×844 CSS pixels.
const desktop = {viewport: {width: 1920, height: 1080}, deviceScaleFactor: 1};
const mobile = {viewport: {width: 390, height: 844}, deviceScaleFactor: 1, hasTouch: true};
const port = Number(process.env.CATALOGUE_PORT ?? 5173);

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  fullyParallel: true,
  // The native-overscroll tests open real browser windows; more workers than
  // this starves them and the dev server on a typical laptop.
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {name: 'desktop', use: desktop, testIgnore: ['package.spec.ts', 'screenshots.spec.ts']},
    {name: 'mobile', use: mobile, testIgnore: ['package.spec.ts', 'screenshots.spec.ts']},
    {name: 'package', testMatch: 'package.spec.ts'},
    {name: 'screenshots', testMatch: 'screenshots.spec.ts'},
  ],
  webServer: {
    command: `bun run dev --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
