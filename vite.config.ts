/// <reference types="vitest/config" />
import path from 'path';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
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
