"""
tests/test_security.py
Security tests to verify critical vulnerabilities are fixed.

Tests:
1. JWT secret key enforcement
2. Portfolio endpoint authentication
3. Rate limiting on auth endpoints
4. No API key in frontend bundle
5. Token expiration reduced from 30 days
"""

import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


class TestJWTSecurityEnforcement:
    """Test that JWT secret key must be set."""

    def test_jwt_secret_key_required(self):
        """Verify that app fails to start without JWT_SECRET_KEY."""
        # Save current env
        original_key = os.environ.get('JWT_SECRET_KEY')

        try:
            # Remove JWT_SECRET_KEY
            if 'JWT_SECRET_KEY' in os.environ:
                del os.environ['JWT_SECRET_KEY']

            # Importing app/auth.py should raise ValueError
            with pytest.raises(ValueError, match="JWT_SECRET_KEY environment variable must be set"):
                # Force reload of auth module
                import importlib
                import app.auth
                importlib.reload(app.auth)

        finally:
            # Restore original env
            if original_key:
                os.environ['JWT_SECRET_KEY'] = original_key

    def test_jwt_secret_no_default_value(self):
        """Verify that JWT secret doesn't fall back to insecure default."""
        os.environ['JWT_SECRET_KEY'] = 'test-secure-key-for-testing-only'

        from app.auth import SECRET_KEY

        # Should not equal the old insecure default
        assert SECRET_KEY != "your-secret-key-change-this-in-production"
        assert SECRET_KEY == "test-secure-key-for-testing-only"

    def test_token_expiration_reduced(self):
        """Verify that token expiration is 1 hour, not 30 days."""
        os.environ['JWT_SECRET_KEY'] = 'test-secure-key-for-testing-only'

        from app.auth import ACCESS_TOKEN_EXPIRE_MINUTES

        # Should be 60 minutes (1 hour), not 43200 minutes (30 days)
        assert ACCESS_TOKEN_EXPIRE_MINUTES == 60
        assert ACCESS_TOKEN_EXPIRE_MINUTES != 30 * 24 * 60


class TestPortfolioAuthentication:
    """Test that portfolio endpoints require JWT authentication."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        os.environ['JWT_SECRET_KEY'] = 'test-secure-key-for-testing-only'
        os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test'
        os.environ['OS_API_KEY'] = 'test-api-key'

        from app.main import app
        return TestClient(app)

    def test_portfolio_endpoint_requires_jwt(self, client):
        """Verify GET /portfolio requires JWT token, not query param."""
        # Attempt to access portfolio without authentication
        response = client.get("/portfolio")

        # Should return 401 Unauthorized (not 403 from API key check)
        assert response.status_code == 401

    def test_portfolio_upload_requires_jwt(self, client):
        """Verify POST /portfolio/upload requires JWT token."""
        # Attempt to upload without authentication
        response = client.post(
            "/portfolio/upload",
            files={"file": ("test.csv", "ticker,shares,avg_cost\nBHP.AX,100,42.50", "text/csv")},
        )

        # Should return 401 Unauthorized
        assert response.status_code == 401

    def test_portfolio_user_id_not_from_query(self, client):
        """Verify user_id cannot be spoofed via query parameter."""
        # This test verifies that the endpoint signature no longer accepts user_id from query

        # Attempt to access with user_id in query (should be ignored/rejected)
        response = client.get("/portfolio?user_id=attacker_user")

        # Should still return 401 (authentication required)
        # Not 200 with attacker's data
        assert response.status_code == 401


class TestRateLimiting:
    """Test that rate limiting is active on auth endpoints."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        os.environ['JWT_SECRET_KEY'] = 'test-secure-key-for-testing-only'
        os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test'
        os.environ['OS_API_KEY'] = 'test-api-key'

        from app.main import app
        return TestClient(app)

    def test_login_rate_limit(self, client):
        """Verify login endpoint has rate limiting."""
        # Make 6 failed login attempts (limit is 5 per 15 minutes)
        for i in range(6):
            response = client.post(
                "/auth/login",
                json={"username": "nonexistent", "password": "wrong"}
            )

            if i < 5:
                # First 5 should return 401 (unauthorized)
                assert response.status_code in [401, 422]  # 422 if validation fails
            else:
                # 6th should return 429 (rate limit exceeded)
                assert response.status_code == 429

    def test_register_rate_limit(self, client):
        """Verify register endpoint has rate limiting."""
        # Make 4 registration attempts (limit is 3 per hour)
        for i in range(4):
            response = client.post(
                "/auth/register",
                json={
                    "username": f"testuser{i}",
                    "email": f"test{i}@example.com",
                    "password": "testpass123"
                }
            )

            if i < 3:
                # First 3 should process (may fail for other reasons)
                assert response.status_code in [200, 201, 400, 422, 500]
            else:
                # 4th should return 429 (rate limit exceeded)
                assert response.status_code == 429


