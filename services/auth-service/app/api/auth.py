"""Authentication API endpoints."""

import sys
import json
import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, status, Depends, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

# Import shared libraries
from python_shared.config.settings import get_settings

# Import local modules
from ..models.auth import (
    SendOTPRequest, SendOTPResponse,
    VerifyOTPRequest, VerifyOTPResponse,
    RefreshTokenRequest, RefreshTokenResponse,
    RevokeTokenRequest, RevokeTokenResponse,
    TokenData, TokenClaims, UserStatus, UserRole, ContactType
)
from ..deps import (
    get_redis_client, get_current_user, get_limiter,
    create_access_token, verify_token,
    check_otp_rate_limit, check_verification_rate_limit,
    mask_contact
)
from ..services.otp_service import otp_service
from ..database import db

logger = logging.getLogger(__name__)

router = APIRouter()
settings = get_settings()


@router.post(
    "/send-otp",
    response_model=SendOTPResponse,
    summary="Send OTP",
    description="Send OTP to phone number or email address"
)
async def send_otp(
    request: SendOTPRequest,
    http_request: Request,
    limiter: Limiter = Depends(get_limiter)
):
    """Send OTP to the provided contact."""
    
    # Apply rate limiting per contact
    @limiter.limit("3/minute")
    async def _send_otp_with_limit(request: Request):
        pass
    
    await _send_otp_with_limit(http_request)
    
    try:
        # Check contact-specific rate limits
        allowed, retry_after = await check_otp_rate_limit(request.contact)
        
        if not allowed:
            return SendOTPResponse(
                success=False,
                message="Too many OTP requests. Please wait before trying again.",
                message_he="יותר מדי בקשות לקוד אימות. אנא המתן לפני שתנסה שוב.",
                contact_type=request.contact_type,
                masked_contact=mask_contact(request.contact, request.contact_type),
                expires_in=0,
                retry_after=retry_after
            )

        # Check if user exists and has professional role (Pro app only allows professionals)
        if request.contact_type == ContactType.PHONE or (not request.contact_type and '@' not in request.contact):
            is_professional = await db.check_professional_exists(request.contact)
            if not is_professional:
                # Check if user exists but is not a professional
                user_data = await db.get_user_by_phone(request.contact)
                if user_data and user_data.get('role') == 'customer':
                    return SendOTPResponse(
                        success=False,
                        message="Access denied. This app is for professionals only.",
                        message_he="גישה נדחתה. האפליקציה הזו מיועדת לבעלי מקצוע בלבד.",
                        contact_type=request.contact_type or ContactType.PHONE,
                        masked_contact=mask_contact(request.contact, request.contact_type or ContactType.PHONE),
                        expires_in=0,
                        retry_after=None
                    )
                else:
                    return SendOTPResponse(
                        success=False,
                        message="Professional not registered. Please register first.",
                        message_he="בעל מקצוע לא רשום במערכת. יש להירשם תחילה.",
                        contact_type=request.contact_type or ContactType.PHONE,
                        masked_contact=mask_contact(request.contact, request.contact_type or ContactType.PHONE),
                        expires_in=0,
                        retry_after=None
                    )

        # Send OTP
        success, message_en, message_he = await otp_service.send_otp(
            request.contact,
            request.contact_type,
            request.language
        )
        
        if success:
            return SendOTPResponse(
                success=True,
                message=message_en,
                message_he=message_he,
                contact_type=request.contact_type,
                masked_contact=mask_contact(request.contact, request.contact_type),
                expires_in=otp_service.otp_expiry_minutes * 60,
                retry_after=None
            )
        else:
            return SendOTPResponse(
                success=False,
                message=message_en,
                message_he=message_he,
                contact_type=request.contact_type,
                masked_contact=mask_contact(request.contact, request.contact_type),
                expires_in=0,
                retry_after=None
            )
            
    except Exception as e:
        logger.error(f"Error in send_otp: {e}")
        return SendOTPResponse(
            success=False,
            message="Failed to send OTP due to server error",
            message_he="שליחת קוד האימות נכשלה עקב שגיאת שרת",
            contact_type=request.contact_type,
            masked_contact=mask_contact(request.contact, request.contact_type),
            expires_in=0,
            retry_after=None
        )


