"""Lead management API endpoints."""

import logging
import uuid
from typing import Optional, List
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session

import sys
sys.path.append("/root/repos/ofair_mvp/libs")
from python_shared.database.connection import get_db
from python_shared.database.models import User, Professional

from ..deps import (
    get_current_user, get_current_professional, get_current_user_optional,
    require_lead_access, require_lead_owner, check_lead_creation_rate_limit,
    check_referral_rate_limit, get_redis_client, log_pii_access
)
from ..models.leads import (
    LeadCreateRequest, LeadUpdateRequest, LeadDetailResponse,
    LeadListItem, LeadShareRequest, ReferralResponse, LeadSearchFilters,
    LeadSearchResponse, LeadCategoriesResponse, ValidationErrorResponse,
    LeadErrorResponse
)
from ..services.lead_service import LeadService
from ..services.geo_service import IsraeliGeoService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/leads", tags=["leads"])


@router.post(
    "/",
    response_model=LeadDetailResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ValidationErrorResponse},
        401: {"model": LeadErrorResponse},
        429: {"model": LeadErrorResponse}
    }
)
async def create_lead(
    lead_data: LeadCreateRequest,
    current_user_data: tuple = Depends(get_current_user),
    _: None = Depends(check_lead_creation_rate_limit),
    db: Session = Depends(get_db)
) -> LeadDetailResponse:
    """
    Create a new lead.
    
    Consumer leads contain client PII and detailed descriptions.
    Professional referral leads include budget estimates and referrer share.
    
    **Rate Limits:**
    - Consumers: 3 per hour, 10 per day
    - Professionals: 5 per hour, 20 per day
    """
    try:
        token_claims, user = current_user_data
        
        # Get professional profile if user is professional
        professional = None
        if token_claims.role == "professional":
            professional = db.query(Professional).filter(
                Professional.user_id == user.id
            ).first()
        
        # Initialize services
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        lead_service = LeadService(db, geo_service)
        
        # Create lead
        lead = await lead_service.create_lead(lead_data, user, professional)
        
        return lead
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create lead: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create lead"
        )


