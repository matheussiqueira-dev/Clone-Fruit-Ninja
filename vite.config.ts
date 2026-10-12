/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import packageJson from './package.json';

// Footer meta line (A.9): version from the manifest, short commit only on Vercel builds.
const commitSha = (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7);

export default defineConfig(() => {
    return {
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
        allowedHosts: ['shadow-dojo.test']
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      test: {
        // server/dist holds compiled copies of the server code (npm run build:server).
        exclude: [...configDefaults.exclude, 'server/dist/**', 'e2e/**']
      }
    };
});
