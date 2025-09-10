"""User management API endpoints."""

import sys
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
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
    UserProfileUpdate
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