import { Page, BrowserContext } from '@playwright/test';

export class StorageHelper {
  static async getLocalStorage(page: Page, key: string): Promise<string | null> {
    return await page.evaluate((k) => localStorage.getItem(k), key);
  }

  static async setLocalStorage(page: Page, key: string, value: string): Promise<void> {
    await page.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: key, v: value });
  }

  static async clearLocalStorage(page: Page): Promise<void> {
    await page.evaluate(() => localStorage.clear());
  }

  static async getCookie(context: BrowserContext, name: string) {
    const cookies = await context.cookies();
    return cookies.find((c) => c.name === name);
  }

  static async verifyCookieAttributes(context: BrowserContext, cookieName: string) {
    const cookie = await this.getCookie(context, cookieName);

    return {
      exists: !!cookie,
      httpOnly: cookie?.httpOnly,
      secure: cookie?.secure,
      sameSite: cookie?.sameSite,
      maxAge: cookie?.expires ? Math.floor(cookie.expires - Date.now() / 1000) : null,
    };
  }

  static async getAllCookies(context: BrowserContext) {
    return await context.cookies();
  }

  static async clearAllCookies(context: BrowserContext): Promise<void> {
    await context.clearCookies();
  }
}
