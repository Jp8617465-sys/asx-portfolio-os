import { Page } from '@playwright/test';

export class PerformanceHelper {
  static async measureLoginTime(
    page: Page,
    username: string = 'demo_user',
    password: string = 'testpass123'
  ): Promise<number> {
    const startTime = Date.now();

    await page.goto('/login');
    await page.fill('[name="username"]', username);
    await page.fill('[name="password"]', password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL(/\/app\//, { timeout: 10000 });

    return Date.now() - startTime;
  }

  static async trackApiResponseTimes(page: Page): Promise<Record<string, number>> {
    const timings: Record<string, number> = {};
    const startTimes: Record<string, number> = {};

    page.on('request', (request) => {
      const url = new URL(request.url());
      const endpoint = url.pathname;
      if (endpoint.startsWith('/auth/') || endpoint.startsWith('/users/')) {
        startTimes[endpoint] = Date.now();
      }
    });

    page.on('response', (response) => {
      const url = new URL(response.url());
      const endpoint = url.pathname;

      if (endpoint.startsWith('/auth/') || endpoint.startsWith('/users/')) {
        const startTime = startTimes[endpoint];
        if (startTime) {
          timings[endpoint] = Date.now() - startTime;
        }
      }
    });

    return timings;
  }

  static async measurePageLoad(page: Page, url: string): Promise<number> {
    const startTime = Date.now();
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }
}
