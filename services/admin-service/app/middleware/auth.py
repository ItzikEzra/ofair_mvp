from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
import jwt
import asyncio
from datetime import datetime, timedelta
import logging

from config import settings, check_permission
from database import get_database

logger = logging.getLogger(__name__)
security = HTTPBearer()

class AdminAuthMiddleware:
    def __init__(self):
        self.db = get_database()
    
    async def verify_token(self, credentials: HTTPAuthorizationCredentials) -> dict:
        """אימות טוקן JWT - Verify JWT token"""
        try:
            # Decode JWT token
            payload = jwt.decode(
                credentials.credentials,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM]
            )
            
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="אסימון לא תקין - Invalid token"
                )
            
            # Check token expiration
            exp = payload.get("exp")
            if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="אסימון פג - Token expired"
                )
            
            return payload
            
        except jwt.PyJWTError as e:
            logger.error(f"JWT decode error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="אסימון לא תקין - Invalid token"
            )
    
    async def get_admin_user(self, user_id: str) -> dict:
        """קבלת פרטי אדמין - Get admin user details"""
        try:
            admin_user = await self.db.get_admin_by_id(user_id)
            
            if not admin_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="משתמש לא נמצא - User not found"
                )
            
            if not admin_user.get("is_active", False):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="חשבון לא פעיל - Account not active"
                )
            
            # Check for account lockout
            if admin_user.get("locked_until") and admin_user["locked_until"] > datetime.utcnow():
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="החשבון נעול זמנית - Account temporarily locked"
                )
            
            return admin_user
            
        except Exception as e:
            logger.error(f"Error getting admin user {user_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="שגיאה בקבלת פרטי משתמש - Error getting user details"
            )
    
    async def check_permissions(self, admin_user: dict, required_permissions: List[str]) -> bool:
        """בדיקת הרשאות - Check permissions"""
        user_permissions = admin_user.get("permissions", [])
        user_role = admin_user.get("role", "")
        
        # Super admin has all permissions
        if user_role == "super_admin":
            return True
        
        # Check specific permissions
        for permission in required_permissions:
            if not check_permission(user_permissions, permission):
                return False
        
        return True
    
    async def log_admin_access(self, admin_user: dict, action: str, resource: str):
        """רישום גישת אדמין - Log admin access"""
        try:
            await self.db.insert_audit_log({
                "admin_id": admin_user["id"],
                "action": action,
                "resource_type": resource,
                "timestamp": datetime.utcnow(),
                "ip_address": None,  # Will be filled by calling function
                "user_agent": None   # Will be filled by calling function
            })
        except Exception as e:
            logger.error(f"Failed to log admin access: {e}")

