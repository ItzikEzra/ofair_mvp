from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum

class AdminRole(str, Enum):
    """תפקידי אדמין - Admin roles"""
    SUPER_ADMIN = "super_admin"  # מנהל על
    ADMIN = "admin"              # מנהל
    MODERATOR = "moderator"      # מודרטור
    SUPPORT = "support"          # תמיכה
    ANALYST = "analyst"          # אנליסט

class SystemStatus(str, Enum):
    """סטטוסי מערכת - System statuses"""
    ACTIVE = "active"      # פעיל
    MAINTENANCE = "maintenance"  # תחזוקה
    DOWN = "down"          # מושבת
    WARNING = "warning"    # אזהרה

class AuditEventType(str, Enum):
    """סוגי אירועי ביקורת - Audit event types"""
    LOGIN = "login"                    # כניסה
    LOGOUT = "logout"                  # יציאה
    USER_CREATE = "user_create"        # יצירת משתמש
    USER_UPDATE = "user_update"        # עדכון משתמש
    USER_DELETE = "user_delete"        # מחיקת משתמש
    USER_SUSPEND = "user_suspend"      # השעיית משתמש
    LEAD_CREATE = "lead_create"        # יצירת ליד
    LEAD_UPDATE = "lead_update"        # עדכון ליד
    LEAD_DELETE = "lead_delete"        # מחיקת ליד
    PROPOSAL_CREATE = "proposal_create"  # יצירת הצעה
    PROPOSAL_UPDATE = "proposal_update"  # עדכון הצעה
    PAYMENT_CREATE = "payment_create"    # יצירת תשלום
    SYSTEM_CONFIG = "system_config"      # הגדרות מערכת
    DATA_EXPORT = "data_export"          # יצוא נתונים
    BULK_OPERATION = "bulk_operation"    # פעולה נפחית

class AuditSeverity(str, Enum):
    """רמות חומרה לביקורת - Audit severity levels"""
    LOW = "low"          # נמוכה
    MEDIUM = "medium"    # בינונית
    HIGH = "high"        # גבוהה
    CRITICAL = "critical"  # קריטית

# Request Models
class AdminLoginRequest(BaseModel):
    """בקשת התחברות אדמין - Admin login request"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    remember_me: bool = Field(default=False)
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('שם משתמש יכול להכיל רק אותיות, מספרים, קו תחתון וקו מקוף')
        return v.lower()

class CreateAdminRequest(BaseModel):
    """בקשת יצירת אדמין - Create admin request"""
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., pattern=r'^[^@]+@[^@]+\.[^@]+$')
    full_name: str = Field(..., min_length=2, max_length=100)
    role: AdminRole
    phone_number: Optional[str] = Field(None, pattern=r'^\+972[0-9]{9}$')
    is_active: bool = Field(default=True)
    permissions: List[str] = Field(default_factory=list)
    notes: Optional[str] = Field(None, max_length=500)

class UpdateAdminRequest(BaseModel):
    """בקשת עדכון אדמין - Update admin request"""
    email: Optional[str] = Field(None, pattern=r'^[^@]+@[^@]+\.[^@]+$')
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    role: Optional[AdminRole] = None
    phone_number: Optional[str] = Field(None, pattern=r'^\+972[0-9]{9}$')
    is_active: Optional[bool] = None
    permissions: Optional[List[str]] = None
    notes: Optional[str] = Field(None, max_length=500)

class BulkUserActionRequest(BaseModel):
    """בקשת פעולה נפחית על משתמשים - Bulk user action request"""
    user_ids: List[str] = Field(..., min_items=1, max_items=1000)
    action: str = Field(..., pattern=r'^(suspend|activate|delete|export)$')
    reason: str = Field(..., min_length=5, max_length=200)
    notify_users: bool = Field(default=False)

class SystemConfigUpdateRequest(BaseModel):
    """בקשת עדכון הגדרות מערכת - System config update request"""
    config_key: str = Field(..., min_length=1, max_length=100)
    config_value: Any
    category: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = Field(None, max_length=200)

class AuditLogSearchRequest(BaseModel):
    """בקשת חיפוש לוגי ביקורת - Audit log search request"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    event_types: Optional[List[AuditEventType]] = None
    user_id: Optional[str] = None
    admin_id: Optional[str] = None
    severity: Optional[AuditSeverity] = None
    search_term: Optional[str] = Field(None, max_length=100)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=1000)

class DataExportRequest(BaseModel):
    """בקשת יצוא נתונים - Data export request"""
    entity_type: str = Field(..., pattern=r'^(users|leads|proposals|payments|referrals)$')
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    filters: Dict[str, Any] = Field(default_factory=dict)
    format: str = Field(default="csv", pattern=r'^(csv|xlsx|json)$')
    include_pii: bool = Field(default=False)  # כלל מידע אישי

# Response Models
class AdminProfile(BaseModel):
    """פרופיל אדמין - Admin profile"""
    id: str
    username: str
    email: str
    full_name: str
    role: AdminRole
    phone_number: Optional[str]
    is_active: bool
    permissions: List[str]
    notes: Optional[str]
    created_at: datetime
    last_login: Optional[datetime]
    login_count: int
    created_by: str

