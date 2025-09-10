"""
Proposal management API endpoints with comprehensive business logic.

This module provides all proposal-related endpoints including creation,
management, acceptance/rejection, media uploads, and PII revelation
with full Hebrew/RTL support and business rule enforcement.
"""

import logging
import uuid
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, UploadFile, File, Form
from sqlalchemy.orm import Session

import sys
sys.path.append("/root/repos/ofair_mvp/libs")
from python_shared.database.connection import get_db
from python_shared.database.models import User, Professional, Lead, Proposal, ProposalStatus

from ..deps import (
    get_current_user, get_current_professional, get_current_user_optional,
    require_proposal_access, require_proposal_owner, require_lead_owner,
    check_proposal_creation_rate_limit, check_proposal_update_rate_limit,
    check_media_upload_rate_limit, validate_media_file, log_proposal_action,
    log_pii_revelation, validate_proposal_status_transition, can_modify_proposal,
    can_upload_media_to_proposal, get_limiter
)
from ..models.proposals import (
    ProposalCreateRequest, ProposalUpdateRequest, ProposalActionRequest,
    MediaUploadRequest, ProposalResponse, ProposalListResponse, ProposalListItem,
    ProposalStatsResponse, PiiRevelationResponse, ValidationErrorResponse,
    ProposalErrorResponse, ProposalSearchFilters, ProposalSearchResponse,
    MediaFileResponse
)
from ..services.proposal_service import ProposalService
from ..services.notification_service import NotificationService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/proposals", tags=["proposals"])
limiter = get_limiter()


@router.post(
    "/",
    response_model=ProposalResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ValidationErrorResponse},
        401: {"model": ProposalErrorResponse},
        403: {"model": ProposalErrorResponse},
        429: {"model": ProposalErrorResponse}
    }
)
@limiter.limit("5/hour")
async def create_proposal(
    request: Request,
    proposal_data: ProposalCreateRequest,
    current_user_data: tuple = Depends(get_current_professional),
    _: None = Depends(check_proposal_creation_rate_limit),
    db: Session = Depends(get_db)
) -> ProposalResponse:
    """
    Submit a new proposal on a lead.
    
    **Requirements:**
    - Must be a verified professional
    - Lead must exist and be active
    - Professional cannot submit multiple proposals on same lead
    - Proposal price must be positive
    - Description must contain meaningful content
    
    **Business Rules:**
    - Only verified professionals can submit proposals
    - Maximum 1 proposal per professional per lead
    - Proposal automatically goes to PENDING status
    - Lead owner receives notification
    
    **Hebrew Support:**
    - Proposal description supports Hebrew/RTL text
    - Price displayed in Israeli Shekels (₪)
    - Notifications sent in Hebrew
    
    **Rate Limits:**
    - 5 proposals per hour per professional
    - 15 proposals per day per professional
    """
    try:
        token_claims, user, professional = current_user_data
        
        # Initialize services
        proposal_service = ProposalService(db)
        notification_service = NotificationService(db)
        
        # Create proposal
        proposal = await proposal_service.create_proposal(
            proposal_data, professional, user
        )
        
        # Log action
        await log_proposal_action(
            user_id=user.id,
            proposal_id=proposal.id,
            action="proposal_created",
            details={
                "lead_id": str(proposal_data.lead_id),
                "price": str(proposal_data.price),
                "professional_id": str(professional.id)
            },
            request=request,
            db=db
        )
        
        # Send notification to lead owner
        await notification_service.send_new_proposal_notification(
            proposal=proposal,
            professional=professional
        )
        
        # Return proposal details
        return await proposal_service.get_proposal_response(proposal.id, professional, user)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create proposal: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create proposal"
        )


@router.get(
    "/{proposal_id}",
    response_model=ProposalResponse,
    responses={
        404: {"model": ProposalErrorResponse},
        403: {"model": ProposalErrorResponse}
    }
)
async def get_proposal(
    proposal_access_data: tuple = Depends(require_proposal_access()),
    db: Session = Depends(get_db)
) -> ProposalResponse:
    """
    Get proposal details.
    
    **Access Control:**
    - Proposal owner (professional) can see full details
    - Lead owner can see proposals on their lead
    - Admin users can see all proposals
    - Others see limited information
    
    **PII Protection:**
    - Client PII only revealed after proposal acceptance
    - Media files accessible based on proposal status
    - Audit logging for PII access
    
    **Response Content:**
    - Proposal details with Hebrew support
    - Professional summary information
    - Lead summary information
    - Media files list
    - Status history
    """
    try:
        proposal, token_claims, user, can_see_full_details = proposal_access_data
        
        proposal_service = ProposalService(db)
        
        # Get professional and user objects if authenticated
        professional = None
        if user and token_claims.role == "professional":
            professional = db.query(Professional).filter(
                Professional.user_id == user.id
            ).first()
        
        return await proposal_service.get_proposal_response(
            proposal.id, professional, user, can_see_full_details
        )
        
    except Exception as e:
        logger.error(f"Failed to get proposal: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve proposal"
        )


