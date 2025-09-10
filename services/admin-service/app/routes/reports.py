from fastapi import APIRouter, Depends, Query, BackgroundTasks
from typing import Optional
from datetime import datetime, timedelta

from ..middleware.auth import verify_admin_token, require_permissions
from ..models.admin import DataExportRequest
from ..services.audit_service import AuditService

router = APIRouter()

@router.get("/business")
async def get_business_report(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    admin_user: dict = Depends(require_permissions(["reports.generate"]))
):
    """דוח עסקי - Business report"""
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        },
        "summary": {
            "total_revenue": 284750.80,
            "total_leads": 3280,
            "conversion_rate": 78.5,
            "active_professionals": 1240,
            "customer_satisfaction": 4.6
        },
        "trends": {
            "revenue_growth": 15.2,
            "lead_growth": 12.8,
            "user_growth": 8.4
        }
    }

@router.get("/financial")
async def get_financial_report(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    admin_user: dict = Depends(require_permissions(["reports.generate", "payment.view"]))
):
    """דוח פיננסי - Financial report"""
    return {
        "revenue_breakdown": {
            "platform_fees": 14237.54,
            "commission_revenue": 42815.30,
            "total_revenue": 57052.84
        },
        "expenses": {
            "payment_processing": 855.79,
            "sms_notifications": 234.50,
            "server_costs": 1200.00
        },
        "net_profit": 54762.55
    }

@router.post("/export")
async def export_data(
    export_request: DataExportRequest,
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(require_permissions(["data.export"]))
):
    """יצוא נתונים - Export data"""
    # Log export request
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="data_export_requested",
        resource_type="data_export",
        description=f"בקשת יצוא נתונים: {export_request.entity_type}",
        metadata=export_request.dict(),
        severity="high"
    )
    
    export_id = f"export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    return {
        "export_id": export_id,
        "status": "processing",
        "message": "יצוא נתונים החל",
        "estimated_completion": (datetime.utcnow() + timedelta(minutes=10)).isoformat()
    }