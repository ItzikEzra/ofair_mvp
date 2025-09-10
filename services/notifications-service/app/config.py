from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database settings
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "ofair_notifications"
    
    # Redis settings (for caching and rate limiting)
    REDIS_URL: str = "redis://localhost:6379"
    
    # JWT settings
    JWT_SECRET_KEY: str = "your-super-secret-jwt-key-for-notifications-service"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
    
    # API settings
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # External service URLs
    AUTH_SERVICE_URL: str = "http://auth-service:8001"
    USERS_SERVICE_URL: str = "http://users-service:8002"
    
    # SMS settings (Israeli providers)
    SMS_API_URL: str = "https://api.sms4free.co.il/ApiSMS/send"
    SMS_API_KEY: Optional[str] = None
    SMS_SENDER_ID: str = "OFAIR"
    
    # WhatsApp settings
    WHATSAPP_API_URL: str = "https://graph.facebook.com/v18.0/YOUR_PHONE_NUMBER_ID"
    WHATSAPP_API_KEY: Optional[str] = None
    WHATSAPP_MESSAGE_COST: float = 0.10  # 10 agorot per message
    
    # Email settings
    EMAIL_API_URL: str = "https://api.sendgrid.com/v3/mail/send"
    EMAIL_API_KEY: Optional[str] = None
    EMAIL_FROM_ADDRESS: str = "notifications@ofair.co.il"
    EMAIL_FROM_NAME: str = "OFAIR"
    EMAIL_MESSAGE_COST: float = 0.01  # 1 agora per email
    
    # Push notification settings (FCM)
    FCM_API_URL: str = "https://fcm.googleapis.com/fcm/send"
    FCM_API_KEY: Optional[str] = None
    FCM_PROJECT_ID: Optional[str] = None
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 100
    RATE_LIMIT_BURST: int = 200
    
    # Background tasks
    MAX_RETRIES: int = 3
    RETRY_DELAY: int = 60  # seconds
    BATCH_SIZE: int = 100
    
    # Delivery settings
    DELIVERY_TIMEOUT: int = 30  # seconds
    WEBHOOK_TIMEOUT: int = 10  # seconds
    
    # Monitoring
    PROMETHEUS_ENABLED: bool = True
    PROMETHEUS_PORT: int = 8090
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    
    # Hebrew/RTL settings
    DEFAULT_LANGUAGE: str = "he"
    RTL_SUPPORT: bool = True
    
    # Template settings
    MAX_TEMPLATE_SIZE: int = 10000  # characters
    MAX_VARIABLES: int = 50
    
    # File upload settings (for rich templates)
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    ALLOWED_FILE_TYPES: list = ["jpg", "jpeg", "png", "gif", "pdf"]
    
    # Israeli phone validation
    ISRAEL_COUNTRY_CODE: str = "+972"
    VALID_ISRAELI_PREFIXES: list = [
        "50", "52", "53", "54", "55", "57", "58",  # Mobile
        "02", "03", "04", "08", "09"  # Landline
    ]
    
    # Business hours for delivery optimization
    BUSINESS_HOURS_START: int = 9  # 9 AM
    BUSINESS_HOURS_END: int = 18   # 6 PM
    
    # Quiet hours (when not to send non-urgent notifications)
    DEFAULT_QUIET_START: int = 22  # 10 PM
    DEFAULT_QUIET_END: int = 8     # 8 AM
    
    # Notification priorities
    URGENT_DELIVERY_TIMEOUT: int = 5    # seconds
    NORMAL_DELIVERY_TIMEOUT: int = 30   # seconds
    LOW_DELIVERY_TIMEOUT: int = 300     # 5 minutes
    
    # Cost tracking
    TRACK_COSTS: bool = True
    CURRENCY: str = "ILS"
    
    # Security settings
    WEBHOOK_SECRET_KEY: str = "webhook-secret-key-for-delivery-confirmations"
    API_KEY_HEADER: str = "X-API-Key"
    
    # Feature flags
    ENABLE_SMS: bool = True
    ENABLE_WHATSAPP: bool = True
    ENABLE_EMAIL: bool = True
    ENABLE_PUSH: bool = True
    ENABLE_IN_APP: bool = True
    ENABLE_SCHEDULED_NOTIFICATIONS: bool = True
    ENABLE_BULK_NOTIFICATIONS: bool = True
    ENABLE_TEMPLATE_VERSIONING: bool = False
    
    # Performance settings
    DB_POOL_MIN_SIZE: int = 5
    DB_POOL_MAX_SIZE: int = 20
    DB_COMMAND_TIMEOUT: int = 30
    
    # Cache settings
    CACHE_TTL_PREFERENCES: int = 300    # 5 minutes
    CACHE_TTL_TEMPLATES: int = 900      # 15 minutes
    CACHE_TTL_USER_INFO: int = 600      # 10 minutes
    
    # Webhook retry settings
    WEBHOOK_RETRY_COUNT: int = 3
    WEBHOOK_RETRY_DELAY: int = 5  # seconds
    WEBHOOK_RETRY_BACKOFF: float = 2.0  # exponential backoff multiplier
    
    # Analytics
    ENABLE_ANALYTICS: bool = True
    ANALYTICS_RETENTION_DAYS: int = 90
    
    # Data retention
    NOTIFICATION_RETENTION_DAYS: int = 365
    LOG_RETENTION_DAYS: int = 90
    ARCHIVE_OLD_DATA: bool = True
    
    # Localization
    SUPPORTED_LANGUAGES: list = ["he", "en", "ar", "ru"]
    DEFAULT_TIMEZONE: str = "Asia/Jerusalem"
    
    # Testing
    TEST_PHONE_NUMBER: str = "+972500000000"
    TEST_EMAIL: str = "test@ofair.co.il"
    MOCK_EXTERNAL_SERVICES: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        
        # Environment-specific configurations
        @classmethod
        def customise_sources(
            cls,
            init_settings,
            env_settings,
            dotenv_settings,
            file_secret_settings,
        ):
            return (
                init_settings,
                env_settings,
                dotenv_settings,
                file_secret_settings,
            )

