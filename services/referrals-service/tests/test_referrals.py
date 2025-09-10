import pytest
import asyncio
from decimal import Decimal
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from app.main import app
from app.models.referrals import (
    CreateReferralRequest, ReferralStatus, CommissionStatus,
    CommissionCalculationRequest, ProcessPaymentRequest, PaymentMethod
)
from app.services.referral_service import ReferralService
from app.services.commission_service import CommissionService
from app.utils.commission_calculator import CommissionCalculator
from app.utils.hebrew_utils import validate_hebrew_content

client = TestClient(app)

# Mock JWT token for testing
TEST_JWT_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJwaG9uZV9udW1iZXIiOiIwNTQ4ODg4ODg4IiwiaXNfcHJvZmVzc2lvbmFsIjp0cnVlLCJyb2xlIjoidXNlciIsImlzX3ZlcmlmaWVkIjp0cnVlLCJleHAiOjk5OTk5OTk5OTl9"

@pytest.fixture
def auth_headers():
    return {"Authorization": f"Bearer {TEST_JWT_TOKEN}"}

@pytest.fixture
def mock_database():
    """Mock database for testing"""
    with patch('app.database.get_database') as mock_db:
        db_instance = MagicMock()
        
        # Mock referral data
        sample_referral = {
            "id": "ref-123",
            "referrer_id": "user-referrer",
            "referred_user_id": "user-referred",
            "lead_id": "lead-123",
            "proposal_id": "prop-123",
            "status": "active",
            "commission_rate": Decimal('0.08'),
            "total_commission_amount": Decimal('400.00'),
            "referrer_commission": Decimal('320.00'),
            "platform_commission": Decimal('80.00'),
            "context": {"description": "שיפוץ מטבח מלא"},
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
            "completed_at": None
        }
        
        # Configure mock methods
        db_instance.get_referral = AsyncMock(return_value=sample_referral)
        db_instance.insert_referral = AsyncMock()
        db_instance.update_referral = AsyncMock()
        db_instance.get_user_referrals = AsyncMock(return_value=[sample_referral])
        db_instance.get_user_basic_info = AsyncMock(return_value={
            "id": "user-123",
            "name": "יוסי כהן",
            "is_active": True
        })
        
        # Mock lead and proposal data
        db_instance.get_lead = AsyncMock(return_value={
            "id": "lead-123",
            "category": "renovation",
            "estimated_value": 5000
        })
        
        db_instance.get_proposal = AsyncMock(return_value={
            "id": "prop-123",
            "professional_id": "user-referred",
            "status": "accepted",
            "quoted_price": 5000
        })
        
        db_instance.get_referral_by_proposal = AsyncMock(return_value=None)
        
        mock_db.return_value = db_instance
        yield db_instance

