import sys
import os

# Add path resolution for Docker container
sys.path.append("/app/libs")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer
from typing import List, Optional
from datetime import datetime, timedelta
import asyncio
from decimal import Decimal

from models.referrals import (
    CreateReferralRequest,
    ReferralResponse,
    CommissionCalculationRequest,
    CommissionCalculationResponse,
    ReferralChainResponse,
    ProcessPaymentRequest,
    PaymentResponse,
    ReferralStatsResponse,
    ReferralStatus,
    CommissionStatus
)
from services.referral_service import ReferralService
from services.commission_service import CommissionService
from middleware.auth import verify_jwt_token
from config import settings

app = FastAPI(
    title="OFAIR Referrals Service",
    description="מערכת הפניות וחישוב עמלות - Referral tracking and commission calculation system",
    version="1.0.0"
)

security = HTTPBearer()

@app.post("/referrals", response_model=ReferralResponse)
async def create_referral(
    request: CreateReferralRequest,
    current_user: dict = Depends(verify_jwt_token),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    יצירת הפניה חדשה - Create new referral
    Creates a referral relationship and initiates commission tracking
    """
    referral_service = ReferralService()
    
    try:
        referral = await referral_service.create_referral(
            referrer_id=current_user["user_id"],
            lead_id=request.lead_id,
            proposal_id=request.proposal_id,
            commission_rate=request.commission_rate,
            referral_context=request.context
        )
        
        # Start commission calculation in background
        background_tasks.add_task(
            _calculate_commission_chain,
            referral.id
        )
        
        return referral
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה ביצירת הפניה: {str(e)}")

@app.get("/referrals/{referral_id}", response_model=ReferralResponse)
async def get_referral(
    referral_id: str,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    קבלת פרטי הפניה - Get referral details
    """
    referral_service = ReferralService()
    
    referral = await referral_service.get_referral(referral_id)
    if not referral:
        raise HTTPException(status_code=404, detail="הפניה לא נמצאה")
        
    # Check if user has permission to view this referral
    if (referral.referrer_id != current_user["user_id"] and 
        referral.referred_user_id != current_user["user_id"] and
        current_user.get("role") != "admin"):
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות בהפניה זו")
    
    return referral

@app.get("/referrals/user/{user_id}", response_model=List[ReferralResponse])
async def get_user_referrals(
    user_id: str,
    status: Optional[ReferralStatus] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    קבלת הפניות המשתמש - Get user's referrals
    """
    # Users can only see their own referrals unless admin
    if user_id != current_user["user_id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות בהפניות משתמש אחר")
    
    referral_service = ReferralService()
    referrals = await referral_service.get_user_referrals(
        user_id, status, limit, offset
    )
    
    return referrals

@app.get("/referrals/{referral_id}/chain", response_model=ReferralChainResponse)
async def get_referral_chain(
    referral_id: str,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    קבלת שרשרת הפניות - Get full referral chain
    Shows the complete referral hierarchy and commission flow
    """
    referral_service = ReferralService()
    
    # Verify user has permission
    referral = await referral_service.get_referral(referral_id)
    if not referral:
        raise HTTPException(status_code=404, detail="הפניה לא נמצאה")
        
    if (referral.referrer_id != current_user["user_id"] and 
        current_user.get("role") != "admin"):
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות בשרשרת הפניות")
    
    chain = await referral_service.get_referral_chain(referral_id)
    return chain

@app.post("/commissions/calculate", response_model=CommissionCalculationResponse)
async def calculate_commission(
    request: CommissionCalculationRequest,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    חישוב עמלות - Calculate commissions
    Calculates commission distribution across the referral chain
    """
    if current_user.get("role") not in ["admin", "finance"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לחישוב עמלות")
    
    commission_service = CommissionService()
    
    try:
        calculation = await commission_service.calculate_commission(
            lead_value=request.lead_value,
            referral_id=request.referral_id,
            payment_confirmed=request.payment_confirmed
        )
        
        return calculation
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בחישוב עמלות: {str(e)}")

@app.post("/commissions/{commission_id}/process", response_model=PaymentResponse)
async def process_commission_payment(
    commission_id: str,
    request: ProcessPaymentRequest,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    עיבוד תשלום עמלה - Process commission payment
    Marks commission as paid and updates payment details
    """
    if current_user.get("role") not in ["admin", "finance"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לעיבוד תשלומים")
    
    commission_service = CommissionService()
    
    try:
        payment = await commission_service.process_payment(
            commission_id=commission_id,
            payment_method=request.payment_method,
            transaction_id=request.transaction_id,
            processed_by=current_user["user_id"]
        )
        
        return payment
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בעיבוד תשלום: {str(e)}")

@app.get("/stats/referrals/{user_id}", response_model=ReferralStatsResponse)
async def get_referral_stats(
    user_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    סטטיסטיקות הפניות - Get referral statistics
    """
    # Users can only see their own stats unless admin
    if user_id != current_user["user_id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות בסטטיסטיקות משתמש אחר")
    
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()
    
    referral_service = ReferralService()
    stats = await referral_service.get_user_stats(user_id, start_date, end_date)
    
    return stats

@app.get("/commissions/pending", response_model=List[CommissionCalculationResponse])
async def get_pending_commissions(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    עמלות בהמתנה - Get pending commissions
    For admin/finance users to process payments
    """
    if current_user.get("role") not in ["admin", "finance"]:
        raise HTTPException(status_code=403, detail="אין הרשאה לצפות בעמלות בהמתנה")
    
    commission_service = CommissionService()
    commissions = await commission_service.get_pending_commissions(limit, offset)
    
    return commissions

@app.put("/referrals/{referral_id}/status")
async def update_referral_status(
    referral_id: str,
    status: ReferralStatus,
    current_user: dict = Depends(verify_jwt_token)
):
    """
    עדכון סטטוס הפניה - Update referral status
    """
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="אין הרשאה לעדכון סטטוס הפניה")
    
    referral_service = ReferralService()
    
    try:
        await referral_service.update_referral_status(referral_id, status)
        return {"message": "סטטוס ההפניה עודכן בהצלחה"}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"שגיאה בעדכון סטטוס: {str(e)}")

async def _calculate_commission_chain(referral_id: str):
    """Background task to calculate commission chain"""
    try:
        commission_service = CommissionService()
        await commission_service.calculate_referral_chain_commissions(referral_id)
    except Exception as e:
        print(f"Error calculating commission chain for referral {referral_id}: {e}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "referrals-service",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)