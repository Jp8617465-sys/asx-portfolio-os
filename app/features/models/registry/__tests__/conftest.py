import os
import pytest
from unittest.mock import MagicMock, patch, AsyncMock

os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("EODHD_API_KEY", "test_key")
os.environ.setdefault("OS_API_KEY", "test_key")
