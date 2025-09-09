"""Comprehensive tests for user management endpoints."""

import sys
import uuid
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from typing import AsyncGenerator

import pytest_asyncio
from fastapi.testclient import TestClient
from fastapi import status
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Add libs to path
sys.path.append("/app/libs")
from python_shared.database.models import User, UserProfile, UserRole
from python_shared.database.base import Base

# Import app components
from main import app
from deps import get_db_session, get_current_active_user, TokenClaims


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
def test_user_token(test_user_id) -> TokenClaims:
    """Test user token claims."""
    return TokenClaims(
        sub="test",
        user_id=str(test_user_id),
        role="consumer",
        phone="+972501234567",
        email="test@example.com",
        jti="test-jti"
    )


@pytest.fixture
def test_user_data():
    """Test user data."""
    return {
        "name": "משה כהן",
        "phone": "+972501234567",
        "email": "moshe@example.com"
    }


@pytest.fixture
def test_profile_data():
    """Test profile data."""
    return {
        "address": "רחב יפה 123, תל אביב",
        "preferences": {"language": "he", "notifications": True}
    }


class TestUserEndpoints:
    """Test user management endpoints."""
    
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
    
    def test_get_current_user_profile_not_found(self, test_user_token):
        """Test getting current user profile when user doesn't exist."""
        client = self.get_test_client_with_auth(test_user_token)
        
        response = client.get("/users/me")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "User not found" in response.json()["detail"]
    
    @pytest_asyncio.async def test_get_current_user_profile_success(self, test_user_token, test_user_data):
        """Test successful retrieval of current user profile."""
        # Create test user
        user = User(
            id=test_user_token.user_id,
            name=test_user_data["name"],
            phone=test_user_data["phone"],
            email=test_user_data["email"],
            role=UserRole.CONSUMER
        )
        
        self.session.add(user)
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_user_token)
        
        response = client.get("/users/me")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["id"] == str(test_user_token.user_id)
        assert data["name"] == test_user_data["name"]
        assert data["phone"] == test_user_data["phone"]
        assert data["email"] == test_user_data["email"]
        assert data["role"] == "consumer"
    
    @pytest_asyncio.async def test_update_current_user_profile(self, test_user_token, test_user_data):
        """Test updating current user profile."""
        # Create test user
        user = User(
            id=test_user_token.user_id,
            name="דוד לוי",
            phone="+972502345678",
            email="david@example.com",
            role=UserRole.CONSUMER
        )
        
        self.session.add(user)
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_user_token)
        
        # Update user data
        update_data = {
            "name": test_user_data["name"],
            "phone": test_user_data["phone"]
        }
        
        response = client.put("/users/me", json=update_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["name"] == test_user_data["name"]
        assert data["phone"] == test_user_data["phone"]
        assert data["email"] == "david@example.com"  # Email unchanged
    
    def test_update_current_user_profile_empty_data(self, test_user_token):
        """Test updating user profile with empty data."""
        client = self.get_test_client_with_auth(test_user_token)
        
        response = client.put("/users/me", json={})
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "No valid update data provided" in response.json()["detail"]
    
    def test_update_current_user_profile_invalid_phone(self, test_user_token, test_user_data):
        """Test updating user profile with invalid phone."""
        client = self.get_test_client_with_auth(test_user_token)
        
        update_data = {
            "name": test_user_data["name"],
            "phone": "invalid-phone"
        }
        
        response = client.put("/users/me", json=update_data)
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @pytest_asyncio.async def test_create_user_profile(self, test_user_token, test_user_data, test_profile_data):
        """Test creating user profile."""
        # Create test user
        user = User(
            id=test_user_token.user_id,
            name=test_user_data["name"],
            phone=test_user_data["phone"],
            email=test_user_data["email"],
            role=UserRole.CONSUMER
        )
        
        self.session.add(user)
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_user_token)
        
        response = client.post("/users/me/profile", json=test_profile_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["user_id"] == str(test_user_token.user_id)
        assert data["address"] == test_profile_data["address"]
        assert data["preferences"] == test_profile_data["preferences"]
    
    @pytest_asyncio.async def test_create_user_profile_already_exists(self, test_user_token, test_user_data, test_profile_data):
        """Test creating user profile when one already exists."""
        # Create test user and profile
        user = User(
            id=test_user_token.user_id,
            name=test_user_data["name"],
            phone=test_user_data["phone"],
            email=test_user_data["email"],
            role=UserRole.CONSUMER
        )
        
        profile = UserProfile(
            user_id=test_user_token.user_id,
            address="existing address"
        )
        
        self.session.add_all([user, profile])
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_user_token)
        
        response = client.post("/users/me/profile", json=test_profile_data)
        assert response.status_code == status.HTTP_409_CONFLICT
        assert "User profile already exists" in response.json()["detail"]
    
    @pytest_asyncio.async def test_update_user_profile(self, test_user_token, test_user_data, test_profile_data):
        """Test updating user profile."""
        # Create test user and profile
        user = User(
            id=test_user_token.user_id,
            name=test_user_data["name"],
            phone=test_user_data["phone"],
            email=test_user_data["email"],
            role=UserRole.CONSUMER
        )
        
        profile = UserProfile(
            user_id=test_user_token.user_id,
            address="old address",
            preferences={"old": "setting"}
        )
        
        self.session.add_all([user, profile])
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_user_token)
        
        response = client.put("/users/me/profile", json=test_profile_data)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["address"] == test_profile_data["address"]
        assert data["preferences"] == test_profile_data["preferences"]
    
    def test_update_user_profile_not_found(self, test_user_token, test_profile_data):
        """Test updating user profile when it doesn't exist."""
        client = self.get_test_client_with_auth(test_user_token)
        
        response = client.put("/users/me/profile", json=test_profile_data)
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "User profile not found" in response.json()["detail"]
    
    @pytest_asyncio.async def test_get_user_profile(self, test_user_token, test_user_data, test_profile_data):
        """Test getting user profile."""
        # Create test user and profile
        user = User(
            id=test_user_token.user_id,
            name=test_user_data["name"],
            phone=test_user_data["phone"],
            email=test_user_data["email"],
            role=UserRole.CONSUMER
        )
        
        profile = UserProfile(
            user_id=test_user_token.user_id,
            address=test_profile_data["address"],
            preferences=test_profile_data["preferences"]
        )
        
        self.session.add_all([user, profile])
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_user_token)
        
        response = client.get("/users/me/profile")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["address"] == test_profile_data["address"]
        assert data["preferences"] == test_profile_data["preferences"]
    
    def test_get_user_profile_not_found(self, test_user_token):
        """Test getting user profile when it doesn't exist."""
        client = self.get_test_client_with_auth(test_user_token)
        
        response = client.get("/users/me/profile")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() is None
    
    @pytest_asyncio.async def test_delete_user_profile(self, test_user_token, test_user_data, test_profile_data):
        """Test deleting user profile."""
        # Create test user and profile
        user = User(
            id=test_user_token.user_id,
            name=test_user_data["name"],
            phone=test_user_data["phone"],
            email=test_user_data["email"],
            role=UserRole.CONSUMER
        )
        
        profile = UserProfile(
            user_id=test_user_token.user_id,
            address=test_profile_data["address"],
            preferences=test_profile_data["preferences"]
        )
        
        self.session.add_all([user, profile])
        await self.session.commit()
        
        client = self.get_test_client_with_auth(test_user_token)
        
        response = client.delete("/users/me/profile")
        assert response.status_code == status.HTTP_200_OK
        assert "Profile deleted successfully" in response.json()["message"]
        
        # Verify profile is deleted
        response = client.get("/users/me/profile")
        assert response.json() is None
    
    def test_delete_user_profile_not_found(self, test_user_token):
        """Test deleting user profile when it doesn't exist."""
        client = self.get_test_client_with_auth(test_user_token)
        
        response = client.delete("/users/me/profile")
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "User profile not found" in response.json()["detail"]


