import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

/**
 * Installs the Chromium build this Playwright release pins, before any test starts. A machine that already has it
 * does nothing here, so a suite never depends on which browsers the machine it runs on happens to carry. Only the
 * headless shell is fetched, which is all a headless run launches.
 *
 * `--with-deps` also installs the system libraries Chromium needs on Linux, through the package manager. It is asked
 * for only where the run is a CI job or a container, which may lack them and may install them. A developer's own
 * machine is never sent to its package manager.
 */
export default function installBrowser(): void {
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
  const withDeps = process.env.CI || process.env.PLAYWRIGHT_INSTALL_DEPS ? ['--with-deps'] : [];
  execFileSync(process.execPath, [cli, 'install', ...withDeps, '--only-shell', 'chromium'], { stdio: 'inherit' });
}
