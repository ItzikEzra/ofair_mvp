"""Pydantic models for Leads Service."""

import uuid
import re
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any, Union
from enum import Enum

from pydantic import BaseModel, Field, field_validator, model_validator, computed_field
from geopy.geocoders import Nominatim


class LeadType(str, Enum):
    """Lead type enumeration."""
    CONSUMER = "consumer"
    PROFESSIONAL_REFERRAL = "professional_referral"


class LeadStatus(str, Enum):
    """Lead status enumeration."""
    ACTIVE = "active"
    PENDING = "pending"
    CLOSED = "closed"


class ProfessionalStatus(str, Enum):
    """Professional status enumeration."""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    INACTIVE = "inactive"


class HebrewCategories:
    """Hebrew category constants."""
    
    CATEGORIES = {
        "renovation": "שיפוצים ובנייה",
        "cleaning": "ניקיון",
        "gardening": "גינון",
        "maintenance": "תחזוקה",
        "electrical": "חשמל",
        "plumbing": "אינסטלציה",
        "painting": "צביעה",
        "moving": "הובלות",
        "photography": "צילום",
        "catering": "קייטרינג",
        "beauty": "יופי ואסתטיקה",
        "fitness": "כושר",
        "education": "חינוך ולימודים",
        "legal": "משפטים",
        "finance": "כספים וחשבונאות",
        "technology": "טכנולוgiה",
        "health": "בריאות",
        "design": "עיצוב",
        "consulting": "ייעוץ",
        "other": "אחר"
    }
    
    @classmethod
    def get_hebrew_name(cls, category: str) -> str:
        """Get Hebrew name for category."""
        return cls.CATEGORIES.get(category, category)
    
    @classmethod
    def get_category_key(cls, hebrew_name: str) -> Optional[str]:
        """Get category key from Hebrew name."""
        for key, value in cls.CATEGORIES.items():
            if value == hebrew_name:
                return key
        return None
    
    @classmethod
    def get_all_categories(cls) -> Dict[str, str]:
        """Get all categories with Hebrew names."""
        return cls.CATEGORIES.copy()


# Validation helpers
def validate_israeli_phone(phone: str) -> str:
    """Validate and format Israeli phone number."""
    # Remove all non-digits
    digits = re.sub(r'\D', '', phone)
    
    # Israeli phone number patterns
    if digits.startswith('972'):
        # International format
        if len(digits) == 12:
            return f"+{digits}"
    elif digits.startswith('0'):
        # Local format
        if len(digits) == 10:
            return f"+972{digits[1:]}"
    
    raise ValueError("Invalid Israeli phone number format")


def validate_hebrew_text(text: str) -> str:
    """Validate that text contains Hebrew characters or is reasonable for Hebrew content."""
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")
    
    # Allow Hebrew, English, numbers, and common punctuation
    allowed_pattern = r'^[\u0590-\u05FF\u200F\u200Ea-zA-Z0-9\s.,!?()"\'-/:@#$%&*+=\[\]{}<>]+$'
    if not re.match(allowed_pattern, text.strip()):
        raise ValueError("Text contains invalid characters for Hebrew content")
    
    return text.strip()


def validate_israeli_location(location: str) -> str:
    """Validate Israeli location string."""
    if not location or len(location.strip()) < 2:
        raise ValueError("Location must be at least 2 characters")
    
    # Hebrew cities pattern
    hebrew_cities = [
        "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "אשדוד", "נתניה", "באר שבע",
        "בני ברק", "הרצליה", "כפר סבא", "רעננה", "רחובות", "פתח תקווה", "רמת גן"
    ]
    
    location_clean = location.strip()
    
    # Check if it's a known Hebrew city or contains Hebrew
    if any(city in location_clean for city in hebrew_cities) or re.search(r'[\u0590-\u05FF]', location_clean):
        return validate_hebrew_text(location_clean)
    
    # Allow English location names too
    if re.match(r'^[a-zA-Z0-9\s.,\'-]+$', location_clean):
        return location_clean
    
    raise ValueError("Invalid location format")


# Base models
class BaseLeadModel(BaseModel):
    """Base model for all lead-related models."""
    
    model_config = {
        "str_strip_whitespace": True,
        "use_enum_values": True,
        "populate_by_name": True,
        "json_encoders": {
            datetime: lambda dt: dt.isoformat(),
            Decimal: lambda d: float(d),
            uuid.UUID: lambda u: str(u)
        }
    }