class AdminLoginResponse(BaseModel):
    """תגובת התחברות אדמין - Admin login response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    admin_profile: AdminProfile
    permissions: List[str]
    session_id: str

class DashboardStats(BaseModel):
    """סטטיסטיקות דשבורד - Dashboard statistics"""
    total_users: int
    active_users: int
    total_leads: int
    open_leads: int
    total_proposals: int
    pending_proposals: int
    total_revenue: float
    monthly_revenue: float
    conversion_rate: float
    avg_response_time: float
    system_status: SystemStatus
    last_updated: datetime

class SystemHealth(BaseModel):
    """בריאות מערכת - System health"""
    status: SystemStatus
    services: Dict[str, Dict[str, Any]]  # service_name -> {status, response_time, last_check}
    database: Dict[str, Any]
    memory_usage: float
    cpu_usage: float
    disk_usage: float
    active_connections: int
    error_rate: float
    uptime: int  # seconds

class AuditLogEntry(BaseModel):
    """רישום ביקורת - Audit log entry"""
    id: str
    event_type: AuditEventType
    user_id: Optional[str]
    admin_id: Optional[str]
    resource_type: str
    resource_id: Optional[str]
    action: str
    description: str
    severity: AuditSeverity
    ip_address: Optional[str]
    user_agent: Optional[str]
    metadata: Dict[str, Any]
    timestamp: datetime
    session_id: Optional[str]

class UserSummary(BaseModel):
    """סיכום משתמש - User summary for admin view"""
    id: str
    full_name: str
    email: str
    phone_number: str
    user_type: str  # professional, customer
    status: str
    registration_date: datetime
    last_activity: Optional[datetime]
    total_leads: int
    total_proposals: int
    total_revenue: float
    verification_status: str
    risk_score: Optional[float]

class LeadSummary(BaseModel):
    """סיכום ליד - Lead summary for admin view"""
    id: str
    title: str
    category: str
    customer_id: str
    customer_name: str
    location: str
    budget_range: str
    status: str
    created_at: datetime
    proposal_count: int
    selected_professional: Optional[str]
    revenue_generated: Optional[float]
    quality_score: Optional[float]

class SystemAlert(BaseModel):
    """התראת מערכת - System alert"""
    id: str
    type: str  # error, warning, info
    title: str
    description: str
    severity: AuditSeverity
    component: str  # which service/component
    status: str  # active, resolved, acknowledged
    created_at: datetime
    resolved_at: Optional[datetime]
    resolved_by: Optional[str]
    metadata: Dict[str, Any]

class DataExportResult(BaseModel):
    """תוצאת יצוא נתונים - Data export result"""
    export_id: str
    status: str  # pending, processing, completed, failed
    entity_type: str
    format: str
    total_records: Optional[int]
    file_url: Optional[str]
    file_size: Optional[int]  # bytes
    created_at: datetime
    completed_at: Optional[datetime]
    expires_at: Optional[datetime]
    error_message: Optional[str]

class BulkActionResult(BaseModel):
    """תוצאת פעולה נפחית - Bulk action result"""
    action_id: str
    action_type: str
    total_items: int
    successful: int
    failed: int
    status: str  # pending, processing, completed, failed
    details: List[Dict[str, Any]]  # success/failure details per item
    started_at: datetime
    completed_at: Optional[datetime]
    error_message: Optional[str]

# Analytics Models
class UserGrowthData(BaseModel):
    """נתוני צמיחת משתמשים - User growth data"""
    period: str  # daily, weekly, monthly
    data_points: List[Dict[str, Any]]  # [{date, new_users, total_users, churn_rate}]

class LeadAnalytics(BaseModel):
    """אנליטיקת ליידים - Lead analytics"""
    total_leads: int
    conversion_rate: float
    avg_response_time: float
    top_categories: List[Dict[str, Any]]
    geographic_distribution: Dict[str, int]
    quality_metrics: Dict[str, float]

class RevenueAnalytics(BaseModel):
    """אנליטיקת הכנסות - Revenue analytics"""
    total_revenue: float
    monthly_growth: float
    revenue_by_category: Dict[str, float]
    commission_breakdown: Dict[str, float]
    top_professionals: List[Dict[str, Any]]

class SystemUsageAnalytics(BaseModel):
    """אנליטיקת שימוש במערכת - System usage analytics"""
    daily_active_users: int
    page_views: int
    api_calls: int
    error_rate: float
    performance_metrics: Dict[str, float]
    popular_features: List[Dict[str, Any]]

# Configuration Models
class SystemConfiguration(BaseModel):
    """הגדרות מערכת - System configuration"""
    key: str
    value: Any
    category: str
    description: str
    is_sensitive: bool
    last_updated: datetime
    updated_by: str
    validation_rules: Optional[Dict[str, Any]] = None

class FeatureFlag(BaseModel):
    """דגל פיצ'ר - Feature flag"""
    name: str
    is_enabled: bool
    description: str
    target_percentage: Optional[int] = None  # for gradual rollout
    target_users: Optional[List[str]] = None  # specific users
    created_at: datetime
    updated_at: datetime
    updated_by: str

# Permission Models
class AdminPermission(BaseModel):
    """הרשאת אדמין - Admin permission"""
    name: str
    description: str
    category: str
    is_system_permission: bool = False

class RolePermissions(BaseModel):
    """הרשאות תפקיד - Role permissions"""
    role: AdminRole
    permissions: List[str]
    description: str

# Notification Models for Admin
class AdminNotification(BaseModel):
    """התראה לאדמין - Admin notification"""
    id: str
    admin_id: str
    type: str  # alert, info, warning, error
    title: str
    message: str
    is_read: bool
    created_at: datetime
    expires_at: Optional[datetime]
    metadata: Dict[str, Any]