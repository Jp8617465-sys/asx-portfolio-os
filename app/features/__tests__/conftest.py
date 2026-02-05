"""
Pytest configuration for API contract verification tests.

Sets up test environment and fixtures for integration testing.
"""

import os
import sys
import pytest

# Set required environment variables before any imports
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")
os.environ.setdefault("EODHD_API_KEY", "test-api-key")
os.environ.setdefault("OS_API_KEY", "test-os-api-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("ENABLE_ASSISTANT", "false")

# Ensure project root is in path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Note: pytest_plugins is defined in root /app/conftest.py
