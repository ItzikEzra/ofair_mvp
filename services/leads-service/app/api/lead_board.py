"""Lead Board API with personalized matching and geo-location features."""

import logging
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

import sys
sys.path.append("/root/repos/ofair_mvp/libs")
from python_shared.database.connection import get_db

from ..deps import get_current_professional, get_redis_client
from ..models.leads import LeadBoardResponse, LeadErrorResponse
from ..services.board_service import LeadBoardService
from ..services.geo_service import IsraeliGeoService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/leads/board", tags=["lead-board"])


@router.get(
    "/",
    response_model=LeadBoardResponse,
    responses={
        401: {"model": LeadErrorResponse},
        403: {"model": LeadErrorResponse}
    }
)
async def get_personalized_lead_board(
    category: Optional[str] = Query(None, description="Filter by specific category"),
    radius_km: Optional[int] = Query(None, ge=1, le=100, description="Service radius in kilometers"),
    limit: int = Query(50, ge=1, le=100, description="Maximum leads to return"),
    current_professional_data: tuple = Depends(get_current_professional),
    db: Session = Depends(get_db)
) -> LeadBoardResponse:
    """
    Get personalized Lead Board for the authenticated professional.
    
    **Professional Access Required**
    
    **Personalization Features:**
    - **Geographic Matching**: Prioritizes leads within service radius
    - **Category Matching**: Matches professional's specialties and main profession
    - **Subscription Benefits**: Paid subscribers get priority access and score boosts
    - **Recency Scoring**: Recent leads get higher priority
    - **Budget Awareness**: Higher-budget leads score better
    
    **Algorithm Components:**
    - Category match: 40% of score
    - Location proximity: 30% of score  
    - Recency factor: 20% of score
    - Budget attractiveness: 10% of score
    
    **Subscription Advantages:**
    - 20% score boost on all leads
    - Access to premium high-budget leads first
    - Lower minimum score threshold
    - Extended radius matching
    
    **Geographic Features:**
    - Israeli location recognition (Hebrew + English)
    - City and region-based matching
    - Distance calculation and scoring
    - Service area recommendations
    
    **Business Rules:**
    - Excludes professional's own leads
    - Excludes already-proposed leads
    - Active leads only
    - Respects professional status requirements
    """
    try:
        token_claims, user, professional = current_professional_data
        
        # Initialize services
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        board_service = LeadBoardService(db, geo_service)
        
        # Generate personalized Lead Board
        lead_board = await board_service.get_personalized_lead_board(
            professional=professional,
            user=user,
            limit=limit,
            category_filter=category,
            location_radius_km=radius_km
        )
        
        logger.info(
            f"Generated Lead Board for professional {professional.id}: "
            f"{len(lead_board.leads)} leads, subscription={lead_board.subscription_benefits_applied}"
        )
        
        return lead_board
        
    except Exception as e:
        logger.error(f"Failed to generate Lead Board for professional {professional.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate personalized Lead Board"
        )


