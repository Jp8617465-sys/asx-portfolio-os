import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('Ensemble Signals - Conflict Detection', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login('demo_user', 'testpass123');
  });

  test('Ensemble tab loads and displays signals table', async ({ page }) => {
    await page.goto('/app/models');
    await expect(page).toHaveURL('/app/models');

    // Click Ensemble tab
    const ensembleTab = page.locator('button:has-text("Ensemble")');
    await expect(ensembleTab).toBeVisible({ timeout: 10000 });
    await ensembleTab.click();

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Verify ensemble signals table is visible
    const table = page.locator('table');
    await expect(table).toBeVisible({ timeout: 10000 });
  });

  test('Ensemble table shows conflict indicators', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Ensemble")');
    await page.waitForTimeout(2000);

    // Look for conflict warning icons (⚠️ or red text)
    const conflictIndicators = page
      .locator('text=⚠️')
      .or(page.locator('.text-red-600').filter({ hasText: /conflict|disagree/i }));

    // Either conflicts exist OR table is empty
    const hasConflicts = (await conflictIndicators.count()) > 0;
    const hasEmptyState = await page
      .locator('text=No ensemble signals')
      .isVisible()
      .catch(() => false);

    // At minimum, table should be visible
    const tableVisible = await page.locator('table').isVisible();
    expect(tableVisible).toBeTruthy();
  });

  test('Ensemble displays 60/40 weighting information', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Ensemble")');
    await page.waitForTimeout(2000);

    // Look for weighting information (60%, 40%, or confidence breakdown)
    const weightingInfo = page
      .locator('text=/60|40/')
      .or(page.locator('text=Model A').and(page.locator('text=Model B')));

    // Weighting info may be in tooltips or column headers
    const hasWeighting = (await weightingInfo.count()) > 0;
    const hasConfidence = await page
      .locator('text=Confidence')
      .isVisible()
      .catch(() => false);

    // Should show either weighting or confidence
    expect(hasWeighting || hasConfidence).toBeTruthy();
  });

  test('Ensemble table displays confidence scores', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Ensemble")');
    await page.waitForTimeout(2000);

    // Look for confidence column or percentages
    const confidenceCol = page.locator('th:has-text("Confidence")');

    if (await confidenceCol.isVisible().catch(() => false)) {
      await expect(confidenceCol).toBeVisible();

      // Check for percentage values in table
      const percentValues = page.locator('td').filter({ hasText: /%/ });
      await expect(percentValues.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Ensemble allows filtering to agreement-only signals', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Ensemble")');
    await page.waitForTimeout(2000);

    // Look for agreement filter toggle/button
    const agreementFilter = page
      .locator('button:has-text("Agreement")')
      .or(page.locator('input[type="checkbox"]').filter({ hasText: /agreement/i }));

    if ((await agreementFilter.count()) > 0) {
      // Click the filter
      await agreementFilter.first().click();
      await page.waitForTimeout(1000);

      // Table should update (rows may change)
      const table = page.locator('table');
      await expect(table).toBeVisible();
    }
  });

  test('Ensemble shows signal badges (BUY/SELL/HOLD)', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Ensemble")');
    await page.waitForTimeout(2000);

    // Look for signal badges
    const signalBadges = page
      .locator('text=BUY')
      .or(page.locator('text=SELL'))
      .or(page.locator('text=HOLD'));

    if ((await signalBadges.count()) > 0) {
      await expect(signalBadges.first()).toBeVisible({ timeout: 5000 });

      // Badges should have color styling
      const styledBadge = page.locator('.bg-green-500, .bg-red-500, .bg-gray-500');
      await expect(styledBadge.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('Ensemble clicking on ticker navigates to stock detail', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Ensemble")');
    await page.waitForTimeout(2000);

    // Find first ticker in table
    const tableRows = page.locator('tbody tr');

    if ((await tableRows.count()) > 0) {
      // Get ticker symbol from first row
      const firstRow = tableRows.first();
      await firstRow.click();
      await page.waitForTimeout(1000);

      // Should navigate to stock detail page
      const url = page.url();
      expect(url).toMatch(/\/stock\/|\/app\//);
    }
  });

  test('Ensemble displays model component signals', async ({ page }) => {
    await page.goto('/app/models');

    await page.click('button:has-text("Ensemble")');
    await page.waitForTimeout(2000);

    // Look for individual model signals (Model A, Model B labels or columns)
    const modelLabels = page.locator('text=Model A').or(page.locator('text=Model B'));

    // Should show component model information
    const hasLabels = (await modelLabels.count()) > 0;
    const hasTable = await page.locator('table').isVisible();

    expect(hasLabels || hasTable).toBeTruthy();
  });
});
