import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { TokenHelper } from '../helpers/token-helper';

test.describe('Token Expiry', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page, context }) => {
    authHelper = new AuthHelper(page);
    await authHelper.clearAuth();
    await context.clearCookies();
  });

  test('access token has expiry timestamp', async ({ page }) => {
    await authHelper.login('demo_user', 'testpass123');

    const token = await authHelper.getToken();
    expect(token).toBeTruthy();

    if (token) {
      const payload = TokenHelper.decodePayload(token);
      expect(payload.exp).toBeTruthy();

      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();
      const timeToExpiry = expiryTime - currentTime;

      // Token should expire in the future (more than 0)
      expect(timeToExpiry).toBeGreaterThan(0);

      // Token should expire within reasonable time (less than 2 hours)
      expect(timeToExpiry).toBeLessThan(2 * 60 * 60 * 1000);
    }
  });

  test('API call with expired token returns 401', async ({ page, request }) => {
    const expiredToken = TokenHelper.createExpiredToken();

    const response = await request.get('http://localhost:8788/users/me', {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(401);
  });

  test('frontend handles 401 by redirecting to login', async ({ page }) => {
    await authHelper.login('demo_user', 'testpass123');

    // Set expired token
    const expiredToken = TokenHelper.createExpiredToken();
    await page.evaluate((token) => {
      localStorage.setItem('access_token', token);
      document.cookie = `access_token=${token}; path=/; max-age=3600; SameSite=Strict`;
    }, expiredToken);

    // Reload page to trigger auth check
    await page.reload();

    // Should redirect to login or show error
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login');
    const is401Visible = await page
      .locator('text=/401|Unauthorized|expired/i')
      .isVisible()
      .catch(() => false);

    expect(isLoginPage || is401Visible).toBeTruthy();
  });

  test('token expiry time is reasonable', async ({ page }) => {
    await authHelper.login('demo_user', 'testpass123');

    const token = await authHelper.getToken();
    expect(token).toBeTruthy();

    if (token) {
      const timeToExpiry = TokenHelper.timeToExpiry(token);

      // Should be between 30 minutes and 2 hours
      expect(timeToExpiry).toBeGreaterThan(30 * 60 * 1000); // At least 30 mins
      expect(timeToExpiry).toBeLessThan(2 * 60 * 60 * 1000); // At most 2 hours
    }
  });
});
