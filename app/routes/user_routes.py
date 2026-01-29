"""
app/routes/user_routes.py
User management endpoints for settings, preferences, and account management.
"""

from typing import Optional, Any, Dict

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

from app.auth import get_current_user_id, get_current_user, get_password_hash, verify_password
from app.core import db_context, logger

router = APIRouter(prefix="/users", tags=["User Management"])


# Request/Response Models
class UpdateUserRequest(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None


class UpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserSettingsRequest(BaseModel):
    settings: Dict[str, Any]


class UserSettingsResponse(BaseModel):
    user_id: int
    settings: Dict[str, Any]
    updated_at: str


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current user's information.

    **Returns**:
    - user_id: User's unique ID
    - username: Username
    - email: Email address
    - full_name: Full name
    - is_active: Account status
    - is_verified: Email verification status
    - created_at: Account creation date
    - last_login_at: Last login timestamp
    """
    return current_user


@router.patch("/me")
async def update_current_user(
    request: UpdateUserRequest,
    user_id: int = Depends(get_current_user_id)
):
    """
    Update current user's profile information.

    **Request Body**:
    - email: New email address (optional)
    - full_name: New full name (optional)

    **Returns**:
    - Updated user information
    """
    with db_context() as conn:
        cur = conn.cursor()

        updates = []
        params = []

        if request.email is not None:
            # Check if email already exists for another user
            cur.execute(
                "SELECT user_id FROM user_accounts WHERE email = %s AND user_id != %s",
                (request.email, user_id)
            )
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Email already in use")

            updates.append("email = %s")
            params.append(request.email)

        if request.full_name is not None:
            updates.append("full_name = %s")
            params.append(request.full_name)

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.append(user_id)

        cur.execute(
            f"""
            UPDATE user_accounts
            SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            RETURNING user_id, username, email, full_name, is_active, is_verified, created_at, last_login_at
            """,
            params
        )
        row = cur.fetchone()
        conn.commit()

        logger.info(f"User profile updated: user_id={user_id}")

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


@router.post("/me/password")
async def update_password(
    request: UpdatePasswordRequest,
    user_id: int = Depends(get_current_user_id)
):
    """
    Update current user's password.

    **Request Body**:
    - current_password: Current password for verification
    - new_password: New password (minimum 8 characters)

    **Returns**:
    - Success message
    """
    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    with db_context() as conn:
        cur = conn.cursor()

        # Get current password hash
        cur.execute(
            "SELECT password_hash FROM user_accounts WHERE user_id = %s",
            (user_id,)
        )
        row = cur.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="User not found")

        # Verify current password
        if not verify_password(request.current_password, row[0]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        # Hash new password
        new_password_hash = get_password_hash(request.new_password)

        # Update password
        cur.execute(
            "UPDATE user_accounts SET password_hash = %s, updated_at = CURRENT_TIMESTAMP WHERE user_id = %s",
            (new_password_hash, user_id)
        )
        conn.commit()

        logger.info(f"Password updated for user_id={user_id}")

        return {"message": "Password updated successfully"}


@router.get("/me/settings", response_model=UserSettingsResponse)
async def get_user_settings(user_id: int = Depends(get_current_user_id)):
    """
    Get current user's settings.

    **Returns**:
    - user_id: User's ID
    - settings: User settings as JSON object
    - updated_at: Last update timestamp
    """
    with db_context() as conn:
        cur = conn.cursor()

        cur.execute(
            "SELECT user_id, settings, updated_at FROM user_settings WHERE user_id = %s",
            (user_id,)
        )
        row = cur.fetchone()

        if not row:
            # Create default settings if none exist
            default_settings = {
                "theme": "dark",
                "notifications_enabled": True,
                "risk_tolerance": "moderate",
                "default_portfolio": None
            }

            cur.execute(
                """
                INSERT INTO user_settings (user_id, settings)
                VALUES (%s, %s)
                RETURNING user_id, settings, updated_at
                """,
                (user_id, str(default_settings).replace("'", '"'))
            )
            row = cur.fetchone()
            conn.commit()

        return {
            "user_id": row[0],
            "settings": row[1],
            "updated_at": row[2].isoformat()
        }


@router.put("/me/settings", response_model=UserSettingsResponse)
async def update_user_settings(
    request: UserSettingsRequest,
    user_id: int = Depends(get_current_user_id)
):
    """
    Update current user's settings.

    **Request Body**:
    - settings: Complete settings object (will replace existing settings)

    **Returns**:
    - user_id: User's ID
    - settings: Updated settings
    - updated_at: Update timestamp
    """
    with db_context() as conn:
        cur = conn.cursor()

        # Check if settings exist
        cur.execute("SELECT user_id FROM user_settings WHERE user_id = %s", (user_id,))

        if cur.fetchone():
            # Update existing settings
            cur.execute(
                """
                UPDATE user_settings
                SET settings = %s, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                RETURNING user_id, settings, updated_at
                """,
                (str(request.settings).replace("'", '"'), user_id)
            )
        else:
            # Insert new settings
            cur.execute(
                """
                INSERT INTO user_settings (user_id, settings)
                VALUES (%s, %s)
                RETURNING user_id, settings, updated_at
                """,
                (user_id, str(request.settings).replace("'", '"'))
            )

        row = cur.fetchone()
        conn.commit()

        logger.info(f"Settings updated for user_id={user_id}")

        return {
            "user_id": row[0],
            "settings": row[1],
            "updated_at": row[2].isoformat()
        }


@router.patch("/me/settings")
async def patch_user_settings(
    request: UserSettingsRequest,
    user_id: int = Depends(get_current_user_id)
):
    """
    Partially update user settings (merge with existing).

    **Request Body**:
    - settings: Partial settings object (will be merged with existing)

    **Returns**:
    - user_id: User's ID
    - settings: Merged settings
    - updated_at: Update timestamp
    """
    with db_context() as conn:
        cur = conn.cursor()

        # Get existing settings
        cur.execute("SELECT settings FROM user_settings WHERE user_id = %s", (user_id,))
        row = cur.fetchone()

        if row:
            # Merge with existing settings
            existing_settings = row[0]
            existing_settings.update(request.settings)
            merged_settings = existing_settings
        else:
            # Use provided settings as is
            merged_settings = request.settings

        # Update or insert
        cur.execute(
            """
            INSERT INTO user_settings (user_id, settings)
            VALUES (%s, %s)
            ON CONFLICT (user_id)
            DO UPDATE SET settings = EXCLUDED.settings, updated_at = CURRENT_TIMESTAMP
            RETURNING user_id, settings, updated_at
            """,
            (user_id, str(merged_settings).replace("'", '"'))
        )

        row = cur.fetchone()
        conn.commit()

        logger.info(f"Settings patched for user_id={user_id}")

        return {
            "user_id": row[0],
            "settings": row[1],
            "updated_at": row[2].isoformat()
        }


@router.delete("/me")
async def delete_account(user_id: int = Depends(get_current_user_id)):
    """
    Soft delete current user's account.

    Sets is_active to FALSE instead of deleting the record.

    **Returns**:
    - Success message
    """
    with db_context() as conn:
        cur = conn.cursor()

        cur.execute(
            "UPDATE user_accounts SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE user_id = %s",
            (user_id,)
        )
        conn.commit()

        logger.warning(f"User account deactivated: user_id={user_id}")

        return {
            "message": "Account deactivated successfully",
            "detail": "Your account has been deactivated. Contact support to reactivate."
        }
