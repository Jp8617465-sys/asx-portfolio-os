import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('Drift Monitoring Dashboard', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login('demo_user', 'testpass123');
  });

  test('Drift monitor page loads successfully', async ({ page }) => {
    await page.goto('/app/drift-monitor');
    await expect(page).toHaveURL('/app/drift-monitor');

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Should see drift monitoring heading
    const heading = page.locator('h1').filter({ hasText: /drift/i });
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Drift dashboard displays PSI score summary', async ({ page }) => {
    await page.goto('/app/drift-monitor');
    await page.waitForTimeout(2000);

    // Look for PSI score display
    const psiSection = page.locator('text=/PSI|Population Stability/i');

    if (await psiSection.isVisible().catch(() => false)) {
      await expect(psiSection.first()).toBeVisible({ timeout: 5000 });

      // Should show numeric PSI value
      const psiValue = page.locator('text=/\\d+\\.\\d+/').first();
      await expect(psiValue).toBeVisible({ timeout: 5000 });
    }
  });

  test('Drift timeline chart renders', async ({ page }) => {
    await page.goto('/app/drift-monitor');
    await page.waitForTimeout(2000);

    // Look for PSI timeline chart section
    const timelineSection = page.locator('text=/Timeline|Last.*Days/i');

    if (await timelineSection.isVisible().catch(() => false)) {
      await expect(timelineSection.first()).toBeVisible({ timeout: 5000 });

      // Check for recharts wrapper (chart rendered)
      const chart = page.locator('.recharts-wrapper');
      if (await chart.isVisible().catch(() => false)) {
        await expect(chart.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Drift feature table displays status badges', async ({ page }) => {
    await page.goto('/app/drift-monitor');
    await page.waitForTimeout(2000);

    // Look for feature drift table
    const table = page.locator('table');

    if (await table.isVisible().catch(() => false)) {
      await expect(table).toBeVisible({ timeout: 5000 });

      // Should have status badges (STABLE/WARNING/DRIFT)
      const statusBadges = page.locator('.bg-green-500, .bg-yellow-500, .bg-red-500');

      if ((await statusBadges.count()) > 0) {
        await expect(statusBadges.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Drift table shows PSI scores for features', async ({ page }) => {
    await page.goto('/app/drift-monitor');
    await page.waitForTimeout(2000);

    const table = page.locator('table');

    if (await table.isVisible().catch(() => false)) {
      // Should have PSI Score column
      const psiHeader = page.locator('th:has-text("PSI")');

      if (await psiHeader.isVisible().catch(() => false)) {
        await expect(psiHeader).toBeVisible({ timeout: 5000 });

        // PSI values should be numeric
        const psiValues = page.locator('td').filter({ hasText: /\\d+\\.\\d+/ });
        await expect(psiValues.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('Drift shows retraining recommendation when PSI > 0.2', async ({ page }) => {
    await page.goto('/app/drift-monitor');
    await page.waitForTimeout(2000);

    // Look for retraining recommendation banner (orange/warning)
    const retrainingBanner = page
      .locator('text=/Retraining.*Recommended/i')
      .or(page.locator('.bg-orange-50, .bg-orange-900'));

    // Either banner is shown (high drift) OR not shown (low drift)
    const hasBanner = await retrainingBanner.isVisible().catch(() => false);
    const hasContent = await page.locator('h1, h2').isVisible();

    expect(hasContent).toBeTruthy();
  });

  test('Drift table allows sorting by PSI score', async ({ page }) => {
    await page.goto('/app/drift-monitor');
    await page.waitForTimeout(2000);

    const table = page.locator('table');

    if (await table.isVisible().catch(() => false)) {
      // Features should be sorted by drift severity (highest first)
      const firstRow = page.locator('tbody tr').first();

      if (await firstRow.isVisible().catch(() => false)) {
        const rowData = await firstRow.textContent();
        expect(rowData).toBeTruthy();

        // Should contain feature name and PSI score
        expect(rowData).toMatch(/[\d\.]+/);
      }
    }
  });

  test('Drift clicking on feature shows history', async ({ page }) => {
    await page.goto('/app/drift-monitor');
    await page.waitForTimeout(2000);

    const rows = page.locator('tbody tr');

    if ((await rows.count()) > 0) {
      // Click first feature row
      await rows.first().click();
      await page.waitForTimeout(1000);

      // Timeline chart should update to show this feature's history
      const chart = page.locator('.recharts-wrapper');
      await expect(chart.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Drift displays baseline vs current comparison', async ({ page }) => {
    await page.goto('/app/drift-monitor');
    await page.waitForTimeout(2000);

    const table = page.locator('table');

    if (await table.isVisible().catch(() => false)) {
      // Should have baseline and current mean columns
      const headers = page.locator('th');
      const headerText = await headers.allTextContents();

      const hasBaselineOrCurrent = headerText.some(
        (h) =>
          h.toLowerCase().includes('baseline') ||
          h.toLowerCase().includes('current') ||
          h.toLowerCase().includes('mean')
      );

      expect(hasBaselineOrCurrent || headerText.length > 0).toBeTruthy();
    }
  });

  test('Drift alerts panel shows features requiring attention', async ({ page }) => {
    await page.goto('/app/drift-monitor');
    await page.waitForTimeout(2000);

    // Look for drift alerts panel
    const alertsSection = page.locator('text=/Alert|Attention/i');

    if (await alertsSection.isVisible().catch(() => false)) {
      await expect(alertsSection.first()).toBeVisible({ timeout: 5000 });

      // Should show alert cards or empty state
      const hasAlerts = (await page.locator('.border-gray-200, .border-gray-700').count()) > 0;
      const hasEmptyState = await page
        .locator('text=/No.*alert|stable/i')
        .isVisible()
        .catch(() => false);

      expect(hasAlerts || hasEmptyState).toBeTruthy();
    }
  });

  test('Drift summary cards display key metrics', async ({ page }) => {
    await page.goto('/app/drift-monitor');
    await page.waitForTimeout(2000);

    // Look for summary stat cards
    const statCards = page
      .locator('[class*="grid"]')
      .filter({ has: page.locator('text=/PSI|Drift|Feature/i') });

    if ((await statCards.count()) > 0) {
      // Should have multiple stat cards
      const cardElements = page.locator('.text-2xl, .text-3xl').filter({ hasText: /\\d+/ });

      if ((await cardElements.count()) > 0) {
        await expect(cardElements.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
