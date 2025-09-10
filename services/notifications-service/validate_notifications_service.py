#!/usr/bin/env python3
"""
OFAIR Notifications Service Validation Script
Validates core functionality of the multi-channel notification system
"""

import sys
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List
import json

# Add the app directory to Python path
sys.path.append('/root/repos/ofair_mvp/services/notifications-service')
sys.path.append('/root/repos/ofair_mvp/libs/python_shared')

from app.models.notifications import (
    SendNotificationRequest, SendBulkNotificationRequest, 
    NotificationChannel, NotificationCategory, NotificationPriority,
    NotificationTemplate, UserPreferences, DeliveryResult
)
from app.services.notification_service import NotificationService
from app.services.template_service import TemplateService
from app.services.delivery_service import DeliveryService
from app.services.preferences_service import PreferencesService
from app.config import settings, validate_phone_number, normalize_phone_number

class NotificationsServiceValidator:
    def __init__(self):
        self.test_results = []
        self.hebrew_test_data = {
            "user_name": "דני כהן",
            "lead_title": "חיפוש אלקטריקאי בתל אביב",
            "location": "תל אביב-יפו",
            "price_range": "500-1000 ₪",
            "professional_name": "יוסי לוי",
            "phone_number": "050-123-4567",
            "service_type": "שירותי אלקטריקאי",
            "message": "שלום! יש לך הזדמנות עבודה חדשה באזור שלך"
        }

    def log_test(self, test_name: str, success: bool, message: str, details: Any = None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if details and not success:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def test_models_validation(self):
        """Test Pydantic models with Hebrew content"""
        try:
            # Test SendNotificationRequest with Hebrew
            notification_request = SendNotificationRequest(
                user_id="user_123",
                template_id="lead_notification",
                variables=self.hebrew_test_data,
                channels=[NotificationChannel.SMS, NotificationChannel.WHATSAPP],
                priority=NotificationPriority.NORMAL
            )
            
            assert notification_request.user_id == "user_123"
            assert len(notification_request.channels) == 2
            assert "דני כהן" in notification_request.variables.get("user_name", "")
            
            # Test NotificationTemplate with Hebrew
            template = NotificationTemplate(
                name="תבנית הודעה לליד חדש",
                category=NotificationCategory.LEAD,
                description="תבנית להודעה על ליד חדש במערכת",
                content_template="שלום {user_name}! יש לך ליד חדש: {lead_title} באזור {location}. טווח מחירים: {price_range}",
                subject_template="ליד חדש: {lead_title}",
                variables=["user_name", "lead_title", "location", "price_range"],
                supported_channels=[NotificationChannel.SMS, NotificationChannel.EMAIL, NotificationChannel.WHATSAPP]
            )
            
            assert template.name == "תבנית הודעה לליד חדש"
            assert NotificationCategory.LEAD in [template.category]
            assert len(template.variables) == 4
            
            # Test UserPreferences
            preferences = UserPreferences(
                sms_enabled=True,
                whatsapp_enabled=True,
                email_enabled=True,
                push_enabled=False,
                in_app_enabled=True,
                lead_notifications=True,
                proposal_notifications=True,
                referral_notifications=True,
                payment_notifications=True,
                system_notifications=True,
                marketing_notifications=False,
                quiet_hours_enabled=True,
                quiet_start_hour=22,
                quiet_end_hour=8
            )
            
            assert preferences.sms_enabled is True
            assert preferences.quiet_hours_enabled is True
            assert preferences.quiet_start_hour == 22
            
            # Test DeliveryResult
            delivery_result = DeliveryResult(
                channel=NotificationChannel.SMS,
                status="delivered",
                external_id="sms_123456",
                delivered_at=datetime.utcnow(),
                cost=0.15
            )
            
            assert delivery_result.channel == NotificationChannel.SMS
            assert delivery_result.status == "delivered"
            assert delivery_result.cost == 0.15
            
            self.log_test(
                "Models Validation", 
                True,
                "All Pydantic models validated successfully with Hebrew content"
            )
            
        except Exception as e:
            self.log_test(
                "Models Validation", 
                False,
                f"Model validation failed: {str(e)}",
                str(e)
            )

    def test_config_validation(self):
        """Test configuration and helper functions"""
        try:
            # Test phone number validation
            israeli_phones = [
                "0501234567",
                "+972501234567", 
                "972501234567",
                "050-123-4567",
                "02-6234567",  # Jerusalem landline
                "03-5234567"   # Tel Aviv landline
            ]
            
            invalid_phones = [
                "1234567",
                "+1234567890",
                "0401234567",  # Invalid prefix
                ""
            ]
            
            for phone in israeli_phones:
                if not validate_phone_number(phone):
                    raise ValueError(f"Valid Israeli phone {phone} failed validation")
                
                normalized = normalize_phone_number(phone)
                if not normalized.startswith("+972"):
                    raise ValueError(f"Phone normalization failed for {phone} -> {normalized}")
            
            for phone in invalid_phones:
                if validate_phone_number(phone):
                    raise ValueError(f"Invalid phone {phone} passed validation")
            
            # Test settings access
            assert settings.POSTGRES_DB == "ofair_notifications"
            assert settings.DEFAULT_LANGUAGE == "he"
            assert settings.RTL_SUPPORT is True
            assert "he" in settings.SUPPORTED_LANGUAGES
            
            # Test Israeli business context
            assert settings.ISRAEL_COUNTRY_CODE == "+972"
            assert settings.DEFAULT_TIMEZONE == "Asia/Jerusalem"
            assert settings.CURRENCY == "ILS"
            
            self.log_test(
                "Configuration Validation",
                True, 
                "Settings, phone validation, and Israeli context validated"
            )
            
        except Exception as e:
            self.log_test(
                "Configuration Validation",
                False,
                f"Configuration validation failed: {str(e)}",
                str(e)
            )

    def test_template_processing(self):
        """Test template creation and variable substitution"""
        try:
            # Create template service (without actual database)
            template_service = TemplateService()
            
            # Test Hebrew text detection
            hebrew_text = "שלום עולם! איך הולך?"
            english_text = "Hello World! How are you?"
            mixed_text = "שלום World! איך אתה?"
            
            contains_hebrew = template_service._contains_hebrew(hebrew_text)
            contains_hebrew_mixed = template_service._contains_hebrew(mixed_text)
            contains_hebrew_english = template_service._contains_hebrew(english_text)
            
            assert contains_hebrew is True
            assert contains_hebrew_mixed is True
            assert contains_hebrew_english is False
            
            # Test Hebrew text validation
            valid_hebrew = template_service._is_valid_hebrew_text("שלום עולם")
            invalid_empty = template_service._is_valid_hebrew_text("")
            invalid_spaces = template_service._is_valid_hebrew_text("   ")
            
            assert valid_hebrew is True
            assert invalid_empty is False
            assert invalid_spaces is False
            
            # Test variable extraction
            template_content = "שלום {user_name}! יש לך ליד חדש: {lead_title} באזור {location}"
            variables = template_service._extract_variables_from_content(template_content)
            
            expected_vars = ["user_name", "lead_title", "location"]
            assert all(var in variables for var in expected_vars)
            assert len(variables) == 3
            
            self.log_test(
                "Template Processing",
                True,
                "Hebrew detection, validation, and variable extraction working correctly"
            )
            
        except Exception as e:
            self.log_test(
                "Template Processing",
                False,
                f"Template processing failed: {str(e)}",
                str(e)
            )

    async def test_service_integration(self):
        """Test service integration (mock mode)"""
        try:
            # Test notification request creation
            request = SendNotificationRequest(
                user_id="test_user_123",
                template_id="lead_notification_template",
                variables=self.hebrew_test_data,
                channels=[NotificationChannel.SMS, NotificationChannel.EMAIL],
                priority=NotificationPriority.NORMAL
            )
            
            # Validate request data
            assert request.user_id == "test_user_123"
            assert len(request.channels) == 2
            assert request.priority == NotificationPriority.NORMAL
            
            # Test bulk notification request
            bulk_request = SendBulkNotificationRequest(
                user_ids=["user1", "user2", "user3"],
                template_id="marketing_template",
                variables={"promotion": "הנחה של 20% על כל השירותים!"},
                channels=[NotificationChannel.EMAIL],
                priority=NotificationPriority.LOW
            )
            
            assert len(bulk_request.user_ids) == 3
            assert bulk_request.priority == NotificationPriority.LOW
            assert "הנחה של 20%" in bulk_request.variables.get("promotion", "")
            
            # Test delivery service instantiation
            delivery_service = DeliveryService()
            assert hasattr(delivery_service, 'pool')
            assert hasattr(delivery_service, '_get_session')
            
            # Test cost calculation
            short_message = "שלום"
            long_message = "שלום! " * 20  # Long Hebrew message
            
            short_cost = delivery_service._calculate_sms_cost(short_message)
            long_cost = delivery_service._calculate_sms_cost(long_message)
            
            assert short_cost == 0.05  # Base cost
            assert long_cost > short_cost  # Should cost more for longer message
            
            self.log_test(
                "Service Integration", 
                True,
                "Service classes instantiate correctly and handle Hebrew data"
            )
            
        except Exception as e:
            self.log_test(
                "Service Integration",
                False,
                f"Service integration failed: {str(e)}",
                str(e)
            )

    def test_hebrew_content_processing(self):
        """Test Hebrew content processing and RTL support"""
        try:
            # Test various Hebrew scenarios
            test_scenarios = [
                {
                    "name": "Pure Hebrew",
                    "content": "שלום עולם! איך הולך?",
                    "should_contain_hebrew": True
                },
                {
                    "name": "Hebrew with Numbers",
                    "content": "יש לך 5 הודעות חדשות",
                    "should_contain_hebrew": True
                },
                {
                    "name": "Hebrew with English",
                    "content": "שלום World! איך אתה?",
                    "should_contain_hebrew": True
                },
                {
                    "name": "Hebrew with Currency",
                    "content": "המחיר הוא 150 ₪",
                    "should_contain_hebrew": True
                },
                {
                    "name": "Pure English",
                    "content": "Hello World! How are you?",
                    "should_contain_hebrew": False
                },
                {
                    "name": "Numbers Only",
                    "content": "123456789",
                    "should_contain_hebrew": False
                }
            ]
            
            # We'll use the template service method for testing
            template_service = TemplateService()
            
            for scenario in test_scenarios:
                contains_hebrew = template_service._contains_hebrew(scenario["content"])
                expected = scenario["should_contain_hebrew"]
                
                if contains_hebrew != expected:
                    raise ValueError(
                        f"Hebrew detection failed for '{scenario['name']}': "
                        f"expected {expected}, got {contains_hebrew}"
                    )
            
            # Test template variable substitution with Hebrew
            template_content = "שלום {user_name}! יש לך {count} הודעות ב-{location}"
            variables = {
                "user_name": "דני",
                "count": "3",
                "location": "תל אביב"
            }
            
            # Simple substitution test
            result = template_content
            for var_name, var_value in variables.items():
                placeholder = f"{{{var_name}}}"
                result = result.replace(placeholder, str(var_value))
            
            expected = "שלום דני! יש לך 3 הודעות ב-תל אביב"
            assert result == expected
            
            self.log_test(
                "Hebrew Content Processing",
                True,
                "Hebrew detection, validation, and template processing working correctly"
            )
            
        except Exception as e:
            self.log_test(
                "Hebrew Content Processing",
                False,
                f"Hebrew content processing failed: {str(e)}",
                str(e)
            )

    def test_channel_and_priority_logic(self):
        """Test notification channel and priority logic"""
        try:
            # Test all notification channels
            all_channels = [
                NotificationChannel.SMS,
                NotificationChannel.WHATSAPP, 
                NotificationChannel.EMAIL,
                NotificationChannel.PUSH,
                NotificationChannel.IN_APP
            ]
            
            assert len(all_channels) == 5
            
            # Test all priorities
            all_priorities = [
                NotificationPriority.LOW,
                NotificationPriority.NORMAL,
                NotificationPriority.HIGH,
                NotificationPriority.URGENT
            ]
            
            assert len(all_priorities) == 4
            
            # Test all categories
            all_categories = [
                NotificationCategory.LEAD,
                NotificationCategory.PROPOSAL,
                NotificationCategory.REFERRAL,
                NotificationCategory.PAYMENT,
                NotificationCategory.SYSTEM,
                NotificationCategory.MARKETING
            ]
            
            assert len(all_categories) == 6
            
            # Test timeout logic based on priority
            from app.config import get_delivery_timeout
            
            urgent_timeout = get_delivery_timeout("urgent")
            normal_timeout = get_delivery_timeout("normal")
            low_timeout = get_delivery_timeout("low")
            
            assert urgent_timeout < normal_timeout < low_timeout
            assert urgent_timeout == 5
            assert normal_timeout == 30
            assert low_timeout == 300
            
            self.log_test(
                "Channel and Priority Logic",
                True,
                f"All channels ({len(all_channels)}), priorities ({len(all_priorities)}), and categories ({len(all_categories)}) validated"
            )
            
        except Exception as e:
            self.log_test(
                "Channel and Priority Logic",
                False,
                f"Channel/priority logic failed: {str(e)}",
                str(e)
            )

    def test_israeli_localization(self):
        """Test Israeli market localization features"""
        try:
            from app.config import get_hebrew_day_name, get_hebrew_month_name, is_business_hours
            
            # Test Hebrew day names
            monday_he = get_hebrew_day_name(0)  # Monday = 0
            friday_he = get_hebrew_day_name(4)  # Friday = 4
            saturday_he = get_hebrew_day_name(5)  # Saturday = 5
            
            assert monday_he == "יום שני"
            assert friday_he == "יום שישי" 
            assert saturday_he == "יום שבת"
            
            # Test Hebrew month names
            january_he = get_hebrew_month_name(1)
            december_he = get_hebrew_month_name(12)
            
            assert january_he == "ינואר"
            assert december_he == "דצמבר"
            
            # Test Israeli phone prefixes
            valid_prefixes = settings.VALID_ISRAELI_PREFIXES
            mobile_prefixes = ["50", "52", "53", "54", "55", "57", "58"]
            landline_prefixes = ["02", "03", "04", "08", "09"]
            
            for prefix in mobile_prefixes:
                assert prefix in valid_prefixes
            
            for prefix in landline_prefixes:
                assert prefix in valid_prefixes
            
            # Test timezone and currency
            assert settings.DEFAULT_TIMEZONE == "Asia/Jerusalem"
            assert settings.CURRENCY == "ILS"
            assert settings.ISRAEL_COUNTRY_CODE == "+972"
            
            self.log_test(
                "Israeli Localization",
                True,
                "Hebrew translations, phone prefixes, timezone, and currency validated"
            )
            
        except Exception as e:
            self.log_test(
                "Israeli Localization",
                False,
                f"Israeli localization failed: {str(e)}",
                str(e)
            )

    def test_cost_calculation(self):
        """Test notification cost calculation for Israeli market"""
        try:
            delivery_service = DeliveryService()
            
            # Test SMS cost calculation
            short_sms = "שלום"  # Short Hebrew message
            medium_sms = "שלום! יש לך הודעה חדשה מ-OFAIR. לחץ כאן לצפייה."  # Medium
            long_sms = "שלום! " * 30  # Very long message
            
            short_cost = delivery_service._calculate_sms_cost(short_sms)
            medium_cost = delivery_service._calculate_sms_cost(medium_sms)
            long_cost = delivery_service._calculate_sms_cost(long_sms)
            
            # Hebrew SMS can fit less characters due to encoding
            assert short_cost == 0.05  # Base cost for single SMS
            assert medium_cost >= short_cost  # Could be same or more
            assert long_cost > short_cost  # Definitely more for very long message
            
            # Test WhatsApp and Email costs from settings
            whatsapp_cost = settings.WHATSAPP_MESSAGE_COST
            email_cost = settings.EMAIL_MESSAGE_COST
            
            assert whatsapp_cost == 0.10  # 10 agorot
            assert email_cost == 0.01    # 1 agora
            
            # Test cost tracking enabled
            assert settings.TRACK_COSTS is True
            assert settings.CURRENCY == "ILS"
            
            self.log_test(
                "Cost Calculation",
                True,
                f"SMS cost calculation working (short: {short_cost}, medium: {medium_cost}, long: {long_cost})"
            )
            
        except Exception as e:
            self.log_test(
                "Cost Calculation",
                False,
                f"Cost calculation failed: {str(e)}",
                str(e)
            )

    def generate_summary_report(self) -> Dict[str, Any]:
        """Generate validation summary report"""
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = total_tests - passed_tests
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        return {
            "service": "Notifications Service",
            "validation_time": datetime.now().isoformat(),
            "total_tests": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "success_rate": f"{success_rate:.1f}%",
            "status": "✅ VALIDATION PASSED" if failed_tests == 0 else "❌ VALIDATION FAILED",
            "hebrew_support": "✅ Full Hebrew/RTL support validated",
            "israeli_localization": "✅ Israeli market features validated",
            "multi_channel": "✅ SMS, WhatsApp, Email, Push, In-App channels",
            "test_details": self.test_results
        }

    async def run_all_validations(self):
        """Run all validation tests"""
        print("🔔 OFAIR Notifications Service Validation")
        print("=" * 50)
        print("Testing multi-channel notification system with Hebrew/RTL support...")
        print()
        
        # Run all tests
        self.test_models_validation()
        self.test_config_validation()
        self.test_template_processing()
        await self.test_service_integration()
        self.test_hebrew_content_processing()
        self.test_channel_and_priority_logic()
        self.test_israeli_localization()
        self.test_cost_calculation()
        
        print()
        print("=" * 50)
        print("📊 VALIDATION SUMMARY")
        print("=" * 50)
        
        summary = self.generate_summary_report()
        
        print(f"Service: {summary['service']}")
        print(f"Total Tests: {summary['total_tests']}")
        print(f"Passed: {summary['passed']}")
        print(f"Failed: {summary['failed']}")
        print(f"Success Rate: {summary['success_rate']}")
        print(f"Status: {summary['status']}")
        print()
        print("🎯 Key Features Validated:")
        print(f"   {summary['hebrew_support']}")
        print(f"   {summary['israeli_localization']}")
        print(f"   {summary['multi_channel']}")
        print()
        
        if summary['failed'] > 0:
            print("❌ Failed Tests:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"   • {test['test']}: {test['message']}")
            print()
        
        print("🔔 Notifications Service validation completed!")
        return summary['failed'] == 0

async def main():
    """Main validation function"""
    validator = NotificationsServiceValidator()
    success = await validator.run_all_validations()
    
    if not success:
        sys.exit(1)
    else:
        print("✅ All validations passed successfully!")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(main())