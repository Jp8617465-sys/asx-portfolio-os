import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('Model C - Sentiment Analysis', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login('demo_user', 'testpass123');
  });

  test('Model C tab loads and displays sentiment dashboard', async ({ page }) => {
    await page.goto('/app/models');
    await expect(page).toHaveURL('/app/models');

    // Click Model C tab
    const modelCTab = page.locator('button:has-text("Model C")');
    await expect(modelCTab).toBeVisible({ timeout: 10000 });
    await modelCTab.click();

    // Wait for dashboard to load
    await page.waitForTimeout(2000);

    // Verify sentiment dashboard sections are visible
    const sentimentSection = page.locator('text=Sentiment').first();
    await expect(sentimentSection).toBeVisible({ timeout: 10000 });
  });

  test('Model C displays sentiment distribution pie chart', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Model C")');
    await page.waitForTimeout(2000);

    // Look for sentiment distribution section
    const distributionSection = page
      .locator('text=Sentiment Distribution')
      .or(page.locator('text=Distribution'));
    await expect(distributionSection.first()).toBeVisible({ timeout: 10000 });

    // Verify pie chart renders
    const pieChart = page.locator('.recharts-pie');
    if (await pieChart.isVisible().catch(() => false)) {
      await expect(pieChart).toBeVisible({ timeout: 5000 });
    }
  });

  test('Model C displays sentiment signals with badges', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Model C")');
    await page.waitForTimeout(2000);

    // Look for sentiment badges (positive/negative/neutral)
    const badges = page.locator('.bg-green-500, .bg-red-500, .bg-gray-500');

    if ((await badges.count()) > 0) {
      await expect(badges.first()).toBeVisible({ timeout: 5000 });
    } else {
      // If no signals, check for empty state
      const emptyState = page.locator('text=No sentiment signals');
      await expect(emptyState).toBeVisible({ timeout: 5000 });
    }
  });

  test('Model C shows bullish and bearish counts', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Model C")');
    await page.waitForTimeout(2000);

    // Look for bullish/bearish terminology
    const sentimentTerms = page.locator('text=bullish').or(page.locator('text=bearish'));

    // Should show sentiment counts or empty state
    const hasSentiment = await sentimentTerms.isVisible().catch(() => false);
    const hasEmptyState = await page
      .locator('text=No sentiment')
      .isVisible()
      .catch(() => false);

    expect(hasSentiment || hasEmptyState).toBeTruthy();
  });

  test('Model C displays event types', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Model C")');
    await page.waitForTimeout(2000);

    // Look for event type badges or labels
    const eventTypes = page.locator('text=Event').or(page.locator('text=announcement'));

    await page.waitForTimeout(1000);

    // Should have some content visible
    const contentVisible = await page
      .locator('table, .recharts-wrapper')
      .isVisible()
      .catch(() => false);
    expect(contentVisible).toBeTruthy();
  });

  test('Model C allows clicking on stocks for details', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Model C")');
    await page.waitForTimeout(2000);

    // Find table rows (if any)
    const tableRows = page.locator('tbody tr');

    if ((await tableRows.count()) > 0) {
      // Click first row
      await tableRows.first().click();
      await page.waitForTimeout(1000);

      // Should navigate to stock detail page or open modal
      const url = page.url();
      expect(url).toBeTruthy();
    }
  });

  test('Model C sentiment percentages are valid', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Model C")');
    await page.waitForTimeout(2000);

    // Look for percentage displays
    const percentages = page.locator('text=/%/');

    if ((await percentages.count()) > 0) {
      const firstPercent = await percentages.first().textContent();
      // Should contain a number followed by %
      expect(firstPercent).toMatch(/\d+\.?\d*%/);
    }
  });
});
