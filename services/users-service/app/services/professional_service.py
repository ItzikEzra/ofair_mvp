"""Professional service for business logic and verification workflow."""

import sys
import uuid
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func, and_, or_, desc, text
from sqlalchemy.orm import joinedload

# Add libs to path
sys.path.append("/app/libs")
from python_shared.database.models import (
    Professional,
    User,
    ProfessionalStatus,
    AdminAuditLog,
    Proposal,
    Project,
    ProjectStatus,
    LeadPayment,
    ProfessionalRating,
    Wallet,
    WalletTransaction
)

from models.professionals import ProfessionalStats

logger = logging.getLogger(__name__)


class ProfessionalService:
    """Service for professional-related business logic."""
    
    async def verify_professional(
        self,
        db: AsyncSession,
        professional_id: uuid.UUID,
        status: ProfessionalStatus,
        admin_user_id: uuid.UUID,
        notes: Optional[str] = None
    ) -> Professional:
        """
        Verify or update professional status.
        
        Args:
            db: Database session
            professional_id: ID of professional to verify
            status: New verification status
            admin_user_id: ID of admin performing the action
            notes: Optional admin notes
            
        Returns:
            Updated professional object
        """
        try:
            # Get professional
            query = select(Professional).where(Professional.id == professional_id)
            result = await db.execute(query)
            professional = result.scalar_one_or_none()
            
            if not professional:
                raise ValueError(f"Professional {professional_id} not found")
            
            # Store old values for audit
            old_status = professional.status
            old_verified = professional.is_verified
            
            # Update professional status
            update_data = {"status": status}
            
            # Set verification flag based on status
            if status == ProfessionalStatus.ACTIVE:
                update_data["is_verified"] = True
            elif status in [ProfessionalStatus.SUSPENDED, ProfessionalStatus.INACTIVE]:
                update_data["is_verified"] = False
            
            update_query = (
                update(Professional)
                .where(Professional.id == professional_id)
                .values(**update_data)
            )
            
            await db.execute(update_query)
            
            # Create audit log entry
            audit_changes = {
                "old_status": old_status.value if old_status else None,
                "new_status": status.value,
                "old_verified": old_verified,
                "new_verified": update_data.get("is_verified"),
                "notes": notes
            }
            
            audit_log = AdminAuditLog(
                admin_user_id=admin_user_id,
                action="professional_verification",
                entity_type="professional",
                entity_id=professional_id,
                changes=audit_changes,
                ip_address="internal"  # Service call
            )
            
            db.add(audit_log)
            await db.commit()
            
            # Refresh professional object
            await db.refresh(professional)
            
            logger.info(
                f"Professional {professional_id} status updated to {status.value} by admin {admin_user_id}"
            )
            
            return professional
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error verifying professional {professional_id}: {e}")
            raise
    
    async def get_professional_stats(
        self,
        db: AsyncSession,
        professional_id: uuid.UUID
    ) -> ProfessionalStats:
        """
        Get comprehensive statistics for a professional.
        
        Args:
            db: Database session
            professional_id: ID of professional
            
        Returns:
            Professional statistics object
        """
        try:
            # Get professional with ratings
            prof_query = (
                select(Professional)
                .where(Professional.id == professional_id)
            )
            result = await db.execute(prof_query)
            professional = result.scalar_one_or_none()
            
            if not professional:
                raise ValueError(f"Professional {professional_id} not found")
            
            stats = ProfessionalStats()
            
            # Get total leads (from proposals)
            leads_query = (
                select(func.count(Proposal.id.distinct()))
                .where(Proposal.professional_id == professional_id)
            )
            result = await db.execute(leads_query)
            stats.total_leads = result.scalar() or 0
            
            # Get project statistics
            projects_query = (
                select(
                    func.count(Project.id),
                    func.count(func.nullif(Project.status == ProjectStatus.ACTIVE, False)),
                    func.count(func.nullif(Project.status == ProjectStatus.COMPLETED, False))
                )
                .where(Project.professional_id == professional_id)
            )
            result = await db.execute(projects_query)
            total_projects, active_projects, completed_projects = result.one()
            
            stats.active_projects = active_projects or 0
            stats.completed_projects = completed_projects or 0
            
            # Get earnings from completed projects
            earnings_query = (
                select(func.coalesce(func.sum(LeadPayment.professional_net_amount), 0))
                .join(Project, LeadPayment.proposal_id == Project.proposal_id)
                .where(
                    and_(
                        Project.professional_id == professional_id,
                        Project.status == ProjectStatus.COMPLETED
                    )
                )
            )
            result = await db.execute(earnings_query)
            stats.total_earnings = result.scalar() or Decimal('0.00')
            
            # Set rating information from professional record
            stats.average_rating = professional.rating
            stats.total_reviews = professional.review_count
            
            logger.info(f"Retrieved stats for professional {professional_id}")
            return stats
            
        except Exception as e:
            logger.error(f"Error getting professional stats for {professional_id}: {e}")
            raise
    
    async def update_professional_rating(
        self,
        db: AsyncSession,
        professional_id: uuid.UUID
    ) -> None:
        """
        Recalculate and update professional rating from reviews.
        
        Args:
            db: Database session
            professional_id: ID of professional
        """
        try:
            # Calculate average rating and count
            rating_query = (
                select(
                    func.avg(ProfessionalRating.rating),
                    func.count(ProfessionalRating.id)
                )
                .where(ProfessionalRating.professional_id == professional_id)
            )
            
            result = await db.execute(rating_query)
            avg_rating, count = result.one()
            
            # Update professional record
            update_query = (
                update(Professional)
                .where(Professional.id == professional_id)
                .values(
                    rating=Decimal(str(round(avg_rating, 2))) if avg_rating else None,
                    review_count=count or 0
                )
            )
            
            await db.execute(update_query)
            await db.commit()
            
            logger.info(f"Updated rating for professional {professional_id}: {avg_rating:.2f} ({count} reviews)")
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Error updating professional rating for {professional_id}: {e}")
            raise
    
    async def get_professional_performance_metrics(
        self,
        db: AsyncSession,
        professional_id: uuid.UUID,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get professional performance metrics for the last N days.
        
        Args:
            db: Database session
            professional_id: ID of professional
            days: Number of days to look back
            
        Returns:
            Dictionary of performance metrics
        """
        try:
            # Calculate date range
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Get proposals in time period
            proposals_query = (
                select(
                    func.count(Proposal.id),
                    func.count(func.nullif(Proposal.status == 'accepted', False)),
                    func.avg(Proposal.price)
                )
                .where(
                    and_(
                        Proposal.professional_id == professional_id,
                        Proposal.created_at >= cutoff_date
                    )
                )
            )
            
            result = await db.execute(proposals_query)
            total_proposals, accepted_proposals, avg_proposal_price = result.one()
            
            # Get completed projects in time period
            completed_query = (
                select(func.count(Project.id))
                .where(
                    and_(
                        Project.professional_id == professional_id,
                        Project.status == ProjectStatus.COMPLETED,
                        Project.completion_date >= cutoff_date
                    )
                )
            )
            
            result = await db.execute(completed_query)
            completed_projects = result.scalar() or 0
            
            # Calculate metrics
            proposal_acceptance_rate = (
                (accepted_proposals / total_proposals * 100) if total_proposals > 0 else 0
            )
            
            metrics = {
                "period_days": days,
                "total_proposals": total_proposals or 0,
                "accepted_proposals": accepted_proposals or 0,
                "proposal_acceptance_rate": round(proposal_acceptance_rate, 2),
                "completed_projects": completed_projects,
                "average_proposal_price": float(avg_proposal_price or 0),
                "calculated_at": datetime.utcnow().isoformat()
            }
            
            logger.info(f"Calculated performance metrics for professional {professional_id}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error calculating performance metrics for {professional_id}: {e}")
            raise
    
    async def search_professionals(
        self,
        db: AsyncSession,
        query: str,
        location: Optional[str] = None,
        specialties: Optional[List[str]] = None,
        verified_only: bool = True,
        min_rating: Optional[float] = None,
        skip: int = 0,
        limit: int = 50
    ) -> List[Professional]:
        """
        Search professionals with advanced filters.
        
        Args:
            db: Database session
            query: Search query (profession, company name)
            location: Location filter
            specialties: Specialties filter
            verified_only: Only return verified professionals
            min_rating: Minimum rating filter
            skip: Number of records to skip
            limit: Number of records to return
            
        Returns:
            List of matching professionals
        """
        try:
            # Build base query
            search_query = (
                select(Professional)
                .where(Professional.status == ProfessionalStatus.ACTIVE)
            )
            
            # Add search filters
            if query:
                search_filter = or_(
                    Professional.profession.ilike(f"%{query}%"),
                    Professional.company_name.ilike(f"%{query}%")
                )
                search_query = search_query.where(search_filter)
            
            if location:
                search_query = search_query.where(
                    Professional.location.ilike(f"%{location}%")
                )
            
            if specialties:
                for specialty in specialties:
                    search_query = search_query.where(
                        Professional.specialties.any(specialty)
                    )
            
            if verified_only:
                search_query = search_query.where(Professional.is_verified == True)
            
            if min_rating is not None:
                search_query = search_query.where(
                    Professional.rating >= Decimal(str(min_rating))
                )
            
            # Add ordering and pagination
            search_query = (
                search_query
                .order_by(
                    Professional.is_verified.desc(),
                    Professional.rating.desc().nulls_last(),
                    Professional.review_count.desc()
                )
                .offset(skip)
                .limit(limit)
            )
            
            result = await db.execute(search_query)
            professionals = result.scalars().all()
            
            logger.info(f"Found {len(professionals)} professionals matching search criteria")
            return professionals
            
        except Exception as e:
            logger.error(f"Error searching professionals: {e}")
            raise
    
    async def get_pending_verifications(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 50
    ) -> List[Professional]:
        """
        Get professionals pending verification.
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Number of records to return
            
        Returns:
            List of professionals pending verification
        """
        try:
            query = (
                select(Professional)
                .options(joinedload(Professional.user))
                .where(Professional.status == ProfessionalStatus.PENDING)
                .order_by(Professional.created_at)
                .offset(skip)
                .limit(limit)
            )
            
            result = await db.execute(query)
            professionals = result.scalars().all()
            
            logger.info(f"Found {len(professionals)} professionals pending verification")
            return professionals
            
        except Exception as e:
            logger.error(f"Error getting pending verifications: {e}")
            raise
    
    async def calculate_professional_score(
        self,
        db: AsyncSession,
        professional_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive professional score.
        
        Args:
            db: Database session
            professional_id: ID of professional
            
        Returns:
            Dictionary with score breakdown
        """
        try:
            # Get professional data
            query = select(Professional).where(Professional.id == professional_id)
            result = await db.execute(query)
            professional = result.scalar_one_or_none()
            
            if not professional:
                raise ValueError(f"Professional {professional_id} not found")
            
            score_components = {
                "verification_score": 30 if professional.is_verified else 0,
                "rating_score": 0,
                "activity_score": 0,
                "completion_score": 0,
                "total_score": 0
            }
            
            # Rating score (0-25 points)
            if professional.rating and professional.review_count >= 3:
                rating_score = min(25, int(float(professional.rating) * 5))
                score_components["rating_score"] = rating_score
            
            # Activity score (0-25 points) - based on recent proposals
            activity_query = (
                select(func.count(Proposal.id))
                .where(
                    and_(
                        Proposal.professional_id == professional_id,
                        Proposal.created_at >= func.now() - text("INTERVAL '30 days'")
                    )
                )
            )
            result = await db.execute(activity_query)
            recent_proposals = result.scalar() or 0
            
            activity_score = min(25, recent_proposals * 2)
            score_components["activity_score"] = activity_score
            
            # Completion score (0-20 points) - based on completed projects
            completion_query = (
                select(
                    func.count(Project.id),
                    func.count(func.nullif(Project.status == ProjectStatus.COMPLETED, False))
                )
                .where(Project.professional_id == professional_id)
            )
            result = await db.execute(completion_query)
            total_projects, completed_projects = result.one()
            
            if total_projects and total_projects > 0:
                completion_rate = completed_projects / total_projects
                completion_score = int(completion_rate * 20)
                score_components["completion_score"] = completion_score
            
            # Calculate total score
            total_score = sum([
                score_components["verification_score"],
                score_components["rating_score"],
                score_components["activity_score"],
                score_components["completion_score"]
            ])
            
            score_components["total_score"] = total_score
            score_components["calculated_at"] = datetime.utcnow().isoformat()
            
            logger.info(f"Calculated score for professional {professional_id}: {total_score}")
            return score_components
            
        except Exception as e:
            logger.error(f"Error calculating professional score for {professional_id}: {e}")
            raise