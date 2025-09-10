import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

from ..models.payments import (
    PayoutResponse, PayoutMethod, SettlementResponse, 
    BankDetails, InvoiceResponse
)
from ..database import get_database

class SettlementService:
    def __init__(self):
        self.db = get_database()
    
    async def run_monthly_settlement(
        self,
        month: int,
        year: int,
        processed_by: str
    ) -> List[InvoiceResponse]:
        """
        הרצת התחשבנות חודשית - Run monthly settlement for all professionals
        """
        # Get all professionals with outstanding commissions for the month
        professionals_with_commissions = await self.db.get_professionals_with_commissions(
            month, year
        )
        
        invoices = []
        
        from .invoice_service import InvoiceService
        invoice_service = InvoiceService()
        
        for professional_id in professionals_with_commissions:
            try:
                # Generate invoice for this professional
                invoice = await invoice_service.generate_monthly_invoice(
                    professional_id, month, year, processed_by
                )
                invoices.append(invoice)
                
            except ValueError as e:
                # Log error but continue with other professionals
                await self._log_settlement_error(
                    professional_id, month, year, str(e)
                )
                continue
        
        # Log monthly settlement completion
        await self._log_monthly_settlement(month, year, len(invoices), processed_by)
        
        return invoices
    
    async def create_payout(
        self,
        professional_id: str,
        amount: Decimal,
        payout_method: PayoutMethod,
        bank_details: Optional[BankDetails] = None,
        created_by: str
    ) -> PayoutResponse:
        """
        יצירת תשלום יוצא - Create payout to professional
        For positive balances (revenue shares owed to professional)
        """
        # Validate professional has sufficient positive balance
        from .balance_service import BalanceService
        balance_service = BalanceService()
        balance = await balance_service.get_balance(professional_id)
        
        if not balance:
            raise ValueError("יתרה לא נמצאה")
        
        if balance.net_balance <= 0:
            raise ValueError("אין יתרה חיובית לתשלום")
        
        if amount > balance.pending_revenue_shares:
            raise ValueError("סכום התשלום גדול מהיתרה הזמינה")
        
        # Validate bank details if required
        if payout_method == PayoutMethod.BANK_TRANSFER and not bank_details:
            raise ValueError("נדרשים פרטי בנק לתשלום בנקאי")
        
        payout_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        payout_data = {
            "id": payout_id,
            "professional_id": professional_id,
            "amount": amount,
            "payout_method": payout_method.value,
            "status": "pending",
            "bank_details": bank_details.dict() if bank_details else None,
            "created_at": now,
            "created_by": created_by
        }
        
        # Insert payout record
        await self.db.insert_payout(payout_data)
        
        # Process payout based on method
        if payout_method == PayoutMethod.BANK_TRANSFER:
            # Queue for bank transfer processing
            await self._queue_bank_transfer(payout_id, amount, bank_details)
            
        elif payout_method == PayoutMethod.CREDIT_TO_NEXT_INVOICE:
            # Apply as credit to next invoice
            await self._apply_invoice_credit(professional_id, amount, payout_id)
            payout_data["status"] = "completed"
            payout_data["processed_at"] = now
            
        elif payout_method == PayoutMethod.MANUAL_CHECK:
            # Mark for manual processing
            payout_data["status"] = "pending_manual"
        
        # Update balance
        await balance_service.process_payout_from_balance(
            professional_id, amount, payout_id
        )
        
        # Log payout creation
        await self._log_payout_action(payout_id, "payout_created", created_by)
        
        return PayoutResponse(**payout_data)
    
    async def process_balance_offset(
        self,
        professional_a_id: str,
        professional_b_id: str,
        offset_amount: Decimal,
        processed_by: str
    ) -> SettlementResponse:
        """
        עיבוד קיזוז יתרות - Process balance offset between professionals
        """
        if professional_a_id == professional_b_id:
            raise ValueError("לא ניתן לקזז יתרה עם עצמו")
        
        from .balance_service import BalanceService
        balance_service = BalanceService()
        
        # Process the offset
        offset_result = await balance_service.process_balance_offset(
            professional_a_id, professional_b_id, offset_amount
        )
        
        settlement_id = offset_result["offset_id"]
        
        # Log settlement
        await self._log_settlement_action(
            settlement_id, 
            f"balance_offset_{professional_a_id}_{professional_b_id}", 
            processed_by
        )
        
        return SettlementResponse(
            id=settlement_id,
            professional_a_id=professional_a_id,
            professional_b_id=professional_b_id,
            offset_amount=offset_amount,
            processed_at=datetime.utcnow(),
            processed_by=processed_by
        )
    
    async def process_bulk_payouts(
        self,
        payout_ids: List[str],
        processed_by: str
    ) -> List[Dict[str, Any]]:
        """
        עיבוד קבוצת תשלומים יוצאים - Process bulk payouts
        """
        results = []
        
        for payout_id in payout_ids:
            try:
                result = await self._process_single_payout(payout_id, processed_by)
                results.append({
                    "payout_id": payout_id,
                    "success": True,
                    "status": result["status"]
                })
                
            except Exception as e:
                results.append({
                    "payout_id": payout_id,
                    "success": False,
                    "error": str(e)
                })
        
        # Log bulk processing
        await self.db.insert_bulk_payout_log({
            "processed_count": len(results),
            "successful_count": sum(1 for r in results if r["success"]),
            "failed_count": sum(1 for r in results if not r["success"]),
            "processed_by": processed_by,
            "processed_at": datetime.utcnow()
        })
        
        return results
    
    async def get_pending_payouts(self) -> List[PayoutResponse]:
        """
        קבלת תשלומים יוצאים בהמתנה - Get pending payouts
        """
        payouts_data = await self.db.get_pending_payouts()
        
        payouts = []
        for payout_data in payouts_data:
            # Convert bank_details back to BankDetails object if exists
            bank_details = None
            if payout_data.get('bank_details'):
                bank_details = BankDetails(**payout_data['bank_details'])
            
            payouts.append(PayoutResponse(
                id=payout_data['id'],
                professional_id=payout_data['professional_id'],
                amount=payout_data['amount'],
                payout_method=PayoutMethod(payout_data['payout_method']),
                status=payout_data['status'],
                created_at=payout_data['created_at'],
                processed_at=payout_data.get('processed_at'),
                bank_details=bank_details,
                reference=payout_data.get('reference'),
                created_by=payout_data['created_by']
            ))
        
        return payouts
    
    async def generate_settlement_report(
        self,
        start_date: datetime,
        end_date: datetime,
        professional_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        יצירת דוח התחשבנות - Generate settlement report
        """
        # Get settlement data for the period
        settlements_data = await self.db.get_settlements_report(
            start_date, end_date, professional_id
        )
        
        # Calculate totals
        total_invoices = len([s for s in settlements_data if s['type'] == 'invoice'])
        total_payouts = len([s for s in settlements_data if s['type'] == 'payout'])
        total_offsets = len([s for s in settlements_data if s['type'] == 'offset'])
        
        total_invoice_amount = sum(
            s['amount'] for s in settlements_data 
            if s['type'] == 'invoice'
        )
        total_payout_amount = sum(
            s['amount'] for s in settlements_data 
            if s['type'] == 'payout'
        )
        total_offset_amount = sum(
            s['amount'] for s in settlements_data 
            if s['type'] == 'offset'
        )
        
        # Group by professional for detailed breakdown
        by_professional = {}
        for settlement in settlements_data:
            prof_id = settlement['professional_id']
            if prof_id not in by_professional:
                by_professional[prof_id] = {
                    'professional_name': settlement.get('professional_name', ''),
                    'invoices': [],
                    'payouts': [],
                    'offsets': [],
                    'total_billed': Decimal('0'),
                    'total_paid_out': Decimal('0')
                }
            
            by_professional[prof_id][settlement['type'] + 's'].append(settlement)
            
            if settlement['type'] == 'invoice':
                by_professional[prof_id]['total_billed'] += settlement['amount']
            elif settlement['type'] == 'payout':
                by_professional[prof_id]['total_paid_out'] += settlement['amount']
        
        return {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'summary': {
                'total_invoices': total_invoices,
                'total_payouts': total_payouts,
                'total_offsets': total_offsets,
                'total_invoice_amount': total_invoice_amount,
                'total_payout_amount': total_payout_amount,
                'total_offset_amount': total_offset_amount,
                'net_platform_revenue': total_invoice_amount - total_payout_amount
            },
            'by_professional': by_professional,
            'details': settlements_data
        }
    
    async def _queue_bank_transfer(
        self, 
        payout_id: str, 
        amount: Decimal, 
        bank_details: BankDetails
    ):
        """Queue bank transfer for processing"""
        transfer_data = {
            "payout_id": payout_id,
            "amount": amount,
            "bank_details": bank_details.dict(),
            "status": "queued",
            "queued_at": datetime.utcnow()
        }
        
        await self.db.insert_bank_transfer_queue(transfer_data)
    
    async def _apply_invoice_credit(
        self, 
        professional_id: str, 
        credit_amount: Decimal, 
        payout_id: str
    ):
        """Apply credit to professional's next invoice"""
        credit_data = {
            "professional_id": professional_id,
            "credit_amount": credit_amount,
            "source": "payout_credit",
            "source_id": payout_id,
            "applied": False,
            "created_at": datetime.utcnow()
        }
        
        await self.db.insert_invoice_credit(credit_data)
    
    async def _process_single_payout(
        self, 
        payout_id: str, 
        processed_by: str
    ) -> Dict[str, Any]:
        """Process a single payout"""
        payout_data = await self.db.get_payout(payout_id)
        if not payout_data:
            raise ValueError(f"תשלום יוצא {payout_id} לא נמצא")
        
        if payout_data['status'] != 'pending':
            raise ValueError(f"תשלום יוצא בסטטוס {payout_data['status']} לא ניתן לעיבוד")
        
        # Mark as processing
        await self.db.update_payout(payout_id, {
            "status": "processing",
            "processed_at": datetime.utcnow(),
            "processed_by": processed_by
        })
        
        # Simulate processing based on method
        payout_method = PayoutMethod(payout_data['payout_method'])
        
        if payout_method == PayoutMethod.BANK_TRANSFER:
            # Simulate bank transfer (would integrate with banking API)
            import random
            success = random.choice([True, True, True, False])  # 75% success
            
            if success:
                status = "completed"
                reference = f"bank_transfer_{uuid.uuid4().hex[:8]}"
            else:
                status = "failed"
                reference = None
        else:
            status = "completed"
            reference = None
        
        # Update payout with final status
        await self.db.update_payout(payout_id, {
            "status": status,
            "reference": reference
        })
        
        return {"status": status, "reference": reference}
    
    async def _log_monthly_settlement(
        self, 
        month: int, 
        year: int, 
        invoice_count: int, 
        processed_by: str
    ):
        """Log monthly settlement completion"""
        log_data = {
            "settlement_type": "monthly",
            "month": month,
            "year": year,
            "invoice_count": invoice_count,
            "processed_by": processed_by,
            "processed_at": datetime.utcnow()
        }
        
        await self.db.insert_settlement_log(log_data)
    
    async def _log_settlement_error(
        self, 
        professional_id: str, 
        month: int, 
        year: int, 
        error: str
    ):
        """Log settlement error"""
        log_data = {
            "professional_id": professional_id,
            "month": month,
            "year": year,
            "error": error,
            "timestamp": datetime.utcnow()
        }
        
        await self.db.insert_settlement_error_log(log_data)
    
    async def _log_settlement_action(
        self, 
        settlement_id: str, 
        action: str, 
        performed_by: str
    ):
        """Log settlement actions for audit"""
        log_data = {
            "settlement_id": settlement_id,
            "action": action,
            "performed_by": performed_by,
            "timestamp": datetime.utcnow()
        }
        
        await self.db.insert_settlement_action_log(log_data)
    
    async def _log_payout_action(
        self, 
        payout_id: str, 
        action: str, 
        performed_by: str
    ):
        """Log payout actions for audit"""
        log_data = {
            "payout_id": payout_id,
            "action": action,
            "performed_by": performed_by,
            "timestamp": datetime.utcnow()
        }
        
        await self.db.insert_payout_log(log_data)