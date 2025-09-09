"""Comprehensive tests for professional profile endpoints."""

import sys
import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from typing import AsyncGenerator
from decimal import Decimal

import pytest_asyncio
from fastapi.testclient import TestClient
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Add libs to path
sys.path.append("/app/libs")
from python_shared.database.models import (
    User, Professional, UserRole, ProfessionalStatus
)
from python_shared.database.base import Base

# Import app components
from main import app
from deps import get_db_session, get_current_active_user, TokenClaims
from services.s3_service import S3Service
from services.professional_service import ProfessionalService


# Test database setup
DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest_asyncio.fixture
async def async_engine():
    """Create test database engine."""
    engine = create_async_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    await engine.dispose()


@pytest_asyncio.fixture
async def async_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session_maker = sessionmaker(
        async_engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session_maker() as session:
        yield session


@pytest.fixture
def test_user_id() -> uuid.UUID:
    """Test user ID."""
    return uuid.uuid4()


@pytest.fixture
def test_professional_id() -> uuid.UUID:
    """Test professional ID."""
    return uuid.uuid4()


@pytest.fixture
def test_consumer_token(test_user_id) -> TokenClaims:
    """Test consumer token claims."""
    return TokenClaims(
        sub="test",
        user_id=str(test_user_id),
        role="consumer",
        phone="+972501234567",
        email="test@example.com",
        jti="test-jti"
    )


@pytest.fixture
def test_professional_token(test_user_id) -> TokenClaims:
    """Test professional token claims."""
    return TokenClaims(
        sub="test",
        user_id=str(test_user_id),
        role="professional",
        phone="+972501234567",
        email="test@example.com",
        jti="test-jti"
    )


@pytest.fixture
def test_admin_token(test_user_id) -> TokenClaims:
    """Test admin token claims."""
    return TokenClaims(
        sub="test",
        user_id=str(test_user_id),
        role="admin",
        phone="+972501234567",
        email="admin@example.com",
        jti="test-jti"
    )


@pytest.fixture
def test_professional_data():
    """Test professional data."""
    return {
        "profession": "חשמלאי",
        "company_name": "חברת חשמל בע״מ",
        "specialties": ["תאורה", "מערכות חשמל", "חיבור מכשירים"],
        "location": "תל אביב"
    }


class TestProfessionalEndpoints:
    """Test professional profile endpoints."""
    
    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, async_session):
        """Setup test data."""
        self.session = async_session
    
    def get_test_client_with_auth(self, user_token: TokenClaims):
        """Get test client with authentication."""
        
        async def mock_get_current_user():
            return user_token
        
        async def mock_get_db_session():
            yield self.session
        
        app.dependency_overrides[get_current_active_user] = mock_get_current_user
        app.dependency_overrides[get_db_session] = mock_get_db_session
        
        return TestClient(app)
    
    @pytest_asyncio.async def test_get_professionals_public_empty(self):
        """Test getting public professionals list when empty."""
        client = TestClient(app)
        
        # Override only the database dependency for public endpoint
        async def mock_get_db_session():
            yield self.session
        
        app.dependency_overrides[get_db_session] = mock_get_db_session
        
        response = client.get("/professionals")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []
    
    @pytest_asyncio.async def test_get_professionals_public_with_data(self, test_user_id, test_professional_data):
        """Test getting public professionals list with data."""
        # Create test user and professional
        user = User(
            id=test_user_id,
            name="יוסי כהן",
            phone="+972501234567",
            role=UserRole.PROFESSIONAL
        )
        
        professional = Professional(
            id=uuid.uuid4(),
            user_id=test_user_id,
            profession=test_professional_data["profession"],
            company_name=test_professional_data["company_name"],
            specialties=test_professional_data["specialties"],
            location=test_professional_data["location"],
            status=ProfessionalStatus.ACTIVE,
            is_verified=True,
            rating=Decimal("4.5"),
            review_count=10
        )
        
        self.session.add_all([user, professional])
        await self.session.commit()
        
        client = TestClient(app)
        
        # Override only the database dependency for public endpoint
        async def mock_get_db_session():
            yield self.session
        
        app.dependency_overrides[get_db_session] = mock_get_db_session
        
        response = client.get("/professionals")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert len(data) == 1
        assert data[0]["profession"] == test_professional_data["profession"]
        assert data[0]["is_verified"] == True
        assert float(data[0]["rating"]) == 4.5
        
        # Ensure no PII is exposed in public endpoint
        assert "user_name" not in data[0]
        assert "user_phone" not in data[0]
        assert "user_email" not in data[0]
    
    @pytest_asyncio.async def test_get_professional_public_detail(self, test_user_id, test_professional_id, test_professional_data):
        """Test getting public professional detail."""
        # Create test user and professional
        user = User(
            id=test_user_id,
            name="יוסי כהן",
            phone="+972501234567",
            role=UserRole.PROFESSIONAL
        )
        
        professional = Professional(
            id=test_professional_id,
            user_id=test_user_id,
            profession=test_professional_data["profession"],
            company_name=test_professional_data["company_name"],
            specialties=test_professional_data["specialties"],
            location=test_professional_data["location"],
            status=ProfessionalStatus.ACTIVE,
            is_verified=True
        )
        
        self.session.add_all([user, professional])
        await self.session.commit()
        
        client = TestClient(app)
        
        # Override only the database dependency
        async def mock_get_db_session():
            yield self.session
        
        app.dependency_overrides[get_db_session] = mock_get_db_session
        
        response = client.get(f"/professionals/{test_professional_id}")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == str(test_professional_id)
        assert data["profession"] == test_professional_data["profession"]
        assert data["status"] == "active"
    
    def test_get_professional_public_detail_not_found(self):
        """Test getting professional detail when not found."""
        client = TestClient(app)
        
        # Override only the database dependency
        async def mock_get_db_session():
            yield self.session
        
        app.dependency_overrides[get_db_session] = mock_get_db_session
        
        fake_id = uuid.uuid4()
        response = client.get(f"/professionals/{fake_id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest_asyncio.async def test_create_professional_profile(self, test_consumer_token, test_professional_data):
        """Test creating professional profile."""
        # Create test user
        user = User(
            id=test_consumer_token.user_id,
            name="יוסי כהן",
            phone=test_consumer_token.phone,
            email=test_consumer_token.email,
            role=UserRole.CONSUMER
        )
        
        self.session.add(user)
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_consumer_token)
        
        response = client.post("/professionals/profile", json=test_professional_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["user_id"] == str(test_consumer_token.user_id)
        assert data["profession"] == test_professional_data["profession"]
        assert data["status"] == "pending"  # Starts as pending
        assert data["is_verified"] == False
    
    @pytest_asyncio.async def test_create_professional_profile_already_exists(self, test_professional_token, test_professional_data):
        """Test creating professional profile when one already exists."""
        # Create test user and professional
        user = User(
            id=test_professional_token.user_id,
            name="יוסי כהן",
            phone=test_professional_token.phone,
            role=UserRole.PROFESSIONAL
        )
        
        existing_prof = Professional(
            id=uuid.uuid4(),
            user_id=test_professional_token.user_id,
            profession="existing profession",
            specialties=["existing"],
            location="existing location",
            status=ProfessionalStatus.ACTIVE
        )
        
        self.session.add_all([user, existing_prof])
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_professional_token)
        
        response = client.post("/professionals/profile", json=test_professional_data)
        assert response.status_code == status.HTTP_409_CONFLICT
        assert "Professional profile already exists" in response.json()["detail"]
    
    def test_create_professional_profile_invalid_data(self, test_consumer_token):
        """Test creating professional profile with invalid data."""
        client = self.get_test_client_with_auth(test_consumer_token)
        
        invalid_data = {
            "profession": "",  # Empty profession
            "specialties": [],  # Empty specialties
            "location": ""
        }
        
        response = client.post("/professionals/profile", json=invalid_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest_asyncio.async def test_update_professional_profile(self, test_professional_token, test_professional_data):
        """Test updating professional profile."""
        # Create test user and professional
        user = User(
            id=test_professional_token.user_id,
            name="יוסי כהן",
            phone=test_professional_token.phone,
            role=UserRole.PROFESSIONAL
        )
        
        professional = Professional(
            id=uuid.uuid4(),
            user_id=test_professional_token.user_id,
            profession="old profession",
            specialties=["old specialty"],
            location="old location",
            status=ProfessionalStatus.ACTIVE,
            is_verified=True
        )
        
        self.session.add_all([user, professional])
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_professional_token)
        
        update_data = {
            "profession": test_professional_data["profession"],
            "specialties": test_professional_data["specialties"]
        }
        
        response = client.put("/professionals/profile", json=update_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["profession"] == test_professional_data["profession"]
        assert data["specialties"] == test_professional_data["specialties"]
        # Should reset verification when key fields change
        assert data["is_verified"] == False
        assert data["status"] == "pending"
    
    def test_update_professional_profile_not_found(self, test_professional_token, test_professional_data):
        """Test updating professional profile when it doesn't exist."""
        client = self.get_test_client_with_auth(test_professional_token)
        
        response = client.put("/professionals/profile", json=test_professional_data)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Professional profile not found" in response.json()["detail"]
    
    @pytest_asyncio.async def test_get_my_professional_profile(self, test_professional_token, test_professional_data):
        """Test getting my professional profile."""
        # Create test user and professional
        user = User(
            id=test_professional_token.user_id,
            name="יוסי כהן",
            phone=test_professional_token.phone,
            role=UserRole.PROFESSIONAL
        )
        
        professional = Professional(
            id=uuid.uuid4(),
            user_id=test_professional_token.user_id,
            profession=test_professional_data["profession"],
            company_name=test_professional_data["company_name"],
            specialties=test_professional_data["specialties"],
            location=test_professional_data["location"],
            status=ProfessionalStatus.ACTIVE
        )
        
        self.session.add_all([user, professional])
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_professional_token)
        
        response = client.get("/professionals/profile/me")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["profession"] == test_professional_data["profession"]
        assert data["user_id"] == str(test_professional_token.user_id)
    
    def test_get_my_professional_profile_not_found(self, test_professional_token):
        """Test getting my professional profile when it doesn't exist."""
        client = self.get_test_client_with_auth(test_professional_token)
        
        response = client.get("/professionals/profile/me")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "Professional profile not found" in response.json()["detail"]
    
    @pytest_asyncio.async def test_verify_professional_admin(self, test_admin_token, test_professional_id):
        """Test admin verification of professional."""
        # Create test professional
        user = User(
            id=uuid.uuid4(),
            name="יוסי כהן",
            phone="+972501234567",
            role=UserRole.PROFESSIONAL
        )
        
        professional = Professional(
            id=test_professional_id,
            user_id=user.id,
            profession="חשמלאי",
            specialties=["תאורה"],
            location="תל אביב",
            status=ProfessionalStatus.PENDING
        )
        
        self.session.add_all([user, professional])
        await self.session.commit()
        
        # Mock the professional service
        with patch.object(ProfessionalService, 'verify_professional', new_callable=AsyncMock) as mock_verify:
            client = self.get_test_client_with_auth(test_admin_token)
            
            verification_data = {
                "professional_id": str(test_professional_id),
                "verification_status": "active",
                "admin_notes": "Verified successfully"
            }
            
            response = client.post(f"/professionals/{test_professional_id}/verify", json=verification_data)
            assert response.status_code == status.HTTP_200_OK
            
            data = response.json()
            assert "verification updated successfully" in data["message"]
            
            # Verify the service was called
            mock_verify.assert_called_once()
    
    def test_verify_professional_invalid_status(self, test_admin_token, test_professional_id):
        """Test professional verification with invalid status."""
        client = self.get_test_client_with_auth(test_admin_token)
        
        verification_data = {
            "professional_id": str(test_professional_id),
            "verification_status": "invalid_status"
        }
        
        response = client.post(f"/professionals/{test_professional_id}/verify", json=verification_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_verify_professional_not_admin(self, test_professional_token, test_professional_id):
        """Test professional verification by non-admin user."""
        client = self.get_test_client_with_auth(test_professional_token)
        
        verification_data = {
            "professional_id": str(test_professional_id),
            "verification_status": "active"
        }
        
        response = client.post(f"/professionals/{test_professional_id}/verify", json=verification_data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    @patch.object(S3Service, 'generate_certificate_upload_url', new_callable=AsyncMock)
    @pytest_asyncio.async def test_upload_certificate(self, mock_s3, test_professional_token):
        """Test certificate upload URL generation."""
        # Setup mock
        mock_s3.return_value = ("https://s3.amazonaws.com/upload-url", "certificates/test-key")
        
        # Create test user and professional
        user = User(
            id=test_professional_token.user_id,
            name="יוסי כהן",
            phone=test_professional_token.phone,
            role=UserRole.PROFESSIONAL
        )
        
        professional = Professional(
            id=uuid.uuid4(),
            user_id=test_professional_token.user_id,
            profession="חשמלאי",
            specialties=["תאורה"],
            location="תל אביב",
            status=ProfessionalStatus.PENDING
        )
        
        self.session.add_all([user, professional])
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_professional_token)
        
        upload_request = {
            "filename": "certificate.pdf",
            "file_type": "application/pdf",
            "description": "Professional certificate"
        }
        
        response = client.post("/professionals/certificates/upload", json=upload_request)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "upload_url" in data
        assert "file_key" in data
        assert data["expires_in"] == 3600
    
    def test_upload_certificate_not_professional(self, test_consumer_token):
        """Test certificate upload by non-professional user."""
        client = self.get_test_client_with_auth(test_consumer_token)
        
        upload_request = {
            "filename": "certificate.pdf",
            "file_type": "application/pdf"
        }
        
        response = client.post("/professionals/certificates/upload", json=upload_request)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    @patch.object(ProfessionalService, 'get_professional_stats', new_callable=AsyncMock)
    @pytest_asyncio.async def test_get_professional_stats(self, mock_stats, test_professional_token):
        """Test getting professional statistics."""
        # Setup mock
        from models.professionals import ProfessionalStats
        mock_stats.return_value = ProfessionalStats(
            total_leads=5,
            active_projects=2,
            completed_projects=3,
            total_earnings=Decimal("1500.00"),
            average_rating=Decimal("4.5"),
            total_reviews=10
        )
        
        # Create test user and professional
        user = User(
            id=test_professional_token.user_id,
            name="יוסי כהן",
            phone=test_professional_token.phone,
            role=UserRole.PROFESSIONAL
        )
        
        professional = Professional(
            id=uuid.uuid4(),
            user_id=test_professional_token.user_id,
            profession="חשמלאי",
            specialties=["תאורה"],
            location="תל אביב",
            status=ProfessionalStatus.ACTIVE
        )
        
        self.session.add_all([user, professional])
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_professional_token)
        
        response = client.get("/professionals/stats/me")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["total_leads"] == 5
        assert data["active_projects"] == 2
        assert data["completed_projects"] == 3
        assert float(data["total_earnings"]) == 1500.00
    
    def test_get_professional_stats_not_professional(self, test_consumer_token):
        """Test getting professional stats by non-professional user."""
        client = self.get_test_client_with_auth(test_consumer_token)
        
        response = client.get("/professionals/stats/me")
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestProfessionalValidation:
    """Test professional data validation."""
    
    def test_specialties_validation(self):
        """Test specialties validation."""
        from models.professionals import validate_specialties
        
        # Valid specialties
        valid_specialties = ["חשמל", "תאורה", "מערכות"]
        result = validate_specialties(valid_specialties)
        assert result == valid_specialties
        
        # Empty specialties
        with pytest.raises(ValueError, match="At least one specialty is required"):
            validate_specialties([])
        
        # Too many specialties
        too_many = ["specialty"] * 11
        with pytest.raises(ValueError, match="Maximum 10 specialties allowed"):
            validate_specialties(too_many)
    
    def test_location_validation(self):
        """Test location validation."""
        from models.professionals import validate_location
        
        # Valid locations
        assert validate_location("תל אביב") == "תל אביב"
        assert validate_location("  ירושלים  ") == "ירושלים"
        
        # Empty location
        with pytest.raises(ValueError):
            validate_location("")
        
        with pytest.raises(ValueError):
            validate_location("   ")
    
    def test_profession_validation(self):
        """Test profession validation."""
        from models.professionals import validate_profession
        
        # Valid profession
        assert validate_profession("חשמלאי") == "חשמלאי"
        
        # Empty profession
        with pytest.raises(ValueError):
            validate_profession("")


