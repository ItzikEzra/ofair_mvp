from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    postgres_host: str = "localhost"
    postgres_port: int = 5432
    postgres_db: str = "ofair_mvp"
    postgres_user: str = "ofair_user"
    postgres_password: str = "ofair_pass"
    
    # JWT
    jwt_secret_key: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None
    redis_db: int = 0
    
    # Commission settings
    default_commission_rate: float = 0.05  # 5%
    platform_fee_rate: float = 0.10  # 10%
    max_commission_levels: int = 4
    commission_payment_delay_days: int = 30
    
    # Performance settings
    max_referrals_per_user_per_day: int = 50
    max_commission_calculation_retries: int = 3
    
    # Hebrew validation
    min_hebrew_content_ratio: float = 0.3
    max_referral_description_length: int = 500
    
    # External services
    notifications_service_url: str = "http://localhost:8006"
    users_service_url: str = "http://localhost:8001"
    leads_service_url: str = "http://localhost:8002"
    proposals_service_url: str = "http://localhost:8003"
    
    # Service configuration
    service_name: str = "referrals-service"
    service_version: str = "1.0.0"
    debug_mode: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()