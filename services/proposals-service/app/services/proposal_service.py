"""
Proposal service with comprehensive business logic.

This module handles all proposal-related business operations including
creation, updates, acceptance/rejection, media handling, PII revelation,
and commission calculation integration.
"""

import logging
import uuid
import os
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from fastapi import UploadFile, HTTPException, status

import sys
sys.path.append("/root/repos/ofair_mvp/libs")
from python_shared.database.models import (
    User, Professional, Lead, ConsumerLead, ProfessionalLead, Proposal,
    ProposalStatus, LeadStatus, ProfessionalStatus
)
from python_shared.config.settings import get_settings

from ..models.proposals import (
    ProposalCreateRequest, ProposalUpdateRequest, ProposalResponse,
    ProposalListResponse, ProposalListItem, ProposalStatsResponse,
    PiiRevelationResponse, MediaFileResponse, ProposalSearchFilters,
    ProposalSearchResponse, ProfessionalSummary, LeadSummary,
    MediaTypeEnum
)

logger = logging.getLogger(__name__)


class ProposalService:
    """Service class for proposal operations."""
    
    def __init__(self, db: Session):
        self.db = db
        self.settings = get_settings()
    
    async def create_proposal(
        self,
        proposal_data: ProposalCreateRequest,
        professional: Professional,
        user: User
    ) -> Proposal:
        """
        Create a new proposal with business validation.
        
        Args:
            proposal_data: Proposal creation data
            professional: Professional submitting the proposal
            user: User object
            
        Returns:
            Created proposal object
            
        Raises:
            ValueError: If business rules are violated
        """
        # Validate lead exists and is active
        lead = self.db.query(Lead).filter(Lead.id == proposal_data.lead_id).first()
        if not lead:
            raise ValueError("Lead not found")
        
        if lead.status != LeadStatus.ACTIVE:
            raise ValueError("Cannot submit proposal on inactive lead")
        
        # Check if professional already has a proposal on this lead
        existing_proposal = self.db.query(Proposal).filter(
            and_(
                Proposal.lead_id == proposal_data.lead_id,
                Proposal.professional_id == professional.id
            )
        ).first()
        
        if existing_proposal:
            raise ValueError("You have already submitted a proposal for this lead")
        
        # Validate professional status
        if professional.status != ProfessionalStatus.ACTIVE:
            raise ValueError("Professional account must be active to submit proposals")
        
        if not professional.is_verified:
            raise ValueError("Professional must be verified to submit proposals")
        
        # Create proposal
        proposal = Proposal(
            lead_id=proposal_data.lead_id,
            professional_id=professional.id,
            price=proposal_data.price,
            description=proposal_data.description,
            scheduled_date=proposal_data.scheduled_date,
            status=ProposalStatus.PENDING,
            media_urls=[]  # Start with empty media list
        )
        
        # Add estimated duration if provided
        if proposal_data.estimated_duration_days:
            # Store in proposal metadata or separate field
            pass
        
        self.db.add(proposal)
        self.db.commit()
        self.db.refresh(proposal)
        
        logger.info(f"Created proposal {proposal.id} for lead {lead.id} by professional {professional.id}")
        
        return proposal
    
    async def update_proposal(
        self,
        proposal: Proposal,
        proposal_data: ProposalUpdateRequest,
        professional: Professional,
        user: User
    ) -> Proposal:
        """
        Update an existing proposal.
        
        Args:
            proposal: Proposal to update
            proposal_data: Update data
            professional: Professional updating the proposal
            user: User object
            
        Returns:
            Updated proposal object
            
        Raises:
            ValueError: If business rules are violated
        """
        # Validate proposal can be updated
        if proposal.status != ProposalStatus.PENDING:
            raise ValueError("Only pending proposals can be updated")
        
        # Update fields if provided
        if proposal_data.price is not None:
            proposal.price = proposal_data.price
        
        if proposal_data.description is not None:
            proposal.description = proposal_data.description
        
        if proposal_data.scheduled_date is not None:
            proposal.scheduled_date = proposal_data.scheduled_date
        
        # Update timestamp
        proposal.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(proposal)
        
        logger.info(f"Updated proposal {proposal.id} by professional {professional.id}")
        
        return proposal
    
    async def accept_proposal(
        self,
        proposal: Proposal,
        lead: Lead,
        lead_owner: User,
        reason: Optional[str] = None
    ) -> PiiRevelationResponse:
        """
        Accept a proposal and reveal client PII.
        
        Args:
            proposal: Proposal to accept
            lead: Lead associated with the proposal
            lead_owner: User who owns the lead
            reason: Optional reason for acceptance
            
        Returns:
            PII revelation data
            
        Raises:
            ValueError: If business rules are violated
        """
        # Validate proposal status
        if proposal.status != ProposalStatus.PENDING:
            raise ValueError("Only pending proposals can be accepted")
        
        # Update proposal status
        proposal.status = ProposalStatus.ACCEPTED
        proposal.accepted_at = datetime.utcnow()
        
        # Set final amount on lead
        lead.final_amount = proposal.price
        
        # Get client PII based on lead type
        if lead.type.value == "consumer":
            consumer_lead = self.db.query(ConsumerLead).filter(
                ConsumerLead.lead_id == lead.id
            ).first()
            
            if not consumer_lead:
                raise ValueError("Consumer lead details not found")
            
            pii_data = PiiRevelationResponse(
                client_name=consumer_lead.client_name,
                client_phone=consumer_lead.client_phone,
                client_address=consumer_lead.client_address,
                client_email="",  # Add email field to model if needed
                full_description=consumer_lead.full_description,
                revealed_at=datetime.utcnow()
            )
            
        elif lead.type.value == "professional_referral":
            professional_lead = self.db.query(ProfessionalLead).filter(
                ProfessionalLead.lead_id == lead.id
            ).first()
            
            if not professional_lead:
                raise ValueError("Professional lead details not found")
            
            pii_data = PiiRevelationResponse(
                client_name=professional_lead.client_name,
                client_phone=professional_lead.client_phone,
                client_address="",  # Professional leads may not have full address
                client_email="",
                full_description=lead.short_description,  # Professional leads use main description
                revealed_at=datetime.utcnow()
            )
        
        else:
            raise ValueError("Unknown lead type")
        
        self.db.commit()
        
        logger.info(f"Accepted proposal {proposal.id}, revealed PII to professional {proposal.professional_id}")
        
        return pii_data
    
    async def reject_proposal(
        self,
        proposal: Proposal,
        lead: Lead,
        lead_owner: User,
        reason: Optional[str] = None
    ) -> Proposal:
        """
        Reject a proposal.
        
        Args:
            proposal: Proposal to reject
            lead: Lead associated with the proposal
            lead_owner: User who owns the lead
            reason: Optional reason for rejection
            
        Returns:
            Updated proposal object
            
        Raises:
            ValueError: If business rules are violated
        """
        # Validate proposal status
        if proposal.status != ProposalStatus.PENDING:
            raise ValueError("Only pending proposals can be rejected")
        
        # Update proposal status
        proposal.status = ProposalStatus.REJECTED
        proposal.rejected_at = datetime.utcnow()
        
        # Store rejection reason if provided
        if reason:
            # Store in proposal metadata or separate field
            pass
        
        self.db.commit()
        self.db.refresh(proposal)
        
        logger.info(f"Rejected proposal {proposal.id} with reason: {reason}")
        
        return proposal
    
    async def upload_proposal_media(
        self,
        proposal: Proposal,
        file: UploadFile,
        description: Optional[str],
        professional: Professional,
        user: User
    ) -> MediaFileResponse:
        """
        Upload media file for a proposal.
        
        Args:
            proposal: Proposal to upload media for
            file: File to upload
            description: Optional file description
            professional: Professional uploading the file
            user: User object
            
        Returns:
            Media file information
            
        Raises:
            ValueError: If business rules are violated
        """
        from ..deps import get_s3_client, generate_media_url
        
        # Check proposal media count limit
        current_media_count = len(proposal.media_urls or [])
        if current_media_count >= 20:
            raise ValueError("Maximum 20 media files allowed per proposal")
        
        # Generate unique filename
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"proposals/{proposal.id}/{uuid.uuid4()}{file_extension}"
        
        try:
            # Upload to S3/MinIO
            s3_client = await get_s3_client()
            
            # Read file content
            file_content = await file.read()
            
            # Upload file
            s3_client.put_object(
                Bucket=self.settings.s3_bucket,
                Key=unique_filename,
                Body=file_content,
                ContentType=file.content_type,
                Metadata={
                    'original_filename': file.filename,
                    'description': description or '',
                    'proposal_id': str(proposal.id),
                    'professional_id': str(professional.id)
                }
            )
            
            # Generate access URL
            media_url = await generate_media_url(unique_filename)
            
            # Update proposal media URLs
            if not proposal.media_urls:
                proposal.media_urls = []
            
            proposal.media_urls.append(unique_filename)
            self.db.commit()
            
            # Determine media type
            if file.content_type.startswith('image/'):
                media_type = MediaTypeEnum.IMAGE
            elif file.content_type.startswith('video/'):
                media_type = MediaTypeEnum.VIDEO
            else:
                media_type = MediaTypeEnum.DOCUMENT
            
            # Create response
            media_response = MediaFileResponse(
                id=uuid.uuid4(),  # Generate temporary ID
                filename=unique_filename,
                original_filename=file.filename,
                content_type=file.content_type,
                file_size=file.size,
                description=description,
                url=media_url,
                thumbnail_url=None,  # TODO: Generate thumbnails for images
                media_type=media_type,
                uploaded_at=datetime.utcnow()
            )
            
            logger.info(f"Uploaded media file {unique_filename} for proposal {proposal.id}")
            
            return media_response
            
        except Exception as e:
            logger.error(f"Failed to upload media file: {e}")
            raise ValueError(f"Failed to upload file: {str(e)}")
    
    async def delete_proposal_media(
        self,
        proposal: Proposal,
        media_id: uuid.UUID,
        professional: Professional,
        user: User
    ) -> None:
        """
        Delete media file from a proposal.
        
        Args:
            proposal: Proposal to delete media from
            media_id: ID of media to delete (filename in this case)
            professional: Professional deleting the file
            user: User object
            
        Raises:
            ValueError: If business rules are violated
        """
        from ..deps import get_s3_client
        
        # Find media file by ID (simplified - in practice you'd have a media table)
        media_filename = None
        if proposal.media_urls:
            # For now, assume media_id maps to filename
            # In production, you'd have a proper media table
            media_filename = str(media_id)  # Simplified
        
        if not media_filename or media_filename not in (proposal.media_urls or []):
            raise ValueError("Media file not found")
        
        try:
            # Delete from S3/MinIO
            s3_client = await get_s3_client()
            s3_client.delete_object(
                Bucket=self.settings.s3_bucket,
                Key=media_filename
            )
            
            # Remove from proposal
            proposal.media_urls.remove(media_filename)
            self.db.commit()
            
            logger.info(f"Deleted media file {media_filename} from proposal {proposal.id}")
            
        except Exception as e:
            logger.error(f"Failed to delete media file: {e}")
            raise ValueError(f"Failed to delete file: {str(e)}")
    
    async def get_proposal_response(
        self,
        proposal_id: uuid.UUID,
        professional: Optional[Professional],
        user: Optional[User],
        can_see_full_details: bool = True
    ) -> ProposalResponse:
        """
        Get detailed proposal response.
        
        Args:
            proposal_id: ID of proposal to get
            professional: Professional making the request
            user: User making the request
            can_see_full_details: Whether user can see full details
            
        Returns:
            Detailed proposal information
        """
        proposal = self.db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            raise ValueError("Proposal not found")
        
        # Get related data
        prop_professional = self.db.query(Professional).filter(
            Professional.id == proposal.professional_id
        ).first()
        
        prop_user = self.db.query(User).filter(
            User.id == prop_professional.user_id
        ).first()
        
        lead = self.db.query(Lead).filter(Lead.id == proposal.lead_id).first()
        
        # Build professional summary
        professional_summary = ProfessionalSummary(
            id=prop_professional.id,
            name=prop_user.name,
            company_name=prop_professional.company_name,
            profession=prop_professional.profession,
            rating=prop_professional.rating,
            review_count=prop_professional.review_count,
            is_verified=prop_professional.is_verified,
            location=prop_professional.location
        )
        
        # Build lead summary
        lead_summary = LeadSummary(
            id=lead.id,
            title=lead.title,
            category=lead.category,
            location=lead.location,
            type=lead.type.value,
            status=lead.status.value,
            created_at=lead.created_at
        )
        
        # Build media files list
        media_files = []
        if proposal.media_urls and can_see_full_details:
            from ..deps import generate_media_url
            
            for media_url in proposal.media_urls:
                try:
                    access_url = await generate_media_url(media_url)
                    
                    # Determine media type from URL/filename
                    if any(ext in media_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.gif']):
                        media_type = MediaTypeEnum.IMAGE
                    elif any(ext in media_url.lower() for ext in ['.mp4', '.mov', '.avi']):
                        media_type = MediaTypeEnum.VIDEO
                    else:
                        media_type = MediaTypeEnum.DOCUMENT
                    
                    media_file = MediaFileResponse(
                        id=uuid.uuid4(),  # Generate temporary ID
                        filename=media_url,
                        original_filename=os.path.basename(media_url),
                        content_type="application/octet-stream",  # Would be stored in DB
                        file_size=0,  # Would be stored in DB
                        description=None,  # Would be stored in DB
                        url=access_url,
                        thumbnail_url=None,
                        media_type=media_type,
                        uploaded_at=datetime.utcnow()  # Would be stored in DB
                    )
                    
                    media_files.append(media_file)
                    
                except Exception as e:
                    logger.error(f"Failed to generate URL for media {media_url}: {e}")
        
        # Build response
        return ProposalResponse(
            id=proposal.id,
            lead_id=proposal.lead_id,
            professional_id=proposal.professional_id,
            price=proposal.price,
            description=proposal.description if can_see_full_details else "הצעה פרטית",
            scheduled_date=proposal.scheduled_date,
            estimated_duration_days=None,  # Would be stored in DB
            status=proposal.status,
            created_at=proposal.created_at,
            updated_at=proposal.updated_at,
            professional=professional_summary,
            lead=lead_summary,
            media_files=media_files,
            accepted_at=getattr(proposal, 'accepted_at', None),
            rejected_at=getattr(proposal, 'rejected_at', None),
            rejection_reason=None  # Would be stored in DB
        )
    
    async def get_user_proposals(
        self,
        user: User,
        professional: Optional[Professional],
        status_filter: Optional[str],
        page: int,
        per_page: int
    ) -> ProposalListResponse:
        """Get proposals for a user with pagination."""
        
        query = self.db.query(Proposal)
        
        if professional:
            # Professional sees their submitted proposals
            query = query.filter(Proposal.professional_id == professional.id)
        else:
            # Consumer sees proposals on their leads
            user_leads = self.db.query(Lead).filter(Lead.created_by_user_id == user.id)
            lead_ids = [lead.id for lead in user_leads]
            
            if not lead_ids:
                return ProposalListResponse(
                    proposals=[],
                    total=0,
                    page=page,
                    per_page=per_page,
                    has_next=False,
                    has_prev=False
                )
            
            query = query.filter(Proposal.lead_id.in_(lead_ids))
        
        # Apply status filter
        if status_filter:
            try:
                status_enum = ProposalStatus(status_filter)
                query = query.filter(Proposal.status == status_enum)
            except ValueError:
                pass  # Invalid status, ignore filter
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        proposals = query.order_by(desc(Proposal.created_at)).offset(offset).limit(per_page).all()
        
        # Build response items
        proposal_items = []
        for proposal in proposals:
            # Get related data
            prop_professional = self.db.query(Professional).filter(
                Professional.id == proposal.professional_id
            ).first()
            
            prop_user = self.db.query(User).filter(
                User.id == prop_professional.user_id
            ).first()
            
            lead = self.db.query(Lead).filter(Lead.id == proposal.lead_id).first()
            
            media_count = len(proposal.media_urls or [])
            
            item = ProposalListItem(
                id=proposal.id,
                lead_id=proposal.lead_id,
                lead_title=lead.title,
                lead_category=lead.category,
                lead_location=lead.location,
                professional_name=prop_user.name,
                professional_company=prop_professional.company_name,
                price=proposal.price,
                status=proposal.status,
                created_at=proposal.created_at,
                media_count=media_count
            )
            
            proposal_items.append(item)
        
        return ProposalListResponse(
            proposals=proposal_items,
            total=total,
            page=page,
            per_page=per_page,
            has_next=offset + per_page < total,
            has_prev=page > 1
        )
    
    async def get_lead_proposals(
        self,
        lead_id: uuid.UUID,
        page: int,
        per_page: int
    ) -> ProposalListResponse:
        """Get all proposals for a specific lead."""
        
        query = self.db.query(Proposal).filter(Proposal.lead_id == lead_id)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        proposals = query.order_by(desc(Proposal.created_at)).offset(offset).limit(per_page).all()
        
        # Build response items
        proposal_items = []
        for proposal in proposals:
            # Get related data
            prop_professional = self.db.query(Professional).filter(
                Professional.id == proposal.professional_id
            ).first()
            
            prop_user = self.db.query(User).filter(
                User.id == prop_professional.user_id
            ).first()
            
            lead = self.db.query(Lead).filter(Lead.id == proposal.lead_id).first()
            
            media_count = len(proposal.media_urls or [])
            
            item = ProposalListItem(
                id=proposal.id,
                lead_id=proposal.lead_id,
                lead_title=lead.title,
                lead_category=lead.category,
                lead_location=lead.location,
                professional_name=prop_user.name,
                professional_company=prop_professional.company_name,
                price=proposal.price,
                status=proposal.status,
                created_at=proposal.created_at,
                media_count=media_count
            )
            
            proposal_items.append(item)
        
        return ProposalListResponse(
            proposals=proposal_items,
            total=total,
            page=page,
            per_page=per_page,
            has_next=offset + per_page < total,
            has_prev=page > 1
        )
    
    async def get_user_stats(
        self,
        user: User,
        professional: Optional[Professional],
        role: str
    ) -> ProposalStatsResponse:
        """Get proposal statistics for a user."""
        
        if professional:
            # Professional statistics
            proposals = self.db.query(Proposal).filter(
                Proposal.professional_id == professional.id
            ).all()
            
            total_proposals = len(proposals)
            pending_proposals = len([p for p in proposals if p.status == ProposalStatus.PENDING])
            accepted_proposals = len([p for p in proposals if p.status == ProposalStatus.ACCEPTED])
            rejected_proposals = len([p for p in proposals if p.status == ProposalStatus.REJECTED])
            
            acceptance_rate = Decimal('0.0')
            if total_proposals > 0:
                acceptance_rate = Decimal(accepted_proposals) / Decimal(total_proposals) * Decimal('100')
            
            total_value_accepted = sum([p.price for p in proposals if p.status == ProposalStatus.ACCEPTED])
            
            media_files_count = sum([len(p.media_urls or []) for p in proposals])
            
        else:
            # Consumer statistics (proposals on their leads)
            user_leads = self.db.query(Lead).filter(Lead.created_by_user_id == user.id).all()
            lead_ids = [lead.id for lead in user_leads]
            
            if lead_ids:
                proposals = self.db.query(Proposal).filter(
                    Proposal.lead_id.in_(lead_ids)
                ).all()
            else:
                proposals = []
            
            total_proposals = len(proposals)
            pending_proposals = len([p for p in proposals if p.status == ProposalStatus.PENDING])
            accepted_proposals = len([p for p in proposals if p.status == ProposalStatus.ACCEPTED])
            rejected_proposals = len([p for p in proposals if p.status == ProposalStatus.REJECTED])
            
            acceptance_rate = Decimal('0.0')
            if total_proposals > 0:
                acceptance_rate = Decimal(accepted_proposals) / Decimal(total_proposals) * Decimal('100')
            
            total_value_accepted = sum([p.price for p in proposals if p.status == ProposalStatus.ACCEPTED])
            
            media_files_count = sum([len(p.media_urls or []) for p in proposals])
        
        return ProposalStatsResponse(
            total_proposals=total_proposals,
            pending_proposals=pending_proposals,
            accepted_proposals=accepted_proposals,
            rejected_proposals=rejected_proposals,
            acceptance_rate=acceptance_rate,
            average_response_time_hours=None,  # Would need timestamp analysis
            total_value_accepted=total_value_accepted,
            media_files_count=media_files_count
        )
    
    async def search_proposals(
        self,
        user: User,
        professional: Optional[Professional],
        filters: ProposalSearchFilters,
        page: int,
        per_page: int,
        role: str
    ) -> ProposalSearchResponse:
        """Search proposals with advanced filters."""
        
        query = self.db.query(Proposal)
        
        # Apply access control
        if professional and role == "professional":
            query = query.filter(Proposal.professional_id == professional.id)
        elif role == "consumer":
            user_leads = self.db.query(Lead).filter(Lead.created_by_user_id == user.id)
            lead_ids = [lead.id for lead in user_leads]
            
            if not lead_ids:
                return ProposalSearchResponse(
                    results=[],
                    total=0,
                    page=page,
                    per_page=per_page,
                    filters_applied=filters,
                    has_next=False,
                    has_prev=False
                )
            
            query = query.filter(Proposal.lead_id.in_(lead_ids))
        
        # Apply filters
        if filters.status:
            query = query.filter(Proposal.status == filters.status)
        
        if filters.min_price:
            query = query.filter(Proposal.price >= filters.min_price)
        
        if filters.max_price:
            query = query.filter(Proposal.price <= filters.max_price)
        
        if filters.created_from:
            query = query.filter(Proposal.created_at >= filters.created_from)
        
        if filters.created_to:
            query = query.filter(Proposal.created_at <= filters.created_to)
        
        if filters.professional_id:
            query = query.filter(Proposal.professional_id == filters.professional_id)
        
        if filters.lead_id:
            query = query.filter(Proposal.lead_id == filters.lead_id)
        
        if filters.lead_category:
            # Join with leads table for category filter
            query = query.join(Lead).filter(Lead.category == filters.lead_category)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        proposals = query.order_by(desc(Proposal.created_at)).offset(offset).limit(per_page).all()
        
        # Build response items
        proposal_items = []
        for proposal in proposals:
            # Get related data
            prop_professional = self.db.query(Professional).filter(
                Professional.id == proposal.professional_id
            ).first()
            
            prop_user = self.db.query(User).filter(
                User.id == prop_professional.user_id
            ).first()
            
            lead = self.db.query(Lead).filter(Lead.id == proposal.lead_id).first()
            
            media_count = len(proposal.media_urls or [])
            
            item = ProposalListItem(
                id=proposal.id,
                lead_id=proposal.lead_id,
                lead_title=lead.title,
                lead_category=lead.category,
                lead_location=lead.location,
                professional_name=prop_user.name,
                professional_company=prop_professional.company_name,
                price=proposal.price,
                status=proposal.status,
                created_at=proposal.created_at,
                media_count=media_count
            )
            
            proposal_items.append(item)
        
        return ProposalSearchResponse(
            results=proposal_items,
            total=total,
            page=page,
            per_page=per_page,
            filters_applied=filters,
            has_next=offset + per_page < total,
            has_prev=page > 1
        )
    
    async def trigger_commission_calculation(
        self,
        proposal: Proposal,
        lead: Lead
    ) -> None:
        """
        Trigger commission calculation for accepted proposal.
        
        This would integrate with the payments service to calculate
        and process commission splits.
        """
        try:
            # This would be an HTTP call to payments service
            # For now, just log the action
            logger.info(
                f"Triggering commission calculation for proposal {proposal.id}, "
                f"amount: {proposal.price}"
            )
            
            # In production, this would make an HTTP request to payments service
            # with proposal details, final amount, and commission rates
            
        except Exception as e:
            logger.error(f"Failed to trigger commission calculation: {e}")
            # Don't fail the proposal acceptance if commission calculation fails