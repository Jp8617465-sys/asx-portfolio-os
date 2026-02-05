"""Core Module - Infrastructure components."""
import importlib.util
import os
import sys

# Import logger and db_context from parent core.py file
# Note: There's both app/core.py (file) and app/core/ (directory)
# Python prioritizes the directory, so we need to explicitly import from the file

# Construct absolute path to core.py
_core_module_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'core.py')

# Verify the file exists
if not os.path.exists(_core_module_path):
    raise ImportError(f"Cannot find core.py at expected path: {_core_module_path}")

# Load the module
try:
    spec = importlib.util.spec_from_file_location("app._core", _core_module_path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Failed to create module spec for {_core_module_path}")

    _core_module = importlib.util.module_from_spec(spec)
    sys.modules['app._core'] = _core_module
    spec.loader.exec_module(_core_module)
except Exception as e:
    raise ImportError(f"Failed to load core module from {_core_module_path}: {e}")

# Export commonly used utilities from core.py
logger = _core_module.logger
db_context = _core_module.db_context
db = _core_module.db
return_conn = _core_module.return_conn
get_pool = _core_module.get_pool
parse_as_of = _core_module.parse_as_of
require_key = _core_module.require_key
OS_API_KEY = _core_module.OS_API_KEY
EODHD_API_KEY = _core_module.EODHD_API_KEY
ENABLE_ASSISTANT = _core_module.ENABLE_ASSISTANT
OUTPUT_DIR = _core_module.OUTPUT_DIR
PROJECT_ROOT = _core_module.PROJECT_ROOT
DATABASE_URL = _core_module.DATABASE_URL

# Export event bus from core module
from .events import event_bus, EventType, Event

__all__ = [
    "logger",
    "db_context",
    "db",
    "return_conn",
    "get_pool",
    "parse_as_of",
    "require_key",
    "OS_API_KEY",
    "EODHD_API_KEY",
    "ENABLE_ASSISTANT",
    "OUTPUT_DIR",
    "PROJECT_ROOT",
    "DATABASE_URL",
    "event_bus",
    "EventType",
    "Event"
]
