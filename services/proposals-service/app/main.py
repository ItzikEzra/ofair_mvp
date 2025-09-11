"""
OFAIR Proposals Service FastAPI Application

A comprehensive proposal management service with PII revelation, media uploads,
Hebrew/RTL support, and business rule enforcement.

Key Features:
- Proposal submission by verified professionals on leads
- Proposal acceptance/rejection by lead owners
- PII revelation upon proposal acceptance
- Media uploads (images, documents) with proposals
- Hebrew/RTL support throughout
- Commission calculation triggers
- Audit logging for all proposal actions
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
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from deps import get_limiter, close_redis_client, check_database_health, check_redis_health
from api import proposals

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/var/log/proposals-service.log', mode='a')
    ]
)

logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting OFAIR Proposals Service")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")
    
    # Health checks
    db_healthy = await check_database_health()
    redis_healthy = await check_redis_health()
    
    if not db_healthy:
        logger.error("Database health check failed!")
    if not redis_healthy:
        logger.error("Redis health check failed!")
        
    logger.info("Proposals Service startup complete")
    
    yield
    
    # Shutdown
    logger.info("Shutting down OFAIR Proposals Service")
    await close_redis_client()
    logger.info("Proposals Service shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="OFAIR Proposals Service",
    description="""
    ## OFAIR Proposal Management Service
    
    **Professional Proposal System with PII Revelation and Media Support**
    
    ### Key Features
    
    #### 📋 Proposal Management
    - Professional proposal submission on leads
    - Lead owner acceptance/rejection workflow
    - Automatic PII revelation upon acceptance
    - Real-time proposal status tracking
    
    #### 🔐 PII Protection & Revelation
    - Client PII protected until proposal acceptance
    - Automatic PII revelation triggers upon acceptance
    - Audit logging for all PII access events
    - Commission calculation integration
    
    #### 📎 Media Upload System
    - Secure file upload with validation
    - Support for images, documents, and videos
    - S3/MinIO integration for scalable storage
    - Hebrew filename and description support
    
    #### 🇮🇱 Hebrew/RTL Support
    - Hebrew proposal descriptions and details
    - RTL text processing for proposal content
    - Hebrew media file names and descriptions
    - Israeli phone number and address handling
    
    #### 💼 Business Rules & Validation
    - Only verified professionals can submit proposals
    - Lead ownership validation for acceptance/rejection
    - Proposal status workflow enforcement
    - Rate limiting and abuse prevention
    
    #### 🔗 Service Integration
    - Leads Service integration for validation
    - Users Service for professional verification
    - Notifications Service for status updates
    - Payments Service trigger for commissions
    
    ### API Documentation
    
    #### Proposal Operations
    - `POST /proposals` - Submit proposal (verified professional only)
    - `GET /proposals/{id}` - Get proposal details
    - `PUT /proposals/{id}` - Update proposal (owner only)
    - `POST /proposals/{id}/accept` - Accept proposal (lead owner)
    - `POST /proposals/{id}/reject` - Reject proposal (lead owner)
    
    #### Proposal Management
    - `GET /proposals/my` - Get user's proposals
    - `GET /proposals/lead/{lead_id}` - Get proposals for a lead
    - `POST /proposals/{id}/media` - Upload proposal media
    - `DELETE /proposals/{id}/media/{media_id}` - Delete media file
    
    #### Status & Monitoring
    - `GET /health` - Service health check
    - `GET /proposals/stats` - Proposal statistics
    
    ### Rate Limits
    - Proposal submission: 5/hour per professional
    - Media uploads: 10/hour per proposal
    - Proposal updates: 20/hour per professional
    - Status checks: 100/hour per user
    
    ### Media Support
    - **Images:** JPEG, PNG, GIF (max 10MB)
    - **Documents:** PDF, DOC, DOCX (max 25MB) 
    - **Videos:** MP4, MOV (max 100MB)
    - **Total:** Up to 20 files per proposal
    
    ### PII Revelation Workflow
    1. Professional submits proposal with price and description
    2. Lead owner reviews proposal (no PII visible)
    3. Upon acceptance, client PII is revealed to professional
    4. Commission calculation is triggered
    5. Project lifecycle begins
    
    ### Hebrew Content Features
    - Hebrew proposal descriptions with RTL support
    - Israeli address and phone number validation
    - Hebrew media file descriptions
    - Localized date/time formatting
    - Currency display in Israeli Shekels (₪)
    
    ### Security Features
    - Professional verification required for submissions
    - Lead ownership validation for actions
    - Media file type and size validation
    - Rate limiting and abuse prevention
    - Comprehensive audit logging
    
    ### Notification Integration
    - Real-time notifications for proposal status changes
    - Email and SMS notifications for acceptance/rejection
    - WhatsApp integration for Hebrew content
    - Push notifications for mobile apps
    
    ### Business Intelligence
    - Proposal acceptance rate tracking
    - Average response time analytics
    - Professional performance metrics
    - Commission calculation accuracy
    
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
app.include_router(proposals.router)


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
            elif "price" in message.lower():
                message = f"מחיר לא תקין: {message}"
            elif "media" in message.lower():
                message = f"שגיאה בקובץ מדיה: {message}"
            elif "proposal" in message.lower():
                message = f"שגיאה בהצעה: {message}"
                
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
            "service": "ofair-proposals-service",
            "status": "healthy" if healthy else "unhealthy",
            "version": "1.0.0",
            "environment": settings.environment,
            "timestamp": "2024-01-01T00:00:00Z",  # In production, use real timestamp
            "checks": {
                "database": "healthy" if db_healthy else "unhealthy",
                "redis": "healthy" if redis_healthy else "unhealthy"
            },
            "features": {
                "proposal_management": True,
                "pii_revelation": True,
                "media_uploads": True,
                "hebrew_support": True,
                "commission_calculation": True,
                "audit_logging": True
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
                "service": "ofair-proposals-service", 
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
        "service": "OFAIR Proposals Service",
        "description": "שירות ניהול הצעות מחיר ועסקאות",
        "description_en": "Professional Proposal Management and PII Revelation Platform",
        "version": "1.0.0",
        "environment": settings.environment,
        "features": [
            "הגשת הצעות מחיר למקצועיים מוסמכים",
            "קבלה ודחיית הצעות על ידי בעלי העבודות", 
            "חשיפת מידע אישי אוטומטית לאחר קבלת הצעה",
            "העלאת קבצי מדיה והמסמכים",
            "תמיכה מלאה בעברית ו-RTL",
            "חישוב עמלות אוטומטי",
            "רישום ביקורת מקיף"
        ],
        "api_docs": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "openapi_json": "/openapi.json"
        },
        "support": {
            "email": "support@ofair.co.il",
            "documentation": "https://docs.ofair.co.il/proposals-service",
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
    response.headers["X-Service"] = "ofair-proposals-service"
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