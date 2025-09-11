import asyncio
import aiohttp
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import uuid
import logging

from models.notifications import (
    NotificationChannel, NotificationStatus, DeliveryResult
)
from database import get_database
from config import settings

logger = logging.getLogger(__name__)

class DeliveryService:
    def __init__(self):
        self.db = get_database()
        self.session = None
    
    async def _get_session(self):
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session
    
    async def process_notification_delivery(self, notification_id: str):
        """
        עיבוד משלוח התראה - Process notification delivery
        """
        try:
            # Get notification details
            notification = await self.db.get_notification(notification_id)
            if not notification:
                logger.error(f"Notification {notification_id} not found")
                return
            
            # Get delivery records
            deliveries = await self.db.get_notification_deliveries(notification_id)
            
            # Update status to sending
            await self.db.update_notification(notification_id, {
                "status": NotificationStatus.SENDING.value,
                "sent_at": datetime.utcnow()
            })
            
            # Process each delivery
            delivery_results = []
            for delivery in deliveries:
                try:
                    result = await self._deliver_to_channel(
                        delivery, notification
                    )
                    delivery_results.append(result)
                    
                    # Update delivery status
                    await self.db.update_notification_delivery(
                        delivery["id"], {
                            "status": result["status"],
                            "external_id": result.get("external_id"),
                            "error_message": result.get("error_message"),
                            "sent_at": datetime.utcnow(),
                            "delivered_at": result.get("delivered_at"),
                            "cost": result.get("cost")
                        }
                    )
                    
                except Exception as e:
                    logger.error(f"Delivery failed for {delivery['id']}: {str(e)}")
                    
                    await self.db.update_notification_delivery(
                        delivery["id"], {
                            "status": "failed",
                            "error_message": str(e),
                            "sent_at": datetime.utcnow()
                        }
                    )
                    
                    delivery_results.append({
                        "channel": delivery["channel"],
                        "status": "failed",
                        "error_message": str(e)
                    })
            
            # Determine overall notification status
            successful_deliveries = [r for r in delivery_results if r["status"] == "delivered"]
            failed_deliveries = [r for r in delivery_results if r["status"] == "failed"]
            
            if successful_deliveries:
                final_status = NotificationStatus.DELIVERED
            elif failed_deliveries:
                final_status = NotificationStatus.FAILED
            else:
                final_status = NotificationStatus.SENDING
            
            # Update notification final status
            update_data = {"status": final_status.value}
            if final_status == NotificationStatus.DELIVERED:
                update_data["delivered_at"] = datetime.utcnow()
            
            await self.db.update_notification(notification_id, update_data)
            
            # Log delivery results
            await self._log_delivery_results(notification_id, delivery_results)
            
        except Exception as e:
            logger.error(f"Failed to process notification delivery {notification_id}: {str(e)}")
            
            # Mark as failed
            await self.db.update_notification(notification_id, {
                "status": NotificationStatus.FAILED.value,
                "error_message": str(e)
            })
    
    async def _deliver_to_channel(
        self,
        delivery: Dict[str, Any],
        notification: Dict[str, Any]
    ) -> DeliveryResult:
        """Deliver notification to specific channel"""
        channel = NotificationChannel(delivery["channel"])
        
        if channel == NotificationChannel.SMS:
            return await self._send_sms(delivery, notification)
        elif channel == NotificationChannel.WHATSAPP:
            return await self._send_whatsapp(delivery, notification)
        elif channel == NotificationChannel.EMAIL:
            return await self._send_email(delivery, notification)
        elif channel == NotificationChannel.PUSH:
            return await self._send_push(delivery, notification)
        elif channel == NotificationChannel.IN_APP:
            return await self._send_in_app(delivery, notification)
        else:
            raise ValueError(f"Unsupported channel: {channel}")
    
    async def _send_sms(
        self,
        delivery: Dict[str, Any],
        notification: Dict[str, Any]
    ) -> DeliveryResult:
        """
        שליחת SMS - Send SMS notification
        """
        try:
            # Get template and render message
            message = await self._render_message(
                notification["template_id"],
                notification.get("variables", {}),
                NotificationChannel.SMS
            )
            
            # Israeli SMS provider integration (mock implementation)
            sms_data = {
                "to": delivery["recipient"],
                "message": message["content"],
                "from": settings.SMS_SENDER_ID
            }
            
            session = await self._get_session()
            
            # Mock SMS API call
            if settings.ENVIRONMENT == "production":
                async with session.post(
                    settings.SMS_API_URL,
                    json=sms_data,
                    headers={"Authorization": f"Bearer {settings.SMS_API_KEY}"}
                ) as response:
                    if response.status == 200:
                        result_data = await response.json()
                        return DeliveryResult(
                            channel=NotificationChannel.SMS,
                            status="delivered",
                            external_id=result_data.get("message_id"),
                            delivered_at=datetime.utcnow(),
                            cost=self._calculate_sms_cost(message["content"])
                        )
                    else:
                        error_text = await response.text()
                        return DeliveryResult(
                            channel=NotificationChannel.SMS,
                            status="failed",
                            error_message=f"SMS API error: {error_text}"
                        )
            else:
                # Mock success for development
                await asyncio.sleep(0.1)  # Simulate API delay
                return DeliveryResult(
                    channel=NotificationChannel.SMS,
                    status="delivered",
                    external_id=f"mock_sms_{uuid.uuid4().hex[:8]}",
                    delivered_at=datetime.utcnow(),
                    cost=self._calculate_sms_cost(message["content"])
                )
                
        except Exception as e:
            return DeliveryResult(
                channel=NotificationChannel.SMS,
                status="failed",
                error_message=str(e)
            )
    
    async def _send_whatsapp(
        self,
        delivery: Dict[str, Any],
        notification: Dict[str, Any]
    ) -> DeliveryResult:
        """
        שליחת WhatsApp - Send WhatsApp notification
        """
        try:
            message = await self._render_message(
                notification["template_id"],
                notification.get("variables", {}),
                NotificationChannel.WHATSAPP
            )
            
            whatsapp_data = {
                "to": delivery["recipient"],
                "type": "text",
                "text": {"body": message["content"]}
            }
            
            session = await self._get_session()
            
            if settings.ENVIRONMENT == "production":
                async with session.post(
                    f"{settings.WHATSAPP_API_URL}/messages",
                    json=whatsapp_data,
                    headers={
                        "Authorization": f"Bearer {settings.WHATSAPP_API_KEY}",
                        "Content-Type": "application/json"
                    }
                ) as response:
                    if response.status == 200:
                        result_data = await response.json()
                        return DeliveryResult(
                            channel=NotificationChannel.WHATSAPP,
                            status="delivered",
                            external_id=result_data.get("messages", [{}])[0].get("id"),
                            delivered_at=datetime.utcnow(),
                            cost=settings.WHATSAPP_MESSAGE_COST
                        )
                    else:
                        error_text = await response.text()
                        return DeliveryResult(
                            channel=NotificationChannel.WHATSAPP,
                            status="failed",
                            error_message=f"WhatsApp API error: {error_text}"
                        )
            else:
                await asyncio.sleep(0.1)
                return DeliveryResult(
                    channel=NotificationChannel.WHATSAPP,
                    status="delivered",
                    external_id=f"mock_wa_{uuid.uuid4().hex[:8]}",
                    delivered_at=datetime.utcnow(),
                    cost=settings.WHATSAPP_MESSAGE_COST
                )
                
        except Exception as e:
            return DeliveryResult(
                channel=NotificationChannel.WHATSAPP,
                status="failed",
                error_message=str(e)
            )
    
    async def _send_email(
        self,
        delivery: Dict[str, Any],
        notification: Dict[str, Any]
    ) -> DeliveryResult:
        """
        שליחת אימייל - Send email notification
        """
        try:
            message = await self._render_message(
                notification["template_id"],
                notification.get("variables", {}),
                NotificationChannel.EMAIL
            )
            
            email_data = {
                "to": [delivery["recipient"]],
                "subject": message.get("subject", "התראה מ-OFAIR"),
                "html": message.get("html", f"<p>{message['content']}</p>"),
                "text": message["content"],
                "from": settings.EMAIL_FROM_ADDRESS
            }
            
            session = await self._get_session()
            
            if settings.ENVIRONMENT == "production":
                # Use SendGrid, SES, or other email service
                async with session.post(
                    settings.EMAIL_API_URL,
                    json=email_data,
                    headers={
                        "Authorization": f"Bearer {settings.EMAIL_API_KEY}",
                        "Content-Type": "application/json"
                    }
                ) as response:
                    if response.status == 202:  # SendGrid returns 202
                        result_data = await response.json()
                        return DeliveryResult(
                            channel=NotificationChannel.EMAIL,
                            status="delivered",
                            external_id=result_data.get("message_id"),
                            delivered_at=datetime.utcnow(),
                            cost=settings.EMAIL_MESSAGE_COST
                        )
                    else:
                        error_text = await response.text()
                        return DeliveryResult(
                            channel=NotificationChannel.EMAIL,
                            status="failed",
                            error_message=f"Email API error: {error_text}"
                        )
            else:
                await asyncio.sleep(0.2)  # Email takes longer
                return DeliveryResult(
                    channel=NotificationChannel.EMAIL,
                    status="delivered",
                    external_id=f"mock_email_{uuid.uuid4().hex[:8]}",
                    delivered_at=datetime.utcnow(),
                    cost=settings.EMAIL_MESSAGE_COST
                )
                
        except Exception as e:
            return DeliveryResult(
                channel=NotificationChannel.EMAIL,
                status="failed",
                error_message=str(e)
            )
    
    async def _send_push(
        self,
        delivery: Dict[str, Any],
        notification: Dict[str, Any]
    ) -> DeliveryResult:
        """
        שליחת Push notification - Send push notification
        """
        try:
            message = await self._render_message(
                notification["template_id"],
                notification.get("variables", {}),
                NotificationChannel.PUSH
            )
            
            # Get user's push tokens
            push_tokens = await self.db.get_user_push_tokens(delivery["recipient"])
            if not push_tokens:
                return DeliveryResult(
                    channel=NotificationChannel.PUSH,
                    status="failed",
                    error_message="No push tokens found for user"
                )
            
            push_data = {
                "tokens": push_tokens,
                "notification": {
                    "title": message.get("subject", "OFAIR"),
                    "body": message["content"]
                },
                "data": {
                    "notification_id": notification["id"],
                    "category": notification.get("category", "system")
                }
            }
            
            session = await self._get_session()
            
            if settings.ENVIRONMENT == "production":
                # Firebase Cloud Messaging
                async with session.post(
                    settings.FCM_API_URL,
                    json=push_data,
                    headers={
                        "Authorization": f"key={settings.FCM_API_KEY}",
                        "Content-Type": "application/json"
                    }
                ) as response:
                    if response.status == 200:
                        result_data = await response.json()
                        return DeliveryResult(
                            channel=NotificationChannel.PUSH,
                            status="delivered",
                            external_id=result_data.get("multicast_id"),
                            delivered_at=datetime.utcnow(),
                            cost=0  # Push notifications are usually free
                        )
                    else:
                        error_text = await response.text()
                        return DeliveryResult(
                            channel=NotificationChannel.PUSH,
                            status="failed",
                            error_message=f"Push API error: {error_text}"
                        )
            else:
                await asyncio.sleep(0.1)
                return DeliveryResult(
                    channel=NotificationChannel.PUSH,
                    status="delivered",
                    external_id=f"mock_push_{uuid.uuid4().hex[:8]}",
                    delivered_at=datetime.utcnow(),
                    cost=0
                )
                
        except Exception as e:
            return DeliveryResult(
                channel=NotificationChannel.PUSH,
                status="failed",
                error_message=str(e)
            )
    
    async def _send_in_app(
        self,
        delivery: Dict[str, Any],
        notification: Dict[str, Any]
    ) -> DeliveryResult:
        """
        שליחת התראה באפליקציה - Send in-app notification
        """
        try:
            message = await self._render_message(
                notification["template_id"],
                notification.get("variables", {}),
                NotificationChannel.IN_APP
            )
            
            # Store in-app notification in database
            in_app_data = {
                "user_id": delivery["recipient"],
                "notification_id": notification["id"],
                "title": message.get("subject", "התראה"),
                "content": message["content"],
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            
            await self.db.insert_in_app_notification(in_app_data)
            
            # Trigger WebSocket update if user is online
            await self._trigger_websocket_update(
                delivery["recipient"],
                {
                    "type": "new_notification",
                    "data": in_app_data
                }
            )
            
            return DeliveryResult(
                channel=NotificationChannel.IN_APP,
                status="delivered",
                delivered_at=datetime.utcnow(),
                cost=0
            )
            
        except Exception as e:
            return DeliveryResult(
                channel=NotificationChannel.IN_APP,
                status="failed",
                error_message=str(e)
            )
    
    async def _render_message(
        self,
        template_id: str,
        variables: Dict[str, Any],
        channel: NotificationChannel
    ) -> Dict[str, str]:
        """Render message content from template"""
        from .template_service import TemplateService
        
        template_service = TemplateService()
        template = await template_service.get_template(template_id)
        
        if not template:
            raise ValueError("Template not found")
        
        # Check if channel is supported
        if channel not in template.supported_channels:
            raise ValueError(f"Channel {channel} not supported by template")
        
        # Render content
        content = template.content_template
        for var_name, var_value in variables.items():
            placeholder = f"{{{var_name}}}"
            content = content.replace(placeholder, str(var_value))
        
        result = {"content": content}
        
        # Render subject if exists and needed for channel
        if template.subject_template and channel in [
            NotificationChannel.EMAIL, NotificationChannel.PUSH
        ]:
            subject = template.subject_template
            for var_name, var_value in variables.items():
                placeholder = f"{{{var_name}}}"
                subject = subject.replace(placeholder, str(var_value))
            result["subject"] = subject
        
        # Render HTML for email
        if template.html_template and channel == NotificationChannel.EMAIL:
            html = template.html_template
            for var_name, var_value in variables.items():
                placeholder = f"{{{var_name}}}"
                html = html.replace(placeholder, str(var_value))
            result["html"] = html
        
        return result
    
    async def _calculate_sms_cost(self, message: str) -> float:
        """Calculate SMS cost based on message length"""
        # SMS pricing for Israel (example rates)
        base_cost = 0.05  # 5 agorot per SMS
        
        # Hebrew SMS can be shorter due to encoding
        max_chars = 70 if any(ord(c) > 127 for c in message) else 160
        
        parts = (len(message) // max_chars) + 1
        return base_cost * parts
    
    async def _trigger_websocket_update(
        self,
        user_id: str,
        message: Dict[str, Any]
    ):
        """Trigger WebSocket update for online users"""
        try:
            # This would integrate with your WebSocket service
            # For now, just store the update for later retrieval
            await self.db.insert_websocket_message({
                "user_id": user_id,
                "message": json.dumps(message),
                "created_at": datetime.utcnow()
            })
        except Exception as e:
            logger.error(f"Failed to trigger WebSocket update: {str(e)}")
    
    async def _log_delivery_results(
        self,
        notification_id: str,
        delivery_results: List[Dict[str, Any]]
    ):
        """Log delivery results for monitoring"""
        log_data = {
            "notification_id": notification_id,
            "delivery_results": delivery_results,
            "total_deliveries": len(delivery_results),
            "successful_deliveries": len([r for r in delivery_results if r["status"] == "delivered"]),
            "failed_deliveries": len([r for r in delivery_results if r["status"] == "failed"]),
            "timestamp": datetime.utcnow()
        }
        
        await self.db.insert_delivery_log(log_data)
    
    async def process_webhook(
        self,
        channel: NotificationChannel,
        webhook_data: Dict[str, Any]
    ):
        """
        עיבוד webhook מספק שירות - Process delivery webhook from provider
        """
        try:
            if channel == NotificationChannel.SMS:
                await self._process_sms_webhook(webhook_data)
            elif channel == NotificationChannel.WHATSAPP:
                await self._process_whatsapp_webhook(webhook_data)
            elif channel == NotificationChannel.EMAIL:
                await self._process_email_webhook(webhook_data)
            elif channel == NotificationChannel.PUSH:
                await self._process_push_webhook(webhook_data)
            
        except Exception as e:
            logger.error(f"Failed to process {channel} webhook: {str(e)}")
    
    async def _process_sms_webhook(self, webhook_data: Dict[str, Any]):
        """Process SMS delivery webhook"""
        external_id = webhook_data.get("message_id")
        status = webhook_data.get("status")  # delivered, failed, etc.
        
        if external_id and status:
            # Update delivery record
            delivery = await self.db.get_delivery_by_external_id(external_id)
            if delivery:
                update_data = {"status": status}
                
                if status == "delivered":
                    update_data["delivered_at"] = datetime.utcnow()
                elif status == "failed":
                    update_data["error_message"] = webhook_data.get("error", "Delivery failed")
                
                await self.db.update_notification_delivery(
                    delivery["id"], update_data
                )
    
    async def _process_whatsapp_webhook(self, webhook_data: Dict[str, Any]):
        """Process WhatsApp delivery webhook"""
        # WhatsApp webhook format varies by provider
        for entry in webhook_data.get("entry", []):
            for change in entry.get("changes", []):
                if change.get("field") == "messages":
                    for status in change.get("value", {}).get("statuses", []):
                        message_id = status.get("id")
                        status_type = status.get("status")
                        
                        if message_id and status_type:
                            delivery = await self.db.get_delivery_by_external_id(message_id)
                            if delivery:
                                update_data = {"status": status_type}
                                
                                if status_type in ["delivered", "read"]:
                                    update_data["delivered_at"] = datetime.utcnow()
                                elif status_type == "failed":
                                    update_data["error_message"] = status.get("error", {}).get("message", "Delivery failed")
                                
                                await self.db.update_notification_delivery(
                                    delivery["id"], update_data
                                )
    
    async def _process_email_webhook(self, webhook_data: Dict[str, Any]):
        """Process email delivery webhook"""
        # Format varies by provider (SendGrid, SES, etc.)
        for event in webhook_data:
            message_id = event.get("sg_message_id") or event.get("message_id")
            event_type = event.get("event")
            
            if message_id and event_type:
                delivery = await self.db.get_delivery_by_external_id(message_id)
                if delivery:
                    update_data = {}
                    
                    if event_type == "delivered":
                        update_data = {
                            "status": "delivered",
                            "delivered_at": datetime.utcnow()
                        }
                    elif event_type in ["bounce", "dropped"]:
                        update_data = {
                            "status": "failed",
                            "error_message": event.get("reason", "Email bounced")
                        }
                    
                    if update_data:
                        await self.db.update_notification_delivery(
                            delivery["id"], update_data
                        )
    
    async def _process_push_webhook(self, webhook_data: Dict[str, Any]):
        """Process push notification webhook"""
        # FCM webhook processing
        message_id = webhook_data.get("message_id")
        status = webhook_data.get("status")
        
        if message_id and status:
            delivery = await self.db.get_delivery_by_external_id(message_id)
            if delivery:
                update_data = {"status": status}
                
                if status == "delivered":
                    update_data["delivered_at"] = datetime.utcnow()
                elif status == "failed":
                    update_data["error_message"] = webhook_data.get("error", "Push delivery failed")
                
                await self.db.update_notification_delivery(
                    delivery["id"], update_data
                )
    
    async def send_test_notification(
        self,
        channel: NotificationChannel,
        recipient: str,
        message: str
    ) -> Dict[str, Any]:
        """
        שליחת התראת בדיקה - Send test notification
        """
        try:
            # Create mock delivery and notification for testing
            test_delivery = {
                "id": str(uuid.uuid4()),
                "channel": channel.value,
                "recipient": recipient
            }
            
            test_notification = {
                "id": str(uuid.uuid4()),
                "template_id": "test_template",
                "variables": {"message": message}
            }
            
            # Mock template for testing
            await self._mock_test_template()
            
            result = await self._deliver_to_channel(test_delivery, test_notification)
            
            return {
                "success": result.status == "delivered",
                "message": "Test notification processed",
                "details": {
                    "channel": channel.value,
                    "recipient": recipient,
                    "status": result.status,
                    "error_message": result.error_message,
                    "external_id": result.external_id,
                    "cost": result.cost
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Test notification failed: {str(e)}",
                "details": None
            }
    
    async def _mock_test_template(self):
        """Create a mock template for testing"""
        # This would normally be stored in database
        # For testing, we'll just ensure the template service can handle it
        pass
    
    async def cleanup_old_deliveries(self, days_old: int = 90):
        """
        ניקוי רשומות משלוח ישנות - Clean up old delivery records
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Archive old delivery records instead of deleting
        await self.db.archive_old_deliveries(cutoff_date)
        
        logger.info(f"Archived delivery records older than {days_old} days")
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session and not self.session.closed:
            await self.session.close()