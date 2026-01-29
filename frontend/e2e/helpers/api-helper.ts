import { APIRequestContext } from '@playwright/test';

export class ApiHelper {
  private baseUrl: string;

  constructor(
    private request: APIRequestContext,
    baseUrl: string = 'http://localhost:8788'
  ) {
    this.baseUrl = baseUrl;
  }

  async login(username: string, password: string) {
    return await this.request.post(`${this.baseUrl}/auth/login`, {
      data: { username, password },
    });
  }

  async register(username: string, email: string, password: string) {
    return await this.request.post(`${this.baseUrl}/auth/register`, {
      data: {
        username,
        email,
        password,
        full_name: 'Test User',
        is_active: true,
        is_verified: false,
      },
    });
  }

  async getUserInfo(token: string) {
    return await this.request.get(`${this.baseUrl}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async refreshToken(refreshToken: string) {
    return await this.request.post(`${this.baseUrl}/auth/refresh`, {
      data: { refresh_token: refreshToken },
    });
  }

  async logout(token: string) {
    return await this.request.post(`${this.baseUrl}/auth/logout`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
