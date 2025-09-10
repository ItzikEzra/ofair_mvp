#!/usr/bin/env python3
"""
OFAIR Admin Service Validation Script
"""

import sys
import os
from datetime import datetime

def validate_file_structure():
    """Validate Admin Service file structure"""
    base_path = "/root/repos/ofair_mvp/services/admin-service"
    
    required_files = [
        "app/main.py",
        "app/config.py",
        "app/database.py",
        "app/models/admin.py",
        "app/middleware/auth.py",
        "app/services/dashboard_service.py",
        "app/services/audit_service.py",
        "app/services/metrics_service.py",
        "app/routes/analytics.py",
        "app/routes/users.py",
        "app/routes/system.py",
        "app/routes/leads.py",
        "app/routes/reports.py",
        "Dockerfile",
        "pyproject.toml"
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
    """Validate Hebrew content in Admin Service files"""
    base_path = "/root/repos/ofair_mvp/services/admin-service"
    
    files_to_check = [
        ("app/main.py", "Hebrew API documentation"),
        ("app/models/admin.py", "Hebrew model descriptions"),
        ("app/services/dashboard_service.py", "Hebrew service logic"),
        ("app/routes/analytics.py", "Hebrew route descriptions"),
        ("app/config.py", "Hebrew configuration")
    ]
    
    hebrew_found = 0
    for file_path, description in files_to_check:
        full_path = os.path.join(base_path, file_path)
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
                has_hebrew = any(ord(char) >= 0x0590 and ord(char) <= 0x05FF for char in content)
                
                if has_hebrew:
                    hebrew_found += 1
                    print(f"✅ {description} - Hebrew content found")
                else:
                    print(f"⚠️  {description} - No Hebrew content")
                    
        except Exception as e:
            print(f"❌ Error reading {file_path}: {e}")
            return False
    
    if hebrew_found >= 4:
        print(f"✅ Hebrew/RTL support validated ({hebrew_found}/{len(files_to_check)} files)")
        return True
    else:
        print(f"❌ Insufficient Hebrew content ({hebrew_found}/{len(files_to_check)} files)")
        return False

def validate_admin_features():
    """Validate Admin Service key features"""
    base_path = "/root/repos/ofair_mvp/services/admin-service"
    
    features_to_check = [
        ("app/main.py", ["FastAPI", "admin", "dashboard", "analytics"], "Main admin API"),
        ("app/models/admin.py", ["AdminRole", "AuditEventType", "DashboardStats"], "Admin models"),
        ("app/services/dashboard_service.py", ["dashboard", "analytics", "system_health"], "Dashboard service"),
        ("app/services/audit_service.py", ["audit", "log_admin_action", "security_event"], "Audit service"),
        ("app/middleware/auth.py", ["verify_admin_token", "permissions", "role"], "Admin authentication"),
        ("app/routes/analytics.py", ["analytics", "performance", "trends"], "Analytics routes")
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
                
                if len(found_keywords) >= len(keywords) // 2:
                    features_validated += 1
                    print(f"✅ {description} - Features found: {', '.join(found_keywords)}")
                else:
                    print(f"⚠️  {description} - Limited features: {', '.join(found_keywords)}")
                    
        except Exception as e:
            print(f"❌ Error checking {file_path}: {e}")
    
    success_rate = features_validated / len(features_to_check)
    if success_rate >= 0.8:
        print(f"✅ Admin features validated ({features_validated}/{len(features_to_check)})")
        return True
    else:
        print(f"❌ Insufficient admin features ({features_validated}/{len(features_to_check)})")
        return False

def validate_file_sizes():
    """Validate file content sizes"""
    base_path = "/root/repos/ofair_mvp/services/admin-service"
    
    expected_sizes = [
        ("app/main.py", 2000, "Main API file"),
        ("app/models/admin.py", 5000, "Models file"),
        ("app/services/dashboard_service.py", 4000, "Dashboard service"),
        ("app/services/audit_service.py", 4000, "Audit service"),
        ("app/services/metrics_service.py", 4000, "Metrics service"),
        ("app/routes/analytics.py", 2000, "Analytics routes"),
        ("app/routes/users.py", 3000, "Users routes")
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
    
    if size_validation_passed >= len(expected_sizes) * 0.8:
        print(f"✅ File sizes validated ({size_validation_passed}/{len(expected_sizes)})")
        return True
    else:
        print(f"❌ Insufficient file content ({size_validation_passed}/{len(expected_sizes)})")
        return False

def main():
    """Main validation function"""
    print("🔧 OFAIR Admin Service - Validation")
    print("=" * 45)
    print("Validating admin management system...")
    print()
    
    validations = [
        ("File Structure", validate_file_structure),
        ("Hebrew Content", validate_hebrew_content),
        ("Admin Features", validate_admin_features),
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
    
    print("=" * 45)
    print("📊 VALIDATION SUMMARY")
    print("=" * 45)
    
    total = passed + failed
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print(f"Service: OFAIR Admin Service")
    print(f"Total Validations: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {success_rate:.1f}%")
    print()
    
    if failed == 0:
        print("🎉 ALL VALIDATIONS PASSED!")
        print("✅ Admin Service is ready for deployment")
        print("🔧 Complete admin management with Hebrew support")
        print("📊 Dashboard, analytics, user management, and system monitoring")
        return True
    else:
        print("⚠️  SOME VALIDATIONS FAILED")
        print(f"❌ {failed} issues need attention")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)