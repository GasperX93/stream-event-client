import { defineConfig, devices } from '@playwright/test';

import { previewServer } from './previewServer';
import { PREVIEW_ORIGIN } from './recording';

/**
 * The browser smoke test: the built app, one real browser, and every Bee answer replayed from `e2e/recorded/`. No node,
 * no network and no server other than the app's own. `pnpm e2e` builds the app first. It checks that the journey
 * works, never how fast it is.
 */
export default defineConfig({
  testDir: '.',
  testMatch: 'smoke.e2e.ts',
  outputDir: '../test-results/playwright',
  timeout: 90_000,
  // One journey, so one worker, which also keeps a CI runner's core count from deciding how many browsers start.
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  globalSetup: './installBrowser.ts',
  webServer: previewServer(),
  use: {
    ...devices['Desktop Chrome'],
    baseURL: PREVIEW_ORIGIN,
    trace: 'retain-on-failure',
    // A page opened by a test has had no click, and the player starts on its own the way it does for a viewer who
    // clicked a card.
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
});