@router.post(
    "/verify-otp",
    response_model=VerifyOTPResponse,
    summary="Verify OTP",
    description="Verify OTP and return authentication token"
)
async def verify_otp(
    request: VerifyOTPRequest,
    http_request: Request,
    limiter: Limiter = Depends(get_limiter)
):
    """Verify OTP and return authentication tokens."""
    
    # Apply rate limiting for verification
    @limiter.limit("10/minute")
    async def _verify_otp_with_limit(request: Request):
        pass
    
    await _verify_otp_with_limit(http_request)
    
    try:
        # Check verification rate limits
        allowed, retry_after = await check_verification_rate_limit(request.contact)
        
        if not allowed:
            return VerifyOTPResponse(
                success=False,
                message="Too many verification attempts. Please wait before trying again.",
                message_he="יותר מדי ניסיונות אימות. אנא המתן לפני שתנסה שוב.",
                token_data=None,
                user_status=None,
                is_new_user=None
            )
        
        # Verify OTP
        success, message_en, message_he, is_new_user = await otp_service.verify_otp(
            request.contact,
            request.otp
        )
        
        if not success:
            return VerifyOTPResponse(
                success=False,
                message=message_en,
                message_he=message_he,
                token_data=None,
                user_status=None,
                is_new_user=None
            )
        
        # Get user data with role and profile information
        user_data = await db.get_user_by_phone(request.contact) if "@" not in request.contact else None
        if not user_data and not is_new_user:
            return VerifyOTPResponse(
                success=False,
                message="User not found in system",
                message_he="המשתמש לא נמצא במערכת",
                token_data=None,
                user_status=None,
                is_new_user=None
            )

        # Create user session and tokens
        user_id = await _get_or_create_user(request.contact, is_new_user, user_data)

        # Determine contact type
        contact_type = "email" if "@" in request.contact else "phone"

        # Get role from user data or default to professional for pro app
        user_role = user_data.get('role', 'professional') if user_data else 'professional'

        # Verify user has professional role for pro app access
        if user_role != 'professional':
            return VerifyOTPResponse(
                success=False,
                message="Access denied. This app is for professionals only.",
                message_he="גישה נדחתה. האפליקציה הזו מיועדת לבעלי מקצוע בלבד.",
                token_data=None,
                user_status=None,
                is_new_user=None
            )

        # Create token claims with role and profile information
        now = datetime.utcnow()
        exp = now + timedelta(minutes=settings.jwt_expire_minutes)
        jti = str(uuid.uuid4())  # Unique token ID for revocation

        token_claims = {
            "sub": user_id,
            "user_id": user_id,  # Include user_id for service compatibility
            "contact": request.contact,
            "contact_type": contact_type,
            "role": user_role,
            "profile_id": user_data.get('professional_profile_id') if user_data else None,
            "business_name": user_data.get('business_name') if user_data else None,
            "service_category": user_data.get('service_category') if user_data else None,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "jti": jti
        }
        
        # Create tokens
        access_token = create_access_token(token_claims)
        refresh_token = await _create_refresh_token(user_id, jti, request.contact, contact_type, user_role)
        
        # Store session info
        await _store_user_session(user_id, jti, request.device_info)
        
        token_data = TokenData(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.jwt_expire_minutes * 60,
            user_id=user_id,
            user_role=UserRole.PROFESSIONAL if user_role == 'professional' else UserRole.CONSUMER
        )
        
        return VerifyOTPResponse(
            success=True,
            message=message_en,
            message_he=message_he,
            token_data=token_data,
            user_status=UserStatus.ACTIVE if not is_new_user else UserStatus.PENDING_VERIFICATION,
            is_new_user=is_new_user
        )
        
    except Exception as e:
        logger.error(f"Error in verify_otp: {e}")
        return VerifyOTPResponse(
            success=False,
            message="OTP verification failed due to server error",
            message_he="אימות הקוד נכשל עקב שגיאת שרת",
            token_data=None,
            user_status=None,
            is_new_user=None
        )


