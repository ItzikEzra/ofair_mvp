"""Dependencies for Proposals Service."""

import sys
import logging
from functools import lru_cache
from typing import Optional, Generator, Tuple
import uuid

import redis.asyncio as redis
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends, Request, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
from slowapi import Limiter
from slowapi.util import get_remote_address

# Import shared libraries
sys.path.append("/root/repos/ofair_mvp/libs")
from python_shared.config.settings import get_settings
from python_shared.database.connection import get_db, set_rls_context
from python_shared.database.models import (
    User, Professional, Lead, ConsumerLead, ProfessionalLead, Proposal,
    UserRole, ProfessionalStatus, ProposalStatus
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
    
    # Additional verification check for proposal submission
    if not professional.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professional must be verified to submit proposals"
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


def require_proposal_access(allow_public: bool = False):
    """Dependency factory for proposal access control."""
    
    async def proposal_access_checker(
        proposal_id: uuid.UUID,
        current_user_data: Optional[Tuple[TokenClaims, User]] = Depends(get_current_user_optional),
        db: Session = Depends(get_db)
    ) -> Tuple[Proposal, Optional[TokenClaims], Optional[User], bool]:
        """Check proposal access permissions."""
        
        # Get proposal with related data
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proposal not found"
            )
        
        token_claims, user = current_user_data if current_user_data else (None, None)
        
        # If no authentication and public access not allowed
        if not user and not allow_public:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        # Check if user can see full proposal details
        can_see_full_details = False
        
        if user:
            # Proposal owner (professional) can always see full details
            if proposal.professional_id:
                professional = db.query(Professional).filter(
                    Professional.user_id == user.id
                ).first()
                if professional and professional.id == proposal.professional_id:
                    can_see_full_details = True
            
            # Lead owner can see proposals on their lead
            lead = db.query(Lead).filter(Lead.id == proposal.lead_id).first()
            if lead and lead.created_by_user_id == user.id:
                can_see_full_details = True
            
            # Admin can always see full details
            elif token_claims.role == UserRole.ADMIN.value:
                can_see_full_details = True
        
        return proposal, token_claims, user, can_see_full_details
    
    return proposal_access_checker


def require_proposal_owner():
    """Dependency factory for proposal ownership check."""
    
    async def proposal_owner_checker(
        proposal_id: uuid.UUID,
        current_user_data: Tuple[TokenClaims, User, Professional] = Depends(get_current_professional),
        db: Session = Depends(get_db)
    ) -> Tuple[Proposal, TokenClaims, User, Professional]:
        """Check if professional owns the proposal."""
        
        token_claims, user, professional = current_user_data
        
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proposal not found"
            )
        
        # Check ownership
        if proposal.professional_id != professional.id and token_claims.role != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only modify your own proposals."
            )
        
        return proposal, token_claims, user, professional
    
    return proposal_owner_checker


def require_lead_owner():
    """Dependency factory for lead ownership check."""
    
    async def lead_owner_checker(
        proposal_id: uuid.UUID,
        current_user_data: Tuple[TokenClaims, User] = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> Tuple[Proposal, Lead, TokenClaims, User]:
        """Check if user owns the lead that the proposal is for."""
        
        token_claims, user = current_user_data
        
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Proposal not found"
            )
        
        lead = db.query(Lead).filter(Lead.id == proposal.lead_id).first()
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        # Check lead ownership
        if lead.created_by_user_id != user.id and token_claims.role != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only manage proposals on your own leads."
            )
        
        return proposal, lead, token_claims, user
    
    return lead_owner_checker


# Rate limiting helpers
async def check_proposal_creation_rate_limit(
    current_user_data: Tuple[TokenClaims, User, Professional] = Depends(get_current_professional)
) -> None:
    """Check proposal creation rate limit."""
    
    token_claims, user, professional = current_user_data
    redis_client = await get_redis_client()
    
    # Proposal limits: 5 per hour, 15 per day for professionals
    limits = [
        (f"proposal_creation_1h:{professional.id}", 5, 3600),
        (f"proposal_creation_24h:{professional.id}", 15, 86400)
    ]
    
    for key, limit, window in limits:
        try:
            current_count = await redis_client.incr(key)
            await redis_client.expire(key, window)
            
            if current_count > limit:
                ttl = await redis_client.ttl(key)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Proposal creation rate limit exceeded. Try again in {ttl} seconds."
                )
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")


async def check_proposal_update_rate_limit(
    current_user_data: Tuple[TokenClaims, User, Professional] = Depends(get_current_professional)
) -> None:
    """Check proposal update rate limit."""
    
    token_claims, user, professional = current_user_data
    redis_client = await get_redis_client()
    
    # Update limits: 20 per hour for professionals
    key = f"proposal_update_1h:{professional.id}"
    limit = 20
    window = 3600
    
    try:
        current_count = await redis_client.incr(key)
        await redis_client.expire(key, window)
        
        if current_count > limit:
            ttl = await redis_client.ttl(key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Proposal update rate limit exceeded. Try again in {ttl} seconds."
            )
    except Exception as e:
        logger.error(f"Proposal update rate limit check failed: {e}")


