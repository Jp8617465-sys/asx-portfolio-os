export class TokenHelper {
  static decodePayload(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');

    const payload = parts[1];
    // Handle base64url decoding
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  }

  static getUserId(token: string): string {
    const payload = this.decodePayload(token);
    return payload.sub;
  }

  static getExpiry(token: string): Date {
    const payload = this.decodePayload(token);
    return new Date(payload.exp * 1000);
  }

  static isExpired(token: string): boolean {
    const expiry = this.getExpiry(token);
    return expiry < new Date();
  }

  static timeToExpiry(token: string): number {
    const expiry = this.getExpiry(token);
    return expiry.getTime() - Date.now();
  }

  static tamperPayload(token: string, changes: Record<string, any>): string {
    const parts = token.split('.');
    const payload = JSON.parse(atob(parts[1]));

    Object.assign(payload, changes);

    parts[1] = btoa(JSON.stringify(payload));
    return parts.join('.');
  }

  static createExpiredToken(): string {
    // Create a token that expired 1 hour ago
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: '1',
      exp: Math.floor(Date.now() / 1000) - 3600,
    };

    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));

    // Note: This won't have a valid signature, but that's okay for testing frontend behavior
    return `${encodedHeader}.${encodedPayload}.fake_signature`;
  }
}
