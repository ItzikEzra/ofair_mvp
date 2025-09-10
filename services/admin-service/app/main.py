from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import uvicorn
import logging
from datetime import datetime
from typing import Optional

from .config import settings
from .database import get_database, AdminDatabase
from .routes.analytics import router as analytics_router
from .routes.users import router as users_router
from .routes.leads import router as leads_router
from .routes.system import router as system_router
from .routes.reports import router as reports_router
from .middleware.auth import verify_admin_token
from .services.audit_service import AuditService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="OFAIR Admin Service",
    description="ניהול מערכת OFAIR - Admin management system with Hebrew/RTL support",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()

@app.on_event("startup")
async def startup_event():
    """Initialize database connection and services"""
    try:
        db = get_database()
        await db.connect()
        logger.info("מערכת הניהול הופעלה בהצלחה - Admin service started successfully")
        
        # Initialize audit service
        audit_service = AuditService()
        await audit_service.log_system_event(
            event_type="system_startup",
            description="Admin service started",
            severity="info",
            metadata={"version": "1.0.0", "environment": settings.ENVIRONMENT}
        )
        
    except Exception as e:
        logger.error(f"Failed to start admin service: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up database connections"""
    try:
        db = get_database()
        await db.disconnect()
        logger.info("מערכת הניהול הופסקה - Admin service shut down")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Health check endpoint
@app.get("/health")
async def health_check():
    """
    בדיקת תקינות מערכת - System health check
    """
    try:
        db = get_database()
        # Simple database connectivity check
        await db.health_check()
        
        return {
            "status": "healthy",
            "service": "admin-service",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",
            "message": "מערכת הניהול פועלת תקין"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "admin-service", 
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "message": "בעיה במערכת הניהול"
        }

# Root endpoint
@app.get("/")
async def root():
    """
    נקודת כניסה ראשית - Root endpoint
    """
    return {
        "service": "OFAIR Admin Service",
        "description": "מערכת ניהול OFAIR עם תמיכה מלאה בעברית ו-RTL",
        "version": "1.0.0",
        "docs": "/docs" if settings.DEBUG else "Documentation disabled in production",
        "health": "/health"
    }

# Include routers with authentication
app.include_router(
    analytics_router,
    prefix=f"{settings.API_V1_PREFIX}/analytics",
    tags=["Analytics - אנליטיקה"],
    dependencies=[Depends(verify_admin_token)]
)

app.include_router(
    users_router,
    prefix=f"{settings.API_V1_PREFIX}/users",
    tags=["User Management - ניהול משתמשים"],
    dependencies=[Depends(verify_admin_token)]
)

app.include_router(
    leads_router,
    prefix=f"{settings.API_V1_PREFIX}/leads", 
    tags=["Lead Management - ניהול ליידים"],
    dependencies=[Depends(verify_admin_token)]
)

app.include_router(
    system_router,
    prefix=f"{settings.API_V1_PREFIX}/system",
    tags=["System Management - ניהול מערכת"],
    dependencies=[Depends(verify_admin_token)]
)

app.include_router(
    reports_router,
    prefix=f"{settings.API_V1_PREFIX}/reports",
    tags=["Reports - דוחות"],
    dependencies=[Depends(verify_admin_token)]
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle unexpected exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
    # Log to audit
    try:
        audit_service = AuditService()
        await audit_service.log_system_event(
            event_type="system_error",
            description=f"Unhandled exception: {str(exc)}",
            severity="error",
            metadata={"path": str(request.url), "method": request.method}
        )
    except:
        pass  # Don't let audit logging cause more errors
    
    return {
        "error": "שגיאה פנימית במערכת",
        "message": "Internal server error", 
        "timestamp": datetime.utcnow().isoformat(),
        "request_id": getattr(request, 'request_id', None)
    }

# Admin-specific endpoints
@app.get(f"{settings.API_V1_PREFIX}/dashboard")
async def get_dashboard_data(admin_user: dict = Depends(verify_admin_token)):
    """
    נתוני דשבורד לאדמין - Get admin dashboard data
    """
    from .services.dashboard_service import DashboardService
    
    dashboard_service = DashboardService()
    dashboard_data = await dashboard_service.get_dashboard_overview()
    
    # Log admin access
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="dashboard_access",
        resource_type="dashboard",
        description="צפייה בדשבורד ראשי"
    )
    
    return dashboard_data

@app.post(f"{settings.API_V1_PREFIX}/audit/search")
async def search_audit_logs(
    search_params: dict,
    admin_user: dict = Depends(verify_admin_token)
):
    """
    חיפוש לוגי ביקורת - Search audit logs
    """
    audit_service = AuditService()
    
    # Log the audit search itself
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="audit_search",
        resource_type="audit_logs",
        description="חיפוש ברישומי ביקורת",
        metadata=search_params
    )
    
    results = await audit_service.search_audit_logs(search_params)
    return results

@app.get(f"{settings.API_V1_PREFIX}/metrics")
async def get_system_metrics(admin_user: dict = Depends(verify_admin_token)):
    """
    מטריקות מערכת - System performance metrics
    """
    from .services.metrics_service import MetricsService
    
    metrics_service = MetricsService()
    metrics = await metrics_service.get_system_metrics()
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": metrics,
        "status": "success"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )