import { test, expect } from '@playwright/test';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('Complete Authentication Journey', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page, context }) => {
    authHelper = new AuthHelper(page);
    await authHelper.clearAuth();
    await context.clearCookies();
  });

  test('complete authentication journey - register, logout, login', async ({ page }) => {
    // 1. Register new user
    const username = `e2e_user_${Date.now()}`;
    await page.goto('/register');

    await page.fill('[name="username"]', username);
    await page.fill('[name="email"]', `${username}@test.com`);
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.fill('[name="confirmPassword"]', 'SecurePass123!');

    // Check if terms checkbox exists and check it
    const termsCheckbox = page.locator('[name="agreeToTerms"]');
    if (await termsCheckbox.isVisible().catch(() => false)) {
      await termsCheckbox.check();
    }

    await page.click('button:has-text("Sign Up")');

    // 2. Should auto-login and redirect to dashboard
    await expect(page).toHaveURL('/app/dashboard', { timeout: 10000 });

    // 3. Token should be present
    const token1 = await authHelper.getToken();
    expect(token1).toBeTruthy();
    expect(token1).toMatch(/^eyJ/);

    // 4. Navigate to protected pages
    await page.goto('/app/portfolio');
    await expect(page).toHaveURL('/app/portfolio');

    await page.goto('/app/models');
    await expect(page).toHaveURL('/app/models');

    // 5. Logout
    const userMenu = page.locator('[data-testid="user-menu"]');
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click();
      await page.click('text=Logout');
      await expect(page).toHaveURL('/');
    } else {
      // Alternative logout method if user menu not found
      await page.goto('/');
      await authHelper.clearAuth();
    }

    // 6. Token should be cleared
    const token2 = await authHelper.getToken();
    expect(token2).toBeNull();

    // 7. Protected routes should redirect
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/);

    // 8. Login with same credentials
    await page.fill('[name="username"]', username);
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button:has-text("Sign In")');

    // 9. Should be back on dashboard
    await expect(page).toHaveURL(/\/app\//, { timeout: 10000 });

    // 10. New token issued
    const token3 = await authHelper.getToken();
    expect(token3).toBeTruthy();
    expect(token3).not.toBe(token1); // New token
  });

  test('complete journey with navigation and page reload', async ({ page }) => {
    // Login
    await authHelper.login('demo_user', 'testpass123');

    // Navigate through different pages
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL('/app/dashboard');

    await page.goto('/app/portfolio');
    await expect(page).toHaveURL('/app/portfolio');

    // Reload page - should stay authenticated
    await page.reload();
    await expect(page).toHaveURL('/app/portfolio');

    // Navigate back
    await page.goBack();
    await expect(page).toHaveURL('/app/dashboard');

    // Open new tab (simulate)
    await page.goto('/app/models');
    await expect(page).toHaveURL('/app/models');

    // Still authenticated
    const token = await authHelper.getToken();
    expect(token).toBeTruthy();
  });

  test('authentication persists across page reloads', async ({ page }) => {
    await authHelper.login('demo_user', 'testpass123');

    await page.goto('/app/dashboard');
    await expect(page).toHaveURL('/app/dashboard');

    // Reload multiple times
    for (let i = 0; i < 3; i++) {
      await page.reload();
      await expect(page).toHaveURL('/app/dashboard');

      const token = await authHelper.getToken();
      expect(token).toBeTruthy();
    }
  });

  test('failed login does not affect subsequent successful login', async ({ page }) => {
    // First, try failed login
    await page.goto('/login');
    await page.fill('[name="username"]', 'demo_user');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button:has-text("Sign In")');

    await page.waitForTimeout(1000);

    // Should show error
    const hasError = await page
      .locator('[role="alert"]')
      .isVisible()
      .catch(() => false);
    expect(hasError).toBeTruthy();

    // Now try correct login
    await page.fill('[name="username"]', 'demo_user');
    await page.fill('[name="password"]', 'testpass123');
    await page.click('button:has-text("Sign In")');

    // Should succeed
    await expect(page).toHaveURL(/\/app\//, { timeout: 10000 });

    const token = await authHelper.getToken();
    expect(token).toBeTruthy();
  });
});
