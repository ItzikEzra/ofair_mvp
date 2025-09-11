"""Dependencies for Leads Service."""

import sys
import logging
from functools import lru_cache
from typing import Optional, Generator, Tuple
import uuid

import redis.asyncio as redis
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from slowapi import Limiter
from slowapi.util import get_remote_address

# Import shared libraries
sys.path.append("/app/libs")
from python_shared.config.settings import get_settings
from python_shared.database.connection import get_db, set_rls_context
from python_shared.database.models import (
    User, Professional, Lead, ConsumerLead, ProfessionalLead,
    UserRole, ProfessionalStatus
)

logger = logging.getLogger(__name__)

# Security
security = HTTPBearer(auto_error=False)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


@lru_cache()
def get_limiter():
    """Get rate limiter instance."""
    return limiter


# Token models
class TokenClaims:
    """JWT token claims."""
    
    def __init__(
        self,
        sub: str,
        user_id: str,
        role: str,
        professional_id: Optional[str] = None,
        exp: Optional[int] = None,
        jti: Optional[str] = None,
        **kwargs
    ):
        self.sub = sub
        self.user_id = user_id  
        self.role = role
        self.professional_id = professional_id
        self.exp = exp
        self.jti = jti


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
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Tuple[TokenClaims, User]:
    """Get current authenticated user from token."""
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    token_claims = verify_token(token)
    
    # Check if token is revoked
    redis_client = await get_redis_client()
    revoked = await redis_client.get(f"revoked_token:{token_claims.jti}")
    
    if revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = db.query(User).filter(User.id == token_claims.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Set RLS context
    professional_id = token_claims.professional_id if token_claims.role == "professional" else None
    set_rls_context(db, token_claims.user_id, professional_id)
    
    return token_claims, user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Tuple[Optional[TokenClaims], Optional[User]]:
    """Get current user if authenticated, otherwise return None."""
    
    if not credentials:
        return None, None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None, None


async def get_current_professional(
    current_user_data: Tuple[TokenClaims, User] = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Tuple[TokenClaims, User, Professional]:
    """Get current professional user."""
    
    token_claims, user = current_user_data
    
    if token_claims.role != UserRole.PROFESSIONAL.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professional access required"
        )
    
    professional = db.query(Professional).filter(
        Professional.user_id == user.id
    ).first()
    
    if not professional:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Professional profile not found"
        )
    
    if professional.status != ProfessionalStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professional account is not active"
        )
    
    return token_claims, user, professional


async def get_current_admin(
    current_user_data: Tuple[TokenClaims, User] = Depends(get_current_user)
) -> Tuple[TokenClaims, User]:
    """Get current admin user."""
    
    token_claims, user = current_user_data
    
    if token_claims.role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return token_claims, user


def require_lead_access(allow_public: bool = False):
    """Dependency factory for lead access control."""
    
    async def lead_access_checker(
        lead_id: uuid.UUID,
        current_user_data: Optional[Tuple[TokenClaims, User]] = Depends(get_current_user_optional),
        db: Session = Depends(get_db)
    ) -> Tuple[Lead, Optional[TokenClaims], Optional[User], bool]:
        """Check lead access permissions."""
        
        # Get lead
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        token_claims, user = current_user_data if current_user_data else (None, None)
        
        # If no authentication and public access not allowed
        if not user and not allow_public:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        # Check if user can see PII
        can_see_pii = False
        
        if user:
            # Lead owner can always see PII
            if lead.created_by_user_id == user.id:
                can_see_pii = True
            
            # Admin can always see PII
            elif token_claims.role == UserRole.ADMIN.value:
                can_see_pii = True
            
            # Professional can see PII if they have an accepted proposal
            elif token_claims.role == UserRole.PROFESSIONAL.value:
                from python_shared.database.models import Proposal, ProposalStatus
                professional = db.query(Professional).filter(
                    Professional.user_id == user.id
                ).first()
                
                if professional:
                    accepted_proposal = db.query(Proposal).filter(
                        Proposal.lead_id == lead.id,
                        Proposal.professional_id == professional.id,
                        Proposal.status == ProposalStatus.ACCEPTED
                    ).first()
                    
                    can_see_pii = bool(accepted_proposal)
        
        return lead, token_claims, user, can_see_pii
    
    return lead_access_checker


def require_lead_owner():
    """Dependency factory for lead ownership check."""
    
    async def lead_owner_checker(
        lead_id: uuid.UUID,
        current_user_data: Tuple[TokenClaims, User] = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> Tuple[Lead, TokenClaims, User]:
        """Check if user owns the lead."""
        
        token_claims, user = current_user_data
        
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        # Check ownership
        if lead.created_by_user_id != user.id and token_claims.role != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only modify your own leads."
            )
        
        return lead, token_claims, user
    
    return lead_owner_checker


# Geographic dependencies
class LocationInfo:
    """Location information."""
    
    def __init__(self, latitude: float, longitude: float, address: str):
        self.latitude = latitude
        self.longitude = longitude
        self.address = address


