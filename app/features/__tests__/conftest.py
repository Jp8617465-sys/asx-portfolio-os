"""
Pytest configuration for API contract verification tests.

Sets up test environment and fixtures for integration testing.
"""

import os
import sys
import pytest
from unittest.mock import MagicMock, patch

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


@pytest.fixture(autouse=True)
def mock_database_connections():
    """Mock both old and new database access patterns."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()

    # Mock cursor context manager
    mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cursor.__exit__ = MagicMock(return_value=None)

    # Mock connection context manager
    mock_conn.__enter__ = MagicMock(return_value=mock_conn)
    mock_conn.__exit__ = MagicMock(return_value=None)
    mock_conn.cursor = MagicMock(return_value=mock_cursor)

    with patch('app.core.db') as mock_db, \
         patch('app.core.db_context') as mock_ctx, \
         patch('app.core.get_pool') as mock_pool:

        # Mock old db() pattern
        mock_db.return_value = mock_conn

        # Mock new db_context() pattern
        mock_ctx.return_value.__enter__.return_value = mock_conn
        mock_ctx.return_value.__exit__.return_value = None

        # Prevent real connection pool creation
        mock_pool.return_value = MagicMock()

        yield mock_conn, mock_cursor
