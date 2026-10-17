import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import packageJson from './package.json' with { type: 'json' };
import vercelConfig from './vercel.json' with { type: 'json' };

// The preview server sends the deploy's site-wide headers (CSP, Permissions-Policy...), so the
// Playwright suite runs under the same policy as production.
const deployHeaders = Object.fromEntries(
  (vercelConfig.headers.find((rule) => rule.source === '/(.*)')?.headers ?? []).map(({ key, value }) => [
    key,
    value
  ])
);

// Footer meta line (A.9): version from the manifest, short commit only on Vercel builds.
const commitSha = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7);

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __COMMIT_SHA__: JSON.stringify(commitSha)
  },
  server: {
    port: 3000,
    host: 'localhost',
    proxy: {
      '/api/v1': {
        target: 'http://localhost:3333',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    // Host used by the Playwright suite (playwright.config.ts) to mimic the static deploy.
    allowedHosts: ['shadow-dojo.test'],
    headers: deployHeaders
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.')
    }
  },
  test: {
    // server/dist holds compiled copies of the server code (npm run build:server).
    exclude: [...configDefaults.exclude, 'server/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      // The pure domain: engine, rules, history, sharing, leaderboard and the ranking server.
      include: ['lib/**/*.ts', 'services/leaderboardService.ts', 'server/src/domain/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text-summary', 'html'],
      // Floor just under today's numbers, so coverage can only go up.
      thresholds: { statements: 80, branches: 75, functions: 75, lines: 80 }
    }
  }
});
