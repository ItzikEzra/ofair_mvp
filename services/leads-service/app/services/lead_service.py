"""Lead service with business logic and PII protection."""

import logging
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, asc, func

import sys
sys.path.append("/app/libs")
from python_shared.database.models import (
    User, Professional, Lead, ConsumerLead, ProfessionalLead,
    LeadType, LeadStatus, ProfessionalStatus, Proposal, ProposalStatus,
    Referral, ReferralStatus, Notification, NotificationType
)

from models.leads import (
    LeadCreateRequest, LeadUpdateRequest, LeadDetailResponse,
    LeadListItem, LeadShareRequest, ReferralResponse,
    HebrewCategories
)
from services.geo_service import IsraeliGeoService, LocationInfo

logger = logging.getLogger(__name__)


class LeadService:
    """Lead service for business logic and data management."""
    
    def __init__(self, db: Session, geo_service: IsraeliGeoService):
        self.db = db
        self.geo_service = geo_service
        
    async def create_lead(
        self,
        lead_data: LeadCreateRequest,
        creator_user: User,
        creator_professional: Optional[Professional] = None
    ) -> LeadDetailResponse:
        """
        Create a new lead with proper validation and PII handling.
        
        Args:
            lead_data: Lead creation data
            creator_user: User creating the lead
            creator_professional: Professional profile if creator is professional
            
        Returns:
            Created lead details
        """
        try:
            # Validate location
            location_info = await self.geo_service.geocode_location(lead_data.location)
            if not location_info:
                raise ValueError(f"Could not geocode location: {lead_data.location}")
            
            # Create base lead
            lead = Lead(
                type=lead_data.type,
                title=lead_data.title,
                short_description=lead_data.short_description,
                category=lead_data.category,
                location=lead_data.location,
                status=LeadStatus.ACTIVE,
                created_by_user_id=creator_user.id,
                created_by_professional_id=creator_professional.id if creator_professional else None
            )
            
            self.db.add(lead)
            self.db.flush()  # Get the lead ID
            
            # Create type-specific details
            if lead_data.type == LeadType.CONSUMER:
                consumer_details = ConsumerLead(
                    lead_id=lead.id,
                    client_name=lead_data.client_name,
                    client_phone=lead_data.client_phone,
                    client_address=lead_data.client_address,
                    full_description=lead_data.full_description
                )
                self.db.add(consumer_details)
                
            elif lead_data.type == LeadType.PROFESSIONAL_REFERRAL:
                professional_details = ProfessionalLead(
                    lead_id=lead.id,
                    client_name=lead_data.client_name,
                    client_phone=lead_data.client_phone,
                    estimated_budget=lead_data.estimated_budget,
                    attachments=lead_data.attachments or [],
                    preferred_schedule=lead_data.preferred_schedule,
                    referrer_share_percentage=lead_data.referrer_share_percentage or Decimal("0.00")
                )
                self.db.add(professional_details)
            
            self.db.commit()
            
            # Create notifications for relevant professionals
            await self._notify_relevant_professionals(lead, location_info)
            
            # Log lead creation
            logger.info(
                f"Lead created: {lead.id} by user {creator_user.id} "
                f"(type: {lead.type}, category: {lead.category})"
            )
            
            return await self.get_lead_details(lead.id, creator_user, can_see_pii=True)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to create lead: {e}")
            raise
            
    async def get_lead_details(
        self,
        lead_id: uuid.UUID,
        requesting_user: Optional[User] = None,
        can_see_pii: bool = False
    ) -> Optional[LeadDetailResponse]:
        """
        Get detailed lead information with PII protection.
        
        Args:
            lead_id: Lead ID
            requesting_user: User requesting the details
            can_see_pii: Whether user can see PII data
            
        Returns:
            Lead details or None if not found
        """
        try:
            # Get lead with related data
            lead = self.db.query(Lead).options(
                joinedload(Lead.consumer_details),
                joinedload(Lead.professional_details),
                joinedload(Lead.creator_user),
                joinedload(Lead.creator_professional)
            ).filter(Lead.id == lead_id).first()
            
            if not lead:
                return None
                
            # Count proposals
            proposal_count = self.db.query(Proposal).filter(
                Proposal.lead_id == lead.id
            ).count()
            
            # Check if requesting user has proposed
            has_user_proposed = False
            if requesting_user:
                professional = self.db.query(Professional).filter(
                    Professional.user_id == requesting_user.id
                ).first()
                
                if professional:
                    has_user_proposed = self.db.query(Proposal).filter(
                        and_(
                            Proposal.lead_id == lead.id,
                            Proposal.professional_id == professional.id
                        )
                    ).first() is not None
            
            # Build response
            response_data = {
                "id": lead.id,
                "type": lead.type,
                "title": lead.title,
                "short_description": lead.short_description,
                "category": lead.category,
                "category_hebrew": HebrewCategories.get_hebrew_name(lead.category),
                "location": lead.location,
                "status": lead.status,
                "created_at": lead.created_at,
                "updated_at": lead.updated_at,
                "created_by_user_id": lead.created_by_user_id,
                "created_by_professional_id": lead.created_by_professional_id,
                "proposal_count": proposal_count,
                "has_user_proposed": has_user_proposed,
                "final_amount": lead.final_amount
            }
            
            # Add PII data only if authorized
            if can_see_pii:
                if lead.consumer_details:
                    response_data.update({
                        "client_name": lead.consumer_details.client_name,
                        "client_phone": lead.consumer_details.client_phone,
                        "client_address": lead.consumer_details.client_address,
                        "full_description": lead.consumer_details.full_description
                    })
                elif lead.professional_details:
                    response_data.update({
                        "client_name": lead.professional_details.client_name,
                        "client_phone": lead.professional_details.client_phone,
                        "estimated_budget": lead.professional_details.estimated_budget,
                        "attachments": lead.professional_details.attachments,
                        "preferred_schedule": lead.professional_details.preferred_schedule,
                        "referrer_share_percentage": lead.professional_details.referrer_share_percentage
                    })
                    
            # Add non-PII professional details for public view
            elif lead.professional_details:
                response_data.update({
                    "estimated_budget": lead.professional_details.estimated_budget,
                    "referrer_share_percentage": lead.professional_details.referrer_share_percentage
                })
            
            return LeadDetailResponse(**response_data)
            
        except Exception as e:
            logger.error(f"Failed to get lead details {lead_id}: {e}")
            return None
            
    async def update_lead(
        self,
        lead_id: uuid.UUID,
        update_data: LeadUpdateRequest,
        requesting_user: User
    ) -> Optional[LeadDetailResponse]:
        """
        Update lead with validation.
        
        Args:
            lead_id: Lead ID to update
            update_data: Update data
            requesting_user: User making the update
            
        Returns:
            Updated lead details or None if not found/authorized
        """
        try:
            lead = self.db.query(Lead).filter(Lead.id == lead_id).first()
            if not lead:
                return None
                
            # Check ownership
            if lead.created_by_user_id != requesting_user.id:
                raise PermissionError("Only lead owner can update the lead")
                
            # Validate location if changed
            if update_data.location:
                location_info = await self.geo_service.geocode_location(update_data.location)
                if not location_info:
                    raise ValueError(f"Could not geocode location: {update_data.location}")
                    
            # Update base lead fields
            update_fields = update_data.dict(exclude_unset=True)
            for field, value in update_fields.items():
                if field in ["title", "short_description", "category", "location", "status"]:
                    setattr(lead, field, value)
                    
            # Update type-specific details
            if lead.type == LeadType.CONSUMER and lead.consumer_details:
                if update_data.full_description is not None:
                    lead.consumer_details.full_description = update_data.full_description
                    
            elif lead.type == LeadType.PROFESSIONAL_REFERRAL and lead.professional_details:
                if update_data.estimated_budget is not None:
                    lead.professional_details.estimated_budget = update_data.estimated_budget
                if update_data.attachments is not None:
                    lead.professional_details.attachments = update_data.attachments
                if update_data.preferred_schedule is not None:
                    lead.professional_details.preferred_schedule = update_data.preferred_schedule
                    
            lead.updated_at = datetime.utcnow()
            self.db.commit()
            
            logger.info(f"Lead updated: {lead.id} by user {requesting_user.id}")
            
            return await self.get_lead_details(lead.id, requesting_user, can_see_pii=True)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update lead {lead_id}: {e}")
            raise
            
    async def share_lead(
        self,
        lead_id: uuid.UUID,
        share_data: LeadShareRequest,
        referrer_professional: Professional
    ) -> Optional[ReferralResponse]:
        """
        Share/refer a lead to another professional.
        
        Args:
            lead_id: Lead ID to share
            share_data: Share request data
            referrer_professional: Professional sharing the lead
            
        Returns:
            Referral response or None if failed
        """
        try:
            # Get the lead
            lead = self.db.query(Lead).filter(Lead.id == lead_id).first()
            if not lead:
                raise ValueError("Lead not found")
                
            # Get receiver professional
            receiver_professional = self.db.query(Professional).filter(
                Professional.id == share_data.receiver_professional_id
            ).first()
            
            if not receiver_professional:
                raise ValueError("Receiver professional not found")
                
            if receiver_professional.status != ProfessionalStatus.ACTIVE:
                raise ValueError("Receiver professional is not active")
                
            # Check if referral already exists
            existing_referral = self.db.query(Referral).filter(
                and_(
                    Referral.lead_id == lead_id,
                    Referral.referrer_professional_id == referrer_professional.id,
                    Referral.receiver_professional_id == receiver_professional.id
                )
            ).first()
            
            if existing_referral:
                raise ValueError("Referral already exists for this combination")
                
            # Determine commission percentage
            commission_percentage = share_data.commission_percentage
            if commission_percentage is None:
                # Use lead's default if it's a professional referral lead
                if (lead.type == LeadType.PROFESSIONAL_REFERRAL and 
                    lead.professional_details):
                    commission_percentage = lead.professional_details.referrer_share_percentage
                else:
                    commission_percentage = Decimal("10.00")  # Default 10%
                    
            # Create referral
            referral = Referral(
                lead_id=lead_id,
                referrer_professional_id=referrer_professional.id,
                receiver_professional_id=receiver_professional.id,
                commission_percentage=commission_percentage,
                status=ReferralStatus.PENDING
            )
            
            self.db.add(referral)
            self.db.commit()
            
            # Create notification for receiver
            await self._create_referral_notification(referral, receiver_professional)
            
            logger.info(
                f"Lead {lead_id} shared by professional {referrer_professional.id} "
                f"to professional {receiver_professional.id}"
            )
            
            return ReferralResponse(
                id=referral.id,
                lead_id=referral.lead_id,
                referrer_professional_id=referral.referrer_professional_id,
                receiver_professional_id=referral.receiver_professional_id,
                commission_percentage=referral.commission_percentage,
                status=referral.status.value,
                created_at=referral.created_at
            )
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to share lead {lead_id}: {e}")
            raise
            
    async def search_leads(
        self,
        filters: Dict[str, Any],
        page: int = 1,
        page_size: int = 20,
        requesting_user: Optional[User] = None
    ) -> Tuple[List[LeadListItem], int]:
        """
        Search leads with filters and pagination.
        
        Args:
            filters: Search filters
            page: Page number (1-based)
            page_size: Items per page
            requesting_user: User making the request
            
        Returns:
            Tuple of (leads, total_count)
        """
        try:
            query = self.db.query(Lead).options(
                joinedload(Lead.professional_details)
            )
            
            # Apply filters
            if filters.get("category"):
                query = query.filter(Lead.category == filters["category"])
                
            if filters.get("location"):
                # Simple text search, in production use full-text search
                query = query.filter(Lead.location.ilike(f"%{filters['location']}%"))
                
            if filters.get("lead_type"):
                query = query.filter(Lead.type == filters["lead_type"])
                
            if filters.get("status"):
                query = query.filter(Lead.status == filters["status"])
            else:
                # Default to active leads only
                query = query.filter(Lead.status == LeadStatus.ACTIVE)
                
            if filters.get("min_budget"):
                query = query.join(ProfessionalLead).filter(
                    ProfessionalLead.estimated_budget >= filters["min_budget"]
                )
                
            if filters.get("max_budget"):
                query = query.join(ProfessionalLead).filter(
                    ProfessionalLead.estimated_budget <= filters["max_budget"]
                )
                
            if filters.get("created_after"):
                query = query.filter(Lead.created_at >= filters["created_after"])
                
            if filters.get("created_before"):
                query = query.filter(Lead.created_at <= filters["created_before"])
                
            # Subscription filter
            if filters.get("subscription_filter") and requesting_user:
                # In production, check actual subscription status
                pass
                
            # Get total count
            total_count = query.count()
            
            # Apply pagination and ordering
            offset = (page - 1) * page_size
            leads = query.order_by(desc(Lead.created_at)).offset(offset).limit(page_size).all()
            
            # Convert to response format
            lead_items = []
            for lead in leads:
                item_data = {
                    "id": lead.id,
                    "type": lead.type,
                    "title": lead.title,
                    "short_description": lead.short_description,
                    "category": lead.category,
                    "category_hebrew": HebrewCategories.get_hebrew_name(lead.category),
                    "location": lead.location,
                    "status": lead.status,
                    "created_at": lead.created_at,
                    "updated_at": lead.updated_at,
                    "creator_masked": True
                }
                
                # Add non-PII professional details
                if lead.professional_details:
                    item_data["estimated_budget"] = lead.professional_details.estimated_budget
                    
                lead_items.append(LeadListItem(**item_data))
                
            return lead_items, total_count
            
        except Exception as e:
            logger.error(f"Failed to search leads: {e}")
            raise
            
    async def get_lead_categories(self) -> Dict[str, str]:
        """Get all available lead categories with Hebrew names."""
        return HebrewCategories.get_all_categories()
        
    async def close_lead(
        self,
        lead_id: uuid.UUID,
        requesting_user: User,
        final_amount: Optional[Decimal] = None
    ) -> Optional[LeadDetailResponse]:
        """
        Close a lead and optionally set final amount.
        
        Args:
            lead_id: Lead ID to close
            requesting_user: User closing the lead
            final_amount: Final agreed amount
            
        Returns:
            Updated lead details or None if not authorized
        """
        try:
            lead = self.db.query(Lead).filter(Lead.id == lead_id).first()
            if not lead:
                return None
                
            # Check ownership or admin
            if lead.created_by_user_id != requesting_user.id:
                # Check if user has role admin - simplified check
                # In production, check actual user role
                raise PermissionError("Only lead owner can close the lead")
                
            lead.status = LeadStatus.CLOSED
            if final_amount:
                lead.final_amount = final_amount
            lead.updated_at = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(f"Lead closed: {lead.id} by user {requesting_user.id}")
            
            return await self.get_lead_details(lead.id, requesting_user, can_see_pii=True)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to close lead {lead_id}: {e}")
            raise
            
    async def _notify_relevant_professionals(
        self,
        lead: Lead,
        location_info: LocationInfo
    ) -> None:
        """Create notifications for professionals who might be interested."""
        try:
            # Find professionals in the same category and nearby location
            professionals = self.db.query(Professional).filter(
                and_(
                    Professional.status == ProfessionalStatus.ACTIVE,
                    or_(
                        Professional.profession == lead.category,
                        Professional.specialties.op('&&')([lead.category])
                    )
                )
            ).limit(50).all()  # Limit to prevent spam
            
            for professional in professionals:
                # Basic location matching (in production, use proper geo queries)
                if professional.location and location_info.city:
                    prof_location_info = await self.geo_service.geocode_location(
                        professional.location
                    )
                    
                    if prof_location_info and self.geo_service.is_same_city(
                        location_info, prof_location_info
                    ):
                        # Create notification
                        notification = Notification(
                            user_id=professional.user_id,
                            type=NotificationType.NEW_LEAD,
                            title=f"עבודה חדשה ב{HebrewCategories.get_hebrew_name(lead.category)}",
                            message=f"עבודה חדשה זמינה באזור {lead.location}: {lead.title}",
                            data={
                                "lead_id": str(lead.id),
                                "category": lead.category,
                                "location": lead.location
                            }
                        )
                        
                        self.db.add(notification)
                        
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to create professional notifications: {e}")
            
    async def _create_referral_notification(
        self,
        referral: Referral,
        receiver_professional: Professional
    ) -> None:
        """Create notification for referral receiver."""
        try:
            lead = self.db.query(Lead).filter(Lead.id == referral.lead_id).first()
            if not lead:
                return
                
            notification = Notification(
                user_id=receiver_professional.user_id,
                type=NotificationType.REFERRAL_RECEIVED,
                title="קיבלת הפניית עבודה",
                message=f"קיבלת הפניה לעבודה: {lead.title}",
                data={
                    "lead_id": str(referral.lead_id),
                    "referral_id": str(referral.id),
                    "commission_percentage": float(referral.commission_percentage),
                    "referrer_id": str(referral.referrer_professional_id)
                }
            )
            
            self.db.add(notification)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to create referral notification: {e}")
            
    async def get_user_leads(
        self,
        user: User,
        lead_type: Optional[LeadType] = None,
        status: Optional[LeadStatus] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[LeadListItem], int]:
        """
        Get leads created by a specific user.
        
        Args:
            user: User to get leads for
            lead_type: Optional type filter
            status: Optional status filter  
            page: Page number
            page_size: Items per page
            
        Returns:
            Tuple of (leads, total_count)
        """
        try:
            query = self.db.query(Lead).filter(Lead.created_by_user_id == user.id)
            
            if lead_type:
                query = query.filter(Lead.type == lead_type)
            if status:
                query = query.filter(Lead.status == status)
                
            total_count = query.count()
            
            offset = (page - 1) * page_size
            leads = query.order_by(desc(Lead.created_at)).offset(offset).limit(page_size).all()
            
            # Convert to response format
            lead_items = []
            for lead in leads:
                item_data = {
                    "id": lead.id,
                    "type": lead.type,
                    "title": lead.title,
                    "short_description": lead.short_description,
                    "category": lead.category,
                    "category_hebrew": HebrewCategories.get_hebrew_name(lead.category),
                    "location": lead.location,
                    "status": lead.status,
                    "created_at": lead.created_at,
                    "updated_at": lead.updated_at,
                    "creator_masked": False  # User can see own leads
                }
                
                lead_items.append(LeadListItem(**item_data))
                
            return lead_items, total_count
            
        except Exception as e:
            logger.error(f"Failed to get user leads: {e}")
            raise