import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Same list as scripts/sync-vision-assets.mjs.
const FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

const fromRoot = (path: string) => fileURLToPath(new URL(`../${path}`, import.meta.url));
const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

describe('public/vision/wasm', () => {
  it.each(FILES)('%s matches the installed @mediapipe/tasks-vision (run npm run sync:vision)', (file) => {
    expect(sha256(fromRoot(`public/vision/wasm/${file}`))).toBe(
      sha256(fromRoot(`node_modules/@mediapipe/tasks-vision/wasm/${file}`)),
    );
  });
});