@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
    summary="Refresh Token",
    description="Refresh access token using refresh token"
)
async def refresh_token(
    request: RefreshTokenRequest,
    limiter: Limiter = Depends(get_limiter)
):
    """Refresh access token."""
    
    try:
        redis_client = await get_redis_client()
        
        # Verify refresh token
        refresh_data = await redis_client.get(f"refresh_token:{request.refresh_token}")
        if not refresh_data:
            return RefreshTokenResponse(
                success=False,
                message="Invalid or expired refresh token",
                message_he="אסימון רענון לא תקין או פג תוקף",
                token_data=None
            )
        
        refresh_info = json.loads(refresh_data)
        user_id = refresh_info["user_id"]
        old_jti = refresh_info["jti"]
        
        # Create new token claims
        now = datetime.utcnow()
        exp = now + timedelta(minutes=settings.jwt_expire_minutes)
        new_jti = str(uuid.uuid4())
        
        # Get current user info from database for fresh profile data
        contact = refresh_info.get("contact", "")
        contact_type = refresh_info.get("contact_type", "phone")

        # Get fresh user data from database
        user_data = await db.get_user_by_phone(contact) if contact_type == "phone" else None
        role = user_data.get('role', 'professional') if user_data else 'professional'
        
        token_claims = {
            "sub": user_id,
            "user_id": user_id,
            "contact": contact,
            "contact_type": contact_type,
            "role": role,
            "profile_id": user_data.get('professional_profile_id') if user_data else None,
            "business_name": user_data.get('business_name') if user_data else None,
            "service_category": user_data.get('service_category') if user_data else None,
            "iat": int(now.timestamp()),
            "exp": int(exp.timestamp()),
            "jti": new_jti
        }
        
        # Create new tokens
        access_token = create_access_token(token_claims)
        new_refresh_token = await _create_refresh_token(user_id, new_jti, contact, contact_type, role)
        
        # Revoke old refresh token
        await redis_client.delete(f"refresh_token:{request.refresh_token}")
        
        # Revoke old access token (add to blacklist)
        await redis_client.setex(f"revoked_token:{old_jti}", 3600, "1")
        
        token_data = TokenData(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=settings.jwt_expire_minutes * 60,
            user_id=user_id,
            user_role=UserRole(role)
        )
        
        return RefreshTokenResponse(
            success=True,
            message="Token refreshed successfully",
            message_he="האסימון עודכן בהצלחה",
            token_data=token_data
        )
        
    except Exception as e:
        logger.error(f"Error in refresh_token: {e}")
        return RefreshTokenResponse(
            success=False,
            message="Token refresh failed due to server error",
            message_he="עדכון האסימון נכשל עקב שגיאת שרת",
            token_data=None
        )


@router.post(
    "/revoke",
    response_model=RevokeTokenResponse,
    summary="Revoke Token",
    description="Revoke access token(s)"
)
async def revoke_token(
    request: RevokeTokenRequest,
    current_user: TokenClaims = Depends(get_current_user)
):
    """Revoke authentication tokens."""
    
    try:
        redis_client = await get_redis_client()
        revoked_count = 0
        
        if request.all_tokens:
            # Revoke all tokens for the user
            # In a real implementation, you would need to track all active sessions
            # For now, we'll revoke the current token
            await redis_client.setex(f"revoked_token:{current_user.jti}", 3600, "1")
            revoked_count = 1
            
            # Also revoke refresh tokens (pattern matching)
            pattern = f"refresh_token:*:{current_user.sub}"
            async for key in redis_client.scan_iter(match=pattern):
                await redis_client.delete(key)
                revoked_count += 1
        
        elif request.token:
            # Revoke specific token
            try:
                token_claims = verify_token(request.token)
                await redis_client.setex(f"revoked_token:{token_claims.jti}", 3600, "1")
                revoked_count = 1
            except Exception:
                return RevokeTokenResponse(
                    success=False,
                    message="Invalid token provided",
                    message_he="אסימון לא תקין",
                    revoked_count=0
                )
        else:
            # Revoke current token
            await redis_client.setex(f"revoked_token:{current_user.jti}", 3600, "1")
            revoked_count = 1
        
        return RevokeTokenResponse(
            success=True,
            message="Token(s) revoked successfully",
            message_he="האסימון(ים) בוטל(ו) בהצלחה",
            revoked_count=revoked_count
        )
        
    except Exception as e:
        logger.error(f"Error in revoke_token: {e}")
        return RevokeTokenResponse(
            success=False,
            message="Token revocation failed due to server error",
            message_he="ביטול האסימון נכשל עקב שגיאת שרת",
            revoked_count=0
        )


