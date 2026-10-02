import {defineConfig} from '@playwright/test';

// Viewports follow AGENTS.md: desktop 1920×1080 and mobile 390×844 CSS pixels.
const desktop = {viewport: {width: 1920, height: 1080}, deviceScaleFactor: 1};
const mobile = {viewport: {width: 390, height: 844}, deviceScaleFactor: 1, hasTouch: true};
const separate = ['package.spec.ts', 'screenshots.spec.ts'];
const port = Number(process.env.CATALOGUE_PORT ?? 5174);

export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  fullyParallel: true,
  // More workers than this starves the dev server on a typical laptop.
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {name: 'desktop', use: desktop, testIgnore: [...separate, 'native-overscroll.spec.ts']},
    {name: 'mobile', use: mobile, testIgnore: [...separate, 'native-overscroll.spec.ts', 'overscroll-switch.spec.ts']},
    // Native bounce is measured mid-gesture in real browser windows, which is
    // timing-sensitive, so these run alone once everything else has finished.
    {name: 'native-desktop', use: desktop, testMatch: 'native-overscroll.spec.ts', dependencies: ['desktop', 'mobile']},
    {name: 'native-mobile', use: mobile, testMatch: 'native-overscroll.spec.ts', dependencies: ['desktop', 'mobile']},
    // Safari's engine, for CSS that Chromium and WebKit implement differently.
    {name: 'webkit', use: {...desktop, browserName: 'webkit'}, testMatch: 'overscroll-switch.spec.ts'},
    {name: 'package', testMatch: 'package.spec.ts'},
    {name: 'screenshots', testMatch: 'screenshots.spec.ts'},
  ],
  // Reuses a running `bun run dev`. Otherwise serves a production build, which
  // avoids the dev server's first-load dependency optimisation reloading pages.
  webServer: {
    command: `bun run build:catalogue && bunx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
});
