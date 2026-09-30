import { PREVIEW_ORIGIN, PREVIEW_PORT } from './recording';

/** The built app, served by `vite preview` on the one origin a recording's URLs name. `pnpm build` runs first. */
export function previewServer(env: Record<string, string> = {}) {
  return {
    command: `pnpm exec vite preview --host 127.0.0.1 --port ${PREVIEW_PORT} --strictPort`,
    cwd: '..',
    url: PREVIEW_ORIGIN,
    reuseExistingServer: false,
    timeout: 60_000,
    env,
  };
}
