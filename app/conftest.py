"""
app/conftest.py
Pytest configuration for app tests - sets up test environment variables.
"""

import os
import sys
import pytest
from unittest.mock import MagicMock

# Set environment variables before any app imports
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db")
os.environ.setdefault("EODHD_API_KEY", "test-api-key")
os.environ.setdefault("OS_API_KEY", "test-os-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("ENABLE_ASSISTANT", "false")

# Mock lightgbm if its native library (libomp) is not available.
# This prevents OSError when running tests in environments without the C dependency.
if "lightgbm" not in sys.modules:
    try:
        import lightgbm  # noqa: F401
    except (OSError, ImportError):
        _mock_lgb = MagicMock()
        sys.modules["lightgbm"] = _mock_lgb

# Configure pytest for async tests
pytest_plugins = ('pytest_asyncio',)
