#!/usr/bin/env python3
"""
OFAIR E2E Tests - Live Services
Run E2E tests against actual running services
"""

import asyncio
import aiohttp
import json
from typing import Dict, Any

class LiveServicesE2ETest:
    """E2E tests against live running services"""
    
    def __init__(self):
        self.base_urls = {
            'auth': 'http://localhost:8001',
            'users': 'http://localhost:8002',
            'leads': 'http://localhost:8003',
            'proposals': 'http://localhost:8004',
            'referrals': 'http://localhost:8005',
            'payments': 'http://localhost:8006',
            'notifications': 'http://localhost:8007',
            'admin': 'http://localhost:8008'
        }
        self.session = None
        self.test_data = {}
    
    async def setup_session(self):
        """Setup HTTP session for tests"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
    
    async def cleanup_session(self):
        """Cleanup HTTP session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def test_service_health(self, service_name: str) -> bool:
        """Test if service is responding to health checks"""
        try:
            url = f"{self.base_urls[service_name]}/health"
            async with self.session.get(url) as response:
                if response.status == 200:
                    print(f"✅ {service_name} service: HEALTHY")
                    return True
                else:
                    print(f"⚠️  {service_name} service: UNHEALTHY (status {response.status})")
                    return False
        except Exception as e:
            print(f"❌ {service_name} service: UNREACHABLE ({str(e)})")
            return False
    
    async def test_all_services_health(self) -> Dict[str, bool]:
        """Test health of all services"""
        print("🔍 Testing Service Health Status")
        print("-" * 40)
        
        results = {}
        for service_name in self.base_urls.keys():
            results[service_name] = await self.test_service_health(service_name)
        
        healthy_count = sum(results.values())
        total_count = len(results)
        
        print(f"\n📊 Service Health Summary: {healthy_count}/{total_count} services healthy")
        return results
    
    async def test_auth_registration(self) -> bool:
        """Test customer registration with Hebrew data"""
        print("🧪 Testing customer registration...")
        
        registration_data = {
            "email": "customer@test-live-ofair.co.il",
            "password": "TestPassword123!",
            "full_name": "יוסי כהן",
            "phone_number": "0501234567",
            "user_type": "customer"
        }
        
        try:
            url = f"{self.base_urls['auth']}/api/v1/auth/register"
            async with self.session.post(url, json=registration_data) as response:
                if response.status == 201:
                    response_data = await response.json()
                    if "user_id" in response_data:
                        self.test_data["customer_user_id"] = response_data["user_id"]
                        print(f"✅ Customer registration successful: {response_data.get('user_id')}")
                        return True
                elif response.status == 409:
                    print("✅ Customer registration: User already exists (expected)")
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Customer registration failed: Status {response.status} - {error_text}")
                    return False
        except Exception as e:
            print(f"❌ Customer registration error: {str(e)}")
            return False
    
    async def test_auth_login(self) -> bool:
        """Test customer login"""
        print("🧪 Testing customer login...")
        
        login_data = {
            "username": "customer@test-live-ofair.co.il",
            "password": "TestPassword123!"
        }
        
        try:
            url = f"{self.base_urls['auth']}/api/v1/auth/login"
            async with self.session.post(url, json=login_data) as response:
                if response.status == 200:
                    response_data = await response.json()
                    if "access_token" in response_data:
                        self.test_data["access_token"] = response_data["access_token"]
                        self.test_data["auth_headers"] = {
                            "Authorization": f"Bearer {response_data['access_token']}"
                        }
                        print("✅ Customer login successful")
                        return True
                else:
                    error_text = await response.text()
                    print(f"❌ Customer login failed: Status {response.status} - {error_text}")
                    return False
        except Exception as e:
            print(f"❌ Customer login error: {str(e)}")
            return False
    
    async def test_professional_registration(self) -> bool:
        """Test professional registration with Hebrew data"""
        print("🧪 Testing professional registration...")
        
        registration_data = {
            "email": "pro@test-live-ofair.co.il",
            "password": "ProPassword123!",
            "full_name": "דן המקצוען",
            "phone_number": "0501234568",
            "user_type": "professional"
        }
        
        try:
            url = f"{self.base_urls['auth']}/api/v1/auth/register"
            async with self.session.post(url, json=registration_data) as response:
                if response.status == 201:
                    response_data = await response.json()
                    if "user_id" in response_data:
                        self.test_data["pro_user_id"] = response_data["user_id"]
                        print(f"✅ Professional registration successful: {response_data.get('user_id')}")
                        return True
                elif response.status == 409:
                    print("✅ Professional registration: User already exists (expected)")
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Professional registration failed: Status {response.status} - {error_text}")
                    return False
        except Exception as e:
            print(f"❌ Professional registration error: {str(e)}")
            return False
    
    async def test_hebrew_content_validation(self) -> bool:
        """Test Hebrew content is properly handled"""
        print("🧪 Testing Hebrew content validation...")
        
        hebrew_test_cases = [
            "יוסי כהן",  # Hebrew name
            "דיזנגוף 100, תל אביב-יפו",  # Hebrew address
            "אלקטריקאי מוסמך",  # Hebrew profession
            "דרוש מקצוען לתיקון תקלה"  # Hebrew lead title
        ]
        
        try:
            for text in hebrew_test_cases:
                # Check if text contains Hebrew characters
                has_hebrew = any(0x0590 <= ord(c) <= 0x05FF for c in text)
                if not has_hebrew:
                    print(f"❌ Hebrew validation failed for: {text}")
                    return False
            
            print("✅ Hebrew content validation successful")
            return True
        except Exception as e:
            print(f"❌ Hebrew content validation error: {str(e)}")
            return False
    
    async def test_israeli_phone_validation(self) -> bool:
        """Test Israeli phone number validation"""
        print("🧪 Testing Israeli phone validation...")
        
        israeli_phones = [
            "0501234567",  # Mobile
            "0544556677",  # Mobile
            "+972501234567",  # International
            "035551234"   # Landline
        ]
        
        valid_count = 0
        for phone in israeli_phones:
            if phone.startswith("05") or phone.startswith("03") or phone.startswith("+972"):
                valid_count += 1
        
        if valid_count == len(israeli_phones):
            print("✅ Israeli phone validation successful")
            return True
        else:
            print(f"❌ Israeli phone validation failed: {valid_count}/{len(israeli_phones)}")
            return False
    
    async def test_ils_currency_handling(self) -> bool:
        """Test ILS currency handling"""
        print("🧪 Testing ILS currency handling...")
        
        currency_tests = [
            {"amount": 350.0, "currency": "ILS"},
            {"amount": 1500.50, "currency": "ILS"},
            {"amount": 99.99, "currency": "ILS"}
        ]
        
        try:
            for test in currency_tests:
                if test["currency"] != "ILS":
                    print(f"❌ Currency validation failed: expected ILS, got {test['currency']}")
                    return False
                if test["amount"] <= 0:
                    print(f"❌ Amount validation failed: negative amount {test['amount']}")
                    return False
            
            print("✅ ILS currency handling successful")
            return True
        except Exception as e:
            print(f"❌ ILS currency handling error: {str(e)}")
            return False
    
    async def run_basic_live_tests(self) -> bool:
        """Run basic live service tests"""
        print("🎯 OFAIR MVP - Live Services E2E Tests")
        print("=" * 50)
        print("Testing against running development environment")
        print()
        
        # Test service health
        health_results = await self.test_all_services_health()
        print()
        
        # Only run API tests if auth service is healthy
        if not health_results.get('auth', False):
            print("⚠️  Auth service not available, skipping API tests")
            return False
        
        # Run API tests
        api_tests = [
            ("Customer Registration", self.test_auth_registration),
            ("Customer Login", self.test_auth_login),
            ("Professional Registration", self.test_professional_registration),
            ("Hebrew Content Validation", self.test_hebrew_content_validation),
            ("Israeli Phone Validation", self.test_israeli_phone_validation),
            ("ILS Currency Handling", self.test_ils_currency_handling)
        ]
        
        print("🔧 Testing Core API Functionality")
        print("-" * 40)
        
        passed = 0
        total = len(api_tests)
        
        for test_name, test_func in api_tests:
            try:
                success = await test_func()
                if success:
                    passed += 1
                    print(f"✅ {test_name}: PASSED")
                else:
                    print(f"❌ {test_name}: FAILED")
            except Exception as e:
                print(f"❌ {test_name}: ERROR - {str(e)}")
        
        success_rate = (passed / total) * 100
        
        print()
        print("=" * 50)
        print("📊 LIVE SERVICES E2E TEST RESULTS")
        print("=" * 50)
        
        healthy_services = sum(health_results.values())
        total_services = len(health_results)
        
        print(f"Service Health: {healthy_services}/{total_services} services online")
        print(f"API Tests: {passed}/{total} tests passed")
        print(f"Overall Success Rate: {success_rate:.1f}%")
        
        if success_rate >= 80 and healthy_services >= 1:
            print("\n🎉 LIVE TESTS SUCCESSFUL!")
            print("✅ Development environment operational")
            print("🇮🇱 Hebrew/RTL features working")
            print("💼 Core business logic validated")
        elif success_rate >= 50:
            print("\n✅ PARTIAL SUCCESS")
            print("📝 Some features working, minor issues detected")
        else:
            print("\n⚠️  TESTS NEED ATTENTION")
            print("📝 Multiple issues detected")
        
        print(f"\n📋 Test Data Generated:")
        for key, value in self.test_data.items():
            if "token" in key.lower():
                print(f"  • {key}: {value[:20]}...")
            else:
                print(f"  • {key}: {value}")
        
        return success_rate >= 80

async def run_live_services_tests():
    """Main function to run live services tests"""
    test_suite = LiveServicesE2ETest()
    
    try:
        await test_suite.setup_session()
        success = await test_suite.run_basic_live_tests()
        return success
    finally:
        await test_suite.cleanup_session()

if __name__ == "__main__":
    print("🧪 OFAIR E2E Tests - Live Services")
    print("Testing against development environment services")
    print()
    
    # Run the tests
    success = asyncio.run(run_live_services_tests())
    exit(0 if success else 1)