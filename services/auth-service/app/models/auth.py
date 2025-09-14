"""Authentication models and schemas."""

import re
from datetime import datetime
from enum import Enum
from typing import Optional, Union
from pydantic import BaseModel, Field, validator, EmailStr


class ContactType(str, Enum):
    """Contact type enumeration."""
    PHONE = "phone"
    EMAIL = "email"


class AuthMethod(str, Enum):
    """Authentication method enumeration."""
    OTP = "otp"
    PASSWORD = "password"


class UserRole(str, Enum):
    """User role enumeration."""
    CONSUMER = "consumer"
    PROFESSIONAL = "professional" 
    ADMIN = "admin"


class UserStatus(str, Enum):
    """User status enumeration."""
    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BLOCKED = "blocked"


# Request Models
class SendOTPRequest(BaseModel):
    """Request model for sending OTP."""
    contact: str = Field(..., description="Phone number or email address")
    contact_type: Optional[ContactType] = Field(None, description="Contact type (auto-detected if not provided)")
    language: str = Field(default="he", description="Language code for OTP message")
    
    @validator('contact')
    def validate_contact(cls, v):
        """Validate contact based on type."""
        v = v.strip()
        
        # Check if it's an email
        if '@' in v:
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, v):
                raise ValueError('Invalid email format')
            return v
        
        # Check if it's a phone number
        # Israeli phone number patterns
        israeli_patterns = [
            r'^(\+972|972)?[-\s]?0?([23489]\d{8}|5[0-9]\d{7}|7[2-9]\d{7})$',  # Israeli mobile/landline
            r'^(\+972|0)?[-\s]?([23489]\d{7,8}|5[0-9]\d{6,7}|7[2-9]\d{6,7})$'  # Alternative format
        ]
        
        # Clean phone number
        phone_cleaned = re.sub(r'[-\s\(\)]', '', v)
        
        for pattern in israeli_patterns:
            if re.match(pattern, phone_cleaned):
                # Normalize to +972 format
                if phone_cleaned.startswith('+972'):
                    return phone_cleaned
                elif phone_cleaned.startswith('972'):
                    return '+' + phone_cleaned
                elif phone_cleaned.startswith('0'):
                    return '+972' + phone_cleaned[1:]
                else:
                    return '+972' + phone_cleaned
        
        # If not Israeli, accept international format
        international_pattern = r'^\+\d{1,3}\d{6,14}$'
        if re.match(international_pattern, phone_cleaned):
            return phone_cleaned
            
        raise ValueError('Invalid phone number format. Must be Israeli format or international format with country code')
    
    @validator('contact_type', always=True)
    def auto_detect_contact_type(cls, v, values):
        """Auto-detect contact type if not provided."""
        if v is not None:
            return v
            
        contact = values.get('contact', '')
        if '@' in contact:
            return ContactType.EMAIL
        else:
            return ContactType.PHONE
    
    @validator('language')
    def validate_language(cls, v):
        """Validate language code."""
        allowed_languages = ['he', 'en', 'ar']
        if v not in allowed_languages:
            return 'he'  # Default to Hebrew
        return v


class VerifyOTPRequest(BaseModel):
    """Request model for verifying OTP."""
    contact: str = Field(..., description="Phone number or email address")
    otp: str = Field(..., min_length=4, max_length=8, description="OTP code")
    device_info: Optional[dict] = Field(None, description="Device information for security")
    
    @validator('contact')
    def validate_contact(cls, v):
        """Validate contact - reuse logic from SendOTPRequest."""
        v = v.strip()

        # Check if it's an email
        if '@' in v:
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, v):
                raise ValueError('Invalid email format')
            return v

        # Check if it's a phone number
        # Israeli phone number patterns
        israeli_patterns = [
            r'^(\+972|972)?[-\s]?0?([23489]\d{8}|5[0-9]\d{7}|7[2-9]\d{7})$',  # Israeli mobile/landline
            r'^(\+972|0)?[-\s]?([23489]\d{7,8}|5[0-9]\d{6,7}|7[2-9]\d{6,7})$'  # Alternative format
        ]

        # Clean phone number
        phone_cleaned = re.sub(r'[-\s\(\)]', '', v)

        for pattern in israeli_patterns:
            if re.match(pattern, phone_cleaned):
                # Normalize to +972 format
                if phone_cleaned.startswith('+972'):
                    return phone_cleaned
                elif phone_cleaned.startswith('972'):
                    return '+' + phone_cleaned
                elif phone_cleaned.startswith('0'):
                    return '+972' + phone_cleaned[1:]
                else:
                    return '+972' + phone_cleaned

        # International phone validation
        if phone_cleaned.startswith('+'):
            if len(phone_cleaned) >= 10 and phone_cleaned[1:].isdigit():
                return phone_cleaned

        raise ValueError('Invalid phone number format')
    
    @validator('otp')
    def validate_otp(cls, v):
        """Validate OTP format."""
        if not v.isdigit():
            raise ValueError('OTP must contain only digits')
        return v


class RefreshTokenRequest(BaseModel):
    """Request model for refreshing token."""
    refresh_token: str = Field(..., description="Refresh token")


class RevokeTokenRequest(BaseModel):
    """Request model for revoking token."""
    token: Optional[str] = Field(None, description="Token to revoke (if not provided, revokes all tokens for user)")
    all_tokens: bool = Field(default=False, description="Revoke all tokens for user")


# Response Models
class SendOTPResponse(BaseModel):
    """Response model for sending OTP."""
    success: bool = Field(..., description="Whether OTP was sent successfully")
    message: str = Field(..., description="Status message in English")
    message_he: str = Field(..., description="Status message in Hebrew")
    contact_type: ContactType = Field(..., description="Type of contact used")
    masked_contact: str = Field(..., description="Masked contact for security")
    expires_in: int = Field(..., description="OTP expiration time in seconds")
    retry_after: Optional[int] = Field(None, description="Seconds to wait before retry")


class TokenData(BaseModel):
    """Token data model."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="Refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    user_id: Optional[str] = Field(None, description="User ID")
    user_role: Optional[UserRole] = Field(None, description="User role")


class VerifyOTPResponse(BaseModel):
    """Response model for verifying OTP."""
    success: bool = Field(..., description="Whether OTP verification was successful")
    message: str = Field(..., description="Status message in English")
    message_he: str = Field(..., description="Status message in Hebrew")
    token_data: Optional[TokenData] = Field(None, description="Token data if verification successful")
    user_status: Optional[UserStatus] = Field(None, description="User account status")
    is_new_user: Optional[bool] = Field(None, description="Whether this is a new user registration")


class RefreshTokenResponse(BaseModel):
    """Response model for refreshing token."""
    success: bool = Field(..., description="Whether token refresh was successful")
    message: str = Field(..., description="Status message in English")
    message_he: str = Field(..., description="Status message in Hebrew")
    token_data: Optional[TokenData] = Field(None, description="New token data if refresh successful")


class RevokeTokenResponse(BaseModel):
    """Response model for revoking token."""
    success: bool = Field(..., description="Whether token revocation was successful")
    message: str = Field(..., description="Status message in English")
    message_he: str = Field(..., description="Status message in Hebrew")
    revoked_count: int = Field(default=0, description="Number of tokens revoked")


# Internal Models
class OTPRecord(BaseModel):
    """OTP record model for Redis storage."""
    contact: str
    contact_type: ContactType
    otp: str
    attempts: int = Field(default=0)
    max_attempts: int = Field(default=3)
    created_at: datetime
    expires_at: datetime
    language: str = Field(default="he")


class TokenClaims(BaseModel):
    """JWT token claims model."""
    sub: str  # user_id
    contact: str
    contact_type: str
    role: Optional[str] = None
    iat: int  # issued at
    exp: int  # expires at
    jti: Optional[str] = None  # JWT ID for revocation


class RateLimitInfo(BaseModel):
    """Rate limit information model."""
    contact: str
    attempts: int = Field(default=0)
    window_start: datetime
    blocked_until: Optional[datetime] = None