import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('Protected Routes', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page, context }) => {
    authHelper = new AuthHelper(page);
    await authHelper.clearAuth();
    await context.clearCookies();
  });

  test('unauthenticated user redirected from /app/dashboard', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from /app/portfolio', async ({ page }) => {
    await page.goto('/app/portfolio');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected from /app/models', async ({ page }) => {
    await page.goto('/app/models');
    await expect(page).toHaveURL(/\/login/);
  });

  test('authenticated user can access /app/dashboard', async ({ page }) => {
    await authHelper.login('demo_user', 'testpass123');

    await page.goto('/app/dashboard');
    await expect(page).toHaveURL('/app/dashboard');
  });

  test('authenticated user can access /app/portfolio', async ({ page }) => {
    await authHelper.login('demo_user', 'testpass123');

    await page.goto('/app/portfolio');
    await expect(page).toHaveURL('/app/portfolio');
  });

  test('public routes accessible without authentication', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');

    await page.goto('/login');
    await expect(page).toHaveURL('/login');

    await page.goto('/register');
    await expect(page).toHaveURL('/register');
  });

  test('middleware checks cookie for authentication', async ({ page, context }) => {
    // Set token in localStorage but not cookie
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'fake_token_12345');
    });

    // Try to access protected route
    await page.goto('/app/dashboard');

    // Should redirect to login because cookie is missing
    await expect(page).toHaveURL(/\/login/);
  });

  test('authenticated user stays on protected page after reload', async ({ page }) => {
    await authHelper.login('demo_user', 'testpass123');

    await page.goto('/app/dashboard');
    await expect(page).toHaveURL('/app/dashboard');

    // Reload page
    await page.reload();

    // Should still be on dashboard
    await expect(page).toHaveURL('/app/dashboard');
  });

  test('logout prevents access to previously accessible routes', async ({ page }) => {
    await authHelper.login('demo_user', 'testpass123');

    await page.goto('/app/dashboard');
    await expect(page).toHaveURL('/app/dashboard');

    await authHelper.logout();

    // Try to access dashboard again
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
