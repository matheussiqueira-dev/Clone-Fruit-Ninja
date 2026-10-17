import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { seedRandom, stageBox, startPointerGame } from './helpers';

const WIDTHS = [320, 768, 1280];

const seriousViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`
    );
};

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 720 } });

    test('menu has no serious accessibility issues, no horizontal overflow and a reachable start button', async ({
      page
    }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { level: 1, name: 'Shadow Dojo' })).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);

      const start = page.getByRole('button', { name: 'Ativar câmera' });
      await start.scrollIntoViewIfNeeded();
      await expect(start).toBeInViewport();
    });

    test('game over has no serious accessibility issues', async ({ page }) => {
      await seedRandom(page);
      await startPointerGame(page);
      const stage = await stageBox(page);
      await page.mouse.move(stage.x + 2, stage.y + 2);
      await expect(page.getByRole('heading', { level: 1, name: 'Fim de jogo' })).toBeVisible({
        timeout: 30_000
      });
      expect(await seriousViolations(page)).toEqual([]);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
    });
  });
}

// Twelve stored rounds so the performance view shows KPIs, the chart and the trend headline.
const seedHistory = async (page: Page) => {
  await page.addInitScript(() => {
    const runs = Array.from({ length: 12 }, (_, i) => ({
      id: `seed-${i}`,
      at: new Date(Date.UTC(2026, 9, 1 + i, 12)).toISOString(),
      score: 10 + i * 4,
      accuracy: 60 + i,
      maxCombo: 1 + (i % 5),
      sliced: 10 + i,
      missed: 3,
      inputMode: i % 2 ? 'camera' : 'pointer',
      mode: i % 3 ? 'free' : 'daily',
      ...(i % 3 ? {} : { day: `2026-10-${String(1 + i).padStart(2, '0')}` }),
      reason: 'lives'
    }));
    window.localStorage.setItem('fruit-ninja:history', JSON.stringify(runs));
  });
};

for (const width of WIDTHS) {
  test.describe(`${width}px performance view`, () => {
    test.use({ viewport: { width, height: 720 } });

    test('has no serious accessibility issues with the chart and the table open', async ({ page }) => {
      await seedHistory(page);
      await page.goto('/#desempenho');
      await expect(page.getByRole('heading', { level: 1, name: 'Seu desempenho' })).toBeVisible();
      await expect(
        page.getByRole('heading', { level: 2, name: /Sua média subiu \d+% nas últimas 5 partidas/ })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Ver dados em tabela' }).click();
      expect(await seriousViolations(page)).toEqual([]);
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
    });
  });
}
