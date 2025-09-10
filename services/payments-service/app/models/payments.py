from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal
from enum import Enum

class CommissionType(str, Enum):
    CUSTOMER_JOB = "customer_job"  # Customer→Professional (10% commission)
    REFERRAL_JOB = "referral_job"  # Professional referral (5% + revenue share)

class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"

class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

class PaymentGateway(str, Enum):
    STRIPE = "stripe"
    CARDCOM = "cardcom"
    TRANZILLA = "tranzilla"

class PayoutMethod(str, Enum):
    BANK_TRANSFER = "bank_transfer"
    CREDIT_TO_NEXT_INVOICE = "credit_to_next_invoice"
    MANUAL_CHECK = "manual_check"

class CommissionRequest(BaseModel):
    professional_id: str = Field(..., description="מזהה מקצוען")
    job_id: str = Field(..., description="מזהה עבודה")
    job_value: Decimal = Field(..., description="ערך העבודה בשקלים")
    commission_type: CommissionType = Field(..., description="סוג העמלה")
    commission_rate: Optional[Decimal] = Field(None, description="אחוז עמלה מותאם")
    referrer_id: Optional[str] = Field(None, description="מזהה מפנה (אם רלוונטי)")
    referrer_share_rate: Optional[Decimal] = Field(None, description="אחוז חלק מפנה")
    
    @field_validator('job_value')
    @classmethod
    def validate_job_value(cls, v):
        if v <= 0:
            raise ValueError("ערך העבודה חייב להיות חיובי")
        return v
    
    @field_validator('commission_rate')
    @classmethod
    def validate_commission_rate(cls, v):
        if v is not None and (v < 0 or v > 1):
            raise ValueError("אחוז העמלה חייב להיות בין 0 ל-1")
        return v

class CommissionResponse(BaseModel):
    id: str
    professional_id: str
    job_id: str
    job_value: Decimal
    commission_type: CommissionType
    commission_rate: Decimal
    commission_amount: Decimal
    referrer_id: Optional[str] = None
    referrer_share_amount: Optional[Decimal] = None
    platform_amount: Decimal
    status: str
    recorded_at: datetime
    recorded_by: str
    
    class Config:
        from_attributes = True

class BalanceResponse(BaseModel):
    professional_id: str
    professional_name: str
    outstanding_commissions: Decimal  # Money owed TO platform
    pending_revenue_shares: Decimal   # Money owed BY platform
    net_balance: Decimal             # Negative = owes platform, Positive = platform owes professional
    last_updated: datetime
    next_settlement_date: Optional[datetime] = None
    autopay_enabled: bool = False
    
    class Config:
        from_attributes = True

class InvoiceLineItem(BaseModel):
    description: str
    amount: Decimal
    commission_id: Optional[str] = None
    job_reference: Optional[str] = None

class InvoiceResponse(BaseModel):
    id: str
    professional_id: str
    professional_name: str
    invoice_number: str
    month: int
    year: int
    issue_date: datetime
    due_date: datetime
    status: InvoiceStatus
    subtotal: Decimal
    vat_amount: Decimal
    total_amount: Decimal
    line_items: List[InvoiceLineItem]
    pdf_url: Optional[str] = None
    payment_url: Optional[str] = None
    created_by: str
    
    class Config:
        from_attributes = True

class PaymentRequest(BaseModel):
    invoice_id: str = Field(..., description="מזהה חשבונית")
    amount: Decimal = Field(..., description="סכום לחיוב")
    payment_method: str = Field(..., description="אמצעי תשלום")
    gateway_provider: PaymentGateway = Field(..., description="ספק תשלומים")
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("סכום התשלום חייב להיות חיובי")
        return v

class PaymentResponse(BaseModel):
    id: str
    invoice_id: str
    amount: Decimal
    payment_method: str
    gateway_provider: PaymentGateway
    gateway_transaction_id: Optional[str] = None
    status: PaymentStatus
    processed_at: datetime
    processed_by: str
    failure_reason: Optional[str] = None
    
    class Config:
        from_attributes = True

