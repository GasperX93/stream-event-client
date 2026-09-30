import { defineConfig, devices } from '@playwright/test';

import { previewServer } from './previewServer';
import { beeApiUrl } from './record/beeNode';
import { PREVIEW_ORIGIN } from './recording';

/**
 * Records the Bee answers the smoke test replays. It needs a Docker daemon and ffmpeg, so it runs on a machine that has
 * both, as a job of its own, and never on every pull request. `pnpm e2e:record` builds the app first, and
 * `pnpm test:docker` runs it after the image check, with the browser's system libraries installed, as a Docker job
 * needs.
 *
 * Every such run records afresh into `test-results/recorded/`. Nothing it records reaches the tree on its own: the
 * smoke test replays only what is committed under `e2e/recorded/`.
 */
export default defineConfig({
  testDir: '.',
  testMatch: 'record.e2e.ts',
  outputDir: '../test-results/playwright-record',
  timeout: 180_000,
  workers: 1,
  reporter: [['list']],
  globalSetup: ['./installBrowser.ts', './record/globalSetup.ts'],
  webServer: previewServer({ DEV_BEE_PROXY_TARGET: beeApiUrl() }),
  use: {
    ...devices['Desktop Chrome'],
    baseURL: PREVIEW_ORIGIN,
    trace: 'retain-on-failure',
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
  },
});
