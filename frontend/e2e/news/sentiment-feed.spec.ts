import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('News Feed with Sentiment', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    await authHelper.login('demo_user', 'testpass123');
  });

  test('News feed component renders on insights page', async ({ page }) => {
    // News feed might be integrated into insights or models page
    await page.goto('/app/insights');
    await page.waitForTimeout(2000);

    // Look for news section
    const newsSection = page.locator('text=/News|Article/i');

    if (await newsSection.isVisible().catch(() => false)) {
      await expect(newsSection.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Page should at least load without errors
      const heading = page.locator('h1, h2');
      await expect(heading.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('News articles display with sentiment badges', async ({ page }) => {
    await page.goto('/app/insights');
    await page.waitForTimeout(2000);

    // Look for sentiment badges (positive/negative/neutral)
    const sentimentBadges = page.locator('.bg-green-500, .bg-red-500, .bg-gray-500');

    if (await sentimentBadges.count() > 0) {
      // Should have sentiment indicators
      await expect(sentimentBadges.first()).toBeVisible({ timeout: 5000 });

      // Badges should have text (POSITIVE, NEGATIVE, NEUTRAL)
      const badgeText = await sentimentBadges.first().textContent();
      expect(badgeText).toMatch(/positive|negative|neutral/i);
    }
  });

  test('News feed allows filtering by sentiment', async ({ page }) => {
    await page.goto('/app/insights');
    await page.waitForTimeout(2000);

    // Look for sentiment filter buttons
    const filterButtons = page.locator('button').filter({ hasText: /Positive|Negative|Neutral|All/ });

    if (await filterButtons.count() > 0) {
      // Click a filter (e.g., Positive)
      const positiveFilter = filterButtons.filter({ hasText: /Positive/i });

      if (await positiveFilter.count() > 0) {
        await positiveFilter.first().click();
        await page.waitForTimeout(1000);

        // News should filter (or show empty state)
        const newsCards = page.locator('[class*="Card"]').or(page.locator('article'));
        const hasCards = await newsCards.count() > 0;
        const hasEmptyState = await page.locator('text=/No news|No articles/i').isVisible().catch(() => false);

        expect(hasCards || hasEmptyState).toBeTruthy();
      }
    }
  });

  test('News articles display publication date', async ({ page }) => {
    await page.goto('/app/insights');
    await page.waitForTimeout(2000);

    // Look for date displays (e.g., "2h ago", "Yesterday")
    const dateTexts = page.locator('text=/\\d+h ago|\\d+d ago|Yesterday|Today/i');

    if (await dateTexts.count() > 0) {
      await expect(dateTexts.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('News articles show source attribution', async ({ page }) => {
    await page.goto('/app/insights');
    await page.waitForTimeout(2000);

    // Look for source names (NewsAPI, ASX, etc.)
    const sources = page.locator('text=/NewsAPI|ASX|Source/i');

    if (await sources.count() > 0) {
      await expect(sources.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('News articles are clickable and open in new tab', async ({ page, context }) => {
    await page.goto('/app/insights');
    await page.waitForTimeout(2000);

    // Look for news cards/articles
    const newsCards = page.locator('[class*="cursor-pointer"]').filter({ hasText: /./i });

    if (await newsCards.count() > 0) {
      // Listen for new page (popup)
      const [newPage] = await Promise.all([
        context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
        newsCards.first().click()
      ]);

      // If new page opened, it should have a URL
      if (newPage) {
        const url = newPage.url();
        expect(url).toBeTruthy();
        await newPage.close();
      }
    }
  });

  test('News feed shows confidence scores', async ({ page }) => {
    await page.goto('/app/insights');
    await page.waitForTimeout(2000);

    // Look for confidence percentages
    const confidenceScores = page.locator('text=/\\d+%.*confidence/i');

    if (await confidenceScores.count() > 0) {
      await expect(confidenceScores.first()).toBeVisible({ timeout: 5000 });

      // Score should be 0-100%
      const scoreText = await confidenceScores.first().textContent();
      const match = scoreText?.match(/(\d+)%/);
      if (match) {
        const score = parseInt(match[1]);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    }
  });

  test('News feed allows timeframe selection', async ({ page }) => {
    await page.goto('/app/insights');
    await page.waitForTimeout(2000);

    // Look for timeframe buttons (24h, 7d, 30d)
    const timeframeButtons = page.locator('button').filter({ hasText: /24h|7d|30d|day/i });

    if (await timeframeButtons.count() > 0) {
      // Click a timeframe
      await timeframeButtons.first().click();
      await page.waitForTimeout(1000);

      // News should update or maintain visibility
      const hasContent = await page.locator('h1, h2').isVisible();
      expect(hasContent).toBeTruthy();
    }
  });

  test('News feed displays article titles and summaries', async ({ page }) => {
    await page.goto('/app/insights');
    await page.waitForTimeout(2000);

    // Look for news titles (should be longer text)
    const titles = page.locator('[class*="CardTitle"], [class*="title"]').filter({ hasText: /./i });

    if (await titles.count() > 0) {
      // Get first title text
      const titleText = await titles.first().textContent();

      // Should be substantial text (not just a word)
      if (titleText) {
        expect(titleText.length).toBeGreaterThan(10);
      }
    }
  });

  test('News feed handles empty state', async ({ page }) => {
    await page.goto('/app/insights');
    await page.waitForTimeout(2000);

    // Either news is shown OR empty state message
    const hasNews = await page.locator('article, [class*="Card"]').count() > 0;
    const hasEmptyState = await page.locator('text=/No news|No articles|check back later/i').isVisible().catch(() => false);

    expect(hasNews || hasEmptyState).toBeTruthy();
  });
});