async def check_media_upload_rate_limit(
    current_user_data: Tuple[TokenClaims, User, Professional] = Depends(get_current_professional)
) -> None:
    """Check media upload rate limit."""
    
    token_claims, user, professional = current_user_data
    redis_client = await get_redis_client()
    
    # Media upload limits: 10 per hour per professional
    key = f"media_upload_1h:{professional.id}"
    limit = 10
    window = 3600
    
    try:
        current_count = await redis_client.incr(key)
        await redis_client.expire(key, window)
        
        if current_count > limit:
            ttl = await redis_client.ttl(key)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Media upload rate limit exceeded. Try again in {ttl} seconds."
            )
    except Exception as e:
        logger.error(f"Media upload rate limit check failed: {e}")


# Media validation helpers
def validate_media_file(file: UploadFile) -> None:
    """Validate uploaded media file."""
    
    # Check file size limits
    if not file.size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file is not allowed"
        )
    
    # Size limits based on content type
    if file.content_type.startswith("image/"):
        max_size = 10 * 1024 * 1024  # 10MB for images
    elif file.content_type.startswith("video/"):
        max_size = 100 * 1024 * 1024  # 100MB for videos
    else:
        max_size = 25 * 1024 * 1024  # 25MB for documents
    
    if file.size > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size exceeds maximum allowed size ({max_size // (1024*1024)}MB)"
        )
    
    # Check allowed content types
    allowed_types = [
        # Images
        "image/jpeg", "image/png", "image/gif", "image/webp",
        # Documents
        "application/pdf", "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        # Videos
        "video/mp4", "video/quicktime", "video/avi"
    ]
    
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type {file.content_type} is not allowed"
        )


# Audit logging
async def log_proposal_action(
    user_id: uuid.UUID,
    proposal_id: uuid.UUID,
    action: str,
    details: dict,
    request: Request,
    db: Session
) -> None:
    """Log proposal action for audit purposes."""
    try:
        from python_shared.database.models import AdminAuditLog
        
        # Create audit log entry
        log_entry = AdminAuditLog(
            admin_user_id=user_id,
            action=action,
            entity_type="proposal",
            entity_id=proposal_id,
            changes=details,
            ip_address=request.client.host if request.client else "unknown"
        )
        
        db.add(log_entry)
        db.commit()
        
    except Exception as e:
        logger.error(f"Failed to log proposal action: {e}")
        db.rollback()


async def log_pii_revelation(
    user_id: uuid.UUID,
    proposal_id: uuid.UUID,
    lead_id: uuid.UUID,
    request: Request,
    db: Session
) -> None:
    """Log PII revelation for audit purposes."""
    try:
        from python_shared.database.models import ContactAccessLog, ContactAccessType
        
        # Create PII access log
        log_entry = ContactAccessLog(
            accessor_user_id=user_id,
            target_lead_id=lead_id,
            access_type=ContactAccessType.FULL_CONTACT,
            ip_address=request.client.host if request.client else "unknown",
            user_agent=request.headers.get("user-agent", "")
        )
        
        db.add(log_entry)
        db.commit()
        
    except Exception as e:
        logger.error(f"Failed to log PII revelation: {e}")
        db.rollback()


# Business validation helpers
def validate_proposal_status_transition(
    current_status: ProposalStatus,
    new_status: ProposalStatus
) -> bool:
    """Validate if proposal status transition is allowed."""
    
    valid_transitions = {
        ProposalStatus.PENDING: [ProposalStatus.ACCEPTED, ProposalStatus.REJECTED],
        ProposalStatus.ACCEPTED: [],  # No transitions from accepted
        ProposalStatus.REJECTED: []   # No transitions from rejected
    }
    
    return new_status in valid_transitions.get(current_status, [])


def can_modify_proposal(proposal: Proposal) -> bool:
    """Check if proposal can be modified."""
    return proposal.status == ProposalStatus.PENDING


def can_upload_media_to_proposal(proposal: Proposal) -> bool:
    """Check if media can be uploaded to proposal."""
    return proposal.status == ProposalStatus.PENDING


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


# S3/MinIO helpers
async def get_s3_client():
    """Get S3/MinIO client for media uploads."""
    import boto3
    from botocore.config import Config
    
    settings = get_settings()
    
    config = Config(
        region_name=settings.s3_region,
        signature_version='s3v4'
    )
    
    if settings.s3_endpoint:
        # MinIO/custom S3 endpoint
        return boto3.client(
            's3',
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=config
        )
    else:
        # AWS S3
        return boto3.client(
            's3',
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            config=config
        )


async def generate_media_url(key: str, expiration: int = 3600) -> str:
    """Generate presigned URL for media access."""
    try:
        s3_client = await get_s3_client()
        settings = get_settings()
        
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': settings.s3_bucket, 'Key': key},
            ExpiresIn=expiration
        )
        
        return url
        
    except Exception as e:
        logger.error(f"Failed to generate media URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate media URL"
        )