@router.put(
    "/{proposal_id}",
    response_model=ProposalResponse,
    responses={
        400: {"model": ValidationErrorResponse},
        403: {"model": ProposalErrorResponse},
        404: {"model": ProposalErrorResponse},
        429: {"model": ProposalErrorResponse}
    }
)
@limiter.limit("20/hour")
async def update_proposal(
    request: Request,
    proposal_data: ProposalUpdateRequest,
    proposal_access_data: tuple = Depends(require_proposal_owner()),
    _: None = Depends(check_proposal_update_rate_limit),
    db: Session = Depends(get_db)
) -> ProposalResponse:
    """
    Update an existing proposal.
    
    **Requirements:**
    - Must be proposal owner (professional who submitted it)
    - Proposal must be in PENDING status
    - At least one field must be updated
    
    **Business Rules:**
    - Only PENDING proposals can be modified
    - Price updates must be positive
    - Lead owner receives notification of updates
    - Update history is tracked
    
    **Hebrew Support:**
    - Updated description supports Hebrew/RTL
    - Notifications sent in Hebrew
    - Audit logs in Hebrew
    
    **Rate Limits:**
    - 20 updates per hour per professional
    """
    try:
        proposal, token_claims, user, professional = proposal_access_data
        
        # Check if proposal can be modified
        if not can_modify_proposal(proposal):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot modify proposal in current status"
            )
        
        # Initialize services
        proposal_service = ProposalService(db)
        notification_service = NotificationService(db)
        
        # Update proposal
        updated_proposal = await proposal_service.update_proposal(
            proposal, proposal_data, professional, user
        )
        
        # Log action
        await log_proposal_action(
            user_id=user.id,
            proposal_id=proposal.id,
            action="proposal_updated",
            details={
                "updates": proposal_data.dict(exclude_unset=True),
                "professional_id": str(professional.id)
            },
            request=request,
            db=db
        )
        
        # Send notification to lead owner
        await notification_service.send_proposal_updated_notification(
            proposal=updated_proposal,
            professional=professional,
            updates=proposal_data.dict(exclude_unset=True)
        )
        
        return await proposal_service.get_proposal_response(updated_proposal.id, professional, user)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update proposal: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update proposal"
        )


@router.post(
    "/{proposal_id}/accept",
    response_model=PiiRevelationResponse,
    responses={
        400: {"model": ProposalErrorResponse},
        403: {"model": ProposalErrorResponse},
        404: {"model": ProposalErrorResponse}
    }
)
async def accept_proposal(
    request: Request,
    action_data: ProposalActionRequest,
    proposal_access_data: tuple = Depends(require_lead_owner()),
    db: Session = Depends(get_db)
) -> PiiRevelationResponse:
    """
    Accept a proposal and reveal client PII.
    
    **Requirements:**
    - Must be lead owner
    - Proposal must be in PENDING status
    - Lead must be active
    
    **Business Process:**
    1. Update proposal status to ACCEPTED
    2. Reveal client PII to professional
    3. Trigger commission calculation
    4. Send notifications to all parties
    5. Create project record
    6. Log PII revelation
    
    **PII Revelation:**
    - Client name, phone, address revealed
    - Full lead description provided
    - Contact access logged for audit
    
    **Hebrew Support:**
    - PII data with Hebrew names/addresses
    - Notifications in Hebrew
    - Success messages in Hebrew
    
    **Integration:**
    - Triggers payment service for commission setup
    - Creates project in project management system
    - Sends notifications via multiple channels
    """
    try:
        proposal, lead, token_claims, user = proposal_access_data
        
        # Validate status transition
        if not validate_proposal_status_transition(proposal.status, ProposalStatus.ACCEPTED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot accept proposal in current status"
            )
        
        # Initialize services
        proposal_service = ProposalService(db)
        notification_service = NotificationService(db)
        
        # Accept proposal and reveal PII
        pii_data = await proposal_service.accept_proposal(
            proposal, lead, user, action_data.reason
        )
        
        # Log PII revelation
        await log_pii_revelation(
            user_id=user.id,
            proposal_id=proposal.id,
            lead_id=lead.id,
            request=request,
            db=db
        )
        
        # Log proposal acceptance
        await log_proposal_action(
            user_id=user.id,
            proposal_id=proposal.id,
            action="proposal_accepted",
            details={
                "lead_id": str(lead.id),
                "reason": action_data.reason,
                "final_amount": str(proposal.price)
            },
            request=request,
            db=db
        )
        
        # Send notifications
        professional = db.query(Professional).filter(
            Professional.id == proposal.professional_id
        ).first()
        
        if professional:
            await notification_service.send_proposal_accepted_notification(
                proposal=proposal,
                professional=professional,
                lead_owner=user,
                pii_data=pii_data
            )
        
        # Trigger commission calculation (async)
        # This would integrate with payments service
        await proposal_service.trigger_commission_calculation(proposal, lead)
        
        return pii_data
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to accept proposal: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to accept proposal"
        )


