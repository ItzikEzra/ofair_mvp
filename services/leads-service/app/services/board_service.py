"""Lead Board service with personalization and subscription prioritization."""

import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, desc, func

import sys
sys.path.append("/root/repos/ofair_mvp/libs")
from python_shared.database.models import (
    User, Professional, Lead, ConsumerLead, ProfessionalLead,
    LeadStatus, ProfessionalStatus, Proposal, ProposalStatus
)

from ..models.leads import (
    LeadBoardItem, LeadBoardResponse, HebrewCategories
)
from .geo_service import IsraeliGeoService, LocationInfo

logger = logging.getLogger(__name__)


class LeadBoardService:
    """Lead Board service with personalized matching and prioritization."""
    
    def __init__(self, db: Session, geo_service: IsraeliGeoService):
        self.db = db
        self.geo_service = geo_service
        
    async def get_personalized_lead_board(
        self,
        professional: Professional,
        user: User,
        limit: int = 50,
        category_filter: Optional[str] = None,
        location_radius_km: Optional[int] = None
    ) -> LeadBoardResponse:
        """
        Get personalized Lead Board for a professional.
        
        Args:
            professional: Professional requesting the board
            user: User profile
            limit: Maximum number of leads to return
            category_filter: Optional category filter
            location_radius_km: Optional location radius filter
            
        Returns:
            Personalized Lead Board response
        """
        try:
            # Get professional's location for geo matching
            professional_location = None
            if professional.location:
                professional_location = await self.geo_service.geocode_location(
                    professional.location
                )
            
            # Check subscription status (simplified - in production check actual subscription)
            has_subscription = await self._check_subscription_status(professional)
            
            # Get base leads query
            leads_query = self._build_base_leads_query(professional)
            
            # Apply filters
            if category_filter:
                leads_query = leads_query.filter(Lead.category == category_filter)
            
            # Get leads (more than needed for scoring and filtering)
            leads = leads_query.limit(limit * 3).all()
            
            # Score and rank leads
            scored_leads = await self._score_and_rank_leads(
                leads,
                professional,
                professional_location,
                has_subscription,
                location_radius_km or 25
            )
            
            # Apply subscription-based prioritization
            prioritized_leads = self._apply_subscription_prioritization(
                scored_leads,
                has_subscription
            )
            
            # Limit results
            final_leads = prioritized_leads[:limit]
            
            # Create response
            return LeadBoardResponse(
                leads=final_leads,
                total_matches=len(scored_leads),
                subscription_benefits_applied=has_subscription,
                last_updated=datetime.utcnow(),
                personalization_factors={
                    "location_weight": 0.3,
                    "category_weight": 0.4,
                    "recency_weight": 0.2,
                    "budget_weight": 0.1,
                    "subscription_boost": 0.2 if has_subscription else 0.0,
                    "professional_location": professional.location,
                    "specialties": professional.specialties or []
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to generate lead board for professional {professional.id}: {e}")
            raise
            
    def _build_base_leads_query(self, professional: Professional):
        """Build base query for leads with exclusions."""
        
        # Exclude leads created by this professional
        query = self.db.query(Lead).options(
            joinedload(Lead.professional_details),
            joinedload(Lead.consumer_details)
        ).filter(
            and_(
                Lead.status == LeadStatus.ACTIVE,
                Lead.created_by_professional_id != professional.id
            )
        )
        
        # Exclude leads the professional already proposed to
        proposed_lead_ids = self.db.query(Proposal.lead_id).filter(
            Proposal.professional_id == professional.id
        ).subquery()
        
        query = query.filter(~Lead.id.in_(proposed_lead_ids))
        
        # Order by recency for base query
        query = query.order_by(desc(Lead.created_at))
        
        return query
        
    async def _score_and_rank_leads(
        self,
        leads: List[Lead],
        professional: Professional,
        professional_location: Optional[LocationInfo],
        has_subscription: bool,
        max_distance_km: int
    ) -> List[LeadBoardItem]:
        """Score and rank leads based on multiple factors."""
        
        scored_leads = []
        
        for lead in leads:
            try:
                # Calculate match score
                match_score = await self._calculate_match_score(
                    lead,
                    professional,
                    professional_location,
                    max_distance_km
                )
                
                # Skip leads with very low scores (unless has subscription)
                min_score = 20 if has_subscription else 30
                if match_score < min_score:
                    continue
                    
                # Get location matching details
                distance_km = None
                location_match = False
                
                if professional_location:
                    lead_location = await self.geo_service.geocode_location(lead.location)
                    if lead_location:
                        distance_info = await self.geo_service.calculate_distance(
                            professional_location,
                            lead_location,
                            max_distance_km
                        )
                        distance_km = distance_info.distance_km
                        location_match = distance_info.is_within_radius
                
                # Check category match
                category_match = self._is_category_match(lead, professional)
                
                # Create board item
                board_item = LeadBoardItem(
                    id=lead.id,
                    type=lead.type,
                    title=lead.title,
                    short_description=lead.short_description,
                    category=lead.category,
                    category_hebrew=HebrewCategories.get_hebrew_name(lead.category),
                    location=lead.location,
                    created_at=lead.created_at,
                    match_score=match_score,
                    distance_km=distance_km,
                    category_match=category_match,
                    location_match=location_match,
                    is_priority=has_subscription
                )
                
                # Add professional lead specific data
                if lead.professional_details:
                    board_item.estimated_budget = lead.professional_details.estimated_budget
                    board_item.referrer_share_percentage = lead.professional_details.referrer_share_percentage
                
                scored_leads.append(board_item)
                
            except Exception as e:
                logger.error(f"Failed to score lead {lead.id}: {e}")
                continue
                
        # Sort by match score (descending)
        scored_leads.sort(key=lambda x: x.match_score, reverse=True)
        
        return scored_leads
        
    async def _calculate_match_score(
        self,
        lead: Lead,
        professional: Professional,
        professional_location: Optional[LocationInfo],
        max_distance_km: int
    ) -> float:
        """
        Calculate comprehensive match score for a lead.
        
        Score components:
        - Category match: 40%
        - Location proximity: 30%
        - Recency: 20% 
        - Budget attractiveness: 10%
        """
        
        score = 0.0
        
        # 1. Category Match (40 points max)
        category_score = self._calculate_category_score(lead, professional)
        score += category_score * 0.4
        
        # 2. Location Score (30 points max)
        location_score = 0.0
        if professional_location:
            lead_location = await self.geo_service.geocode_location(lead.location)
            if lead_location:
                location_score = self._calculate_location_score(
                    professional_location,
                    lead_location,
                    max_distance_km
                )
        score += location_score * 0.3
        
        # 3. Recency Score (20 points max)
        recency_score = self._calculate_recency_score(lead.created_at)
        score += recency_score * 0.2
        
        # 4. Budget Score (10 points max)
        budget_score = self._calculate_budget_score(lead)
        score += budget_score * 0.1
        
        return min(100.0, max(0.0, score))
        
    def _calculate_category_score(self, lead: Lead, professional: Professional) -> float:
        """Calculate category match score (0-100)."""
        
        # Exact profession match
        if professional.profession == lead.category:
            return 100.0
            
        # Specialty match
        if professional.specialties and lead.category in professional.specialties:
            return 90.0
            
        # Related categories (simplified mapping)
        related_categories = {
            "renovation": ["electrical", "plumbing", "painting", "maintenance"],
            "electrical": ["renovation", "maintenance"],
            "plumbing": ["renovation", "maintenance"], 
            "cleaning": ["maintenance"],
            "maintenance": ["electrical", "plumbing", "cleaning"],
            "design": ["renovation", "consulting"],
            "consulting": ["design", "legal", "finance"]
        }
        
        if lead.category in related_categories.get(professional.profession, []):
            return 60.0
            
        # Specialty partially matches
        if professional.specialties:
            for specialty in professional.specialties:
                if specialty in related_categories.get(lead.category, []):
                    return 50.0
                    
        return 0.0
        
    def _calculate_location_score(
        self,
        professional_location: LocationInfo,
        lead_location: LocationInfo,
        max_distance_km: int
    ) -> float:
        """Calculate location proximity score (0-100)."""
        
        # Same city
        if self.geo_service.is_same_city(professional_location, lead_location):
            return 100.0
            
        # Same region
        if self.geo_service.is_same_region(professional_location, lead_location):
            return 80.0
            
        # Distance-based scoring
        try:
            from geopy.distance import geodesic
            
            point1 = (professional_location.latitude, professional_location.longitude)
            point2 = (lead_location.latitude, lead_location.longitude)
            distance_km = geodesic(point1, point2).kilometers
            
            if distance_km <= max_distance_km:
                # Linear decrease from 70 to 0 based on distance
                return max(0.0, 70.0 * (1.0 - (distance_km / max_distance_km)))
            else:
                return 0.0
                
        except Exception as e:
            logger.error(f"Failed to calculate distance score: {e}")
            return 0.0
            
    def _calculate_recency_score(self, created_at: datetime) -> float:
        """Calculate recency score (0-100)."""
        
        now = datetime.utcnow()
        hours_ago = (now - created_at).total_seconds() / 3600
        
        if hours_ago <= 1:
            return 100.0  # Very fresh
        elif hours_ago <= 6:
            return 90.0   # Fresh
        elif hours_ago <= 24:
            return 75.0   # Same day
        elif hours_ago <= 72:
            return 50.0   # Within 3 days
        elif hours_ago <= 168:  # 1 week
            return 25.0
        else:
            return 10.0   # Old leads get minimal score
            
    def _calculate_budget_score(self, lead: Lead) -> float:
        """Calculate budget attractiveness score (0-100)."""
        
        if lead.type != "professional_referral" or not lead.professional_details:
            return 50.0  # Neutral score for consumer leads
            
        budget = lead.professional_details.estimated_budget
        if not budget:
            return 30.0
            
        # Score based on budget ranges (ILS)
        if budget >= 10000:
            return 100.0  # High-value projects
        elif budget >= 5000:
            return 80.0
        elif budget >= 2000:
            return 60.0
        elif budget >= 1000:
            return 40.0
        elif budget >= 500:
            return 20.0
        else:
            return 10.0   # Very low budget
            
    def _is_category_match(self, lead: Lead, professional: Professional) -> bool:
        """Check if lead category matches professional's expertise."""
        
        if professional.profession == lead.category:
            return True
            
        if professional.specialties and lead.category in professional.specialties:
            return True
            
        return False
        
    def _apply_subscription_prioritization(
        self,
        scored_leads: List[LeadBoardItem],
        has_subscription: bool
    ) -> List[LeadBoardItem]:
        """Apply subscription-based prioritization and boost."""
        
        if not has_subscription:
            return scored_leads
            
        # Boost scores for subscribers
        for lead in scored_leads:
            lead.match_score = min(100.0, lead.match_score * 1.2)  # 20% boost
            lead.is_priority = True
            
        # Premium leads first (example: high-budget professional referrals)
        priority_leads = []
        regular_leads = []
        
        for lead in scored_leads:
            is_premium = (
                lead.type == "professional_referral" and
                lead.estimated_budget and 
                lead.estimated_budget >= 5000
            )
            
            if is_premium:
                priority_leads.append(lead)
            else:
                regular_leads.append(lead)
                
        # Combine with premium leads first
        return priority_leads + regular_leads
        
    async def _check_subscription_status(self, professional: Professional) -> bool:
        """
        Check if professional has active subscription.
        
        This is simplified - in production, check actual subscription data.
        """
        # Simplified check based on professional status and verification
        # In production, query subscription table
        return professional.is_verified and professional.status == ProfessionalStatus.ACTIVE
        
    async def get_lead_board_stats(
        self,
        professional: Professional,
        days_back: int = 30
    ) -> Dict[str, Any]:
        """Get Lead Board statistics for professional."""
        
        try:
            since_date = datetime.utcnow() - timedelta(days=days_back)
            
            # Total active leads in their categories
            category_leads = self.db.query(Lead).filter(
                and_(
                    Lead.status == LeadStatus.ACTIVE,
                    Lead.created_at >= since_date,
                    or_(
                        Lead.category == professional.profession,
                        Lead.category.in_(professional.specialties or [])
                    )
                )
            ).count()
            
            # Leads they've proposed to
            proposed_count = self.db.query(Proposal).join(Lead).filter(
                and_(
                    Proposal.professional_id == professional.id,
                    Lead.created_at >= since_date
                )
            ).count()
            
            # Accepted proposals
            accepted_count = self.db.query(Proposal).join(Lead).filter(
                and_(
                    Proposal.professional_id == professional.id,
                    Proposal.status == ProposalStatus.ACCEPTED,
                    Lead.created_at >= since_date
                )
            ).count()
            
            # Calculate conversion rate
            conversion_rate = (accepted_count / proposed_count * 100) if proposed_count > 0 else 0
            
            return {
                "total_relevant_leads": category_leads,
                "proposals_sent": proposed_count,
                "proposals_accepted": accepted_count,
                "conversion_rate": round(conversion_rate, 1),
                "days_period": days_back,
                "professional_categories": [professional.profession] + (professional.specialties or []),
                "has_subscription": await self._check_subscription_status(professional)
            }
            
        except Exception as e:
            logger.error(f"Failed to get lead board stats: {e}")
            return {}
            
    async def get_recommended_categories(
        self,
        professional: Professional,
        location_radius_km: int = 25
    ) -> List[Dict[str, Any]]:
        """Get category recommendations based on local demand."""
        
        try:
            # Get professional location
            professional_location = None
            if professional.location:
                professional_location = await self.geo_service.geocode_location(
                    professional.location
                )
            
            # Get recent leads by category in area
            since_date = datetime.utcnow() - timedelta(days=30)
            
            category_stats = self.db.query(
                Lead.category,
                func.count(Lead.id).label('lead_count'),
                func.avg(ProfessionalLead.estimated_budget).label('avg_budget')
            ).outerjoin(ProfessionalLead).filter(
                and_(
                    Lead.status == LeadStatus.ACTIVE,
                    Lead.created_at >= since_date
                )
            ).group_by(Lead.category).order_by(desc('lead_count')).limit(10).all()
            
            recommendations = []
            for category, count, avg_budget in category_stats:
                recommendations.append({
                    "category": category,
                    "category_hebrew": HebrewCategories.get_hebrew_name(category),
                    "recent_leads": count,
                    "average_budget": float(avg_budget) if avg_budget else None,
                    "is_current_specialty": category in ([professional.profession] + (professional.specialties or []))
                })
                
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to get category recommendations: {e}")
            return []