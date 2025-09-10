from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import Optional, List
from datetime import datetime

from ..middleware.auth import verify_admin_token, require_permissions
from ..models.admin import BulkUserActionRequest, UserSummary
from ..services.audit_service import AuditService

router = APIRouter()

@router.get("/")
async def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000),
    search: Optional[str] = Query(None),
    user_type: Optional[str] = Query(None, regex="^(professional|customer)$"),
    status: Optional[str] = Query(None, regex="^(active|inactive|suspended)$"),
    admin_user: dict = Depends(require_permissions(["user.view"]))
):
    """
    קבלת רשימת משתמשים - Get users list
    """
    # Mock user data - would normally query users service
    mock_users = []
    for i in range(50):
        mock_users.append({
            "id": f"user_{i+1}",
            "full_name": f"משתמש {i+1}",
            "email": f"user{i+1}@example.com",
            "phone_number": f"+972501{i+1:06d}",
            "user_type": "professional" if i % 2 == 0 else "customer",
            "status": "active" if i % 3 != 0 else "inactive",
            "registration_date": datetime.utcnow(),
            "last_activity": datetime.utcnow() if i % 3 == 0 else None,
            "total_leads": i * 2,
            "total_proposals": i * 3,
            "total_revenue": i * 1000.0,
            "verification_status": "verified" if i % 2 == 0 else "pending",
            "risk_score": i * 0.1 if i < 50 else None
        })
    
    # Apply filters
    filtered_users = mock_users
    
    if search:
        search_lower = search.lower()
        filtered_users = [
            user for user in filtered_users
            if search_lower in user["full_name"].lower() or search_lower in user["email"].lower()
        ]
    
    if user_type:
        filtered_users = [user for user in filtered_users if user["user_type"] == user_type]
    
    if status:
        filtered_users = [user for user in filtered_users if user["status"] == status]
    
    # Pagination
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_users = filtered_users[start_idx:end_idx]
    
    # Log access
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="users_list_access",
        resource_type="users",
        description=f"צפייה ברשימת משתמשים - עמוד {page}"
    )
    
    return {
        "users": paginated_users,
        "total": len(filtered_users),
        "page": page,
        "page_size": page_size,
        "total_pages": (len(filtered_users) + page_size - 1) // page_size,
        "filters": {
            "search": search,
            "user_type": user_type,
            "status": status
        }
    }

@router.get("/{user_id}")
async def get_user_details(
    user_id: str,
    admin_user: dict = Depends(require_permissions(["user.view"]))
):
    """
    קבלת פרטי משתמש - Get user details
    """
    # Mock user details - would normally query users service
    user_details = {
        "id": user_id,
        "full_name": "יוסי כהן",
        "email": "yossi@example.com",
        "phone_number": "+972501234567",
        "user_type": "professional",
        "status": "active",
        "registration_date": "2024-01-15T10:30:00Z",
        "last_activity": "2025-01-14T16:45:00Z",
        "profile": {
            "business_name": "יוסי כהן - אלקטריקאי",
            "specializations": ["אלקטריקאי", "תיקוני חשמל"],
            "service_areas": ["תל אביב", "רמת גן"],
            "years_experience": 15
        },
        "verification": {
            "status": "verified",
            "verified_at": "2024-01-16T09:00:00Z",
            "documents_uploaded": 3
        },
        "statistics": {
            "total_leads": 145,
            "active_leads": 8,
            "total_proposals": 89,
            "accepted_proposals": 34,
            "total_revenue": 45600.00,
            "average_rating": 4.7,
            "completion_rate": 96.5
        },
        "recent_activity": [
            {
                "date": "2025-01-14T16:45:00Z",
                "action": "proposal_submitted",
                "description": "הגיש הצעה לליד: תיקון מזגן בתל אביב"
            },
            {
                "date": "2025-01-14T14:20:00Z", 
                "action": "lead_viewed",
                "description": "צפה בליד: שרברבות בראשון לציון"
            }
        ]
    }
    
    # Log access
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="user_details_access",
        resource_type="user",
        resource_id=user_id,
        description=f"צפייה בפרטי משתמש {user_id}"
    )
    
    return user_details

@router.put("/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_data: dict,
    admin_user: dict = Depends(require_permissions(["user.update"]))
):
    """
    עדכון סטטוס משתמש - Update user status
    """
    new_status = status_data.get("status")
    reason = status_data.get("reason", "")
    
    if new_status not in ["active", "suspended", "inactive"]:
        raise HTTPException(status_code=400, detail="סטטוס לא תקין")
    
    # Log the status change
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="user_status_update",
        resource_type="user",
        resource_id=user_id,
        description=f"שינוי סטטוס משתמש ל-{new_status}",
        metadata={"new_status": new_status, "reason": reason},
        severity="medium"
    )
    
    return {
        "success": True,
        "message": f"סטטוס משתמש עודכן ל-{new_status}",
        "user_id": user_id,
        "new_status": new_status,
        "updated_by": admin_user["username"],
        "updated_at": datetime.utcnow().isoformat()
    }

@router.post("/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    suspension_data: dict,
    admin_user: dict = Depends(require_permissions(["user.suspend"]))
):
    """
    השעיית משתמש - Suspend user
    """
    reason = suspension_data.get("reason", "")
    duration_days = suspension_data.get("duration_days")
    
    if not reason:
        raise HTTPException(status_code=400, detail="נדרש לציין סיבה להשעיה")
    
    # Log the suspension
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="user_suspended",
        resource_type="user",
        resource_id=user_id,
        description=f"השעיית משתמש - סיבה: {reason}",
        metadata={"reason": reason, "duration_days": duration_days},
        severity="high"
    )
    
    return {
        "success": True,
        "message": "משתמש הושעה בהצלחה",
        "user_id": user_id,
        "suspended_by": admin_user["username"],
        "reason": reason,
        "duration_days": duration_days,
        "suspended_at": datetime.utcnow().isoformat()
    }

@router.post("/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: str,
    admin_user: dict = Depends(require_permissions(["user.suspend"]))
):
    """
    ביטול השעיית משתמש - Unsuspend user
    """
    # Log the unsuspension
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="user_unsuspended",
        resource_type="user",
        resource_id=user_id,
        description="ביטול השעיית משתמש",
        severity="medium"
    )
    
    return {
        "success": True,
        "message": "השעיית משתמש בוטלה",
        "user_id": user_id,
        "unsuspended_by": admin_user["username"],
        "unsuspended_at": datetime.utcnow().isoformat()
    }

@router.get("/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    days: int = Query(30, ge=1, le=365),
    admin_user: dict = Depends(require_permissions(["user.view"]))
):
    """
    קבלת פעילות משתמש - Get user activity
    """
    # Get user activity report from audit service
    audit_service = AuditService()
    activity_report = await audit_service.get_user_activity_report(user_id, days)
    
    # Log access
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="user_activity_access",
        resource_type="user",
        resource_id=user_id,
        description=f"צפייה בפעילות משתמש - {days} ימים"
    )
    
    return activity_report

@router.post("/bulk-action")
async def bulk_user_action(
    request: BulkUserActionRequest,
    background_tasks: BackgroundTasks,
    admin_user: dict = Depends(require_permissions(["user.bulk_action"]))
):
    """
    פעולה נפחית על משתמשים - Bulk user action
    """
    # Validate action
    valid_actions = ["suspend", "activate", "delete", "export"]
    if request.action not in valid_actions:
        raise HTTPException(status_code=400, detail="פעולה לא תקינה")
    
    # Log the bulk action
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="bulk_user_action",
        resource_type="users",
        description=f"פעולה נפחית: {request.action} על {len(request.user_ids)} משתמשים",
        metadata={
            "action": request.action,
            "user_count": len(request.user_ids),
            "reason": request.reason
        },
        severity="high"
    )
    
    # Process in background
    action_id = f"bulk_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    
    # For now, return success - would implement actual bulk processing
    return {
        "action_id": action_id,
        "status": "initiated",
        "message": f"פעולה נפחית החלה על {len(request.user_ids)} משתמשים",
        "action": request.action,
        "initiated_by": admin_user["username"],
        "initiated_at": datetime.utcnow().isoformat()
    }

