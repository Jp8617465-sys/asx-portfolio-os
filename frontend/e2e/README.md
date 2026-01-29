# E2E Authentication Tests

Comprehensive end-to-end tests for JWT authentication system using Playwright.

## Test Coverage

### 44 Test Scenarios across 6 Categories:

1. **Authentication Flows (24 tests)**
   - Login flow: 10 tests
   - Registration flow: 11 tests
   - Logout flow: 3 tests

2. **Token Management (7 tests)**
   - Token refresh: 3 tests
   - Token expiry: 4 tests

3. **Protected Routes (5 tests)**
   - Middleware protection
   - Redirect behavior
   - Cookie-based auth

4. **Authorization & User Isolation (4 tests)**
   - User data isolation
   - JWT tampering detection
   - Token validation

5. **Rate Limiting (3 tests)**
   - Login rate limits
   - Registration rate limits
   - Rate limit headers

6. **Complete User Journey (1 test)**
   - Full registration → logout → login flow

## Directory Structure

```
e2e/
├── auth/                 # Authentication flow tests
│   ├── login.spec.ts
│   ├── register.spec.ts
│   └── logout.spec.ts
├── token/                # Token management tests
│   ├── refresh.spec.ts
│   └── expiry.spec.ts
├── protection/           # Protected route tests
│   └── routes.spec.ts
├── authorization/        # Authorization tests
│   └── isolation.spec.ts
├── ratelimit/           # Rate limiting tests
│   └── limits.spec.ts
├── complete/            # End-to-end journey tests
│   └── journey.spec.ts
├── helpers/             # Test utilities
│   ├── auth-helper.ts
│   ├── token-helper.ts
│   ├── storage-helper.ts
│   ├── api-helper.ts
│   └── performance-helper.ts
└── pages/               # Page Object Models
    ├── login.page.ts
    └── register.page.ts
```

## Running Tests

### Prerequisites

1. Backend server running on `http://localhost:8788`
2. Frontend dev server running on `http://localhost:3000`
3. Demo user exists in database:
   - Username: `demo_user`
   - Password: `testpass123`

### Commands

```bash
# Run all tests
npm run test:e2e

# Run specific category
npx playwright test e2e/auth/
npx playwright test e2e/token/
npx playwright test e2e/protection/

# Run single test file
npx playwright test e2e/auth/login.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Run in debug mode
npx playwright test --debug

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run tests in headed mode (see browser)
npx playwright test --headed

# Show HTML report after tests
npx playwright show-report
```

### Auto-start servers (configured in playwright.config.ts)

Playwright will automatically:

- Start backend server on port 8788
- Start frontend dev server on port 3000
- Wait for both servers to be ready
- Run tests
- Stop servers after tests

## Test Helpers

### AuthHelper

Handles authentication operations:

```typescript
import { AuthHelper } from './helpers/auth-helper';

const authHelper = new AuthHelper(page);

// Login
await authHelper.login('username', 'password');

// Register
await authHelper.register('username', 'email', 'password');

// Logout
await authHelper.logout();

// Check authentication state
const isAuth = await authHelper.isAuthenticated();
const token = await authHelper.getToken();
```

### TokenHelper

JWT token utilities:

```typescript
import { TokenHelper } from './helpers/token-helper';

// Decode token
const payload = TokenHelper.decodePayload(token);

// Get user ID
const userId = TokenHelper.getUserId(token);

// Check expiry
const isExpired = TokenHelper.isExpired(token);
const timeLeft = TokenHelper.timeToExpiry(token);

// Tamper with token (for testing)
const tampered = TokenHelper.tamperPayload(token, { sub: '999' });
```

### StorageHelper

Browser storage operations:

```typescript
import { StorageHelper } from './helpers/storage-helper';

// LocalStorage
await StorageHelper.getLocalStorage(page, 'key');
await StorageHelper.setLocalStorage(page, 'key', 'value');

// Cookies
const cookie = await StorageHelper.getCookie(context, 'access_token');
const attrs = await StorageHelper.verifyCookieAttributes(context, 'access_token');
```

## Page Objects

### LoginPage

```typescript
import { LoginPage } from './pages/login.page';

const loginPage = new LoginPage(page);
await loginPage.goto();
await loginPage.login('username', 'password');
const error = await loginPage.getErrorText();
```

### RegisterPage

```typescript
import { RegisterPage } from './pages/register.page';

const registerPage = new RegisterPage(page);
await registerPage.goto();
await registerPage.register('username', 'email', 'password');
```

## CI/CD Integration

Tests run automatically on:

- Push to main branch
- Pull requests to main
- Manual workflow dispatch

See `.github/workflows/e2e-auth-tests.yml` for configuration.

## Writing New Tests

1. **Use existing helpers**: Leverage AuthHelper, TokenHelper, etc.
2. **Follow naming convention**: `test('should do something', async ({ page }) => {})`
3. **Clean up state**: Clear auth and cookies in `beforeEach`
4. **Use Page Objects**: For login/register forms
5. **Add timeouts**: For async operations
6. **Handle errors gracefully**: Use `.catch()` for optional elements

Example test:

```typescript
test('user can access protected page after login', async ({ page }) => {
  const authHelper = new AuthHelper(page);

  // Login
  await authHelper.login('demo_user', 'testpass123');

  // Access protected page
  await page.goto('/app/dashboard');

  // Verify access
  await expect(page).toHaveURL('/app/dashboard');
});
```

## Debugging Tips

1. **Use --headed**: See browser while tests run
2. **Use --debug**: Step through tests with Playwright Inspector
3. **Use --ui**: Interactive test runner with time-travel debugging
4. **Add page.pause()**: Pause execution and inspect page state
5. **Check screenshots**: Auto-captured on failure in `test-results/`
6. **View videos**: Recorded on failure in `test-results/`
7. **Console logs**: Use `page.on('console', msg => console.log(msg.text()))`

## Performance Benchmarks

Expected test execution times:

- Individual test: 2-5 seconds
- Test file: 30-60 seconds
- Full suite: 3-5 minutes
- CI/CD pipeline: 5-10 minutes (including setup)

## Troubleshooting

### Tests fail with "Server not ready"

- Ensure backend is running on port 8788
- Ensure frontend is running on port 3000
- Check `JWT_SECRET_KEY` environment variable

### Tests fail with "demo_user not found"

- Create demo user in database
- Run: `python scripts/create_demo_user.py`

### Tests timeout

- Increase timeout in playwright.config.ts
- Check server logs for errors
- Ensure servers are healthy

### Flaky tests

- Add explicit waits: `await page.waitForTimeout(1000)`
- Use `waitForURL` instead of checking URL immediately
- Add retry logic in playwright.config.ts

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [CI/CD Guide](https://playwright.dev/docs/ci)
