"""Auth Service FastAPI Application."""

from contextlib import asynccontextmanager
from typing import Dict, Any
import logging
import sys
import traceback

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Import shared libraries
sys.path.append("/app/libs")
from python_shared.config.settings import get_settings

# Import local modules
from api.auth import router as auth_router
from deps import get_redis_client, get_limiter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
    ]
)
logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()

# Initialize limiter
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Auth Service starting up...")
    
    # Test Redis connection
    try:
        redis_client = await get_redis_client()
        await redis_client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Auth Service shutting down...")
    try:
        redis_client = await get_redis_client()
        await redis_client.close()
        logger.info("Redis connection closed")
    except Exception as e:
        logger.error(f"Error closing Redis connection: {e}")


# Create FastAPI app
app = FastAPI(
    title="OFAIR Auth Service",
    description="Authentication and authorization service for OFAIR platform",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
    root_path="/auth" if settings.environment == "production" else "",
)

# Add middlewares
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if settings.debug else ["*.ofair.co.il", "localhost"]
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler with Hebrew support."""
    logger.error(f"Global exception: {exc}")
    logger.error(traceback.format_exc())
    
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": exc.detail,
                "error_he": "אירעה שגיאה",
                "status_code": exc.status_code
            }
        )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "error_he": "שגיאת שרת פנימית",
            "status_code": 500
        }
    )


# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    try:
        # Test Redis connection
        redis_client = await get_redis_client()
        await redis_client.ping()
        redis_status = "healthy"
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        redis_status = "unhealthy"
    
    return {
        "status": "healthy" if redis_status == "healthy" else "unhealthy",
        "service": "auth-service",
        "version": "1.0.0",
        "environment": settings.environment,
        "dependencies": {
            "redis": redis_status
        }
    }


# Root endpoint
@app.get("/", tags=["root"])
async def root():
    """Root endpoint with Hebrew support."""
    return {
        "service": "OFAIR Auth Service",
        "service_he": "שירות האימות של אופייר",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs" if settings.debug else "disabled"
    }


# Include routers
app.include_router(auth_router, prefix="/auth", tags=["authentication"])


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )