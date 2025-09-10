import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import uuid

from ..models.payments import BalanceResponse, BalanceDB
from ..database import get_database

class BalanceService:
    def __init__(self):
        self.db = get_database()
    
    async def get_balance(self, professional_id: str) -> Optional[BalanceResponse]:
        """
        קבלת יתרת מקצוען - Get professional's current balance
        """
        balance_data = await self.db.get_professional_balance(professional_id)
        
        if not balance_data:
            # Create initial balance record if doesn't exist
            await self._create_initial_balance(professional_id)
            balance_data = await self.db.get_professional_balance(professional_id)
        
        # Get professional name for response
        professional_info = await self.db.get_professional_info(professional_id)
        professional_name = professional_info.get('name', 'מקצוען לא זמין')
        
        # Calculate next settlement date (first of next month)
        now = datetime.utcnow()
        if now.month == 12:
            next_settlement = datetime(now.year + 1, 1, 1)
        else:
            next_settlement = datetime(now.year, now.month + 1, 1)
        
        return BalanceResponse(
            professional_id=professional_id,
            professional_name=professional_name,
            outstanding_commissions=balance_data['outstanding_commissions'],
            pending_revenue_shares=balance_data['pending_revenue_shares'],
            net_balance=balance_data['net_balance'],
            last_updated=balance_data['last_updated'],
            next_settlement_date=next_settlement,
            autopay_enabled=balance_data.get('autopay_enabled', False)
        )
    
    async def get_all_balances(
        self, 
        include_zero_balances: bool = False
    ) -> List[BalanceResponse]:
        """
        קבלת כל היתרות - Get all professional balances
        """
        balances_data = await self.db.get_all_professional_balances(include_zero_balances)
        
        balances = []
        for balance_data in balances_data:
            professional_info = await self.db.get_professional_info(
                balance_data['professional_id']
            )
            professional_name = professional_info.get('name', 'מקצוען לא זמין')
            
            # Calculate next settlement date
            now = datetime.utcnow()
            if now.month == 12:
                next_settlement = datetime(now.year + 1, 1, 1)
            else:
                next_settlement = datetime(now.year, now.month + 1, 1)
            
            balances.append(BalanceResponse(
                professional_id=balance_data['professional_id'],
                professional_name=professional_name,
                outstanding_commissions=balance_data['outstanding_commissions'],
                pending_revenue_shares=balance_data['pending_revenue_shares'],
                net_balance=balance_data['net_balance'],
                last_updated=balance_data['last_updated'],
                next_settlement_date=next_settlement,
                autopay_enabled=balance_data.get('autopay_enabled', False)
            ))
        
        return balances
    
    async def recalculate_balance(self, professional_id: str):
        """
        חישוב מחדש של יתרה - Recalculate professional's balance
        """
        # Calculate outstanding commissions (money owed TO platform)
        outstanding_commissions = await self.db.calculate_outstanding_commissions(
            professional_id
        )
        
        # Calculate pending revenue shares (money owed BY platform)
        pending_revenue_shares = await self.db.calculate_pending_revenue_shares(
            professional_id
        )
        
        # Net balance: negative = owes platform, positive = platform owes professional
        net_balance = pending_revenue_shares - outstanding_commissions
        
        # Update balance record
        balance_data = {
            "professional_id": professional_id,
            "outstanding_commissions": outstanding_commissions,
            "pending_revenue_shares": pending_revenue_shares,
            "net_balance": net_balance,
            "last_updated": datetime.utcnow()
        }
        
        await self.db.update_professional_balance(professional_id, balance_data)
        
        # Log balance update
        await self._log_balance_update(professional_id, balance_data)
    
    async def add_commission_to_balance(
        self,
        professional_id: str,
        commission_amount: Decimal,
        commission_id: str
    ):
        """
        הוספת עמלה ליתרה - Add commission to balance (increases debt to platform)
        """
        current_balance = await self.db.get_professional_balance(professional_id)
        if not current_balance:
            await self._create_initial_balance(professional_id)
            current_balance = await self.db.get_professional_balance(professional_id)
        
        new_outstanding = current_balance['outstanding_commissions'] + commission_amount
        new_net_balance = current_balance['pending_revenue_shares'] - new_outstanding
        
        balance_data = {
            "outstanding_commissions": new_outstanding,
            "net_balance": new_net_balance,
            "last_updated": datetime.utcnow()
        }
        
        await self.db.update_professional_balance(professional_id, balance_data)
        
        # Log the commission addition
        await self._log_balance_transaction(
            professional_id, "commission_added", commission_amount, commission_id
        )
    
    async def add_revenue_share_to_balance(
        self,
        professional_id: str,
        revenue_share_amount: Decimal,
        referral_id: str
    ):
        """
        הוספת חלק הכנסה ליתרה - Add revenue share to balance (increases platform debt)
        """
        current_balance = await self.db.get_professional_balance(professional_id)
        if not current_balance:
            await self._create_initial_balance(professional_id)
            current_balance = await self.db.get_professional_balance(professional_id)
        
        new_pending_shares = current_balance['pending_revenue_shares'] + revenue_share_amount
        new_net_balance = new_pending_shares - current_balance['outstanding_commissions']
        
        balance_data = {
            "pending_revenue_shares": new_pending_shares,
            "net_balance": new_net_balance,
            "last_updated": datetime.utcnow()
        }
        
        await self.db.update_professional_balance(professional_id, balance_data)
        
        # Log the revenue share addition
        await self._log_balance_transaction(
            professional_id, "revenue_share_added", revenue_share_amount, referral_id
        )
    
    async def process_payment_to_balance(
        self,
        professional_id: str,
        payment_amount: Decimal,
        payment_id: str
    ):
        """
        עיבוד תשלום ליתרה - Process payment (reduces outstanding commissions)
        """
        current_balance = await self.db.get_professional_balance(professional_id)
        if not current_balance:
            raise ValueError(f"יתרה לא נמצאה למקצוען {professional_id}")
        
        new_outstanding = max(
            Decimal('0'),
            current_balance['outstanding_commissions'] - payment_amount
        )
        new_net_balance = current_balance['pending_revenue_shares'] - new_outstanding
        
        balance_data = {
            "outstanding_commissions": new_outstanding,
            "net_balance": new_net_balance,
            "last_updated": datetime.utcnow()
        }
        
        await self.db.update_professional_balance(professional_id, balance_data)
        
        # Log the payment
        await self._log_balance_transaction(
            professional_id, "payment_received", payment_amount, payment_id
        )
    
    async def process_payout_from_balance(
        self,
        professional_id: str,
        payout_amount: Decimal,
        payout_id: str
    ):
        """
        עיבוד תשלום יוצא מהיתרה - Process payout (reduces pending revenue shares)
        """
        current_balance = await self.db.get_professional_balance(professional_id)
        if not current_balance:
            raise ValueError(f"יתרה לא נמצאה למקצוען {professional_id}")
        
        if current_balance['pending_revenue_shares'] < payout_amount:
            raise ValueError("סכום התשלום גדול מהיתרה הזמינה")
        
        new_pending_shares = current_balance['pending_revenue_shares'] - payout_amount
        new_net_balance = new_pending_shares - current_balance['outstanding_commissions']
        
        balance_data = {
            "pending_revenue_shares": new_pending_shares,
            "net_balance": new_net_balance,
            "last_updated": datetime.utcnow()
        }
        
        await self.db.update_professional_balance(professional_id, balance_data)
        
        # Log the payout
        await self._log_balance_transaction(
            professional_id, "payout_processed", payout_amount, payout_id
        )
    
    async def process_balance_offset(
        self,
        professional_a_id: str,
        professional_b_id: str,
        offset_amount: Decimal
    ) -> Dict[str, Any]:
        """
        עיבוד קיזוז יתרות - Process balance offset between professionals
        """
        # Get both balances
        balance_a = await self.db.get_professional_balance(professional_a_id)
        balance_b = await self.db.get_professional_balance(professional_b_id)
        
        if not balance_a or not balance_b:
            raise ValueError("לא ניתן למצוא יתרות לקיזוז")
        
        # Validate offset amount
        max_offset = min(
            balance_a['pending_revenue_shares'],
            balance_b['outstanding_commissions']
        )
        
        if offset_amount > max_offset:
            raise ValueError(f"סכום הקיזוז גדול מהמקסימום המותר: ₪{max_offset}")
        
        # Update balance A (reduce pending revenue shares)
        new_pending_a = balance_a['pending_revenue_shares'] - offset_amount
        new_net_a = new_pending_a - balance_a['outstanding_commissions']
        
        await self.db.update_professional_balance(professional_a_id, {
            "pending_revenue_shares": new_pending_a,
            "net_balance": new_net_a,
            "last_updated": datetime.utcnow()
        })
        
        # Update balance B (reduce outstanding commissions)
        new_outstanding_b = balance_b['outstanding_commissions'] - offset_amount
        new_net_b = balance_b['pending_revenue_shares'] - new_outstanding_b
        
        await self.db.update_professional_balance(professional_b_id, {
            "outstanding_commissions": new_outstanding_b,
            "net_balance": new_net_b,
            "last_updated": datetime.utcnow()
        })
        
        # Create offset record
        offset_id = str(uuid.uuid4())
        offset_data = {
            "id": offset_id,
            "professional_a_id": professional_a_id,
            "professional_b_id": professional_b_id,
            "offset_amount": offset_amount,
            "processed_at": datetime.utcnow()
        }
        
        await self.db.insert_balance_offset(offset_data)
        
        return {
            "offset_id": offset_id,
            "professional_a_balance_change": -offset_amount,
            "professional_b_balance_change": offset_amount,
            "offset_amount": offset_amount
        }
    
    async def enable_autopay(
        self,
        professional_id: str,
        payment_method_id: str
    ):
        """
        הפעלת חיוב אוטומטי - Enable autopay for professional
        """
        await self.db.update_professional_balance(professional_id, {
            "autopay_enabled": True,
            "autopay_payment_method_id": payment_method_id,
            "last_updated": datetime.utcnow()
        })
        
        await self._log_balance_transaction(
            professional_id, "autopay_enabled", Decimal('0'), payment_method_id
        )
    
    async def disable_autopay(self, professional_id: str):
        """
        ביטול חיוב אוטומטי - Disable autopay for professional
        """
        await self.db.update_professional_balance(professional_id, {
            "autopay_enabled": False,
            "autopay_payment_method_id": None,
            "last_updated": datetime.utcnow()
        })
        
        await self._log_balance_transaction(
            professional_id, "autopay_disabled", Decimal('0'), None
        )
    
    async def _create_initial_balance(self, professional_id: str):
        """Create initial balance record for professional"""
        balance_data = {
            "professional_id": professional_id,
            "outstanding_commissions": Decimal('0'),
            "pending_revenue_shares": Decimal('0'),
            "net_balance": Decimal('0'),
            "last_updated": datetime.utcnow(),
            "autopay_enabled": False,
            "autopay_payment_method_id": None
        }
        
        await self.db.create_professional_balance(balance_data)
    
    async def _log_balance_update(
        self, 
        professional_id: str, 
        balance_data: Dict[str, Any]
    ):
        """Log balance update for audit"""
        log_data = {
            "professional_id": professional_id,
            "action": "balance_recalculated",
            "outstanding_commissions": balance_data['outstanding_commissions'],
            "pending_revenue_shares": balance_data['pending_revenue_shares'],
            "net_balance": balance_data['net_balance'],
            "timestamp": datetime.utcnow()
        }
        
        await self.db.insert_balance_log(log_data)
    
    async def _log_balance_transaction(
        self,
        professional_id: str,
        transaction_type: str,
        amount: Decimal,
        reference_id: Optional[str]
    ):
        """Log balance transaction for audit"""
        log_data = {
            "professional_id": professional_id,
            "transaction_type": transaction_type,
            "amount": amount,
            "reference_id": reference_id,
            "timestamp": datetime.utcnow()
        }
        
        await self.db.insert_balance_transaction_log(log_data)