# Create global settings instance
settings = Settings()

# Validation functions
def validate_phone_number(phone: str) -> bool:
    """
    אימות מספר טלפון ישראלי - Validate Israeli phone number
    """
    if not phone:
        return False
    
    # Remove spaces and dashes
    clean_phone = phone.replace(" ", "").replace("-", "")
    
    # Handle different formats
    if clean_phone.startswith("+972"):
        clean_phone = clean_phone[4:]
    elif clean_phone.startswith("972"):
        clean_phone = clean_phone[3:]
    elif clean_phone.startswith("0"):
        clean_phone = clean_phone[1:]
    
    # Check if it matches valid Israeli prefixes
    for prefix in settings.VALID_ISRAELI_PREFIXES:
        if clean_phone.startswith(prefix):
            # Mobile numbers should be 9 digits after removing 0
            # Landline numbers vary by area
            if prefix in ["50", "52", "53", "54", "55", "57", "58"]:
                return len(clean_phone) == 9
            else:  # Landline
                return len(clean_phone) >= 8
    
    return False

def normalize_phone_number(phone: str) -> str:
    """
    נרמול מספר טלפון לפורמט ישראלי - Normalize phone to Israeli format
    """
    if not phone:
        return phone
    
    # Remove spaces and dashes
    clean_phone = phone.replace(" ", "").replace("-", "")
    
    # Handle different formats
    if clean_phone.startswith("+972"):
        return clean_phone
    elif clean_phone.startswith("972"):
        return f"+{clean_phone}"
    elif clean_phone.startswith("0"):
        return f"+972{clean_phone[1:]}"
    else:
        return f"+972{clean_phone}"

def is_business_hours() -> bool:
    """
    בדיקה אם זה שעות עבודה - Check if current time is business hours
    """
    from datetime import datetime
    import pytz
    
    israel_tz = pytz.timezone(settings.DEFAULT_TIMEZONE)
    now = datetime.now(israel_tz)
    
    return (
        settings.BUSINESS_HOURS_START <= now.hour < settings.BUSINESS_HOURS_END and
        now.weekday() < 5  # Monday = 0, Sunday = 6
    )

def is_quiet_hours(quiet_start: int, quiet_end: int) -> bool:
    """
    בדיקה אם זה שעות שקט - Check if current time is within quiet hours
    """
    from datetime import datetime
    import pytz
    
    israel_tz = pytz.timezone(settings.DEFAULT_TIMEZONE)
    current_hour = datetime.now(israel_tz).hour
    
    if quiet_start <= quiet_end:
        # Normal hours (e.g., 14:00 to 16:00)
        return quiet_start <= current_hour <= quiet_end
    else:
        # Hours spanning midnight (e.g., 22:00 to 8:00)
        return current_hour >= quiet_start or current_hour <= quiet_end

def get_delivery_timeout(priority: str) -> int:
    """
    קבלת timeout לפי עדיפות - Get delivery timeout based on priority
    """
    priority_timeouts = {
        "urgent": settings.URGENT_DELIVERY_TIMEOUT,
        "normal": settings.NORMAL_DELIVERY_TIMEOUT,
        "low": settings.LOW_DELIVERY_TIMEOUT
    }
    
    return priority_timeouts.get(priority, settings.NORMAL_DELIVERY_TIMEOUT)

def get_hebrew_day_name(weekday: int) -> str:
    """
    קבלת שם יום בעברית - Get Hebrew day name
    """
    hebrew_days = {
        0: "יום שני",
        1: "יום שלישי", 
        2: "יום רביעי",
        3: "יום חמישי",
        4: "יום שישי",
        5: "יום שבת",
        6: "יום ראשון"
    }
    
    return hebrew_days.get(weekday, "יום לא מוכר")

def get_hebrew_month_name(month: int) -> str:
    """
    קבלת שם חודש בעברית - Get Hebrew month name
    """
    hebrew_months = {
        1: "ינואר", 2: "פברואר", 3: "מרץ", 4: "אפריל",
        5: "מאי", 6: "יוני", 7: "יולי", 8: "אוגוסט", 
        9: "ספטמבר", 10: "אוקטובר", 11: "נובמבר", 12: "דצמבר"
    }
    
    return hebrew_months.get(month, "חודש לא מוכר")

# Environment-specific settings
def get_environment_config():
    """
    קבלת הגדרות לפי סביבה - Get environment-specific configuration
    """
    if settings.ENVIRONMENT == "production":
        return {
            "debug": False,
            "mock_external_services": False,
            "log_level": "WARNING",
            "rate_limit_per_minute": 1000,
            "enable_analytics": True
        }
    elif settings.ENVIRONMENT == "staging":
        return {
            "debug": True,
            "mock_external_services": False,
            "log_level": "INFO",
            "rate_limit_per_minute": 500,
            "enable_analytics": True
        }
    else:  # development
        return {
            "debug": True,
            "mock_external_services": True,
            "log_level": "DEBUG",
            "rate_limit_per_minute": 100,
            "enable_analytics": False
        }