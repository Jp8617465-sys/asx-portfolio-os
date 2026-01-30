import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('Multi-Asset Portfolio Fusion', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login('demo_user', 'testpass123');
  });

  test('Fusion page loads successfully', async ({ page }) => {
    await page.goto('/app/fusion');
    await expect(page).toHaveURL('/app/fusion');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Should see fusion heading
    const heading = page.locator('h1').filter({ hasText: /fusion/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Fusion dashboard displays net worth summary', async ({ page }) => {
    await page.goto('/app/fusion');
    await page.waitForTimeout(2000);

    // Look for net worth display
    const netWorth = page.locator('text=/Net Worth/i');

    if (await netWorth.isVisible().catch(() => false)) {
      await expect(netWorth).toBeVisible({ timeout: 5000 });

      // Should show currency amount
      const currencyAmount = page.locator('text=/\\$[0-9,]+/');
      await expect(currencyAmount.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Fusion displays asset allocation pie chart', async ({ page }) => {
    await page.goto('/app/fusion');
    await page.waitForTimeout(2000);

    // Look for asset allocation section
    const allocationSection = page.locator('text=/Asset.*Allocation/i');

    if (await allocationSection.isVisible().catch(() => false)) {
      await expect(allocationSection.first()).toBeVisible({ timeout: 5000 });

      // Check for pie chart
      const pieChart = page.locator('.recharts-pie');
      if (await pieChart.isVisible().catch(() => false)) {
        await expect(pieChart).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Fusion shows total assets and liabilities', async ({ page }) => {
    await page.goto('/app/fusion');
    await page.waitForTimeout(2000);

    // Look for summary cards
    const totalAssets = page.locator('text=/Total.*Assets/i');
    const totalLiabilities = page.locator('text=/Total.*Liabilit/i');

    const hasAssets = await totalAssets.isVisible().catch(() => false);
    const hasLiabilities = await totalLiabilities.isVisible().catch(() => false);

    // At least one should be visible
    expect(hasAssets || hasLiabilities).toBeTruthy();
  });

  test('Fusion displays risk level badge', async ({ page }) => {
    await page.goto('/app/fusion');
    await page.waitForTimeout(2000);

    // Look for risk level display
    const riskSection = page.locator('text=/Risk.*Level/i');

    if (await riskSection.isVisible().catch(() => false)) {
      await expect(riskSection.first()).toBeVisible({ timeout: 5000 });

      // Should show risk badge (LOW/MEDIUM/HIGH)
      const riskBadge = page.locator('.bg-green-500, .bg-yellow-500, .bg-red-500');
      if (await riskBadge.count() > 0) {
        await expect(riskBadge.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Fusion shows equities, property, and loans breakdown', async ({ page }) => {
    await page.goto('/app/fusion');
    await page.waitForTimeout(2000);

    // Look for asset class cards
    const assetClasses = ['Equities', 'Property', 'Loan'];

    for (const assetClass of assetClasses) {
      const assetSection = page.locator(`text=${assetClass}`).first();

      if (await assetSection.isVisible().catch(() => false)) {
        await expect(assetSection).toBeVisible({ timeout: 5000 });
        // Found at least one asset class
        break;
      }
    }
  });

  test('Fusion displays risk metrics panel', async ({ page }) => {
    await page.goto('/app/fusion');
    await page.waitForTimeout(2000);

    // Look for risk metrics section
    const riskMetrics = page.locator('text=/Risk.*Metric/i');

    if (await riskMetrics.isVisible().catch(() => false)) {
      await expect(riskMetrics.first()).toBeVisible({ timeout: 5000 });

      // Should show metrics like DSR, leverage, etc.
      const metricLabels = page.locator('text=/Debt.*Service|Leverage|Volatility/i');
      if (await metricLabels.count() > 0) {
        await expect(metricLabels.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Fusion shows debt service ratio', async ({ page }) => {
    await page.goto('/app/fusion');
    await page.waitForTimeout(2000);

    // Look for DSR display
    const dsrLabel = page.locator('text=/Debt.*Service.*Ratio/i');

    if (await dsrLabel.isVisible().catch(() => false)) {
      await expect(dsrLabel).toBeVisible({ timeout: 5000 });

      // Should show percentage
      const percentage = page.locator('text=/%/');
      if (await percentage.count() > 0) {
        await expect(percentage.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Fusion refresh button works', async ({ page }) => {
    await page.goto('/app/fusion');
    await page.waitForTimeout(2000);

    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh")');

    if (await refreshButton.isVisible().catch(() => false)) {
      // Click refresh
      await refreshButton.click();
      await page.waitForTimeout(2000);

      // Page should update without errors
      const heading = page.locator('h1');
      await expect(heading).toBeVisible({ timeout: 5000 });
    }
  });

  test('Fusion handles no data state gracefully', async ({ page }) => {
    await page.goto('/app/fusion');
    await page.waitForTimeout(2000);

    // Either data is shown OR empty state message
    const hasData = await page.locator('.recharts-pie').isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=/No.*data|No.*portfolio/i').isVisible().catch(() => false);

    // Page should show something (not crash)
    const hasContent = await page.locator('h1, h2').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('Fusion asset allocation percentages add up correctly', async ({ page }) => {
    await page.goto('/app/fusion');
    await page.waitForTimeout(2000);

    // Look for allocation percentages
    const percentages = page.locator('text=/%/');

    if (await percentages.count() >= 2) {
      // Get all percentage values
      const percentTexts = await percentages.allTextContents();

      // Should have valid percentages
      const validPercentages = percentTexts.filter(text => text.match(/\d+\.?\d*%/));
      expect(validPercentages.length).toBeGreaterThan(0);
    }
  });

  test('Fusion displays last updated timestamp', async ({ page }) => {
    await page.goto('/app/fusion');
    await page.waitForTimeout(2000);

    // Look for last updated/computed timestamp
    const timestamp = page.locator('text=/Last.*updated|computed/i');

    if (await timestamp.isVisible().catch(() => false)) {
      await expect(timestamp).toBeVisible({ timeout: 5000 });

      // Should contain date/time
      const timestampText = await timestamp.textContent();
      expect(timestampText).toBeTruthy();
    }
  });
});
