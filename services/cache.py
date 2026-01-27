"""
Simple in-memory caching for API endpoints
Provides TTL-based caching to reduce database load
"""

import time
from typing import Any, Callable, Optional
from functools import wraps
import hashlib
import json


class SimpleCache:
    """
    Thread-safe in-memory cache with TTL support
    Suitable for single-instance deployments or low-traffic
    For multi-instance: use Redis or Memcached
    """

    def __init__(self):
        self._cache = {}
        self._timestamps = {}

    def _generate_key(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """Generate cache key from function name and arguments"""
        # Convert args and kwargs to a stable string representation
        key_data = {
            "func": func_name,
            "args": args,
            "kwargs": kwargs
        }
        key_str = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.md5(key_str.encode()).hexdigest()

    def get(self, key: str, ttl: int = 300) -> Optional[Any]:
        """
        Get value from cache if it exists and is not expired

        Args:
            key: Cache key
            ttl: Time-to-live in seconds

        Returns:
            Cached value or None if expired/not found
        """
        if key not in self._cache:
            return None

        # Check if expired
        timestamp = self._timestamps.get(key, 0)
        if time.time() - timestamp > ttl:
            # Expired - remove from cache
            del self._cache[key]
            del self._timestamps[key]
            return None

        return self._cache[key]

    def set(self, key: str, value: Any):
        """Store value in cache with current timestamp"""
        self._cache[key] = value
        self._timestamps[key] = time.time()

    def clear(self, pattern: Optional[str] = None):
        """
        Clear cache entries

        Args:
            pattern: If provided, only clear keys containing this pattern
        """
        if pattern is None:
            self._cache.clear()
            self._timestamps.clear()
        else:
            keys_to_delete = [k for k in self._cache.keys() if pattern in k]
            for key in keys_to_delete:
                del self._cache[key]
                del self._timestamps[key]

    def stats(self) -> dict:
        """Get cache statistics"""
        return {
            "size": len(self._cache),
            "keys": list(self._cache.keys())[:10]  # First 10 keys
        }


# Global cache instance
_cache = SimpleCache()


def cached(ttl: int = 300):
    """
    Decorator to cache function results

    Args:
        ttl: Time-to-live in seconds (default: 5 minutes)

    Example:
        @cached(ttl=300)  # Cache for 5 minutes
        def expensive_computation(x, y):
            return x + y
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = _cache._generate_key(func.__name__, args, kwargs)

            # Try to get from cache
            cached_result = _cache.get(cache_key, ttl=ttl)
            if cached_result is not None:
                return cached_result

            # Compute result
            result = func(*args, **kwargs)

            # Store in cache
            _cache.set(cache_key, result)

            return result

        # Add cache control methods to wrapper
        wrapper.cache_clear = lambda: _cache.clear(func.__name__)
        wrapper.cache_stats = lambda: _cache.stats()

        return wrapper

    return decorator


def clear_cache(pattern: Optional[str] = None):
    """
    Clear cache entries

    Args:
        pattern: If provided, only clear keys containing this pattern
    """
    _cache.clear(pattern)


def get_cache_stats() -> dict:
    """Get cache statistics"""
    return _cache.stats()


# Example usage in API routes:
#
# from services.cache import cached
#
# @cached(ttl=300)  # Cache for 5 minutes
# def fetch_dashboard_data():
#     # Expensive database query
#     return data
#
# # Manual cache clearing:
# from services.cache import clear_cache
# clear_cache("dashboard")  # Clear all dashboard caches
