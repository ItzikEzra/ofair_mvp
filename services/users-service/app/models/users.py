"""Pydantic models for user management."""

import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from decimal import Decimal

from pydantic import BaseModel, Field, validator, EmailStr


class UserBase(BaseModel):
    """Base user model."""
    name: str = Field(..., min_length=2, max_length=255, description="Full name in Hebrew")
    phone: Optional[str] = Field(None, description="Israeli phone number")
    email: Optional[EmailStr] = Field(None, description="Email address")


class UserCreate(UserBase):
    """User creation model."""
    pass


class UserUpdate(BaseModel):
    """User update model."""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = Field(None)
    email: Optional[EmailStr] = Field(None)


class UserProfileBase(BaseModel):
    """Base user profile model."""
    address: Optional[str] = Field(None, description="Full address in Hebrew")
    preferences: Optional[Dict[str, Any]] = Field(default_factory=dict)


class UserProfileCreate(UserProfileBase):
    """User profile creation model."""
    pass


class UserProfileUpdate(UserProfileBase):
    """User profile update model."""
    pass


class UserProfile(UserProfileBase):
    """User profile response model."""
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class User(UserBase):
    """User response model."""
    id: uuid.UUID
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    user_profile: Optional[UserProfile] = None

    class Config:
        from_attributes = True


class UserPublic(BaseModel):
    """Public user model (no PII)."""
    id: uuid.UUID
    name: str  # May be masked
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserMe(User):
    """Current user response model (full access to own data)."""
    pass


# Validation functions
def validate_hebrew_name(name: str) -> str:
    """Validate Hebrew name."""
    if not name or not name.strip():
        raise ValueError("Name cannot be empty")
    
    name = name.strip()
    
    # Check for Hebrew characters (basic validation)
    has_hebrew = any('\u0590' <= char <= '\u05FF' for char in name)
    
    if not has_hebrew and len(name.split()) > 1:
        # Might be transliterated Hebrew - allow but warn
        pass
    
    return name


def validate_israeli_phone_model(phone: str) -> str:
    """Validate Israeli phone number for models."""
    if not phone:
        return phone
        
    # Remove common separators
    clean_phone = phone.replace(" ", "").replace("-", "").replace("(", "").replace(")", "")
    
    # Validate Israeli phone patterns
    if clean_phone.startswith("+972"):
        if len(clean_phone) != 13 or not clean_phone[4:].isdigit():
            raise ValueError("Invalid Israeli phone number format")
    elif clean_phone.startswith("972"):
        if len(clean_phone) != 12 or not clean_phone[3:].isdigit():
            raise ValueError("Invalid Israeli phone number format")
    elif clean_phone.startswith("0"):
        if len(clean_phone) != 10 or not clean_phone[1:].isdigit():
            raise ValueError("Invalid Israeli phone number format")
    else:
        raise ValueError("Phone number must be in Israeli format")
    
    # Normalize to international format
    if clean_phone.startswith("+972"):
        return clean_phone
    elif clean_phone.startswith("972"):
        return f"+{clean_phone}"
    elif clean_phone.startswith("0"):
        return f"+972{clean_phone[1:]}"
    
    return clean_phone


# Add validators to models
UserBase.__validator_by_name = {
    'name': validator('name', allow_reuse=True)(validate_hebrew_name),
    'phone': validator('phone', allow_reuse=True)(validate_israeli_phone_model)
}

UserCreate.__validator_by_name = {
    'name': validator('name', allow_reuse=True)(validate_hebrew_name),
    'phone': validator('phone', allow_reuse=True)(validate_israeli_phone_model)
}

UserUpdate.__validator_by_name = {
    'name': validator('name', allow_reuse=True)(validate_hebrew_name),
    'phone': validator('phone', allow_reuse=True)(validate_israeli_phone_model)
}