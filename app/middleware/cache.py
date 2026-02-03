"""
API Response Caching Middleware

Implements in-memory caching with TTL for frequently accessed endpoints.
For production, consider using Redis for distributed caching.
"""

import time
import hashlib
from functools import wraps
from typing import Optional, Callable, Any
from app.core import logger

# In-memory cache (use Redis in production for distributed caching)
_CACHE: dict[str, tuple[Any, float]] = {}

# Cache TTL configuration (in seconds)
CACHE_TTL = {
    "signals": 3600,       # 1 hour (signals updated daily)
    "prices": 300,         # 5 minutes (prices update frequently)
    "fundamentals": 86400, # 24 hours (fundamentals update weekly)
    "drift": 3600,         # 1 hour
    "ensemble": 3600,      # 1 hour
    "sentiment": 1800,     # 30 minutes
    "portfolio": 600,      # 10 minutes
    "default": 1800,       # 30 minutes
}


def generate_cache_key(prefix: str, *args, **kwargs) -> str:
    """
    Generate a unique cache key from function arguments.

    Args:
        prefix: Cache key prefix (e.g., 'signals_live')
        *args: Positional arguments
        **kwargs: Keyword arguments

    Returns:
        MD5 hash of the arguments as cache key
    """
    key_data = f"{prefix}:{args}:{sorted(kwargs.items())}"
    return hashlib.md5(key_data.encode()).hexdigest()


def cache_response(cache_key_prefix: str, ttl: int = None):
    """
    Decorator to cache API responses with TTL.

    Args:
        cache_key_prefix: Prefix for cache key (e.g., 'signals_live')
        ttl: Time to live in seconds (defaults to CACHE_TTL for prefix)

    Usage:
        @cache_response("signals_live", CACHE_TTL["signals"])
        async def get_live_signals(model: str):
            ...
    """
    if ttl is None:
        # Extract category from prefix (e.g., 'signals_live' -> 'signals')
        category = cache_key_prefix.split('_')[0]
        ttl = CACHE_TTL.get(category, CACHE_TTL["default"])

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = generate_cache_key(cache_key_prefix, *args, **kwargs)

            # Check cache
            if cache_key in _CACHE:
                cached_data, cached_time = _CACHE[cache_key]
                age = time.time() - cached_time

                if age < ttl:
                    logger.debug(f"Cache HIT: {cache_key_prefix} (age: {age:.1f}s)")
                    return cached_data
                else:
                    logger.debug(f"Cache EXPIRED: {cache_key_prefix} (age: {age:.1f}s)")
                    del _CACHE[cache_key]

            # Cache miss - call function
            logger.debug(f"Cache MISS: {cache_key_prefix}")
            result = await func(*args, **kwargs)

            # Store in cache
            _CACHE[cache_key] = (result, time.time())

            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = generate_cache_key(cache_key_prefix, *args, **kwargs)

            # Check cache
            if cache_key in _CACHE:
                cached_data, cached_time = _CACHE[cache_key]
                age = time.time() - cached_time

                if age < ttl:
                    logger.debug(f"Cache HIT: {cache_key_prefix} (age: {age:.1f}s)")
                    return cached_data
                else:
                    logger.debug(f"Cache EXPIRED: {cache_key_prefix} (age: {age:.1f}s)")
                    del _CACHE[cache_key]

            # Cache miss - call function
            logger.debug(f"Cache MISS: {cache_key_prefix}")
            result = func(*args, **kwargs)

            # Store in cache
            _CACHE[cache_key] = (result, time.time())

            return result

        # Return appropriate wrapper based on function type
        import inspect
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


def clear_cache(prefix: Optional[str] = None):
    """
    Clear cached entries.

    Args:
        prefix: If provided, only clear entries matching this prefix.
                If None, clear all cache.
    """
    global _CACHE

    if prefix is None:
        count = len(_CACHE)
        _CACHE.clear()
        logger.info(f"Cleared all cache ({count} entries)")
    else:
        to_delete = [key for key in _CACHE.keys() if key.startswith(prefix)]
        for key in to_delete:
            del _CACHE[key]
        logger.info(f"Cleared cache for prefix '{prefix}' ({len(to_delete)} entries)")


def get_cache_stats() -> dict:
    """
    Get cache statistics.

    Returns:
        dict: Cache statistics including size, hit rate, etc.
    """
    total_entries = len(_CACHE)

    # Calculate size of cached data (approximate)
    total_size = sum(
        len(str(data)) for data, _ in _CACHE.values()
    )

    return {
        "total_entries": total_entries,
        "approximate_size_bytes": total_size,
        "ttl_config": CACHE_TTL,
    }


def invalidate_signals_cache():
    """Invalidate all signals-related cache entries."""
    clear_cache("signals_")
    clear_cache("ensemble_")
    logger.info("Invalidated signals cache")


def invalidate_prices_cache():
    """Invalidate all price-related cache entries."""
    clear_cache("prices_")
    logger.info("Invalidated prices cache")
