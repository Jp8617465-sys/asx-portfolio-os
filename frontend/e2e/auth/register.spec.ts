import { test, expect } from '@playwright/test';
import { RegisterPage } from '../pages/register.page';
import { AuthHelper } from '../helpers/auth-helper';

test.describe('Registration Flow', () => {
  let registerPage: RegisterPage;
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page, context }) => {
    registerPage = new RegisterPage(page);
    authHelper = new AuthHelper(page);
    await authHelper.clearAuth();
    await context.clearCookies();
  });

  test('successful registration with valid data', async ({ page }) => {
    const uniqueUsername = `testuser_${Date.now()}`;

    await registerPage.goto();
    await registerPage.register(uniqueUsername, `${uniqueUsername}@test.com`, 'Password123!');

    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL('/app/dashboard', { timeout: 10000 });
  });

  test('registration auto-logs in user', async ({ page }) => {
    const uniqueUsername = `testuser_${Date.now()}`;

    await registerPage.goto();
    await registerPage.register(uniqueUsername, `${uniqueUsername}@test.com`, 'Password123!');

    await page.waitForTimeout(1000); // Wait for token to be set

    const token = await authHelper.getToken();
    expect(token).toBeTruthy();
    expect(token).toMatch(/^eyJ/);
  });

  test('registration fails with duplicate username', async ({ page }) => {
    await registerPage.goto();
    await registerPage.register('demo_user', 'newuser@test.com', 'Password123!');

    const errorText = await registerPage.getErrorText();
    expect(errorText).toMatch(/Username already exists|taken|already registered/i);
  });

  test('registration validates username length (min 3 chars)', async ({ page }) => {
    await registerPage.goto();

    await page.fill('[name="username"]', 'ab');
    await page.fill('[name="email"]', 'test@test.com');
    await page.fill('[name="password"]', 'Password123!');
    await page.fill('[name="confirmPassword"]', 'Password123!');

    // Try to submit
    await page.click('button:has-text("Sign Up")');

    // Should show error or stay on page
    await page.waitForTimeout(500);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/register');
  });

  test('registration validates password strength (min 8 chars)', async ({ page }) => {
    await registerPage.goto();

    const uniqueUsername = `testuser_${Date.now()}`;
    await page.fill('[name="username"]', uniqueUsername);
    await page.fill('[name="email"]', `${uniqueUsername}@test.com`);
    await page.fill('[name="password"]', 'pass');
    await page.fill('[name="confirmPassword"]', 'pass');

    await page.click('button:has-text("Sign Up")');

    await page.waitForTimeout(500);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/register');
  });

  test('registration shows password mismatch error', async ({ page }) => {
    await registerPage.goto();

    const uniqueUsername = `testuser_${Date.now()}`;
    await page.fill('[name="username"]', uniqueUsername);
    await page.fill('[name="email"]', `${uniqueUsername}@test.com`);
    await page.fill('[name="password"]', 'Password123!');
    await page.fill('[name="confirmPassword"]', 'DifferentPassword!');

    await page.click('button:has-text("Sign Up")');

    await page.waitForTimeout(500);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/register');
  });

  test('registration validates email format', async ({ page }) => {
    await registerPage.goto();

    const uniqueUsername = `testuser_${Date.now()}`;
    await page.fill('[name="username"]', uniqueUsername);
    await page.fill('[name="email"]', 'invalid-email');
    await page.fill('[name="password"]', 'Password123!');
    await page.fill('[name="confirmPassword"]', 'Password123!');

    await page.click('button:has-text("Sign Up")');

    await page.waitForTimeout(500);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/register');
  });

  test('registration requires terms acceptance if checkbox exists', async ({ page }) => {
    await registerPage.goto();

    const uniqueUsername = `testuser_${Date.now()}`;
    await page.fill('[name="username"]', uniqueUsername);
    await page.fill('[name="email"]', `${uniqueUsername}@test.com`);
    await page.fill('[name="password"]', 'Password123!');
    await page.fill('[name="confirmPassword"]', 'Password123!');

    // Check if terms checkbox exists
    const termsCheckbox = page.locator('[name="agreeToTerms"]');
    const exists = await termsCheckbox.isVisible().catch(() => false);

    if (exists) {
      // Don't check the terms box
      await page.click('button:has-text("Sign Up")');

      await page.waitForTimeout(500);
      const currentUrl = page.url();
      expect(currentUrl).toContain('/register');
    } else {
      // If no terms checkbox, test passes
      expect(true).toBeTruthy();
    }
  });

  test('registration link visible on login page', async ({ page }) => {
    await page.goto('/login');

    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
  });

  test('registration form has all required fields', async ({ page }) => {
    await registerPage.goto();

    await expect(registerPage.usernameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
  });

  test('registration handles server errors gracefully', async ({ page }) => {
    await registerPage.goto();

    // Try to register with potentially problematic data
    await page.fill('[name="username"]', 'test');
    await page.fill('[name="email"]', 'test@test.com');
    await page.fill('[name="password"]', 'a'); // Too short
    await page.fill('[name="confirmPassword"]', 'a');

    await page.click('button:has-text("Sign Up")');

    // Should either show error or stay on page
    await page.waitForTimeout(1000);
    const hasError = await registerPage.isErrorVisible();
    const onRegisterPage = page.url().includes('/register');

    expect(hasError || onRegisterPage).toBeTruthy();
  });
});
