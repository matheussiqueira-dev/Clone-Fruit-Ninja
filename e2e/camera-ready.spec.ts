import { expect, test } from '@playwright/test';
import { installFakeCamera } from './helpers';

// Same budget as the camera error tests: loading the hand model on a busy machine is slow.
const CAMERA_SETUP_TIMEOUT = 60_000;
test.describe.configure({ timeout: 90_000 });

// The happy path: the real WASM runtime and hand model load under the deploy's CSP, a synthetic camera
// (an animated canvas stream) opens, and a round runs with the tracker processing frames without errors.
test('camera mode loads the hand model, opens the camera and plays a round', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await installFakeCamera(page);

  await page.goto('/');
  await page.getByLabel(/^Câmera/).check();
  // Once the camera is ready the round starts by itself.
  await page.getByRole('button', { name: 'Ativar câmera' }).click();
  await expect(page.getByText('Pontuação', { exact: true })).toBeVisible({ timeout: CAMERA_SETUP_TIMEOUT });
  await expect(page.getByRole('alert')).toHaveCount(0);
  // Let the tracker run on a few hundred frames: a runtime/model mismatch or a CSP block throws here.
  await page.waitForTimeout(3_000);
  expect(errors).toEqual([]);
});
