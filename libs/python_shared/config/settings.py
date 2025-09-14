"""Shared configuration settings for OFAIR services."""

from functools import lru_cache
from typing import Optional, List
from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Base settings class for all OFAIR services."""
    
    # Environment
    environment: str = Field(default="development", alias="ENVIRONMENT")
    debug: bool = Field(default=True, alias="DEBUG")
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    
    # Database
    database_url: str = Field(..., alias="DATABASE_URL")
    
    # Redis
    redis_url: str = Field(..., alias="REDIS_URL")
    
    # JWT
    jwt_secret_key: str = Field(..., alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=1440, alias="JWT_EXPIRE_MINUTES")
    
    # S3/MinIO
    s3_endpoint: Optional[str] = Field(default=None, alias="S3_ENDPOINT")
    s3_access_key: str = Field(..., alias="S3_ACCESS_KEY")
    s3_secret_key: str = Field(..., alias="S3_SECRET_KEY")
    s3_bucket: str = Field(..., alias="S3_BUCKET")
    s3_region: str = Field(default="us-east-1", alias="S3_REGION")
    
    # Stripe
    stripe_secret_key: Optional[str] = Field(default=None, alias="STRIPE_SECRET_KEY")
    stripe_publishable_key: Optional[str] = Field(default=None, alias="STRIPE_PUBLISHABLE_KEY")
    stripe_webhook_secret: Optional[str] = Field(default=None, alias="STRIPE_WEBHOOK_SECRET")
    
    # Communication
    # 019 SMS
    sms019_username: Optional[str] = Field(default=None, alias="SMS019_USERNAME")
    sms019_password: Optional[str] = Field(default=None, alias="SMS019_PASSWORD")
    sms019_sender_number: Optional[str] = Field(default=None, alias="SMS019_SENDER_NUMBER")
    
    smtp_host: Optional[str] = Field(default=None, alias="SMTP_HOST")
    smtp_port: int = Field(default=587, alias="SMTP_PORT")
    smtp_user: Optional[str] = Field(default=None, alias="SMTP_USER")
    smtp_password: Optional[str] = Field(default=None, alias="SMTP_PASSWORD")
    
    greenapi_id_instance: Optional[str] = Field(default=None, alias="GREENAPI_ID_INSTANCE")
    greenapi_api_token: Optional[str] = Field(default=None, alias="GREENAPI_API_TOKEN")
    
    # Platform Settings
    platform_commission_consumer: int = Field(default=10, alias="PLATFORM_COMMISSION_CONSUMER")
    platform_commission_professional: int = Field(default=5, alias="PLATFORM_COMMISSION_PROFESSIONAL")
    default_hold_period_days: int = Field(default=7, alias="DEFAULT_HOLD_PERIOD_DAYS")
    minimum_job_amount: int = Field(default=100, alias="MINIMUM_JOB_AMOUNT")
    subscription_monthly_price: int = Field(default=100, alias="SUBSCRIPTION_MONTHLY_PRICE")
    
    # Hebrew/RTL Settings
    default_language: str = Field(default="he", alias="DEFAULT_LANGUAGE")
    default_timezone: str = Field(default="Asia/Jerusalem", alias="DEFAULT_TIMEZONE")
    default_currency: str = Field(default="ILS", alias="DEFAULT_CURRENCY")
    
    # CORS
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"],
        alias="CORS_ORIGINS"
    )
    
    @validator("cors_origins", pre=True)
    def assemble_cors_origins(cls, v):
        """Parse CORS origins from string or list."""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    class Config:
        """Pydantic configuration."""
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()