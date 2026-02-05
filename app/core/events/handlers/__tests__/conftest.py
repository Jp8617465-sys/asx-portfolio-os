"""
Pytest configuration for event handler tests.

Sets up environment variables and fixtures to avoid database dependencies.
"""

import os
import sys

# Set required environment variables before any imports
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/testdb")
os.environ.setdefault("EODHD_API_KEY", "test-api-key")
os.environ.setdefault("OS_API_KEY", "test-os-api-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")

# Ensure project root is in path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