@router.post(
    "/{proposal_id}/reject",
    response_model=ProposalResponse,
    responses={
        400: {"model": ProposalErrorResponse},
        403: {"model": ProposalErrorResponse},
        404: {"model": ProposalErrorResponse}
    }
)
async def reject_proposal(
    request: Request,
    action_data: ProposalActionRequest,
    proposal_access_data: tuple = Depends(require_lead_owner()),
    db: Session = Depends(get_db)
) -> ProposalResponse:
    """
    Reject a proposal.
    
    **Requirements:**
    - Must be lead owner
    - Proposal must be in PENDING status
    - Optional reason for rejection
    
    **Business Process:**
    1. Update proposal status to REJECTED
    2. Record rejection reason
    3. Send notification to professional
    4. Update professional statistics
    5. Log rejection action
    
    **Professional Impact:**
    - Rejection impacts response rate statistics
    - Professional receives feedback if reason provided
    - No PII revelation occurs
    
    **Hebrew Support:**
    - Rejection reason in Hebrew
    - Notifications in Hebrew
    - Professional feedback in Hebrew
    
    **Rate Limits:**
    - No specific limits on rejections
    - General API rate limits apply
    """
    try:
        proposal, lead, token_claims, user = proposal_access_data
        
        # Validate status transition
        if not validate_proposal_status_transition(proposal.status, ProposalStatus.REJECTED):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reject proposal in current status"
            )
        
        # Initialize services
        proposal_service = ProposalService(db)
        notification_service = NotificationService(db)
        
        # Reject proposal
        rejected_proposal = await proposal_service.reject_proposal(
            proposal, lead, user, action_data.reason
        )
        
        # Log action
        await log_proposal_action(
            user_id=user.id,
            proposal_id=proposal.id,
            action="proposal_rejected",
            details={
                "lead_id": str(lead.id),
                "reason": action_data.reason
            },
            request=request,
            db=db
        )
        
        # Send notification to professional
        professional = db.query(Professional).filter(
            Professional.id == proposal.professional_id
        ).first()
        
        if professional:
            await notification_service.send_proposal_rejected_notification(
                proposal=rejected_proposal,
                professional=professional,
                lead_owner=user,
                reason=action_data.reason
            )
        
        return await proposal_service.get_proposal_response(rejected_proposal.id, professional, user)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to reject proposal: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject proposal"
        )


