"""Dependencies for Auth Service."""

import sys
from functools import lru_cache
from typing import Optional, Dict, Any
import logging

import redis.asyncio as redis
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address

# Import shared libraries
from python_shared.config.settings import get_settings, Settings

# Import local models
from .models.auth import TokenClaims, UserRole, ContactType

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


# JWT token functions
def create_access_token(data: Dict[str, Any], expires_delta: Optional[int] = None) -> str:
    """Create JWT access token."""
    settings = get_settings()
    
    to_encode = data.copy()
    
    if expires_delta:
        expire = expires_delta
    else:
        expire = settings.jwt_expire_minutes * 60  # Convert to seconds
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt


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
    redis_client = await get_redis_client()
    revoked = await redis_client.get(f"revoked_token:{token_claims.jti}")
    
    if revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token_claims


async def get_current_active_user(
    current_user: TokenClaims = Depends(get_current_user)
) -> TokenClaims:
    """Get current active user (additional checks can be added here)."""
    return current_user


async def require_role(required_role: UserRole):
    """Dependency factory for role-based access control."""
    def role_checker(current_user: TokenClaims = Depends(get_current_active_user)) -> TokenClaims:
        if current_user.role != required_role.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {required_role.value}"
            )
        return current_user
    
    return role_checker


async def require_admin():
    """Require admin role."""
    return await require_role(UserRole.ADMIN)


async def require_professional():
    """Require professional role."""
    return await require_role(UserRole.PROFESSIONAL)


# Rate limiting helpers
async def get_rate_limit_key(request: Request, identifier: str = None) -> str:
    """Get rate limit key based on request."""
    if identifier:
        return f"rate_limit:{identifier}"
    
    # Use IP address as fallback
    client_ip = get_remote_address(request)
    return f"rate_limit:ip:{client_ip}"


async def check_rate_limit(
    redis_client: redis.Redis,
    key: str,
    limit: int,
    window: int
) -> tuple[bool, int, int]:
    """
    Check rate limit for a given key.
    
    Returns:
        (allowed, current_count, remaining_time)
    """
    try:
        # Use Redis pipeline for atomic operations
        pipe = redis_client.pipeline()
        
        # Increment counter
        pipe.incr(key)
        pipe.expire(key, window)
        
        results = await pipe.execute()
        current_count = results[0]
        
        if current_count > limit:
            # Get remaining time
            ttl = await redis_client.ttl(key)
            remaining_time = max(ttl, 0)
            return False, current_count, remaining_time
        
        return True, current_count, 0
        
    except Exception as e:
        logger.error(f"Rate limit check failed: {e}")
        # Allow request if Redis fails
        return True, 0, 0


# OTP rate limiting
async def check_otp_rate_limit(contact: str) -> tuple[bool, Optional[int]]:
    """Check OTP sending rate limit."""
    redis_client = await get_redis_client()
    
    # Different limits for different time windows
    limits = [
        ("otp_1min", 1, 60),      # 1 per minute
        ("otp_1hour", 5, 3600),   # 5 per hour
        ("otp_24hour", 10, 86400) # 10 per day
    ]
    
    for limit_type, limit_count, window in limits:
        key = f"{limit_type}:{contact}"
        allowed, current, remaining_time = await check_rate_limit(
            redis_client, key, limit_count, window
        )
        
        if not allowed:
            return False, remaining_time
    
    return True, None


# Verification rate limiting
async def check_verification_rate_limit(contact: str) -> tuple[bool, Optional[int]]:
    """Check OTP verification rate limit."""
    redis_client = await get_redis_client()
    
    # More permissive limits for verification
    limits = [
        ("verify_1min", 5, 60),     # 5 per minute
        ("verify_1hour", 20, 3600), # 20 per hour
    ]
    
    for limit_type, limit_count, window in limits:
        key = f"{limit_type}:{contact}"
        allowed, current, remaining_time = await check_rate_limit(
            redis_client, key, limit_count, window
        )
        
        if not allowed:
            return False, remaining_time
    
    return True, None


# Helper functions for contact masking
def mask_email(email: str) -> str:
    """Mask email address for security."""
    local, domain = email.split('@')
    
    if len(local) <= 2:
        masked_local = '*' * len(local)
    else:
        masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
    
    return f"{masked_local}@{domain}"


def mask_phone(phone: str) -> str:
    """Mask phone number for security."""
    if len(phone) <= 4:
        return '*' * len(phone)
    
    # Keep country code and last 2 digits
    if phone.startswith('+'):
        country_code = phone[:4]  # +972
        last_digits = phone[-2:]
        middle = '*' * (len(phone) - 6)
        return f"{country_code}{middle}{last_digits}"
    else:
        first = phone[:2]
        last = phone[-2:]
        middle = '*' * (len(phone) - 4)
        return f"{first}{middle}{last}"


def mask_contact(contact: str, contact_type: ContactType) -> str:
    """Mask contact based on type."""
    if contact_type == ContactType.EMAIL:
        return mask_email(contact)
    else:
        return mask_phone(contact)