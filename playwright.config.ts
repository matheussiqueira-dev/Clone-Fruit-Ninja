import { defineConfig, devices } from '@playwright/test';

const PORT = 4190;
// Not exactly "localhost", so the app behaves like the static deploy (no ranking API, results in the
// browser). A *.localhost name is still a secure context in every Chromium build, headless shell
// included, so getUserMedia and service workers exist without command-line flags.
const HOST = 'shadow-dojo.localhost';
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: isCI ? 1 : 0,
  reporter: isCI ? 'github' : 'list',
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: {
      // The preview server listens on 127.0.0.1 only; never let the name resolve to ::1.
      args: [`--host-resolver-rules=MAP ${HOST} 127.0.0.1`]
    }
  },
  projects: [
    {
      // This machine's App Control blocks the downloaded Chromium: use the installed Edge locally.
      name: isCI ? 'chromium' : 'msedge',
      use: { ...devices['Desktop Chrome'], ...(isCI ? {} : { channel: 'msedge' }) }
    }
  ],
  webServer: {
    command: `npm run build && npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000
  }
});
