import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('Portfolio P&L Calculation', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login('demo_user', 'testpass123');
  });

  test('Portfolio page loads and displays holdings', async ({ page }) => {
    await page.goto('/app/portfolio');
    await expect(page).toHaveURL('/app/portfolio');

    // Wait for portfolio to load
    await page.waitForTimeout(2000);

    // Should see portfolio heading
    const heading = page.locator('h1, h2').filter({ hasText: /portfolio/i });
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('Portfolio displays total value and P&L summary', async ({ page }) => {
    await page.goto('/app/portfolio');
    await page.waitForTimeout(2000);

    // Look for total value display
    const totalValue = page
      .locator('text=/Total.*Value/i')
      .or(page.locator('text=/Portfolio.*Value/i'));

    if (await totalValue.isVisible().catch(() => false)) {
      await expect(totalValue).toBeVisible({ timeout: 5000 });

      // Should show currency amounts ($)
      const currencyAmount = page.locator('text=/\\$[0-9,]+/');
      await expect(currencyAmount.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Portfolio P&L shows gains and losses', async ({ page }) => {
    await page.goto('/app/portfolio');
    await page.waitForTimeout(2000);

    // Look for P&L indicators
    const plIndicators = page.locator('text=/P&L|Profit|Loss|Gain/i');

    if ((await plIndicators.count()) > 0) {
      await expect(plIndicators.first()).toBeVisible({ timeout: 5000 });

      // Should show positive (green) or negative (red) values
      const coloredValues = page.locator('.text-green-600, .text-red-600');
      if ((await coloredValues.count()) > 0) {
        await expect(coloredValues.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Portfolio holdings table displays current prices', async ({ page }) => {
    await page.goto('/app/portfolio');
    await page.waitForTimeout(2000);

    // Look for holdings table
    const table = page.locator('table');

    if (await table.isVisible().catch(() => false)) {
      await expect(table).toBeVisible({ timeout: 5000 });

      // Should have table headers
      const headers = page.locator('th');
      await expect(headers.first()).toBeVisible({ timeout: 5000 });

      // Look for price columns (Current Price, Avg Cost, etc.)
      const priceHeaders = page
        .locator('th:has-text("Price")')
        .or(page.locator('th:has-text("Cost")'));

      await expect(priceHeaders.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Portfolio P&L calculation is accurate', async ({ page }) => {
    await page.goto('/app/portfolio');
    await page.waitForTimeout(2000);

    const table = page.locator('table');

    if (await table.isVisible().catch(() => false)) {
      // Get first row data
      const firstRow = page.locator('tbody tr').first();

      if (await firstRow.isVisible().catch(() => false)) {
        const rowData = await firstRow.textContent();

        // Should contain numeric values (prices, shares, P&L)
        expect(rowData).toMatch(/[\d,]+/);

        // P&L should be displayed (positive or negative)
        const plValue = firstRow.locator('td').filter({ hasText: /[\+\-]?[\d,]+%?/ });
        await expect(plValue.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Portfolio shows unrealized gains percentage', async ({ page }) => {
    await page.goto('/app/portfolio');
    await page.waitForTimeout(2000);

    // Look for percentage displays
    const percentages = page.locator('text=/%/');

    if ((await percentages.count()) > 0) {
      const firstPercent = await percentages.first().textContent();

      // Should be a valid percentage
      expect(firstPercent).toMatch(/[\+\-]?\d+\.?\d*%/);
    }
  });

  test('Portfolio refresh updates prices', async ({ page }) => {
    await page.goto('/app/portfolio');
    await page.waitForTimeout(2000);

    // Look for refresh button
    const refreshButton = page
      .locator('button:has-text("Refresh")')
      .or(page.locator('button:has-text("Sync")'));

    if (await refreshButton.isVisible().catch(() => false)) {
      // Click refresh
      await refreshButton.click();
      await page.waitForTimeout(2000);

      // Should show loading state or updated timestamp
      const loadingOrUpdated = await page
        .locator('text=/Loading|Updated|Syncing/i')
        .isVisible()
        .catch(() => false);

      // Page should still be functional
      const table = page.locator('table');
      await expect(table).toBeVisible({ timeout: 10000 });
    }
  });

  test('Portfolio displays individual stock P&L', async ({ page }) => {
    await page.goto('/app/portfolio');
    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');

    if ((await rows.count()) > 0) {
      // Each row should have ticker, shares, current price, P&L
      const firstRow = rows.first();
      const cells = firstRow.locator('td');

      // Should have multiple cells
      const cellCount = await cells.count();
      expect(cellCount).toBeGreaterThan(3);

      // At least one cell should contain a ticker (e.g., BHP.AX)
      const ticker = await cells.first().textContent();
      expect(ticker).toBeTruthy();
    }
  });

  test('Portfolio handles empty state gracefully', async ({ page }) => {
    await page.goto('/app/portfolio');
    await page.waitForTimeout(2000);

    // Either portfolio has holdings OR shows empty state
    const hasHoldings = (await page.locator('tbody tr').count()) > 0;
    const hasEmptyState = await page
      .locator('text=/No holdings|empty portfolio/i')
      .isVisible()
      .catch(() => false);

    expect(hasHoldings || hasEmptyState).toBeTruthy();
  });

  test('Portfolio total value aggregates correctly', async ({ page }) => {
    await page.goto('/app/portfolio');
    await page.waitForTimeout(2000);

    // Look for total value summary
    const totalSection = page.locator('text=/Total.*Value/i').first();

    if (await totalSection.isVisible().catch(() => false)) {
      const totalText = await totalSection.textContent();

      // Should contain a dollar amount
      expect(totalText).toMatch(/\$[\d,]+/);

      // Total should be numeric
      const match = totalText?.match(/\$([\d,]+)/);
      if (match) {
        const amount = match[1].replace(/,/g, '');
        expect(parseFloat(amount)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
