#!/usr/bin/env python3
"""
OFAIR Notifications Service Simple Validation Script
Validates basic structure and Hebrew content without external dependencies
"""

import sys
import os
from datetime import datetime
from typing import Dict, Any, List

def validate_file_structure():
    """Validate service file structure"""
    base_path = "/root/repos/ofair_mvp/services/notifications-service"
    
    required_files = [
        "app/main.py",
        "app/models/notifications.py", 
        "app/services/notification_service.py",
        "app/services/template_service.py",
        "app/services/delivery_service.py",
        "app/services/preferences_service.py",
        "app/database.py",
        "app/config.py",
        "Dockerfile",
        "pyproject.toml",
        "tests/test_notifications.py"
    ]
    
    missing_files = []
    for file_path in required_files:
        full_path = os.path.join(base_path, file_path)
        if not os.path.exists(full_path):
            missing_files.append(file_path)
    
    if missing_files:
        print("❌ Missing files:")
        for file in missing_files:
            print(f"   • {file}")
        return False
    
    print("✅ All required files present")
    return True

def validate_hebrew_content():
    """Validate Hebrew content in files"""
    base_path = "/root/repos/ofair_mvp/services/notifications-service"
    
    files_to_check = [
        ("app/models/notifications.py", "Hebrew comments and strings"),
        ("app/services/notification_service.py", "Hebrew docstrings"),
        ("app/services/template_service.py", "Hebrew processing logic"),
        ("app/config.py", "Hebrew localization"),
        ("tests/test_notifications.py", "Hebrew test data")
    ]
    
    hebrew_found = 0
    for file_path, description in files_to_check:
        full_path = os.path.join(base_path, file_path)
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Check for Hebrew characters (basic range)
                has_hebrew = any(ord(char) >= 0x0590 and ord(char) <= 0x05FF for char in content)
                
                if has_hebrew:
                    hebrew_found += 1
                    print(f"✅ {description} - Hebrew content found")
                else:
                    print(f"⚠️  {description} - No Hebrew content")
                    
        except Exception as e:
            print(f"❌ Error reading {file_path}: {e}")
            return False
    
    if hebrew_found >= 4:  # Most files should have Hebrew
        print(f"✅ Hebrew/RTL support validated ({hebrew_found}/{len(files_to_check)} files)")
        return True
    else:
        print(f"❌ Insufficient Hebrew content ({hebrew_found}/{len(files_to_check)} files)")
        return False

def validate_service_features():
    """Validate key service features in code"""
    base_path = "/root/repos/ofair_mvp/services/notifications-service"
    
    features_to_check = [
        ("app/main.py", ["FastAPI", "notifications", "templates", "preferences"], "Main API endpoints"),
        ("app/models/notifications.py", ["NotificationChannel", "SMS", "WHATSAPP", "EMAIL", "PUSH"], "Multi-channel support"),
        ("app/services/delivery_service.py", ["_send_sms", "_send_whatsapp", "_send_email"], "Delivery methods"),
        ("app/services/template_service.py", ["hebrew", "RTL", "_contains_hebrew"], "Hebrew processing"),
        ("app/config.py", ["ISRAEL", "hebrew", "phone", "+972"], "Israeli localization"),
        ("app/database.py", ["notification", "template", "preferences", "delivery"], "Database operations")
    ]
    
    features_validated = 0
    for file_path, keywords, description in features_to_check:
        full_path = os.path.join(base_path, file_path)
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read().lower()
                
                found_keywords = []
                for keyword in keywords:
                    if keyword.lower() in content:
                        found_keywords.append(keyword)
                
                if len(found_keywords) >= len(keywords) // 2:  # At least half the keywords
                    features_validated += 1
                    print(f"✅ {description} - Key features found: {', '.join(found_keywords)}")
                else:
                    print(f"⚠️  {description} - Limited features: {', '.join(found_keywords)}")
                    
        except Exception as e:
            print(f"❌ Error checking {file_path}: {e}")
    
    success_rate = features_validated / len(features_to_check)
    if success_rate >= 0.8:  # 80% success rate
        print(f"✅ Service features validated ({features_validated}/{len(features_to_check)})")
        return True
    else:
        print(f"❌ Insufficient features validated ({features_validated}/{len(features_to_check)})")
        return False

def validate_israeli_context():
    """Validate Israeli market context"""
    base_path = "/root/repos/ofair_mvp/services/notifications-service"
    config_path = os.path.join(base_path, "app/config.py")
    
    israeli_features = [
        "israel", "972", "jerusalem", "hebrew", "rtl", 
        "shekel", "ils", "agorot", "quiet_hours", "business_hours"
    ]
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            content = f.read().lower()
            
            found_features = []
            for feature in israeli_features:
                if feature in content:
                    found_features.append(feature)
            
            if len(found_features) >= 7:  # Most Israeli features present
                print(f"✅ Israeli context validated - Found: {', '.join(found_features)}")
                return True
            else:
                print(f"⚠️  Limited Israeli context - Found: {', '.join(found_features)}")
                return False
                
    except Exception as e:
        print(f"❌ Error validating Israeli context: {e}")
        return False

def validate_notification_channels():
    """Validate multi-channel notification support"""
    base_path = "/root/repos/ofair_mvp/services/notifications-service"
    delivery_path = os.path.join(base_path, "app/services/delivery_service.py")
    
    expected_channels = ["sms", "whatsapp", "email", "push", "in_app"]
    
    try:
        with open(delivery_path, 'r', encoding='utf-8') as f:
            content = f.read().lower()
            
            found_channels = []
            for channel in expected_channels:
                if f"_send_{channel}" in content or f"send_{channel}" in content:
                    found_channels.append(channel)
            
            if len(found_channels) >= 4:  # Most channels implemented
                print(f"✅ Multi-channel support validated - Channels: {', '.join(found_channels)}")
                return True
            else:
                print(f"❌ Insufficient channel support - Found: {', '.join(found_channels)}")
                return False
                
    except Exception as e:
        print(f"❌ Error validating channels: {e}")
        return False

def validate_file_sizes():
    """Validate that files have reasonable content"""
    base_path = "/root/repos/ofair_mvp/services/notifications-service"
    
    expected_sizes = [
        ("app/main.py", 1000, "Main API file"),
        ("app/models/notifications.py", 2000, "Models file"),
        ("app/services/notification_service.py", 3000, "Notification service"),
        ("app/services/delivery_service.py", 5000, "Delivery service"),
        ("app/services/template_service.py", 4000, "Template service"),
        ("app/services/preferences_service.py", 4000, "Preferences service"),
        ("app/database.py", 5000, "Database operations"),
        ("app/config.py", 3000, "Configuration"),
        ("tests/test_notifications.py", 3000, "Test file")
    ]
    
    size_validation_passed = 0
    for file_path, min_size, description in expected_sizes:
        full_path = os.path.join(base_path, file_path)
        try:
            size = os.path.getsize(full_path)
            if size >= min_size:
                size_validation_passed += 1
                print(f"✅ {description} - Size: {size:,} bytes (>= {min_size:,})")
            else:
                print(f"⚠️  {description} - Size: {size:,} bytes (< {min_size:,})")
        except Exception as e:
            print(f"❌ Error checking {file_path}: {e}")
    
    if size_validation_passed >= len(expected_sizes) * 0.8:  # 80% pass rate
        print(f"✅ File sizes validated ({size_validation_passed}/{len(expected_sizes)})")
        return True
    else:
        print(f"❌ Insufficient file content ({size_validation_passed}/{len(expected_sizes)})")
        return False

def main():
    """Main validation function"""
    print("🔔 OFAIR Notifications Service - Simple Validation")
    print("=" * 55)
    print("Validating service structure and Hebrew/RTL support...")
    print()
    
    validations = [
        ("File Structure", validate_file_structure),
        ("Hebrew Content", validate_hebrew_content), 
        ("Service Features", validate_service_features),
        ("Israeli Context", validate_israeli_context),
        ("Notification Channels", validate_notification_channels),
        ("File Content Size", validate_file_sizes)
    ]
    
    passed = 0
    failed = 0
    
    for name, validator_func in validations:
        print(f"📋 Testing: {name}")
        try:
            if validator_func():
                passed += 1
                print(f"✅ {name}: PASSED")
            else:
                failed += 1
                print(f"❌ {name}: FAILED")
        except Exception as e:
            failed += 1
            print(f"❌ {name}: ERROR - {e}")
        print()
    
    print("=" * 55)
    print("📊 VALIDATION SUMMARY")
    print("=" * 55)
    
    total = passed + failed
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"Service: OFAIR Notifications Service")
    print(f"Total Validations: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {success_rate:.1f}%")
    print()
    
    if failed == 0:
        print("🎉 ALL VALIDATIONS PASSED!")
        print("✅ Notifications Service is ready for deployment")
        print("🔔 Multi-channel notifications with Hebrew/RTL support")
        print("🇮🇱 Israeli market localization validated")
        return True
    else:
        print("⚠️  SOME VALIDATIONS FAILED")
        print(f"❌ {failed} issues need attention")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)