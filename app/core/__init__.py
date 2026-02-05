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

# Export event bus from core module
from .events import event_bus, EventType, Event

__all__ = [
    "logger",
    "db_context",
    "db",
    "return_conn",
    "get_pool",
    "event_bus",
    "EventType",
    "Event"
]
