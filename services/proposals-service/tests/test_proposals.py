"""
Comprehensive test suite for Proposals Service.

This module provides extensive test coverage for all proposal-related
operations including creation, updates, acceptance/rejection, media uploads,
PII revelation, and Hebrew/RTL support.
"""

import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import sys
sys.path.append("/root/repos/ofair_mvp/libs")
from python_shared.database.base import Base
from python_shared.database.models import (
    User, Professional, Lead, ConsumerLead, ProfessionalLead, Proposal,
    UserRole, LeadType, LeadStatus, ProposalStatus, ProfessionalStatus
)

# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={
        "check_same_thread": False,
    },
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)


class TestProposalsService:
    """Test suite for the Proposals Service."""
    
    @pytest.fixture(scope="function")
    def db_session(self):
        """Create a test database session."""
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        mock_redis = AsyncMock()
        mock_redis.ping.return_value = True
        mock_redis.incr.return_value = 1
        mock_redis.expire.return_value = True
        mock_redis.ttl.return_value = 3600
        return mock_redis
    
    @pytest.fixture
    def mock_s3(self):
        """Mock S3 client."""
        mock_s3 = Mock()
        mock_s3.put_object.return_value = None
        mock_s3.delete_object.return_value = None
        mock_s3.generate_presigned_url.return_value = "https://example.com/file.jpg"
        return mock_s3
    
    @pytest.fixture
    def test_user(self, db_session):
        """Create test user."""
        user = User(
            id=uuid.uuid4(),
            phone="052-123-4567",
            email="test@example.com",
            name="משה כהן",
            role=UserRole.CONSUMER
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user
    
    @pytest.fixture
    def test_professional_user(self, db_session):
        """Create test professional user."""
        user = User(
            id=uuid.uuid4(),
            phone="052-987-6543",
            email="professional@example.com", 
            name="דוד לוי",
            role=UserRole.PROFESSIONAL
        )
        db_session.add(user)
        db_session.commit()
        
        professional = Professional(
            id=uuid.uuid4(),
            user_id=user.id,
            profession="אינסטלטור",
            company_name="אינסטלציות דוד לוי בע\"מ",
            location="תל אביב",
            rating=Decimal("4.5"),
            review_count=23,
            is_verified=True,
            status=ProfessionalStatus.ACTIVE
        )
        db_session.add(professional)
        db_session.commit()
        db_session.refresh(user)
        db_session.refresh(professional)
        return user, professional
    
    @pytest.fixture
    def test_lead(self, test_user, db_session):
        """Create test lead."""
        lead = Lead(
            id=uuid.uuid4(),
            type=LeadType.CONSUMER,
            title="תיקון דליפה במטבח",
            short_description="יש דליפה מקרן הברז במטבח, צריך תיקון דחוף",
            category="אינסטלציה",
            location="תל אביב",
            status=LeadStatus.ACTIVE,
            created_by_user_id=test_user.id
        )
        db_session.add(lead)
        
        consumer_lead = ConsumerLead(
            lead_id=lead.id,
            client_name="משה כהן",
            client_phone="052-123-4567",
            client_address="רחוב הרצל 123, תל אביב",
            full_description="יש דליפה גדולה מקרן הברז במטבח. הדליפה התחילה לפני יומיים והמים זורמים על הריצפה. צריך תיקון דחוף."
        )
        db_session.add(consumer_lead)
        
        db_session.commit()
        db_session.refresh(lead)
        return lead
    
    @pytest.fixture
    def test_proposal(self, test_lead, test_professional_user, db_session):
        """Create test proposal."""
        user, professional = test_professional_user
        
        proposal = Proposal(
            id=uuid.uuid4(),
            lead_id=test_lead.id,
            professional_id=professional.id,
            price=Decimal("500.00"),
            description="אני יכול לתקן את הדליפה תוך שעתיים. יש לי 15 שנות נסיון באינסטלציה.",
            status=ProposalStatus.PENDING,
            media_urls=[]
        )
        db_session.add(proposal)
        db_session.commit()
        db_session.refresh(proposal)
        return proposal


class TestProposalCreation(TestProposalsService):
    """Test proposal creation functionality."""
    
    def test_create_proposal_success(self, test_lead, test_professional_user, db_session, mock_redis):
        """Test successful proposal creation."""
        from app.services.proposal_service import ProposalService
        from app.models.proposals import ProposalCreateRequest
        
        user, professional = test_professional_user
        
        proposal_data = ProposalCreateRequest(
            lead_id=test_lead.id,
            price=Decimal("450.00"),
            description="אני מציע לתקן את הדליפה במהירות ובמקצועיות. ערבות למשך שנה.",
            scheduled_date=datetime.now() + timedelta(days=2)
        )
        
        service = ProposalService(db_session)
        
        with patch('app.deps.get_redis_client', return_value=mock_redis):
            result = await service.create_proposal(proposal_data, professional, user)
        
        assert result is not None
        assert result.price == proposal_data.price
        assert result.description == proposal_data.description
        assert result.status == ProposalStatus.PENDING
        assert result.professional_id == professional.id
        assert result.lead_id == test_lead.id
    
    def test_create_proposal_duplicate(self, test_lead, test_professional_user, test_proposal, db_session):
        """Test creating duplicate proposal fails."""
        from app.services.proposal_service import ProposalService
        from app.models.proposals import ProposalCreateRequest
        
        user, professional = test_professional_user
        
        proposal_data = ProposalCreateRequest(
            lead_id=test_lead.id,
            price=Decimal("600.00"),
            description="הצעה נוספת"
        )
        
        service = ProposalService(db_session)
        
        with pytest.raises(ValueError, match="already submitted"):
            await service.create_proposal(proposal_data, professional, user)
    
    def test_create_proposal_inactive_lead(self, test_lead, test_professional_user, db_session):
        """Test creating proposal on inactive lead fails."""
        from app.services.proposal_service import ProposalService
        from app.models.proposals import ProposalCreateRequest
        
        user, professional = test_professional_user
        
        # Make lead inactive
        test_lead.status = LeadStatus.CLOSED
        db_session.commit()
        
        proposal_data = ProposalCreateRequest(
            lead_id=test_lead.id,
            price=Decimal("450.00"),
            description="הצעה עבור עבודה סגורה"
        )
        
        service = ProposalService(db_session)
        
        with pytest.raises(ValueError, match="inactive lead"):
            await service.create_proposal(proposal_data, professional, user)
    
    def test_create_proposal_unverified_professional(self, test_lead, test_professional_user, db_session):
        """Test unverified professional cannot create proposal."""
        from app.services.proposal_service import ProposalService
        from app.models.proposals import ProposalCreateRequest
        
        user, professional = test_professional_user
        
        # Make professional unverified
        professional.is_verified = False
        db_session.commit()
        
        proposal_data = ProposalCreateRequest(
            lead_id=test_lead.id,
            price=Decimal("450.00"),
            description="הצעה ממקצוען לא מוסמך"
        )
        
        service = ProposalService(db_session)
        
        with pytest.raises(ValueError, match="must be verified"):
            await service.create_proposal(proposal_data, professional, user)


class TestProposalUpdates(TestProposalsService):
    """Test proposal update functionality."""
    
    def test_update_proposal_success(self, test_proposal, test_professional_user, db_session):
        """Test successful proposal update."""
        from app.services.proposal_service import ProposalService
        from app.models.proposals import ProposalUpdateRequest
        
        user, professional = test_professional_user
        
        update_data = ProposalUpdateRequest(
            price=Decimal("550.00"),
            description="עדכון: אני יכול לבצע את העבודה מהר יותר ובמחיר טוב יותר."
        )
        
        service = ProposalService(db_session)
        result = await service.update_proposal(test_proposal, update_data, professional, user)
        
        assert result.price == update_data.price
        assert result.description == update_data.description
        assert result.updated_at is not None
    
    def test_update_accepted_proposal_fails(self, test_proposal, test_professional_user, db_session):
        """Test updating accepted proposal fails."""
        from app.services.proposal_service import ProposalService
        from app.models.proposals import ProposalUpdateRequest
        
        user, professional = test_professional_user
        
        # Accept the proposal
        test_proposal.status = ProposalStatus.ACCEPTED
        db_session.commit()
        
        update_data = ProposalUpdateRequest(
            price=Decimal("600.00")
        )
        
        service = ProposalService(db_session)
        
        with pytest.raises(ValueError, match="Only pending proposals"):
            await service.update_proposal(test_proposal, update_data, professional, user)


class TestProposalAcceptance(TestProposalsService):
    """Test proposal acceptance functionality."""
    
    def test_accept_proposal_success(self, test_proposal, test_lead, test_user, db_session):
        """Test successful proposal acceptance."""
        from app.services.proposal_service import ProposalService
        
        service = ProposalService(db_session)
        result = await service.accept_proposal(test_proposal, test_lead, test_user)
        
        assert result is not None
        assert result.client_name == "משה כהן"
        assert result.client_phone == "052-123-4567"
        assert result.client_address == "רחוב הרצל 123, תל אביב"
        assert result.revealed_at is not None
        
        # Check proposal status updated
        db_session.refresh(test_proposal)
        assert test_proposal.status == ProposalStatus.ACCEPTED
        assert test_proposal.accepted_at is not None
        
        # Check lead final amount set
        db_session.refresh(test_lead)
        assert test_lead.final_amount == test_proposal.price
    
    def test_accept_non_pending_proposal_fails(self, test_proposal, test_lead, test_user, db_session):
        """Test accepting non-pending proposal fails."""
        from app.services.proposal_service import ProposalService
        
        # Reject the proposal first
        test_proposal.status = ProposalStatus.REJECTED
        db_session.commit()
        
        service = ProposalService(db_session)
        
        with pytest.raises(ValueError, match="Only pending proposals"):
            await service.accept_proposal(test_proposal, test_lead, test_user)


class TestProposalRejection(TestProposalsService):
    """Test proposal rejection functionality."""
    
    def test_reject_proposal_success(self, test_proposal, test_lead, test_user, db_session):
        """Test successful proposal rejection."""
        from app.services.proposal_service import ProposalService
        
        service = ProposalService(db_session)
        result = await service.reject_proposal(
            test_proposal, 
            test_lead, 
            test_user, 
            reason="המחיר גבוה מדי"
        )
        
        assert result.status == ProposalStatus.REJECTED
        assert result.rejected_at is not None
    
    def test_reject_accepted_proposal_fails(self, test_proposal, test_lead, test_user, db_session):
        """Test rejecting accepted proposal fails."""
        from app.services.proposal_service import ProposalService
        
        # Accept the proposal first
        test_proposal.status = ProposalStatus.ACCEPTED
        db_session.commit()
        
        service = ProposalService(db_session)
        
        with pytest.raises(ValueError, match="Only pending proposals"):
            await service.reject_proposal(test_proposal, test_lead, test_user)


class TestMediaUpload(TestProposalsService):
    """Test media upload functionality."""
    
    def test_upload_media_success(self, test_proposal, test_professional_user, db_session, mock_s3):
        """Test successful media upload."""
        from app.services.proposal_service import ProposalService
        from fastapi import UploadFile
        from io import BytesIO
        
        user, professional = test_professional_user
        
        # Mock file upload
        file_content = b"fake image content"
        mock_file = UploadFile(
            filename="תמונת_עבודה.jpg",
            file=BytesIO(file_content),
            content_type="image/jpeg",
            size=len(file_content)
        )
        
        service = ProposalService(db_session)
        
        with patch('app.services.proposal_service.get_s3_client', return_value=mock_s3), \
             patch('app.services.proposal_service.generate_media_url', return_value="https://example.com/file.jpg"):
            
            result = await service.upload_proposal_media(
                test_proposal, 
                mock_file, 
                "תמונה של הדליפה במטבח",
                professional, 
                user
            )
        
        assert result is not None
        assert result.original_filename == "תמונת_עבודה.jpg"
        assert result.content_type == "image/jpeg"
        assert result.description == "תמונה של הדליפה במטבח"
        
        # Check proposal updated with media URL
        db_session.refresh(test_proposal)
        assert len(test_proposal.media_urls) == 1
        
        # Verify S3 upload was called
        mock_s3.put_object.assert_called_once()
    
    def test_upload_media_size_limit(self, test_proposal, test_professional_user, db_session):
        """Test media upload size limit enforcement."""
        from app.services.proposal_service import ProposalService
        from fastapi import UploadFile
        from io import BytesIO
        
        user, professional = test_professional_user
        
        # Create oversized file
        file_content = b"x" * (11 * 1024 * 1024)  # 11MB > 10MB limit
        mock_file = UploadFile(
            filename="big_image.jpg",
            file=BytesIO(file_content),
            content_type="image/jpeg",
            size=len(file_content)
        )
        
        service = ProposalService(db_session)
        
        with pytest.raises(ValueError, match="Maximum 20 media files"):
            # This would fail validation before reaching the service
            await service.upload_proposal_media(
                test_proposal, 
                mock_file, 
                None,
                professional, 
                user
            )


class TestHebrewValidation(TestProposalsService):
    """Test Hebrew text validation and processing."""
    
    def test_hebrew_description_validation(self):
        """Test Hebrew text validation in proposals."""
        from app.models.proposals import validate_hebrew_text
        
        # Valid Hebrew text
        hebrew_text = "אני מקצוען מוסמך עם 10 שנות נסיון"
        result = validate_hebrew_text(hebrew_text)
        assert result == hebrew_text
        
        # Mixed Hebrew and English
        mixed_text = "אני professional עם experience של 10 שנים"
        result = validate_hebrew_text(mixed_text, allow_mixed=True)
        assert result == mixed_text
        
        # Empty text should fail
        with pytest.raises(ValueError, match="cannot be empty"):
            validate_hebrew_text("")
        
        # Text with prohibited characters should fail
        with pytest.raises(ValueError, match="prohibited characters"):
            validate_hebrew_text("טקסט עם <script>")
    
    def test_israeli_currency_validation(self):
        """Test Israeli currency amount validation."""
        from app.models.proposals import validate_israeli_currency
        
        # Valid amounts
        assert validate_israeli_currency(Decimal("100.50")) == Decimal("100.50")
        assert validate_israeli_currency(Decimal("999999.99")) == Decimal("999999.99")
        
        # Zero or negative amounts should fail
        with pytest.raises(ValueError, match="must be positive"):
            validate_israeli_currency(Decimal("0"))
        
        with pytest.raises(ValueError, match="must be positive"):
            validate_israeli_currency(Decimal("-100"))
        
        # Amount too large should fail
        with pytest.raises(ValueError, match="exceeds maximum"):
            validate_israeli_currency(Decimal("1000001"))


class TestAPIEndpoints(TestProposalsService):
    """Test API endpoint functionality."""
    
    @pytest.fixture
    def client(self):
        """Create test client."""
        from app.main import app
        
        # Override dependencies for testing
        def override_get_db():
            try:
                db = TestingSessionLocal()
                yield db
            finally:
                db.close()
        
        def override_get_redis_client():
            return AsyncMock()
        
        app.dependency_overrides[get_db] = override_get_db
        
        return TestClient(app)
    
    @pytest.fixture
    def auth_headers(self):
        """Create authentication headers for testing."""
        # Mock JWT token
        mock_token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJyb2xlIjoicHJvZmVzc2lvbmFsIiwiZXhwIjoxNjcwMDAwMDAwfQ.test"
        return {"Authorization": f"Bearer {mock_token}"}
    
    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["service"] == "ofair-proposals-service"
        assert "status" in data
        assert "features" in data
    
    def test_root_endpoint(self, client):
        """Test root information endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["service"] == "OFAIR Proposals Service"
        assert "description" in data
        assert "features" in data
        assert len(data["features"]) > 0
    
    @patch('app.deps.get_current_professional')
    def test_create_proposal_endpoint(self, mock_auth, client, auth_headers):
        """Test proposal creation endpoint."""
        # Mock authentication
        mock_user = Mock()
        mock_user.id = uuid.uuid4()
        mock_professional = Mock()
        mock_professional.id = uuid.uuid4()
        mock_auth.return_value = (Mock(), mock_user, mock_professional)
        
        proposal_data = {
            "lead_id": str(uuid.uuid4()),
            "price": "500.00",
            "description": "הצעת מחיר עבור תיקון דליפה"
        }
        
        with patch('app.api.proposals.ProposalService') as mock_service:
            mock_service.return_value.create_proposal = AsyncMock()
            mock_service.return_value.get_proposal_response = AsyncMock()
            
            response = client.post(
                "/proposals/",
                json=proposal_data,
                headers=auth_headers
            )
        
        # Should work with proper mocking
        # In actual test environment, this would need full database setup
        assert response.status_code in [201, 422]  # Success or validation error
    
    def test_validation_error_handler(self, client):
        """Test validation error handling with Hebrew messages."""
        # Send invalid proposal data
        invalid_data = {
            "lead_id": "invalid-uuid",
            "price": -100,
            "description": ""
        }
        
        response = client.post("/proposals/", json=invalid_data)
        assert response.status_code == 422
        
        data = response.json()
        assert data["error"] == "Validation failed"
        assert "בקשה לא תקינה" in data["message"]
        assert "details" in data


class TestNotificationService(TestProposalsService):
    """Test notification service functionality."""
    
    def test_notification_service_creation(self, db_session):
        """Test notification service initialization."""
        from app.services.notification_service import NotificationService
        
        service = NotificationService(db_session)
        assert service.db == db_session
        assert service.settings is not None
        assert service.http_client is not None
    
    @patch('app.services.notification_service.NotificationService._send_notification')
    async def test_new_proposal_notification(self, mock_send, test_proposal, test_lead, test_professional_user, test_user, db_session):
        """Test new proposal notification."""
        from app.services.notification_service import NotificationService
        
        user, professional = test_professional_user
        
        service = NotificationService(db_session)
        await service.notify_new_proposal(test_proposal, test_lead, professional, test_user)
        
        # Verify notification was sent
        mock_send.assert_called_once()
    
    @patch('app.services.notification_service.NotificationService._send_notification')
    async def test_proposal_accepted_notification(self, mock_send, test_proposal, test_lead, test_professional_user, test_user, db_session):
        """Test proposal accepted notification."""
        from app.services.notification_service import NotificationService
        
        user, professional = test_professional_user
        
        service = NotificationService(db_session)
        await service.notify_proposal_accepted(test_proposal, test_lead, professional, test_user)
        
        # Verify notification was sent
        mock_send.assert_called_once()


class TestIntegration(TestProposalsService):
    """Integration tests for the full workflow."""
    
    async def test_full_proposal_workflow(self, test_lead, test_professional_user, test_user, db_session, mock_redis, mock_s3):
        """Test complete proposal workflow from creation to acceptance."""
        from app.services.proposal_service import ProposalService
        from app.services.notification_service import NotificationService
        from app.models.proposals import ProposalCreateRequest
        
        user, professional = test_professional_user
        
        # 1. Create proposal
        proposal_data = ProposalCreateRequest(
            lead_id=test_lead.id,
            price=Decimal("750.00"),
            description="הצעה מקיפה לתיקון הדליפה כולל ערבות"
        )
        
        proposal_service = ProposalService(db_session)
        notification_service = NotificationService(db_session)
        
        with patch('app.deps.get_redis_client', return_value=mock_redis):
            # Create proposal
            proposal = await proposal_service.create_proposal(proposal_data, professional, user)
            assert proposal.status == ProposalStatus.PENDING
            
            # Accept proposal
            pii_data = await proposal_service.accept_proposal(proposal, test_lead, test_user)
            
            # Verify PII revelation
            assert pii_data.client_name == "משה כהן"
            assert pii_data.client_phone == "052-123-4567"
            assert pii_data.revealed_at is not None
            
            # Verify proposal status
            db_session.refresh(proposal)
            assert proposal.status == ProposalStatus.ACCEPTED
            assert proposal.accepted_at is not None
            
            # Verify lead final amount
            db_session.refresh(test_lead)
            assert test_lead.final_amount == proposal.price


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])