class TestReferralCreation:
    """בדיקות יצירת הפניות"""
    
    @pytest.mark.asyncio
    async def test_create_referral_success(self, auth_headers, mock_database):
        """בדיקת יצירת הפניה מוצלחת"""
        request_data = {
            "lead_id": "lead-123",
            "proposal_id": "prop-123",
            "commission_rate": 0.08,
            "context": {
                "description": "הפניה למטבח חדש עם חומרים איכותיים"
            }
        }
        
        with patch('app.middleware.auth.verify_jwt_token') as mock_auth:
            mock_auth.return_value = {
                "user_id": "user-referrer",
                "role": "user",
                "is_verified": True
            }
            
            response = client.post(
                "/referrals", 
                json=request_data, 
                headers=auth_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["referrer_id"] == "user-referrer"
        assert data["lead_id"] == "lead-123"
        assert data["proposal_id"] == "prop-123"
        assert data["status"] == "pending"
        assert "commission_rate" in data
    
    @pytest.mark.asyncio
    async def test_create_referral_invalid_commission_rate(self, auth_headers):
        """בדיקת יצירת הפניה עם אחוז עמלה לא חוקי"""
        request_data = {
            "lead_id": "lead-123",
            "proposal_id": "prop-123",
            "commission_rate": 1.5,  # Invalid rate > 1
            "context": {"description": "הפניה בלתי חוקית"}
        }
        
        response = client.post("/referrals", json=request_data, headers=auth_headers)
        
        assert response.status_code == 422  # Validation error

class TestCommissionCalculation:
    """בדיקות חישוב עמלות"""
    
    @pytest.mark.asyncio
    async def test_commission_calculator_single_level(self):
        """בדיקת חישוב עמלה רמה אחת"""
        calculator = CommissionCalculator()
        
        breakdown = await calculator.calculate_commission_breakdown(
            lead_value=Decimal('5000'),
            commission_rate=Decimal('0.08'),
            category='renovation',
            referrer_level='gold',
            chain_length=1
        )
        
        assert len(breakdown) == 2  # Referrer + Platform
        
        # Find referrer commission
        referrer_comm = next(b for b in breakdown if b.recipient_type == "referrer")
        assert referrer_comm.amount > Decimal('0')
        assert referrer_comm.level == 0
        
        # Find platform commission
        platform_comm = next(b for b in breakdown if b.recipient_type == "platform")
        assert platform_comm.amount > Decimal('0')
    
    @pytest.mark.asyncio
    async def test_commission_calculator_multi_level(self):
        """בדיקת חישוב עמלה רב-רמתי"""
        calculator = CommissionCalculator()
        
        breakdown = await calculator.calculate_commission_breakdown(
            lead_value=Decimal('10000'),
            commission_rate=Decimal('0.10'),
            category='renovation',
            referrer_level='premium',
            chain_length=3
        )
        
        assert len(breakdown) >= 3  # Multiple referrer levels + platform
        
        # Check level distribution
        levels = [b.level for b in breakdown if b.recipient_type == "referrer"]
        assert 0 in levels  # Direct referrer
        assert 1 in levels  # Second level
        assert 2 in levels  # Third level
    
    @pytest.mark.asyncio
    async def test_seasonal_adjustments(self):
        """בדיקת התאמות עונתיות"""
        calculator = CommissionCalculator()
        
        base_commission = Decimal('1000')
        
        # Test renovation in April (peak season)
        april_commission = calculator.calculate_seasonal_adjustments(
            base_commission, 'renovation', 4
        )
        assert april_commission > base_commission  # Should be boosted
        
        # Test cleaning before Passover (March)
        march_cleaning = calculator.calculate_seasonal_adjustments(
            base_commission, 'cleaning', 3
        )
        assert march_cleaning > base_commission  # Passover boost

class TestReferralService:
    """בדיקות שירות הפניות"""
    
    @pytest.mark.asyncio
    async def test_referral_chain_building(self, mock_database):
        """בדיקת בניית שרשרת הפניות"""
        service = ReferralService()
        
        # Mock chain data
        mock_database.get_referral_by_referred_user.side_effect = [
            {"id": "ref-parent", "referrer_id": "parent-referrer"},
            None  # End of chain
        ]
        
        chain = await service.get_referral_chain("ref-123")
        
        assert chain.root_referral_id == "ref-123"
        assert chain.total_chain_length >= 1
        assert len(chain.nodes) >= 1
    
    @pytest.mark.asyncio
    async def test_referral_status_validation(self):
        """בדיקת אימות מעבר סטטוס"""
        service = ReferralService()
        
        # Valid transitions
        assert service._is_valid_status_transition(
            ReferralStatus.PENDING, ReferralStatus.ACTIVE
        )
        assert service._is_valid_status_transition(
            ReferralStatus.ACTIVE, ReferralStatus.COMPLETED
        )
        
        # Invalid transitions
        assert not service._is_valid_status_transition(
            ReferralStatus.COMPLETED, ReferralStatus.PENDING
        )
        assert not service._is_valid_status_transition(
            ReferralStatus.CANCELLED, ReferralStatus.ACTIVE
        )

class TestHebrewValidation:
    """בדיקות אימות עברית"""
    
    def test_hebrew_content_validation_valid(self):
        """בדיקת אימות תוכן עברי תקין"""
        hebrew_text = "שיפוץ מטבח מלא עם התקנת ארונות חדשים"
        assert validate_hebrew_content(hebrew_text, min_hebrew_ratio=0.3)
    
    def test_hebrew_content_validation_mixed(self):
        """בדיקת אימות תוכן מעורב"""
        mixed_text = "שיפוץ kitchen renovation מטבח"
        assert validate_hebrew_content(mixed_text, min_hebrew_ratio=0.3)
    
    def test_hebrew_content_validation_insufficient(self):
        """בדיקת אימות תוכן עם מעט עברית"""
        english_text = "Kitchen renovation with some שיפוץ"
        assert not validate_hebrew_content(english_text, min_hebrew_ratio=0.5)
    
    def test_hebrew_content_validation_empty(self):
        """בדיקת אימות תוכן ריק"""
        assert not validate_hebrew_content("")
        assert not validate_hebrew_content("   ")
        assert not validate_hebrew_content(None)

class TestCommissionPaymentFlow:
    """בדיקות זרימת תשלום עמלות"""
    
    @pytest.mark.asyncio
    async def test_payment_processing_success(self, auth_headers, mock_database):
        """בדיקת עיבוד תשלום מוצלח"""
        # Mock commission data
        mock_database.get_commission.return_value = {
            "id": "comm-123",
            "referral_id": "ref-123",
            "recipient_id": "user-referrer",
            "amount": Decimal('400.00'),
            "status": "approved"
        }
        
        mock_database.get_payment_by_transaction.return_value = None
        
        request_data = {
            "payment_method": "bank_transfer",
            "transaction_id": "txn-123456",
            "notes": "תשלום עמלה חודש מרץ"
        }
        
        with patch('app.middleware.auth.verify_jwt_token') as mock_auth:
            mock_auth.return_value = {
                "user_id": "admin-user",
                "role": "admin"
            }
            
            response = client.post(
                "/commissions/comm-123/process",
                json=request_data,
                headers=auth_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["commission_id"] == "comm-123"
        assert data["transaction_id"] == "txn-123456"
        assert data["status"] == "completed"
    
    @pytest.mark.asyncio
    async def test_payment_processing_duplicate_transaction(self, auth_headers, mock_database):
        """בדיקת עיבוד תשלום עם מזהה עסקה כפול"""
        mock_database.get_commission.return_value = {
            "id": "comm-123",
            "amount": Decimal('400.00'),
            "status": "approved"
        }
        
        # Mock existing transaction
        mock_database.get_payment_by_transaction.return_value = {
            "transaction_id": "txn-existing"
        }
        
        request_data = {
            "payment_method": "bank_transfer",
            "transaction_id": "txn-existing"
        }
        
        with patch('app.middleware.auth.verify_jwt_token') as mock_auth:
            mock_auth.return_value = {"role": "admin"}
            
            response = client.post(
                "/commissions/comm-123/process",
                json=request_data,
                headers=auth_headers
            )
        
        assert response.status_code == 400
        assert "מזהה עסקה כבר קיים" in response.json()["detail"]

class TestReferralAPI:
    """בדיקות API הפניות"""
    
    @pytest.mark.asyncio
    async def test_get_user_referrals(self, auth_headers, mock_database):
        """בדיקת קבלת הפניות משתמש"""
        with patch('app.middleware.auth.verify_jwt_token') as mock_auth:
            mock_auth.return_value = {
                "user_id": "user-referrer",
                "role": "user"
            }
            
            response = client.get(
                "/referrals/user/user-referrer",
                headers=auth_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        if data:  # If there are referrals
            assert "id" in data[0]
            assert "referrer_id" in data[0]
            assert "status" in data[0]
    
    @pytest.mark.asyncio
    async def test_get_user_referrals_unauthorized(self, auth_headers):
        """בדיקת גישה לא מורשית להפניות משתמש אחר"""
        with patch('app.middleware.auth.verify_jwt_token') as mock_auth:
            mock_auth.return_value = {
                "user_id": "user-other",
                "role": "user"  # Not admin
            }
            
            response = client.get(
                "/referrals/user/user-referrer",  # Different user
                headers=auth_headers
            )
        
        assert response.status_code == 403
    
    @pytest.mark.asyncio
    async def test_get_pending_commissions_admin(self, auth_headers, mock_database):
        """בדיקת קבלת עמלות בהמתנה למנהל"""
        with patch('app.middleware.auth.verify_jwt_token') as mock_auth:
            mock_auth.return_value = {
                "user_id": "admin-user",
                "role": "admin"
            }
            
            response = client.get("/commissions/pending", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    @pytest.mark.asyncio
    async def test_get_pending_commissions_unauthorized(self, auth_headers):
        """בדיקת גישה לא מורשית לעמלות בהמתנה"""
        with patch('app.middleware.auth.verify_jwt_token') as mock_auth:
            mock_auth.return_value = {
                "user_id": "regular-user",
                "role": "user"  # Not admin/finance
            }
            
            response = client.get("/commissions/pending", headers=auth_headers)
        
        assert response.status_code == 403

class TestReferralStatistics:
    """בדיקות סטטיסטיקות הפניות"""
    
    @pytest.mark.asyncio
    async def test_user_referral_stats(self, auth_headers, mock_database):
        """בדיקת סטטיסטיקות הפניות משתמש"""
        # Mock statistics data
        mock_database.get_user_referral_stats.return_value = {
            "total_referrals": 15,
            "active_referrals": 8,
            "completed_referrals": 7
        }
        
        mock_database.get_user_commission_stats.return_value = {
            "total_commission_earned": Decimal('2500.00'),
            "total_commission_paid": Decimal('1800.00'),
            "pending_commission": Decimal('700.00')
        }
        
        mock_database.get_user_category_performance.return_value = [
            {"category": "renovation", "referral_count": 10, "total_commission": Decimal('1500.00')},
            {"category": "cleaning", "referral_count": 5, "total_commission": Decimal('1000.00')}
        ]
        
        mock_database.get_user_monthly_stats.return_value = []
        
        with patch('app.middleware.auth.verify_jwt_token') as mock_auth:
            mock_auth.return_value = {
                "user_id": "user-stats",
                "role": "user"
            }
            
            response = client.get(
                "/stats/referrals/user-stats",
                headers=auth_headers
            )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total_referrals"] == 15
        assert data["completed_referrals"] == 7
        assert float(data["success_rate"]) > 0  # Should calculate success rate
        assert "top_performing_categories" in data

if __name__ == "__main__":
    pytest.main(["-v", __file__])