async def get_user_location(
    current_user_data: Optional[Tuple[TokenClaims, User]] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> Optional[LocationInfo]:
    """Get user's location for geo-matching."""
    
    if not current_user_data:
        return None
    
    token_claims, user = current_user_data
    
    if token_claims.role == UserRole.PROFESSIONAL.value:
        professional = db.query(Professional).filter(
            Professional.user_id == user.id
        ).first()
        
        if professional and professional.location:
            # In a real implementation, you'd geocode the location
            # For now, return a placeholder
            return LocationInfo(
                latitude=32.0853,  # Tel Aviv coordinates as default
                longitude=34.7818,
                address=professional.location
            )
    
    return None


# Rate limiting helpers
async def check_lead_creation_rate_limit(
    current_user_data: Tuple[TokenClaims, User] = Depends(get_current_user)
) -> None:
    """Check lead creation rate limit."""
    
    token_claims, user = current_user_data
    redis_client = await get_redis_client()
    
    # Different limits for different user types
    if token_claims.role == UserRole.CONSUMER.value:
        # Consumers: 3 leads per hour, 10 per day
        limits = [
            (f"lead_creation_1h:{user.id}", 3, 3600),
            (f"lead_creation_24h:{user.id}", 10, 86400)
        ]
    elif token_claims.role == UserRole.PROFESSIONAL.value:
        # Professionals: 5 leads per hour, 20 per day  
        limits = [
            (f"lead_creation_1h:{user.id}", 5, 3600),
            (f"lead_creation_24h:{user.id}", 20, 86400)
        ]
    else:
        return  # No limits for admin
    
    for key, limit, window in limits:
        try:
            current_count = await redis_client.incr(key)
            await redis_client.expire(key, window)
            
            if current_count > limit:
                ttl = await redis_client.ttl(key)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {ttl} seconds."
                )
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            # Continue if Redis fails


async def check_referral_rate_limit(
    current_user_data: Tuple[TokenClaims, User, Professional] = Depends(get_current_professional)
) -> None:
    """Check referral creation rate limit."""
    
    token_claims, user, professional = current_user_data
    redis_client = await get_redis_client()
    
    # Referral limits: 5 per hour, 20 per day
    limits = [
        (f"referral_creation_1h:{professional.id}", 5, 3600),
        (f"referral_creation_24h:{professional.id}", 20, 86400)
    ]
    
    for key, limit, window in limits:
        try:
            current_count = await redis_client.incr(key)
            await redis_client.expire(key, window)
            
            if current_count > limit:
                ttl = await redis_client.ttl(key)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Referral rate limit exceeded. Try again in {ttl} seconds."
                )
        except Exception as e:
            logger.error(f"Referral rate limit check failed: {e}")


# Cache helpers
async def cache_lead_board_result(
    key: str,
    data: dict,
    ttl: int = 300  # 5 minutes
) -> None:
    """Cache lead board result."""
    try:
        redis_client = await get_redis_client()
        await redis_client.setex(key, ttl, str(data))
    except Exception as e:
        logger.error(f"Failed to cache lead board result: {e}")


async def get_cached_lead_board_result(key: str) -> Optional[dict]:
    """Get cached lead board result."""
    try:
        redis_client = await get_redis_client()
        cached = await redis_client.get(key)
        if cached:
            return eval(cached)  # In production, use proper JSON serialization
    except Exception as e:
        logger.error(f"Failed to get cached lead board result: {e}")
    
    return None


# Audit logging
async def log_pii_access(
    user_id: uuid.UUID,
    lead_id: uuid.UUID,
    access_type: str,
    request: Request,
    db: Session
) -> None:
    """Log PII access for audit purposes."""
    try:
        from python_shared.database.models import ContactAccessLog, ContactAccessType
        
        # Map access type
        access_type_enum = {
            "phone": ContactAccessType.PHONE_REVEAL,
            "address": ContactAccessType.ADDRESS_REVEAL,
            "full": ContactAccessType.FULL_CONTACT
        }.get(access_type, ContactAccessType.FULL_CONTACT)
        
        # Create log entry
        log_entry = ContactAccessLog(
            accessor_user_id=user_id,
            target_lead_id=lead_id,
            access_type=access_type_enum,
            ip_address=request.client.host,
            user_agent=request.headers.get("user-agent", "")
        )
        
        db.add(log_entry)
        db.commit()
        
    except Exception as e:
        logger.error(f"Failed to log PII access: {e}")
        db.rollback()


# Health check helpers
async def check_database_health() -> bool:
    """Check database connectivity."""
    try:
        db_gen = get_db()
        db = next(db_gen)
        try:
            db.execute(text("SELECT 1"))
            return True
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


async def check_redis_health() -> bool:
    """Check Redis connectivity."""
    try:
        redis_client = await get_redis_client()
        await redis_client.ping()
        return True
    except Exception:
        return False