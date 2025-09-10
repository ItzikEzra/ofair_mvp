import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
import uuid
import json

from ..models.payments import (
    PaymentResponse, PaymentStatus, PaymentGateway, PaymentDB
)
from ..database import get_database
from ..config import settings

class PaymentGatewayService:
    def __init__(self):
        self.db = get_database()
    
    async def process_payment(
        self,
        invoice_id: str,
        amount: Decimal,
        payment_method: str,
        gateway_provider: PaymentGateway,
        processed_by: str
    ) -> PaymentResponse:
        """
        עיבוד תשלום דרך שער תשלומים - Process payment through gateway
        """
        # Validate invoice exists and is payable
        invoice_data = await self.db.get_invoice(invoice_id)
        if not invoice_data:
            raise ValueError("חשבונית לא נמצאה")
        
        if invoice_data['status'] == 'paid':
            raise ValueError("החשבונית כבר שולמה")
        
        if amount != invoice_data['total_amount']:
            raise ValueError("סכום התשלום לא תואם לחשבונית")
        
        payment_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Create payment record
        payment_data = {
            "id": payment_id,
            "invoice_id": invoice_id,
            "professional_id": invoice_data['professional_id'],
            "amount": amount,
            "payment_method": payment_method,
            "gateway_provider": gateway_provider.value,
            "status": PaymentStatus.PROCESSING.value,
            "processed_at": now,
            "processed_by": processed_by
        }
        
        await self.db.insert_payment(payment_data)
        
        try:
            # Process payment through gateway
            gateway_result = await self._process_through_gateway(
                gateway_provider, amount, payment_method, invoice_data
            )
            
            if gateway_result['success']:
                # Update payment as completed
                payment_data.update({
                    "status": PaymentStatus.COMPLETED.value,
                    "gateway_transaction_id": gateway_result['transaction_id'],
                    "gateway_response": gateway_result
                })
                
                await self.db.update_payment(payment_id, {
                    "status": PaymentStatus.COMPLETED.value,
                    "gateway_transaction_id": gateway_result['transaction_id'],
                    "gateway_response": json.dumps(gateway_result)
                })
                
                # Update invoice as paid
                from .invoice_service import InvoiceService
                invoice_service = InvoiceService()
                await invoice_service.mark_invoice_paid(
                    invoice_id, payment_id, processed_by
                )
                
                # Update professional balance
                from .balance_service import BalanceService
                balance_service = BalanceService()
                await balance_service.process_payment_to_balance(
                    invoice_data['professional_id'], amount, payment_id
                )
                
            else:
                # Mark payment as failed
                payment_data.update({
                    "status": PaymentStatus.FAILED.value,
                    "failure_reason": gateway_result.get('error_message'),
                    "gateway_response": gateway_result
                })
                
                await self.db.update_payment(payment_id, {
                    "status": PaymentStatus.FAILED.value,
                    "failure_reason": gateway_result.get('error_message'),
                    "gateway_response": json.dumps(gateway_result)
                })
        
        except Exception as e:
            # Mark payment as failed due to exception
            payment_data.update({
                "status": PaymentStatus.FAILED.value,
                "failure_reason": str(e)
            })
            
            await self.db.update_payment(payment_id, {
                "status": PaymentStatus.FAILED.value,
                "failure_reason": str(e)
            })
            
            raise
        
        # Log payment processing
        await self._log_payment_action(
            payment_id, f"payment_{payment_data['status']}", processed_by
        )
        
        return PaymentResponse(**payment_data)
    
    async def setup_autopay(
        self,
        professional_id: str,
        payment_method_id: str
    ) -> str:
        """
        הגדרת חיוב אוטומטי - Setup automatic payment for professional
        """
        # Validate payment method exists
        payment_methods = await self.get_saved_payment_methods(professional_id)
        valid_method = any(
            method['id'] == payment_method_id for method in payment_methods
        )
        
        if not valid_method:
            raise ValueError("אמצעי תשלום לא קיים או לא שייך למקצוען")
        
        # Enable autopay in balance service
        from .balance_service import BalanceService
        balance_service = BalanceService()
        await balance_service.enable_autopay(professional_id, payment_method_id)
        
        # Create autopay setup record
        setup_id = str(uuid.uuid4())
        setup_data = {
            "id": setup_id,
            "professional_id": professional_id,
            "payment_method_id": payment_method_id,
            "enabled": True,
            "created_at": datetime.utcnow()
        }
        
        await self.db.insert_autopay_setup(setup_data)
        
        return setup_id
    
    async def process_autopay_batch(self, month: int, year: int) -> List[Dict[str, Any]]:
        """
        עיבוד קבוצת חיוב אוטומטי - Process batch of autopay charges
        """
        # Get all professionals with autopay enabled and outstanding invoices
        autopay_candidates = await self.db.get_autopay_candidates(month, year)
        
        results = []
        
        for candidate in autopay_candidates:
            try:
                # Process autopay for this professional
                result = await self._process_autopay_for_professional(
                    candidate['professional_id'],
                    candidate['invoice_id'],
                    candidate['amount'],
                    candidate['payment_method_id']
                )
                
                results.append({
                    "professional_id": candidate['professional_id'],
                    "invoice_id": candidate['invoice_id'],
                    "success": result['success'],
                    "payment_id": result.get('payment_id'),
                    "error": result.get('error')
                })
                
            except Exception as e:
                results.append({
                    "professional_id": candidate['professional_id'],
                    "invoice_id": candidate['invoice_id'],
                    "success": False,
                    "error": str(e)
                })
        
        # Log batch processing
        await self.db.insert_autopay_batch_log({
            "month": month,
            "year": year,
            "total_processed": len(results),
            "successful": sum(1 for r in results if r['success']),
            "failed": sum(1 for r in results if not r['success']),
            "processed_at": datetime.utcnow()
        })
        
        return results
    
    async def get_saved_payment_methods(
        self, 
        professional_id: str
    ) -> List[Dict[str, Any]]:
        """
        קבלת אמצעי תשלום שמורים - Get professional's saved payment methods
        """
        # This would integrate with payment gateways to fetch saved methods
        # For now, return mock data
        return [
            {
                "id": "pm_mock_123",
                "type": "card",
                "last4": "4242",
                "brand": "visa",
                "exp_month": 12,
                "exp_year": 2025,
                "is_default": True
            }
        ]
    
    async def refund_payment(
        self,
        payment_id: str,
        refund_amount: Optional[Decimal] = None,
        reason: Optional[str] = None,
        refunded_by: str = None
    ) -> Dict[str, Any]:
        """
        החזר תשלום - Refund payment
        """
        payment_data = await self.db.get_payment(payment_id)
        if not payment_data:
            raise ValueError("תשלום לא נמצא")
        
        if payment_data['status'] != PaymentStatus.COMPLETED.value:
            raise ValueError("לא ניתן להחזיר תשלום שלא הושלם")
        
        if refund_amount is None:
            refund_amount = payment_data['amount']
        
        if refund_amount > payment_data['amount']:
            raise ValueError("סכום ההחזר גדול מסכום התשלום")
        
        # Process refund through gateway
        gateway_provider = PaymentGateway(payment_data['gateway_provider'])
        refund_result = await self._process_refund_through_gateway(
            gateway_provider,
            payment_data['gateway_transaction_id'],
            refund_amount,
            reason
        )
        
        if refund_result['success']:
            # Create refund record
            refund_id = str(uuid.uuid4())
            refund_data = {
                "id": refund_id,
                "payment_id": payment_id,
                "amount": refund_amount,
                "reason": reason,
                "status": "completed",
                "gateway_refund_id": refund_result['refund_id'],
                "processed_at": datetime.utcnow(),
                "processed_by": refunded_by
            }
            
            await self.db.insert_refund(refund_data)
            
            # Update payment status if fully refunded
            if refund_amount == payment_data['amount']:
                await self.db.update_payment(payment_id, {
                    "status": PaymentStatus.REFUNDED.value
                })
            
            return {
                "success": True,
                "refund_id": refund_id,
                "amount": refund_amount
            }
        else:
            return {
                "success": False,
                "error": refund_result.get('error_message')
            }
    
    async def _process_through_gateway(
        self,
        gateway: PaymentGateway,
        amount: Decimal,
        payment_method: str,
        invoice_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process payment through specific gateway"""
        
        if gateway == PaymentGateway.STRIPE:
            return await self._process_stripe_payment(
                amount, payment_method, invoice_data
            )
        elif gateway == PaymentGateway.CARDCOM:
            return await self._process_cardcom_payment(
                amount, payment_method, invoice_data
            )
        elif gateway == PaymentGateway.TRANZILLA:
            return await self._process_tranzilla_payment(
                amount, payment_method, invoice_data
            )
        else:
            raise ValueError(f"Unsupported payment gateway: {gateway}")
    
    async def _process_stripe_payment(
        self,
        amount: Decimal,
        payment_method: str,
        invoice_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process payment through Stripe"""
        # Mock Stripe integration
        # In production, this would use the Stripe SDK
        
        import random
        success = random.choice([True, True, True, False])  # 75% success rate
        
        if success:
            return {
                "success": True,
                "transaction_id": f"pi_stripe_{uuid.uuid4().hex[:16]}",
                "gateway": "stripe",
                "amount": float(amount),
                "currency": "ILS",
                "status": "succeeded"
            }
        else:
            return {
                "success": False,
                "error_message": "כרטיס האשראי נדחה",
                "error_code": "card_declined"
            }
    
    async def _process_cardcom_payment(
        self,
        amount: Decimal,
        payment_method: str,
        invoice_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process payment through Cardcom"""
        # Mock Cardcom integration
        import random
        success = random.choice([True, True, False])  # 67% success rate
        
        if success:
            return {
                "success": True,
                "transaction_id": f"cardcom_{uuid.uuid4().hex[:12]}",
                "gateway": "cardcom",
                "amount": float(amount),
                "currency": "ILS",
                "status": "approved"
            }
        else:
            return {
                "success": False,
                "error_message": "עסקה נכשלה",
                "error_code": "transaction_failed"
            }
    
    async def _process_tranzilla_payment(
        self,
        amount: Decimal,
        payment_method: str,
        invoice_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process payment through Tranzilla"""
        # Mock Tranzilla integration
        import random
        success = random.choice([True, True, True, False])  # 75% success rate
        
        if success:
            return {
                "success": True,
                "transaction_id": f"tz_{uuid.uuid4().hex[:10]}",
                "gateway": "tranzilla",
                "amount": float(amount),
                "currency": "ILS",
                "status": "success"
            }
        else:
            return {
                "success": False,
                "error_message": "תשלום נדחה",
                "error_code": "payment_declined"
            }
    
    async def _process_refund_through_gateway(
        self,
        gateway: PaymentGateway,
        transaction_id: str,
        amount: Decimal,
        reason: Optional[str]
    ) -> Dict[str, Any]:
        """Process refund through gateway"""
        # Mock refund processing
        import random
        success = random.choice([True, True, True, False])  # 75% success rate
        
        if success:
            return {
                "success": True,
                "refund_id": f"rf_{uuid.uuid4().hex[:12]}",
                "amount": float(amount),
                "status": "succeeded"
            }
        else:
            return {
                "success": False,
                "error_message": "החזר נכשל"
            }
    
    async def _process_autopay_for_professional(
        self,
        professional_id: str,
        invoice_id: str,
        amount: Decimal,
        payment_method_id: str
    ) -> Dict[str, Any]:
        """Process autopay for a single professional"""
        try:
            # Process the payment
            payment = await self.process_payment(
                invoice_id=invoice_id,
                amount=amount,
                payment_method=payment_method_id,
                gateway_provider=PaymentGateway.STRIPE,  # Default for autopay
                processed_by="system_autopay"
            )
            
            return {
                "success": payment.status == PaymentStatus.COMPLETED,
                "payment_id": payment.id,
                "error": payment.failure_reason if payment.status == PaymentStatus.FAILED else None
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _log_payment_action(
        self,
        payment_id: str,
        action: str,
        performed_by: str
    ):
        """Log payment actions for audit trail"""
        log_data = {
            "payment_id": payment_id,
            "action": action,
            "performed_by": performed_by,
            "timestamp": datetime.utcnow()
        }
        
        await self.db.insert_payment_log(log_data)