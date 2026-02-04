"""
api_clients/base_client.py
Base API client class with common patterns: retry, throttling, caching.

All API clients should inherit from this base class for consistent behavior.
"""

import json
import logging
import os
import time
from abc import ABC
from typing import Any, Dict, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Setup logger
logger = logging.getLogger("asx_portfolio_os.api_clients")


class BaseAPIClient(ABC):
    """
    Base class for external API clients with retry and throttling support.

    Features:
    - Automatic retry with exponential backoff
    - Request throttling to respect rate limits
    - Optional file-based caching
    - Consistent error handling
    - Configurable timeouts

    Usage:
        class MyClient(BaseAPIClient):
            def __init__(self):
                super().__init__(
                    base_url="https://api.example.com",
                    throttle_seconds=1.0,
                    default_timeout=30
                )

            def get_data(self, endpoint: str) -> dict:
                return self._request("GET", endpoint)
    """

    def __init__(
        self,
        base_url: str,
        throttle_seconds: float = 1.0,
        default_timeout: int = 30,
        max_retries: int = 3,
        cache_dir: Optional[str] = None,
    ):
        """
        Initialize the base API client.

        Args:
            base_url: The base URL for the API
            throttle_seconds: Minimum seconds between requests
            default_timeout: Default request timeout in seconds
            max_retries: Maximum number of retries for failed requests
            cache_dir: Optional directory for file-based caching
        """
        self.base_url = base_url.rstrip("/")
        self.throttle_seconds = throttle_seconds
        self.default_timeout = default_timeout
        self.cache_dir = cache_dir
        self._last_request_time = 0.0

        # Configure session with retry logic
        self.session = requests.Session()
        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=1.0,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET", "POST"],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def _throttle(self) -> None:
        """Apply throttling between requests."""
        if self.throttle_seconds > 0:
            elapsed = time.time() - self._last_request_time
            if elapsed < self.throttle_seconds:
                sleep_time = self.throttle_seconds - elapsed
                logger.debug(f"Throttling for {sleep_time:.2f}s")
                time.sleep(sleep_time)
        self._last_request_time = time.time()

    def _get_cache_path(self, cache_key: str) -> Optional[str]:
        """Get cache file path for a given key."""
        if not self.cache_dir:
            return None
        os.makedirs(self.cache_dir, exist_ok=True)
        safe_key = cache_key.replace("/", "_").replace(":", "_")
        return os.path.join(self.cache_dir, f"{safe_key}.json")

    def _get_cached(self, cache_key: str) -> Optional[Any]:
        """Get cached data if available."""
        cache_path = self._get_cache_path(cache_key)
        if cache_path and os.path.exists(cache_path):
            try:
                with open(cache_path, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                logger.warning(f"Cache read failed for {cache_key}: {e}")
        return None

    def _set_cached(self, cache_key: str, data: Any) -> None:
        """Save data to cache."""
        cache_path = self._get_cache_path(cache_key)
        if cache_path:
            try:
                with open(cache_path, "w") as f:
                    json.dump(data, f)
            except IOError as e:
                logger.warning(f"Cache write failed for {cache_key}: {e}")

    def _request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        timeout: Optional[int] = None,
        cache_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Make an HTTP request with retry and throttling.

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint (appended to base_url)
            params: Query parameters
            json_data: JSON body for POST requests
            headers: Additional headers
            timeout: Request timeout (uses default if not specified)
            cache_key: If provided, cache the response

        Returns:
            Response JSON as a dictionary

        Raises:
            requests.RequestException: On request failure after retries
        """
        # Check cache first
        if cache_key and method.upper() == "GET":
            cached = self._get_cached(cache_key)
            if cached is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached

        # Apply throttling
        self._throttle()

        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        timeout = timeout or self.default_timeout

        logger.debug(f"{method} {url}")

        try:
            response = self.session.request(
                method=method,
                url=url,
                params=params,
                json=json_data,
                headers=headers,
                timeout=timeout,
            )
            response.raise_for_status()
            data = response.json()

            # Cache successful GET responses
            if cache_key and method.upper() == "GET":
                self._set_cached(cache_key, data)

            return data

        except requests.exceptions.HTTPError as e:
            status_code = e.response.status_code if e.response else "unknown"
            logger.error(f"HTTP error {status_code} for {url}: {e}")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {url}: {e}")
            raise

    def get(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        cache_key: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Make a GET request."""
        return self._request("GET", endpoint, params=params, cache_key=cache_key, **kwargs)

    def post(
        self,
        endpoint: str,
        json_data: Optional[Dict[str, Any]] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Make a POST request."""
        return self._request("POST", endpoint, json_data=json_data, **kwargs)

    def close(self) -> None:
        """Close the session."""
        self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
