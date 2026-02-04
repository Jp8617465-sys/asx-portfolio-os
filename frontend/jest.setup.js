// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    };
  },
  usePathname() {
    return '/';
  },
  useSearchParams() {
    return new URLSearchParams();
  },
}));

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8000/api/v1';
process.env.OS_API_KEY = 'test-api-key';

// Polyfill crypto.randomUUID (not available in jsdom)
let _uuidCounter = 0;
if (!globalThis.crypto) {
  globalThis.crypto = {};
}
if (!globalThis.crypto.randomUUID) {
  globalThis.crypto.randomUUID = () => `test-uuid-${++_uuidCounter}`;
}

// Polyfill URL.createObjectURL / revokeObjectURL (not available in jsdom)
if (!URL.createObjectURL) {
  URL.createObjectURL = jest.fn(() => 'blob:mock-url');
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = jest.fn();
}

// Polyfill Request (not available in Node.js < 18 / jsdom)
if (!globalThis.Request) {
  globalThis.Request = class Request {
    constructor(input, init = {}) {
      const urlValue = typeof input === 'string' ? input : input.url;
      Object.defineProperty(this, 'url', {
        value: urlValue,
        writable: false,
        enumerable: true,
        configurable: true,
      });
      this.method = init.method || 'GET';
      this.headers = new Map(Object.entries(init.headers || {}));
      this.body = init.body;
      this._bodyUsed = false;
    }

    async json() {
      if (this._bodyUsed) throw new Error('Body already consumed');
      this._bodyUsed = true;
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }

    async text() {
      if (this._bodyUsed) throw new Error('Body already consumed');
      this._bodyUsed = true;
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  };
}

// Polyfill Response (not available in Node.js < 18 / jsdom)
if (!globalThis.Response) {
  globalThis.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Map(Object.entries(init.headers || {}));
      this._bodyUsed = false;
    }

    async json() {
      if (this._bodyUsed) throw new Error('Body already consumed');
      this._bodyUsed = true;
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }

    async text() {
      if (this._bodyUsed) throw new Error('Body already consumed');
      this._bodyUsed = true;
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  };
}