# Dependency functions
async def verify_admin_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    אימות טוקן אדמין - Verify admin token dependency
    """
    auth_middleware = AdminAuthMiddleware()
    
    # Verify JWT token
    payload = await auth_middleware.verify_token(credentials)
    
    # Get admin user details
    admin_user = await auth_middleware.get_admin_user(payload["sub"])
    
    # Update last activity
    try:
        await auth_middleware.db.update_admin_last_activity(admin_user["id"])
    except Exception as e:
        logger.error(f"Failed to update admin last activity: {e}")
    
    return admin_user

def require_permissions(required_permissions: List[str]):
    """
    דרישת הרשאות ספציפיות - Require specific permissions
    """
    async def permission_checker(admin_user: dict = Depends(verify_admin_token)):
        auth_middleware = AdminAuthMiddleware()
        
        if not await auth_middleware.check_permissions(admin_user, required_permissions):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="אין הרשאה מספקת - Insufficient permissions"
            )
        
        return admin_user
    
    return permission_checker

def require_role(required_role: str):
    """
    דרישת תפקיד ספציפי - Require specific role
    """
    def role_checker(admin_user: dict = Depends(verify_admin_token)):
        if admin_user.get("role") != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="אין הרשאה לתפקיד זה - Role not authorized"
            )
        
        return admin_user
    
    return role_checker

async def require_super_admin(admin_user: dict = Depends(verify_admin_token)):
    """
    דרישת מנהל על - Require super admin
    """
    if admin_user.get("role") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="נדרשות הרשאות מנהל על - Super admin required"
        )
    
    return admin_user

# Session management
class AdminSessionManager:
    def __init__(self):
        self.db = get_database()
    
    async def create_session(self, admin_user: dict, ip_address: str, user_agent: str) -> str:
        """יצירת סשן אדמין - Create admin session"""
        session_data = {
            "admin_id": admin_user["id"],
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(seconds=settings.ADMIN_SESSION_TIMEOUT),
            "is_active": True
        }
        
        session_id = await self.db.create_admin_session(session_data)
        
        # Log session creation
        await self.db.insert_audit_log({
            "admin_id": admin_user["id"],
            "action": "session_created",
            "resource_type": "session",
            "timestamp": datetime.utcnow(),
            "ip_address": ip_address,
            "user_agent": user_agent
        })
        
        return session_id
    
    async def validate_session(self, session_id: str) -> Optional[dict]:
        """אימות סשן - Validate session"""
        session = await self.db.get_admin_session(session_id)
        
        if not session:
            return None
        
        if not session.get("is_active", False):
            return None
        
        if session.get("expires_at", datetime.utcnow()) < datetime.utcnow():
            # Mark session as expired
            await self.db.expire_admin_session(session_id)
            return None
        
        # Update last activity
        await self.db.update_session_activity(session_id)
        
        return session
    
    async def terminate_session(self, session_id: str, admin_id: str):
        """סיום סשן - Terminate session"""
        await self.db.terminate_admin_session(session_id)
        
        # Log session termination
        await self.db.insert_audit_log({
            "admin_id": admin_id,
            "action": "session_terminated",
            "resource_type": "session",
            "timestamp": datetime.utcnow()
        })
    
    async def terminate_all_sessions(self, admin_id: str):
        """סיום כל הסשנים - Terminate all sessions for admin"""
        await self.db.terminate_all_admin_sessions(admin_id)
        
        # Log mass session termination
        await self.db.insert_audit_log({
            "admin_id": admin_id,
            "action": "all_sessions_terminated",
            "resource_type": "session",
            "timestamp": datetime.utcnow()
        })

# Rate limiting
class AdminRateLimiter:
    def __init__(self):
        self.db = get_database()
    
    async def check_rate_limit(self, admin_id: str, action: str, limit: int = None) -> bool:
        """בדיקת הגבלת קצב - Check rate limiting"""
        if limit is None:
            limit = settings.ADMIN_RATE_LIMIT_PER_MINUTE
        
        try:
            # Count actions in the last minute
            one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
            action_count = await self.db.count_admin_actions(
                admin_id, action, one_minute_ago
            )
            
            if action_count >= limit:
                # Log rate limit exceeded
                await self.db.insert_audit_log({
                    "admin_id": admin_id,
                    "action": "rate_limit_exceeded",
                    "resource_type": "system",
                    "timestamp": datetime.utcnow(),
                    "metadata": {"action": action, "count": action_count}
                })
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Rate limiting check failed: {e}")
            return True  # Allow on error to avoid blocking

# IP whitelisting (optional security layer)
class IPWhitelist:
    def __init__(self):
        self.allowed_ips = getattr(settings, 'ADMIN_ALLOWED_IPS', [])
    
    def is_allowed(self, ip_address: str) -> bool:
        """בדיקת IP מותר - Check if IP is allowed"""
        if not self.allowed_ips:  # No whitelist configured
            return True
        
        return ip_address in self.allowed_ips
    
    async def log_blocked_ip(self, ip_address: str):
        """רישום IP חסום - Log blocked IP"""
        db = get_database()
        await db.insert_security_log({
            "event_type": "ip_blocked",
            "ip_address": ip_address,
            "timestamp": datetime.utcnow(),
            "details": "IP not in admin whitelist"
        })

# Two-factor authentication (placeholder for future implementation)
class TwoFactorAuth:
    def __init__(self):
        self.enabled = settings.REQUIRE_2FA
    
    async def generate_2fa_code(self, admin_id: str) -> str:
        """יצירת קוד 2FA - Generate 2FA code"""
        # Placeholder implementation
        import random
        code = f"{random.randint(100000, 999999)}"
        
        # Store code in database with expiration
        db = get_database()
        await db.store_2fa_code(admin_id, code, expires_in_minutes=5)
        
        return code
    
    async def verify_2fa_code(self, admin_id: str, code: str) -> bool:
        """אימות קוד 2FA - Verify 2FA code"""
        # Placeholder implementation
        db = get_database()
        stored_code = await db.get_2fa_code(admin_id)
        
        if not stored_code or stored_code["code"] != code:
            return False
        
        if stored_code["expires_at"] < datetime.utcnow():
            return False
        
        # Code is valid, remove it
        await db.remove_2fa_code(admin_id)
        return True