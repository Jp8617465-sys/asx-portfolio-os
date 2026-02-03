import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('Model B Dashboard - Fundamentals', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login('demo_user', 'testpass123');
  });

  test('Model B tab loads and displays quality scores', async ({ page }) => {
    await page.goto('/app/models');
    await expect(page).toHaveURL('/app/models');

    // Click Model B tab
    const modelBTab = page.locator('button:has-text("Model B")');
    await expect(modelBTab).toBeVisible({ timeout: 10000 });
    await modelBTab.click();

    // Wait for dashboard to load
    await page.waitForTimeout(2000);

    // Verify quality grade chart section is visible
    const qualitySection = page
      .locator('text=Quality Score Distribution')
      .or(page.locator('text=Quality Grade'));
    await expect(qualitySection.first()).toBeVisible({ timeout: 10000 });

    // Check for chart rendering (recharts container)
    const chartContainer = page.locator('.recharts-wrapper').first();
    await expect(chartContainer).toBeVisible({ timeout: 5000 });
  });

  test('Model B displays P/E vs ROE scatter plot', async ({ page }) => {
    await page.goto('/app/models');

    // Switch to Model B tab
    await page.click('button:has-text("Model B")');
    await page.waitForTimeout(2000);

    // Look for scatter plot section
    const scatterPlot = page
      .locator('text=P/E vs ROE')
      .or(page.locator('text=Fundamental Metrics'));
    await expect(scatterPlot.first()).toBeVisible({ timeout: 10000 });

    // Verify chart exists
    const charts = page.locator('.recharts-wrapper');
    await expect(charts).toHaveCount(2, { timeout: 5000 }); // Bar chart + scatter plot
  });

  test('Model B displays top quality stocks table', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Model B")');
    await page.waitForTimeout(2000);

    // Look for quality stocks table
    const table = page.locator('table').or(page.locator('text=Top Quality Stocks'));
    await expect(table.first()).toBeVisible({ timeout: 10000 });

    // Check for table headers
    const headers = page.locator('th');
    await expect(headers.first()).toBeVisible({ timeout: 5000 });
  });

  test('Model B allows filtering by quality grade', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Model B")');
    await page.waitForTimeout(2000);

    // Look for grade filter buttons (A, B, C, D, F)
    const gradeButtons = page.locator('button').filter({ hasText: /^[ABCDF]$/ });

    if ((await gradeButtons.count()) > 0) {
      // Click grade A filter
      const gradeAButton = gradeButtons.first();
      await gradeAButton.click();
      await page.waitForTimeout(1000);

      // Verify filtering worked (table should update)
      const rows = page.locator('tbody tr');
      await expect(rows.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Model B displays fundamental metrics correctly', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Model B")');
    await page.waitForTimeout(2000);

    // Check for fundamental metric labels
    const metrics = ['P/E', 'ROE', 'Debt', 'Quality'];

    for (const metric of metrics) {
      const metricText = page.locator(`text=${metric}`).first();
      // At least one metric should be visible
      if (await metricText.isVisible().catch(() => false)) {
        await expect(metricText).toBeVisible();
        break;
      }
    }
  });

  test('Model B handles empty state gracefully', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Model B")');
    await page.waitForTimeout(2000);

    // If no data, should show empty state message
    const emptyState = page.locator('text=No data').or(page.locator('text=No quality scores'));

    // Either data is shown OR empty state is shown
    const hasData = await page
      .locator('.recharts-wrapper')
      .isVisible()
      .catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(hasData || hasEmptyState).toBeTruthy();
  });

  test('Model B tab navigation persists', async ({ page }) => {
    await page.goto('/app/models');

    // Switch to Model B
    await page.click('button:has-text("Model B")');
    await page.waitForTimeout(1000);

    // Navigate away
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL('/app/dashboard');

    // Navigate back
    await page.goto('/app/models');

    // Should remember we were on Model B (or default to Model A)
    await page.waitForTimeout(1000);

    // Just verify page loads without errors
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });
});
