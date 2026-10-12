import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { seedRandom, stageBox, startPointerGame } from './helpers';

const WIDTHS = [320, 768, 1280];

const seriousViolations = async (page: Page) => {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`);
};

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 720 } });

    test('menu has no serious accessibility issues, no horizontal overflow and a reachable start button', async ({ page }) => {
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
      await expect(page.getByRole('heading', { level: 1, name: 'Fim de jogo' })).toBeVisible({ timeout: 30_000 });
      expect(await seriousViolations(page)).toEqual([]);

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
    });
  });
}
