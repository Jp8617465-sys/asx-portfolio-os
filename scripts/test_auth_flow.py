#!/usr/bin/env python3
"""
Manual test script for authentication flow.
Demonstrates:
1. User registration
2. User login
3. Token validation
4. User settings management
"""

import os
import sys
import requests
import json

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

API_BASE_URL = "http://localhost:8788"


def test_auth_flow():
    """Test complete authentication flow."""
    print("=" * 60)
    print("ASX Portfolio OS - Authentication Flow Test")
    print("=" * 60)

    # Test 1: Login with existing user
    print("\n1️⃣  Testing login with demo_user...")
    login_response = requests.post(
        f"{API_BASE_URL}/auth/login",
        json={"username": "demo_user", "password": "testpass123"}
    )

    if login_response.status_code == 200:
        data = login_response.json()
        token = data["access_token"]
        print(f"✅ Login successful!")
        print(f"   User: {data['user']['username']}")
        print(f"   Email: {data['user']['email']}")
        print(f"   Token: {token[:20]}...")
    else:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"   {login_response.text}")
        return

    # Test 2: Get current user info
    print("\n2️⃣  Testing get current user...")
    headers = {"Authorization": f"Bearer {token}"}
    me_response = requests.get(f"{API_BASE_URL}/auth/me", headers=headers)

    if me_response.status_code == 200:
        user = me_response.json()
        print(f"✅ Got user info!")
        print(f"   User ID: {user['user_id']}")
        print(f"   Username: {user['username']}")
        print(f"   Created: {user['created_at']}")
    else:
        print(f"❌ Failed to get user info: {me_response.status_code}")
        return

    # Test 3: Get user settings
    print("\n3️⃣  Testing get user settings...")
    settings_response = requests.get(
        f"{API_BASE_URL}/users/me/settings",
        headers=headers
    )

    if settings_response.status_code == 200:
        settings = settings_response.json()
        print(f"✅ Got user settings!")
        print(f"   Settings: {json.dumps(settings['settings'], indent=4)}")
    else:
        print(f"❌ Failed to get settings: {settings_response.status_code}")

    # Test 4: Update user settings
    print("\n4️⃣  Testing update user settings...")
    new_settings = {
        "settings": {
            "theme": "light",
            "notifications_enabled": True,
            "risk_tolerance": "aggressive",
            "custom_field": "test_value"
        }
    }
    update_response = requests.put(
        f"{API_BASE_URL}/users/me/settings",
        headers=headers,
        json=new_settings
    )

    if update_response.status_code == 200:
        updated = update_response.json()
        print(f"✅ Settings updated!")
        print(f"   New settings: {json.dumps(updated['settings'], indent=4)}")
    else:
        print(f"❌ Failed to update settings: {update_response.status_code}")

    # Test 5: Refresh token
    print("\n5️⃣  Testing token refresh...")
    refresh_response = requests.post(
        f"{API_BASE_URL}/auth/refresh",
        headers=headers
    )

    if refresh_response.status_code == 200:
        refreshed = refresh_response.json()
        new_token = refreshed["access_token"]
        print(f"✅ Token refreshed!")
        print(f"   New token: {new_token[:20]}...")
    else:
        print(f"❌ Failed to refresh token: {refresh_response.status_code}")

    print("\n" + "=" * 60)
    print("✅ Authentication flow test complete!")
    print("=" * 60)


if __name__ == "__main__":
    try:
        test_auth_flow()
    except requests.exceptions.ConnectionError:
        print("\n❌ Could not connect to API server.")
        print("   Make sure the server is running: uvicorn app.main:app --port 8788")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
