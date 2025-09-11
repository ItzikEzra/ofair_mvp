from typing import Optional, Dict, Any
from datetime import datetime
import json

from models.notifications import (
    UserPreferences, UserPreferencesResponse, NotificationChannel
)
from database import get_database

class PreferencesService:
    def __init__(self):
        self.db = get_database()
    
    async def get_user_preferences(self, user_id: str) -> UserPreferencesResponse:
        """
        קבלת העדפות משתמש - Get user notification preferences
        """
        # Get preferences from database
        prefs_data = await self.db.get_user_preferences(user_id)
        
        if not prefs_data:
            # Create default preferences for new user
            default_preferences = UserPreferences()
            await self.create_user_preferences(user_id, default_preferences)
            
            # Get user contact info from users service
            user_info = await self._get_user_contact_info(user_id)
            
            return UserPreferencesResponse(
                user_id=user_id,
                phone_number=user_info.get("phone_number"),
                email=user_info.get("email"),
                preferences=default_preferences,
                last_updated=datetime.utcnow()
            )
        
        # Parse preferences from JSON
        preferences_dict = prefs_data["preferences"]
        preferences = UserPreferences(**preferences_dict)
        
        # Get fresh user contact info
        user_info = await self._get_user_contact_info(user_id)
        
        return UserPreferencesResponse(
            user_id=user_id,
            phone_number=user_info.get("phone_number"),
            email=user_info.get("email"),
            preferences=preferences,
            last_updated=prefs_data["last_updated"]
        )
    
    async def create_user_preferences(
        self,
        user_id: str,
        preferences: UserPreferences
    ):
        """
        יצירת העדפות משתמש - Create user preferences
        """
        prefs_data = {
            "user_id": user_id,
            "preferences": preferences.model_dump(),
            "last_updated": datetime.utcnow()
        }
        
        await self.db.insert_user_preferences(prefs_data)
    
    async def update_user_preferences(
        self,
        user_id: str,
        preferences: UserPreferences
    ):
        """
        עדכון העדפות משתמש - Update user preferences
        """
        # Validate preferences
        await self._validate_preferences(user_id, preferences)
        
        update_data = {
            "preferences": preferences.model_dump(),
            "last_updated": datetime.utcnow()
        }
        
        await self.db.update_user_preferences(user_id, update_data)
        
        # Log preferences change
        await self._log_preferences_change(user_id, preferences)
    
    async def get_user_channel_preferences(
        self,
        user_id: str
    ) -> Dict[NotificationChannel, bool]:
        """
        קבלת העדפות ערוצים - Get user's channel preferences
        """
        prefs = await self.get_user_preferences(user_id)
        
        return {
            NotificationChannel.SMS: prefs.preferences.sms_enabled,
            NotificationChannel.WHATSAPP: prefs.preferences.whatsapp_enabled,
            NotificationChannel.EMAIL: prefs.preferences.email_enabled,
            NotificationChannel.PUSH: prefs.preferences.push_enabled,
            NotificationChannel.IN_APP: prefs.preferences.in_app_enabled
        }
    
    async def get_user_category_preferences(
        self,
        user_id: str
    ) -> Dict[str, bool]:
        """
        קבלת העדפות קטגוריות - Get user's category preferences
        """
        prefs = await self.get_user_preferences(user_id)
        
        return {
            "lead": prefs.preferences.lead_notifications,
            "proposal": prefs.preferences.proposal_notifications,
            "referral": prefs.preferences.referral_notifications,
            "payment": prefs.preferences.payment_notifications,
            "system": prefs.preferences.system_notifications,
            "marketing": prefs.preferences.marketing_notifications
        }
    
    async def update_channel_preference(
        self,
        user_id: str,
        channel: NotificationChannel,
        enabled: bool
    ):
        """
        עדכון העדפת ערוץ יחיד - Update single channel preference
        """
        current_prefs = await self.get_user_preferences(user_id)
        
        # Update specific channel
        if channel == NotificationChannel.SMS:
            current_prefs.preferences.sms_enabled = enabled
        elif channel == NotificationChannel.WHATSAPP:
            current_prefs.preferences.whatsapp_enabled = enabled
        elif channel == NotificationChannel.EMAIL:
            current_prefs.preferences.email_enabled = enabled
        elif channel == NotificationChannel.PUSH:
            current_prefs.preferences.push_enabled = enabled
        elif channel == NotificationChannel.IN_APP:
            current_prefs.preferences.in_app_enabled = enabled
        
        await self.update_user_preferences(user_id, current_prefs.preferences)
    
    async def update_category_preference(
        self,
        user_id: str,
        category: str,
        enabled: bool
    ):
        """
        עדכון העדפת קטגוריה יחידה - Update single category preference
        """
        current_prefs = await self.get_user_preferences(user_id)
        
        # Update specific category
        if category == "lead":
            current_prefs.preferences.lead_notifications = enabled
        elif category == "proposal":
            current_prefs.preferences.proposal_notifications = enabled
        elif category == "referral":
            current_prefs.preferences.referral_notifications = enabled
        elif category == "payment":
            current_prefs.preferences.payment_notifications = enabled
        elif category == "system":
            current_prefs.preferences.system_notifications = enabled
        elif category == "marketing":
            current_prefs.preferences.marketing_notifications = enabled
        
        await self.update_user_preferences(user_id, current_prefs.preferences)
    
    async def set_quiet_hours(
        self,
        user_id: str,
        enabled: bool,
        start_hour: Optional[int] = None,
        end_hour: Optional[int] = None
    ):
        """
        הגדרת שעות שקט - Set quiet hours
        """
        current_prefs = await self.get_user_preferences(user_id)
        
        current_prefs.preferences.quiet_hours_enabled = enabled
        
        if enabled and start_hour is not None and end_hour is not None:
            # Validate hours
            if not (0 <= start_hour <= 23 and 0 <= end_hour <= 23):
                raise ValueError("שעות חייבות להיות בין 0-23")
            
            current_prefs.preferences.quiet_start_hour = start_hour
            current_prefs.preferences.quiet_end_hour = end_hour
        
        await self.update_user_preferences(user_id, current_prefs.preferences)
    
    async def check_user_can_receive_notification(
        self,
        user_id: str,
        channel: NotificationChannel,
        category: str,
        is_urgent: bool = False
    ) -> bool:
        """
        בדיקה אם משתמש יכול לקבל התראה - Check if user can receive notification
        """
        prefs = await self.get_user_preferences(user_id)
        
        # Check channel preference
        channel_enabled = False
        if channel == NotificationChannel.SMS:
            channel_enabled = prefs.preferences.sms_enabled
        elif channel == NotificationChannel.WHATSAPP:
            channel_enabled = prefs.preferences.whatsapp_enabled
        elif channel == NotificationChannel.EMAIL:
            channel_enabled = prefs.preferences.email_enabled
        elif channel == NotificationChannel.PUSH:
            channel_enabled = prefs.preferences.push_enabled
        elif channel == NotificationChannel.IN_APP:
            channel_enabled = prefs.preferences.in_app_enabled
        
        if not channel_enabled:
            return False
        
        # Check category preference
        category_enabled = True
        if category == "lead":
            category_enabled = prefs.preferences.lead_notifications
        elif category == "proposal":
            category_enabled = prefs.preferences.proposal_notifications
        elif category == "referral":
            category_enabled = prefs.preferences.referral_notifications
        elif category == "payment":
            category_enabled = prefs.preferences.payment_notifications
        elif category == "system":
            category_enabled = prefs.preferences.system_notifications
        elif category == "marketing":
            category_enabled = prefs.preferences.marketing_notifications
        
        if not category_enabled:
            return False
        
        # Check quiet hours (unless urgent)
        if not is_urgent and prefs.preferences.quiet_hours_enabled:
            current_hour = datetime.utcnow().hour
            start_hour = prefs.preferences.quiet_start_hour
            end_hour = prefs.preferences.quiet_end_hour
            
            if start_hour <= end_hour:
                # Normal hours (e.g., 22:00 to 8:00 next day)
                if start_hour <= current_hour <= end_hour:
                    return False
            else:
                # Hours spanning midnight (e.g., 22:00 to 8:00)
                if current_hour >= start_hour or current_hour <= end_hour:
                    return False
        
        return True
    
    async def get_user_delivery_address(
        self,
        user_id: str,
        channel: NotificationChannel
    ) -> Optional[str]:
        """
        קבלת כתובת משלוח לערוץ - Get delivery address for channel
        """
        prefs = await self.get_user_preferences(user_id)
        
        if channel in [NotificationChannel.SMS, NotificationChannel.WHATSAPP]:
            return prefs.phone_number
        elif channel == NotificationChannel.EMAIL:
            return prefs.email
        elif channel in [NotificationChannel.PUSH, NotificationChannel.IN_APP]:
            return user_id  # Use user ID as identifier
        
        return None
    
    async def get_preferences_summary(self, user_id: str) -> Dict[str, Any]:
        """
        סיכום העדפות משתמש - Get user preferences summary
        """
        prefs = await self.get_user_preferences(user_id)
        
        # Count enabled channels
        enabled_channels = []
        if prefs.preferences.sms_enabled:
            enabled_channels.append("SMS")
        if prefs.preferences.whatsapp_enabled:
            enabled_channels.append("WhatsApp")
        if prefs.preferences.email_enabled:
            enabled_channels.append("אימייל")
        if prefs.preferences.push_enabled:
            enabled_channels.append("Push")
        if prefs.preferences.in_app_enabled:
            enabled_channels.append("באפליקציה")
        
        # Count enabled categories
        enabled_categories = []
        if prefs.preferences.lead_notifications:
            enabled_categories.append("ליידים")
        if prefs.preferences.proposal_notifications:
            enabled_categories.append("הצעות")
        if prefs.preferences.referral_notifications:
            enabled_categories.append("הפניות")
        if prefs.preferences.payment_notifications:
            enabled_categories.append("תשלומים")
        if prefs.preferences.system_notifications:
            enabled_categories.append("מערכת")
        if prefs.preferences.marketing_notifications:
            enabled_categories.append("שיווק")
        
        return {
            "user_id": user_id,
            "enabled_channels": enabled_channels,
            "enabled_categories": enabled_categories,
            "quiet_hours_enabled": prefs.preferences.quiet_hours_enabled,
            "quiet_hours": f"{prefs.preferences.quiet_start_hour:02d}:00 - {prefs.preferences.quiet_end_hour:02d}:00" if prefs.preferences.quiet_hours_enabled else None,
            "contact_info": {
                "phone": prefs.phone_number,
                "email": prefs.email
            },
            "last_updated": prefs.last_updated
        }
    
    async def bulk_update_category_preferences(
        self,
        user_ids: list[str],
        category: str,
        enabled: bool
    ) -> Dict[str, Any]:
        """
        עדכון נפחי של העדפות קטגוריה - Bulk update category preferences
        """
        successful_updates = []
        failed_updates = []
        
        for user_id in user_ids:
            try:
                await self.update_category_preference(user_id, category, enabled)
                successful_updates.append(user_id)
            except Exception as e:
                failed_updates.append({"user_id": user_id, "error": str(e)})
        
        return {
            "successful_updates": len(successful_updates),
            "failed_updates": len(failed_updates),
            "details": {
                "successful": successful_updates,
                "failed": failed_updates
            }
        }
    
    async def _validate_preferences(
        self,
        user_id: str,
        preferences: UserPreferences
    ):
        """Validate user preferences"""
        # Check if user exists
        user_info = await self._get_user_contact_info(user_id)
        if not user_info:
            raise ValueError("משתמש לא נמצא")
        
        # Validate quiet hours
        if preferences.quiet_hours_enabled:
            if not (0 <= preferences.quiet_start_hour <= 23):
                raise ValueError("שעת התחלה של שעות השקט חייבת להיות בין 0-23")
            if not (0 <= preferences.quiet_end_hour <= 23):
                raise ValueError("שעת סיום של שעות השקט חייבת להיות בין 0-23")
        
        # Ensure at least one channel is enabled
        channels_enabled = any([
            preferences.sms_enabled,
            preferences.whatsapp_enabled,
            preferences.email_enabled,
            preferences.push_enabled,
            preferences.in_app_enabled
        ])
        
        if not channels_enabled:
            raise ValueError("חובה לאפשר לפחות ערוץ התראה אחד")
        
        # Ensure system notifications are always enabled
        if not preferences.system_notifications:
            preferences.system_notifications = True
    
    async def _get_user_contact_info(self, user_id: str) -> Dict[str, Any]:
        """Get user contact information from users service"""
        # This would normally call the users service API
        # For now, return mock data or database query
        user_data = await self.db.get_user_contact_info(user_id)
        
        return {
            "phone_number": user_data.get("phone_number") if user_data else None,
            "email": user_data.get("email") if user_data else None
        }
    
    async def _log_preferences_change(
        self,
        user_id: str,
        new_preferences: UserPreferences
    ):
        """Log preferences changes for audit"""
        log_data = {
            "user_id": user_id,
            "action": "preferences_updated",
            "new_preferences": new_preferences.model_dump(),
            "timestamp": datetime.utcnow()
        }
        
        await self.db.insert_preferences_log(log_data)
    
    async def export_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """
        יצוא העדפות משתמש - Export user preferences (for GDPR compliance)
        """
        prefs = await self.get_user_preferences(user_id)
        
        return {
            "user_id": user_id,
            "export_date": datetime.utcnow().isoformat(),
            "preferences": prefs.model_dump(),
            "summary": await self.get_preferences_summary(user_id)
        }
    
    async def delete_user_preferences(self, user_id: str):
        """
        מחיקת העדפות משתמש - Delete user preferences (for GDPR compliance)
        """
        # Archive preferences before deletion
        prefs = await self.get_user_preferences(user_id)
        
        archive_data = {
            "user_id": user_id,
            "preferences_data": prefs.model_dump(),
            "deleted_at": datetime.utcnow()
        }
        
        await self.db.insert_preferences_archive(archive_data)
        
        # Delete current preferences
        await self.db.delete_user_preferences(user_id)
    
    async def get_users_with_channel_enabled(
        self,
        channel: NotificationChannel
    ) -> list[str]:
        """
        קבלת רשימת משתמשים עם ערוץ מופעל - Get users with channel enabled
        """
        return await self.db.get_users_with_channel_enabled(channel.value)