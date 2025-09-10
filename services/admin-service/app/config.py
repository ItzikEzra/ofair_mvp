from pydantic_settings import BaseSettings
from typing import Optional, List

class Settings(BaseSettings):
    # Database settings
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "ofair_admin"
    
    # Redis settings (for caching and sessions)
    REDIS_URL: str = "redis://localhost:6379"
    
    # JWT settings
    JWT_SECRET_KEY: str = "your-super-secret-jwt-key-for-admin-service"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480  # 8 hours for admin sessions
    
    # API settings
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # External service URLs
    AUTH_SERVICE_URL: str = "http://auth-service:8001"
    USERS_SERVICE_URL: str = "http://users-service:8002"
    LEADS_SERVICE_URL: str = "http://leads-service:8003"
    PROPOSALS_SERVICE_URL: str = "http://proposals-service:8004"
    REFERRALS_SERVICE_URL: str = "http://referrals-service:8005"
    PAYMENTS_SERVICE_URL: str = "http://payments-service:8006"
    NOTIFICATIONS_SERVICE_URL: str = "http://notifications-service:8007"
    
    # Admin security settings
    ADMIN_SESSION_TIMEOUT: int = 8 * 60 * 60  # 8 hours
    MAX_FAILED_LOGINS: int = 5
    ACCOUNT_LOCKOUT_DURATION: int = 30 * 60  # 30 minutes
    
    # Audit and logging
    AUDIT_LOG_RETENTION_DAYS: int = 365
    SYSTEM_LOG_LEVEL: str = "INFO"
    ENABLE_AUDIT_LOGGING: bool = True
    
    # Data export settings
    MAX_EXPORT_RECORDS: int = 100000
    EXPORT_TIMEOUT_MINUTES: int = 30
    ALLOWED_EXPORT_FORMATS: List[str] = ["csv", "xlsx", "json"]
    
    # System monitoring
    HEALTH_CHECK_TIMEOUT: int = 5  # seconds
    SERVICE_MONITOR_INTERVAL: int = 60  # seconds
    ALERT_EMAIL_RECIPIENTS: List[str] = []
    
    # Rate limiting
    ADMIN_RATE_LIMIT_PER_MINUTE: int = 1000
    API_RATE_LIMIT_PER_MINUTE: int = 5000
    
    # File upload settings
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    UPLOAD_PATH: str = "/tmp/admin-uploads"
    ALLOWED_UPLOAD_TYPES: List[str] = ["pdf", "csv", "xlsx", "jpg", "png"]
    
    # Israeli localization
    DEFAULT_TIMEZONE: str = "Asia/Jerusalem"
    DEFAULT_LANGUAGE: str = "he"
    CURRENCY: str = "ILS"
    
    # Performance settings
    DB_POOL_MIN_SIZE: int = 5
    DB_POOL_MAX_SIZE: int = 20
    DB_COMMAND_TIMEOUT: int = 30
    
    # Cache settings
    CACHE_TTL_DASHBOARD: int = 300      # 5 minutes
    CACHE_TTL_USER_DATA: int = 600      # 10 minutes
    CACHE_TTL_SYSTEM_STATS: int = 180   # 3 minutes
    
    # Admin permissions
    SUPER_ADMIN_PERMISSIONS: List[str] = [
        "system.config",
        "user.create",
        "user.delete", 
        "user.suspend",
        "admin.create",
        "admin.delete",
        "data.export",
        "audit.view",
        "system.maintenance"
    ]
    
    ADMIN_PERMISSIONS: List[str] = [
        "user.view",
        "user.update",
        "user.suspend",
        "lead.view",
        "lead.moderate",
        "proposal.view",
        "payment.view",
        "reports.generate"
    ]
    
    MODERATOR_PERMISSIONS: List[str] = [
        "user.view",
        "lead.view",
        "lead.moderate",
        "proposal.view",
        "reports.view"
    ]
    
    SUPPORT_PERMISSIONS: List[str] = [
        "user.view",
        "lead.view", 
        "proposal.view",
        "chat.view"
    ]
    
    ANALYST_PERMISSIONS: List[str] = [
        "analytics.view",
        "reports.generate",
        "data.export"
    ]
    
    # Security settings
    REQUIRE_2FA: bool = False
    PASSWORD_MIN_LENGTH: int = 12
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_NUMBERS: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = True
    
    # Notification settings for admins
    ENABLE_ADMIN_NOTIFICATIONS: bool = True
    CRITICAL_ALERT_CHANNELS: List[str] = ["email", "sms"]
    HIGH_ALERT_CHANNELS: List[str] = ["email"]
    
    # System maintenance
    MAINTENANCE_MODE: bool = False
    MAINTENANCE_MESSAGE: str = "המערכת נמצאת בתחזוקה. אנא נסה שוב מאוחר יותר."
    
    # Analytics settings
    ANALYTICS_RETENTION_DAYS: int = 730  # 2 years
    ENABLE_REAL_TIME_ANALYTICS: bool = True
    
    # Backup and recovery
    BACKUP_RETENTION_DAYS: int = 90
    ENABLE_AUTO_BACKUP: bool = True
    BACKUP_SCHEDULE: str = "0 2 * * *"  # Daily at 2 AM
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create global settings instance
settings = Settings()

