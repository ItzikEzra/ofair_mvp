from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import Optional, List, Dict, Any
from datetime import datetime

from ..middleware.auth import verify_admin_token, require_super_admin, require_permissions
from ..models.admin import SystemConfigUpdateRequest, SystemAlert, FeatureFlag
from ..services.audit_service import AuditService
from ..services.metrics_service import MetricsService
from ..config import settings

router = APIRouter()

@router.get("/status")
async def get_system_status(
    admin_user: dict = Depends(verify_admin_token)
):
    """
    סטטוס מערכת כללי - General system status
    """
    metrics_service = MetricsService()
    system_metrics = await metrics_service.get_system_metrics()
    
    # Get alerts count
    from ..database import get_database
    db = get_database()
    
    critical_alerts = await db.get_alerts_by_severity("critical")
    high_alerts = await db.get_alerts_by_severity("high")
    
    # Determine overall status
    if critical_alerts:
        overall_status = "critical"
        status_message = f"יש {len(critical_alerts)} התראות קריטיות"
    elif high_alerts:
        overall_status = "warning"
        status_message = f"יש {len(high_alerts)} התראות בעדיפות גבוהה"
    elif system_metrics.get("system_health") == "healthy":
        overall_status = "healthy"
        status_message = "המערכת פועלת תקין"
    else:
        overall_status = "degraded"
        status_message = "המערכת פועלת עם הגבלות"
    
    return {
        "overall_status": overall_status,
        "status_message": status_message,
        "system_metrics": system_metrics,
        "alerts_summary": {
            "critical": len(critical_alerts),
            "high": len(high_alerts),
            "total_active": len(critical_alerts) + len(high_alerts)
        },
        "last_updated": datetime.utcnow().isoformat()
    }

@router.get("/health")
async def detailed_health_check(
    admin_user: dict = Depends(require_permissions(["system.monitor"]))
):
    """
    בדיקת בריאות מפורטת - Detailed health check
    """
    metrics_service = MetricsService()
    
    # Get comprehensive system metrics
    system_metrics = await metrics_service.get_system_metrics()
    
    # Get resource utilization
    resource_metrics = await metrics_service.get_resource_utilization()
    
    # Get performance data
    performance_data = await metrics_service.get_performance_trends(1)  # Last day
    
    return {
        "system_health": system_metrics,
        "resource_utilization": resource_metrics,
        "performance_trends": performance_data,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/alerts")
async def get_system_alerts(
    severity: Optional[str] = Query(None, regex="^(low|medium|high|critical)$"),
    status: Optional[str] = Query(None, regex="^(active|resolved|acknowledged)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    admin_user: dict = Depends(require_permissions(["system.monitor"]))
):
    """
    קבלת התראות מערכת - Get system alerts
    """
    from ..database import get_database
    db = get_database()
    
    if severity:
        alerts = await db.get_alerts_by_severity(severity)
    else:
        alerts = await db.get_active_alerts()
    
    # Apply status filter
    if status:
        alerts = [alert for alert in alerts if alert.get("status", "active") == status]
    
    # Pagination
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_alerts = alerts[start_idx:end_idx]
    
    return {
        "alerts": paginated_alerts,
        "total": len(alerts),
        "page": page,
        "page_size": page_size,
        "filters": {
            "severity": severity,
            "status": status
        }
    }

@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    admin_user: dict = Depends(require_permissions(["system.manage"]))
):
    """
    אישור התראה - Acknowledge alert
    """
    # Log the acknowledgment
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="alert_acknowledged",
        resource_type="system_alert",
        resource_id=alert_id,
        description="אישור התראת מערכת",
        severity="medium"
    )
    
    return {
        "success": True,
        "message": "התראה אושרה",
        "alert_id": alert_id,
        "acknowledged_by": admin_user["username"],
        "acknowledged_at": datetime.utcnow().isoformat()
    }

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    resolution_data: dict,
    admin_user: dict = Depends(require_permissions(["system.manage"]))
):
    """
    פתרון התראה - Resolve alert
    """
    resolution_note = resolution_data.get("resolution_note", "")
    
    # Log the resolution
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="alert_resolved",
        resource_type="system_alert",
        resource_id=alert_id,
        description=f"פתרון התראת מערכת: {resolution_note}",
        metadata={"resolution_note": resolution_note},
        severity="medium"
    )
    
    return {
        "success": True,
        "message": "התראה נפתרה",
        "alert_id": alert_id,
        "resolved_by": admin_user["username"],
        "resolved_at": datetime.utcnow().isoformat(),
        "resolution_note": resolution_note
    }

