"""
Test authentication system - JWT tokens, login, registration, user management.
"""

import pytest
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.auth import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
    authenticate_user,
)
from app.core import db_context


class TestPasswordHashing:
    """Test password hashing and verification."""

    def test_password_hash_verify(self):
        """Test password hashing and verification."""
        password = "testpassword123"
        hashed = get_password_hash(password)

        # Should not be plaintext
        assert hashed != password

        # Should verify correctly
        assert verify_password(password, hashed) is True

        # Should reject wrong password
        assert verify_password("wrongpassword", hashed) is False

    def test_different_hashes_for_same_password(self):
        """Test that same password produces different hashes (salt)."""
        password = "testpassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        # Hashes should be different due to salt
        assert hash1 != hash2

        # But both should verify
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestJWTTokens:
    """Test JWT token creation and validation."""

    def test_create_and_decode_token(self):
        """Test creating and decoding JWT tokens."""
        user_data = {"sub": "123", "username": "testuser"}
        token = create_access_token(user_data)

        # Should return a string
        assert isinstance(token, str)
        assert len(token) > 0

        # Should decode back to original data
        decoded = decode_access_token(token)
        assert decoded["sub"] == "123"
        assert "exp" in decoded  # Should have expiration

    def test_invalid_token(self):
        """Test that invalid tokens raise exceptions."""
        from fastapi import HTTPException

        with pytest.raises(HTTPException) as exc_info:
            decode_access_token("invalid.token.here")

        assert exc_info.value.status_code == 401


class TestUserAuthentication:
    """Test user authentication."""

    def test_authenticate_valid_user(self):
        """Test authenticating with valid credentials."""
        # Use demo user from schema (password: testpass123)
        user = authenticate_user("demo_user", "testpass123")

        assert user is not None
        assert user["username"] == "demo_user"
        assert user["email"] == "demo@asxportfolio.com"
        assert user["is_active"] is True
        assert "user_id" in user

    def test_authenticate_with_email(self):
        """Test authenticating with email instead of username."""
        user = authenticate_user("demo@asxportfolio.com", "testpass123")

        assert user is not None
        assert user["username"] == "demo_user"

    def test_authenticate_wrong_password(self):
        """Test that wrong password returns None."""
        user = authenticate_user("demo_user", "wrongpassword")
        assert user is None

    def test_authenticate_nonexistent_user(self):
        """Test that nonexistent user returns None."""
        user = authenticate_user("nonexistent_user", "anypassword")
        assert user is None

    def test_last_login_updated(self):
        """Test that last_login_at is updated on successful auth."""
        with db_context() as conn:
            cur = conn.cursor()

            # Get current last_login
            cur.execute(
                "SELECT last_login_at FROM user_accounts WHERE username = 'demo_user'"
            )
            before_login = cur.fetchone()[0]

            # Authenticate
            user = authenticate_user("demo_user", "testpass123")
            assert user is not None

            # Check last_login was updated
            cur.execute(
                "SELECT last_login_at FROM user_accounts WHERE username = 'demo_user'"
            )
            after_login = cur.fetchone()[0]

            # Should be updated (or set if was None)
            if before_login:
                assert after_login > before_login
            else:
                assert after_login is not None


class TestUserQueries:
    """Test user database queries."""

    def test_user_exists(self):
        """Test that demo users exist in database."""
        with db_context() as conn:
            cur = conn.cursor()

            cur.execute("SELECT COUNT(*) FROM user_accounts WHERE username IN ('demo_user', 'test_user')")
            count = cur.fetchone()[0]

            assert count >= 2

    def test_user_settings_exist(self):
        """Test that user settings were created."""
        with db_context() as conn:
            cur = conn.cursor()

            cur.execute(
                """
                SELECT settings
                FROM user_settings
                WHERE user_id = (SELECT user_id FROM user_accounts WHERE username = 'demo_user')
                """
            )
            row = cur.fetchone()

            assert row is not None
            settings = row[0]
            assert "theme" in settings
            assert "notifications_enabled" in settings


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