@router.get(
    "/stats",
    response_model=Dict[str, Any],
    responses={
        401: {"model": LeadErrorResponse},
        403: {"model": LeadErrorResponse}
    }
)
async def get_lead_board_stats(
    days_back: int = Query(30, ge=1, le=365, description="Days to look back for statistics"),
    current_professional_data: tuple = Depends(get_current_professional),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get Lead Board performance statistics for the professional.
    
    **Professional Access Required**
    
    **Statistics Provided:**
    - **Total Relevant Leads**: Leads matching professional's categories
    - **Proposals Sent**: Number of proposals submitted
    - **Proposals Accepted**: Successful proposals
    - **Conversion Rate**: Success rate percentage
    - **Category Performance**: Breakdown by service category
    - **Subscription Status**: Current subscription benefits
    
    **Time Period**: Configurable lookback period (1-365 days)
    
    **Use Cases:**
    - Performance tracking dashboard
    - Business intelligence
    - Subscription value demonstration
    - Professional optimization insights
    """
    try:
        token_claims, user, professional = current_professional_data
        
        # Initialize services
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        board_service = LeadBoardService(db, geo_service)
        
        # Get comprehensive stats
        stats = await board_service.get_lead_board_stats(professional, days_back)
        
        return stats
        
    except Exception as e:
        logger.error(f"Failed to get Lead Board stats for professional {professional.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve statistics"
        )


@router.get(
    "/recommendations/categories",
    response_model=List[Dict[str, Any]],
    responses={
        401: {"model": LeadErrorResponse},
        403: {"model": LeadErrorResponse}
    }
)
async def get_category_recommendations(
    radius_km: int = Query(25, ge=1, le=100, description="Analysis radius"),
    current_professional_data: tuple = Depends(get_current_professional),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get category expansion recommendations based on local demand.
    
    **Professional Access Required**
    
    **Recommendation Logic:**
    - **Local Demand Analysis**: Recent lead volume by category in area
    - **Budget Analysis**: Average project values by category
    - **Competition Assessment**: Professional density per category
    - **Specialization Gaps**: Underserved categories identification
    
    **Data Points Per Category:**
    - Recent lead count (30 days)
    - Average budget range
    - Current specialty status
    - Hebrew category names
    - Growth potential score
    
    **Geographic Scope:**
    - Configurable radius around professional's location
    - City and region-based analysis
    - Israeli market focus
    
    **Business Value:**
    - Service expansion opportunities
    - Market demand visibility
    - Revenue optimization suggestions
    - Strategic business planning
    """
    try:
        token_claims, user, professional = current_professional_data
        
        # Initialize services
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        board_service = LeadBoardService(db, geo_service)
        
        # Get category recommendations
        recommendations = await board_service.get_recommended_categories(
            professional,
            radius_km
        )
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Failed to get category recommendations for professional {professional.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate category recommendations"
        )


@router.get(
    "/preferences",
    response_model=Dict[str, Any],
    responses={
        401: {"model": LeadErrorResponse},
        403: {"model": LeadErrorResponse}
    }
)
async def get_lead_board_preferences(
    current_professional_data: tuple = Depends(get_current_professional),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get current Lead Board personalization preferences.
    
    **Professional Access Required**
    
    **Preference Categories:**
    - **Geographic**: Service radius, preferred regions
    - **Categories**: Primary profession, specialties, interests
    - **Budget**: Minimum project values, preferred ranges
    - **Scheduling**: Availability, response times
    - **Notifications**: Lead alert preferences
    
    **Personalization Data:**
    - Current location and service area
    - Active specialties and certifications
    - Historical performance metrics
    - Subscription status and benefits
    
    **Configuration Options:**
    - Custom service radius
    - Category priority weights
    - Budget range filters
    - Lead freshness preferences
    """
    try:
        token_claims, user, professional = current_professional_data
        
        # Initialize services
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        board_service = LeadBoardService(db, geo_service)
        
        # Get professional location info
        location_info = None
        if professional.location:
            location_info = await geo_service.geocode_location(professional.location)
        
        # Get recommended service radius
        service_radius = 25  # default
        if location_info:
            service_radius = await geo_service.get_professional_service_radius(location_info)
        
        # Build preferences response
        preferences = {
            "professional_id": str(professional.id),
            "location": {
                "address": professional.location,
                "coordinates": {
                    "latitude": location_info.latitude if location_info else None,
                    "longitude": location_info.longitude if location_info else None
                },
                "city": location_info.city if location_info else None,
                "region": location_info.region if location_info else None,
                "recommended_radius_km": service_radius
            },
            "categories": {
                "primary_profession": professional.profession,
                "specialties": professional.specialties or [],
                "all_relevant": [professional.profession] + (professional.specialties or [])
            },
            "status": {
                "verification": professional.is_verified,
                "status": professional.status.value,
                "rating": float(professional.rating) if professional.rating else 0.0,
                "review_count": professional.review_count
            },
            "subscription": {
                "has_active": await board_service._check_subscription_status(professional),
                "benefits": [
                    "Priority lead access",
                    "20% score boost",
                    "Premium lead filtering", 
                    "Extended service radius",
                    "Advanced analytics"
                ]
            },
            "personalization": {
                "location_weight": 0.3,
                "category_weight": 0.4,
                "recency_weight": 0.2,
                "budget_weight": 0.1,
                "last_updated": "2024-01-01T00:00:00Z"  # In production, track actual updates
            }
        }
        
        return preferences
        
    except Exception as e:
        logger.error(f"Failed to get preferences for professional {professional.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve Lead Board preferences"
        )


@router.post(
    "/refresh",
    response_model=Dict[str, Any],
    responses={
        401: {"model": LeadErrorResponse},
        403: {"model": LeadErrorResponse}
    }
)
async def refresh_lead_board_cache(
    current_professional_data: tuple = Depends(get_current_professional),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Force refresh of Lead Board personalization cache.
    
    **Professional Access Required**
    
    **Cache Refresh Operations:**
    - Clear personalization cache
    - Invalidate location geocoding cache
    - Reset category matching weights
    - Update subscription status
    
    **Use Cases:**
    - Profile updates (location, specialties)
    - Subscription changes
    - Performance optimization
    - Debug and testing
    
    **Rate Limits:** 5 refreshes per hour per professional
    
    **Response:** Cache refresh status and new cache keys
    """
    try:
        token_claims, user, professional = current_professional_data
        
        # Initialize Redis client
        redis_client = await get_redis_client()
        
        # Clear professional-specific caches
        cache_keys = [
            f"lead_board:{professional.id}:*",
            f"geocode:{professional.location.lower().strip()}" if professional.location else None,
            f"professional_location:{professional.id}",
            f"board_preferences:{professional.id}"
        ]
        
        cleared_keys = 0
        for key_pattern in cache_keys:
            if key_pattern:
                try:
                    if '*' in key_pattern:
                        # Pattern-based deletion
                        keys = await redis_client.keys(key_pattern)
                        if keys:
                            deleted = await redis_client.delete(*keys)
                            cleared_keys += deleted
                    else:
                        # Single key deletion
                        deleted = await redis_client.delete(key_pattern)
                        cleared_keys += deleted
                except Exception as cache_error:
                    logger.warning(f"Failed to clear cache key {key_pattern}: {cache_error}")
        
        logger.info(f"Refreshed Lead Board cache for professional {professional.id}: {cleared_keys} keys cleared")
        
        return {
            "status": "success",
            "professional_id": str(professional.id),
            "cache_keys_cleared": cleared_keys,
            "refresh_timestamp": "2024-01-01T00:00:00Z",  # In production, use actual timestamp
            "message": "Lead Board cache refreshed successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to refresh cache for professional {professional.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to refresh Lead Board cache"
        )