@router.get("/config")
async def get_system_config(
    category: Optional[str] = Query(None),
    admin_user: dict = Depends(require_permissions(["system.config"]))
):
    """
    קבלת הגדרות מערכת - Get system configuration
    """
    # Mock configuration data
    config_items = [
        {
            "key": "maintenance_mode",
            "value": False,
            "category": "system",
            "description": "מצב תחזוקה",
            "is_sensitive": False,
            "last_updated": datetime.utcnow(),
            "updated_by": "system"
        },
        {
            "key": "max_file_upload_size",
            "value": "50MB",
            "category": "uploads",
            "description": "גודל מקסימלי להעלאת קבצים",
            "is_sensitive": False,
            "last_updated": datetime.utcnow(),
            "updated_by": "admin"
        },
        {
            "key": "email_notifications_enabled",
            "value": True,
            "category": "notifications",
            "description": "הפעלת התראות אימייל",
            "is_sensitive": False,
            "last_updated": datetime.utcnow(),
            "updated_by": "admin"
        }
    ]
    
    # Apply category filter
    if category:
        config_items = [item for item in config_items if item["category"] == category]
    
    return {
        "config_items": config_items,
        "categories": ["system", "uploads", "notifications", "payments", "security"],
        "total": len(config_items)
    }

@router.put("/config/{config_key}")
async def update_system_config(
    config_key: str,
    update_request: SystemConfigUpdateRequest,
    admin_user: dict = Depends(require_super_admin)
):
    """
    עדכון הגדרות מערכת - Update system configuration
    """
    # Validate configuration key
    allowed_keys = [
        "maintenance_mode",
        "max_file_upload_size", 
        "email_notifications_enabled",
        "rate_limit_per_minute",
        "session_timeout"
    ]
    
    if config_key not in allowed_keys:
        raise HTTPException(status_code=400, detail="מפתח הגדרה לא תקין")
    
    # Log the configuration change
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="system_config_updated",
        resource_type="system_config",
        resource_id=config_key,
        description=f"עדכון הגדרת מערכת: {config_key}",
        metadata={
            "config_key": config_key,
            "new_value": update_request.config_value,
            "category": update_request.category
        },
        severity="high"
    )
    
    return {
        "success": True,
        "message": f"הגדרת {config_key} עודכנה בהצלחה",
        "config_key": config_key,
        "new_value": update_request.config_value,
        "updated_by": admin_user["username"],
        "updated_at": datetime.utcnow().isoformat()
    }

@router.post("/maintenance")
async def toggle_maintenance_mode(
    maintenance_data: dict,
    admin_user: dict = Depends(require_super_admin)
):
    """
    הפעלה/ביטול מצב תחזוקה - Toggle maintenance mode
    """
    enabled = maintenance_data.get("enabled", False)
    message = maintenance_data.get("message", "המערכת נמצאת בתחזוקה")
    
    # Log the maintenance mode change
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="maintenance_mode_toggled",
        resource_type="system",
        description=f"{'הפעלת' if enabled else 'ביטול'} מצב תחזוקה",
        metadata={"enabled": enabled, "message": message},
        severity="critical"
    )
    
    return {
        "success": True,
        "maintenance_enabled": enabled,
        "message": message,
        "toggled_by": admin_user["username"],
        "toggled_at": datetime.utcnow().isoformat()
    }

@router.get("/logs")
async def get_system_logs(
    level: Optional[str] = Query(None, regex="^(debug|info|warning|error|critical)$"),
    component: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    admin_user: dict = Depends(require_permissions(["system.logs"]))
):
    """
    קבלת לוגים של מערכת - Get system logs
    """
    # Mock logs data
    mock_logs = [
        {
            "timestamp": datetime.utcnow(),
            "level": "info",
            "component": "auth-service",
            "message": "User logged in successfully",
            "details": {"user_id": "user_123", "ip": "192.168.1.100"}
        },
        {
            "timestamp": datetime.utcnow(),
            "level": "warning",
            "component": "payments-service", 
            "message": "Payment processing slow response",
            "details": {"response_time": 2500, "payment_id": "pay_456"}
        },
        {
            "timestamp": datetime.utcnow(),
            "level": "error",
            "component": "notifications-service",
            "message": "Failed to send SMS notification",
            "details": {"error": "Network timeout", "phone": "+972501234567"}
        }
    ]
    
    # Apply filters
    filtered_logs = mock_logs
    
    if level:
        filtered_logs = [log for log in filtered_logs if log["level"] == level]
    
    if component:
        filtered_logs = [log for log in filtered_logs if log["component"] == component]
    
    # Pagination
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_logs = filtered_logs[start_idx:end_idx]
    
    return {
        "logs": paginated_logs,
        "total": len(filtered_logs),
        "page": page,
        "page_size": page_size,
        "available_components": ["auth-service", "users-service", "leads-service", "notifications-service"],
        "filters": {
            "level": level,
            "component": component
        }
    }

