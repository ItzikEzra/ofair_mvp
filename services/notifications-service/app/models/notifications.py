from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum

class NotificationChannel(str, Enum):
    SMS = "sms"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    PUSH = "push"
    IN_APP = "in_app"

class NotificationStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    SENDING = "sending"
    DELIVERED = "delivered"
    FAILED = "failed"
    READ = "read"

class NotificationPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

class NotificationCategory(str, Enum):
    LEAD = "lead"
    PROPOSAL = "proposal"
    REFERRAL = "referral"
    PAYMENT = "payment"
    SYSTEM = "system"
    MARKETING = "marketing"

class SendNotificationRequest(BaseModel):
    user_id: str = Field(..., description="מזהה משתמש יעד")
    template_id: str = Field(..., description="מזהה תבנית")
    channels: List[NotificationChannel] = Field(..., description="ערוצי שליחה")
    variables: Optional[Dict[str, Any]] = Field(None, description="משתנים לתבנית")
    priority: NotificationPriority = Field(NotificationPriority.NORMAL, description="עדיפות")
    scheduled_at: Optional[datetime] = Field(None, description="זמן שליחה מתוכנן")
    
    @field_validator('channels')
    @classmethod
    def validate_channels(cls, v):
        if not v:
            raise ValueError("חובה לציין לפחות ערוץ אחד")
        return v

class BulkNotificationRequest(BaseModel):
    user_ids: List[str] = Field(..., description="רשימת מזהי משתמשים")
    template_id: str = Field(..., description="מזהה תבנית")
    channels: List[NotificationChannel] = Field(..., description="ערוצי שליחה")
    variables: Optional[Dict[str, Any]] = Field(None, description="משתנים לתבנית")
    priority: NotificationPriority = Field(NotificationPriority.NORMAL, description="עדיפות")
    
    @field_validator('user_ids')
    @classmethod
    def validate_user_ids(cls, v):
        if not v or len(v) > 1000:
            raise ValueError("רשימת המשתמשים חייבת להכיל 1-1000 משתמשים")
        return v

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    template_id: str
    channels: List[NotificationChannel]
    priority: NotificationPriority
    status: NotificationStatus
    variables: Optional[Dict[str, Any]] = None
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    created_by: str
    
    class Config:
        from_attributes = True

class NotificationHistory(BaseModel):
    id: str
    template_name: str
    template_category: NotificationCategory
    channels: List[NotificationChannel]
    status: NotificationStatus
    priority: NotificationPriority
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    preview_text: str
    channel_results: Dict[str, Dict[str, Any]]
    
    class Config:
        from_attributes = True

class NotificationTemplate(BaseModel):
    id: Optional[str] = None
    name: str = Field(..., description="שם התבנית")
    category: NotificationCategory = Field(..., description="קטגוריה")
    description: Optional[str] = Field(None, description="תיאור התבנית")
    subject_template: Optional[str] = Field(None, description="תבנית נושא")
    content_template: str = Field(..., description="תבנית תוכן")
    html_template: Optional[str] = Field(None, description="תבנית HTML")
    variables: List[str] = Field(default_factory=list, description="רשימת משתנים")
    supported_channels: List[NotificationChannel] = Field(..., description="ערוצים נתמכים")
    is_active: bool = Field(True, description="פעיל")
    created_at: Optional[datetime] = None
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    
    @field_validator('content_template')
    @classmethod
    def validate_content_template(cls, v):
        if not v or len(v.strip()) < 10:
            raise ValueError("תבנית התוכן חייבת להכיל לפחות 10 תווים")
        return v
    
    @field_validator('supported_channels')
    @classmethod
    def validate_supported_channels(cls, v):
        if not v:
            raise ValueError("חובה לציין לפחות ערוץ אחד נתמך")
        return v

class UserPreferences(BaseModel):
    sms_enabled: bool = Field(True, description="SMS מופעל")
    whatsapp_enabled: bool = Field(True, description="WhatsApp מופעל")
    email_enabled: bool = Field(True, description="אימייל מופעל")
    push_enabled: bool = Field(True, description="Push מופעל")
    in_app_enabled: bool = Field(True, description="התראות באפליקציה מופעלות")
    
    # Category preferences
    lead_notifications: bool = Field(True, description="התראות ליד")
    proposal_notifications: bool = Field(True, description="התראות הצעות")
    referral_notifications: bool = Field(True, description="התראות הפניות")
    payment_notifications: bool = Field(True, description="התראות תשלומים")
    system_notifications: bool = Field(True, description="התראות מערכת")
    marketing_notifications: bool = Field(False, description="התראות שיווק")
    
    # Quiet hours
    quiet_hours_enabled: bool = Field(False, description="שעות שקט מופעלות")
    quiet_start_hour: int = Field(22, description="שעת התחלה שעות שקט")
    quiet_end_hour: int = Field(8, description="שעת סיום שעות שקט")
    
    @field_validator('quiet_start_hour', 'quiet_end_hour')
    @classmethod
    def validate_hours(cls, v):
        if v < 0 or v > 23:
            raise ValueError("שעה חייבת להיות בין 0-23")
        return v

class UserPreferencesResponse(BaseModel):
    user_id: str
    phone_number: Optional[str] = None
    email: Optional[str] = None
    preferences: UserPreferences
    last_updated: datetime
    
    class Config:
        from_attributes = True

class UpdatePreferencesRequest(BaseModel):
    preferences: UserPreferences = Field(..., description="העדפות חדשות")

class DeliveryResult(BaseModel):
    channel: NotificationChannel
    status: str
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    external_id: Optional[str] = None
    cost: Optional[float] = None

class NotificationDelivery(BaseModel):
    notification_id: str
    channel: NotificationChannel
    recipient: str
    status: str
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None
    external_id: Optional[str] = None
    cost: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        from_attributes = True

# Database model mappings
class NotificationDB(BaseModel):
    """Notification database representation"""
    id: str
    user_id: str
    template_id: str
    channels: List[str]  # Stored as JSON array
    priority: str
    status: str
    variables: Optional[Dict[str, Any]] = None
    scheduled_at: Optional[datetime] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    created_by: str
    
    class Config:
        from_attributes = True

class TemplateDB(BaseModel):
    """Template database representation"""
    id: str
    name: str
    category: str
    description: Optional[str] = None
    subject_template: Optional[str] = None
    content_template: str
    html_template: Optional[str] = None
    variables: List[str]
    supported_channels: List[str]
    is_active: bool
    created_at: datetime
    created_by: str
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None
    
    class Config:
        from_attributes = True

class UserPreferencesDB(BaseModel):
    """User preferences database representation"""
    user_id: str
    preferences: Dict[str, Any]  # Stored as JSON
    last_updated: datetime
    
    class Config:
        from_attributes = True