class TestProfessionalService:
    """Test professional service business logic."""
    
    @pytest_asyncio.fixture(autouse=True)
    async def setup(self, async_session):
        """Setup test data."""
        self.session = async_session
        self.service = ProfessionalService()
    
    @pytest_asyncio.async def test_verify_professional_service(self):
        """Test professional verification service."""
        # Create test data
        admin_id = uuid.uuid4()
        user_id = uuid.uuid4()
        prof_id = uuid.uuid4()
        
        user = User(
            id=user_id,
            name="יוסי כהן",
            phone="+972501234567",
            role=UserRole.PROFESSIONAL
        )
        
        professional = Professional(
            id=prof_id,
            user_id=user_id,
            profession="חשמלאי",
            specialties=["תאורה"],
            location="תל אביב",
            status=ProfessionalStatus.PENDING
        )
        
        self.session.add_all([user, professional])
        await self.session.commit()
        
        # Test verification
        result = await self.service.verify_professional(
            db=self.session,
            professional_id=prof_id,
            status=ProfessionalStatus.ACTIVE,
            admin_user_id=admin_id,
            notes="Test verification"
        )
        
        assert result.status == ProfessionalStatus.ACTIVE
        assert result.is_verified == True
    
    @pytest_asyncio.async def test_get_professional_stats_service(self):
        """Test professional stats calculation."""
        # Create test data
        user_id = uuid.uuid4()
        prof_id = uuid.uuid4()
        
        user = User(
            id=user_id,
            name="יוסי כהן",
            phone="+972501234567",
            role=UserRole.PROFESSIONAL
        )
        
        professional = Professional(
            id=prof_id,
            user_id=user_id,
            profession="חשמלאי",
            specialties=["תאורה"],
            location="תל אביב",
            status=ProfessionalStatus.ACTIVE,
            rating=Decimal("4.5"),
            review_count=10
        )
        
        self.session.add_all([user, professional])
        await self.session.commit()
        
        # Test stats calculation
        stats = await self.service.get_professional_stats(self.session, prof_id)
        
        assert stats.average_rating == Decimal("4.5")
        assert stats.total_reviews == 10
        assert stats.total_leads == 0  # No proposals yet
        assert stats.active_projects == 0
        assert stats.completed_projects == 0


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()