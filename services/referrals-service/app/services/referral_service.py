import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

from ..models.referrals import (
    ReferralResponse, ReferralStatus, ReferralChainResponse, 
    ReferralChainNode, ReferralStatsResponse, ReferralDB
)
from ..database import get_database
from ..utils.hebrew_utils import validate_hebrew_content

class ReferralService:
    def __init__(self):
        self.db = get_database()
    
    async def create_referral(
        self,
        referrer_id: str,
        lead_id: str,
        proposal_id: str,
        commission_rate: Optional[Decimal] = None,
        referral_context: Optional[Dict[str, Any]] = None
    ) -> ReferralResponse:
        """
        יצירת הפניה חדשה - Create new referral
        """
        # Validate inputs
        await self._validate_referral_creation(referrer_id, lead_id, proposal_id)
        
        # Get default commission rate if not provided
        if commission_rate is None:
            commission_rate = await self._get_default_commission_rate(lead_id)
        
        # Get referred user from proposal
        referred_user_id = await self._get_referred_user_from_proposal(proposal_id)
        
        # Validate Hebrew content in context if provided
        if referral_context:
            await self._validate_hebrew_context(referral_context)
        
        referral_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        referral_data = {
            "id": referral_id,
            "referrer_id": referrer_id,
            "referred_user_id": referred_user_id,
            "lead_id": lead_id,
            "proposal_id": proposal_id,
            "status": ReferralStatus.PENDING.value,
            "commission_rate": commission_rate,
            "context": referral_context,
            "created_at": now,
            "updated_at": now
        }
        
        # Insert into database
        await self.db.insert_referral(referral_data)
        
        # Log referral creation for audit
        await self._log_referral_action(referral_id, "created", referrer_id)
        
        return ReferralResponse(**referral_data)
    
    async def get_referral(self, referral_id: str) -> Optional[ReferralResponse]:
        """
        קבלת פרטי הפניה - Get referral details
        """
        referral_data = await self.db.get_referral(referral_id)
        
        if not referral_data:
            return None
            
        return ReferralResponse(**referral_data)
    
    async def get_user_referrals(
        self,
        user_id: str,
        status: Optional[ReferralStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[ReferralResponse]:
        """
        קבלת הפניות המשתמש - Get user's referrals
        """
        referrals_data = await self.db.get_user_referrals(
            user_id, status.value if status else None, limit, offset
        )
        
        return [ReferralResponse(**data) for data in referrals_data]
    
    async def get_referral_chain(self, referral_id: str) -> ReferralChainResponse:
        """
        קבלת שרשרת הפניות - Get complete referral chain
        """
        # Get the root referral
        root_referral = await self.get_referral(referral_id)
        if not root_referral:
            raise ValueError("הפניה לא נמצאה")
        
        # Build the referral chain
        chain_nodes = []
        current_referral = root_referral
        level = 0
        total_commission = Decimal('0')
        
        while current_referral:
            # Get referrer details
            referrer_info = await self.db.get_user_basic_info(current_referral.referrer_id)
            
            node = ReferralChainNode(
                referral_id=current_referral.id,
                referrer_id=current_referral.referrer_id,
                referrer_name=referrer_info.get("name", "משתמש לא זמין"),
                level=level,
                commission_rate=current_referral.commission_rate,
                commission_amount=current_referral.referrer_commission,
                status=current_referral.status
            )
            
            chain_nodes.append(node)
            
            if current_referral.referrer_commission:
                total_commission += current_referral.referrer_commission
            
            # Look for parent referral (who referred the current referrer)
            parent_referral = await self._find_parent_referral(current_referral.referrer_id)
            current_referral = parent_referral
            level += 1
            
            # Prevent infinite loops
            if level > 10:
                break
        
        return ReferralChainResponse(
            root_referral_id=referral_id,
            lead_id=root_referral.lead_id,
            proposal_id=root_referral.proposal_id,
            total_chain_length=len(chain_nodes),
            nodes=chain_nodes,
            total_commission_distributed=total_commission,
            created_at=root_referral.created_at
        )
    
    async def update_referral_status(
        self,
        referral_id: str,
        new_status: ReferralStatus,
        updated_by: Optional[str] = None
    ):
        """
        עדכון סטטוס הפניה - Update referral status
        """
        referral = await self.get_referral(referral_id)
        if not referral:
            raise ValueError("הפניה לא נמצאה")
        
        # Validate status transition
        if not self._is_valid_status_transition(referral.status, new_status):
            raise ValueError(f"לא ניתן לעדכן מ-{referral.status} ל-{new_status}")
        
        update_data = {
            "status": new_status.value,
            "updated_at": datetime.utcnow()
        }
        
        # Set completion time if completing
        if new_status == ReferralStatus.COMPLETED:
            update_data["completed_at"] = datetime.utcnow()
        
        await self.db.update_referral(referral_id, update_data)
        
        # Log status change
        await self._log_referral_action(
            referral_id, 
            f"status_changed_to_{new_status.value}", 
            updated_by or "system"
        )
    
    async def get_user_stats(
        self,
        user_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> ReferralStatsResponse:
        """
        סטטיסטיקות הפניות משתמש - Get user referral statistics
        """
        # Get basic referral counts
        referral_stats = await self.db.get_user_referral_stats(
            user_id, start_date, end_date
        )
        
        # Get commission information
        commission_stats = await self.db.get_user_commission_stats(
            user_id, start_date, end_date
        )
        
        # Get category performance
        category_stats = await self.db.get_user_category_performance(
            user_id, start_date, end_date
        )
        
        # Get monthly breakdown
        monthly_stats = await self.db.get_user_monthly_stats(
            user_id, start_date, end_date
        )
        
        # Calculate success rate
        total_referrals = referral_stats.get('total_referrals', 0)
        completed_referrals = referral_stats.get('completed_referrals', 0)
        success_rate = (completed_referrals / total_referrals * 100) if total_referrals > 0 else 0
        
        # Calculate average commission
        total_commission = commission_stats.get('total_commission_earned', Decimal('0'))
        avg_commission = (total_commission / total_referrals) if total_referrals > 0 else Decimal('0')
        
        return ReferralStatsResponse(
            user_id=user_id,
            period_start=start_date,
            period_end=end_date,
            total_referrals=total_referrals,
            active_referrals=referral_stats.get('active_referrals', 0),
            completed_referrals=completed_referrals,
            total_commission_earned=total_commission,
            total_commission_paid=commission_stats.get('total_commission_paid', Decimal('0')),
            pending_commission=commission_stats.get('pending_commission', Decimal('0')),
            success_rate=success_rate,
            average_commission_per_referral=avg_commission,
            top_performing_categories=category_stats,
            monthly_breakdown=monthly_stats
        )
    
    async def _validate_referral_creation(
        self,
        referrer_id: str,
        lead_id: str,
        proposal_id: str
    ):
        """Validate referral creation parameters"""
        # Check if referrer exists and is active
        referrer = await self.db.get_user_basic_info(referrer_id)
        if not referrer or not referrer.get('is_active'):
            raise ValueError("המפנה לא קיים או לא פעיל")
        
        # Check if lead exists
        lead = await self.db.get_lead(lead_id)
        if not lead:
            raise ValueError("הליד לא קיים")
        
        # Check if proposal exists and is accepted
        proposal = await self.db.get_proposal(proposal_id)
        if not proposal:
            raise ValueError("ההצעה לא קיימת")
        
        if proposal.get('status') != 'accepted':
            raise ValueError("ההצעה חייבת להיות מאושרת כדי ליצור הפניה")
        
        # Check if referral already exists for this proposal
        existing = await self.db.get_referral_by_proposal(proposal_id)
        if existing:
            raise ValueError("כבר קיימת הפניה להצעה זו")
        
        # Validate referrer is not self-referring
        if referrer_id == proposal.get('professional_id'):
            raise ValueError("לא ניתן להפנות לעצמך")
    
    async def _get_default_commission_rate(self, lead_id: str) -> Decimal:
        """Get default commission rate based on lead category"""
        lead = await self.db.get_lead(lead_id)
        category = lead.get('category', 'general')
        
        # Commission rates by category (from business logic)
        commission_rates = {
            'renovation': Decimal('0.10'),  # 10% for renovation
            'plumbing': Decimal('0.08'),    # 8% for plumbing
            'electrical': Decimal('0.08'),  # 8% for electrical
            'cleaning': Decimal('0.06'),    # 6% for cleaning
            'general': Decimal('0.05')      # 5% default
        }
        
        return commission_rates.get(category, Decimal('0.05'))
    
    async def _get_referred_user_from_proposal(self, proposal_id: str) -> str:
        """Get the professional ID from the proposal"""
        proposal = await self.db.get_proposal(proposal_id)
        return proposal['professional_id']
    
    async def _validate_hebrew_context(self, context: Dict[str, Any]):
        """Validate Hebrew content in referral context"""
        if 'description' in context:
            if not validate_hebrew_content(context['description']):
                raise ValueError("תיאור ההפניה חייב להכיל תוכן בעברית תקין")
        
        if 'notes' in context:
            if not validate_hebrew_content(context['notes']):
                raise ValueError("הערות ההפניה חייבות להכיל תוכן בעברית תקין")
    
    async def _find_parent_referral(self, user_id: str) -> Optional[ReferralResponse]:
        """Find if this user was referred by someone else"""
        # Look for referrals where this user is the referred_user
        parent_data = await self.db.get_referral_by_referred_user(user_id)
        
        if parent_data:
            return ReferralResponse(**parent_data)
        
        return None
    
    def _is_valid_status_transition(
        self,
        current_status: ReferralStatus,
        new_status: ReferralStatus
    ) -> bool:
        """Validate if status transition is allowed"""
        valid_transitions = {
            ReferralStatus.PENDING: [ReferralStatus.ACTIVE, ReferralStatus.CANCELLED],
            ReferralStatus.ACTIVE: [ReferralStatus.COMPLETED, ReferralStatus.DISPUTED, ReferralStatus.CANCELLED],
            ReferralStatus.COMPLETED: [ReferralStatus.DISPUTED],
            ReferralStatus.CANCELLED: [],  # Terminal state
            ReferralStatus.DISPUTED: [ReferralStatus.ACTIVE, ReferralStatus.COMPLETED, ReferralStatus.CANCELLED]
        }
        
        return new_status in valid_transitions.get(current_status, [])
    
    async def _log_referral_action(
        self,
        referral_id: str,
        action: str,
        performed_by: str
    ):
        """Log referral actions for audit trail"""
        log_data = {
            "referral_id": referral_id,
            "action": action,
            "performed_by": performed_by,
            "timestamp": datetime.utcnow(),
            "ip_address": None  # Would be populated from request context
        }
        
        await self.db.insert_referral_log(log_data)