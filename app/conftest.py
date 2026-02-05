"""
app/conftest.py
Pytest configuration for app tests - sets up test environment variables.
"""

import os
import sys
import pytest

# Set environment variables before any app imports
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db")
os.environ.setdefault("EODHD_API_KEY", "test-api-key")
os.environ.setdefault("OS_API_KEY", "test-os-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("ENABLE_ASSISTANT", "false")

# Configure pytest for async tests
pytest_plugins = ('pytest_asyncio',)
