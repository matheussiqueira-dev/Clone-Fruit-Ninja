import { expect, test, type Page } from '@playwright/test';

// Loading the hand model (WASM + 7.8 MB task file) can take a while on a cold cache.
const CAMERA_SETUP_TIMEOUT = 30_000;

// getUserMedia is replaced before the app loads, so each failure is reproducible without a real device.
// window.__cameraRequested records whether the app ever asked for the camera.
const rejectCamera = async (page: Page, errorName: string) => {
  await page.addInitScript((name) => {
    const flag = window as unknown as { __cameraRequested: boolean };
    flag.__cameraRequested = false;
    if (!navigator.mediaDevices) return;
    navigator.mediaDevices.getUserMedia = () => {
      flag.__cameraRequested = true;
      return Promise.reject(new DOMException('simulated', name));
    };
  }, errorName);
};

const activateCamera = async (page: Page) => {
  await page.goto('/');
  await page.getByLabel(/^Câmera/).check();
  await page.getByRole('button', { name: 'Ativar câmera' }).click();
};

const expectAlert = async (page: Page, message: string) => {
  await expect(page.getByRole('alert')).toContainText(message, { timeout: CAMERA_SETUP_TIMEOUT });
};

test('a denied permission explains how to unblock and offers the mouse', async ({ page }) => {
  await rejectCamera(page, 'NotAllowedError');
  await activateCamera(page);
  await expectAlert(page, 'A câmera foi bloqueada. Libere o acesso no ícone do cadeado ou jogue com o mouse.');

  await page.getByRole('alert').getByRole('button', { name: 'Jogar com o mouse' }).click();
  await expect(page.getByLabel(/^Mouse/)).toBeChecked();
  await expect(page.getByRole('button', { name: 'Começar' })).toBeVisible();
});

test('a missing camera has its own message', async ({ page }) => {
  await rejectCamera(page, 'NotFoundError');
  await activateCamera(page);
  await expectAlert(page, 'Nenhuma câmera encontrada. O modo mouse está disponível.');
});

test('an unrecognised camera error still gets a generic, actionable message', async ({ page }) => {
  await rejectCamera(page, 'SomethingUnexpectedError');
  await activateCamera(page);
  await expectAlert(page, 'Não foi possível abrir a câmera. Tente de novo ou jogue com o mouse.');
});

test('a page without camera access (e.g. plain http on a LAN) says so and keeps the mouse', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  });
  await activateCamera(page);
  await expectAlert(page, 'Este navegador não dá acesso à câmera nesta página. O modo mouse está disponível.');
});

test('a hand model that fails to load never asks for the camera', async ({ page }) => {
  await rejectCamera(page, 'NotAllowedError');
  await page.route('**/vision/models/hand_landmarker.task', (route) => route.abort());
  await activateCamera(page);

  await expectAlert(page, 'Não foi possível carregar o modelo da mão. Verifique a conexão e tente de novo.');
  expect(await page.evaluate(() => (window as unknown as { __cameraRequested: boolean }).__cameraRequested)).toBe(false);
});
