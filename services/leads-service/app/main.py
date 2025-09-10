"""
OFAIR Leads Service FastAPI Application

A comprehensive leads management service with personalized Lead Board,
geographic matching, Hebrew/RTL support, and subscription-based prioritization.

Key Features:
- Lead creation and management (consumer + professional referrals)
- Personalized Lead Board with AI-driven matching
- Geographic search using PostGIS and Israeli locations
- Hebrew text processing and RTL support
- PII protection and audit logging
- Subscription-based professional prioritization
- Real-time notifications and referral system
"""

import logging
import sys
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Import shared configuration
sys.path.append("/app/libs")
from python_shared.config.settings import get_settings

# Import local modules
from deps import get_limiter, close_redis_client, check_database_health, check_redis_health
from api import leads, lead_board

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/var/log/leads-service.log', mode='a')
    ]
)

logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting OFAIR Leads Service")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")
    
    # Health checks
    db_healthy = await check_database_health()
    redis_healthy = await check_redis_health()
    
    if not db_healthy:
        logger.error("Database health check failed!")
    if not redis_healthy:
        logger.error("Redis health check failed!")
        
    logger.info("Leads Service startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down OFAIR Leads Service")
    await close_redis_client()
    logger.info("Leads Service shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="OFAIR Leads Service",
    description="""
    ## OFAIR Leads Management Service
    
    **Professional Lead Board and Geographic Matching Platform**
    
    ### Key Features
    
    #### 🎯 Personalized Lead Board
    - AI-powered lead matching based on profession, location, and history
    - Subscription-based prioritization for paid professionals
    - Real-time scoring algorithm with multiple factors
    
    #### 🌍 Israeli Geographic Features  
    - Hebrew and English location support
    - PostGIS integration for accurate distance calculations
    - City, region, and radius-based matching
    - Israeli address validation and normalization
    
    #### 🔐 PII Protection & Security
    - Row-Level Security (RLS) for data isolation
    - Audit logging for all sensitive data access
    - Professional verification and status management
    - Rate limiting and abuse prevention
    
    #### 🇮🇱 Hebrew/RTL Support
    - Hebrew category names and descriptions
    - RTL text processing for lead content
    - Israeli phone number and address validation
    - Localized date/time and currency handling
    
    #### 💼 Business Logic
    - Consumer leads (free) vs Professional referrals (with commission)
    - Lead sharing/referral workflow between professionals  
    - Proposal system with PII reveal upon acceptance
    - Subscription benefits and prioritization
    
    ### API Documentation
    
    #### Public Endpoints (No Authentication)
    - `GET /leads/public` - Browse public leads with filters
    - `GET /leads/categories` - Get Hebrew category list
    - `GET /health` - Service health check
    
    #### Authenticated Endpoints
    - `POST /leads/` - Create new lead (rate limited)
    - `GET /leads/{id}` - Get lead details (PII based on access)
    - `PUT /leads/{id}` - Update lead (owner only)
    - `GET /leads/my` - Get user's own leads
    - `GET /leads/search` - Advanced lead search
    
    #### Professional Lead Board (Professional Access)
    - `GET /leads/board/` - Personalized Lead Board
    - `GET /leads/board/stats` - Performance statistics  
    - `GET /leads/board/recommendations/categories` - Category expansion suggestions
    - `GET /leads/board/preferences` - Current personalization settings
    - `POST /leads/board/refresh` - Force cache refresh
    
    #### Lead Sharing & Referrals (Professional Access)
    - `POST /leads/{id}/share` - Create referral to another professional
    - `POST /leads/{id}/close` - Close lead and set final amount
    
    ### Rate Limits
    - Lead creation: 3/hour (consumers), 5/hour (professionals)
    - Referrals: 5/hour, 20/day per professional
    - Search: 100/hour per IP
    - Lead Board refresh: 5/hour per professional
    
    ### Geographic Capabilities
    - Accurate Israeli city and region recognition
    - Distance calculations with PostGIS
    - Service radius recommendations by location type
    - Location-based lead matching and scoring
    
    ### Subscription Benefits  
    - 20% score boost on Lead Board
    - Priority access to high-budget leads
    - Extended service radius matching
    - Advanced analytics and insights
    - Lower minimum score thresholds
    
    ### Data Privacy
    - Client PII (name, phone, address) protected until proposal acceptance
    - All PII access logged for compliance
    - Lead ownership validation for modifications
    - Audit trail for all sensitive operations
    
    ---
    
    **Environment:** {env}
    **Version:** 1.0.0
    **Support:** OFAIR Technical Team
    """.format(env=settings.environment),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

# Rate limiter setup
limiter = get_limiter()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Trusted host middleware for security
if settings.environment == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*.ofair.co.il", "ofair.co.il"]
    )

