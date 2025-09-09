"""Pydantic models for professional profiles."""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal

from pydantic import BaseModel, Field, validator


class ProfessionalBase(BaseModel):
    """Base professional model."""
    profession: str = Field(..., min_length=2, max_length=255, description="Profession in Hebrew")
    company_name: Optional[str] = Field(None, max_length=255, description="Company name in Hebrew")
    specialties: List[str] = Field(..., min_items=1, max_items=10, description="Specialties in Hebrew")
    location: str = Field(..., min_length=2, max_length=500, description="Location in Hebrew")


class ProfessionalCreate(ProfessionalBase):
    """Professional creation model."""
    pass


class ProfessionalUpdate(BaseModel):
    """Professional update model."""
    profession: Optional[str] = Field(None, min_length=2, max_length=255)
    company_name: Optional[str] = Field(None, max_length=255)
    specialties: Optional[List[str]] = Field(None, min_items=1, max_items=10)
    location: Optional[str] = Field(None, min_length=2, max_length=500)


class Professional(ProfessionalBase):
    """Professional response model."""
    id: uuid.UUID
    user_id: uuid.UUID
    rating: Optional[Decimal] = Field(None, description="Average rating 0.00-5.00")
    review_count: int = Field(default=0)
    is_verified: bool = Field(default=False)
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfessionalPublic(BaseModel):
    """Public professional listing model (no PII)."""
    id: uuid.UUID
    profession: str
    company_name: Optional[str] = None
    specialties: List[str]
    location: str
    rating: Optional[Decimal] = None
    review_count: int = 0
    is_verified: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class ProfessionalPublicDetail(ProfessionalPublic):
    """Public professional detail model (no PII, more details)."""
    status: str  # Only show if active


class ProfessionalWithUser(Professional):
    """Professional with user information."""
    user_name: str
    user_phone: Optional[str] = None  # Only visible to authorized users
    user_email: Optional[str] = None  # Only visible to authorized users

    class Config:
        from_attributes = True


class ProfessionalVerification(BaseModel):
    """Professional verification request model."""
    professional_id: uuid.UUID
    verification_status: str = Field(..., description="pending, active, suspended, inactive")
    admin_notes: Optional[str] = Field(None, description="Admin verification notes")


class CertificateUploadRequest(BaseModel):
    """Certificate upload request model."""
    filename: str = Field(..., description="Original filename")
    file_type: str = Field(..., description="MIME type")
    description: Optional[str] = Field(None, description="Certificate description")


class CertificateUploadResponse(BaseModel):
    """Certificate upload response model."""
    upload_url: str = Field(..., description="Pre-signed S3 upload URL")
    file_key: str = Field(..., description="S3 file key")
    expires_in: int = Field(..., description="URL expiration time in seconds")


class Certificate(BaseModel):
    """Certificate model."""
    id: uuid.UUID
    professional_id: uuid.UUID
    filename: str
    file_key: str
    file_type: str
    description: Optional[str] = None
    is_verified: bool = False
    uploaded_at: datetime

    class Config:
        from_attributes = True


class ProfessionalStats(BaseModel):
    """Professional statistics model."""
    total_leads: int = 0
    active_projects: int = 0
    completed_projects: int = 0
    total_earnings: Decimal = Field(default=Decimal('0.00'))
    average_rating: Optional[Decimal] = None
    total_reviews: int = 0


# Location and specialty validation
ISRAELI_CITIES = [
    "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "אשדוד", "נתניה", "באר שבע",
    "בני ברק", "חולון", "רמת גן", "פתח תקווה", "אשקלון", "כפר סבא", "הרצליה",
    "חדרה", "מודיעין", "רעננה", "בת ים", "קריית מלאכי", "אילת", "טבריה",
    "צפת", "נצרת", "עכו", "קריית גת", "קריית ביאליק", "יהוד", "רחובות",
    "לוד", "רמלה", "מגדל העמק", "אור יהודה", "נס ציונה", "גבעתיים"
]

PROFESSIONAL_SPECIALTIES = [
    "שיפוצים כלליים", "חשמל", "מים", "צבע וטיח", "רצפות ואריחים",
    "נגרות ורהיטים", "גינון ונוף", "מערכות מיזוג", "מערכות אבטחה",
    "ניקיון", "הובלות", "טכנאי מחשבים", "מורה פרטי", "טיפוח ויופי",
    "אימון כושר", "רפואה משלימה", "מזון וקייטרינג", "אירועים",
    "צילום", "עיצוב גרפי", "ייעוץ משפטי", "ייעוץ עסקי", "רכב",
    "חיות מחמד", "ביטוח", "נדלן"
]


def validate_hebrew_text(text: str) -> str:
    """Validate Hebrew text."""
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")
    
    text = text.strip()
    
    # Check for Hebrew characters
    has_hebrew = any('\u0590' <= char <= '\u05FF' for char in text)
    
    if not has_hebrew and len(text.split()) > 1:
        # Allow transliterated text but prefer Hebrew
        pass
    
    return text


def validate_location(location: str) -> str:
    """Validate Israeli location."""
    location = validate_hebrew_text(location)
    
    # Check if it contains a known Israeli city
    location_found = any(
        city.lower() in location.lower() or location.lower() in city.lower()
        for city in ISRAELI_CITIES
    )
    
    if not location_found:
        # Log warning but don't reject
        import logging
        logging.getLogger(__name__).warning(f"Unknown location: {location}")
    
    return location


def validate_specialties(specialties: List[str]) -> List[str]:
    """Validate professional specialties."""
    if not specialties:
        raise ValueError("At least one specialty is required")
    
    if len(specialties) > 10:
        raise ValueError("Maximum 10 specialties allowed")
    
    validated = []
    for specialty in specialties:
        specialty = validate_hebrew_text(specialty)
        
        # Check if it's a known specialty
        if specialty not in PROFESSIONAL_SPECIALTIES:
            import logging
            logging.getLogger(__name__).warning(f"Unknown specialty: {specialty}")
        
        validated.append(specialty)
    
    return validated


def validate_profession(profession: str) -> str:
    """Validate profession name."""
    return validate_hebrew_text(profession)


def validate_company_name(company_name: str) -> str:
    """Validate company name."""
    if not company_name:
        return company_name
    return validate_hebrew_text(company_name)


# Add validators to models
ProfessionalBase.__validator_by_name = {
    'profession': validator('profession', allow_reuse=True)(validate_profession),
    'company_name': validator('company_name', allow_reuse=True)(validate_company_name),
    'specialties': validator('specialties', allow_reuse=True)(validate_specialties),
    'location': validator('location', allow_reuse=True)(validate_location)
}

ProfessionalCreate.__validator_by_name = {
    'profession': validator('profession', allow_reuse=True)(validate_profession),
    'company_name': validator('company_name', allow_reuse=True)(validate_company_name),
    'specialties': validator('specialties', allow_reuse=True)(validate_specialties),
    'location': validator('location', allow_reuse=True)(validate_location)
}

ProfessionalUpdate.__validator_by_name = {
    'profession': validator('profession', allow_reuse=True)(validate_profession),
    'company_name': validator('company_name', allow_reuse=True)(validate_company_name),
    'specialties': validator('specialties', allow_reuse=True)(validate_specialties),
    'location': validator('location', allow_reuse=True)(validate_location)
}