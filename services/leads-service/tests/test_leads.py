"""
Comprehensive tests for Leads Service.

Test Coverage:
- Lead creation and validation (consumer vs professional referrals)
- PII protection and access control
- Hebrew text validation and processing
- Israeli location validation and geocoding
- Lead search and filtering
- Lead sharing and referral system
- Business logic and edge cases
"""

import pytest
import uuid
from decimal import Decimal
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import Mock, patch, AsyncMock

import sys
sys.path.append("/root/repos/ofair_mvp/libs")
from python_shared.database.base import Base
from python_shared.database.models import (
    User, Professional, Lead, ConsumerLead, ProfessionalLead,
    UserRole, LeadType, LeadStatus, ProfessionalStatus
)

from app.main import app
from app.deps import get_db, get_redis_client


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_leads.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create test tables
Base.metadata.create_all(bind=engine)


# Test fixtures
@pytest.fixture
def db_session():
    """Create test database session."""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None
    mock_redis.setex.return_value = True
    mock_redis.incr.return_value = 1
    mock_redis.expire.return_value = True
    mock_redis.keys.return_value = []
    mock_redis.delete.return_value = 1
    return mock_redis


@pytest.fixture
def override_get_db(db_session):
    """Override database dependency."""
    def _get_db():
        yield db_session
    return _get_db


@pytest.fixture
def override_get_redis(mock_redis):
    """Override Redis dependency."""
    async def _get_redis():
        return mock_redis
    return _get_redis


@pytest.fixture
def test_client(override_get_db, override_get_redis):
    """Create test client with overridden dependencies."""
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_redis_client] = override_get_redis
    
    with TestClient(app) as client:
        yield client
    
    app.dependency_overrides.clear()


