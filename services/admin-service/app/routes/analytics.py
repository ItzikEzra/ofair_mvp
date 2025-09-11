from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta

from middleware.auth import verify_admin_token, require_permissions
from services.dashboard_service import DashboardService
from services.metrics_service import MetricsService
from services.audit_service import AuditService

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_analytics(
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    admin_user: dict = Depends(verify_admin_token)
):
    """
    אנליטיקת דשבורד - Dashboard analytics
    """
    dashboard_service = DashboardService()
    detailed_analytics = await dashboard_service.get_detailed_analytics(period)
    
    # Log access
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="analytics_dashboard_access",
        resource_type="analytics",
        description=f"צפייה באנליטיקת דשבורד - תקופה: {period}"
    )
    
    return detailed_analytics

@router.get("/users")
async def get_user_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    admin_user: dict = Depends(require_permissions(["analytics.view"]))
):
    """
    אנליטיקת משתמשים - User analytics
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    dashboard_service = DashboardService()
    db = dashboard_service.db
    
    user_analytics = await db.get_user_analytics(start_date, end_date)
    
    # Enhanced analytics
    total_days = (end_date - start_date).days
    daily_growth = user_analytics["new_users"] / max(total_days, 1)
    
    analytics_data = {
        **user_analytics,
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": total_days
        },
        "insights": {
            "daily_growth_rate": daily_growth,
            "activity_rate": (user_analytics["active_users"] / user_analytics["total_users"]) * 100,
            "professional_percentage": (user_analytics["by_type"]["professionals"] / user_analytics["total_users"]) * 100
        }
    }
    
    return analytics_data

@router.get("/leads")
async def get_lead_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    admin_user: dict = Depends(require_permissions(["analytics.view"]))
):
    """
    אנליטיקת ליידים - Lead analytics
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    dashboard_service = DashboardService()
    db = dashboard_service.db
    
    lead_analytics = await db.get_lead_analytics(start_date, end_date)
    
    # Calculate additional metrics
    total_days = (end_date - start_date).days
    daily_leads = lead_analytics["new_leads"] / max(total_days, 1)
    
    analytics_data = {
        **lead_analytics,
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": total_days
        },
        "insights": {
            "daily_leads_average": daily_leads,
            "completion_rate": (lead_analytics["by_status"]["closed"] / lead_analytics["total_leads"]) * 100,
            "open_rate": (lead_analytics["by_status"]["open"] / lead_analytics["total_leads"]) * 100,
            "top_category": max(lead_analytics["by_category"].items(), key=lambda x: x[1])[0]
        }
    }
    
    return analytics_data

@router.get("/revenue")
async def get_revenue_analytics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    admin_user: dict = Depends(require_permissions(["analytics.view"]))
):
    """
    אנליטיקת הכנסות - Revenue analytics
    """
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    dashboard_service = DashboardService()
    db = dashboard_service.db
    
    revenue_analytics = await db.get_revenue_analytics(start_date, end_date)
    
    # Calculate additional metrics
    total_days = (end_date - start_date).days
    daily_revenue = revenue_analytics["monthly_revenue"] / max(total_days, 1)
    
    analytics_data = {
        **revenue_analytics,
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "days": total_days
        },
        "insights": {
            "daily_revenue_average": daily_revenue,
            "commission_percentage": (revenue_analytics["commission_revenue"] / revenue_analytics["total_revenue"]) * 100,
            "top_revenue_category": max(revenue_analytics["by_category"].items(), key=lambda x: x[1])[0]
        }
    }
    
    return analytics_data

@router.get("/performance")
async def get_performance_metrics(
    days: int = Query(7, ge=1, le=90),
    admin_user: dict = Depends(require_permissions(["system.monitor"]))
):
    """
    מטריקות ביצועים - Performance metrics
    """
    metrics_service = MetricsService()
    
    # Get performance trends
    performance_data = await metrics_service.get_performance_trends(days)
    
    # Get current system metrics
    current_metrics = await metrics_service.get_system_metrics()
    
    return {
        "current_metrics": current_metrics,
        "performance_trends": performance_data,
        "generated_at": datetime.utcnow().isoformat()
    }

