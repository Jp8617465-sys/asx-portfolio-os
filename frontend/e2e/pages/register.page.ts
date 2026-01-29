import { Page, Locator } from '@playwright/test';

export class RegisterPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly termsCheckbox: Locator;
  readonly submitButton: Locator;
  readonly passwordStrength: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('[name="username"]');
    this.emailInput = page.locator('[name="email"]');
    this.passwordInput = page.locator('[name="password"]');
    this.confirmPasswordInput = page.locator('[name="confirmPassword"]');
    this.termsCheckbox = page.locator('[name="agreeToTerms"]');
    this.submitButton = page.locator('button:has-text("Sign Up")');
    this.passwordStrength = page.locator('[data-testid="password-strength"]');
    this.errorMessage = page.locator('[role="alert"]').first();
  }

  async goto() {
    await this.page.goto('/register');
  }

  async register(username: string, email: string, password: string, acceptTerms: boolean = true) {
    await this.usernameInput.fill(username);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);

    if (acceptTerms && (await this.termsCheckbox.isVisible().catch(() => false))) {
      await this.termsCheckbox.check();
    }

    await this.submitButton.click();
  }

  async getPasswordStrength(): Promise<string | null> {
    try {
      await this.passwordStrength.waitFor({ state: 'visible', timeout: 2000 });
      return await this.passwordStrength.textContent();
    } catch {
      return null;
    }
  }

  async getErrorText(): Promise<string | null> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
      return await this.errorMessage.textContent();
    } catch {
      return null;
    }
  }

  async isErrorVisible(): Promise<boolean> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}