# Include routers
app.include_router(leads.router)
app.include_router(lead_board.router)


# Global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed Hebrew/English messages."""
    
    error_details = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        message = error["msg"]
        error_type = error["type"]
        
        # Customize error messages for Hebrew support
        if error_type == "value_error":
            if "hebrew" in message.lower():
                message = f"שגיאה בתוכן עברי: {message}"
            elif "phone" in message.lower():
                message = f"מספר טלפון לא תקין: {message}"
            elif "location" in message.lower():
                message = f"מיקום לא תקין: {message}"
                
        error_details.append({
            "field": field,
            "message": message,
            "type": error_type,
            "value": error.get("input")
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Validation failed",
            "message": "בקשה לא תקינה - יש לבדוק את הנתונים שהוזנו",
            "details": error_details
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with logging."""
    
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "message": "שגיאה פנימית בשרת - אנא נסו שוב מאוחר יותר",
            "detail": str(exc) if settings.debug else "An unexpected error occurred"
        }
    )


# Health check endpoint
@app.get("/health", include_in_schema=True, tags=["health"])
async def health_check() -> Dict[str, Any]:
    """
    Service health check endpoint.
    
    **Public Access:** No authentication required.
    **Monitoring:** Used by load balancers and monitoring systems.
    
    **Health Indicators:**
    - Database connectivity
    - Redis connectivity  
    - Service status
    - Environment information
    """
    try:
        # Check database
        db_healthy = await check_database_health()
        
        # Check Redis
        redis_healthy = await check_redis_health()
        
        # Overall health
        healthy = db_healthy and redis_healthy
        
        status_code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
        
        health_data = {
            "service": "ofair-leads-service",
            "status": "healthy" if healthy else "unhealthy",
            "version": "1.0.0",
            "environment": settings.environment,
            "timestamp": "2024-01-01T00:00:00Z",  # In production, use real timestamp
            "checks": {
                "database": "healthy" if db_healthy else "unhealthy",
                "redis": "healthy" if redis_healthy else "unhealthy"
            },
            "features": {
                "lead_board": True,
                "geographic_matching": True,
                "hebrew_support": True,
                "pii_protection": True,
                "subscription_prioritization": True
            }
        }
        
        return JSONResponse(
            status_code=status_code,
            content=health_data
        )
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "service": "ofair-leads-service", 
                "status": "unhealthy",
                "error": str(e)
            }
        )


# Root endpoint
@app.get("/", include_in_schema=True, tags=["info"])
async def root() -> Dict[str, Any]:
    """
    Service information endpoint.
    
    **Public Access:** Basic service information.
    **Hebrew Support:** Returns Hebrew service description.
    """
    return {
        "service": "OFAIR Leads Service",
        "description": "שירות ניהול עבודות ולקוחות פוטנציאליים",
        "description_en": "Professional Lead Board and Management Platform",
        "version": "1.0.0",
        "environment": settings.environment,
        "features": [
            "לוח עבודות מותאם אישית",
            "התאמה גיאוגרפית מתקדמת", 
            "תמיכה מלאה בעברית ו-RTL",
            "הגנה על מידע אישי",
            "מערכת הפניות בין מקצועיים",
            "יתרונות מנויים"
        ],
        "api_docs": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "openapi_json": "/openapi.json"
        },
        "support": {
            "email": "support@ofair.co.il",
            "documentation": "https://docs.ofair.co.il/leads-service",
            "status_page": "https://status.ofair.co.il"
        }
    }


# Additional middleware for logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all HTTP requests for monitoring and debugging."""
    
    start_time = "2024-01-01T00:00:00Z"  # In production, use real timestamp
    
    # Log request
    logger.info(
        f"Request: {request.method} {request.url} "
        f"Client: {request.client.host if request.client else 'unknown'} "
        f"User-Agent: {request.headers.get('user-agent', 'unknown')}"
    )
    
    # Process request
    response = await call_next(request)
    
    # Log response
    process_time = 0.1  # In production, calculate actual time
    logger.info(
        f"Response: {request.method} {request.url} "
        f"Status: {response.status_code} "
        f"Time: {process_time:.3f}s"
    )
    
    # Add custom headers
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-Service"] = "ofair-leads-service"
    response.headers["X-Version"] = "1.0.0"
    
    return response


if __name__ == "__main__":
    import uvicorn
    
    # Development server
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )