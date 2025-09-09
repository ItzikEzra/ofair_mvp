"""Tests for Auth Service."""

import json
import pytest
import asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock
from httpx import AsyncClient
from fastapi.testclient import TestClient

# Test imports
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from main import app
from deps import get_redis_client, create_access_token, verify_token
from models.auth import (
    SendOTPRequest, VerifyOTPRequest, ContactType,
    TokenClaims, UserRole, OTPRecord
)
from services.otp_service import otp_service


class TestAuthService:
    """Test class for Auth Service."""
    
    @pytest.fixture
    def client(self):
        """Test client fixture."""
        return TestClient(app)
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client fixture."""
        redis_mock = AsyncMock()
        redis_mock.ping = AsyncMock(return_value=True)
        redis_mock.get = AsyncMock(return_value=None)
        redis_mock.setex = AsyncMock(return_value=True)
        redis_mock.delete = AsyncMock(return_value=True)
        redis_mock.incr = AsyncMock(return_value=1)
        redis_mock.expire = AsyncMock(return_value=True)
        redis_mock.ttl = AsyncMock(return_value=60)
        redis_mock.pipeline = Mock(return_value=redis_mock)
        redis_mock.execute = AsyncMock(return_value=[1, True])
        redis_mock.scan_iter = AsyncMock(return_value=[])
        return redis_mock
    
    @pytest.fixture
    def sample_otp_request(self):
        """Sample OTP request fixture."""
        return {
            "contact": "+972501234567",
            "language": "he"
        }
    
    @pytest.fixture
    def sample_verify_request(self):
        """Sample verify OTP request fixture."""
        return {
            "contact": "+972501234567",
            "otp": "123456"
        }
    
    @pytest.fixture
    def valid_token_claims(self):
        """Valid token claims fixture."""
        return TokenClaims(
            sub="user123",
            contact="+972501234567",
            contact_type="phone",
            role="consumer",
            iat=int(datetime.utcnow().timestamp()),
            exp=int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
            jti="token123"
        )


class TestHealthEndpoints:
    """Test health and root endpoints."""
    
    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "service" in data
        assert "service_he" in data
        assert data["status"] == "running"
    
    @patch('deps.get_redis_client')
    def test_health_check_healthy(self, mock_get_redis, client):
        """Test health check when Redis is healthy."""
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock(return_value=True)
        mock_get_redis.return_value = mock_redis
        
        response = client.get("/health")
        assert response.status_code == 200
    
    @patch('deps.get_redis_client')
    def test_health_check_unhealthy(self, mock_get_redis, client):
        """Test health check when Redis is unhealthy."""
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock(side_effect=Exception("Redis connection failed"))
        mock_get_redis.return_value = mock_redis
        
        response = client.get("/health")
        # Should still return 200 but with unhealthy status
        assert response.status_code == 200


class TestOTPModels:
    """Test OTP-related models."""
    
    def test_send_otp_request_valid_israeli_phone(self):
        """Test SendOTPRequest with valid Israeli phone number."""
        request = SendOTPRequest(contact="0501234567")
        assert request.contact == "+972501234567"
        assert request.contact_type == ContactType.PHONE
    
    def test_send_otp_request_valid_email(self):
        """Test SendOTPRequest with valid email."""
        request = SendOTPRequest(contact="test@example.com")
        assert request.contact == "test@example.com"
        assert request.contact_type == ContactType.EMAIL
    
    def test_send_otp_request_international_phone(self):
        """Test SendOTPRequest with international phone number."""
        request = SendOTPRequest(contact="+1234567890")
        assert request.contact == "+1234567890"
        assert request.contact_type == ContactType.PHONE
    
    def test_send_otp_request_invalid_phone(self):
        """Test SendOTPRequest with invalid phone number."""
        with pytest.raises(ValueError):
            SendOTPRequest(contact="invalid_phone")
    
    def test_send_otp_request_invalid_email(self):
        """Test SendOTPRequest with invalid email."""
        with pytest.raises(ValueError):
            SendOTPRequest(contact="invalid_email")
    
    def test_verify_otp_request_valid(self):
        """Test VerifyOTPRequest with valid data."""
        request = VerifyOTPRequest(contact="+972501234567", otp="123456")
        assert request.contact == "+972501234567"
        assert request.otp == "123456"
    
    def test_verify_otp_request_invalid_otp(self):
        """Test VerifyOTPRequest with invalid OTP."""
        with pytest.raises(ValueError):
            VerifyOTPRequest(contact="+972501234567", otp="abc123")


class TestOTPService:
    """Test OTP service functionality."""
    
    @pytest.fixture
    def otp_service_instance(self):
        """OTP service instance fixture."""
        return otp_service
    
    def test_generate_otp(self, otp_service_instance):
        """Test OTP generation."""
        otp = otp_service_instance.generate_otp()
        assert len(otp) == 6
        assert otp.isdigit()
    
    @patch('services.otp_service.get_redis_client')
    @patch('services.otp_service.OTPService._send_sms_otp')
    async def test_send_otp_sms_success(self, mock_send_sms, mock_get_redis, otp_service_instance):
        """Test successful SMS OTP sending."""
        # Mock Redis
        mock_redis = AsyncMock()
        mock_redis.setex = AsyncMock(return_value=True)
        mock_get_redis.return_value = mock_redis
        
        # Mock SMS sending
        mock_send_sms.return_value = True
        
        success, msg_en, msg_he = await otp_service_instance.send_otp(
            "+972501234567", ContactType.PHONE, "he"
        )
        
        assert success is True
        assert "successfully" in msg_en.lower()
        mock_redis.setex.assert_called_once()
        mock_send_sms.assert_called_once()
    
    @patch('services.otp_service.get_redis_client')
    @patch('services.otp_service.OTPService._send_email_otp')
    async def test_send_otp_email_success(self, mock_send_email, mock_get_redis, otp_service_instance):
        """Test successful email OTP sending."""
        # Mock Redis
        mock_redis = AsyncMock()
        mock_redis.setex = AsyncMock(return_value=True)
        mock_get_redis.return_value = mock_redis
        
        # Mock email sending
        mock_send_email.return_value = True
        
        success, msg_en, msg_he = await otp_service_instance.send_otp(
            "test@example.com", ContactType.EMAIL, "he"
        )
        
        assert success is True
        assert "successfully" in msg_en.lower()
        mock_redis.setex.assert_called_once()
        mock_send_email.assert_called_once()
    
    @patch('services.otp_service.get_redis_client')
    async def test_verify_otp_success(self, mock_get_redis, otp_service_instance):
        """Test successful OTP verification."""
        # Mock Redis with valid OTP record
        otp_record = OTPRecord(
            contact="+972501234567",
            contact_type=ContactType.PHONE,
            otp="123456",
            attempts=0,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps(otp_record.dict(), default=str))
        mock_redis.delete = AsyncMock(return_value=True)
        mock_get_redis.return_value = mock_redis
        
        # Mock _is_new_user
        with patch.object(otp_service_instance, '_is_new_user', return_value=False):
            success, msg_en, msg_he, is_new_user = await otp_service_instance.verify_otp(
                "+972501234567", "123456"
            )
        
        assert success is True
        assert "successfully" in msg_en.lower()
        assert is_new_user is False
        mock_redis.delete.assert_called_once()
    
    @patch('services.otp_service.get_redis_client')
    async def test_verify_otp_expired(self, mock_get_redis, otp_service_instance):
        """Test OTP verification with expired OTP."""
        # Mock Redis with expired OTP record
        otp_record = OTPRecord(
            contact="+972501234567",
            contact_type=ContactType.PHONE,
            otp="123456",
            attempts=0,
            created_at=datetime.utcnow() - timedelta(minutes=20),
            expires_at=datetime.utcnow() - timedelta(minutes=10)
        )
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps(otp_record.dict(), default=str))
        mock_redis.delete = AsyncMock(return_value=True)
        mock_get_redis.return_value = mock_redis
        
        success, msg_en, msg_he, is_new_user = await otp_service_instance.verify_otp(
            "+972501234567", "123456"
        )
        
        assert success is False
        assert "expired" in msg_en.lower()
        mock_redis.delete.assert_called_once()
    
    @patch('services.otp_service.get_redis_client')
    async def test_verify_otp_invalid_code(self, mock_get_redis, otp_service_instance):
        """Test OTP verification with invalid code."""
        # Mock Redis with valid OTP record
        otp_record = OTPRecord(
            contact="+972501234567",
            contact_type=ContactType.PHONE,
            otp="123456",
            attempts=0,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value=json.dumps(otp_record.dict(), default=str))
        mock_redis.setex = AsyncMock(return_value=True)
        mock_get_redis.return_value = mock_redis
        
        success, msg_en, msg_he, is_new_user = await otp_service_instance.verify_otp(
            "+972501234567", "654321"  # Wrong OTP
        )
        
        assert success is False
        assert "invalid" in msg_en.lower()
        mock_redis.setex.assert_called_once()  # Should update attempts


class TestAuthAPIEndpoints:
    """Test Auth API endpoints."""
    
    def setup_method(self):
        """Setup method run before each test."""
        self.client = TestClient(app)
    
    @patch('api.auth.check_otp_rate_limit')
    @patch('api.auth.otp_service.send_otp')
    def test_send_otp_success(self, mock_send_otp, mock_rate_limit):
        """Test successful OTP sending."""
        # Mock rate limit check
        mock_rate_limit.return_value = (True, None)
        
        # Mock OTP service
        mock_send_otp.return_value = (True, "OTP sent successfully", "קוד אימות נשלח בהצלחה")
        
        response = self.client.post("/auth/send-otp", json={
            "contact": "+972501234567",
            "language": "he"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["contact_type"] == "phone"
        assert "masked_contact" in data
    
    @patch('api.auth.check_otp_rate_limit')
    def test_send_otp_rate_limited(self, mock_rate_limit):
        """Test OTP sending when rate limited."""
        # Mock rate limit check
        mock_rate_limit.return_value = (False, 60)  # Blocked for 60 seconds
        
        response = self.client.post("/auth/send-otp", json={
            "contact": "+972501234567",
            "language": "he"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["retry_after"] == 60
    
    @patch('api.auth.check_verification_rate_limit')
    @patch('api.auth.otp_service.verify_otp')
    @patch('api.auth._get_or_create_user')
    @patch('api.auth._create_refresh_token')
    @patch('api.auth._store_user_session')
    def test_verify_otp_success(
        self, mock_store_session, mock_create_refresh, mock_get_user,
        mock_verify_otp, mock_rate_limit
    ):
        """Test successful OTP verification."""
        # Mock rate limit
        mock_rate_limit.return_value = (True, None)
        
        # Mock OTP verification
        mock_verify_otp.return_value = (
            True, "OTP verified successfully", "קוד האימות אומת בהצלחה", False
        )
        
        # Mock user creation/retrieval
        mock_get_user.return_value = "user123"
        mock_create_refresh.return_value = "refresh_token_123"
        mock_store_session.return_value = None
        
        response = self.client.post("/auth/verify-otp", json={
            "contact": "+972501234567",
            "otp": "123456"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["token_data"] is not None
        assert data["token_data"]["access_token"] is not None
        assert data["is_new_user"] is False
    
    def test_verify_otp_invalid_request(self):
        """Test OTP verification with invalid request."""
        response = self.client.post("/auth/verify-otp", json={
            "contact": "invalid_contact",
            "otp": "123456"
        })
        
        assert response.status_code == 422  # Validation error
    
    @patch('api.auth.get_current_user')
    def test_get_current_user_info(self, mock_get_user):
        """Test getting current user info."""
        # Mock current user
        mock_user = TokenClaims(
            sub="user123",
            contact="+972501234567",
            contact_type="phone",
            role="consumer",
            iat=int(datetime.utcnow().timestamp()),
            exp=int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
            jti="token123"
        )
        mock_get_user.return_value = mock_user
        
        response = self.client.get("/auth/me", headers={
            "Authorization": "Bearer fake_token"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "user123"
        assert data["authenticated"] is True


class TestTokenOperations:
    """Test JWT token operations."""
    
    def test_create_access_token(self):
        """Test access token creation."""
        data = {
            "sub": "user123",
            "contact": "+972501234567",
            "role": "consumer"
        }
        
        token = create_access_token(data, expires_delta=3600)
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_verify_token_valid(self):
        """Test token verification with valid token."""
        # Create a token first
        data = {
            "sub": "user123",
            "contact": "+972501234567",
            "contact_type": "phone",
            "role": "consumer",
            "iat": int(datetime.utcnow().timestamp()),
            "exp": int((datetime.utcnow() + timedelta(hours=1)).timestamp()),
            "jti": "token123"
        }
        
        token = create_access_token(data)
        claims = verify_token(token)
        
        assert claims.sub == "user123"
        assert claims.contact == "+972501234567"
        assert claims.role == "consumer"
    
    def test_verify_token_invalid(self):
        """Test token verification with invalid token."""
        with pytest.raises(Exception):  # Should raise HTTPException
            verify_token("invalid_token")


class TestRateLimiting:
    """Test rate limiting functionality."""
    
    @patch('deps.get_redis_client')
    async def test_check_rate_limit_allowed(self, mock_get_redis):
        """Test rate limiting when requests are allowed."""
        from deps import check_rate_limit
        
        mock_redis = AsyncMock()
        mock_redis.pipeline.return_value = mock_redis
        mock_redis.incr = AsyncMock(return_value=mock_redis)
        mock_redis.expire = AsyncMock(return_value=mock_redis)
        mock_redis.execute = AsyncMock(return_value=[1, True])  # First request
        mock_get_redis.return_value = mock_redis
        
        allowed, count, remaining = await check_rate_limit(
            mock_redis, "test_key", 5, 60
        )
        
        assert allowed is True
        assert count == 1
        assert remaining == 0
    
    @patch('deps.get_redis_client')
    async def test_check_rate_limit_exceeded(self, mock_get_redis):
        """Test rate limiting when limit is exceeded."""
        from deps import check_rate_limit
        
        mock_redis = AsyncMock()
        mock_redis.pipeline.return_value = mock_redis
        mock_redis.incr = AsyncMock(return_value=mock_redis)
        mock_redis.expire = AsyncMock(return_value=mock_redis)
        mock_redis.execute = AsyncMock(return_value=[6, True])  # Exceeded limit of 5
        mock_redis.ttl = AsyncMock(return_value=45)
        mock_get_redis.return_value = mock_redis
        
        allowed, count, remaining = await check_rate_limit(
            mock_redis, "test_key", 5, 60
        )
        
        assert allowed is False
        assert count == 6
        assert remaining == 45


class TestHelperFunctions:
    """Test helper functions."""
    
    def test_mask_email(self):
        """Test email masking."""
        from deps import mask_email
        
        assert mask_email("test@example.com") == "t**t@example.com"
        assert mask_email("ab@example.com") == "**@example.com"
        assert mask_email("a@example.com") == "*@example.com"
    
    def test_mask_phone(self):
        """Test phone masking."""
        from deps import mask_phone
        
        assert mask_phone("+972501234567") == "+972*****67"
        assert mask_phone("0501234567") == "05*****67"
        assert mask_phone("123") == "***"
    
    def test_mask_contact(self):
        """Test contact masking based on type."""
        from deps import mask_contact
        
        # Test email
        masked = mask_contact("test@example.com", ContactType.EMAIL)
        assert "@" in masked
        assert "*" in masked
        
        # Test phone
        masked = mask_contact("+972501234567", ContactType.PHONE)
        assert "*" in masked


@pytest.mark.asyncio
class TestAsyncOperations:
    """Test async operations."""
    
    async def test_redis_connection(self):
        """Test Redis connection (mocked)."""
        with patch('deps.redis.from_url') as mock_redis:
            mock_client = AsyncMock()
            mock_client.ping = AsyncMock(return_value=True)
            mock_redis.return_value = mock_client
            
            client = await get_redis_client()
            result = await client.ping()
            assert result is True


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])