@router.get(
    "/me",
    summary="Get Current User",
    description="Get current authenticated user information"
)
async def get_current_user_info(
    current_user: TokenClaims = Depends(get_current_user)
):
    """Get current user information."""
    
    return {
        "user_id": current_user.sub,
        "contact": current_user.contact,
        "contact_type": current_user.contact_type,
        "role": current_user.role,
        "authenticated": True,
        "message": "User authenticated successfully",
        "message_he": "המשתמש מאומת בהצלחה"
    }


@router.post(
    "/logout",
    summary="Logout",
    description="Logout user and revoke current token"
)
async def logout(
    current_user: TokenClaims = Depends(get_current_user)
):
    """Logout user and revoke current token."""
    
    try:
        redis_client = await get_redis_client()
        
        # Revoke current token
        await redis_client.setex(f"revoked_token:{current_user.jti}", 3600, "1")
        
        return {
            "success": True,
            "message": "Logged out successfully",
            "message_he": "התנתקת בהצלחה"
        }
        
    except Exception as e:
        logger.error(f"Error in logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed due to server error"
        )


# Helper functions
async def _get_or_create_user(contact: str, is_new_user: bool, user_data: dict = None) -> str:
    """Get existing user or create new user in database."""
    from python_shared.database.connection import get_db_engine
    from sqlalchemy import text

    try:
        engine = await get_db_engine()

        # Determine contact type
        contact_type = "email" if "@" in contact else "phone"

        # Check if user exists
        if contact_type == "email":
            query = text("SELECT id FROM users WHERE email = :contact LIMIT 1")
        else:
            query = text("SELECT id FROM users WHERE phone = :contact LIMIT 1")

        async with engine.begin() as conn:
            result = await conn.execute(query, {"contact": contact})
            existing_user = result.fetchone()

            if existing_user:
                user_id = str(existing_user[0])
                logger.info(f"Existing user found: {user_id}")
                return user_id
            elif user_data and user_data.get('id'):
                # Use user_id from provided user_data
                user_id = str(user_data['id'])
                logger.info(f"User ID from provided data: {user_id}")
                return user_id

            # Create new user if is_new_user or doesn't exist
            if is_new_user:
                insert_data = {
                    "role": "customer",
                    "status": "pending_verification"
                }

                if contact_type == "email":
                    insert_data["email"] = contact
                    insert_query = text("""
                        INSERT INTO users (email, role, status)
                        VALUES (:email, :role, :status)
                        RETURNING id
                    """)
                else:
                    insert_data["phone"] = contact
                    insert_query = text("""
                        INSERT INTO users (phone, role, status)
                        VALUES (:phone, :role, :status)
                        RETURNING id
                    """)

                result = await conn.execute(insert_query, insert_data)
                new_user = result.fetchone()
                user_id = str(new_user[0])

                logger.info(f"New user created: {user_id} for contact: {contact}")
                return user_id
            else:
                # Fallback - shouldn't happen
                logger.warning(f"User not found and is_new_user is False for {contact}")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

    except Exception as e:
        logger.error(f"Error in _get_or_create_user: {e}")
        # Generate a UUID as fallback
        import uuid
        user_id = str(uuid.uuid4())
        logger.warning(f"Fallback UUID generated: {user_id}")
        return user_id


async def _create_refresh_token(user_id: str, jti: str, contact: str = "", contact_type: str = "phone", role: str = "professional") -> str:
    """Create and store refresh token."""
    redis_client = await get_redis_client()
    
    refresh_token = str(uuid.uuid4())
    refresh_data = {
        "user_id": user_id,
        "jti": jti,
        "contact": contact,
        "contact_type": contact_type,
        "role": role,
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(days=30)).isoformat()
    }
    
    # Store refresh token (30 days expiry)
    await redis_client.setex(
        f"refresh_token:{refresh_token}",
        30 * 24 * 60 * 60,  # 30 days
        json.dumps(refresh_data)
    )
    
    return refresh_token


async def _store_user_session(user_id: str, jti: str, device_info: Dict[str, Any] = None):
    """Store user session information."""
    redis_client = await get_redis_client()
    
    session_data = {
        "user_id": user_id,
        "jti": jti,
        "created_at": datetime.utcnow().isoformat(),
        "device_info": device_info or {},
        "last_activity": datetime.utcnow().isoformat()
    }
    
    # Store session info
    await redis_client.setex(
        f"session:{jti}",
        settings.jwt_expire_minutes * 60,
        json.dumps(session_data)
    )