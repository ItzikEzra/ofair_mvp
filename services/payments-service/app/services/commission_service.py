import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
import uuid

from ..models.payments import (
    CommissionResponse, CommissionType, CommissionDB
)
from ..database import get_database
from ..utils.hebrew_utils import validate_hebrew_content

class CommissionService:
    def __init__(self):
        self.db = get_database()
    
    async def record_commission(
        self,
        professional_id: str,
        job_id: str,
        job_value: Decimal,
        commission_type: CommissionType,
        commission_rate: Optional[Decimal] = None,
        referrer_id: Optional[str] = None,
        referrer_share_rate: Optional[Decimal] = None,
        recorded_by: str
    ) -> CommissionResponse:
        """
        רישום עמלה חדשה - Record new commission owed
        """
        # Validate commission doesn't already exist
        existing = await self.db.get_commission_by_job(job_id)
        if existing:
            raise ValueError(f"כבר נרשמה עמלה לעבודה {job_id}")
        
        # Get default commission rate if not provided
        if commission_rate is None:
            commission_rate = await self._get_default_commission_rate(commission_type)
        
        # Calculate commission amounts
        commission_amount = (job_value * commission_rate).quantize(
            Decimal('0.01'), rounding=ROUND_HALF_UP
        )
        
        # Calculate referrer share and platform amount
        referrer_share_amount = None
        if referrer_id and referrer_share_rate:
            referrer_share_amount = (job_value * referrer_share_rate).quantize(
                Decimal('0.01'), rounding=ROUND_HALF_UP
            )
        
        # Platform gets commission minus referrer share
        platform_amount = commission_amount
        if referrer_share_amount:
            platform_amount = commission_amount - referrer_share_amount
        
        commission_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        commission_data = {
            "id": commission_id,
            "professional_id": professional_id,
            "job_id": job_id,
            "job_value": job_value,
            "commission_type": commission_type.value,
            "commission_rate": commission_rate,
            "commission_amount": commission_amount,
            "referrer_id": referrer_id,
            "referrer_share_amount": referrer_share_amount,
            "platform_amount": platform_amount,
            "status": "recorded",
            "recorded_at": now,
            "recorded_by": recorded_by
        }
        
        # Insert commission record
        await self.db.insert_commission(commission_data)
        
        # Log commission creation for audit
        await self._log_commission_action(
            commission_id, "commission_recorded", recorded_by
        )
        
        return CommissionResponse(**commission_data)
    
    async def get_commission(self, commission_id: str) -> Optional[CommissionResponse]:
        """
        קבלת פרטי עמלה - Get commission details
        """
        commission_data = await self.db.get_commission(commission_id)
        
        if not commission_data:
            return None
            
        return CommissionResponse(**commission_data)
    
    async def get_professional_commissions(
        self,
        professional_id: str,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[CommissionResponse]:
        """
        קבלת עמלות המקצוען - Get professional's commissions
        """
        commissions_data = await self.db.get_professional_commissions(
            professional_id, status, start_date, end_date, limit, offset
        )
        
        return [CommissionResponse(**data) for data in commissions_data]
    
    async def mark_commission_invoiced(
        self, 
        commission_id: str, 
        invoice_id: str,
        updated_by: str
    ):
        """
        סימון עמלה כחויבת בחשבונית - Mark commission as invoiced
        """
        commission = await self.get_commission(commission_id)
        if not commission:
            raise ValueError("עמלה לא נמצאה")
        
        if commission.status != "recorded":
            raise ValueError(f"לא ניתן לחייב עמלה בסטטוס {commission.status}")
        
        update_data = {
            "status": "invoiced",
            "invoice_id": invoice_id,
            "updated_at": datetime.utcnow()
        }
        
        await self.db.update_commission(commission_id, update_data)
        
        # Log status change
        await self._log_commission_action(
            commission_id, f"marked_invoiced_{invoice_id}", updated_by
        )
    
    async def mark_commission_paid(
        self, 
        commission_id: str, 
        payment_id: str,
        updated_by: str
    ):
        """
        סימון עמלה כשולמה - Mark commission as paid
        """
        commission = await self.get_commission(commission_id)
        if not commission:
            raise ValueError("עמלה לא נמצאה")
        
        if commission.status != "invoiced":
            raise ValueError(f"לא ניתן לסמן עמלה כשולמה בסטטוס {commission.status}")
        
        update_data = {
            "status": "paid",
            "paid_at": datetime.utcnow(),
            "payment_id": payment_id
        }
        
        await self.db.update_commission(commission_id, update_data)
        
        # Log payment
        await self._log_commission_action(
            commission_id, f"marked_paid_{payment_id}", updated_by
        )
    
    async def generate_commission_report(
        self,
        start_date: datetime,
        end_date: datetime,
        professional_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        יצירת דוח עמלות - Generate commission report
        """
        report_data = await self.db.get_commissions_report(
            start_date, end_date, professional_id
        )
        
        # Add summary calculations
        total_commissions = sum(row['commission_amount'] for row in report_data)
        total_referrer_shares = sum(
            row.get('referrer_share_amount', 0) for row in report_data
        )
        total_platform_revenue = sum(row['platform_amount'] for row in report_data)
        
        # Group by commission type
        by_type = {}
        for row in report_data:
            comm_type = row['commission_type']
            if comm_type not in by_type:
                by_type[comm_type] = {
                    'count': 0,
                    'total_job_value': Decimal('0'),
                    'total_commissions': Decimal('0'),
                    'total_platform_revenue': Decimal('0')
                }
            
            by_type[comm_type]['count'] += 1
            by_type[comm_type]['total_job_value'] += row['job_value']
            by_type[comm_type]['total_commissions'] += row['commission_amount']
            by_type[comm_type]['total_platform_revenue'] += row['platform_amount']
        
        return {
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'summary': {
                'total_commissions': total_commissions,
                'total_referrer_shares': total_referrer_shares,
                'total_platform_revenue': total_platform_revenue,
                'commission_count': len(report_data)
            },
            'by_type': by_type,
            'details': report_data
        }
    
    async def get_unpaid_commissions(
        self, 
        professional_id: str
    ) -> List[CommissionResponse]:
        """
        קבלת עמלות שטרם שולמו - Get unpaid commissions for professional
        """
        commissions_data = await self.db.get_unpaid_commissions(professional_id)
        return [CommissionResponse(**data) for data in commissions_data]
    
    async def calculate_monthly_commissions(
        self,
        professional_id: str,
        month: int,
        year: int
    ) -> Dict[str, Any]:
        """
        חישוב עמלות חודשיות - Calculate monthly commissions for professional
        """
        # Get start and end of month
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1) - timedelta(seconds=1)
        else:
            end_date = datetime(year, month + 1, 1) - timedelta(seconds=1)
        
        # Get all recorded commissions for the month
        commissions = await self.get_professional_commissions(
            professional_id, 
            status="recorded",
            start_date=start_date,
            end_date=end_date
        )
        
        # Calculate totals
        total_commission_amount = sum(c.commission_amount for c in commissions)
        total_job_value = sum(c.job_value for c in commissions)
        
        # Group by commission type
        by_type = {}
        for commission in commissions:
            comm_type = commission.commission_type.value
            if comm_type not in by_type:
                by_type[comm_type] = {
                    'count': 0,
                    'total_job_value': Decimal('0'),
                    'total_commission': Decimal('0')
                }
            
            by_type[comm_type]['count'] += 1
            by_type[comm_type]['total_job_value'] += commission.job_value
            by_type[comm_type]['total_commission'] += commission.commission_amount
        
        return {
            'professional_id': professional_id,
            'month': month,
            'year': year,
            'commission_count': len(commissions),
            'total_job_value': total_job_value,
            'total_commission_amount': total_commission_amount,
            'by_type': by_type,
            'commissions': commissions
        }
    
    async def _get_default_commission_rate(
        self, 
        commission_type: CommissionType
    ) -> Decimal:
        """Get default commission rate based on type"""
        rates = {
            CommissionType.CUSTOMER_JOB: Decimal('0.10'),  # 10% for customer jobs
            CommissionType.REFERRAL_JOB: Decimal('0.05')   # 5% for referral jobs
        }
        
        return rates.get(commission_type, Decimal('0.05'))
    
    async def _log_commission_action(
        self,
        commission_id: str,
        action: str,
        performed_by: str
    ):
        """Log commission actions for audit trail"""
        log_data = {
            "commission_id": commission_id,
            "action": action,
            "performed_by": performed_by,
            "timestamp": datetime.utcnow(),
            "ip_address": None  # Would be populated from request context
        }
        
        await self.db.insert_commission_log(log_data)