@router.get(
    "/public",
    response_model=LeadSearchResponse,
    responses={400: {"model": ValidationErrorResponse}}
)
async def get_public_leads(
    category: Optional[str] = Query(None, description="Filter by category"),
    location: Optional[str] = Query(None, description="Filter by location"),
    radius_km: Optional[int] = Query(None, ge=1, le=100, description="Search radius in km"),
    min_budget: Optional[Decimal] = Query(None, ge=0, description="Minimum budget filter"),
    max_budget: Optional[Decimal] = Query(None, ge=0, description="Maximum budget filter"),
    subscription_filter: Optional[bool] = Query(None, description="Filter for subscribers only"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user_data: Optional[tuple] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> LeadSearchResponse:
    """
    Get paginated public list of leads with filters.
    
    **Public Access:** No authentication required for basic lead browsing.
    **Filters:**
    - category: Hebrew category key (renovation, cleaning, etc.)  
    - location: Israeli location (Hebrew or English)
    - radius_km: Search radius from location (1-100 km)
    - min_budget/max_budget: Budget range for professional referrals
    - subscription_filter: Show leads prioritized for subscribers
    
    **PII Protection:** Client details are masked in public view.
    """
    try:
        # Build filters
        filters = LeadSearchFilters(
            category=category,
            location=location,
            radius_km=radius_km,
            min_budget=min_budget,
            max_budget=max_budget,
            subscription_filter=subscription_filter
        )
        
        # Get current user if authenticated
        requesting_user = None
        if current_user_data:
            _, requesting_user = current_user_data
            
        # Initialize services
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        lead_service = LeadService(db, geo_service)
        
        # Search leads
        leads, total_count = await lead_service.search_leads(
            filters.dict(exclude_unset=True),
            page,
            page_size,
            requesting_user
        )
        
        # Calculate pagination info
        total_pages = (total_count + page_size - 1) // page_size
        
        return LeadSearchResponse(
            leads=leads,
            total=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1,
            filters=filters
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get public leads: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve leads"
        )


@router.get(
    "/{lead_id}",
    response_model=LeadDetailResponse,
    responses={
        404: {"model": LeadErrorResponse},
        403: {"model": LeadErrorResponse}
    }
)
async def get_lead_detail(
    lead_access_data: tuple = Depends(require_lead_access(allow_public=True)),
    request: Request = None,
    db: Session = Depends(get_db)
) -> LeadDetailResponse:
    """
    Get detailed lead information.
    
    **Authorization:**
    - Public: Basic lead info without PII
    - Lead Owner: Full access including PII
    - Professionals with accepted proposals: Full PII access
    - Admins: Full access
    
    **PII Protection:** Sensitive client data only shown to authorized users.
    All PII access is logged for audit purposes.
    """
    try:
        lead, token_claims, user, can_see_pii = lead_access_data
        
        # Log PII access if applicable
        if can_see_pii and user:
            await log_pii_access(
                user.id,
                lead.id,
                "full",
                request,
                db
            )
        
        # Initialize services
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        lead_service = LeadService(db, geo_service)
        
        # Get detailed lead info
        lead_detail = await lead_service.get_lead_details(
            lead.id,
            user,
            can_see_pii
        )
        
        if not lead_detail:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
            
        return lead_detail
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get lead detail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve lead details"
        )


@router.put(
    "/{lead_id}",
    response_model=LeadDetailResponse,
    responses={
        404: {"model": LeadErrorResponse},
        403: {"model": LeadErrorResponse},
        400: {"model": ValidationErrorResponse}
    }
)
async def update_lead(
    lead_id: uuid.UUID,
    update_data: LeadUpdateRequest,
    lead_owner_data: tuple = Depends(require_lead_owner()),
    db: Session = Depends(get_db)
) -> LeadDetailResponse:
    """
    Update an existing lead.
    
    **Authorization:** Only lead owner can modify the lead.
    **Restrictions:** Cannot change lead type after creation.
    **Validation:** Location and category changes are validated.
    """
    try:
        lead, token_claims, user = lead_owner_data
        
        # Initialize services
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        lead_service = LeadService(db, geo_service)
        
        # Update lead
        updated_lead = await lead_service.update_lead(
            lead_id,
            update_data,
            user
        )
        
        if not updated_lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
            
        return updated_lead
        
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update lead {lead_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update lead"
        )


@router.post(
    "/{lead_id}/share",
    response_model=ReferralResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        404: {"model": LeadErrorResponse},
        403: {"model": LeadErrorResponse},
        400: {"model": ValidationErrorResponse},
        429: {"model": LeadErrorResponse}
    }
)
async def share_lead(
    lead_id: uuid.UUID,
    share_data: LeadShareRequest,
    current_professional_data: tuple = Depends(get_current_professional),
    _: None = Depends(check_referral_rate_limit),
    db: Session = Depends(get_db)
) -> ReferralResponse:
    """
    Create a referral offer to another professional.
    
    **Authorization:** Professional access required.
    **Business Logic:**
    - Creates referral with commission terms
    - Notifies receiver professional
    - Tracks referral status and completion
    
    **Rate Limits:** 5 per hour, 20 per day per professional.
    **Commission:** 0-90% of final project amount.
    """
    try:
        token_claims, user, professional = current_professional_data
        
        # Initialize services
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        lead_service = LeadService(db, geo_service)
        
        # Create referral
        referral = await lead_service.share_lead(
            lead_id,
            share_data,
            professional
        )
        
        if not referral:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
            
        return referral
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to share lead {lead_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create referral"
        )


@router.get(
    "/categories",
    response_model=LeadCategoriesResponse
)
async def get_lead_categories() -> LeadCategoriesResponse:
    """
    Get all available lead categories with Hebrew names.
    
    **Public Access:** No authentication required.
    **Hebrew Support:** Returns Hebrew category names for UI display.
    **Categories:** renovation, cleaning, electrical, plumbing, etc.
    """
    try:
        # Initialize services (no DB needed for this endpoint)
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        lead_service = LeadService(None, geo_service)  # No DB session needed
        
        categories = await lead_service.get_lead_categories()
        
        return LeadCategoriesResponse(categories=categories)
        
    except Exception as e:
        logger.error(f"Failed to get categories: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve categories"
        )


