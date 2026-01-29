"""
app/routes/auth_routes.py
Authentication endpoints for user login, registration, and token management.
"""

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, EmailStr, validator

from app.auth import (
    authenticate_user,
    create_access_token,
    get_password_hash,
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.core import db_context, logger
from app.middleware.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])


# Request/Response Models
class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @validator('username')
    def username_valid(cls, v):
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        if len(v) > 50:
            raise ValueError('Username must be at most 50 characters')
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, hyphens, and underscores')
        return v

    @validator('password')
    def password_valid(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if len(v) > 100:
            raise ValueError('Password must be at most 100 characters')
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = ACCESS_TOKEN_EXPIRE_MINUTES * 60  # seconds
    user: dict


class UserResponse(BaseModel):
    user_id: int
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: Optional[str]
    last_login_at: Optional[str]


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/15minutes")  # Rate limit: 5 login attempts per 15 minutes per IP
async def login(http_request: Request, request: LoginRequest):
    """
    Authenticate user and return JWT access token.

    **Request Body**:
    - username: Username or email address
    - password: User's password

    **Returns**:
    - access_token: JWT token for authenticated requests
    - token_type: Always "bearer"
    - expires_in: Token expiration time in seconds
    - user: User information

    **Rate Limit**: 5 attempts per 15 minutes per IP address
    """
    user = authenticate_user(request.username, request.password)

    if not user:
        logger.warning(f"Failed login attempt for username: {request.username}")
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    access_token = create_access_token(
        data={"sub": str(user["user_id"])},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    logger.info(f"User logged in: {user['username']} (ID: {user['user_id']})")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "user_id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "full_name": user["full_name"],
            "is_verified": user["is_verified"]
        }
    }


@router.post("/register", response_model=TokenResponse)
@limiter.limit("3/hour")  # Rate limit: 3 registrations per hour per IP
async def register(http_request: Request, request: RegisterRequest):
    """
    Register a new user account.

    **Request Body**:
    - username: Unique username (3-50 characters)
    - email: Valid email address
    - password: Password (minimum 8 characters)
    - full_name: Optional full name

    **Returns**:
    - access_token: JWT token for authenticated requests
    - token_type: Always "bearer"
    - user: Newly created user information

    **Rate Limit**: 3 registrations per hour per IP address
    """
    with db_context() as conn:
        cur = conn.cursor()

        # Check if username already exists
        cur.execute("SELECT username FROM user_accounts WHERE username = %s", (request.username,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Username already registered")

        # Check if email already exists
        cur.execute("SELECT email FROM user_accounts WHERE email = %s", (request.email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        # Hash password
        password_hash = get_password_hash(request.password)

        # Create user
        cur.execute(
            """
            INSERT INTO user_accounts (username, email, password_hash, full_name, is_active, is_verified)
            VALUES (%s, %s, %s, %s, TRUE, FALSE)
            RETURNING user_id, username, email, full_name, is_active, is_verified, created_at
            """,
            (request.username, request.email, password_hash, request.full_name)
        )
        row = cur.fetchone()
        conn.commit()

        user = {
            "user_id": row[0],
            "username": row[1],
            "email": row[2],
            "full_name": row[3],
            "is_active": row[4],
            "is_verified": row[5],
        }

        # Create default user settings
        cur.execute(
            """
            INSERT INTO user_settings (user_id, settings)
            VALUES (%s, %s)
            """,
            (user["user_id"], '{"theme": "dark", "notifications_enabled": true, "risk_tolerance": "moderate"}')
        )
        conn.commit()

        logger.info(f"New user registered: {user['username']} (ID: {user['user_id']})")

        # Create access token for immediate login
        access_token = create_access_token(
            data={"sub": str(user["user_id"])},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "user_id": user["user_id"],
                "username": user["username"],
                "email": user["email"],
                "full_name": user["full_name"],
                "is_verified": user["is_verified"]
            }
        }


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current authenticated user's information.

    Requires valid JWT token in Authorization header.

    **Returns**:
    - user_id: User's unique ID
    - username: Username
    - email: Email address
    - full_name: Full name (if provided)
    - is_active: Account active status
    - is_verified: Email verification status
    - created_at: Account creation timestamp
    - last_login_at: Last login timestamp
    """
    return current_user


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """
    Refresh JWT access token.

    Use this endpoint to get a new token before the current one expires.
    Requires valid JWT token in Authorization header.

    **Returns**:
    - access_token: New JWT token
    - token_type: Always "bearer"
    - expires_in: Token expiration time in seconds
    - user: Current user information
    """
    # Create new access token
    access_token = create_access_token(
        data={"sub": str(current_user["user_id"])},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    logger.info(f"Token refreshed for user: {current_user['username']} (ID: {current_user['user_id']})")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "user_id": current_user["user_id"],
            "username": current_user["username"],
            "email": current_user["email"],
            "full_name": current_user["full_name"],
            "is_verified": current_user["is_verified"]
        }
    }


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout current user.

    Note: JWT tokens are stateless, so this endpoint primarily serves
    to log the logout event. The client should delete the token.

    **Returns**:
    - message: Logout confirmation
    """
    logger.info(f"User logged out: {current_user['username']} (ID: {current_user['user_id']})")

    return {
        "message": "Successfully logged out",
        "detail": "Please delete the access token from client storage"
    }
