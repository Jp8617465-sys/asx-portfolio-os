"""
app/auth.py
Authentication utilities for JWT token handling and password management.
"""

import os
from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from pwdlib import PasswordHash
from fastapi import HTTPException, Header, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core import db_context, logger

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise ValueError(
        "JWT_SECRET_KEY environment variable must be set. "
        "Generate a secure key with: openssl rand -hex 32"
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # 1 hour (reduced from 30 days for security)
REFRESH_TOKEN_EXPIRE_DAYS = 30  # Refresh tokens valid for 30 days

# Password hashing
pwd_context = PasswordHash.recommended()

# HTTP Bearer token scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password for storage."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.

    Args:
        data: Data to encode in the token (typically {"sub": user_id})
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.

    Args:
        token: JWT token string

    Returns:
        Decoded token payload

    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """
    Extract and validate user_id from JWT token.

    This is a FastAPI dependency that can be used in route functions.

    Args:
        credentials: HTTP Bearer credentials from request header

    Returns:
        user_id from the token

    Raises:
        HTTPException: If token is invalid or user doesn't exist
    """
    token = credentials.credentials
    payload = decode_access_token(token)

    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

    # Verify user exists and is active
    with db_context() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT user_id, is_active
            FROM user_accounts
            WHERE user_id = %s
            """,
            (user_id,)
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=401, detail="User not found")

        if not row[1]:  # is_active
            raise HTTPException(status_code=403, detail="User account is inactive")

    return int(user_id)


def get_current_user(user_id: int = Depends(get_current_user_id)) -> dict:
    """
    Get full user information from user_id.

    This is a FastAPI dependency that can be used in route functions.

    Args:
        user_id: User ID from JWT token

    Returns:
        Dictionary with user information

    Raises:
        HTTPException: If user doesn't exist
    """
    with db_context() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                user_id,
                username,
                email,
                full_name,
                is_active,
                is_verified,
                created_at,
                last_login_at
            FROM user_accounts
            WHERE user_id = %s
            """,
            (user_id,)
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        return {
            "user_id": row[0],
            "username": row[1],
            "email": row[2],
            "full_name": row[3],
            "is_active": row[4],
            "is_verified": row[5],
            "created_at": row[6].isoformat() if row[6] else None,
            "last_login_at": row[7].isoformat() if row[7] else None,
        }


def authenticate_user(username: str, password: str) -> Optional[dict]:
    """
    Authenticate a user by username and password.

    Args:
        username: Username or email
        password: Plain text password

    Returns:
        User dict if authentication successful, None otherwise
    """
    with db_context() as conn:
        cur = conn.cursor()

        # Check both username and email fields
        cur.execute(
            """
            SELECT
                user_id,
                username,
                email,
                password_hash,
                full_name,
                is_active,
                is_verified
            FROM user_accounts
            WHERE username = %s OR email = %s
            """,
            (username, username)
        )
        row = cur.fetchone()

        if not row:
            return None

        user_id, username_db, email, password_hash, full_name, is_active, is_verified = row

        # Verify password
        if not verify_password(password, password_hash):
            return None

        # Check if account is active
        if not is_active:
            raise HTTPException(status_code=403, detail="Account is inactive")

        # Update last login time
        cur.execute(
            "UPDATE user_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE user_id = %s",
            (user_id,)
        )
        conn.commit()

        return {
            "user_id": user_id,
            "username": username_db,
            "email": email,
            "full_name": full_name,
            "is_active": is_active,
            "is_verified": is_verified,
        }


# Optional: Support for API key authentication (backward compatibility)
def get_user_from_api_key(x_api_key: str = Header(None)) -> Optional[int]:
    """
    Get user_id from API key (backward compatibility).

    This allows existing API key authentication to continue working
    while we transition to JWT tokens.

    Args:
        x_api_key: API key from request header

    Returns:
        user_id if API key is valid, None otherwise
    """
    from app.core import OS_API_KEY

    if x_api_key and x_api_key == OS_API_KEY:
        # Return default user (first user) for API key auth
        with db_context() as conn:
            cur = conn.cursor()
            cur.execute("SELECT user_id FROM user_accounts WHERE is_active = TRUE LIMIT 1")
            row = cur.fetchone()
            return row[0] if row else None

    return None


def get_current_user_flexible(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_api_key: Optional[str] = Header(None)
) -> int:
    """
    Get current user from either JWT token or API key.

    This provides backward compatibility during migration.

    Args:
        credentials: Optional JWT token
        x_api_key: Optional API key

    Returns:
        user_id

    Raises:
        HTTPException: If neither auth method is valid
    """
    # Try JWT first
    if credentials:
        return get_current_user_id(credentials)

    # Fall back to API key
    user_id = get_user_from_api_key(x_api_key)
    if user_id:
        return user_id

    raise HTTPException(status_code=401, detail="Authentication required")
