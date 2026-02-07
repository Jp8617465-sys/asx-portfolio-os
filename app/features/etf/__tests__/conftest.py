"""
Pytest configuration for ETF repository tests.

Sets up test environment, mocks database connections, and provides
fixtures for testing the ETF repository.
"""

import os
import sys
import pytest
from unittest.mock import MagicMock, patch

# Set required environment variables before any imports
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test_db")
os.environ.setdefault("EODHD_API_KEY", "test-api-key")
os.environ.setdefault("OS_API_KEY", "test-os-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("ENABLE_ASSISTANT", "false")

# Ensure project root is in path
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


@pytest.fixture
def mock_db_context():
    """Mock database context manager."""
    with patch('app.features.etf.repositories.etf_repository.db_context') as mock_ctx:
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        # Setup context manager
        mock_ctx.return_value.__enter__.return_value = mock_conn
        mock_ctx.return_value.__exit__.return_value = None

        # Setup cursor
        mock_conn.cursor.return_value = mock_cursor

        yield {
            'context': mock_ctx,
            'conn': mock_conn,
            'cursor': mock_cursor
        }


@pytest.fixture
def mock_logger():
    """Mock logger."""
    with patch('app.features.etf.repositories.etf_repository.logger') as mock_log:
        yield mock_log


@pytest.fixture
def repository():
    """Create an ETFRepository instance."""
    from app.features.etf.repositories.etf_repository import ETFRepository
    return ETFRepository()
