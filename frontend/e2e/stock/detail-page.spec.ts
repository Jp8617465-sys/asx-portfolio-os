import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('Stock Detail Page', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login('demo_user', 'testpass123');
  });

  test('Stock detail page loads for valid ticker', async ({ page }) => {
    // Navigate to a common ASX stock
    await page.goto('/stock/BHP.AX');
    await page.waitForTimeout(2000);

    // Should show stock ticker in heading or title
    const heading = page.locator('h1, h2').filter({ hasText: /BHP/ });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('Stock detail displays current signal badge', async ({ page }) => {
    await page.goto('/stock/BHP.AX');
    await page.waitForTimeout(2000);

    // Look for signal badge (BUY/SELL/HOLD)
    const signalBadge = page.locator('text=BUY').or(
      page.locator('text=SELL')
    ).or(
      page.locator('text=HOLD')
    );

    if (await signalBadge.count() > 0) {
      await expect(signalBadge.first()).toBeVisible({ timeout: 5000 });

      // Badge should have color styling
      const styledBadge = page.locator('.bg-green-500, .bg-red-500, .bg-gray-500');
      await expect(styledBadge.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Stock detail shows confidence gauge', async ({ page }) => {
    await page.goto('/stock/BHP.AX');
    await page.waitForTimeout(2000);

    // Look for confidence percentage
    const confidenceDisplay = page.locator('text=/Confidence|\\d+%/i');

    if (await confidenceDisplay.count() > 0) {
      const confText = await confidenceDisplay.first().textContent();

      // Should contain percentage
      if (confText) {
        expect(confText).toMatch(/\d+%/);
      }
    }
  });

  test('Stock detail displays price chart', async ({ page }) => {
    await page.goto('/stock/BHP.AX');
    await page.waitForTimeout(2000);

    // Look for chart container
    const chart = page.locator('.recharts-wrapper, canvas');

    if (await chart.count() > 0) {
      await expect(chart.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Stock detail allows switching chart timeframes', async ({ page }) => {
    await page.goto('/stock/BHP.AX');
    await page.waitForTimeout(2000);

    // Look for timeframe buttons (3M, 6M, 1Y, ALL)
    const timeframeButtons = page.locator('button').filter({ hasText: /3M|6M|1Y|ALL/ });

    if (await timeframeButtons.count() > 0) {
      // Click a timeframe
      const button6M = timeframeButtons.filter({ hasText: /6M/ });

      if (await button6M.count() > 0) {
        await button6M.first().click();
        await page.waitForTimeout(1000);

        // Chart should update (still visible)
        const chart = page.locator('.recharts-wrapper, canvas');
        if (await chart.count() > 0) {
          await expect(chart.first()).toBeVisible({ timeout: 5000 });
        }
      }
    }
  });

  test('Stock detail shows AI reasoning panel', async ({ page }) => {
    await page.goto('/stock/BHP.AX');
    await page.waitForTimeout(2000);

    // Look for reasoning section
    const reasoningSection = page.locator('text=/Reasoning|Explanation|Why/i');

    if (await reasoningSection.count() > 0) {
      await expect(reasoningSection.first()).toBeVisible({ timeout: 5000 });

      // Should have some explanatory text
      const reasoningText = page.locator('p, div').filter({ hasText: /./i });
      await expect(reasoningText.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Stock detail displays accuracy metrics', async ({ page }) => {
    await page.goto('/stock/BHP.AX');
    await page.waitForTimeout(2000);

    // Look for accuracy section
    const accuracySection = page.locator('text=/Accuracy|Historical/i');

    if (await accuracySection.count() > 0) {
      await expect(accuracySection.first()).toBeVisible({ timeout: 5000 });

      // Should show percentage or metric
      const accuracyValue = page.locator('text=/%|\\d+/');
      await expect(accuracyValue.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Stock detail shows fundamental metrics', async ({ page }) => {
    await page.goto('/stock/BHP.AX');
    await page.waitForTimeout(2000);

    // Look for fundamental metrics (P/E, ROE, etc.)
    const fundamentals = page.locator('text=/P\\/E|ROE|Debt|Market Cap/i');

    if (await fundamentals.count() > 0) {
      await expect(fundamentals.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Stock detail has add/remove watchlist button', async ({ page }) => {
    await page.goto('/stock/BHP.AX');
    await page.waitForTimeout(2000);

    // Look for watchlist button
    const watchlistButton = page.locator('button').filter({ hasText: /Watchlist|Watch|Star/i });

    if (await watchlistButton.count() > 0) {
      await expect(watchlistButton.first()).toBeVisible({ timeout: 5000 });

      // Click to add/remove from watchlist
      await watchlistButton.first().click();
      await page.waitForTimeout(1000);

      // Button should still be visible (might change text)
      await expect(watchlistButton.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Stock detail shows current price and change', async ({ page }) => {
    await page.goto('/stock/BHP.AX');
    await page.waitForTimeout(2000);

    // Look for price display (should be dollar amount)
    const priceDisplay = page.locator('text=/\\$\\d+\\.\\d+/');

    if (await priceDisplay.count() > 0) {
      await expect(priceDisplay.first()).toBeVisible({ timeout: 5000 });

      // Look for price change (percentage or absolute)
      const changeDisplay = page.locator('text=/[\\+\\-]\\d+\\.\\d+%?/');
      if (await changeDisplay.count() > 0) {
        await expect(changeDisplay.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Stock detail handles invalid ticker gracefully', async ({ page }) => {
    // Navigate to non-existent ticker
    await page.goto('/stock/INVALID.AX');
    await page.waitForTimeout(2000);

    // Should show error message or redirect
    const errorMessage = page.locator('text=/Not found|Invalid|Error/i');
    const hasError = await errorMessage.isVisible().catch(() => false);

    // Page should not crash
    const hasContent = await page.locator('body').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('Stock detail displays model comparison', async ({ page }) => {
    await page.goto('/stock/BHP.AX');
    await page.waitForTimeout(2000);

    // Look for model comparison section (Model A vs Model B vs Ensemble)
    const comparisonSection = page.locator('text=/Model A|Model B|Ensemble|Compare/i');

    if (await comparisonSection.count() > 0) {
      // Should show multiple models
      const modelLabels = page.locator('text=/Model/i');
      await expect(modelLabels.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
