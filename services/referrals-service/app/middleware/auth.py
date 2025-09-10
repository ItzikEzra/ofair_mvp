import jwt
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from datetime import datetime
from typing import Optional, Dict, Any

class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, credentials: HTTPAuthorizationCredentials):
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="סכמת אימות לא חוקית"
                )
            if not self.verify_jwt(credentials.credentials):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="טוקן לא חוקי או פג תוקף"
                )
            return credentials.credentials
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="קוד אימות נדרש"
            )

    def verify_jwt(self, token: str) -> bool:
        try:
            payload = jwt.decode(
                token,
                os.getenv("JWT_SECRET_KEY", "your-secret-key"),
                algorithms=["HS256"]
            )
            return payload is not None
        except jwt.ExpiredSignatureError:
            return False
        except jwt.InvalidTokenError:
            return False

def verify_jwt_token(credentials: HTTPAuthorizationCredentials = JWTBearer()) -> Dict[str, Any]:
    """
    אימות טוקן JWT - Verify JWT token and return user info
    """
    try:
        payload = jwt.decode(
            credentials,
            os.getenv("JWT_SECRET_KEY", "your-secret-key"),
            algorithms=["HS256"]
        )
        
        # Check if token is expired
        if datetime.fromtimestamp(payload.get('exp', 0)) < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="טוקן פג תוקף"
            )
        
        return {
            "user_id": payload.get("sub"),
            "phone_number": payload.get("phone_number"),
            "is_professional": payload.get("is_professional", False),
            "role": payload.get("role", "user"),
            "is_verified": payload.get("is_verified", False),
            "exp": payload.get("exp")
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="טוקן פג תוקף"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="טוקן לא חוקי"
        )

def verify_admin_role(current_user: Dict[str, Any]) -> bool:
    """
    אימות הרשאת מנהל - Verify admin role
    """
    return current_user.get("role") == "admin"

def verify_professional_status(current_user: Dict[str, Any]) -> bool:
    """
    אימות סטטוס מקצועי - Verify professional status
    """
    return current_user.get("is_professional", False)

def verify_user_access(current_user: Dict[str, Any], target_user_id: str) -> bool:
    """
    אימות גישה למשתמש - Verify user access permissions
    """
    # Users can access their own data or admins can access any user's data
    return (current_user.get("user_id") == target_user_id or 
            current_user.get("role") == "admin")

def get_user_permissions(current_user: Dict[str, Any]) -> Dict[str, bool]:
    """
    קבלת הרשאות המשתמש - Get user permissions
    """
    role = current_user.get("role", "user")
    is_professional = current_user.get("is_professional", False)
    is_verified = current_user.get("is_verified", False)
    
    permissions = {
        "can_create_referrals": is_verified,
        "can_view_own_referrals": True,
        "can_view_all_referrals": role == "admin",
        "can_process_payments": role in ["admin", "finance"],
        "can_dispute_commissions": is_verified,
        "can_view_commission_reports": role in ["admin", "finance"],
        "can_manage_users": role == "admin",
        "can_access_analytics": role in ["admin", "analytics"],
        "can_create_disputes": is_professional and is_verified,
        "can_approve_commissions": role in ["admin", "finance"]
    }
    
    return permissions