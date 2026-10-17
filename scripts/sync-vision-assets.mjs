// Copies the MediaPipe WASM runtime from node_modules into public/vision/wasm, so the runtime the site
// serves always matches the installed @mediapipe/tasks-vision JS (a mismatch fails at model load).
// Run with: npm run sync:vision (after changing the @mediapipe/tasks-vision version).
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The files FilesetResolver.forVisionTasks loads; the ES-module variants are not used here.
const VISION_WASM_FILES = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

// The package's exports map hides package.json, so resolve it from the project root.
const packageDir = fileURLToPath(new URL('../node_modules/@mediapipe/tasks-vision/', import.meta.url));
const target = fileURLToPath(new URL('../public/vision/wasm/', import.meta.url));

mkdirSync(target, { recursive: true });
for (const file of VISION_WASM_FILES) {
  copyFileSync(join(packageDir, 'wasm', file), join(target, file));
}
console.log(`sync-vision-assets: copied ${VISION_WASM_FILES.length} files to public/vision/wasm`);
