import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';
import { TokenHelper } from '../helpers/token-helper';

test.describe('Authorization & User Isolation', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page, context }) => {
    authHelper = new AuthHelper(page);
    await authHelper.clearAuth();
    await context.clearCookies();
  });

  test('user can only access own portfolio data', async ({ page, request }) => {
    await authHelper.login('demo_user', 'testpass123');

    const token = await authHelper.getToken();
    expect(token).toBeTruthy();

    if (token) {
      const response = await request.get('http://localhost:8788/portfolio', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        failOnStatusCode: false,
      });

      // Should return 200 or 404 (if no portfolio), but not 403
      expect([200, 404]).toContain(response.status());
    }
  });

  test('JWT token contains correct user_id', async ({ page }) => {
    await authHelper.login('demo_user', 'testpass123');

    const token = await authHelper.getToken();
    expect(token).toBeTruthy();

    if (token) {
      const payload = TokenHelper.decodePayload(token);
      expect(payload.sub).toBeTruthy();

      // User ID should be a string or number
      const userId = payload.sub;
      expect(typeof userId === 'string' || typeof userId === 'number').toBeTruthy();
    }
  });

  test('modifying JWT token invalidates signature', async ({ page, request }) => {
    await authHelper.login('demo_user', 'testpass123');

    const token = await authHelper.getToken();
    expect(token).toBeTruthy();

    if (token) {
      // Tamper with token
      const tamperedToken = TokenHelper.tamperPayload(token, { sub: '999' });

      // API call should fail with tampered token
      const response = await request.get('http://localhost:8788/users/me', {
        headers: {
          Authorization: `Bearer ${tamperedToken}`,
        },
        failOnStatusCode: false,
      });

      expect(response.status()).toBe(401);
    }
  });

  test('user cannot access API endpoints without token', async ({ request }) => {
    const response = await request.get('http://localhost:8788/users/me', {
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(401);
  });

  test('user info endpoint returns correct user data', async ({ page, request }) => {
    await authHelper.login('demo_user', 'testpass123');

    const token = await authHelper.getToken();
    expect(token).toBeTruthy();

    if (token) {
      const response = await request.get('http://localhost:8788/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.ok()).toBeTruthy();

      const userData = await response.json();
      expect(userData.username).toBe('demo_user');
      expect(userData.user_id).toBeTruthy();
    }
  });

  test('invalid token format returns 401', async ({ request }) => {
    const invalidToken = 'not_a_valid_jwt_token';

    const response = await request.get('http://localhost:8788/users/me', {
      headers: {
        Authorization: `Bearer ${invalidToken}`,
      },
      failOnStatusCode: false,
    });

    expect(response.status()).toBe(401);
  });
});
