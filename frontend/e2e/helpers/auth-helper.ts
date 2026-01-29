import { Page } from '@playwright/test';

export class AuthHelper {
  constructor(private page: Page) {}

  async login(username: string, password: string) {
    await this.page.goto('/login');
    await this.page.fill('[name="username"]', username);
    await this.page.fill('[name="password"]', password);
    await this.page.click('button:has-text("Sign In")');
    await this.page.waitForURL(/\/app\//, { timeout: 10000 });
  }

  async register(username: string, email: string, password: string) {
    await this.page.goto('/register');
    await this.page.fill('[name="username"]', username);
    await this.page.fill('[name="email"]', email);
    await this.page.fill('[name="password"]', password);
    await this.page.fill('[name="confirmPassword"]', password);

    // Check if terms checkbox exists and check it
    const termsCheckbox = this.page.locator('[name="agreeToTerms"]');
    if (await termsCheckbox.isVisible().catch(() => false)) {
      await termsCheckbox.check();
    }

    await this.page.click('button:has-text("Sign Up")');
    await this.page.waitForURL('/app/dashboard', { timeout: 10000 });
  }

  async logout() {
    const userMenu = this.page.locator('[data-testid="user-menu"]');
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click();
      await this.page.click('text=Logout');
      await this.page.waitForURL('/', { timeout: 5000 });
    }
  }

  async getToken(): Promise<string | null> {
    return await this.page.evaluate(() => localStorage.getItem('access_token'));
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return token !== null;
  }

  async clearAuth(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      // Clear all cookies
      document.cookie.split(';').forEach((cookie) => {
        const name = cookie.split('=')[0].trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
    });
  }
}