# Request models
class LeadCreateRequest(BaseLeadModel):
    """Request model for creating a new lead."""
    
    type: LeadType = Field(..., description="Lead type")
    title: str = Field(..., min_length=5, max_length=500, description="Lead title")
    short_description: str = Field(..., min_length=10, max_length=1000, description="Short description")
    category: str = Field(..., description="Lead category")
    location: str = Field(..., description="Lead location")
    
    # Consumer lead specific fields
    client_name: Optional[str] = Field(None, min_length=2, max_length=255, description="Client name for consumer leads")
    client_phone: Optional[str] = Field(None, description="Client phone for consumer leads")  
    client_address: Optional[str] = Field(None, description="Client address for consumer leads")
    full_description: Optional[str] = Field(None, description="Full description for consumer leads")
    
    # Professional lead specific fields
    estimated_budget: Optional[Decimal] = Field(None, gt=0, description="Estimated budget")
    attachments: Optional[List[str]] = Field(default=[], description="S3 paths to attachments")
    preferred_schedule: Optional[str] = Field(None, description="Preferred schedule")
    referrer_share_percentage: Optional[Decimal] = Field(
        default=Decimal("0.00"), 
        ge=0, 
        le=90, 
        description="Referrer share percentage (0-90%)"
    )
    
    @field_validator('title', 'short_description', 'full_description')
    @classmethod
    def validate_hebrew_content(cls, v):
        if v:
            return validate_hebrew_text(v)
        return v
    
    @field_validator('location')
    @classmethod
    def validate_location(cls, v):
        return validate_israeli_location(v)
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        if v not in HebrewCategories.CATEGORIES:
            raise ValueError(f"Invalid category. Must be one of: {list(HebrewCategories.CATEGORIES.keys())}")
        return v
    
    @field_validator('client_phone')
    @classmethod
    def validate_phone(cls, v):
        if v:
            return validate_israeli_phone(v)
        return v
    
    @model_validator(mode='after')
    def validate_lead_type_fields(self):
        if self.type == LeadType.CONSUMER:
            required_fields = ['client_name', 'client_phone', 'client_address', 'full_description']
            for field in required_fields:
                if not getattr(self, field, None):
                    raise ValueError(f"{field} is required for consumer leads")
        
        elif self.type == LeadType.PROFESSIONAL_REFERRAL:
            if not self.estimated_budget:
                raise ValueError("estimated_budget is required for professional referral leads")
        
        return self


class LeadUpdateRequest(BaseLeadModel):
    """Request model for updating an existing lead."""
    
    title: Optional[str] = Field(None, min_length=5, max_length=500)
    short_description: Optional[str] = Field(None, min_length=10, max_length=1000)
    category: Optional[str] = Field(None)
    location: Optional[str] = Field(None)
    status: Optional[LeadStatus] = Field(None)
    
    # Consumer lead fields
    full_description: Optional[str] = Field(None)
    
    # Professional lead fields
    estimated_budget: Optional[Decimal] = Field(None, gt=0)
    attachments: Optional[List[str]] = Field(None)
    preferred_schedule: Optional[str] = Field(None)
    
    @field_validator('title', 'short_description', 'full_description')
    @classmethod
    def validate_hebrew_content(cls, v):
        if v:
            return validate_hebrew_text(v)
        return v
    
    @field_validator('location')
    @classmethod
    def validate_location(cls, v):
        if v:
            return validate_israeli_location(v)
        return v
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        if v and v not in HebrewCategories.CATEGORIES:
            raise ValueError(f"Invalid category. Must be one of: {list(HebrewCategories.CATEGORIES.keys())}")
        return v


class LeadShareRequest(BaseLeadModel):
    """Request model for sharing/referring a lead."""
    
    receiver_professional_id: uuid.UUID = Field(..., description="Professional ID to share lead with")
    commission_percentage: Optional[Decimal] = Field(
        default=None, 
        ge=0, 
        le=90, 
        description="Commission percentage for referral"
    )
    
    @field_validator('commission_percentage')
    @classmethod
    def validate_commission(cls, v):
        if v is not None and v < 0:
            raise ValueError("Commission percentage must be non-negative")
        return v


# Response models
class LeadListItem(BaseLeadModel):
    """Lead item model for list responses (public, masked data)."""
    
    id: uuid.UUID
    type: LeadType
    title: str
    short_description: str
    category: str
    category_hebrew: str
    location: str
    status: LeadStatus
    created_at: datetime
    updated_at: datetime
    
    # Professional details (if available and not PII)
    estimated_budget: Optional[Decimal] = None
    
    # Creator info (masked)
    creator_masked: bool = True
    
    @property 
    def category_hebrew(self) -> str:
        """Get Hebrew category name."""
        return HebrewCategories.get_hebrew_name(self.category)