@router.get(
    "/search",
    response_model=LeadSearchResponse,
    responses={400: {"model": ValidationErrorResponse}}
)
async def advanced_lead_search(
    category: Optional[str] = Query(None, description="Category filter"),
    location: Optional[str] = Query(None, description="Location filter"),
    radius_km: Optional[int] = Query(None, ge=1, le=100, description="Search radius"),
    min_budget: Optional[Decimal] = Query(None, ge=0, description="Minimum budget"),
    max_budget: Optional[Decimal] = Query(None, ge=0, description="Maximum budget"),
    lead_type: Optional[str] = Query(None, description="Lead type filter"),
    status: Optional[str] = Query(None, description="Status filter"),
    created_after: Optional[str] = Query(None, description="Created after date (ISO)"),
    created_before: Optional[str] = Query(None, description="Created before date (ISO)"),
    subscription_filter: Optional[bool] = Query(None, description="Subscription filter"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: Optional[str] = Query("created_at", description="Sort field"),
    sort_order: Optional[str] = Query("desc", description="Sort order"),
    current_user_data: Optional[tuple] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
) -> LeadSearchResponse:
    """
    Advanced lead search with comprehensive filters.
    
    **Filters:**
    - **category**: Service category (Hebrew key)
    - **location**: Israeli location with radius search
    - **budget**: Min/max budget range for professional referrals
    - **lead_type**: consumer | professional_referral
    - **status**: active | pending | closed
    - **date_range**: Created date range filtering
    - **subscription_filter**: Priority for subscribers
    
    **Sorting:** created_at, budget, location (with custom sort orders)
    **Pagination:** Standard page-based pagination
    **Hebrew Support:** Location and category text search
    """
    try:
        from datetime import datetime
        
        # Parse date filters
        created_after_dt = None
        created_before_dt = None
        
        if created_after:
            try:
                created_after_dt = datetime.fromisoformat(created_after.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError("Invalid created_after date format. Use ISO format.")
                
        if created_before:
            try:
                created_before_dt = datetime.fromisoformat(created_before.replace('Z', '+00:00'))
            except ValueError:
                raise ValueError("Invalid created_before date format. Use ISO format.")
        
        # Build comprehensive filters
        filters = LeadSearchFilters(
            category=category,
            location=location,
            radius_km=radius_km,
            min_budget=min_budget,
            max_budget=max_budget,
            lead_type=lead_type,
            status=status,
            created_after=created_after_dt,
            created_before=created_before_dt,
            subscription_filter=subscription_filter
        )
        
        # Get current user
        requesting_user = None
        if current_user_data:
            _, requesting_user = current_user_data
            
        # Initialize services
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        lead_service = LeadService(db, geo_service)
        
        # Add sorting to filters
        search_filters = filters.dict(exclude_unset=True)
        search_filters.update({
            'sort_by': sort_by,
            'sort_order': sort_order
        })
        
        # Perform search
        leads, total_count = await lead_service.search_leads(
            search_filters,
            page,
            page_size,
            requesting_user
        )
        
        # Calculate pagination
        total_pages = (total_count + page_size - 1) // page_size
        
        return LeadSearchResponse(
            leads=leads,
            total=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1,
            filters=filters
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to perform advanced search: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search operation failed"
        )


@router.post(
    "/{lead_id}/close",
    response_model=LeadDetailResponse,
    responses={
        404: {"model": LeadErrorResponse},
        403: {"model": LeadErrorResponse}
    }
)
async def close_lead(
    lead_id: uuid.UUID,
    final_amount: Optional[Decimal] = Query(None, description="Final agreed amount"),
    lead_owner_data: tuple = Depends(require_lead_owner()),
    db: Session = Depends(get_db)
) -> LeadDetailResponse:
    """
    Close a lead and optionally set final amount.
    
    **Authorization:** Only lead owner can close the lead.
    **Business Logic:**
    - Sets lead status to CLOSED
    - Records final amount if provided
    - Triggers completion workflows
    
    **Use Cases:**
    - Lead no longer needed
    - Service completed outside platform
    - Lead expired or cancelled
    """
    try:
        lead, token_claims, user = lead_owner_data
        
        # Initialize services
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        lead_service = LeadService(db, geo_service)
        
        # Close lead
        closed_lead = await lead_service.close_lead(
            lead_id,
            user,
            final_amount
        )
        
        if not closed_lead:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lead not found"
            )
            
        return closed_lead
        
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to close lead {lead_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to close lead"
        )


@router.get(
    "/my",
    response_model=List[LeadListItem],
    responses={401: {"model": LeadErrorResponse}}
)
async def get_my_leads(
    lead_type: Optional[str] = Query(None, description="Filter by lead type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user_data: tuple = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[LeadListItem]:
    """
    Get leads created by the current user.
    
    **Authorization:** User authentication required.
    **Features:**
    - Shows user's own leads with full visibility
    - Supports type and status filtering
    - Paginated results
    
    **Use Cases:**
    - User dashboard
    - Lead management
    - Performance tracking
    """
    try:
        token_claims, user = current_user_data
        
        # Initialize services
        redis_client = await get_redis_client()
        geo_service = IsraeliGeoService(redis_client)
        lead_service = LeadService(db, geo_service)
        
        # Parse filters
        from python_shared.database.models import LeadType, LeadStatus
        
        lead_type_enum = None
        if lead_type:
            lead_type_enum = LeadType(lead_type)
            
        status_enum = None
        if status:
            status_enum = LeadStatus(status)
        
        # Get user's leads
        leads, total_count = await lead_service.get_user_leads(
            user,
            lead_type_enum,
            status_enum,
            page,
            page_size
        )
        
        return leads
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get user leads: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user leads"
        )