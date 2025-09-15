"""Role-based access control middleware for FastAPI microservices."""

import logging
from typing import List, Optional, Callable
from functools import wraps

from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from ..auth.jwt_handler import verify_token
from ..config.settings import get_settings

logger = logging.getLogger(__name__)
security = HTTPBearer()
settings = get_settings()


class RoleChecker:
    """Role-based access control checker."""

    def __init__(self, allowed_roles: List[str]):
        """Initialize with allowed roles."""
        self.allowed_roles = allowed_roles

    def __call__(self, credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Check if user has required role."""
        try:
            # Verify and decode token
            token_claims = verify_token(credentials.credentials)

            # Check if user role is allowed
            user_role = token_claims.role
            if user_role not in self.allowed_roles:
                logger.warning(f"Access denied for role {user_role}. Required: {self.allowed_roles}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied. Required roles: {', '.join(self.allowed_roles)}"
                )

            return token_claims

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in role verification: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token"
            )


# Pre-configured role checkers
require_professional = RoleChecker(["professional", "admin"])
require_customer = RoleChecker(["customer", "admin"])
require_admin = RoleChecker(["admin"])
require_support = RoleChecker(["support", "admin"])
require_any_user = RoleChecker(["professional", "customer", "admin", "support"])


def professional_only(func: Callable) -> Callable:
    """Decorator to require professional role."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Extract request and credentials from kwargs
        request = None
        credentials = None

        for key, value in kwargs.items():
            if isinstance(value, Request):
                request = value
            elif isinstance(value, HTTPAuthorizationCredentials):
                credentials = value

        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header required"
            )

        # Check professional role
        token_claims = require_professional(credentials)

        # Add token claims to kwargs for use in the endpoint
        kwargs['current_user'] = token_claims

        return await func(*args, **kwargs)

    return wrapper


def customer_only(func: Callable) -> Callable:
    """Decorator to require customer role."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Extract credentials from kwargs
        credentials = None

        for key, value in kwargs.items():
            if isinstance(value, HTTPAuthorizationCredentials):
                credentials = value

        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header required"
            )

        # Check customer role
        token_claims = require_customer(credentials)

        # Add token claims to kwargs for use in the endpoint
        kwargs['current_user'] = token_claims

        return await func(*args, **kwargs)

    return wrapper


def admin_only(func: Callable) -> Callable:
    """Decorator to require admin role."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Extract credentials from kwargs
        credentials = None

        for key, value in kwargs.items():
            if isinstance(value, HTTPAuthorizationCredentials):
                credentials = value

        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authorization header required"
            )

        # Check admin role
        token_claims = require_admin(credentials)

        # Add token claims to kwargs for use in the endpoint
        kwargs['current_user'] = token_claims

        return await func(*args, **kwargs)

    return wrapper


class ServiceAccessControl:
    """Service-specific access control configuration."""

    # Professional-only services
    PROFESSIONAL_SERVICES = [
        "leads-service",
        "proposals-service",
        "referrals-service"
    ]

    # Customer-only services
    CUSTOMER_SERVICES = [
        "bookings-service",
        "reviews-service"
    ]

    # Admin-only services
    ADMIN_SERVICES = [
        "admin-service",
        "analytics-service"
    ]

    # Services accessible by both professionals and customers
    SHARED_SERVICES = [
        "users-service",
        "payments-service",
        "notifications-service"
    ]

    @classmethod
    def get_required_roles(cls, service_name: str) -> List[str]:
        """Get required roles for a service."""
        if service_name in cls.PROFESSIONAL_SERVICES:
            return ["professional", "admin"]
        elif service_name in cls.CUSTOMER_SERVICES:
            return ["customer", "admin"]
        elif service_name in cls.ADMIN_SERVICES:
            return ["admin"]
        elif service_name in cls.SHARED_SERVICES:
            return ["professional", "customer", "admin"]
        else:
            # Default: require any authenticated user
            return ["professional", "customer", "admin", "support"]

    @classmethod
    def create_service_middleware(cls, service_name: str):
        """Create role middleware for a specific service."""
        required_roles = cls.get_required_roles(service_name)
        return RoleChecker(required_roles)


def validate_professional_profile_access(token_claims, requested_profile_id: Optional[str] = None) -> bool:
    """Validate that professional can access their own profile data."""
    if token_claims.role == "admin":
        return True  # Admin can access all profiles

    if token_claims.role != "professional":
        return False  # Only professionals can access professional data

    if requested_profile_id is None:
        return True  # Accessing own profile without specific ID

    # Check if professional is accessing their own profile
    user_profile_id = getattr(token_claims, 'profile_id', None)
    return str(user_profile_id) == str(requested_profile_id)


def validate_customer_profile_access(token_claims, requested_profile_id: Optional[str] = None) -> bool:
    """Validate that customer can access their own profile data."""
    if token_claims.role == "admin":
        return True  # Admin can access all profiles

    if token_claims.role != "customer":
        return False  # Only customers can access customer data

    if requested_profile_id is None:
        return True  # Accessing own profile without specific ID

    # Check if customer is accessing their own profile
    user_profile_id = getattr(token_claims, 'profile_id', None)
    return str(user_profile_id) == str(requested_profile_id)