class LeadDetailResponse(BaseLeadModel):
    """Detailed lead response model."""
    
    id: uuid.UUID
    type: LeadType
    title: str
    short_description: str
    category: str
    category_hebrew: str
    location: str
    status: LeadStatus
    created_at: datetime
    updated_at: datetime
    
    # Creator information
    created_by_user_id: uuid.UUID
    created_by_professional_id: Optional[uuid.UUID] = None
    
    # PII fields (only visible to authorized users)
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    full_description: Optional[str] = None
    
    # Professional lead specific
    estimated_budget: Optional[Decimal] = None
    attachments: Optional[List[str]] = None
    preferred_schedule: Optional[str] = None
    referrer_share_percentage: Optional[Decimal] = None
    
    # Aggregated data
    proposal_count: int = 0
    has_user_proposed: bool = False
    final_amount: Optional[Decimal] = None
    
    @property 
    def category_hebrew(self) -> str:
        """Get Hebrew category name."""
        return HebrewCategories.get_hebrew_name(self.category)


class LeadBoardItem(BaseLeadModel):
    """Lead Board item with matching score and prioritization."""
    
    id: uuid.UUID
    type: LeadType
    title: str
    short_description: str
    category: str
    category_hebrew: str
    location: str
    created_at: datetime
    
    # Matching and scoring
    match_score: float = Field(..., description="Match score (0-100)")
    distance_km: Optional[float] = None
    category_match: bool = False
    location_match: bool = False
    
    # Subscription benefits
    is_priority: bool = Field(default=False, description="Priority for paid subscribers")
    
    # Professional lead info
    estimated_budget: Optional[Decimal] = None
    referrer_share_percentage: Optional[Decimal] = None
    
    @property 
    def category_hebrew(self) -> str:
        """Get Hebrew category name."""
        return HebrewCategories.get_hebrew_name(self.category)


class LeadCategoriesResponse(BaseLeadModel):
    """Categories list response."""
    
    categories: Dict[str, str] = Field(default_factory=dict, description="Category key to Hebrew name mapping")


class LeadSearchFilters(BaseLeadModel):
    """Lead search filters."""
    
    category: Optional[str] = None
    location: Optional[str] = None
    radius_km: Optional[int] = Field(None, ge=1, le=100, description="Search radius in kilometers")
    min_budget: Optional[Decimal] = Field(None, ge=0)
    max_budget: Optional[Decimal] = Field(None, ge=0)
    lead_type: Optional[LeadType] = None
    status: Optional[LeadStatus] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    subscription_filter: Optional[bool] = Field(None, description="Filter for subscription holders only")
    
    @field_validator('location')
    @classmethod
    def validate_location(cls, v):
        if v:
            return validate_israeli_location(v)
        return v
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        if v and v not in HebrewCategories.CATEGORIES:
            raise ValueError(f"Invalid category. Must be one of: {list(HebrewCategories.CATEGORIES.keys())}")
        return v
    
    @model_validator(mode='after')
    def validate_budget_range(self):
        if self.min_budget and self.max_budget and self.min_budget > self.max_budget:
            raise ValueError("min_budget cannot be greater than max_budget")
        return self


class LeadSearchResponse(BaseLeadModel):
    """Lead search response."""
    
    leads: List[LeadListItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool
    filters: LeadSearchFilters


class LeadBoardResponse(BaseLeadModel):
    """Lead Board response."""
    
    leads: List[LeadBoardItem]
    total_matches: int
    subscription_benefits_applied: bool
    last_updated: datetime
    personalization_factors: Dict[str, Any] = Field(default_factory=dict)


class ReferralResponse(BaseLeadModel):
    """Referral creation response."""
    
    id: uuid.UUID
    lead_id: uuid.UUID
    referrer_professional_id: uuid.UUID
    receiver_professional_id: uuid.UUID
    commission_percentage: Decimal
    status: str
    created_at: datetime


# Error models
class LeadErrorResponse(BaseLeadModel):
    """Error response model."""
    
    error: str
    detail: str
    code: Optional[str] = None


class ValidationErrorResponse(BaseLeadModel):
    """Validation error response model."""
    
    error: str = "Validation failed"
    details: List[Dict[str, Any]]