@router.get("/{user_id}/leads")
async def get_user_leads(
    user_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    admin_user: dict = Depends(require_permissions(["user.view"]))
):
    """
    קבלת ליידים של משתמש - Get user's leads
    """
    # Mock leads data
    mock_leads = [
        {
            "id": f"lead_{i+1}",
            "title": f"ליד {i+1} - תיקון מזגן",
            "category": "מזגנים וקירור",
            "status": "open" if i % 2 == 0 else "closed",
            "budget_range": "500-1000 ₪",
            "location": "תל אביב",
            "created_at": datetime.utcnow(),
            "proposal_count": i % 5,
            "selected_professional": f"professional_{i}" if i % 3 == 0 else None
        }
        for i in range(25)
    ]
    
    # Apply status filter
    if status:
        mock_leads = [lead for lead in mock_leads if lead["status"] == status]
    
    # Pagination
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_leads = mock_leads[start_idx:end_idx]
    
    return {
        "leads": paginated_leads,
        "total": len(mock_leads),
        "page": page,
        "page_size": page_size,
        "user_id": user_id
    }

@router.get("/{user_id}/proposals")
async def get_user_proposals(
    user_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    admin_user: dict = Depends(require_permissions(["user.view"]))
):
    """
    קבלת הצעות של משתמש - Get user's proposals
    """
    # Mock proposals data
    mock_proposals = [
        {
            "id": f"proposal_{i+1}",
            "lead_id": f"lead_{i+1}",
            "lead_title": f"ליד {i+1} - שירותי אלקטריקאי",
            "price": (i + 1) * 500,
            "status": "pending" if i % 2 == 0 else "accepted",
            "description": f"הצעה מספר {i+1} עם פירוט מקצועי",
            "submitted_at": datetime.utcnow(),
            "estimated_duration": f"{i+1} ימים"
        }
        for i in range(20)
    ]
    
    # Apply status filter
    if status:
        mock_proposals = [proposal for proposal in mock_proposals if proposal["status"] == status]
    
    # Pagination
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_proposals = mock_proposals[start_idx:end_idx]
    
    return {
        "proposals": paginated_proposals,
        "total": len(mock_proposals),
        "page": page,
        "page_size": page_size,
        "user_id": user_id
    }

@router.get("/{user_id}/financial")
async def get_user_financial_summary(
    user_id: str,
    admin_user: dict = Depends(require_permissions(["user.view", "payment.view"]))
):
    """
    סיכום פיננסי של משתמש - User financial summary
    """
    # Mock financial data
    financial_summary = {
        "user_id": user_id,
        "total_earnings": 45600.00,
        "pending_payments": 2400.00,
        "completed_payments": 43200.00,
        "platform_fees": 2280.00,
        "referral_earnings": 1800.00,
        "payment_history": [
            {
                "date": "2025-01-10",
                "amount": 1200.00,
                "type": "job_completion",
                "status": "completed",
                "lead_title": "תיקון מזגן - רמת גן"
            },
            {
                "date": "2025-01-08",
                "amount": 800.00,
                "type": "referral_commission",
                "status": "pending",
                "lead_title": "הפניית לקוח - אלקטריקאי"
            }
        ],
        "monthly_breakdown": {
            "2025-01": 4800.00,
            "2024-12": 5200.00,
            "2024-11": 4100.00
        }
    }
    
    # Log access to financial data
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="user_financial_access",
        resource_type="user_financial",
        resource_id=user_id,
        description="צפייה בנתונים פיננסיים של משתמש",
        severity="medium"
    )
    
    return financial_summary

@router.post("/{user_id}/note")
async def add_user_note(
    user_id: str,
    note_data: dict,
    admin_user: dict = Depends(require_permissions(["user.update"]))
):
    """
    הוספת הערה למשתמש - Add note to user
    """
    note_text = note_data.get("note", "")
    if not note_text:
        raise HTTPException(status_code=400, detail="נדרש תוכן הערה")
    
    # Log the note addition
    audit_service = AuditService()
    await audit_service.log_admin_action(
        admin_id=admin_user["user_id"],
        action="user_note_added",
        resource_type="user",
        resource_id=user_id,
        description=f"הוספת הערה: {note_text[:100]}...",
        metadata={"note": note_text}
    )
    
    return {
        "success": True,
        "message": "הערה נוספה בהצלחה",
        "note_id": f"note_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        "added_by": admin_user["username"],
        "added_at": datetime.utcnow().isoformat()
    }