"""Users Service FastAPI application."""

import sys
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

import uvicorn
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Add libs to path
sys.path.append("/app/libs")

from python_shared.config.settings import get_settings
from python_shared.database.connection import get_db_engine
from deps import get_limiter, close_redis_client

# Import API routers
from api.users import router as users_router
from api.professionals import router as professionals_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting Users Service...")
    
    # Initialize database engine
    settings = get_settings()
    engine = get_db_engine(settings.database_url)
    logger.info("Database engine initialized")
    
    yield
    
    # Cleanup
    logger.info("Shutting down Users Service...")
    await close_redis_client()
    logger.info("Redis client closed")


# Create FastAPI app
app = FastAPI(
    title="OFAIR Users Service",
    description="User profile management and professional verification service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Get settings
settings = get_settings()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add GZip middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Add rate limiting middleware
limiter = get_limiter()
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceeded exceptions."""
    response = JSONResponse(
        status_code=429,
        content={
            "error": "rate_limit_exceeded",
            "message": f"Rate limit exceeded: {exc.detail}",
            "retry_after": getattr(exc, "retry_after", None)
        },
    )
    response = request.app.state.limiter._inject_headers(response, request.state.view_rate_limit)
    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with Hebrew support."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "http_error",
            "message": exc.detail,
            "status_code": exc.status_code
        },
        headers=exc.headers,
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.exception("Unexpected error occurred")
    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": "An internal server error occurred"
        },
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, Any]:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "users-service",
        "version": "1.0.0",
        "timestamp": "2024-01-01T00:00:00Z"
    }


# Ready check endpoint
@app.get("/ready", tags=["Health"])
async def ready_check() -> Dict[str, Any]:
    """Ready check endpoint."""
    try:
        # Test database connection
        engine = get_db_engine(settings.database_url)
        
        return {
            "status": "ready",
            "service": "users-service",
            "components": {
                "database": "connected",
                "redis": "connected"
            }
        }
    except Exception as e:
        logger.error(f"Ready check failed: {e}")
        raise HTTPException(status_code=503, detail="Service not ready")


# Root endpoint
@app.get("/", tags=["Root"])
async def root() -> Dict[str, str]:
    """Root endpoint."""
    return {
        "message": "OFAIR Users Service",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


# Include API routers
app.include_router(
    users_router,
    prefix="/users",
    tags=["Users"]
)

app.include_router(
    professionals_router,
    prefix="/professionals",
    tags=["Professionals"]
)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )