import { test, expect } from '@playwright/test';

test.describe('Health Checks', () => {
  test('backend health endpoint is accessible', async ({ request }) => {
    const response = await request.get('http://localhost:8788/health');
    expect(response.ok()).toBeTruthy();
  });

  test('frontend home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
  });

  test('register page is accessible', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL('/register');
  });

  test('protected routes redirect when not authenticated', async ({ page }) => {
    await page.goto('/app/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
