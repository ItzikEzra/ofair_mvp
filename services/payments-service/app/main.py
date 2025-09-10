from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer
from typing import List, Optional
from datetime import datetime, timedelta
import asyncio
from decimal import Decimal

from .models.payments import (
    CommissionRequest,
    CommissionResponse,
    BalanceResponse,
    InvoiceResponse,
    PaymentRequest,
    PaymentResponse,
    PayoutRequest,
    PayoutResponse,
    SettlementRequest,
    SettlementResponse,
    CommissionType,
    PaymentStatus,
    InvoiceStatus
)
from .services.commission_service import CommissionService
from .services.balance_service import BalanceService
from .services.invoice_service import InvoiceService
from .services.payment_gateway_service import PaymentGatewayService
from .services.settlement_service import SettlementService
from .middleware.auth import verify_jwt_token
from .config import settings

app = FastAPI(
    title="OFAIR Payments Service",
    description="מערכת תשלומים ועמלות B2B - B2B Commission and Settlement System",
    version="1.0.0"
)

security = HTTPBearer()

@app.post("/commissions/record", response_model=CommissionResponse)
async def record_commission(
    request: CommissionRequest,
    current_user: dict = Depends(verify_jwt_token),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    רישום עמלה - Record commission owed by professional
    Called when professional closes a job and owes platform commission
    """
    commission_service = CommissionService()
    
    try:
        commission = await commission_service.record_commission(
            professional_id=request.professional_id,
            job_id=request.job_id,
            job_value=request.job_value,
            commission_type=request.commission_type,
            commission_rate=request.commission_rate,
            referrer_id=request.referrer_id,
            referrer_share_rate=request.referrer_share_rate,
            recorded_by=current_user["user_id"]
        )
        
        # Update balances in background
        background_tasks.add_task(
            _update_professional_balance,
            request.professional_id
        )
        
        return commission
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה ברישום עמלה: {str(e)}")

@app.get("/balances/{professional_id}", response_model=BalanceResponse)
async def get_balance(
    professional_id: str,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    קבלת יתרת משתמש - Get professional's balance
    """
    # Check authorization - professionals can only see their own balance
    if (professional_id != current_user["user_id"] and 
        current_user.get("role") not in ["admin", "finance"]):
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות ביתרה זו")
    
    balance_service = BalanceService()
    balance = await balance_service.get_balance(professional_id)
    
    if not balance:
        raise HTTPException(status_code=404, detail="יתרה לא נמצאה")
    
    return balance

@app.get("/invoices/{professional_id}", response_model=List[InvoiceResponse])
async def get_invoices(
    professional_id: str,
    status: Optional[InvoiceStatus] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    קבלת חשבוניות - Get professional's invoices
    """
    # Check authorization
    if (professional_id != current_user["user_id"] and 
        current_user.get("role") not in ["admin", "finance"]):
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות בחשבוניות")
    
    invoice_service = InvoiceService()
    invoices = await invoice_service.get_professional_invoices(
        professional_id, status, limit, offset
    )
    
    return invoices

@app.post("/invoices/generate", response_model=InvoiceResponse)
async def generate_invoice(
    professional_id: str,
    month: int,
    year: int,
    current_user: dict = Depends(verify_jwt_token),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    יצירת חשבונית חודשית - Generate monthly invoice
    Admin/Finance only endpoint
    """
    if current_user.get("role") not in ["admin", "finance"]:
        raise HTTPException(status_code=403, detail="אין הרשאה ליצירת חשבוניות")
    
    invoice_service = InvoiceService()
    
    try:
        invoice = await invoice_service.generate_monthly_invoice(
            professional_id, month, year, current_user["user_id"]
        )
        
        # Send invoice via email/SMS in background
        background_tasks.add_task(
            _send_invoice_notification,
            professional_id,
            invoice.id
        )
        
        return invoice
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה ביצירת חשבונית: {str(e)}")

@app.post("/payments/process", response_model=PaymentResponse)
async def process_payment(
    request: PaymentRequest,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    עיבוד תשלום - Process commission payment
    Used for both automatic charges and manual payments
    """
    if current_user.get("role") not in ["admin", "finance"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לעיבוד תשלומים")
    
    payment_gateway = PaymentGatewayService()
    
    try:
        payment = await payment_gateway.process_payment(
            invoice_id=request.invoice_id,
            amount=request.amount,
            payment_method=request.payment_method,
            gateway_provider=request.gateway_provider,
            processed_by=current_user["user_id"]
        )
        
        return payment
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בעיבוד תשלום: {str(e)}")

@app.post("/payouts/create", response_model=PayoutResponse)
async def create_payout(
    request: PayoutRequest,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    יצירת תשלום יוצא - Create payout to professional
    For positive balances (revenue shares owed to professionals)
    """
    if current_user.get("role") not in ["admin", "finance"]:
        raise HTTPException(status_code=403, detail="אין הרשאה ליצירת תשלומים יוצאים")
    
    settlement_service = SettlementService()
    
    try:
        payout = await settlement_service.create_payout(
            professional_id=request.professional_id,
            amount=request.amount,
            payout_method=request.payout_method,
            bank_details=request.bank_details,
            created_by=current_user["user_id"]
        )
        
        return payout
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה ביצירת תשלום יוצא: {str(e)}")

@app.post("/settlements/offset", response_model=SettlementResponse)
async def process_balance_offset(
    request: SettlementRequest,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    עיבוד קיזוז יתרות - Process balance offset
    Nets debts vs credits for complex professional relationships
    """
    if current_user.get("role") not in ["admin", "finance"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לקיזוז יתרות")
    
    settlement_service = SettlementService()
    
    try:
        settlement = await settlement_service.process_balance_offset(
            professional_a_id=request.professional_a_id,
            professional_b_id=request.professional_b_id,
            offset_amount=request.offset_amount,
            processed_by=current_user["user_id"]
        )
        
        return settlement
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בקיזוז יתרות: {str(e)}")

@app.get("/reports/commissions", response_model=List[dict])
async def get_commission_report(
    start_date: datetime,
    end_date: datetime,
    professional_id: Optional[str] = None,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    דוח עמלות - Commission report
    """
    if current_user.get("role") not in ["admin", "finance"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לדוחות")
    
    commission_service = CommissionService()
    report = await commission_service.generate_commission_report(
        start_date, end_date, professional_id
    )
    
    return report

@app.get("/reports/balances", response_model=List[BalanceResponse])
async def get_balance_report(
    include_zero_balances: bool = False,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    דוח יתרות - Balance report for all professionals
    """
    if current_user.get("role") not in ["admin", "finance"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לדוחות")
    
    balance_service = BalanceService()
    balances = await balance_service.get_all_balances(include_zero_balances)
    
    return balances

@app.post("/settlements/monthly", response_model=List[InvoiceResponse])
async def run_monthly_settlement(
    month: int,
    year: int,
    current_user: dict = Depends(verify_jwt_token),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    הרצת התחשבנות חודשית - Run monthly settlement
    Generates invoices for all professionals with outstanding balances
    """
    if current_user.get("role") not in ["admin", "finance"]:
        raise HTTPException(status_code=403, detail="אין הרשאה להרצת התחשבנות")
    
    settlement_service = SettlementService()
    
    try:
        invoices = await settlement_service.run_monthly_settlement(
            month, year, current_user["user_id"]
        )
        
        # Send all invoice notifications in background
        for invoice in invoices:
            background_tasks.add_task(
                _send_invoice_notification,
                invoice.professional_id,
                invoice.id
            )
        
        return invoices
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בהרצת התחשבנות: {str(e)}")

@app.get("/gateway/payment-methods", response_model=List[dict])
async def get_payment_methods(
    professional_id: str,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    קבלת אמצעי תשלום - Get saved payment methods
    """
    if (professional_id != current_user["user_id"] and 
        current_user.get("role") not in ["admin", "finance"]):
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות באמצעי תשלום")
    
    payment_gateway = PaymentGatewayService()
    methods = await payment_gateway.get_saved_payment_methods(professional_id)
    
    return methods

@app.post("/gateway/setup-autopay")
async def setup_autopay(
    professional_id: str,
    payment_method_id: str,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    הגדרת חיוב אוטומטי - Setup automatic billing
    """
    if (professional_id != current_user["user_id"] and 
        current_user.get("role") not in ["admin", "finance"]):
        raise HTTPException(status_code=403, detail="אין הרשאה להגדרת חיוב אוטומטי")
    
    payment_gateway = PaymentGatewayService()
    
    try:
        result = await payment_gateway.setup_autopay(
            professional_id, payment_method_id
        )
        return {"message": "חיוב אוטומטי הוגדר בהצלחה", "setup_id": result}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בהגדרת חיוב אוטומטי: {str(e)}")

async def _update_professional_balance(professional_id: str):
    """Background task to update professional balance"""
    try:
        balance_service = BalanceService()
        await balance_service.recalculate_balance(professional_id)
    except Exception as e:
        print(f"Error updating balance for professional {professional_id}: {e}")

async def _send_invoice_notification(professional_id: str, invoice_id: str):
    """Background task to send invoice notification"""
    try:
        # Would integrate with notifications service
        print(f"Sending invoice notification for {invoice_id} to professional {professional_id}")
    except Exception as e:
        print(f"Error sending invoice notification: {e}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "payments-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)