@router.get(
    "/my",
    response_model=ProposalListResponse,
    responses={
        401: {"model": ProposalErrorResponse}
    }
)
async def get_my_proposals(
    status_filter: Optional[str] = Query(None, description="Filter by proposal status"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user_data: tuple = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProposalListResponse:
    """
    Get current user's proposals.
    
    **Access Control:**
    - Professionals see proposals they submitted
    - Consumers see proposals on their leads
    - Admin users see all proposals
    
    **Filtering:**
    - Filter by proposal status
    - Pagination support
    - Sort by creation date (newest first)
    
    **Response Data:**
    - Proposal summary information
    - Lead details (title, category, location)
    - Professional information
    - Status and timestamps
    - Media count
    
    **Hebrew Support:**
    - All text content in Hebrew/RTL
    - Localized status descriptions
    - Hebrew date formatting
    """
    try:
        token_claims, user = current_user_data
        
        proposal_service = ProposalService(db)
        
        # Get professional if user is professional
        professional = None
        if token_claims.role == "professional":
            professional = db.query(Professional).filter(
                Professional.user_id == user.id
            ).first()
        
        return await proposal_service.get_user_proposals(
            user=user,
            professional=professional,
            status_filter=status_filter,
            page=page,
            per_page=per_page
        )
        
    except Exception as e:
        logger.error(f"Failed to get user proposals: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve proposals"
        )


@router.get(
    "/lead/{lead_id}",
    response_model=ProposalListResponse,
    responses={
        403: {"model": ProposalErrorResponse},
        404: {"model": ProposalErrorResponse}
    }
)
async def get_proposals_for_lead(
    lead_id: uuid.UUID,
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user_data: tuple = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProposalListResponse:
    """
    Get all proposals for a specific lead.
    
    **Requirements:**
    - Must be lead owner or admin
    - Lead must exist
    
    **Access Control:**
    - Lead owners see all proposals on their leads
    - Admin users see all proposals
    - Professionals see only their own proposals
    
    **Business Value:**
    - Compare proposals from different professionals
    - Track proposal response rates
    - Manage proposal acceptance process
    
    **Response Data:**
    - All proposals for the lead
    - Professional comparison information
    - Proposal status and pricing
    - Media file counts
    - Response timestamps
    
    **Hebrew Support:**
    - Professional names and descriptions
    - Proposal content in Hebrew
    - Status descriptions localized
    """
    try:
        token_claims, user = current_user_data
        
        # Check lead access
        lead = db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
        
        # Check permissions
        if (lead.created_by_user_id != user.id and 
            token_claims.role != "admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You can only view proposals on your own leads."
            )
        
        proposal_service = ProposalService(db)
        
        return await proposal_service.get_lead_proposals(
            lead_id=lead_id,
            page=page,
            per_page=per_page
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get lead proposals: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve lead proposals"
        )


@router.post(
    "/{proposal_id}/media",
    response_model=MediaFileResponse,
    responses={
        400: {"model": ValidationErrorResponse},
        403: {"model": ProposalErrorResponse},
        413: {"model": ProposalErrorResponse},
        429: {"model": ProposalErrorResponse}
    }
)
@limiter.limit("10/hour")
async def upload_proposal_media(
    request: Request,
    proposal_id: uuid.UUID,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    proposal_access_data: tuple = Depends(require_proposal_owner()),
    _: None = Depends(check_media_upload_rate_limit),
    db: Session = Depends(get_db)
) -> MediaFileResponse:
    """
    Upload media file for a proposal.
    
    **Requirements:**
    - Must be proposal owner
    - Proposal must be in PENDING status
    - File must meet size and type requirements
    
    **File Restrictions:**
    - Images: JPEG, PNG, GIF, WebP (max 10MB)
    - Documents: PDF, DOC, DOCX, TXT (max 25MB)
    - Videos: MP4, MOV, AVI (max 100MB)
    - Maximum 20 files per proposal
    
    **Processing:**
    - Automatic thumbnail generation for images
    - Virus scanning (in production)
    - Hebrew filename support
    - S3/MinIO storage with CDN
    
    **Hebrew Support:**
    - Hebrew filenames preserved
    - Hebrew file descriptions
    - RTL text in metadata
    
    **Rate Limits:**
    - 10 uploads per hour per professional
    - File size limits enforced
    
    **Security:**
    - File type validation
    - Content scanning
    - Access control via signed URLs
    """
    try:
        proposal, token_claims, user, professional = proposal_access_data
        
        # Check if media can be uploaded
        if not can_upload_media_to_proposal(proposal):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot upload media to proposal in current status"
            )
        
        # Validate file
        validate_media_file(file)
        
        # Initialize service
        proposal_service = ProposalService(db)
        
        # Upload media
        media_file = await proposal_service.upload_proposal_media(
            proposal=proposal,
            file=file,
            description=description,
            professional=professional,
            user=user
        )
        
        # Log action
        await log_proposal_action(
            user_id=user.id,
            proposal_id=proposal.id,
            action="media_uploaded",
            details={
                "filename": file.filename,
                "content_type": file.content_type,
                "file_size": file.size,
                "description": description
            },
            request=request,
            db=db
        )
        
        return media_file
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to upload media: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload media file"
        )


@router.delete(
    "/{proposal_id}/media/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        403: {"model": ProposalErrorResponse},
        404: {"model": ProposalErrorResponse}
    }
)
async def delete_proposal_media(
    request: Request,
    proposal_id: uuid.UUID,
    media_id: uuid.UUID,
    proposal_access_data: tuple = Depends(require_proposal_owner()),
    db: Session = Depends(get_db)
) -> None:
    """
    Delete a media file from a proposal.
    
    **Requirements:**
    - Must be proposal owner
    - Proposal must be in PENDING status
    - Media file must exist
    
    **Business Rules:**
    - Only PENDING proposals can have media deleted
    - Deletion removes file from storage
    - Action is logged for audit
    
    **Process:**
    1. Validate ownership and status
    2. Remove file from S3/MinIO storage
    3. Delete database record
    4. Log deletion action
    
    **Hebrew Support:**
    - Audit logs in Hebrew
    - Error messages localized
    """
    try:
        proposal, token_claims, user, professional = proposal_access_data
        
        # Check if media can be deleted
        if not can_modify_proposal(proposal):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete media from proposal in current status"
            )
        
        # Initialize service
        proposal_service = ProposalService(db)
        
        # Delete media
        await proposal_service.delete_proposal_media(
            proposal=proposal,
            media_id=media_id,
            professional=professional,
            user=user
        )
        
        # Log action
        await log_proposal_action(
            user_id=user.id,
            proposal_id=proposal.id,
            action="media_deleted",
            details={
                "media_id": str(media_id)
            },
            request=request,
            db=db
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to delete media: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete media file"
        )


