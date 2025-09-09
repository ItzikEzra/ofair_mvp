"""Professional profile API endpoints."""

import sys
import uuid
import logging
from typing import List, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_, or_
from sqlalchemy.orm import joinedload

# Add libs to path
sys.path.append("/app/libs")
from python_shared.database.models import (
    Professional, 
    User, 
    ProfessionalStatus, 
    UserRole
)

from deps import (
    get_current_active_user, 
    get_db_session, 
    set_row_level_security,
    TokenClaims,
    require_admin,
    require_professional,
    validate_hebrew_text,
    validate_israeli_location,
    validate_specialties,
    validate_file_upload
)
from models.professionals import (
    Professional as ProfessionalModel,
    ProfessionalCreate,
    ProfessionalUpdate,
    ProfessionalPublic,
    ProfessionalPublicDetail,
    ProfessionalWithUser,
    ProfessionalVerification,
    ProfessionalStats,
    CertificateUploadRequest,
    CertificateUploadResponse
)
from services.s3_service import S3Service
from services.professional_service import ProfessionalService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("", response_model=List[ProfessionalPublic])
async def get_professionals_public(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Number of records to return"),
    profession: Optional[str] = Query(None, description="Filter by profession"),
    location: Optional[str] = Query(None, description="Filter by location"),
    specialties: Optional[List[str]] = Query(None, description="Filter by specialties"),
    verified_only: bool = Query(False, description="Show only verified professionals"),
    min_rating: Optional[float] = Query(None, ge=0, le=5, description="Minimum rating filter"),
    db: AsyncSession = Depends(get_db_session)
) -> List[ProfessionalPublic]:
    """
    Get public list of professionals.
    
    Public endpoint that returns professional profiles without PII.
    No phone numbers or sensitive information is exposed.
    """
    try:
        # Build query
        query = (
            select(Professional)
            .where(Professional.status == ProfessionalStatus.ACTIVE)
            .order_by(Professional.is_verified.desc(), Professional.rating.desc())
        )
        
        # Apply filters
        if profession:
            query = query.where(Professional.profession.ilike(f"%{profession}%"))
        
        if location:
            query = query.where(Professional.location.ilike(f"%{location}%"))
        
        if specialties:
            for specialty in specialties:
                query = query.where(Professional.specialties.any(specialty))
        
        if verified_only:
            query = query.where(Professional.is_verified == True)
        
        if min_rating is not None:
            query = query.where(Professional.rating >= Decimal(str(min_rating)))
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        professionals = result.scalars().all()
        
        return [ProfessionalPublic.from_orm(prof) for prof in professionals]
        
    except Exception as e:
        logger.error(f"Error fetching public professionals: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/{professional_id}", response_model=ProfessionalPublicDetail)
