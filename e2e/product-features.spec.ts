import { expect, test } from '@playwright/test';
import { seedRandom, stageBox } from './helpers';

const finishPointerRound = async (page: import('@playwright/test').Page) => {
  await page.getByLabel(/^Mouse/).check();
  await page.getByRole('button', { name: 'Começar' }).click();
  await expect(page.getByText('Pontuação', { exact: true })).toBeVisible();
  const stage = await stageBox(page);
  await page.mouse.move(stage.x + 2, stage.y + 2);
  await expect(page.getByRole('heading', { level: 1, name: 'Fim de jogo' })).toBeVisible({ timeout: 30_000 });
};

const dayLabel = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

test.beforeEach(async ({ page }) => {
  await seedRandom(page);
});

test("a shared challenge link opens that day's challenge, and the round is labelled with it", async ({
  page
}) => {
  await page.goto('/?desafio=2026-01-05');
  await expect(page.getByLabel(/^Desafio de 05\/01/)).toBeChecked();
  await finishPointerRound(page);
  await expect(page.getByText(/Desafio de 05\/01 · seu melhor neste desafio: 0/)).toBeVisible();
});

test('a challenge link from the future falls back to today', async ({ page }) => {
  const today = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  await page.goto('/?desafio=2999-12-31');
  await expect(
    page.getByLabel(new RegExp(`^Desafio de ${dayLabel(today).replace('/', '\\/')}`))
  ).toBeChecked();
});

test('finished rounds feed the performance view, with a table alternative to the chart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Seu desempenho' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Seu desempenho' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Nenhuma partida ainda' })).toBeVisible();
  await expect(page).toHaveURL(/#desempenho$/);

  await page.getByRole('button', { name: 'Voltar ao menu' }).click();
  await finishPointerRound(page);
  await page.getByRole('button', { name: 'Seu desempenho' }).click();
  await expect(page).toHaveURL(/#desempenho$/);

  await expect(page.getByRole('heading', { level: 1, name: 'Seu desempenho' })).toBeVisible();
  await expect(page.locator('dt:text-is("Partidas") + dd')).toHaveText('1');
  await expect(page.getByRole('img', { name: /Gráfico de pontos nas últimas 1 partidas/ })).toBeVisible();

  await page.getByRole('button', { name: 'Ver dados em tabela' }).click();
  const table = page.getByRole('table', { name: 'Partidas mais recentes' });
  await expect(table.getByRole('row')).toHaveCount(2);
  await expect(table).toContainText('Livre · Mouse');
});

test('sharing copies the result and a link when the device has no share sheet', async ({ page }) => {
  // Clipboard and share APIs only exist in secure contexts, which some headless builds deny to the
  // http test origin; provide both so only the app's own fallback logic is under test.
  await page.addInitScript(() => {
    const store = window as unknown as { __copied: string | null };
    store.__copied = null;
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: (text: string) => {
          store.__copied = text;
          return Promise.resolve();
        }
      },
      configurable: true
    });
  });
  await page.goto('/');
  await finishPointerRound(page);
  await page.getByRole('button', { name: 'Compartilhar' }).click();
  await expect(page.getByText('Resultado e link copiados.')).toBeVisible();
  const copied = await page.evaluate(() => (window as unknown as { __copied: string | null }).__copied);
  expect(copied).toMatch(
    /^Fiz 0 pontos no Shadow Dojo \(0% de precisão, combo x1\)\. Consegue me vencer\? http:\/\/shadow-dojo\.test:4190\/$/
  );
});
