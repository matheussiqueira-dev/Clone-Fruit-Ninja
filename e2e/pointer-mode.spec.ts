import { expect, test } from '@playwright/test';
import { readHudScore, seedRandom, stageBox, startPointerGame } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedRandom(page);
});

test('menu says where results are saved and shows the author footer once', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Shadow Dojo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Seus melhores resultados' })).toBeVisible();
  await expect(page.getByText('Salvo neste navegador.')).toBeVisible();
  await expect(page.getByText('Ranking global')).toHaveCount(0);
  await expect(page.getByText('Desenvolvido por Matheus Siqueira', { exact: true })).toHaveCount(1);
});

test('pointer mode starts a game with the HUD and keeps the stage above the footer', async ({ page }) => {
  await startPointerGame(page);
  await expect(page.getByText('Combo', { exact: true })).toBeVisible();
  await expect(page.getByText('Vidas', { exact: true })).toBeVisible();

  const stage = await stageBox(page);
  const footer = await page.locator('footer').boundingBox();
  expect(footer).not.toBeNull();
  expect(stage.y + stage.height).toBeLessThanOrEqual((footer?.y ?? 0) + 1);
  await expect(page.getByText('Desenvolvido por Matheus Siqueira', { exact: true })).toHaveCount(1);
});

test('a resting cursor never slices, so the game ends by dropped fruit', async ({ page }) => {
  await startPointerGame(page);
  const stage = await stageBox(page);
  // Park the cursor in the middle of the stage, where fruit passes, and do not move it.
  await page.mouse.move(stage.x + stage.width / 2, stage.y + stage.height / 2);

  await expect(page.getByRole('heading', { level: 1, name: 'Fim de jogo' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Três frutas caíram no chão.')).toBeVisible();
  await expect(page.locator('dt:text-is("Pontuação") + dd')).toHaveText('0');
});

test('a zero score saved without a name is listed as "Ninja"', async ({ page }) => {
  await startPointerGame(page);
  const stage = await stageBox(page);
  await page.mouse.move(stage.x + 2, stage.y + 2);
  await expect(page.getByRole('heading', { level: 1, name: 'Fim de jogo' })).toBeVisible({ timeout: 30_000 });

  await page.getByLabel('Nome no ranking').fill('   ');
  await page.getByRole('button', { name: 'Salvar resultado' }).click();
  await expect(page.getByText('Resultado salvo neste navegador.')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Ninja' })).toBeVisible();
});

test('the name field stops at 24 characters', async ({ page }) => {
  await startPointerGame(page);
  const stage = await stageBox(page);
  await page.mouse.move(stage.x + 2, stage.y + 2);
  await expect(page.getByRole('heading', { level: 1, name: 'Fim de jogo' })).toBeVisible({ timeout: 30_000 });

  const field = page.getByLabel('Nome no ranking');
  await field.fill('');
  await field.pressSequentially('x'.repeat(30));
  await expect(field).toHaveValue('x'.repeat(24));
});

test('swiping slices fruit and the result is saved in this browser', async ({ page }) => {
  await startPointerGame(page);
  const stage = await stageBox(page);
  const left = stage.x + 20;
  const right = stage.x + stage.width - 20;

  let score = 0;
  const deadline = Date.now() + 20_000;
  for (let row = 0; Date.now() < deadline && score === 0; row++) {
    if (await page.getByRole('heading', { name: 'Fim de jogo' }).isVisible()) break;
    const y = stage.y + stage.height * (0.25 + (row % 4) * 0.15);
    await page.mouse.move(row % 2 ? right : left, y);
    await page.mouse.move(row % 2 ? left : right, y, { steps: 12 });
    if (await page.getByText('Pontuação', { exact: true }).isVisible()) {
      score = await readHudScore(page);
    }
  }

  await expect(page.getByRole('heading', { level: 1, name: 'Fim de jogo' })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('dt:text-is("Pontuação") + dd')).not.toHaveText('0');

  await page.getByLabel('Nome no ranking').fill('Playwright');
  await page.getByRole('button', { name: 'Salvar resultado' }).click();
  await expect(page.getByText('Resultado salvo neste navegador.')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'Playwright' })).toBeVisible();
});

test('a one-letter name asks for at least two characters and a saved result cannot be saved twice', async ({
  page
}) => {
  await startPointerGame(page);
  const stage = await stageBox(page);
  await page.mouse.move(stage.x + 2, stage.y + 2);
  await expect(page.getByRole('heading', { level: 1, name: 'Fim de jogo' })).toBeVisible({ timeout: 30_000 });

  const field = page.getByLabel('Nome no ranking');
  await field.fill('A');
  await page.getByRole('button', { name: 'Salvar resultado' }).click();
  await expect(page.getByText('Use pelo menos 2 caracteres ou deixe o campo vazio.')).toBeVisible();
  await expect(field).toHaveAttribute('aria-invalid', 'true');

  await field.fill('Ana');
  await page.getByRole('button', { name: 'Salvar resultado' }).click();
  await expect(page.getByText('Resultado salvo neste navegador.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resultado salvo' })).toBeDisabled();
  await expect(page.getByRole('listitem').filter({ hasText: 'Ana' })).toHaveCount(1);
});

test('opening Ajustes pauses the round', async ({ page }) => {
  await startPointerGame(page);
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeVisible();
  // Long enough for unsliced fruit to fall three times if the round kept running.
  await page.waitForTimeout(8_000);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Ajustes' })).toBeHidden();
  await expect(page.getByText('3 de 3')).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Fim de jogo' })).toHaveCount(0);
});
