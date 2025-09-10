import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
import json

from fastapi.testclient import TestClient
from app.main import app
from app.models.notifications import (
    SendNotificationRequest, SendBulkNotificationRequest,
    NotificationChannel, NotificationCategory, NotificationPriority,
    UserPreferences, NotificationTemplate
)
from app.services.notification_service import NotificationService
from app.services.template_service import TemplateService
from app.services.delivery_service import DeliveryService
from app.services.preferences_service import PreferencesService

client = TestClient(app)

class TestNotificationEndpoints:
    """Test notification API endpoints"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert "status" in response.json()
    
    def test_send_notification_success(self):
        """Test sending a notification successfully"""
        with patch('app.services.notification_service.NotificationService') as mock_service:
            mock_service.return_value.send_notification = AsyncMock(
                return_value={
                    "notification_id": "test-123",
                    "status": "pending",
                    "scheduled_for": datetime.utcnow().isoformat(),
                    "channels": ["sms", "email"]
                }
            )
            
            request_data = {
                "user_id": "user123",
                "template_id": "welcome_template", 
                "variables": {"user_name": "שרה"},
                "channels": ["sms", "email"],
                "priority": "normal"
            }
            
            response = client.post(
                "/api/v1/notifications/send",
                json=request_data,
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "notification_id" in data
            assert data["status"] == "pending"
    
    def test_send_notification_hebrew_variables(self):
        """Test sending notification with Hebrew variables"""
        with patch('app.services.notification_service.NotificationService') as mock_service:
            mock_service.return_value.send_notification = AsyncMock(
                return_value={
                    "notification_id": "hebrew-test-123",
                    "status": "pending",
                    "scheduled_for": datetime.utcnow().isoformat(),
                    "channels": ["whatsapp"]
                }
            )
            
            request_data = {
                "user_id": "user456",
                "template_id": "lead_notification",
                "variables": {
                    "lead_title": "חיפוש אלקטריקאי בתל אביב",
                    "location": "תל אביב-יפו",
                    "price_range": "500-1000 ₪"
                },
                "channels": ["whatsapp"],
                "priority": "urgent"
            }
            
            response = client.post(
                "/api/v1/notifications/send",
                json=request_data,
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "notification_id" in data
    
    def test_send_bulk_notification(self):
        """Test sending bulk notifications"""
        with patch('app.services.notification_service.NotificationService') as mock_service:
            mock_service.return_value.send_bulk_notification = AsyncMock(
                return_value={
                    "batch_id": "bulk-123",
                    "total_notifications": 3,
                    "successful": 3,
                    "failed": 0,
                    "details": []
                }
            )
            
            request_data = {
                "user_ids": ["user1", "user2", "user3"],
                "template_id": "marketing_template",
                "variables": {"promotion": "הנחה של 20%"},
                "channels": ["email"],
                "priority": "low"
            }
            
            response = client.post(
                "/api/v1/notifications/send-bulk",
                json=request_data,
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "batch_id" in data
            assert data["total_notifications"] == 3
    
    def test_get_user_notifications(self):
        """Test getting user notifications"""
        with patch('app.services.notification_service.NotificationService') as mock_service:
            mock_service.return_value.get_user_notifications = AsyncMock(
                return_value={
                    "notifications": [
                        {
                            "id": "notif-1",
                            "template_id": "welcome",
                            "status": "delivered",
                            "created_at": datetime.utcnow().isoformat(),
                            "channels": ["email"]
                        }
                    ],
                    "total": 1,
                    "page": 1,
                    "pages": 1
                }
            )
            
            response = client.get(
                "/api/v1/notifications/user/user123",
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "notifications" in data
            assert len(data["notifications"]) == 1

class TestNotificationService:
    """Test notification service logic"""
    
    @pytest.fixture
    def notification_service(self):
        """Create notification service instance"""
        with patch('app.services.notification_service.get_database') as mock_db:
            mock_db.return_value = Mock()
            return NotificationService()
    
    @pytest.mark.asyncio
    async def test_send_notification_with_preferences(self, notification_service):
        """Test sending notification respects user preferences"""
        mock_prefs_service = AsyncMock()
        mock_prefs_service.check_user_can_receive_notification.return_value = True
        mock_prefs_service.get_user_delivery_address.return_value = "+972501234567"
        
        with patch.object(notification_service, 'preferences_service', mock_prefs_service):
            with patch.object(notification_service.db, 'insert_notification') as mock_insert:
                mock_insert.return_value = "test-notification-id"
                
                request = SendNotificationRequest(
                    user_id="user123",
                    template_id="test_template",
                    variables={"name": "יוסי"},
                    channels=[NotificationChannel.SMS],
                    priority=NotificationPriority.NORMAL
                )
                
                result = await notification_service.send_notification(request, "system")
                
                assert result["notification_id"] == "test-notification-id"
                assert result["status"] == "pending"
                mock_prefs_service.check_user_can_receive_notification.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_notification_blocked_by_preferences(self, notification_service):
        """Test notification blocked by user preferences"""
        mock_prefs_service = AsyncMock()
        mock_prefs_service.check_user_can_receive_notification.return_value = False
        
        with patch.object(notification_service, 'preferences_service', mock_prefs_service):
            request = SendNotificationRequest(
                user_id="user123",
                template_id="test_template", 
                variables={"name": "יוסי"},
                channels=[NotificationChannel.SMS],
                priority=NotificationPriority.NORMAL
            )
            
            with pytest.raises(ValueError, match="משתמש לא מאושר לקבלת התראות"):
                await notification_service.send_notification(request, "system")
    
    @pytest.mark.asyncio
    async def test_schedule_notification(self, notification_service):
        """Test scheduling a future notification"""
        future_time = datetime.utcnow() + timedelta(hours=2)
        
        with patch.object(notification_service.db, 'insert_notification') as mock_insert:
            mock_insert.return_value = "scheduled-123"
            
            request = SendNotificationRequest(
                user_id="user123",
                template_id="reminder_template",
                variables={"task": "פגישה עם לקוח"},
                channels=[NotificationChannel.EMAIL],
                priority=NotificationPriority.NORMAL,
                scheduled_at=future_time
            )
            
            result = await notification_service.send_notification(request, "system")
            
            assert result["notification_id"] == "scheduled-123"
            assert result["status"] == "scheduled"

class TestTemplateService:
    """Test template service functionality"""
    
    @pytest.fixture
    def template_service(self):
        """Create template service instance"""
        with patch('app.services.template_service.get_database') as mock_db:
            mock_db.return_value = Mock()
            return TemplateService()
    
    @pytest.mark.asyncio
    async def test_create_template_hebrew(self, template_service):
        """Test creating template with Hebrew content"""
        template = NotificationTemplate(
            name="בדיקת תבנית עברית",
            category=NotificationCategory.SYSTEM,
            description="תבנית לבדיקת תמיכה בעברית",
            content_template="שלום {user_name}, יש לך הודעה חדשה מ-OFAIR",
            variables=["user_name"],
            supported_channels=[NotificationChannel.SMS, NotificationChannel.WHATSAPP]
        )
        
        with patch.object(template_service.db, 'insert_template') as mock_insert:
            mock_insert.return_value = "template-123"
            
            result = await template_service.create_template(template, "admin")
            
            assert result.name == "בדיקת תבנית עברית"
            assert "user_name" in result.variables
    
    @pytest.mark.asyncio
    async def test_preview_template_with_variables(self, template_service):
        """Test template preview with variable substitution"""
        mock_template = NotificationTemplate(
            id="test-template",
            name="Test Template",
            category=NotificationCategory.LEAD,
            description="Test",
            content_template="שלום {user_name}, יש לך ליד חדש: {lead_title} באזור {location}",
            subject_template="ליד חדש: {lead_title}",
            variables=["user_name", "lead_title", "location"],
            supported_channels=[NotificationChannel.EMAIL]
        )
        
        with patch.object(template_service, 'get_template') as mock_get:
            mock_get.return_value = mock_template
            
            variables = {
                "user_name": "דני",
                "lead_title": "תיקון מזגן",
                "location": "רמת גן"
            }
            
            result = await template_service.preview_template("test-template", variables)
            
            assert "דני" in result["content"]
            assert "תיקון מזגן" in result["content"] 
            assert "רמת גן" in result["content"]
            assert result["subject"] == "ליד חדש: תיקון מזגן"

class TestDeliveryService:
    """Test notification delivery functionality"""
    
    @pytest.fixture
    def delivery_service(self):
        """Create delivery service instance"""
        with patch('app.services.delivery_service.get_database') as mock_db:
            mock_db.return_value = Mock()
            return DeliveryService()
    
    @pytest.mark.asyncio
    async def test_send_sms_delivery(self, delivery_service):
        """Test SMS delivery"""
        delivery_data = {
            "id": "delivery-123",
            "channel": "sms",
            "recipient": "+972501234567"
        }
        
        notification_data = {
            "id": "notif-123",
            "template_id": "sms_template",
            "variables": {"message": "זו הודעת בדיקה"}
        }
        
        with patch.object(delivery_service, '_render_message') as mock_render:
            mock_render.return_value = {"content": "זו הודעת בדיקה"}
            
            with patch.object(delivery_service, '_get_session') as mock_session:
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json.return_value = {"message_id": "sms_123"}
                
                mock_session.return_value.post.return_value.__aenter__.return_value = mock_response
                
                result = await delivery_service._send_sms(delivery_data, notification_data)
                
                assert result.status == "delivered"
                assert result.external_id == "sms_123"
    
    @pytest.mark.asyncio
    async def test_send_whatsapp_delivery(self, delivery_service):
        """Test WhatsApp delivery"""
        delivery_data = {
            "id": "delivery-456",
            "channel": "whatsapp", 
            "recipient": "+972501234567"
        }
        
        notification_data = {
            "id": "notif-456",
            "template_id": "wa_template",
            "variables": {"message": "הודעת WhatsApp בעברית"}
        }
        
        with patch.object(delivery_service, '_render_message') as mock_render:
            mock_render.return_value = {"content": "הודעת WhatsApp בעברית"}
            
            with patch.object(delivery_service, '_get_session') as mock_session:
                mock_response = AsyncMock()
                mock_response.status = 200
                mock_response.json.return_value = {"messages": [{"id": "wa_123"}]}
                
                mock_session.return_value.post.return_value.__aenter__.return_value = mock_response
                
                result = await delivery_service._send_whatsapp(delivery_data, notification_data)
                
                assert result.status == "delivered"
                assert result.external_id == "wa_123"

class TestPreferencesService:
    """Test user preferences functionality"""
    
    @pytest.fixture
    def preferences_service(self):
        """Create preferences service instance"""
        with patch('app.services.preferences_service.get_database') as mock_db:
            mock_db.return_value = Mock()
            return PreferencesService()
    
    @pytest.mark.asyncio
    async def test_create_default_preferences(self, preferences_service):
        """Test creating default user preferences"""
        with patch.object(preferences_service.db, 'get_user_preferences') as mock_get:
            mock_get.return_value = None
            
            with patch.object(preferences_service.db, 'insert_user_preferences') as mock_insert:
                with patch.object(preferences_service, '_get_user_contact_info') as mock_contact:
                    mock_contact.return_value = {
                        "phone_number": "+972501234567",
                        "email": "test@example.com"
                    }
                    
                    result = await preferences_service.get_user_preferences("user123")
                    
                    assert result.user_id == "user123"
                    assert result.preferences.sms_enabled is True
                    assert result.preferences.email_enabled is True
                    assert result.preferences.system_notifications is True
    
    @pytest.mark.asyncio
    async def test_check_quiet_hours(self, preferences_service):
        """Test quiet hours checking"""
        mock_prefs = Mock()
        mock_prefs.preferences.quiet_hours_enabled = True
        mock_prefs.preferences.quiet_start_hour = 22
        mock_prefs.preferences.quiet_end_hour = 8
        
        with patch.object(preferences_service, 'get_user_preferences') as mock_get:
            mock_get.return_value = mock_prefs
            
            # Test during quiet hours (assuming current time is 23:00)
            with patch('app.services.preferences_service.datetime') as mock_datetime:
                mock_now = Mock()
                mock_now.hour = 23
                mock_datetime.utcnow.return_value = mock_now
                
                result = await preferences_service.check_user_can_receive_notification(
                    "user123", NotificationChannel.SMS, "marketing", is_urgent=False
                )
                
                assert result is False  # Should be blocked during quiet hours
    
    @pytest.mark.asyncio
    async def test_urgent_overrides_quiet_hours(self, preferences_service):
        """Test urgent notifications override quiet hours"""
        mock_prefs = Mock()
        mock_prefs.preferences.sms_enabled = True
        mock_prefs.preferences.system_notifications = True
        mock_prefs.preferences.quiet_hours_enabled = True
        mock_prefs.preferences.quiet_start_hour = 22
        mock_prefs.preferences.quiet_end_hour = 8
        
        with patch.object(preferences_service, 'get_user_preferences') as mock_get:
            mock_get.return_value = mock_prefs
            
            with patch('app.services.preferences_service.datetime') as mock_datetime:
                mock_now = Mock()
                mock_now.hour = 23
                mock_datetime.utcnow.return_value = mock_now
                
                result = await preferences_service.check_user_can_receive_notification(
                    "user123", NotificationChannel.SMS, "system", is_urgent=True
                )
                
                assert result is True  # Should allow urgent notifications

class TestHebrewTextProcessing:
    """Test Hebrew text processing and validation"""
    
    def test_hebrew_text_validation(self):
        """Test Hebrew text validation functions"""
        from app.services.template_service import TemplateService
        
        template_service = TemplateService()
        
        # Test Hebrew text detection
        assert template_service._contains_hebrew("שלום עולם") is True
        assert template_service._contains_hebrew("Hello World") is False
        assert template_service._contains_hebrew("שלום World") is True
        
        # Test Hebrew text validation
        assert template_service._is_valid_hebrew_text("שלום עולם") is True
        assert template_service._is_valid_hebrew_text("") is False
        assert template_service._is_valid_hebrew_text("   ") is False
    
    def test_phone_number_normalization(self):
        """Test Israeli phone number normalization"""
        from app.config import normalize_phone_number, validate_phone_number
        
        # Test various phone formats
        assert normalize_phone_number("0501234567") == "+972501234567"
        assert normalize_phone_number("972501234567") == "+972501234567"
        assert normalize_phone_number("+972501234567") == "+972501234567"
        assert normalize_phone_number("050-123-4567") == "+972501234567"
        
        # Test validation
        assert validate_phone_number("+972501234567") is True
        assert validate_phone_number("0501234567") is True
        assert validate_phone_number("0221234567") is True  # Jerusalem landline
        assert validate_phone_number("1234567") is False
        assert validate_phone_number("+1234567890") is False

class TestWebhookHandling:
    """Test webhook processing for delivery confirmations"""
    
    @pytest.fixture
    def delivery_service(self):
        """Create delivery service instance"""
        with patch('app.services.delivery_service.get_database') as mock_db:
            mock_db.return_value = Mock()
            return DeliveryService()
    
    @pytest.mark.asyncio
    async def test_sms_webhook_processing(self, delivery_service):
        """Test SMS delivery webhook processing"""
        webhook_data = {
            "message_id": "sms_123",
            "status": "delivered",
            "timestamp": "2023-11-01T10:00:00Z"
        }
        
        mock_delivery = {"id": "delivery-123"}
        
        with patch.object(delivery_service.db, 'get_delivery_by_external_id') as mock_get:
            mock_get.return_value = mock_delivery
            
            with patch.object(delivery_service.db, 'update_notification_delivery') as mock_update:
                await delivery_service._process_sms_webhook(webhook_data)
                
                mock_update.assert_called_once()
                update_args = mock_update.call_args[1]
                assert update_args["status"] == "delivered"
    
    @pytest.mark.asyncio  
    async def test_whatsapp_webhook_processing(self, delivery_service):
        """Test WhatsApp delivery webhook processing"""
        webhook_data = {
            "entry": [{
                "changes": [{
                    "field": "messages",
                    "value": {
                        "statuses": [{
                            "id": "wa_123",
                            "status": "delivered"
                        }]
                    }
                }]
            }]
        }
        
        mock_delivery = {"id": "delivery-456"}
        
        with patch.object(delivery_service.db, 'get_delivery_by_external_id') as mock_get:
            mock_get.return_value = mock_delivery
            
            with patch.object(delivery_service.db, 'update_notification_delivery') as mock_update:
                await delivery_service._process_whatsapp_webhook(webhook_data)
                
                mock_update.assert_called_once()

class TestBulkOperations:
    """Test bulk notification operations"""
    
    @pytest.mark.asyncio
    async def test_bulk_notification_success(self):
        """Test successful bulk notification sending"""
        with patch('app.services.notification_service.NotificationService') as mock_service:
            mock_instance = mock_service.return_value
            mock_instance.send_bulk_notification = AsyncMock(
                return_value={
                    "batch_id": "bulk-test-123", 
                    "total_notifications": 100,
                    "successful": 95,
                    "failed": 5,
                    "details": []
                }
            )
            
            request_data = {
                "user_ids": [f"user{i}" for i in range(100)],
                "template_id": "bulk_template",
                "variables": {"message": "הודעה המונית"},
                "channels": ["email"],
                "priority": "low"
            }
            
            response = client.post(
                "/api/v1/notifications/send-bulk",
                json=request_data,
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["successful"] == 95
            assert data["failed"] == 5

@pytest.mark.integration
class TestNotificationIntegration:
    """Integration tests for full notification flow"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_notification_flow(self):
        """Test complete notification flow from send to delivery"""
        # This would test the full flow in a real environment
        # For now, we'll test the major components together
        
        with patch('app.database.get_database') as mock_db_factory:
            mock_db = Mock()
            mock_db_factory.return_value = mock_db
            
            # Mock database responses
            mock_db.insert_notification.return_value = "test-notif-123"
            mock_db.get_notification.return_value = {
                "id": "test-notif-123",
                "user_id": "user123",
                "template_id": "welcome",
                "status": "pending",
                "channels": json.dumps(["email"]),
                "variables": json.dumps({"user_name": "משה"})
            }
            
            from app.services.notification_service import NotificationService
            
            service = NotificationService()
            
            request = SendNotificationRequest(
                user_id="user123",
                template_id="welcome_template",
                variables={"user_name": "משה"},
                channels=[NotificationChannel.EMAIL],
                priority=NotificationPriority.NORMAL
            )
            
            # This would normally process through the full pipeline
            result = await service.send_notification(request, "system")
            assert "notification_id" in result

if __name__ == "__main__":
    pytest.main([__file__, "-v"])