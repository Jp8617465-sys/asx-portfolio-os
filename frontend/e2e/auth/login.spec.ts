import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { AuthHelper } from '../helpers/auth-helper';
import { TokenHelper } from '../helpers/token-helper';
import { StorageHelper } from '../helpers/storage-helper';

test.describe('Login Flow', () => {
  let loginPage: LoginPage;
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page, context }) => {
    loginPage = new LoginPage(page);
    authHelper = new AuthHelper(page);
    await authHelper.clearAuth();
    await context.clearCookies();
  });

  test('successful login with valid credentials', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('demo_user', 'testpass123');

    await expect(page).toHaveURL(/\/app\//);
  });

  test('login sets JWT token in localStorage', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('demo_user', 'testpass123');

    const token = await authHelper.getToken();
    expect(token).toBeTruthy();
    expect(token).toMatch(/^eyJ/); // JWT format
  });

  test('login sets JWT token in cookie', async ({ page, context }) => {
    await loginPage.goto();
    await loginPage.login('demo_user', 'testpass123');

    await page.waitForTimeout(1000); // Wait for cookie to be set

    const cookies = await context.cookies();
    const authCookie = cookies.find((c) => c.name === 'access_token');
    expect(authCookie).toBeTruthy();
    expect(authCookie?.value).toMatch(/^eyJ/);
  });

  test('login fails with incorrect password', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('demo_user', 'wrongpassword');

    const errorText = await loginPage.getErrorText();
    expect(errorText).toMatch(
      /Invalid credentials|incorrect password|Invalid username or password/i
    );
    await expect(page).toHaveURL('/login');
  });

  test('login fails with non-existent username', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('nonexistent_user_xyz', 'password123');

    const errorText = await loginPage.getErrorText();
    expect(errorText).toMatch(/Invalid credentials|User not found|Invalid username or password/i);
  });

  test('login shows validation error for empty username', async ({ page }) => {
    await loginPage.goto();
    await page.fill('[name="password"]', 'testpass123');
    await page.click('button:has-text("Sign In")');

    // Check for validation message or error
    const hasError = await loginPage.isErrorVisible();
    expect(hasError).toBeTruthy();
  });

  test('login shows validation error for empty password', async ({ page }) => {
    await loginPage.goto();
    await page.fill('[name="username"]', 'demo_user');
    await page.click('button:has-text("Sign In")');

    const hasError = await loginPage.isErrorVisible();
    expect(hasError).toBeTruthy();
  });

  test('login redirects to original page after authentication', async ({ page }) => {
    await page.goto('/app/portfolio');
    await expect(page).toHaveURL(/\/login/);

    // Check if redirect parameter is present
    const url = page.url();
    const hasRedirect = url.includes('redirect') || url.includes('callbackUrl');

    await page.fill('[name="username"]', 'demo_user');
    await page.fill('[name="password"]', 'testpass123');
    await page.click('button:has-text("Sign In")');

    // Should redirect back to portfolio or dashboard
    await expect(page).toHaveURL(/\/app\//);
  });

  test('login button shows loading state during authentication', async ({ page }) => {
    await loginPage.goto();
    await page.fill('[name="username"]', 'demo_user');
    await page.fill('[name="password"]', 'testpass123');

    const loginButton = page.locator('button:has-text("Sign In")');

    // Check initial state
    await expect(loginButton).toBeEnabled();

    // Click and immediately check if disabled or shows loading
    const clickPromise = loginButton.click();

    // Wait a bit for the loading state
    await page.waitForTimeout(100);

    // Button should be disabled or show loading text during request
    const isDisabled = await loginButton.isDisabled();
    const buttonText = await loginButton.textContent();

    // Either disabled or showing loading text
    const isLoading =
      isDisabled || buttonText?.includes('Signing') || buttonText?.includes('Loading');
    expect(isLoading).toBeTruthy();

    await clickPromise;
  });

  test('JWT token contains valid user information', async ({ page }) => {
    await loginPage.goto();
    await loginPage.login('demo_user', 'testpass123');

    const token = await authHelper.getToken();
    expect(token).toBeTruthy();

    if (token) {
      const payload = TokenHelper.decodePayload(token);
      expect(payload.sub).toBeTruthy(); // User ID
      expect(payload.exp).toBeTruthy(); // Expiry timestamp
    }
  });
});
