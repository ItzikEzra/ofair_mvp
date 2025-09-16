"""User management API endpoints."""

import sys
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from sqlalchemy.orm import joinedload

# Add libs to path
sys.path.append("/app/libs")
from python_shared.database.models import User, UserProfile, UserRole

from ..deps import (
    get_current_active_user, 
    get_db_session, 
    set_row_level_security,
    TokenClaims,
    validate_hebrew_text,
    normalize_israeli_phone
)
from ..models.users import (
    UserMe,
    UserUpdate,
    UserProfile as UserProfileModel,
    UserProfileCreate,
    UserProfileUpdate,
    ProfessionalRegistration,
    ProfessionalRegistrationResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/me", response_model=UserMe)
async def get_current_user_profile(
    current_user: TokenClaims = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session)
) -> UserMe:
    """
    Get current user profile.
    
    Returns full user information including PII for the authenticated user.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)
        
        # Query user with profile
        query = (
            select(User)
            .options(joinedload(User.user_profile))
            .where(User.id == current_user.user_id)
        )
        
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return UserMe.from_orm(user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user profile for {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.put("/me", response_model=UserMe)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: TokenClaims = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session)
) -> UserMe:
    """
    Update current user profile.
    
    Allows users to update their own profile information.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)
        
        # Build update data
        update_data = {}
        
        if user_update.name is not None:
            validate_hebrew_text(user_update.name, "name")
            update_data["name"] = user_update.name
        
        if user_update.phone is not None:
            normalized_phone = normalize_israeli_phone(user_update.phone)
            update_data["phone"] = normalized_phone
        
        if user_update.email is not None:
            update_data["email"] = user_update.email
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No valid update data provided"
            )
        
        # Update user
        update_query = (
            update(User)
            .where(User.id == current_user.user_id)
            .values(**update_data)
        )
        
        await db.execute(update_query)
        await db.commit()
        
        # Fetch updated user
        query = (
            select(User)
            .options(joinedload(User.user_profile))
            .where(User.id == current_user.user_id)
        )
        
        result = await db.execute(query)
        updated_user = result.scalar_one()
        
        logger.info(f"User {current_user.user_id} updated profile")
        return UserMe.from_orm(updated_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile for {current_user.user_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/me/profile", response_model=UserProfileModel)
async def create_user_profile(
    profile_data: UserProfileCreate,
    current_user: TokenClaims = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session)
) -> UserProfileModel:
    """
    Create user profile.
    
    Creates a consumer profile for the authenticated user.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)
        
        # Check if profile already exists
        existing_query = select(UserProfile).where(UserProfile.user_id == current_user.user_id)
        result = await db.execute(existing_query)
        existing_profile = result.scalar_one_or_none()
        
        if existing_profile:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User profile already exists"
            )
        
        # Validate address if provided
        if profile_data.address:
            validate_hebrew_text(profile_data.address, "address")
        
        # Create new profile
        new_profile = UserProfile(
            user_id=current_user.user_id,
            address=profile_data.address,
            preferences=profile_data.preferences or {}
        )
        
        db.add(new_profile)
        await db.commit()
        await db.refresh(new_profile)
        
        logger.info(f"User profile created for user {current_user.user_id}")
        return UserProfileModel.from_orm(new_profile)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating user profile for {current_user.user_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.put("/me/profile", response_model=UserProfileModel)
async def update_user_profile(
    profile_update: UserProfileUpdate,
    current_user: TokenClaims = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session)
) -> UserProfileModel:
    """
    Update user profile.
    
    Updates the consumer profile for the authenticated user.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)
        
        # Get existing profile
        query = select(UserProfile).where(UserProfile.user_id == current_user.user_id)
        result = await db.execute(query)
        profile = result.scalar_one_or_none()
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        # Build update data
        update_data = {}
        
        if profile_update.address is not None:
            if profile_update.address:
                validate_hebrew_text(profile_update.address, "address")
            update_data["address"] = profile_update.address
        
        if profile_update.preferences is not None:
            update_data["preferences"] = profile_update.preferences
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No valid update data provided"
            )
        
        # Update profile
        update_query = (
            update(UserProfile)
            .where(UserProfile.user_id == current_user.user_id)
            .values(**update_data)
        )
        
        await db.execute(update_query)
        await db.commit()
        
        # Fetch updated profile
        result = await db.execute(query)
        updated_profile = result.scalar_one()
        
        logger.info(f"User profile updated for user {current_user.user_id}")
        return UserProfileModel.from_orm(updated_profile)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile for {current_user.user_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/me/profile", response_model=Optional[UserProfileModel])
async def get_user_profile(
    current_user: TokenClaims = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session)
) -> Optional[UserProfileModel]:
    """
    Get user profile.
    
    Returns the consumer profile for the authenticated user.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)
        
        # Query profile
        query = select(UserProfile).where(UserProfile.user_id == current_user.user_id)
        result = await db.execute(query)
        profile = result.scalar_one_or_none()
        
        if not profile:
            return None
        
        return UserProfileModel.from_orm(profile)
        
    except Exception as e:
        logger.error(f"Error fetching user profile for {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.delete("/me/profile")
async def delete_user_profile(
    current_user: TokenClaims = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session)
) -> dict:
    """
    Delete user profile.

    Deletes the consumer profile for the authenticated user.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)

        # Get existing profile
        query = select(UserProfile).where(UserProfile.user_id == current_user.user_id)
        result = await db.execute(query)
        profile = result.scalar_one_or_none()

        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )

        # Delete profile
        await db.delete(profile)
        await db.commit()

        logger.info(f"User profile deleted for user {current_user.user_id}")
        return {"message": "Profile deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting user profile for {current_user.user_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/register/professional", response_model=ProfessionalRegistrationResponse)
