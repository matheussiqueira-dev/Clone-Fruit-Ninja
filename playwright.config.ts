import { defineConfig, devices } from '@playwright/test';

const PORT = 4190;
// A non-localhost name makes the app behave like the static deploy (no ranking API, results in the browser).
const HOST = 'shadow-dojo.test';
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
      args: [
        `--host-resolver-rules=MAP ${HOST} 127.0.0.1`,
        // getUserMedia only exists in secure contexts; treat the test origin like the HTTPS deploy.
        `--unsafely-treat-insecure-origin-as-secure=http://${HOST}:${PORT}`
      ]
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
