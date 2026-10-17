import { expect, test, type Page } from '@playwright/test';
import { installFakeCamera, seedRandom, stageBox } from './helpers';

const CAMERA_SETUP_TIMEOUT = 60_000;
test.describe.configure({ timeout: 120_000 });

// First visit: wait until the service worker has precached the shell and controls the page.
const waitForServiceWorker = async (page: Page) => {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
};

const cacheNames = (page: Page) => page.evaluate(() => caches.keys());

test('after one online visit the menu loads offline, and mouse play never fetches the vision assets', async ({
  page,
  context
}) => {
  await seedRandom(page);
  const visionRequests: string[] = [];
  context.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/vision/')) visionRequests.push(request.url());
  });

  await page.goto('/');
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('region', { name: 'Shadow Dojo' })).toBeVisible();

  // A full mouse round offline: the shell is enough, nothing from /vision is requested or cached.
  await page.getByLabel(/^Mouse/).check();
  await page.getByRole('button', { name: 'Começar' }).click();
  await expect(page.getByText('Pontuação', { exact: true })).toBeVisible();
  const stage = await stageBox(page);
  await page.mouse.move(stage.x + 2, stage.y + 2);
  await expect(page.getByRole('heading', { level: 1, name: 'Fim de jogo' })).toBeVisible({ timeout: 30_000 });

  expect(visionRequests).toEqual([]);
  expect((await cacheNames(page)).filter((name) => name.startsWith('vision-assets-'))).toEqual([]);
});

test('after one online camera session, camera mode works offline from the versioned cache', async ({
  page,
  context
}) => {
  await installFakeCamera(page);
  const startCamera = async () => {
    await page.getByLabel(/^Câmera/).check();
    await page.getByRole('button', { name: 'Ativar câmera' }).click();
    await expect(page.getByText('Pontuação', { exact: true })).toBeVisible({ timeout: CAMERA_SETUP_TIMEOUT });
    await expect(page.getByRole('alert')).toHaveCount(0);
  };

  await page.goto('/');
  await waitForServiceWorker(page);
  await startCamera();
  // The cache name carries the installed MediaPipe version (see vite.config.ts).
  expect(await cacheNames(page)).toContainEqual(expect.stringMatching(/^vision-assets-\d+\.\d+\.\d+/));

  await context.setOffline(true);
  await page.reload();
  await startCamera();
});