async def register_professional(
    registration_data: ProfessionalRegistration,
    db: AsyncSession = Depends(get_db_session)
) -> ProfessionalRegistrationResponse:
    """
    Register new professional.

    Creates both a user account and professional profile in a single transaction.
    Public endpoint for new professional registration.
    """
    try:
        # Check if user already exists with this phone number
        existing_user_query = select(User).where(User.phone == registration_data.phone)
        result = await db.execute(existing_user_query)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            return ProfessionalRegistrationResponse(
                success=False,
                message="Phone number already registered. Please use login instead.",
                message_he="מספר הטלפון כבר רשום במערכת. אנא השתמש בהתחברות."
            )

        # Check if email is already used (if provided)
        if registration_data.email:
            existing_email_query = select(User).where(User.email == registration_data.email)
            result = await db.execute(existing_email_query)
            existing_email_user = result.scalar_one_or_none()

            if existing_email_user:
                return ProfessionalRegistrationResponse(
                    success=False,
                    message="Email address already registered. Please use a different email.",
                    message_he="כתובת האימייל כבר רשומה במערכת. אנא השתמש בכתובת אימייל אחרת."
                )

        # Validate inputs
        validate_hebrew_text(registration_data.business_name, "business_name")
        validate_hebrew_text(registration_data.profession, "profession")
        validate_hebrew_text(registration_data.service_area, "service_area")
        validate_hebrew_text(registration_data.description, "description")

        # Normalize phone number
        normalized_phone = normalize_israeli_phone(registration_data.phone)

        # Create full name from first and last name
        full_name = f"{registration_data.first_name} {registration_data.last_name}"

        # Create new user using raw SQL to avoid enum issues
        from sqlalchemy import text
        import uuid

        user_id = uuid.uuid4()
        user_insert_query = """
            INSERT INTO users (id, name, phone, email, role, status)
            VALUES (:id, :name, :phone, :email, :role, :status)
        """

        await db.execute(
            text(user_insert_query),
            {
                'id': user_id,
                'name': full_name,
                'phone': normalized_phone,
                'email': registration_data.email,
                'role': 'professional',
                'status': 'active'
            }
        )

        # Create professional profile using raw SQL
        professional_profile_query = """
            INSERT INTO professional_profiles
            (user_id, business_name, business_number, specialties, service_areas,
             experience_years, rating, total_reviews, verified, portfolio_items,
             certifications, availability, pricing_info)
            VALUES (:user_id, :business_name, :business_number, :specialties, :service_areas,
             :experience_years, :rating, :total_reviews, :verified, :portfolio_items,
             :certifications, :availability, :pricing_info)
            RETURNING id
        """

        import json

        result = await db.execute(
            text(professional_profile_query),
            {
                'user_id': user_id,
                'business_name': registration_data.business_name,
                'business_number': registration_data.business_number,
                'specialties': [registration_data.profession],  # PostgreSQL array
                'service_areas': [registration_data.service_area],  # PostgreSQL array
                'experience_years': registration_data.experience_years,
                'rating': 0.0,
                'total_reviews': 0,
                'verified': False,
                'portfolio_items': json.dumps([]),
                'certifications': json.dumps([]),
                'availability': json.dumps({}),
                'pricing_info': json.dumps({"description": registration_data.description})
            }
        )

        professional_profile_result = result.fetchone()
        professional_profile_id = professional_profile_result[0]

        await db.commit()

        logger.info(f"New professional registered: {user_id} - {registration_data.phone}")

        return ProfessionalRegistrationResponse(
            success=True,
            message="Registration successful! You can now login with your phone number.",
            message_he="הרשמה הושלמה בהצלחה! כעת ניתן להתחבר עם מספר הטלפון שלך.",
            user_id=user_id,
            professional_id=professional_profile_id
        )

    except Exception as e:
        logger.error(f"Error in professional registration: {e}")
        await db.rollback()

        return ProfessionalRegistrationResponse(
            success=False,
            message="Registration failed due to server error. Please try again later.",
            message_he="הרשמה נכשלה עקב שגיאת שרת. אנא נסה שוב מאוחר יותר."
        )