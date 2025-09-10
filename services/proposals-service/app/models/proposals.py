"""
Pydantic models for proposal operations with comprehensive Hebrew/RTL support.

This module provides data validation and serialization models for all
proposal-related operations including creation, updates, media uploads,
and status management with full Hebrew text support.
"""

import re
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any, Union
from enum import Enum

from pydantic import BaseModel, Field, validator, ConfigDict
from pydantic_core import ValidationError


# Enums
class ProposalStatusEnum(str, Enum):
    """Proposal status enumeration."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class MediaTypeEnum(str, Enum):
    """Media file type enumeration."""
    IMAGE = "image"
    DOCUMENT = "document"
    VIDEO = "video"


class NotificationTypeEnum(str, Enum):
    """Notification type for proposal updates."""
    NEW_PROPOSAL = "new_proposal"
    PROPOSAL_ACCEPTED = "proposal_accepted"
    PROPOSAL_REJECTED = "proposal_rejected"
    PROPOSAL_UPDATED = "proposal_updated"


# Validation helpers
def validate_hebrew_text(text: str, allow_mixed: bool = True) -> str:
    """
    Validate Hebrew text with RTL support.
    
    Args:
        text: Text to validate
        allow_mixed: Allow mixed Hebrew/English content
        
    Returns:
        Validated text
        
    Raises:
        ValueError: If text validation fails
    """
    if not text or not text.strip():
        raise ValueError("Text cannot be empty")
    
    # Hebrew character range: \u0590-\u05FF
    hebrew_pattern = r'[\u0590-\u05FF]'
    has_hebrew = bool(re.search(hebrew_pattern, text))
    
    if not allow_mixed and not has_hebrew:
        raise ValueError("Text must contain Hebrew characters")
    
    # Check for prohibited characters
    prohibited_pattern = r'[<>\"\'&]'
    if re.search(prohibited_pattern, text):
        raise ValueError("Text contains prohibited characters")
    
    return text.strip()


def validate_israeli_currency(amount: Decimal) -> Decimal:
    """
    Validate Israeli currency amount.
    
    Args:
        amount: Amount to validate
        
    Returns:
        Validated amount
        
    Raises:
        ValueError: If amount is invalid
    """
    if amount <= 0:
        raise ValueError("Amount must be positive")
    
    if amount > Decimal("1000000"):  # 1M ILS max
        raise ValueError("Amount exceeds maximum limit")
    
    # Round to 2 decimal places for ILS
    return amount.quantize(Decimal("0.01"))


def validate_media_filename(filename: str) -> str:
    """
    Validate media filename with Hebrew support.
    
    Args:
        filename: Filename to validate
        
    Returns:
        Validated filename
        
    Raises:
        ValueError: If filename is invalid
    """
    if not filename or len(filename) < 1:
        raise ValueError("Filename cannot be empty")
    
    if len(filename) > 255:
        raise ValueError("Filename too long")
    
    # Allow Hebrew characters in filenames
    valid_pattern = r'^[\u0590-\u05FFa-zA-Z0-9._\-\s]+$'
    if not re.match(valid_pattern, filename):
        raise ValueError("Filename contains invalid characters")
    
    return filename.strip()


# Base models
class BaseProposalModel(BaseModel):
    """Base model for all proposal-related models."""
    
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        use_enum_values=True,
        populate_by_name=True
    )


# Request models
class ProposalCreateRequest(BaseProposalModel):
    """Request model for creating a new proposal."""
    
    lead_id: uuid.UUID = Field(
        ...,
        description="ID of the lead to submit proposal for"
    )
    
    price: Decimal = Field(
        ...,
        gt=0,
        description="Proposed price in Israeli Shekels (ILS)",
        json_schema_extra={"example": "2500.00"}
    )
    
    description: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Hebrew/English proposal description",
        json_schema_extra={
            "example": "אני מציע לבצע את העבודה בתוך שבועיים עם ערבות מלאה על האיכות"
        }
    )
    
    scheduled_date: Optional[datetime] = Field(
        None,
        description="Proposed start date for the work"
    )
    
    estimated_duration_days: Optional[int] = Field(
        None,
        ge=1,
        le=365,
        description="Estimated work duration in days"
    )
    
    @validator("price")
    def validate_price(cls, v):
        """Validate price amount."""
        return validate_israeli_currency(v)
    
    @validator("description")
    def validate_description(cls, v):
        """Validate proposal description."""
        return validate_hebrew_text(v, allow_mixed=True)
    
    @validator("scheduled_date")
    def validate_scheduled_date(cls, v):
        """Validate scheduled date is in the future."""
        if v and v <= datetime.now():
            raise ValueError("Scheduled date must be in the future")
        return v


class ProposalUpdateRequest(BaseProposalModel):
    """Request model for updating an existing proposal."""
    
    price: Optional[Decimal] = Field(
        None,
        gt=0,
        description="Updated proposed price in ILS"
    )
    
    description: Optional[str] = Field(
        None,
        min_length=10,
        max_length=2000,
        description="Updated Hebrew/English proposal description"
    )
    
    scheduled_date: Optional[datetime] = Field(
        None,
        description="Updated proposed start date"
    )
    
    estimated_duration_days: Optional[int] = Field(
        None,
        ge=1,
        le=365,
        description="Updated estimated duration in days"
    )
    
    @validator("price")
    def validate_price(cls, v):
        """Validate price amount."""
        return validate_israeli_currency(v) if v is not None else v
    
    @validator("description")
    def validate_description(cls, v):
        """Validate proposal description."""
        return validate_hebrew_text(v, allow_mixed=True) if v is not None else v
    
    @validator("scheduled_date")
    def validate_scheduled_date(cls, v):
        """Validate scheduled date is in the future."""
        if v and v <= datetime.now():
            raise ValueError("Scheduled date must be in the future")
        return v


class ProposalActionRequest(BaseProposalModel):
    """Request model for proposal acceptance/rejection."""
    
    reason: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional Hebrew/English reason for the action"
    )
    
    @validator("reason")
    def validate_reason(cls, v):
        """Validate reason text."""
        return validate_hebrew_text(v, allow_mixed=True) if v is not None else v


class MediaUploadRequest(BaseProposalModel):
    """Request model for media file upload."""
    
    filename: str = Field(
        ...,
        description="Original filename with Hebrew support"
    )
    
    content_type: str = Field(
        ...,
        description="MIME type of the file"
    )
    
    description: Optional[str] = Field(
        None,
        max_length=200,
        description="Hebrew/English file description"
    )
    
    file_size: int = Field(
        ...,
        gt=0,
        description="File size in bytes"
    )
    
    @validator("filename")
    def validate_filename(cls, v):
        """Validate filename."""
        return validate_media_filename(v)
    
    @validator("content_type")
    def validate_content_type(cls, v):
        """Validate content type."""
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
        
        if v not in allowed_types:
            raise ValueError(f"Content type {v} is not allowed")
        
        return v
    
    @validator("file_size")
    def validate_file_size(cls, v, values):
        """Validate file size based on content type."""
        content_type = values.get("content_type", "")
        
        if content_type.startswith("image/"):
            max_size = 10 * 1024 * 1024  # 10MB for images
        elif content_type.startswith("video/"):
            max_size = 100 * 1024 * 1024  # 100MB for videos
        else:
            max_size = 25 * 1024 * 1024  # 25MB for documents
        
        if v > max_size:
            raise ValueError(f"File size exceeds maximum allowed size")
        
        return v
    
    @validator("description")
    def validate_description(cls, v):
        """Validate file description."""
        return validate_hebrew_text(v, allow_mixed=True) if v is not None else v


# Response models
class MediaFileResponse(BaseProposalModel):
    """Response model for media file information."""
    
    id: uuid.UUID
    filename: str
    original_filename: str
    content_type: str
    file_size: int
    description: Optional[str]
    url: str
    thumbnail_url: Optional[str]
    media_type: MediaTypeEnum
    uploaded_at: datetime


class ProfessionalSummary(BaseProposalModel):
    """Summary information about a professional."""
    
    id: uuid.UUID
    name: str
    company_name: Optional[str]
    profession: str
    rating: Optional[Decimal]
    review_count: int
    is_verified: bool
    location: str


class LeadSummary(BaseProposalModel):
    """Summary information about a lead."""
    
    id: uuid.UUID
    title: str
    category: str
    location: str
    type: str
    status: str
    created_at: datetime


class ProposalResponse(BaseProposalModel):
    """Response model for proposal details."""
    
    id: uuid.UUID
    lead_id: uuid.UUID
    professional_id: uuid.UUID
    price: Decimal
    description: str
    scheduled_date: Optional[datetime]
    estimated_duration_days: Optional[int]
    status: ProposalStatusEnum
    created_at: datetime
    updated_at: datetime
    
    # Related data
    professional: ProfessionalSummary
    lead: LeadSummary
    media_files: List[MediaFileResponse]
    
    # Status tracking
    accepted_at: Optional[datetime]
    rejected_at: Optional[datetime]
    rejection_reason: Optional[str]


class ProposalListItem(BaseProposalModel):
    """Response model for proposal list items."""
    
    id: uuid.UUID
    lead_id: uuid.UUID
    lead_title: str
    lead_category: str
    lead_location: str
    professional_name: str
    professional_company: Optional[str]
    price: Decimal
    status: ProposalStatusEnum
    created_at: datetime
    media_count: int


class ProposalListResponse(BaseProposalModel):
    """Response model for proposal lists."""
    
    proposals: List[ProposalListItem]
    total: int
    page: int
    per_page: int
    has_next: bool
    has_prev: bool


class ProposalStatsResponse(BaseProposalModel):
    """Response model for proposal statistics."""
    
    total_proposals: int
    pending_proposals: int
    accepted_proposals: int
    rejected_proposals: int
    acceptance_rate: Decimal
    average_response_time_hours: Optional[Decimal]
    total_value_accepted: Decimal
    media_files_count: int


class PiiRevelationResponse(BaseProposalModel):
    """Response model for PII revelation after acceptance."""
    
    client_name: str
    client_phone: str
    client_address: Optional[str]
    client_email: Optional[str]
    full_description: str
    revealed_at: datetime


# Error response models
class ValidationErrorResponse(BaseProposalModel):
    """Response model for validation errors."""
    
    error: str = "Validation failed"
    message: str
    details: List[Dict[str, Any]]


class ProposalErrorResponse(BaseProposalModel):
    """Response model for proposal operation errors."""
    
    error: str
    message: str
    error_code: Optional[str]
    details: Optional[Dict[str, Any]]


# Search and filter models
class ProposalSearchFilters(BaseProposalModel):
    """Search filters for proposals."""
    
    status: Optional[ProposalStatusEnum] = None
    lead_category: Optional[str] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    created_from: Optional[datetime] = None
    created_to: Optional[datetime] = None
    professional_id: Optional[uuid.UUID] = None
    lead_id: Optional[uuid.UUID] = None
    
    @validator("min_price", "max_price")
    def validate_price_range(cls, v):
        """Validate price range."""
        return validate_israeli_currency(v) if v is not None else v


class ProposalSearchResponse(BaseProposalModel):
    """Response model for proposal search results."""
    
    results: List[ProposalListItem]
    total: int
    page: int
    per_page: int
    filters_applied: ProposalSearchFilters
    has_next: bool
    has_prev: bool


# Notification models
class NotificationPayload(BaseProposalModel):
    """Payload for proposal-related notifications."""
    
    proposal_id: uuid.UUID
    lead_id: uuid.UUID
    lead_title: str
    professional_name: str
    price: Decimal
    status: ProposalStatusEnum
    message_hebrew: str
    message_english: str
    action_url: Optional[str]


class NotificationRequest(BaseProposalModel):
    """Request model for sending notifications."""
    
    user_id: uuid.UUID
    notification_type: NotificationTypeEnum
    payload: NotificationPayload
    channels: List[str] = Field(
        default=["email", "push"],
        description="Notification channels to use"
    )
    
    @validator("channels")
    def validate_channels(cls, v):
        """Validate notification channels."""
        allowed_channels = ["email", "sms", "push", "whatsapp"]
        for channel in v:
            if channel not in allowed_channels:
                raise ValueError(f"Invalid notification channel: {channel}")
        return v


# Commission calculation models
class CommissionCalculationRequest(BaseProposalModel):
    """Request model for commission calculation."""
    
    proposal_id: uuid.UUID
    final_amount: Decimal
    payment_method: str
    
    @validator("final_amount")
    def validate_final_amount(cls, v):
        """Validate final amount."""
        return validate_israeli_currency(v)


class CommissionBreakdown(BaseProposalModel):
    """Commission breakdown details."""
    
    total_amount: Decimal
    platform_commission: Decimal
    platform_commission_rate: Decimal
    referrer_fee: Decimal
    referrer_fee_rate: Decimal
    professional_net_amount: Decimal
    
    
class CommissionCalculationResponse(BaseProposalModel):
    """Response model for commission calculation."""
    
    proposal_id: uuid.UUID
    breakdown: CommissionBreakdown
    calculation_date: datetime
    payment_reference: str