async def get_professional_public(
    professional_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session)
) -> ProfessionalPublicDetail:
    """
    Get public professional profile.
    
    Public endpoint that returns a single professional profile without PII.
    """
    try:
        query = (
            select(Professional)
            .where(
                and_(
                    Professional.id == professional_id,
                    Professional.status == ProfessionalStatus.ACTIVE
                )
            )
        )
        
        result = await db.execute(query)
        professional = result.scalar_one_or_none()
        
        if not professional:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professional not found"
            )
        
        return ProfessionalPublicDetail.from_orm(professional)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching public professional {professional_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/profile", response_model=ProfessionalModel)
async def create_professional_profile(
    professional_data: ProfessionalCreate,
    current_user: TokenClaims = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db_session)
) -> ProfessionalModel:
    """
    Create professional profile.
    
    Creates a professional profile for the authenticated user.
    Requires the user to not already have a professional profile.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)
        
        # Check if professional profile already exists
        existing_query = select(Professional).where(Professional.user_id == current_user.user_id)
        result = await db.execute(existing_query)
        existing_prof = result.scalar_one_or_none()
        
        if existing_prof:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Professional profile already exists"
            )
        
        # Validate inputs
        validate_hebrew_text(professional_data.profession, "profession")
        if professional_data.company_name:
            validate_hebrew_text(professional_data.company_name, "company_name")
        validate_israeli_location(professional_data.location)
        validate_specialties(professional_data.specialties)
        
        # Create new professional profile
        new_professional = Professional(
            user_id=current_user.user_id,
            profession=professional_data.profession,
            company_name=professional_data.company_name,
            specialties=professional_data.specialties,
            location=professional_data.location,
            status=ProfessionalStatus.PENDING  # Starts as pending verification
        )
        
        db.add(new_professional)
        await db.commit()
        await db.refresh(new_professional)
        
        # Update user role to professional if needed
        if current_user.role == UserRole.CONSUMER.value:
            user_update = (
                update(User)
                .where(User.id == current_user.user_id)
                .values(role=UserRole.PROFESSIONAL)
            )
            await db.execute(user_update)
            await db.commit()
        
        logger.info(f"Professional profile created for user {current_user.user_id}")
        return ProfessionalModel.from_orm(new_professional)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating professional profile for {current_user.user_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.put("/profile", response_model=ProfessionalModel)
async def update_professional_profile(
    professional_update: ProfessionalUpdate,
    current_user: TokenClaims = Depends(require_professional()),
    db: AsyncSession = Depends(get_db_session)
) -> ProfessionalModel:
    """
    Update professional profile.
    
    Updates the professional profile for the authenticated user.
    Requires professional role.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)
        
        # Get existing professional profile
        query = select(Professional).where(Professional.user_id == current_user.user_id)
        result = await db.execute(query)
        professional = result.scalar_one_or_none()
        
        if not professional:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professional profile not found"
            )
        
        # Build update data
        update_data = {}
        
        if professional_update.profession is not None:
            validate_hebrew_text(professional_update.profession, "profession")
            update_data["profession"] = professional_update.profession
        
        if professional_update.company_name is not None:
            if professional_update.company_name:
                validate_hebrew_text(professional_update.company_name, "company_name")
            update_data["company_name"] = professional_update.company_name
        
        if professional_update.location is not None:
            validate_israeli_location(professional_update.location)
            update_data["location"] = professional_update.location
        
        if professional_update.specialties is not None:
            validate_specialties(professional_update.specialties)
            update_data["specialties"] = professional_update.specialties
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No valid update data provided"
            )
        
        # If profile was previously verified and key fields changed, reset verification
        if professional.is_verified and any(
            key in update_data for key in ["profession", "company_name", "specialties"]
        ):
            update_data["is_verified"] = False
            update_data["status"] = ProfessionalStatus.PENDING
        
        # Update professional
        update_query = (
            update(Professional)
            .where(Professional.user_id == current_user.user_id)
            .values(**update_data)
        )
        
        await db.execute(update_query)
        await db.commit()
        
        # Fetch updated professional
        result = await db.execute(query)
        updated_professional = result.scalar_one()
        
        logger.info(f"Professional profile updated for user {current_user.user_id}")
        return ProfessionalModel.from_orm(updated_professional)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating professional profile for {current_user.user_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/profile/me", response_model=ProfessionalModel)
async def get_my_professional_profile(
    current_user: TokenClaims = Depends(require_professional()),
    db: AsyncSession = Depends(get_db_session)
) -> ProfessionalModel:
    """
    Get my professional profile.
    
    Returns the professional profile for the authenticated user.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)
        
        query = select(Professional).where(Professional.user_id == current_user.user_id)
        result = await db.execute(query)
        professional = result.scalar_one_or_none()
        
        if not professional:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professional profile not found"
            )
        
        return ProfessionalModel.from_orm(professional)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching professional profile for {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/{professional_id}/verify")
async def verify_professional(
    professional_id: uuid.UUID,
    verification: ProfessionalVerification,
    current_user: TokenClaims = Depends(require_admin()),
    db: AsyncSession = Depends(get_db_session)
) -> dict:
    """
    Verify professional profile.
    
    Admin-only endpoint to verify or reject professional profiles.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)
        
        # Get professional
        query = select(Professional).where(Professional.id == professional_id)
        result = await db.execute(query)
        professional = result.scalar_one_or_none()
        
        if not professional:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professional not found"
            )
        
        # Validate status
        try:
            new_status = ProfessionalStatus(verification.verification_status)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid verification status"
            )
        
        # Use professional service for verification
        prof_service = ProfessionalService()
        await prof_service.verify_professional(
            db=db,
            professional_id=professional_id,
            status=new_status,
            admin_user_id=current_user.user_id,
            notes=verification.admin_notes
        )
        
        logger.info(f"Professional {professional_id} verified by admin {current_user.user_id}")
        return {
            "message": "Professional verification updated successfully",
            "status": verification.verification_status
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying professional {professional_id}: {e}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post("/certificates/upload", response_model=CertificateUploadResponse)
async def upload_certificate(
    upload_request: CertificateUploadRequest,
    current_user: TokenClaims = Depends(require_professional()),
    db: AsyncSession = Depends(get_db_session)
) -> CertificateUploadResponse:
    """
    Get certificate upload URL.
    
    Returns a pre-signed S3 URL for uploading professional certificates.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)
        
        # Validate file parameters
        validate_file_upload(
            upload_request.filename,
            10 * 1024 * 1024,  # Assume 10MB for now
            'certificates'
        )
        
        # Get professional profile
        query = select(Professional).where(Professional.user_id == current_user.user_id)
        result = await db.execute(query)
        professional = result.scalar_one_or_none()
        
        if not professional:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professional profile not found"
            )
        
        # Generate upload URL using S3 service
        s3_service = S3Service()
        upload_url, file_key = await s3_service.generate_certificate_upload_url(
            professional_id=professional.id,
            filename=upload_request.filename,
            file_type=upload_request.file_type
        )
        
        logger.info(f"Certificate upload URL generated for professional {professional.id}")
        return CertificateUploadResponse(
            upload_url=upload_url,
            file_key=file_key,
            expires_in=3600  # 1 hour
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating certificate upload URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get("/stats/me", response_model=ProfessionalStats)
async def get_my_professional_stats(
    current_user: TokenClaims = Depends(require_professional()),
    db: AsyncSession = Depends(get_db_session)
) -> ProfessionalStats:
    """
    Get professional statistics.
    
    Returns statistics for the authenticated professional.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)
        
        # Get professional profile
        query = select(Professional).where(Professional.user_id == current_user.user_id)
        result = await db.execute(query)
        professional = result.scalar_one_or_none()
        
        if not professional:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Professional profile not found"
            )
        
        # Use professional service to get stats
        prof_service = ProfessionalService()
        stats = await prof_service.get_professional_stats(db, professional.id)
        
        return stats
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching professional stats for {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


# Admin endpoints for professional management
@router.get("/admin/all", response_model=List[ProfessionalWithUser])
async def get_all_professionals_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: TokenClaims = Depends(require_admin()),
    db: AsyncSession = Depends(get_db_session)
) -> List[ProfessionalWithUser]:
    """
    Get all professionals (admin only).
    
    Returns professional profiles with user information for admin management.
    """
    try:
        # Set RLS context
        await set_row_level_security(db, current_user.user_id, current_user.role)
        
        # Build query with user join
        query = (
            select(Professional, User.name, User.phone, User.email)
            .join(User, Professional.user_id == User.id)
            .order_by(Professional.created_at.desc())
        )
        
        # Apply status filter
        if status:
            try:
                status_enum = ProfessionalStatus(status)
                query = query.where(Professional.status == status_enum)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Invalid status filter"
                )
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        result = await db.execute(query)
        rows = result.all()
        
        professionals_with_user = []
        for prof, user_name, user_phone, user_email in rows:
            prof_dict = ProfessionalModel.from_orm(prof).dict()
            prof_dict.update({
                "user_name": user_name,
                "user_phone": user_phone,
                "user_email": user_email
            })
            professionals_with_user.append(ProfessionalWithUser(**prof_dict))
        
        return professionals_with_user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching all professionals for admin: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )