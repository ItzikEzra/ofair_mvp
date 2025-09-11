import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import uuid

from models.notifications import (
    NotificationResponse, NotificationStatus, NotificationChannel,
    NotificationPriority, NotificationHistory, NotificationDB
)
from database import get_database

class NotificationService:
    def __init__(self):
        self.db = get_database()
        self.preferences_service = None
        self.template_service = None
    
    def _get_preferences_service(self):
        if self.preferences_service is None:
            from services.preferences_service import PreferencesService
            self.preferences_service = PreferencesService()
        return self.preferences_service
    
    def _get_template_service(self):
        if self.template_service is None:
            from services.template_service import TemplateService
            self.template_service = TemplateService()
        return self.template_service
    
    async def send_notification(
        self,
        user_id: str,
        template_id: str,
        channels: List[NotificationChannel],
        variables: Optional[Dict[str, Any]] = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        scheduled_at: Optional[datetime] = None,
        sender_id: str = "system"
    ) -> NotificationResponse:
        """
        שליחת התראה יחידה - Send single notification
        """
        # Validate template exists and is active
        template = await self.template_service.get_template(template_id)
        if not template or not template.is_active:
            raise ValueError("תבנית התראה לא נמצאה או לא פעילה")
        
        # Validate channels are supported by template
        unsupported_channels = [ch for ch in channels if ch not in template.supported_channels]
        if unsupported_channels:
            raise ValueError(f"ערוצים לא נתמכים בתבנית: {', '.join(unsupported_channels)}")
        
        # Filter channels based on user preferences
        user_preferences = await self.preferences_service.get_user_preferences(user_id)
        filtered_channels = await self._filter_channels_by_preferences(
            channels, user_preferences, template.category
        )
        
        if not filtered_channels:
            raise ValueError("כל הערוצים הבקושים נחסמו על ידי העדפות המשתמש")
        
        notification_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        notification_data = {
            "id": notification_id,
            "user_id": user_id,
            "template_id": template_id,
            "channels": [ch.value for ch in filtered_channels],
            "priority": priority.value,
            "status": NotificationStatus.PENDING.value,
            "variables": variables or {},
            "scheduled_at": scheduled_at,
            "created_at": now,
            "created_by": sender_id
        }
        
        # Insert notification record
        await self.db.insert_notification(notification_data)
        
        # Create delivery records for each channel
        for channel in filtered_channels:
            await self._create_delivery_record(
                notification_id, channel, user_id, user_preferences
            )
        
        # If not scheduled, mark as queued for immediate processing
        if not scheduled_at:
            await self._update_notification_status(
                notification_id, NotificationStatus.QUEUED
            )
        
        # Log notification creation
        await self._log_notification_action(
            notification_id, "notification_created", sender_id
        )
        
        return NotificationResponse(**notification_data)
    
    async def send_bulk_notifications(
        self,
        user_ids: List[str],
        template_id: str,
        channels: List[NotificationChannel],
        variables: Optional[Dict[str, Any]] = None,
        priority: NotificationPriority = NotificationPriority.NORMAL,
        sender_id: str = "system"
    ) -> List[NotificationResponse]:
        """
        שליחת התראות בכמות - Send bulk notifications
        """
        notifications = []
        
        # Process in batches to avoid overwhelming the system
        batch_size = 50
        for i in range(0, len(user_ids), batch_size):
            batch_user_ids = user_ids[i:i + batch_size]
            
            batch_notifications = []
            for user_id in batch_user_ids:
                try:
                    notification = await self.send_notification(
                        user_id=user_id,
                        template_id=template_id,
                        channels=channels,
                        variables=variables,
                        priority=priority,
                        sender_id=sender_id
                    )
                    batch_notifications.append(notification)
                    
                except Exception as e:
                    # Log error but continue with other users
                    await self._log_notification_error(
                        user_id, template_id, str(e), sender_id
                    )
                    continue
            
            notifications.extend(batch_notifications)
            
            # Small delay between batches
            if i + batch_size < len(user_ids):
                await asyncio.sleep(0.1)
        
        return notifications
    
    async def get_notification(self, notification_id: str) -> Optional[NotificationResponse]:
        """
        קבלת פרטי התראה - Get notification details
        """
        notification_data = await self.db.get_notification(notification_id)
        
        if not notification_data:
            return None
        
        return NotificationResponse(**notification_data)
    
    async def get_user_notifications(
        self,
        user_id: str,
        status: Optional[NotificationStatus] = None,
        channels: Optional[List[NotificationChannel]] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[NotificationHistory]:
        """
        קבלת התראות המשתמש - Get user's notifications
        """
        notifications_data = await self.db.get_user_notifications(
            user_id, 
            status.value if status else None,
            [ch.value for ch in channels] if channels else None,
            limit, 
            offset
        )
        
        history = []
        for notification_data in notifications_data:
            # Get template info
            template = await self.template_service.get_template(
                notification_data['template_id']
            )
            
            # Get delivery results for all channels
            channel_results = await self.db.get_notification_delivery_results(
                notification_data['id']
            )
            
            # Create preview text from template
            preview_text = await self._create_preview_text(
                template, notification_data.get('variables', {})
            )
            
            history.append(NotificationHistory(
                id=notification_data['id'],
                template_name=template.name if template else 'תבנית לא זמינה',
                template_category=template.category if template else 'system',
                channels=[NotificationChannel(ch) for ch in notification_data['channels']],
                status=NotificationStatus(notification_data['status']),
                priority=NotificationPriority(notification_data['priority']),
                sent_at=notification_data.get('sent_at'),
                delivered_at=notification_data.get('delivered_at'),
                read_at=notification_data.get('read_at'),
                preview_text=preview_text,
                channel_results=channel_results
            ))
        
        return history
    
    async def mark_notification_read(self, notification_id: str):
        """
        סימון התראה כנקראה - Mark notification as read
        """
        now = datetime.utcnow()
        
        update_data = {
            "read_at": now
        }
        
        # Update status to read if currently delivered
        notification = await self.get_notification(notification_id)
        if notification and notification.status == NotificationStatus.DELIVERED:
            update_data["status"] = NotificationStatus.READ.value
        
        await self.db.update_notification(notification_id, update_data)
        
        # Log read action
        await self._log_notification_action(
            notification_id, "notification_read", "user"
        )
    
    async def get_delivery_stats(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        סטטיסטיקות משלוח - Get delivery statistics
        """
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=30)
        if not end_date:
            end_date = datetime.utcnow()
        
        stats = await self.db.get_delivery_stats(start_date, end_date)
        
        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "total_notifications": stats.get("total_notifications", 0),
            "by_status": stats.get("by_status", {}),
            "by_channel": stats.get("by_channel", {}),
            "by_priority": stats.get("by_priority", {}),
            "delivery_rate": stats.get("delivery_rate", 0),
            "read_rate": stats.get("read_rate", 0),
            "average_delivery_time": stats.get("average_delivery_time", 0),
            "failed_notifications": stats.get("failed_notifications", 0),
            "cost_by_channel": stats.get("cost_by_channel", {})
        }
    
    async def get_user_stats(self, user_id: str) -> Dict[str, Any]:
        """
        סטטיסטיקות משתמש - Get user notification statistics
        """
        stats = await self.db.get_user_notification_stats(user_id)
        
        return {
            "user_id": user_id,
            "total_notifications": stats.get("total_notifications", 0),
            "unread_notifications": stats.get("unread_notifications", 0),
            "by_category": stats.get("by_category", {}),
            "by_channel": stats.get("by_channel", {}),
            "last_30_days": stats.get("last_30_days", 0),
            "read_rate": stats.get("read_rate", 0),
            "preferred_channels": stats.get("preferred_channels", [])
        }
    
    async def process_scheduled_notifications(self):
        """
        עיבוד התראות מתוכננות - Process scheduled notifications
        Background task to be run periodically
        """
        # Get notifications scheduled for now or earlier
        scheduled_notifications = await self.db.get_scheduled_notifications(
            datetime.utcnow()
        )
        
        for notification_data in scheduled_notifications:
            try:
                # Update status to queued for processing
                await self._update_notification_status(
                    notification_data['id'], NotificationStatus.QUEUED
                )
                
                # Log scheduling
                await self._log_notification_action(
                    notification_data['id'], "notification_scheduled_processed", "system"
                )
                
            except Exception as e:
                await self._log_notification_error(
                    notification_data['user_id'], 
                    notification_data['template_id'],
                    f"Failed to process scheduled notification: {str(e)}",
                    "system"
                )
    
    async def _filter_channels_by_preferences(
        self,
        channels: List[NotificationChannel],
        user_preferences,
        template_category: str
    ) -> List[NotificationChannel]:
        """Filter channels based on user preferences"""
        filtered_channels = []
        
        for channel in channels:
            # Check if channel is enabled
            channel_enabled = True
            
            if channel == NotificationChannel.SMS:
                channel_enabled = user_preferences.preferences.sms_enabled
            elif channel == NotificationChannel.WHATSAPP:
                channel_enabled = user_preferences.preferences.whatsapp_enabled
            elif channel == NotificationChannel.EMAIL:
                channel_enabled = user_preferences.preferences.email_enabled
            elif channel == NotificationChannel.PUSH:
                channel_enabled = user_preferences.preferences.push_enabled
            elif channel == NotificationChannel.IN_APP:
                channel_enabled = user_preferences.preferences.in_app_enabled
            
            # Check category preferences
            category_enabled = True
            if template_category == 'lead':
                category_enabled = user_preferences.preferences.lead_notifications
            elif template_category == 'proposal':
                category_enabled = user_preferences.preferences.proposal_notifications
            elif template_category == 'referral':
                category_enabled = user_preferences.preferences.referral_notifications
            elif template_category == 'payment':
                category_enabled = user_preferences.preferences.payment_notifications
            elif template_category == 'marketing':
                category_enabled = user_preferences.preferences.marketing_notifications
            
            # Check quiet hours for non-urgent notifications
            in_quiet_hours = await self._is_in_quiet_hours(user_preferences)
            
            if channel_enabled and category_enabled and not in_quiet_hours:
                filtered_channels.append(channel)
        
        return filtered_channels
    
    async def _is_in_quiet_hours(self, user_preferences) -> bool:
        """Check if current time is in user's quiet hours"""
        if not user_preferences.preferences.quiet_hours_enabled:
            return False
        
        now = datetime.utcnow()
        current_hour = now.hour
        
        start_hour = user_preferences.preferences.quiet_start_hour
        end_hour = user_preferences.preferences.quiet_end_hour
        
        if start_hour <= end_hour:
            return start_hour <= current_hour <= end_hour
        else:  # Quiet hours span midnight
            return current_hour >= start_hour or current_hour <= end_hour
    
    async def _create_delivery_record(
        self,
        notification_id: str,
        channel: NotificationChannel,
        user_id: str,
        user_preferences
    ):
        """Create delivery record for a channel"""
        # Get recipient address for the channel
        recipient = await self._get_recipient_address(user_id, channel, user_preferences)
        
        if not recipient:
            # Log that recipient address is missing
            await self._log_notification_error(
                user_id, notification_id, 
                f"Missing recipient address for channel {channel.value}",
                "system"
            )
            return
        
        delivery_data = {
            "notification_id": notification_id,
            "channel": channel.value,
            "recipient": recipient,
            "status": "pending",
            "created_at": datetime.utcnow()
        }
        
        await self.db.insert_notification_delivery(delivery_data)
    
    async def _get_recipient_address(
        self,
        user_id: str,
        channel: NotificationChannel,
        user_preferences
    ) -> Optional[str]:
        """Get recipient address for specific channel"""
        if channel == NotificationChannel.SMS or channel == NotificationChannel.WHATSAPP:
            return user_preferences.phone_number
        elif channel == NotificationChannel.EMAIL:
            return user_preferences.email
        elif channel in [NotificationChannel.PUSH, NotificationChannel.IN_APP]:
            return user_id  # Use user_id as identifier for push/in-app
        
        return None
    
    async def _create_preview_text(
        self,
        template,
        variables: Dict[str, Any]
    ) -> str:
        """Create preview text from template"""
        if not template:
            return "תבנית לא זמינה"
        
        preview = template.content_template
        
        # Replace variables with their values
        for key, value in variables.items():
            placeholder = f"{{{key}}}"
            preview = preview.replace(placeholder, str(value))
        
        # Truncate to reasonable length
        if len(preview) > 100:
            preview = preview[:97] + "..."
        
        return preview
    
    async def _update_notification_status(
        self,
        notification_id: str,
        status: NotificationStatus
    ):
        """Update notification status"""
        update_data = {
            "status": status.value
        }
        
        if status == NotificationStatus.SENDING:
            update_data["sent_at"] = datetime.utcnow()
        elif status == NotificationStatus.DELIVERED:
            update_data["delivered_at"] = datetime.utcnow()
        
        await self.db.update_notification(notification_id, update_data)
    
    async def _log_notification_action(
        self,
        notification_id: str,
        action: str,
        performed_by: str
    ):
        """Log notification actions for audit trail"""
        log_data = {
            "notification_id": notification_id,
            "action": action,
            "performed_by": performed_by,
            "timestamp": datetime.utcnow()
        }
        
        await self.db.insert_notification_log(log_data)
    
    async def _log_notification_error(
        self,
        user_id: str,
        template_id: str,
        error_message: str,
        context: str
    ):
        """Log notification errors"""
        error_data = {
            "user_id": user_id,
            "template_id": template_id,
            "error_message": error_message,
            "context": context,
            "timestamp": datetime.utcnow()
        }
        
        await self.db.insert_notification_error(error_data)