# Permission mappings
ROLE_PERMISSIONS = {
    "super_admin": settings.SUPER_ADMIN_PERMISSIONS,
    "admin": settings.ADMIN_PERMISSIONS,
    "moderator": settings.MODERATOR_PERMISSIONS,
    "support": settings.SUPPORT_PERMISSIONS,
    "analyst": settings.ANALYST_PERMISSIONS
}

def get_permissions_for_role(role: str) -> List[str]:
    """קבלת הרשאות לפי תפקיד - Get permissions for role"""
    return ROLE_PERMISSIONS.get(role, [])

def check_permission(user_permissions: List[str], required_permission: str) -> bool:
    """בדיקת הרשאה - Check if user has required permission"""
    return required_permission in user_permissions

# System configuration helpers
def is_maintenance_mode() -> bool:
    """בדיקה אם המערכת במצב תחזוקה - Check if system is in maintenance mode"""
    return settings.MAINTENANCE_MODE

def get_system_info() -> dict:
    """מידע על המערכת - Get system information"""
    return {
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "timezone": settings.DEFAULT_TIMEZONE,
        "language": settings.DEFAULT_LANGUAGE,
        "currency": settings.CURRENCY,
        "maintenance_mode": settings.MAINTENANCE_MODE
    }

# Hebrew localization helpers
def get_hebrew_error_message(error_code: str) -> str:
    """הודעות שגיאה בעברית - Get Hebrew error messages"""
    error_messages = {
        "UNAUTHORIZED": "אין הרשאה לגישה למשאב זה",
        "FORBIDDEN": "גישה אסורה",
        "NOT_FOUND": "המשאב לא נמצא",
        "VALIDATION_ERROR": "שגיאה באימות נתונים",
        "SERVER_ERROR": "שגיאה פנימית בשרת",
        "RATE_LIMIT_EXCEEDED": "חריגה ממספר הבקשות המותר",
        "MAINTENANCE_MODE": "המערכת נמצאת בתחזוקה",
        "INVALID_CREDENTIALS": "שם משתמש או סיסמה שגויים",
        "ACCOUNT_LOCKED": "החשבון נעול זמנית",
        "SESSION_EXPIRED": "הפגישה פגה, אנא התחבר מחדש"
    }
    
    return error_messages.get(error_code, "שגיאה לא מוכרת")

def format_israeli_currency(amount: float) -> str:
    """עיצוב מטבע ישראלי - Format Israeli currency"""
    return f"{amount:,.2f} ₪"

def format_israeli_phone(phone: str) -> str:
    """עיצוב טלפון ישראלי - Format Israeli phone number"""
    if not phone:
        return phone
    
    # Remove +972 and format
    if phone.startswith("+972"):
        phone = "0" + phone[4:]
    
    # Format as 0XX-XXX-XXXX
    if len(phone) == 10:
        return f"{phone[:3]}-{phone[3:6]}-{phone[6:]}"
    elif len(phone) == 9:
        return f"{phone[:2]}-{phone[2:5]}-{phone[5:]}"
    
    return phone

def get_business_hours_display() -> str:
    """תצוגת שעות עבודה - Get business hours display"""
    return "ימים א'-ה', 09:00-18:00"

# Environment-specific configurations
def get_environment_config():
    """הגדרות לפי סביבה - Get environment-specific configuration"""
    if settings.ENVIRONMENT == "production":
        return {
            "debug": False,
            "log_level": "WARNING",
            "rate_limit_per_minute": 5000,
            "audit_logging": True,
            "require_2fa": True,
            "session_timeout": 4 * 60 * 60,  # 4 hours in production
            "maintenance_mode": False
        }
    elif settings.ENVIRONMENT == "staging":
        return {
            "debug": True,
            "log_level": "INFO", 
            "rate_limit_per_minute": 2000,
            "audit_logging": True,
            "require_2fa": False,
            "session_timeout": 8 * 60 * 60,  # 8 hours
            "maintenance_mode": False
        }
    else:  # development
        return {
            "debug": True,
            "log_level": "DEBUG",
            "rate_limit_per_minute": 1000,
            "audit_logging": True,
            "require_2fa": False,
            "session_timeout": 24 * 60 * 60,  # 24 hours for dev
            "maintenance_mode": False
        }