class BankDetails(BaseModel):
    bank_name: str = Field(..., description="שם בנק")
    branch_number: str = Field(..., description="מספר סניף")
    account_number: str = Field(..., description="מספר חשבון")
    account_holder_name: str = Field(..., description="שם בעל החשבון")
    swift_code: Optional[str] = Field(None, description="קוד SWIFT")

class PayoutRequest(BaseModel):
    professional_id: str = Field(..., description="מזהה מקצוען")
    amount: Decimal = Field(..., description="סכום לתשלום")
    payout_method: PayoutMethod = Field(..., description="שיטת תשלום")
    bank_details: Optional[BankDetails] = Field(None, description="פרטי בנק")
    reference: Optional[str] = Field(None, description="הפניה")
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("סכום התשלום חייב להיות חיובי")
        return v

class PayoutResponse(BaseModel):
    id: str
    professional_id: str
    amount: Decimal
    payout_method: PayoutMethod
    status: str
    created_at: datetime
    processed_at: Optional[datetime] = None
    bank_details: Optional[BankDetails] = None
    reference: Optional[str] = None
    created_by: str
    
    class Config:
        from_attributes = True

class SettlementRequest(BaseModel):
    professional_a_id: str = Field(..., description="מזהה מקצוען א'")
    professional_b_id: str = Field(..., description="מזהה מקצוען ב'")
    offset_amount: Decimal = Field(..., description="סכום קיזוז")
    description: Optional[str] = Field(None, description="תיאור הקיזוז")
    
    @field_validator('offset_amount')
    @classmethod
    def validate_offset_amount(cls, v):
        if v <= 0:
            raise ValueError("סכום הקיזוז חייב להיות חיובי")
        return v

class SettlementResponse(BaseModel):
    id: str
    professional_a_id: str
    professional_b_id: str
    offset_amount: Decimal
    description: Optional[str] = None
    processed_at: datetime
    processed_by: str
    
    class Config:
        from_attributes = True

# Database model mappings
class CommissionDB(BaseModel):
    """Commission database representation"""
    id: str
    professional_id: str
    job_id: str
    job_value: Decimal
    commission_type: str
    commission_rate: Decimal
    commission_amount: Decimal
    referrer_id: Optional[str] = None
    referrer_share_amount: Optional[Decimal] = None
    platform_amount: Decimal
    status: str
    recorded_at: datetime
    recorded_by: str
    invoice_id: Optional[str] = None
    paid_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class BalanceDB(BaseModel):
    """Balance database representation"""
    professional_id: str
    outstanding_commissions: Decimal
    pending_revenue_shares: Decimal
    net_balance: Decimal
    last_updated: datetime
    autopay_enabled: bool
    autopay_payment_method_id: Optional[str] = None
    
    class Config:
        from_attributes = True

class InvoiceDB(BaseModel):
    """Invoice database representation"""
    id: str
    professional_id: str
    invoice_number: str
    month: int
    year: int
    issue_date: datetime
    due_date: datetime
    status: str
    subtotal: Decimal
    vat_rate: Decimal
    vat_amount: Decimal
    total_amount: Decimal
    pdf_path: Optional[str] = None
    created_by: str
    created_at: datetime
    paid_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class PaymentDB(BaseModel):
    """Payment database representation"""
    id: str
    invoice_id: str
    professional_id: str
    amount: Decimal
    payment_method: str
    gateway_provider: str
    gateway_transaction_id: Optional[str] = None
    status: str
    processed_at: datetime
    processed_by: str
    failure_reason: Optional[str] = None
    gateway_response: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

class PayoutDB(BaseModel):
    """Payout database representation"""
    id: str
    professional_id: str
    amount: Decimal
    payout_method: str
    status: str
    bank_details: Optional[Dict[str, Any]] = None
    reference: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None
    created_by: str
    
    class Config:
        from_attributes = True