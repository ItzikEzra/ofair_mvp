from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from enum import Enum

class ReferralStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"

class CommissionStatus(str, Enum):
    PENDING = "pending"
    CALCULATED = "calculated"
    APPROVED = "approved"
    PAID = "paid"
    DISPUTED = "disputed"

class PaymentMethod(str, Enum):
    BANK_TRANSFER = "bank_transfer"
    PAYPAL = "paypal"
    CRYPTOCURRENCY = "cryptocurrency"
    CHECK = "check"

class CreateReferralRequest(BaseModel):
    lead_id: str = Field(..., description="מזהה הליד")
    proposal_id: str = Field(..., description="מזהה ההצעה")
    commission_rate: Optional[Decimal] = Field(None, description="אחוז עמלה מותאם אישית")
    context: Optional[Dict[str, Any]] = Field(None, description="הקשר נוסף להפניה")
    
    @field_validator('commission_rate')
    @classmethod
    def validate_commission_rate(cls, v):
        if v is not None and (v < 0 or v > 1):
            raise ValueError("אחוז העמלה חייב להיות בין 0 ל-1")
        return v

class ReferralResponse(BaseModel):
    id: str
    referrer_id: str
    referred_user_id: str
    lead_id: str
    proposal_id: str
    status: ReferralStatus
    commission_rate: Decimal
    total_commission_amount: Optional[Decimal] = None
    referrer_commission: Optional[Decimal] = None
    platform_commission: Optional[Decimal] = None
    context: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CommissionCalculationRequest(BaseModel):
    referral_id: str = Field(..., description="מזהה ההפניה")
    lead_value: Decimal = Field(..., description="ערך הליד בשקלים")
    payment_confirmed: bool = Field(False, description="האם התשלום אושר")
    
    @field_validator('lead_value')
    @classmethod
    def validate_lead_value(cls, v):
        if v <= 0:
            raise ValueError("ערך הליד חייב להיות חיובי")
        return v

class CommissionBreakdown(BaseModel):
    recipient_id: str
    recipient_type: str  # "referrer", "platform", "sub_referrer"
    amount: Decimal
    percentage: Decimal
    description: str
    level: int  # Level in referral chain (0 = direct referrer)

class CommissionCalculationResponse(BaseModel):
    referral_id: str
    lead_value: Decimal
    total_commission: Decimal
    breakdown: List[CommissionBreakdown]
    status: CommissionStatus
    calculated_at: datetime
    payment_due_date: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class ReferralChainNode(BaseModel):
    referral_id: str
    referrer_id: str
    referrer_name: str
    level: int
    commission_rate: Decimal
    commission_amount: Optional[Decimal] = None
    status: ReferralStatus

class ReferralChainResponse(BaseModel):
    root_referral_id: str
    lead_id: str
    proposal_id: str
    total_chain_length: int
    nodes: List[ReferralChainNode]
    total_commission_distributed: Decimal
    created_at: datetime

class ProcessPaymentRequest(BaseModel):
    payment_method: PaymentMethod = Field(..., description="שיטת תשלום")
    transaction_id: str = Field(..., description="מזהה עסקה")
    notes: Optional[str] = Field(None, description="הערות נוספות")

class PaymentResponse(BaseModel):
    commission_id: str
    amount: Decimal
    payment_method: PaymentMethod
    transaction_id: str
    processed_at: datetime
    processed_by: str
    status: str
    notes: Optional[str] = None
    
    class Config:
        from_attributes = True

class ReferralStatsResponse(BaseModel):
    user_id: str
    period_start: datetime
    period_end: datetime
    total_referrals: int
    active_referrals: int
    completed_referrals: int
    total_commission_earned: Decimal
    total_commission_paid: Decimal
    pending_commission: Decimal
    success_rate: float  # Percentage of completed vs total referrals
    average_commission_per_referral: Decimal
    top_performing_categories: List[Dict[str, Any]]
    monthly_breakdown: List[Dict[str, Any]]
    
    class Config:
        from_attributes = True

# Database model mappings for SQLAlchemy integration
class ReferralDB(BaseModel):
    """Database representation mapping"""
    id: str
    referrer_id: str
    referred_user_id: str
    lead_id: str
    proposal_id: str
    status: str
    commission_rate: Decimal
    total_commission_amount: Optional[Decimal] = None
    referrer_commission: Optional[Decimal] = None
    platform_commission: Optional[Decimal] = None
    context: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class CommissionDB(BaseModel):
    """Commission database representation"""
    id: str
    referral_id: str
    recipient_id: str
    recipient_type: str
    amount: Decimal
    percentage: Decimal
    status: str
    calculated_at: datetime
    paid_at: Optional[datetime] = None
    payment_method: Optional[str] = None
    transaction_id: Optional[str] = None
    processed_by: Optional[str] = None
    
    class Config:
        from_attributes = True