@router.get(
    "/stats",
    response_model=ProposalStatsResponse,
    responses={
        401: {"model": ProposalErrorResponse}
    }
)
async def get_proposal_stats(
    current_user_data: tuple = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProposalStatsResponse:
    """
    Get proposal statistics for current user.
    
    **Access Control:**
    - Professionals see their proposal statistics
    - Consumers see statistics for their leads
    - Admin users see global statistics
    
    **Statistics Include:**
    - Total proposals (submitted/received)
    - Acceptance/rejection rates
    - Average response times
    - Total value of accepted proposals
    - Media upload statistics
    
    **Business Intelligence:**
    - Performance tracking for professionals
    - Lead quality metrics for consumers
    - Platform health metrics for admins
    
    **Hebrew Support:**
    - Localized statistic descriptions
    - Hebrew number formatting
    - Currency in Israeli Shekels
    """
    try:
        token_claims, user = current_user_data
        
        proposal_service = ProposalService(db)
        
        # Get professional if user is professional
        professional = None
        if token_claims.role == "professional":
            professional = db.query(Professional).filter(
                Professional.user_id == user.id
            ).first()
        
        return await proposal_service.get_user_stats(
            user=user,
            professional=professional,
            role=token_claims.role
        )
        
    except Exception as e:
        logger.error(f"Failed to get proposal stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve proposal statistics"
        )


@router.get(
    "/search",
    response_model=ProposalSearchResponse,
    responses={
        401: {"model": ProposalErrorResponse}
    }
)
async def search_proposals(
    filters: ProposalSearchFilters = Depends(),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user_data: tuple = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ProposalSearchResponse:
    """
    Search proposals with advanced filters.
    
    **Search Filters:**
    - Proposal status
    - Lead category
    - Price range
    - Date range
    - Professional/Lead ID
    
    **Access Control:**
    - Users see only proposals they have access to
    - Admins see all proposals
    - Results filtered by permissions
    
    **Search Features:**
    - Full-text search in descriptions
    - Sorting by multiple criteria
    - Pagination support
    - Filter combination
    
    **Hebrew Support:**
    - Hebrew text search
    - RTL content handling
    - Localized filter descriptions
    
    **Performance:**
    - Indexed search fields
    - Efficient query optimization
    - Caching for common searches
    """
    try:
        token_claims, user = current_user_data
        
        proposal_service = ProposalService(db)
        
        # Get professional if user is professional
        professional = None
        if token_claims.role == "professional":
            professional = db.query(Professional).filter(
                Professional.user_id == user.id
            ).first()
        
        return await proposal_service.search_proposals(
            user=user,
            professional=professional,
            filters=filters,
            page=page,
            per_page=per_page,
            role=token_claims.role
        )
        
    except Exception as e:
        logger.error(f"Failed to search proposals: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search proposals"
        )