"""Dependencies for Users Service."""

import sys
import uuid
from functools import lru_cache
from typing import Optional, Dict, Any
import logging

import redis.asyncio as redis
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Import shared libraries
sys.path.append("/app/libs")
from python_shared.config.settings import get_settings, Settings
from python_shared.database.connection import get_async_session
from python_shared.database.models import UserRole

logger = logging.getLogger(__name__)

# Security
security = HTTPBearer(auto_error=False)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@lru_cache()
def get_limiter():
    """Get rate limiter instance."""
    return limiter


# Redis connection
_redis_client: Optional[redis.Redis] = None


async def get_redis_client() -> redis.Redis:
    """Get Redis client instance."""
    global _redis_client
    
    if _redis_client is None:
        settings = get_settings()
        _redis_client = redis.from_url(
            settings.redis_url,
            encoding="utf-8",
            decode_responses=True,
            health_check_interval=30
        )
    
    return _redis_client


async def close_redis_client():
    """Close Redis client connection."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.close()
        _redis_client = None


# Token Claims Model
class TokenClaims:
    """JWT token claims."""
    def __init__(
        self,
        sub: str,
        user_id: str,
        role: str,
        phone: Optional[str] = None,
        email: Optional[str] = None,
        jti: Optional[str] = None,
        exp: Optional[int] = None,
        **kwargs
    ):
        self.sub = sub
        self.user_id = uuid.UUID(user_id)
        self.role = role
        self.phone = phone
        self.email = email
        self.jti = jti
        self.exp = exp


# JWT token functions
def verify_token(token: str) -> TokenClaims:
    """Verify and decode JWT token."""
    settings = get_settings()
    
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        
        return TokenClaims(**payload)
        
    except JWTError as e:
        logger.error(f"JWT verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> TokenClaims:
    """Get current authenticated user from token."""
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    token_claims = verify_token(token)
    
    # Check if token is revoked (in Redis blacklist)
    try:
        redis_client = await get_redis_client()
        revoked = await redis_client.get(f"revoked_token:{token_claims.jti}")
        
        if revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception as e:
        logger.warning(f"Could not check token revocation: {e}")
        # Continue if Redis is unavailable
    
    return token_claims


async def get_current_active_user(
    current_user: TokenClaims = Depends(get_current_user)
) -> TokenClaims:
    """Get current active user (additional checks can be added here)."""
    return current_user


def require_role(required_role: UserRole):
    """Dependency factory for role-based access control."""
    def role_checker(current_user: TokenClaims = Depends(get_current_active_user)) -> TokenClaims:
        if current_user.role != required_role.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role.value}"
            )
        return current_user
    
    return role_checker


def require_admin():
    """Require admin role."""
    return require_role(UserRole.ADMIN)


def require_professional():
    """Require professional role."""
    return require_role(UserRole.PROFESSIONAL)


def require_consumer():
    """Require consumer role."""
    return require_role(UserRole.CONSUMER)


async def get_db_session() -> AsyncSession:
    """Get database session with proper error handling."""
    try:
        async for session in get_async_session():
            yield session
    except Exception as e:
        logger.error(f"Database session error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable"
        )


async def set_row_level_security(
    db: AsyncSession,
    user_id: uuid.UUID,
    role: str = "consumer"
) -> None:
    """Set Row Level Security context for the session."""
    try:
        # Set the current user context for RLS
        await db.execute(
            text("SET LOCAL ofair.current_user_id = :user_id"),
            {"user_id": str(user_id)}
        )
        await db.execute(
            text("SET LOCAL ofair.current_user_role = :role"),
            {"role": role}
        )
        
        # Set timezone to Israel
        await db.execute(
            text("SET LOCAL timezone = 'Asia/Jerusalem'")
        )
        
        logger.debug(f"RLS context set for user {user_id} with role {role}")
        
    except Exception as e:
        logger.error(f"Failed to set RLS context: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to set security context"
        )


# Helper functions for Hebrew validation
def validate_hebrew_text(text: str, field_name: str = "field") -> str:
    """Validate Hebrew text input."""
    if not text or not text.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} cannot be empty"
        )
    
    # Basic Hebrew character validation (Hebrew Unicode range)
    hebrew_chars = any('\u0590' <= char <= '\u05FF' for char in text)
    
    if not hebrew_chars and len(text.split()) > 1:
        # If no Hebrew characters and multiple words, might need Hebrew
        logger.warning(f"Non-Hebrew text in {field_name}: {text}")
    
    return text.strip()


def validate_israeli_phone(phone: str) -> str:
    """Validate Israeli phone number format."""
    # Remove spaces and dashes
    clean_phone = phone.replace(" ", "").replace("-", "")
    
    # Check Israeli phone patterns
    if clean_phone.startswith("+972"):
        # International format
        if len(clean_phone) != 13:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid Israeli phone number format (+972XXXXXXXXX)"
            )
    elif clean_phone.startswith("972"):
        # Without + prefix
        if len(clean_phone) != 12:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid Israeli phone number format (972XXXXXXXXX)"
            )
    elif clean_phone.startswith("0"):
        # Local format
        if len(clean_phone) != 10:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid Israeli phone number format (0XXXXXXXXX)"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Phone number must be in Israeli format"
        )
    
    return clean_phone


def normalize_israeli_phone(phone: str) -> str:
    """Normalize Israeli phone to international format."""
    clean_phone = validate_israeli_phone(phone)
    
    if clean_phone.startswith("+972"):
        return clean_phone
    elif clean_phone.startswith("972"):
        return f"+{clean_phone}"
    elif clean_phone.startswith("0"):
        return f"+972{clean_phone[1:]}"
    
    return clean_phone


# File upload validation
ALLOWED_FILE_EXTENSIONS = {
    'images': {'.jpg', '.jpeg', '.png', '.gif', '.webp'},
    'documents': {'.pdf', '.doc', '.docx', '.txt'},
    'certificates': {'.pdf', '.jpg', '.jpeg', '.png'}
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_file_upload(
    filename: str,
    file_size: int,
    allowed_types: str = 'certificates'
) -> None:
    """Validate file upload parameters."""
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Filename is required"
        )
    
    # Check file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE // 1024 // 1024}MB"
        )
    
    # Check file extension
    file_ext = '.' + filename.lower().split('.')[-1] if '.' in filename else ''
    allowed_extensions = ALLOWED_FILE_EXTENSIONS.get(allowed_types, set())
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"File type not allowed. Allowed types: {', '.join(allowed_extensions)}"
        )


# Location validation for Israeli addresses
ISRAELI_CITIES = [
    "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "אשדוד", "נתניה", "באר שבע",
    "בני ברק", "חולון", "רמת גן", "פתח תקווה", "אשקלון", "כפר סבא", "הרצליה",
    "חדרה", "מודיעין", "רעננה", "בת ים", "קריית מלאכי", "אילת", "טבריה",
    "צפת", "נצרת", "עכו", "קריית גת", "קריית ביאליק", "יהוד", "רחובות",
    "לוד", "רמלה", "מגדל העמק", "אור יהודה", "נס ציונה", "גבעתיים"
]


def validate_israeli_location(location: str) -> str:
    """Validate Israeli location/city."""
    location = location.strip()
    
    if not location:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Location cannot be empty"
        )
    
    # Check if it's a known Israeli city (case-insensitive)
    location_found = any(
        city.lower() in location.lower() or location.lower() in city.lower()
        for city in ISRAELI_CITIES
    )
    
    if not location_found:
        logger.warning(f"Unknown Israeli location: {location}")
        # Don't reject, just log warning for now
    
    return location


# Professional specialties validation
PROFESSIONAL_SPECIALTIES = [
    "שיפוצים כלליים", "חשמל", "מים", "צבע וטיח", "רצפות ואריחים",
    "נגרות ורהיטים", "גינון ונוף", "מערכות מיזוג", "מערכות אבטחה",
    "ניקיון", "הובלות", "טכנאי מחשבים", "מורה פרטי", "טיפוח ויופי",
    "אימון כושר", "רפואה משלימה", "מזון וקייטרינג", "אירועים",
    "צילום", "עיצוב גרפי", "ייעוץ משפטי", "ייעוץ עסקי", "רכב",
    "חיות מחמד", "ביטוח", "נדלן"
]


def validate_specialties(specialties: list[str]) -> list[str]:
    """Validate professional specialties."""
    if not specialties:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one specialty is required"
        )
    
    if len(specialties) > 10:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Maximum 10 specialties allowed"
        )
    
    validated_specialties = []
    for specialty in specialties:
        specialty = specialty.strip()
        if not specialty:
            continue
            
        # Validate Hebrew text
        validate_hebrew_text(specialty, "specialty")
        
        # Check if it's a known specialty
        if specialty not in PROFESSIONAL_SPECIALTIES:
            logger.warning(f"Unknown specialty: {specialty}")
            # Add it anyway, but log for monitoring
        
        validated_specialties.append(specialty)
    
    return validated_specialties