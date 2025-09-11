from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime

from middleware.auth import verify_admin_token, require_permissions
from services.audit_service import AuditService

router = APIRouter()

@router.get("/")
async def get_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    status: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    admin_user: dict = Depends(require_permissions(["lead.view"]))
):
    """קבלת רשימת ליידים - Get leads list"""
    # Mock leads data
    mock_leads = [
        {
            "id": f"lead_{i+1}",
            "title": f"ליד {i+1} - תיקון מזגן בתל אביב",
            "category": "מזגנים וקירור",
            "customer_id": f"customer_{i+1}",
            "customer_name": f"לקוח {i+1}",
            "location": "תל אביב",
            "budget_range": "500-1000 ₪",
            "status": "open" if i % 2 == 0 else "closed",
            "created_at": datetime.utcnow(),
            "proposal_count": i % 5,
            "selected_professional": f"professional_{i}" if i % 3 == 0 else None,
            "revenue_generated": (i * 100.0) if i % 3 == 0 else None,
            "quality_score": (i % 10) / 10.0
        }
        for i in range(100)
    ]
    
    # Apply filters
    if status:
        mock_leads = [lead for lead in mock_leads if lead["status"] == status]
    if category:
        mock_leads = [lead for lead in mock_leads if category in lead["category"]]
    
    # Pagination
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_leads = mock_leads[start_idx:end_idx]
    
    return {
        "leads": paginated_leads,
        "total": len(mock_leads),
        "page": page,
        "page_size": page_size
    }

@router.get("/{lead_id}")
async def get_lead_details(
    lead_id: str,
    admin_user: dict = Depends(require_permissions(["lead.view"]))
):
    """פרטי ליד - Lead details"""
    return {
        "id": lead_id,
        "title": "תיקון מזגן בתל אביב",
        "description": "מזגן לא עובד, נדרש תיקון דחוף",
        "category": "מזגנים וקירור",
        "customer": {
            "id": "customer_123",
            "name": "יוסי כהן",
            "phone": "+972501234567",
            "location": "תל אביב"
        },
        "proposals": [
            {
                "id": "prop_1",
                "professional_name": "דני לוי - מזגנאי",
                "price": 800.0,
                "status": "accepted"
            }
        ],
        "status": "closed",
        "created_at": datetime.utcnow().isoformat()
    }

@router.put("/{lead_id}/moderate")
async def moderate_lead(
    lead_id: str,
    moderation_data: dict,
    admin_user: dict = Depends(require_permissions(["lead.moderate"]))
):
    """מודרציית ליד - Moderate lead"""
    action = moderation_data.get("action")  # approve, reject, flag
    reason = moderation_data.get("reason", "")
    
    # Log moderation action
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action=f"lead_moderated_{action}",
        resource_type="lead",
        resource_id=lead_id,
        description=f"מודרציית ליד: {action} - {reason}",
        severity="medium"
    )
    
    return {
        "success": True,
        "message": f"ליד {action} בהצלחה",
        "lead_id": lead_id,
        "action": action,
        "moderated_by": admin_user["username"]
    }