class TestUserValidation:
    """Test user data validation."""
    
    def test_hebrew_name_validation(self):
        """Test Hebrew name validation."""
        from models.users import validate_hebrew_name
        
        # Valid Hebrew names
        assert validate_hebrew_name("משה כהן") == "משה כהן"
        assert validate_hebrew_name("  שרה לוי  ") == "שרה לוי"
        
        # Invalid names
        with pytest.raises(ValueError):
            validate_hebrew_name("")
        
        with pytest.raises(ValueError):
            validate_hebrew_name("   ")
    
    def test_israeli_phone_validation(self):
        """Test Israeli phone number validation."""
        from models.users import validate_israeli_phone_model
        
        # Valid Israeli phone numbers
        assert validate_israeli_phone_model("+972501234567") == "+972501234567"
        assert validate_israeli_phone_model("972501234567") == "+972501234567"
        assert validate_israeli_phone_model("0501234567") == "+972501234567"
        
        # Invalid phone numbers
        with pytest.raises(ValueError):
            validate_israeli_phone_model("123456")
        
        with pytest.raises(ValueError):
            validate_israeli_phone_model("+1234567890")
        
        with pytest.raises(ValueError):
            validate_israeli_phone_model("050123456")  # Too short


class TestUserDependencies:
    """Test user-related dependencies."""
    
    @patch('deps.get_redis_client')
    @patch('deps.jwt.decode')
    def test_verify_token_success(self, mock_decode, mock_redis):
        """Test successful token verification."""
        from deps import verify_token
        
        # Mock JWT decode
        mock_decode.return_value = {
            "sub": "test",
            "user_id": str(uuid.uuid4()),
            "role": "consumer",
            "jti": "test-jti"
        }
        
        token = "valid.jwt.token"
        claims = verify_token(token)
        
        assert claims.sub == "test"
        assert claims.role == "consumer"
    
    @patch('deps.jwt.decode')
    def test_verify_token_invalid(self, mock_decode):
        """Test invalid token verification."""
        from deps import verify_token
        from jose import JWTError
        from fastapi import HTTPException
        
        # Mock JWT decode to raise error
        mock_decode.side_effect = JWTError("Invalid token")
        
        token = "invalid.jwt.token"
        
        with pytest.raises(HTTPException) as exc_info:
            verify_token(token)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_validate_hebrew_text(self):
        """Test Hebrew text validation dependency."""
        from deps import validate_hebrew_text
        from fastapi import HTTPException
        
        # Valid Hebrew text
        result = validate_hebrew_text("טקסט בעברית", "test_field")
        assert result == "טקסט בעברית"
        
        # Empty text
        with pytest.raises(HTTPException) as exc_info:
            validate_hebrew_text("", "test_field")
        
        assert exc_info.value.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_normalize_israeli_phone(self):
        """Test Israeli phone normalization."""
        from deps import normalize_israeli_phone
        
        # Test various formats
        assert normalize_israeli_phone("+972501234567") == "+972501234567"
        assert normalize_israeli_phone("972501234567") == "+972501234567"
        assert normalize_israeli_phone("0501234567") == "+972501234567"
        assert normalize_israeli_phone("050-123-4567") == "+972501234567"
        assert normalize_israeli_phone("050 123 4567") == "+972501234567"


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()