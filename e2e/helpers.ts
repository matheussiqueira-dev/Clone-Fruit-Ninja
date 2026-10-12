import { expect, type Page } from '@playwright/test';

// Deterministic fruit spawns: replaces Math.random with a small LCG before the app loads.
export const seedRandom = async (page: Page, seed = 7) => {
  await page.addInitScript((initialSeed) => {
    let state = initialSeed;
    Math.random = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }, seed);
};

export const startPointerGame = async (page: Page) => {
  await page.goto('/');
  await page.getByLabel(/^Mouse/).check();
  await page.getByRole('button', { name: 'Começar' }).click();
  await expect(page.getByText('Pontuação', { exact: true })).toBeVisible();
};

export const stageBox = async (page: Page) => {
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Game canvas is not rendered.');
  return box;
};

export const readHudScore = async (page: Page) => {
  const text = await page.locator('dt:text-is("Pontuação") + dd').innerText();
  return Number(text.replace(/\D/g, ''));
};
