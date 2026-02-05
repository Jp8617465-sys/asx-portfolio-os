"""Core Module - Infrastructure components."""
import importlib.util
import os

# Import logger and db_context from parent core.py file
# Note: There's both app/core.py (file) and app/core/ (directory)
# Python prioritizes the directory, so we need to explicitly import from the file
_core_module_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'core.py')
spec = importlib.util.spec_from_file_location("_core_module", _core_module_path)
_core_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(_core_module)

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
