"""
E2E Test: Complete authentication flow
Tests user registration, login, token refresh, and settings management
"""

import pytest
from fastapi.testclient import TestClient
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)


class TestE2EAuthFlow:
    """End-to-end authentication flow tests."""

    def test_complete_auth_flow(self):
        """Test complete user lifecycle: register -> login -> use token -> refresh -> settings."""

        # Step 1: Register new user
        register_response = client.post(
            "/auth/register",
            json={
                "username": "e2e_test_user",
                "email": "e2e@test.com",
                "password": "testpass123",
                "full_name": "E2E Test User"
            }
        )

        assert register_response.status_code == 200
        register_data = register_response.json()
        assert "access_token" in register_data
        assert register_data["user"]["username"] == "e2e_test_user"

        token1 = register_data["access_token"]

        # Step 2: Use token to get current user
        me_response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token1}"}
        )

        assert me_response.status_code == 200
        me_data = me_response.json()
        assert me_data["username"] == "e2e_test_user"
        assert me_data["email"] == "e2e@test.com"
        user_id = me_data["user_id"]

        # Step 3: Get user settings (should be created automatically)
        settings_response = client.get(
            "/users/me/settings",
            headers={"Authorization": f"Bearer {token1}"}
        )

        assert settings_response.status_code == 200
        settings_data = settings_response.json()
        assert settings_data["user_id"] == user_id
        assert "settings" in settings_data

        # Step 4: Update user settings
        update_settings_response = client.put(
            "/users/me/settings",
            headers={"Authorization": f"Bearer {token1}"},
            json={
                "settings": {
                    "theme": "light",
                    "notifications_enabled": True,
                    "custom_field": "test_value"
                }
            }
        )

        assert update_settings_response.status_code == 200
        updated_settings = update_settings_response.json()
        assert updated_settings["settings"]["theme"] == "light"
        assert updated_settings["settings"]["custom_field"] == "test_value"

        # Step 5: Logout (log event)
        logout_response = client.post(
            "/auth/logout",
            headers={"Authorization": f"Bearer {token1}"}
        )

        assert logout_response.status_code == 200

        # Step 6: Login again with username
        login_response = client.post(
            "/auth/login",
            json={
                "username": "e2e_test_user",
                "password": "testpass123"
            }
        )

        assert login_response.status_code == 200
        login_data = login_response.json()
        assert "access_token" in login_data
        token2 = login_data["access_token"]

        # Step 7: Login with email (should also work)
        login_email_response = client.post(
            "/auth/login",
            json={
                "username": "e2e@test.com",  # Can use email as username
                "password": "testpass123"
            }
        )

        assert login_email_response.status_code == 200

        # Step 8: Refresh token
        refresh_response = client.post(
            "/auth/refresh",
            headers={"Authorization": f"Bearer {token2}"}
        )

        assert refresh_response.status_code == 200
        refresh_data = refresh_response.json()
        assert "access_token" in refresh_data
        token3 = refresh_data["access_token"]

        # Step 9: Use refreshed token
        final_me_response = client.get(
            "/auth/me",
            headers={"Authorization": f"Bearer {token3}"}
        )

        assert final_me_response.status_code == 200
        assert final_me_response.json()["username"] == "e2e_test_user"

        # Cleanup: Delete test user
        delete_response = client.delete(
            "/users/me",
            headers={"Authorization": f"Bearer {token3}"}
        )

        assert delete_response.status_code == 200

    def test_auth_error_cases(self):
        """Test authentication error handling."""

        # Test 1: Register with existing username
        response1 = client.post(
            "/auth/register",
            json={
                "username": "demo_user",  # Already exists
                "email": "new@test.com",
                "password": "testpass123"
            }
        )
        assert response1.status_code == 400

        # Test 2: Register with existing email
        response2 = client.post(
            "/auth/register",
            json={
                "username": "newuser",
                "email": "demo@asxportfolio.com",  # Already exists
                "password": "testpass123"
            }
        )
        assert response2.status_code == 400

        # Test 3: Login with wrong password
        response3 = client.post(
            "/auth/login",
            json={
                "username": "demo_user",
                "password": "wrongpassword"
            }
        )
        assert response3.status_code == 401

        # Test 4: Login with nonexistent user
        response4 = client.post(
            "/auth/login",
            json={
                "username": "nonexistent",
                "password": "anypassword"
            }
        )
        assert response4.status_code == 401

        # Test 5: Access protected endpoint without token
        response5 = client.get("/auth/me")
        assert response5.status_code == 403  # Missing authentication

        # Test 6: Access with invalid token
        response6 = client.get(
            "/auth/me",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert response6.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
