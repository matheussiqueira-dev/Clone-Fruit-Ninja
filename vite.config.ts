import path from 'node:path';
import { configDefaults, defineConfig } from 'vitest/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
// The package's exports map hides package.json, so read the installed copy by path.
import visionPackage from './node_modules/@mediapipe/tasks-vision/package.json' with { type: 'json' };
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

// Camera-mode assets (WASM runtime, hand model and the lazy visionService chunk) are cached on first
// use, never precached, so mouse-only players never download them. The cache name carries the
// installed MediaPipe version: an upgrade starts a fresh cache instead of pairing old WASM with new JS.
const VISION_CACHE = `vision-assets-${visionPackage.version}`;
const VISION_CLEANUP_SCRIPT = 'sw-vision-cleanup.js';

// Imported by the generated service worker: on activation, drops vision caches left by older versions.
const visionCacheCleanup = (): Plugin => ({
  name: 'shadow-dojo:vision-cache-cleanup',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: VISION_CLEANUP_SCRIPT,
      source: `self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('vision-assets-') && key !== ${JSON.stringify(VISION_CACHE)})
          .map((key) => caches.delete(key))
      )
    )
  );
});
`
    });
  }
});

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
  plugins: [
    react(),
    tailwindcss(),
    visionCacheCleanup(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registers through a same-origin script (registerSW.js), which the CSP's script-src 'self' allows.
      injectRegister: 'script',
      // favicon.svg is already in the shell glob below.
      includeManifestIcons: false,
      manifest: {
        id: '/',
        name: 'Shadow Dojo',
        short_name: 'Shadow Dojo',
        description: 'Jogo de corte no navegador: corte frutas com o dedo diante da webcam ou com o mouse.',
        lang: 'pt-BR',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0b0d10',
        theme_color: '#0b0d10',
        categories: ['games'],
        // No PNG icons in the repo yet: the SVG favicon scales to any size.
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
      },
      workbox: {
        // App shell only.
        globPatterns: ['**/*.{js,css,html,woff2,svg}'],
        globIgnores: ['vision/**', 'assets/visionService-*.js', VISION_CLEANUP_SCRIPT],
        importScripts: [`/${VISION_CLEANUP_SCRIPT}`],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // Control the first visit too, so a camera session on that visit already fills the vision cache.
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin &&
              (url.pathname.startsWith('/vision/') ||
                /^\/assets\/visionService-[\w-]+\.js$/.test(url.pathname)),
            handler: 'CacheFirst',
            options: {
              cacheName: VISION_CACHE,
              // Two WASM variants (+ loaders), the model and the chunk, with room to spare.
              expiration: { maxEntries: 8 },
              cacheableResponse: { statuses: [200] }
            }
          }
        ]
      }
    })
  ],
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
