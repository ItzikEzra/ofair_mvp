import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import uuid

from models.referrals import (
    CommissionCalculationResponse, CommissionBreakdown, PaymentResponse,
    CommissionStatus, PaymentMethod, CommissionDB
)
from database import get_database
from utils.commission_calculator import CommissionCalculator

class CommissionService:
    def __init__(self):
        self.db = get_database()
        self.calculator = CommissionCalculator()
    
    async def calculate_commission(
        self,
        lead_value: Decimal,
        referral_id: str,
        payment_confirmed: bool = False
    ) -> CommissionCalculationResponse:
        """
        חישוב עמלות - Calculate commissions for a referral
        """
        # Get referral details
        referral = await self.db.get_referral(referral_id)
        if not referral:
            raise ValueError("הפניה לא נמצאה")
        
        # Get lead and proposal details for context
        lead = await self.db.get_lead(referral['lead_id'])
        proposal = await self.db.get_proposal(referral['proposal_id'])
        
        # Calculate commission breakdown
        breakdown = await self.calculator.calculate_commission_breakdown(
            lead_value=lead_value,
            commission_rate=referral['commission_rate'],
            category=lead.get('category'),
            referrer_level=await self._get_referrer_level(referral['referrer_id']),
            chain_length=await self._get_chain_length(referral_id)
        )
        
        # Determine status
        status = CommissionStatus.CALCULATED
        if payment_confirmed:
            status = CommissionStatus.APPROVED
        
        # Calculate payment due date (30 days from calculation)
        due_date = datetime.utcnow() + timedelta(days=30)
        
        calculation_id = str(uuid.uuid4())
        calculation_data = {
            "id": calculation_id,
            "referral_id": referral_id,
            "lead_value": lead_value,
            "total_commission": sum(item.amount for item in breakdown),
            "status": status.value,
            "calculated_at": datetime.utcnow(),
            "payment_due_date": due_date,
            "breakdown": [item.dict() for item in breakdown]
        }
        
        # Store calculation in database
        await self.db.insert_commission_calculation(calculation_data)
        
        # Create individual commission records for each recipient
        for item in breakdown:
            await self._create_commission_record(
                calculation_id, referral_id, item, status
            )
        
        # Update referral with commission amounts
        await self._update_referral_commissions(referral_id, breakdown)
        
        response = CommissionCalculationResponse(
            referral_id=referral_id,
            lead_value=lead_value,
            total_commission=calculation_data["total_commission"],
            breakdown=breakdown,
            status=status,
            calculated_at=calculation_data["calculated_at"],
            payment_due_date=due_date
        )
        
        return response
    
    async def calculate_referral_chain_commissions(self, referral_id: str):
        """
        חישוב עמלות לכל השרשרת - Calculate commissions for entire referral chain
        Background task to handle complex multi-level calculations
        """
        try:
            # Get the referral chain
            chain = await self._get_referral_chain_data(referral_id)
            
            # Process each level of the chain
            for level, referral_data in enumerate(chain):
                # Calculate commission for this level
                lead_value = await self._get_lead_value(referral_data['lead_id'])
                
                if lead_value > 0:
                    await self.calculate_commission(
                        lead_value=lead_value,
                        referral_id=referral_data['id'],
                        payment_confirmed=False
                    )
                    
                    # Add delay between calculations to avoid overwhelming the system
                    if level > 0:
                        await asyncio.sleep(0.1)
            
        except Exception as e:
            # Log error but don't raise to avoid disrupting the main flow
            await self.db.log_error(f"Commission chain calculation failed for {referral_id}: {str(e)}")
    
    async def process_payment(
        self,
        commission_id: str,
        payment_method: PaymentMethod,
        transaction_id: str,
        processed_by: str,
        notes: Optional[str] = None
    ) -> PaymentResponse:
        """
        עיבוד תשלום עמלה - Process commission payment
        """
        # Get commission record
        commission = await self.db.get_commission(commission_id)
        if not commission:
            raise ValueError("רשומת עמלה לא נמצאה")
        
        if commission['status'] == 'paid':
            raise ValueError("העמלה כבר שולמה")
        
        # Validate transaction ID uniqueness
        existing_payment = await self.db.get_payment_by_transaction(transaction_id)
        if existing_payment:
            raise ValueError("מזהה עסקה כבר קיים במערכת")
        
        now = datetime.utcnow()
        payment_data = {
            "commission_id": commission_id,
            "amount": commission['amount'],
            "payment_method": payment_method.value,
            "transaction_id": transaction_id,
            "processed_at": now,
            "processed_by": processed_by,
            "status": "completed",
            "notes": notes
        }
        
        # Update commission status
        await self.db.update_commission_status(commission_id, "paid", now)
        
        # Record payment details
        await self.db.insert_payment_record(payment_data)
        
        # Update referral statistics
        await self._update_referral_payment_stats(commission['referral_id'])
        
        # Send notification to recipient (would integrate with notifications service)
        await self._notify_payment_processed(commission['recipient_id'], payment_data)
        
        return PaymentResponse(
            commission_id=commission_id,
            amount=commission['amount'],
            payment_method=payment_method,
            transaction_id=transaction_id,
            processed_at=now,
            processed_by=processed_by,
            status="completed",
            notes=notes
        )
    
    async def get_pending_commissions(
        self,
        limit: int = 50,
        offset: int = 0
    ) -> List[CommissionCalculationResponse]:
        """
        עמלות בהמתנה - Get pending commissions for payment processing
        """
        commissions_data = await self.db.get_pending_commissions(limit, offset)
        
        results = []
        for comm_data in commissions_data:
            # Reconstruct breakdown from stored data
            breakdown = [
                CommissionBreakdown(**item) 
                for item in comm_data.get('breakdown', [])
            ]
            
            results.append(CommissionCalculationResponse(
                referral_id=comm_data['referral_id'],
                lead_value=comm_data['lead_value'],
                total_commission=comm_data['total_commission'],
                breakdown=breakdown,
                status=CommissionStatus(comm_data['status']),
                calculated_at=comm_data['calculated_at'],
                payment_due_date=comm_data.get('payment_due_date')
            ))
        
        return results
    
    async def get_commission_history(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[CommissionDB]:
        """
        היסטוריית עמלות - Get commission history for a user
        """
        if not start_date:
            start_date = datetime.utcnow() - timedelta(days=90)
        if not end_date:
            end_date = datetime.utcnow()
        
        commissions_data = await self.db.get_user_commission_history(
            user_id, start_date, end_date, limit, offset
        )
        
        return [CommissionDB(**data) for data in commissions_data]
    
    async def dispute_commission(
        self,
        commission_id: str,
        dispute_reason: str,
        disputed_by: str,
        evidence: Optional[Dict[str, Any]] = None
    ):
        """
        עמלה במחלוקת - Mark commission as disputed
        """
        commission = await self.db.get_commission(commission_id)
        if not commission:
            raise ValueError("רשומת עמלה לא נמצאה")
        
        if commission['status'] == 'paid':
            raise ValueError("לא ניתן לערער על עמלה ששולמה")
        
        dispute_data = {
            "commission_id": commission_id,
            "reason": dispute_reason,
            "disputed_by": disputed_by,
            "disputed_at": datetime.utcnow(),
            "evidence": evidence,
            "status": "open"
        }
        
        # Update commission status
        await self.db.update_commission_status(commission_id, "disputed")
        
        # Create dispute record
        await self.db.insert_commission_dispute(dispute_data)
        
        # Notify relevant parties
        await self._notify_commission_dispute(commission_id, dispute_data)
    
    async def _create_commission_record(
        self,
        calculation_id: str,
        referral_id: str,
        breakdown_item: CommissionBreakdown,
        status: CommissionStatus
    ):
        """Create individual commission record"""
        commission_id = str(uuid.uuid4())
        
        commission_data = {
            "id": commission_id,
            "calculation_id": calculation_id,
            "referral_id": referral_id,
            "recipient_id": breakdown_item.recipient_id,
            "recipient_type": breakdown_item.recipient_type,
            "amount": breakdown_item.amount,
            "percentage": breakdown_item.percentage,
            "status": status.value,
            "calculated_at": datetime.utcnow(),
            "level": breakdown_item.level,
            "description": breakdown_item.description
        }
        
        await self.db.insert_commission_record(commission_data)
        return commission_id
    
    async def _update_referral_commissions(
        self,
        referral_id: str,
        breakdown: List[CommissionBreakdown]
    ):
        """Update referral record with calculated commission amounts"""
        referrer_commission = Decimal('0')
        platform_commission = Decimal('0')
        total_commission = Decimal('0')
        
        for item in breakdown:
            if item.recipient_type == "referrer":
                referrer_commission += item.amount
            elif item.recipient_type == "platform":
                platform_commission += item.amount
            
            total_commission += item.amount
        
        update_data = {
            "total_commission_amount": total_commission,
            "referrer_commission": referrer_commission,
            "platform_commission": platform_commission,
            "updated_at": datetime.utcnow()
        }
        
        await self.db.update_referral(referral_id, update_data)
    
    async def _get_referrer_level(self, user_id: str) -> str:
        """Get referrer level/tier for commission calculation"""
        user_stats = await self.db.get_user_referral_performance(user_id)
        
        total_referrals = user_stats.get('total_completed_referrals', 0)
        success_rate = user_stats.get('success_rate', 0)
        
        # Determine referrer level based on performance
        if total_referrals >= 100 and success_rate >= 0.8:
            return "premium"
        elif total_referrals >= 50 and success_rate >= 0.7:
            return "gold"
        elif total_referrals >= 20 and success_rate >= 0.6:
            return "silver"
        else:
            return "bronze"
    
    async def _get_chain_length(self, referral_id: str) -> int:
        """Get the length of the referral chain"""
        chain_data = await self._get_referral_chain_data(referral_id)
        return len(chain_data)
    
    async def _get_referral_chain_data(self, referral_id: str) -> List[Dict]:
        """Get referral chain data for calculations"""
        chain = []
        current_referral = await self.db.get_referral(referral_id)
        
        while current_referral and len(chain) < 10:  # Max 10 levels
            chain.append(current_referral)
            
            # Find parent referral
            parent = await self.db.get_referral_by_referred_user(
                current_referral['referrer_id']
            )
            current_referral = parent
        
        return chain
    
    async def _get_lead_value(self, lead_id: str) -> Decimal:
        """Get the monetary value of a lead"""
        lead = await self.db.get_lead(lead_id)
        if not lead:
            return Decimal('0')
        
        # Get accepted proposal value
        accepted_proposal = await self.db.get_accepted_proposal_for_lead(lead_id)
        if accepted_proposal:
            return Decimal(str(accepted_proposal.get('quoted_price', 0)))
        
        # Fallback to estimated value
        return Decimal(str(lead.get('estimated_value', 0)))
    
    async def _update_referral_payment_stats(self, referral_id: str):
        """Update referral payment statistics after commission payment"""
        # This would update various metrics and potentially trigger
        # referrer level upgrades based on payment completion
        pass
    
    async def _notify_payment_processed(self, recipient_id: str, payment_data: Dict):
        """Send notification about processed payment"""
        # This would integrate with the notifications service
        # For now, just log the event
        await self.db.log_event({
            "type": "commission_payment_processed",
            "recipient_id": recipient_id,
            "amount": payment_data["amount"],
            "transaction_id": payment_data["transaction_id"],
            "timestamp": datetime.utcnow()
        })
    
    async def _notify_commission_dispute(self, commission_id: str, dispute_data: Dict):
        """Send notifications about commission dispute"""
        # This would integrate with the notifications service
        await self.db.log_event({
            "type": "commission_disputed",
            "commission_id": commission_id,
            "disputed_by": dispute_data["disputed_by"],
            "reason": dispute_data["reason"],
            "timestamp": datetime.utcnow()
        })