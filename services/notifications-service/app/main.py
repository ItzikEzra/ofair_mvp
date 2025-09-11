import sys
import os
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer
from typing import List, Optional, Dict, Any
from datetime import datetime
import asyncio

# Add path resolution for Docker container
sys.path.append("/app/libs")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models.notifications import (
    SendNotificationRequest,
    NotificationResponse,
    NotificationStatus,
    NotificationChannel,
    NotificationTemplate,
    UserPreferencesResponse,
    UpdatePreferencesRequest,
    NotificationHistory,
    BulkNotificationRequest
)
from services.notification_service import NotificationService
from services.template_service import TemplateService
from services.delivery_service import DeliveryService
from services.preferences_service import PreferencesService
from middleware.auth import verify_jwt_token
from config import settings

app = FastAPI(
    title="OFAIR Notifications Service",
    description="מערכת התראות רב-ערוצית - Multi-channel notification system",
    version="1.0.0"
)

security = HTTPBearer()

@app.post("/notifications/send", response_model=NotificationResponse)
async def send_notification(
    request: SendNotificationRequest,
    current_user: dict = Depends(verify_jwt_token),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    שליחת התראה - Send notification
    """
    notification_service = NotificationService()
    
    try:
        notification = await notification_service.send_notification(
            user_id=request.user_id,
            template_id=request.template_id,
            channels=request.channels,
            variables=request.variables,
            priority=request.priority,
            scheduled_at=request.scheduled_at,
            sender_id=current_user["user_id"]
        )
        
        # Process delivery in background if immediate
        if not request.scheduled_at:
            background_tasks.add_task(
                _process_notification_delivery,
                notification.id
            )
        
        return notification
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בשליחת התראה: {str(e)}")

@app.post("/notifications/send-bulk", response_model=List[NotificationResponse])
async def send_bulk_notifications(
    request: BulkNotificationRequest,
    current_user: dict = Depends(verify_jwt_token),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    שליחת התראות בכמות - Send bulk notifications
    """
    if current_user.get("role") not in ["admin", "system"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לשליחת התראות בכמות")
    
    notification_service = NotificationService()
    
    try:
        notifications = await notification_service.send_bulk_notifications(
            user_ids=request.user_ids,
            template_id=request.template_id,
            channels=request.channels,
            variables=request.variables,
            priority=request.priority,
            sender_id=current_user["user_id"]
        )
        
        # Process all deliveries in background
        for notification in notifications:
            background_tasks.add_task(
                _process_notification_delivery,
                notification.id
            )
        
        return notifications
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בשליחת התראות בכמות: {str(e)}")

@app.get("/notifications/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: str,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    קבלת פרטי התראה - Get notification details
    """
    notification_service = NotificationService()
    notification = await notification_service.get_notification(notification_id)
    
    if not notification:
        raise HTTPException(status_code=404, detail="התראה לא נמצאה")
    
    # Check permissions
    if (notification.user_id != current_user["user_id"] and 
        current_user.get("role") not in ["admin", "system"]):
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות בהתראה זו")
    
    return notification

@app.get("/notifications/user/{user_id}", response_model=List[NotificationHistory])
async def get_user_notifications(
    user_id: str,
    status: Optional[NotificationStatus] = None,
    channels: Optional[List[NotificationChannel]] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    קבלת התראות המשתמש - Get user's notifications
    """
    # Check permissions
    if (user_id != current_user["user_id"] and 
        current_user.get("role") not in ["admin"]):
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות בהתראות משתמש אחר")
    
    notification_service = NotificationService()
    notifications = await notification_service.get_user_notifications(
        user_id, status, channels, limit, offset
    )
    
    return notifications

@app.post("/notifications/{notification_id}/mark-read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    סימון התראה כנקראה - Mark notification as read
    """
    notification_service = NotificationService()
    
    # Verify notification belongs to user
    notification = await notification_service.get_notification(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="התראה לא נמצאה")
    
    if notification.user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לעדכן התראה זו")
    
    await notification_service.mark_notification_read(notification_id)
    
    return {"message": "התראה סומנה כנקראה"}

@app.get("/preferences/{user_id}", response_model=UserPreferencesResponse)
async def get_user_preferences(
    user_id: str,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    קבלת העדפות התראות - Get notification preferences
    """
    # Check permissions
    if (user_id != current_user["user_id"] and 
        current_user.get("role") not in ["admin"]):
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות בהעדפות משתמש אחר")
    
    preferences_service = PreferencesService()
    preferences = await preferences_service.get_user_preferences(user_id)
    
    return preferences

@app.put("/preferences/{user_id}")
async def update_user_preferences(
    user_id: str,
    request: UpdatePreferencesRequest,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    עדכון העדפות התראות - Update notification preferences
    """
    # Check permissions
    if (user_id != current_user["user_id"] and 
        current_user.get("role") not in ["admin"]):
        raise HTTPException(status_code=403, detail="אין הרשאה לעדכן העדפות משתמש אחר")
    
    preferences_service = PreferencesService()
    
    try:
        await preferences_service.update_user_preferences(
            user_id, request.preferences
        )
        
        return {"message": "העדפות עודכנו בהצלחה"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בעדכון העדפות: {str(e)}")

@app.get("/templates", response_model=List[NotificationTemplate])
async def get_templates(
    category: Optional[str] = None,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    קבלת תבניות התראות - Get notification templates
    """
    if current_user.get("role") not in ["admin", "system"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות בתבניות")
    
    template_service = TemplateService()
    templates = await template_service.get_templates(category)
    
    return templates

@app.post("/templates", response_model=NotificationTemplate)
async def create_template(
    template: NotificationTemplate,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    יצירת תבנית התראה - Create notification template
    """
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="אין הרשאה ליצירת תבניות")
    
    template_service = TemplateService()
    
    try:
        created_template = await template_service.create_template(
            template, created_by=current_user["user_id"]
        )
        
        return created_template
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה ביצירת תבנית: {str(e)}")

@app.put("/templates/{template_id}")
async def update_template(
    template_id: str,
    template: NotificationTemplate,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    עדכון תבנית התראה - Update notification template
    """
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לעדכון תבניות")
    
    template_service = TemplateService()
    
    try:
        await template_service.update_template(
            template_id, template, updated_by=current_user["user_id"]
        )
        
        return {"message": "תבנית עודכנה בהצלחה"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בעדכון תבנית: {str(e)}")

@app.post("/webhooks/{channel}")
async def handle_webhook(
    channel: NotificationChannel,
    webhook_data: dict,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    טיפול ב-webhook מספקי שירות - Handle delivery webhooks
    """
    delivery_service = DeliveryService()
    
    # Process webhook in background
    background_tasks.add_task(
        delivery_service.process_webhook,
        channel,
        webhook_data
    )
    
    return {"status": "webhook received"}

@app.get("/stats/delivery", response_model=Dict[str, Any])
async def get_delivery_stats(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    סטטיסטיקות משלוח - Get delivery statistics
    """
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות בסטטיסטיקות")
    
    notification_service = NotificationService()
    stats = await notification_service.get_delivery_stats(start_date, end_date)
    
    return stats

@app.get("/stats/user/{user_id}", response_model=Dict[str, Any])
async def get_user_stats(
    user_id: str,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    סטטיסטיקות משתמש - Get user notification statistics
    """
    # Check permissions
    if (user_id != current_user["user_id"] and 
        current_user.get("role") not in ["admin"]):
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות בסטטיסטיקות משתמש אחר")
    
    notification_service = NotificationService()
    stats = await notification_service.get_user_stats(user_id)
    
    return stats

@app.post("/test/send")
async def test_notification(
    channel: NotificationChannel,
    recipient: str,
    message: str,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    שליחת התראת בדיקה - Send test notification
    """
    if current_user.get("role") not in ["admin"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לשליחת התראות בדיקה")
    
    delivery_service = DeliveryService()
    
    try:
        result = await delivery_service.send_test_notification(
            channel, recipient, message
        )
        
        return {
            "success": result["success"],
            "message": result.get("message", "התראה נשלחה"),
            "details": result.get("details")
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בשליחת התראת בדיקה: {str(e)}")

async def _process_notification_delivery(notification_id: str):
    """Background task to process notification delivery"""
    try:
        delivery_service = DeliveryService()
        await delivery_service.process_notification_delivery(notification_id)
    except Exception as e:
        print(f"Error processing notification delivery {notification_id}: {e}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "notifications-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8006)