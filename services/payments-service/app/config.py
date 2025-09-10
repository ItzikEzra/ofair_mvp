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
    
    # Payment gateways
    stripe_secret_key: Optional[str] = None
    stripe_publishable_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    
    cardcom_terminal: Optional[str] = None
    cardcom_username: Optional[str] = None
    cardcom_password: Optional[str] = None
    
    tranzilla_supplier: Optional[str] = None
    tranzilla_user: Optional[str] = None
    tranzilla_password: Optional[str] = None
    
    # Commission settings
    default_customer_commission_rate: float = 0.10  # 10% for customer jobs
    default_referral_commission_rate: float = 0.05  # 5% for referral jobs
    israeli_vat_rate: float = 0.17  # 17% VAT
    
    # Invoice settings
    invoice_payment_terms_days: int = 30
    invoice_reminder_days: int = 7  # Send reminder 7 days before due
    invoice_overdue_days: int = 5   # Mark overdue 5 days after due
    
    # Autopay settings
    autopay_retry_attempts: int = 3
    autopay_retry_delay_hours: int = 24
    
    # Balance settings
    minimum_payout_amount: float = 100.0  # Minimum ₪100 for payout
    settlement_hold_days: int = 7  # Hold payments for 7 days
    
    # File storage
    s3_bucket_name: str = "ofair-documents"
    s3_region: str = "eu-west-1"
    aws_access_key_id: Optional[str] = None
    aws_secret_access_key: Optional[str] = None
    
    # Redis
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_password: Optional[str] = None
    redis_db: int = 2
    
    # Company details for invoices
    company_name: str = "OFAIR - עופאיר"
    company_address: str = "רחוב הטכנולוגיה 1, תל אביב, ישראל"
    company_phone: str = "03-1234567"
    company_email: str = "billing@ofair.co.il"
    company_website: str = "www.ofair.co.il"
    company_vat_number: str = "123456789"
    
    # External services
    notifications_service_url: str = "http://localhost:8006"
    users_service_url: str = "http://localhost:8001"
    referrals_service_url: str = "http://localhost:8004"
    
    # Service configuration
    service_name: str = "payments-service"
    service_version: str = "1.0.0"
    debug_mode: bool = False
    
    # Security
    allowed_origins: list = ["http://localhost:3000", "https://ofair.co.il"]
    api_rate_limit: int = 100  # Requests per minute
    
    # Webhook settings
    webhook_timeout_seconds: int = 30
    webhook_retry_attempts: int = 3
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()