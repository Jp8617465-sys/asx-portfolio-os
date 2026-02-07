"""
Pytest configuration for ETF service tests.

Mocks EventBus and ETFRepository for isolated unit testing.
"""

import os
import sys
import pytest
from unittest.mock import MagicMock, AsyncMock, patch

# Set required environment variables before any imports
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("EODHD_API_KEY", "test_key")
os.environ.setdefault("OS_API_KEY", "test-os-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("ENABLE_ASSISTANT", "false")

# Ensure project root is in path
PROJECT_ROOT = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)


@pytest.fixture
def mock_event_bus():
    """Mock EventBus to prevent actual event publishing during tests."""
    with patch('app.core.service.event_bus') as mock_bus:
        mock_bus.publish = AsyncMock()
        yield mock_bus


@pytest.fixture
def mock_etf_repository():
    """Mock ETFRepository for dependency injection."""
    mock_repo = MagicMock()

    # Mock common repository methods
    mock_repo.get_etf_holdings = MagicMock()
    mock_repo.get_etf_list = MagicMock()
    mock_repo.get_sector_allocation = MagicMock()

    return mock_repo
