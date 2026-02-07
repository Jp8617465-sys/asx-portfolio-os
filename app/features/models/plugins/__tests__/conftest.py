import os
import sys
from unittest.mock import MagicMock, patch, AsyncMock

# Environment variables must be set before any app imports
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("EODHD_API_KEY", "test_key")
os.environ.setdefault("OS_API_KEY", "test_key")

# Mock lightgbm before it gets imported by model_a.py
# lightgbm's native library (libomp) may not be available in CI/test environments
_mock_lgb = MagicMock()
_mock_lgb.LGBMClassifier = MagicMock
_mock_lgb.LGBMRegressor = MagicMock
sys.modules.setdefault("lightgbm", _mock_lgb)

import pytest  # noqa: E402