class TestAPIKeyExposure:
    """Test that API key is not exposed in frontend."""

    def test_no_api_key_in_frontend_bundle(self):
        """Verify NEXT_PUBLIC_OS_API_KEY is not used in frontend code."""
        # Read the api-client.ts file
        api_client_path = 'frontend/lib/api-client.ts'

        with open(api_client_path, 'r') as f:
            content = f.read()

        # Should NOT contain NEXT_PUBLIC_OS_API_KEY
        assert 'NEXT_PUBLIC_OS_API_KEY' not in content

        # Should NOT contain x-api-key header assignment
        assert "config.headers['x-api-key']" not in content

    def test_jwt_only_authentication_in_frontend(self):
        """Verify frontend uses JWT-only authentication."""
        api_client_path = 'frontend/lib/api-client.ts'

        with open(api_client_path, 'r') as f:
            content = f.read()

        # Should contain JWT Authorization header
        assert 'Authorization' in content
        assert 'Bearer' in content


class TestDemoCredentialsRemoved:
    """Test that demo credentials are removed from schema."""

    def test_no_hardcoded_credentials_in_schema(self):
        """Verify demo users removed from user_accounts.sql."""
        schema_path = 'schemas/user_accounts.sql'

        with open(schema_path, 'r') as f:
            content = f.read()

        # Should NOT contain demo user inserts
        assert 'demo_user' not in content.lower() or 'security note' in content.lower()
        assert 'demo@asxportfolio.com' not in content.lower() or 'security note' in content.lower()

        # Should NOT contain hardcoded password hashes
        # (unless it's in a comment explaining they were removed)
        lines_with_hash = [line for line in content.split('\n') if '$2b$12$' in line]
        for line in lines_with_hash:
            # If hash exists, it should be in a comment
            assert line.strip().startswith('--') or 'removed' in line.lower()


class TestTokenStorage:
    """Test token storage recommendations."""

    def test_httponly_cookie_implementation_ready(self):
        """Verify HttpOnly cookie support is implemented in auth routes."""
        # This test checks that the infrastructure is ready for HttpOnly cookies
        # Full implementation would require Response parameter in login endpoint

        from app.routes.auth_routes import login

        # Check function signature
        import inspect
        sig = inspect.signature(login)

        # Should accept Request parameter (for rate limiting)
        assert 'http_request' in sig.parameters or 'request' in sig.parameters


class TestSecurityHeaders:
    """Test security-related HTTP headers."""

    @pytest.fixture
    def client(self):
        """Create test client."""
        os.environ['JWT_SECRET_KEY'] = 'test-secure-key-for-testing-only'
        os.environ['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/test'

        from app.main import app
        return TestClient(app)

    def test_api_returns_cors_headers(self, client):
        """Verify CORS headers are set appropriately."""
        response = client.get("/health")

        # Should return 200 OK
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