@router.get("/real-time")
async def get_real_time_analytics(
    admin_user: dict = Depends(require_permissions(["analytics.view"]))
):
    """
    אנליטיקה בזמן אמת - Real-time analytics
    """
    metrics_service = MetricsService()
    
    real_time_data = await metrics_service.get_real_time_metrics()
    
    return real_time_data

@router.get("/trends")
async def get_analytics_trends(
    metric: str = Query(..., pattern="^(users|leads|revenue|performance)$"),
    period: str = Query("30d", pattern="^(7d|30d|90d)$"),
    admin_user: dict = Depends(require_permissions(["analytics.view"]))
):
    """
    מגמות אנליטיות - Analytics trends
    """
    dashboard_service = DashboardService()
    
    period_days = {"7d": 7, "30d": 30, "90d": 90}[period]
    
    if metric == "performance":
        metrics_service = MetricsService()
        trends = await metrics_service.get_performance_trends(period_days)
    else:
        # Get business trends
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)
        
        if metric == "users":
            trends = await dashboard_service.db.get_user_analytics(start_date, end_date)
        elif metric == "leads":
            trends = await dashboard_service.db.get_lead_analytics(start_date, end_date)
        elif metric == "revenue":
            trends = await dashboard_service.db.get_revenue_analytics(start_date, end_date)
        else:
            raise HTTPException(status_code=400, detail="Invalid metric type")
    
    return {
        "metric": metric,
        "period": period,
        "trends": trends,
        "generated_at": datetime.utcnow().isoformat()
    }

@router.get("/summary")
async def get_analytics_summary(
    admin_user: dict = Depends(verify_admin_token)
):
    """
    סיכום אנליטי - Analytics summary for quick overview
    """
    dashboard_service = DashboardService()
    
    # Get basic stats
    basic_stats = await dashboard_service._get_basic_stats()
    
    # Get audit summary
    audit_service = AuditService()
    audit_summary = await audit_service.get_audit_summary(7)
    
    # Get performance summary
    metrics_service = MetricsService()
    current_metrics = await metrics_service.get_real_time_metrics()
    
    summary = {
        "business_metrics": {
            "total_users": basic_stats.total_users,
            "active_users": basic_stats.active_users,
            "total_leads": basic_stats.total_leads,
            "total_revenue": basic_stats.total_revenue,
            "conversion_rate": basic_stats.conversion_rate
        },
        "system_health": {
            "status": basic_stats.system_status.value,
            "active_sessions": current_metrics.get("active_sessions", {}).get("total_sessions", 0),
            "requests_per_second": current_metrics.get("request_metrics", {}).get("requests_per_second", 0),
            "error_rate": current_metrics.get("request_metrics", {}).get("error_rate_percentage", 0)
        },
        "activity_summary": {
            "total_events_7d": audit_summary["total_events"],
            "critical_events_7d": audit_summary["critical_events"],
            "top_admin_actions": list(audit_summary["by_admin"].keys())[:3]
        },
        "alerts": {
            "active_alerts": current_metrics.get("alerts", {}).get("active_alerts", 0),
            "critical_alerts": current_metrics.get("alerts", {}).get("critical_alerts", 0)
        },
        "last_updated": datetime.utcnow().isoformat()
    }
    
    return summary

@router.post("/export")
async def export_analytics_data(
    export_request: dict,
    admin_user: dict = Depends(require_permissions(["data.export"]))
):
    """
    יצוא נתוני אנליטיקה - Export analytics data
    """
    # Log the export request
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="analytics_export",
        resource_type="analytics",
        description="יצוא נתוני אנליטיקה",
        metadata=export_request
    )
    
    # For now, return success - would implement actual export
    export_id = f"export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    return {
        "export_id": export_id,
        "status": "initiated",
        "message": "יצוא נתונים החל",
        "estimated_completion": (datetime.utcnow() + timedelta(minutes=5)).isoformat()
    }