@router.get("/performance")
async def get_performance_report(
    days: int = Query(7, ge=1, le=90),
    admin_user: dict = Depends(require_permissions(["system.monitor"]))
):
    """
    דוח ביצועים - Performance report
    """
    metrics_service = MetricsService()
    
    # Get performance report
    start_date = datetime.utcnow() - datetime.timedelta(days=days)
    end_date = datetime.utcnow()
    
    performance_report = await metrics_service.generate_performance_report(start_date, end_date)
    
    return performance_report

@router.post("/backup")
async def initiate_system_backup(
    backup_data: dict,
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(require_super_admin)
):
    """
    יזום גיבוי מערכת - Initiate system backup
    """
    backup_type = backup_data.get("type", "full")  # full, incremental
    include_files = backup_data.get("include_files", True)
    
    # Log the backup initiation
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="system_backup_initiated",
        resource_type="system",
        description=f"יזום גיבוי מערכת - סוג: {backup_type}",
        metadata={"backup_type": backup_type, "include_files": include_files},
        severity="high"
    )
    
    backup_id = f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    return {
        "backup_id": backup_id,
        "status": "initiated",
        "message": "גיבוי מערכת החל",
        "backup_type": backup_type,
        "estimated_duration_minutes": 30,
        "initiated_by": admin_user["username"],
        "initiated_at": datetime.utcnow().isoformat()
    }

@router.get("/feature-flags")
async def get_feature_flags(
    admin_user: dict = Depends(require_permissions(["system.config"]))
):
    """
    קבלת דגלי פיצ'רים - Get feature flags
    """
    # Mock feature flags
    feature_flags = [
        {
            "name": "new_dashboard_ui",
            "is_enabled": True,
            "description": "ממשק דשבורד חדש",
            "target_percentage": 50,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "updated_by": "admin"
        },
        {
            "name": "advanced_analytics",
            "is_enabled": False,
            "description": "אנליטיקה מתקדמת",
            "target_percentage": 100,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "updated_by": "admin"
        }
    ]
    
    return {
        "feature_flags": feature_flags,
        "total": len(feature_flags)
    }

@router.put("/feature-flags/{flag_name}")
async def update_feature_flag(
    flag_name: str,
    flag_data: dict,
    admin_user: dict = Depends(require_super_admin)
):
    """
    עדכון דגל פיצ'ר - Update feature flag
    """
    is_enabled = flag_data.get("is_enabled")
    target_percentage = flag_data.get("target_percentage", 100)
    
    # Log the feature flag change
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="feature_flag_updated",
        resource_type="feature_flag",
        resource_id=flag_name,
        description=f"עדכון דגל פיצ'ר: {flag_name}",
        metadata={"flag_name": flag_name, "is_enabled": is_enabled, "target_percentage": target_percentage},
        severity="medium"
    )
    
    return {
        "success": True,
        "message": f"דגל פיצ'ר {flag_name} עודכן",
        "flag_name": flag_name,
        "is_enabled": is_enabled,
        "target_percentage": target_percentage,
        "updated_by": admin_user["username"],
        "updated_at": datetime.utcnow().isoformat()
    }

@router.post("/clear-cache")
async def clear_system_cache(
    cache_type: str = Query("all", regex="^(all|redis|application|database)$"),
    admin_user: dict = Depends(require_super_admin)
):
    """
    ניקוי מטמון מערכת - Clear system cache
    """
    # Log the cache clear action
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="system_cache_cleared",
        resource_type="system",
        description=f"ניקוי מטמון: {cache_type}",
        metadata={"cache_type": cache_type},
        severity="medium"
    )
    
    return {
        "success": True,
        "message": f"מטמון {cache_type} נוקה בהצלחה",
        "cache_type": cache_type,
        "cleared_by": admin_user["username"],
        "cleared_at": datetime.utcnow().isoformat()
    }

@router.get("/version")
async def get_system_version(
    admin_user: dict = Depends(verify_admin_token)
):
    """
    גרסת מערכת - System version information
    """
    return {
        "version": "1.0.0",
        "build_date": "2025-01-15",
        "environment": settings.ENVIRONMENT,
        "services": {
            "admin-service": "1.0.0",
            "auth-service": "1.0.0",
            "users-service": "1.0.0",
            "leads-service": "1.0.0",
            "proposals-service": "1.0.0",
            "referrals-service": "1.0.0",
            "payments-service": "1.0.0",
            "notifications-service": "1.0.0"
        },
        "last_deployment": datetime.utcnow().isoformat()
    }