@pytest.fixture
def test_user(db_session):
    """Create test consumer user."""
    user = User(
        id=uuid.uuid4(),
        phone="+972501234567",
        email="test@example.com",
        name="Test User",
        role=UserRole.CONSUMER
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_professional_user(db_session):
    """Create test professional user."""
    user = User(
        id=uuid.uuid4(),
        phone="+972507654321",
        email="pro@example.com",
        name="Test Professional",
        role=UserRole.PROFESSIONAL
    )
    db_session.add(user)
    db_session.flush()
    
    professional = Professional(
        id=uuid.uuid4(),
        user_id=user.id,
        profession="renovation",
        company_name="Test Company",
        specialties=["electrical", "plumbing"],
        location="תל אביב",
        rating=Decimal("4.5"),
        review_count=10,
        is_verified=True,
        status=ProfessionalStatus.ACTIVE
    )
    db_session.add(professional)
    db_session.commit()
    db_session.refresh(user)
    db_session.refresh(professional)
    
    return user, professional


@pytest.fixture
def mock_jwt_token():
    """Mock JWT token for authentication."""
    return "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJ1c2VyX2lkIjoidGVzdC11c2VyLWlkIiwicm9sZSI6ImNvbnN1bWVyIiwiZXhwIjoxNjQwOTk1MjAwLCJqdGkiOiJ0ZXN0LWp0aSJ9"


@pytest.fixture
def mock_professional_jwt_token():
    """Mock JWT token for professional."""
    return "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwcm8tdXNlciIsInVzZXJfaWQiOiJwcm8tdXNlci1pZCIsInJvbGUiOiJwcm9mZXNzaW9uYWwiLCJwcm9mZXNzaW9uYWxfaWQiOiJwcm8taWQiLCJleHAiOjE2NDA5OTUyMDAsImp0aSI6InRlc3QtanRpIn0"


class TestLeadCreation:
    """Test lead creation functionality."""
    
    @patch('app.deps.verify_token')
    @patch('app.services.geo_service.IsraeliGeoService.geocode_location')
    def test_create_consumer_lead_success(self, mock_geocode, mock_verify, test_client, test_user, mock_jwt_token):
        """Test successful consumer lead creation."""
        # Mock token verification
        from app.deps import TokenClaims
        mock_verify.return_value = TokenClaims(
            sub=str(test_user.id),
            user_id=str(test_user.id),
            role="consumer",
            jti="test-jti"
        )
        
        # Mock geocoding
        from app.services.geo_service import LocationInfo
        mock_geocode.return_value = LocationInfo(
            latitude=32.0853,
            longitude=34.7818,
            address="תל אביב",
            city="תל אביב"
        )
        
        lead_data = {
            "type": "consumer",
            "title": "שיפוץ דירה בתל אביב",
            "short_description": "מחפש קבלן לשיפוץ דירת 3 חדרים",
            "category": "renovation",
            "location": "תל אביב",
            "client_name": "יוסי כהן",
            "client_phone": "+972501234567",
            "client_address": "רחוב דיזנגוף 123, תל אביב",
            "full_description": "שיפוץ כולל של דירת 3 חדרים כולל מטבח וחדרי רחצה"
        }
        
        response = test_client.post(
            "/leads/",
            json=lead_data,
            headers={"Authorization": f"Bearer {mock_jwt_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "consumer"
        assert data["title"] == lead_data["title"]
        assert data["category"] == "renovation"
        assert data["category_hebrew"] == "שיפוצים ובנייה"
        assert data["client_name"] == lead_data["client_name"]
    
    @patch('app.deps.verify_token')
    @patch('app.services.geo_service.IsraeliGeoService.geocode_location')
    def test_create_professional_lead_success(self, mock_geocode, mock_verify, test_client, test_professional_user, mock_professional_jwt_token):
        """Test successful professional referral lead creation."""
        user, professional = test_professional_user
        
        # Mock token verification
        from app.deps import TokenClaims
        mock_verify.return_value = TokenClaims(
            sub=str(user.id),
            user_id=str(user.id),
            role="professional",
            professional_id=str(professional.id),
            jti="test-jti"
        )
        
        # Mock geocoding
        from app.services.geo_service import LocationInfo
        mock_geocode.return_value = LocationInfo(
            latitude=32.0853,
            longitude=34.7818,
            address="תל אביב",
            city="תל אביב"
        )
        
        lead_data = {
            "type": "professional_referral",
            "title": "פרויקט שיפוץ מסחרי",
            "short_description": "שיפוץ משרד בת 200 מ״ר",
            "category": "renovation",
            "location": "תל אביב",
            "client_name": "חברת ABC",
            "client_phone": "+972501234567",
            "estimated_budget": 50000,
            "referrer_share_percentage": 15.0,
            "attachments": ["https://s3.example.com/plans.pdf"]
        }
        
        response = test_client.post(
            "/leads/",
            json=lead_data,
            headers={"Authorization": f"Bearer {mock_professional_jwt_token}"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == "professional_referral"
        assert data["estimated_budget"] == 50000
        assert data["referrer_share_percentage"] == 15.0
    
    def test_create_lead_invalid_hebrew_text(self, test_client, mock_jwt_token):
        """Test lead creation with invalid Hebrew text."""
        lead_data = {
            "type": "consumer",
            "title": "Invalid chars 🔥💯",  # Invalid characters
            "short_description": "Valid description",
            "category": "renovation",
            "location": "תל אביב",
            "client_name": "יוסי כהן",
            "client_phone": "+972501234567",
            "client_address": "רחוב דיזנגוף 123",
            "full_description": "Valid description"
        }
        
        response = test_client.post(
            "/leads/",
            json=lead_data,
            headers={"Authorization": f"Bearer {mock_jwt_token}"}
        )
        
        assert response.status_code == 422
        data = response.json()
        assert "validation" in data["error"].lower()
    
    def test_create_lead_invalid_phone(self, test_client, mock_jwt_token):
        """Test lead creation with invalid Israeli phone number."""
        lead_data = {
            "type": "consumer",
            "title": "שיפוץ דירה",
            "short_description": "מחפש קבלן לשיפוץ",
            "category": "renovation",
            "location": "תל אביב",
            "client_name": "יוסי כהן",
            "client_phone": "123456789",  # Invalid phone
            "client_address": "רחוב דיזנגוף 123",
            "full_description": "שיפוץ כולל"
        }
        
        response = test_client.post(
            "/leads/",
            json=lead_data,
            headers={"Authorization": f"Bearer {mock_jwt_token}"}
        )
        
        assert response.status_code == 422
    
    def test_create_lead_missing_consumer_fields(self, test_client, mock_jwt_token):
        """Test consumer lead creation with missing required fields."""
        lead_data = {
            "type": "consumer",
            "title": "שיפוץ דירה",
            "short_description": "מחפש קבלן לשיפוץ",
            "category": "renovation",
            "location": "תל אביב"
            # Missing client_name, client_phone, client_address, full_description
        }
        
        response = test_client.post(
            "/leads/",
            json=lead_data,
            headers={"Authorization": f"Bearer {mock_jwt_token}"}
        )
        
        assert response.status_code == 422


class TestLeadAccess:
    """Test lead access control and PII protection."""
    
    @patch('app.deps.verify_token')
    def test_get_lead_public_access(self, mock_verify, test_client, db_session):
        """Test public access to lead details (no PII)."""
        # Create test lead
        user = User(
            id=uuid.uuid4(),
            name="Test User",
            role=UserRole.CONSUMER
        )
        db_session.add(user)
        db_session.flush()
        
        lead = Lead(
            id=uuid.uuid4(),
            type=LeadType.CONSUMER,
            title="שיפוץ דירה",
            short_description="מחפש קבלן",
            category="renovation",
            location="תל אביב",
            status=LeadStatus.ACTIVE,
            created_by_user_id=user.id
        )
        db_session.add(lead)
        db_session.flush()
        
        consumer_details = ConsumerLead(
            lead_id=lead.id,
            client_name="יוסי כהן",  # PII
            client_phone="+972501234567",  # PII
            client_address="רחוב דיזנגוף 123",  # PII
            full_description="שיפוץ כולל"
        )
        db_session.add(consumer_details)
        db_session.commit()
        
        # No authentication - public access
        response = test_client.get(f"/leads/{lead.id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "שיפוץ דירה"
        assert data["client_name"] is None  # PII should be hidden
        assert data["client_phone"] is None  # PII should be hidden
    
    @patch('app.deps.verify_token')
    def test_get_lead_owner_access(self, mock_verify, test_client, db_session, test_user, mock_jwt_token):
        """Test lead owner can see full PII."""
        # Mock token verification
        from app.deps import TokenClaims
        mock_verify.return_value = TokenClaims(
            sub=str(test_user.id),
            user_id=str(test_user.id),
            role="consumer",
            jti="test-jti"
        )
        
        # Create lead owned by test user
        lead = Lead(
            id=uuid.uuid4(),
            type=LeadType.CONSUMER,
            title="שיפוץ דירה",
            short_description="מחפש קבלן",
            category="renovation",
            location="תל אביב",
            status=LeadStatus.ACTIVE,
            created_by_user_id=test_user.id
        )
        db_session.add(lead)
        db_session.flush()
        
        consumer_details = ConsumerLead(
            lead_id=lead.id,
            client_name="יוסי כהן",
            client_phone="+972501234567",
            client_address="רחוב דיזנגוף 123",
            full_description="שיפוץ כולל של הדירה"
        )
        db_session.add(consumer_details)
        db_session.commit()
        
        response = test_client.get(
            f"/leads/{lead.id}",
            headers={"Authorization": f"Bearer {mock_jwt_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["client_name"] == "יוסי כהן"  # Owner can see PII
        assert data["client_phone"] == "+972501234567"
        assert data["full_description"] == "שיפוץ כולל של הדירה"


class TestLeadSearch:
    """Test lead search and filtering functionality."""
    
    @patch('app.services.geo_service.IsraeliGeoService.geocode_location')
    def test_public_leads_search_by_category(self, mock_geocode, test_client, db_session):
        """Test public lead search with category filter."""
        # Create test leads
        user = User(id=uuid.uuid4(), name="Test User", role=UserRole.CONSUMER)
        db_session.add(user)
        db_session.flush()
        
        # Renovation lead
        lead1 = Lead(
            id=uuid.uuid4(),
            type=LeadType.CONSUMER,
            title="שיפוץ מטבח",
            short_description="שיפוץ מטבח קטן",
            category="renovation",
            location="תל אביב",
            status=LeadStatus.ACTIVE,
            created_by_user_id=user.id
        )
        
        # Cleaning lead
        lead2 = Lead(
            id=uuid.uuid4(),
            type=LeadType.CONSUMER,
            title="ניקוי דירה",
            short_description="ניקוי לפני כניסה",
            category="cleaning",
            location="תל אביב",
            status=LeadStatus.ACTIVE,
            created_by_user_id=user.id
        )
        
        db_session.add_all([lead1, lead2])
        db_session.commit()
        
        # Search for renovation leads
        response = test_client.get("/leads/public?category=renovation")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["leads"]) == 1
        assert data["leads"][0]["category"] == "renovation"
        assert data["leads"][0]["category_hebrew"] == "שיפוצים ובנייה"
    
    def test_public_leads_pagination(self, test_client, db_session):
        """Test lead search pagination."""
        user = User(id=uuid.uuid4(), name="Test User", role=UserRole.CONSUMER)
        db_session.add(user)
        db_session.flush()
        
        # Create multiple leads
        leads = []
        for i in range(25):
            lead = Lead(
                id=uuid.uuid4(),
                type=LeadType.CONSUMER,
                title=f"עבודה {i+1}",
                short_description=f"תיאור עבודה {i+1}",
                category="renovation",
                location="תל אביב",
                status=LeadStatus.ACTIVE,
                created_by_user_id=user.id
            )
            leads.append(lead)
        
        db_session.add_all(leads)
        db_session.commit()
        
        # First page
        response = test_client.get("/leads/public?page=1&page_size=10")
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 25
        assert len(data["leads"]) == 10
        assert data["page"] == 1
        assert data["total_pages"] == 3
        assert data["has_next"] is True
        assert data["has_previous"] is False
        
        # Second page
        response = test_client.get("/leads/public?page=2&page_size=10")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["leads"]) == 10
        assert data["page"] == 2
        assert data["has_next"] is True
        assert data["has_previous"] is True


class TestLeadSharing:
    """Test lead sharing and referral functionality."""
    
    @patch('app.deps.verify_token')
    @patch('app.services.lead_service.LeadService._create_referral_notification')
    def test_share_lead_success(self, mock_notification, mock_verify, test_client, db_session):
        """Test successful lead sharing between professionals."""
        # Create referrer professional
        referrer_user = User(
            id=uuid.uuid4(),
            name="Referrer Pro",
            role=UserRole.PROFESSIONAL
        )
        referrer_pro = Professional(
            id=uuid.uuid4(),
            user_id=referrer_user.id,
            profession="renovation",
            location="תל אביב",
            status=ProfessionalStatus.ACTIVE
        )
        
        # Create receiver professional
        receiver_pro = Professional(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            profession="electrical",
            location="תל אביב",
            status=ProfessionalStatus.ACTIVE
        )
        
        # Create lead
        lead = Lead(
            id=uuid.uuid4(),
            type=LeadType.PROFESSIONAL_REFERRAL,
            title="פרויקט חשמל",
            short_description="התקנת חשמל בבית",
            category="electrical",
            location="תל אביב",
            status=LeadStatus.ACTIVE,
            created_by_user_id=uuid.uuid4()
        )
        
        professional_details = ProfessionalLead(
            lead_id=lead.id,
            client_name="חברת ABC",
            client_phone="+972501234567",
            estimated_budget=Decimal("10000"),
            referrer_share_percentage=Decimal("20.0")
        )
        
        db_session.add_all([referrer_user, referrer_pro, receiver_pro, lead, professional_details])
        db_session.commit()
        
        # Mock token verification
        from app.deps import TokenClaims
        mock_verify.return_value = TokenClaims(
            sub=str(referrer_user.id),
            user_id=str(referrer_user.id),
            role="professional",
            professional_id=str(referrer_pro.id),
            jti="test-jti"
        )
        
        share_data = {
            "receiver_professional_id": str(receiver_pro.id),
            "commission_percentage": 15.0
        }
        
        response = test_client.post(
            f"/leads/{lead.id}/share",
            json=share_data,
            headers={"Authorization": "Bearer mock-token"}
        )
        
        assert response.status_code == 201
        data = response.json()
        assert data["commission_percentage"] == 15.0
        assert data["referrer_professional_id"] == str(referrer_pro.id)
        assert data["receiver_professional_id"] == str(receiver_pro.id)


class TestHebrewSupport:
    """Test Hebrew text processing and validation."""
    
    def test_hebrew_category_names(self, test_client):
        """Test Hebrew category names are returned correctly."""
        response = test_client.get("/leads/categories")
        
        assert response.status_code == 200
        data = response.json()
        categories = data["categories"]
        
        assert categories["renovation"] == "שיפוצים ובנייה"
        assert categories["cleaning"] == "ניקיון"
        assert categories["electrical"] == "חשמל"
        assert categories["plumbing"] == "אינסטלציה"
    
    def test_israeli_phone_validation(self, test_client):
        """Test Israeli phone number validation."""
        from app.models.leads import validate_israeli_phone
        
        # Valid formats
        assert validate_israeli_phone("0501234567") == "+972501234567"
        assert validate_israeli_phone("+972501234567") == "+972501234567"
        assert validate_israeli_phone("972501234567") == "+972501234567"
        
        # Invalid formats
        with pytest.raises(ValueError):
            validate_israeli_phone("123456")  # Too short
        
        with pytest.raises(ValueError):
            validate_israeli_phone("1234567890123")  # Too long
    
    def test_hebrew_text_validation(self, test_client):
        """Test Hebrew text validation."""
        from app.models.leads import validate_hebrew_text
        
        # Valid Hebrew text
        valid_text = "שיפוץ דירה בתל אביב - מחיר מעולה!"
        assert validate_hebrew_text(valid_text) == valid_text
        
        # Mixed Hebrew and English
        mixed_text = "שיפוץ Renovation 2024"
        assert validate_hebrew_text(mixed_text) == mixed_text
        
        # Invalid characters (emojis)
        with pytest.raises(ValueError):
            validate_hebrew_text("שיפוץ 🏠 דירה")


class TestGeographicFeatures:
    """Test geographic matching and location features."""
    
    @pytest.mark.asyncio
    async def test_israeli_location_geocoding(self):
        """Test Israeli location geocoding."""
        from app.services.geo_service import IsraeliGeoService
        
        geo_service = IsraeliGeoService()
        
        # Test known cities
        tel_aviv = await geo_service.geocode_location("תל אביב")
        assert tel_aviv is not None
        assert tel_aviv.city == "תל אביב"
        assert abs(tel_aviv.latitude - 32.0853) < 0.1
        
        # Test English names
        jerusalem = await geo_service.geocode_location("Jerusalem")
        assert jerusalem is not None
        
    @pytest.mark.asyncio
    async def test_distance_calculation(self):
        """Test distance calculation between Israeli cities."""
        from app.services.geo_service import IsraeliGeoService, LocationInfo
        
        geo_service = IsraeliGeoService()
        
        tel_aviv = LocationInfo(32.0853, 34.7818, "תל אביב")
        jerusalem = LocationInfo(31.7683, 35.2137, "ירושלים")
        
        distance_info = await geo_service.calculate_distance(tel_aviv, jerusalem)
        
        assert distance_info.distance_km > 50  # Approximately 60km
        assert distance_info.distance_km < 100
    
    def test_location_normalization(self):
        """Test Israeli location normalization."""
        from app.services.geo_service import IsraeliGeoService
        
        geo_service = IsraeliGeoService()
        
        # Test abbreviations
        assert geo_service.normalize_location_for_matching("ת\"א") == "תל אביב"
        assert geo_service.normalize_location_for_matching("ב\"ש") == "באר שבע"
        assert geo_service.normalize_location_for_matching("פ\"ת") == "פתח תקווה"


@pytest.mark.asyncio
async def test_rate_limiting():
    """Test rate limiting functionality."""
    from app.deps import check_rate_limit
    import redis.asyncio as redis
    
    # Mock Redis for rate limiting test
    mock_redis = AsyncMock()
    mock_redis.incr.return_value = 1
    mock_redis.expire.return_value = True
    mock_redis.pipeline.return_value = mock_redis
    mock_redis.execute.return_value = [1]
    mock_redis.ttl.return_value = 60
    
    # Test within limit
    allowed, count, remaining = await check_rate_limit(
        mock_redis, "test_key", 5, 3600
    )
    assert allowed is True
    assert count == 1
    
    # Test over limit
    mock_redis.execute.return_value = [10]  # Over limit
    allowed, count, remaining = await check_rate_limit(
        mock_redis, "test_key", 5, 3600
    )
    assert allowed is False
    assert count == 10
    assert remaining == 60


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])