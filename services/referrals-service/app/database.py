import asyncpg
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import os
from contextlib import asynccontextmanager

class DatabaseConnection:
    def __init__(self):
        self.pool = None
        self.connection_string = self._get_connection_string()
    
    def _get_connection_string(self) -> str:
        """בניית מחרוזת חיבור למסד הנתונים"""
        return (
            f"postgresql://{os.getenv('POSTGRES_USER', 'ofair_user')}:"
            f"{os.getenv('POSTGRES_PASSWORD', 'ofair_pass')}@"
            f"{os.getenv('POSTGRES_HOST', 'localhost')}:"
            f"{os.getenv('POSTGRES_PORT', '5432')}/"
            f"{os.getenv('POSTGRES_DB', 'ofair_mvp')}"
        )
    
    async def initialize_pool(self):
        """יצירת pool חיבורים למסד הנתונים"""
        self.pool = await asyncpg.create_pool(
            self.connection_string,
            min_size=5,
            max_size=20,
            command_timeout=60
        )
    
    async def close_pool(self):
        """סגירת pool חיבורים"""
        if self.pool:
            await self.pool.close()
    
    @asynccontextmanager
    async def get_connection(self):
        """קבלת חיבור מה-pool"""
        async with self.pool.acquire() as connection:
            yield connection
    
    # Referral operations
    async def insert_referral(self, referral_data: Dict[str, Any]):
        """הכנסת הפניה חדשה"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO referrals (
                    id, referrer_id, referred_user_id, lead_id, proposal_id,
                    status, commission_rate, context, created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """, 
                referral_data["id"],
                referral_data["referrer_id"],
                referral_data["referred_user_id"],
                referral_data["lead_id"],
                referral_data["proposal_id"],
                referral_data["status"],
                referral_data["commission_rate"],
                json.dumps(referral_data.get("context")),
                referral_data["created_at"],
                referral_data["updated_at"]
            )
    
    async def get_referral(self, referral_id: str) -> Optional[Dict[str, Any]]:
        """קבלת פרטי הפניה"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM referrals WHERE id = $1", referral_id
            )
            
            if row:
                return dict(row)
            return None
    
    async def get_user_referrals(
        self, 
        user_id: str, 
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """קבלת הפניות המשתמש"""
        async with self.get_connection() as conn:
            if status:
                rows = await conn.fetch("""
                    SELECT * FROM referrals 
                    WHERE referrer_id = $1 AND status = $2 
                    ORDER BY created_at DESC 
                    LIMIT $3 OFFSET $4
                """, user_id, status, limit, offset)
            else:
                rows = await conn.fetch("""
                    SELECT * FROM referrals 
                    WHERE referrer_id = $1 
                    ORDER BY created_at DESC 
                    LIMIT $2 OFFSET $3
                """, user_id, limit, offset)
            
            return [dict(row) for row in rows]
    
    async def update_referral(self, referral_id: str, update_data: Dict[str, Any]):
        """עדכון פרטי הפניה"""
        async with self.get_connection() as conn:
            # Build dynamic update query
            set_clauses = []
            values = []
            param_count = 1
            
            for key, value in update_data.items():
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
                param_count += 1
            
            values.append(referral_id)
            
            query = f"""
                UPDATE referrals 
                SET {', '.join(set_clauses)}
                WHERE id = ${param_count}
            """
            
            await conn.execute(query, *values)
    
    async def get_referral_by_proposal(self, proposal_id: str) -> Optional[Dict[str, Any]]:
        """קבלת הפניה לפי הצעה"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM referrals WHERE proposal_id = $1", proposal_id
            )
            return dict(row) if row else None
    
    async def get_referral_by_referred_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """קבלת הפניה לפי משתמש מופנה"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM referrals WHERE referred_user_id = $1 ORDER BY created_at DESC LIMIT 1", 
                user_id
            )
            return dict(row) if row else None
    
    # Commission operations
    async def insert_commission_calculation(self, calculation_data: Dict[str, Any]):
        """הכנסת חישוב עמלה"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO commission_calculations (
                    id, referral_id, lead_value, total_commission, status,
                    calculated_at, payment_due_date, breakdown
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
                calculation_data["id"],
                calculation_data["referral_id"],
                calculation_data["lead_value"],
                calculation_data["total_commission"],
                calculation_data["status"],
                calculation_data["calculated_at"],
                calculation_data["payment_due_date"],
                json.dumps(calculation_data["breakdown"])
            )
    
    async def insert_commission_record(self, commission_data: Dict[str, Any]):
        """הכנסת רשומת עמלה"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO commissions (
                    id, calculation_id, referral_id, recipient_id, recipient_type,
                    amount, percentage, status, calculated_at, level, description
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
                commission_data["id"],
                commission_data.get("calculation_id"),
                commission_data["referral_id"],
                commission_data["recipient_id"],
                commission_data["recipient_type"],
                commission_data["amount"],
                commission_data["percentage"],
                commission_data["status"],
                commission_data["calculated_at"],
                commission_data.get("level", 0),
                commission_data.get("description", "")
            )
    
    async def get_commission(self, commission_id: str) -> Optional[Dict[str, Any]]:
        """קבלת רשומת עמלה"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM commissions WHERE id = $1", commission_id
            )
            return dict(row) if row else None
    
    async def get_pending_commissions(self, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """קבלת עמלות בהמתנה"""
        async with self.get_connection() as conn:
            rows = await conn.fetch("""
                SELECT cc.*, r.referrer_id 
                FROM commission_calculations cc
                JOIN referrals r ON cc.referral_id = r.id
                WHERE cc.status IN ('calculated', 'approved')
                ORDER BY cc.payment_due_date ASC
                LIMIT $1 OFFSET $2
            """, limit, offset)
            
            return [dict(row) for row in rows]
    
    async def update_commission_status(
        self, 
        commission_id: str, 
        status: str, 
        paid_at: Optional[datetime] = None
    ):
        """עדכון סטטוס עמלה"""
        async with self.get_connection() as conn:
            if paid_at:
                await conn.execute("""
                    UPDATE commissions 
                    SET status = $1, paid_at = $2, updated_at = NOW()
                    WHERE id = $3
                """, status, paid_at, commission_id)
            else:
                await conn.execute("""
                    UPDATE commissions 
                    SET status = $1, updated_at = NOW()
                    WHERE id = $2
                """, status, commission_id)
    
    # User and external data operations
    async def get_user_basic_info(self, user_id: str) -> Dict[str, Any]:
        """קבלת מידע בסיסי על משתמש"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow("""
                SELECT id, full_name as name, phone_number, is_active, is_professional
                FROM users WHERE id = $1
            """, user_id)
            
            return dict(row) if row else {}
    
    async def get_lead(self, lead_id: str) -> Optional[Dict[str, Any]]:
        """קבלת פרטי ליד"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM leads WHERE id = $1", lead_id
            )
            return dict(row) if row else None
    
    async def get_proposal(self, proposal_id: str) -> Optional[Dict[str, Any]]:
        """קבלת פרטי הצעה"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM proposals WHERE id = $1", proposal_id
            )
            return dict(row) if row else None
    
    async def get_accepted_proposal_for_lead(self, lead_id: str) -> Optional[Dict[str, Any]]:
        """קבלת הצעה מאושרת לליד"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow("""
                SELECT * FROM proposals 
                WHERE lead_id = $1 AND status = 'accepted'
                ORDER BY created_at DESC LIMIT 1
            """, lead_id)
            
            return dict(row) if row else None
    
    # Statistics operations
    async def get_user_referral_stats(
        self, 
        user_id: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """סטטיסטיקות הפניות משתמש"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_referrals,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_referrals,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_referrals
                FROM referrals 
                WHERE referrer_id = $1 
                AND created_at BETWEEN $2 AND $3
            """, user_id, start_date, end_date)
            
            return dict(row) if row else {}
    
    async def get_user_commission_stats(
        self, 
        user_id: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> Dict[str, Any]:
        """סטטיסטיקות עמלות משתמש"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow("""
                SELECT 
                    COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.amount END), 0) as total_commission_paid,
                    COALESCE(SUM(CASE WHEN c.status IN ('calculated', 'approved') THEN c.amount END), 0) as pending_commission,
                    COALESCE(SUM(c.amount), 0) as total_commission_earned
                FROM commissions c
                JOIN referrals r ON c.referral_id = r.id
                WHERE r.referrer_id = $1 
                AND c.calculated_at BETWEEN $2 AND $3
            """, user_id, start_date, end_date)
            
            return dict(row) if row else {}
    
    async def get_user_category_performance(
        self, 
        user_id: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """ביצועים לפי קטגוריה"""
        async with self.get_connection() as conn:
            rows = await conn.fetch("""
                SELECT 
                    l.category,
                    COUNT(*) as referral_count,
                    COALESCE(SUM(c.amount), 0) as total_commission
                FROM referrals r
                JOIN leads l ON r.lead_id = l.id
                LEFT JOIN commissions c ON r.id = c.referral_id
                WHERE r.referrer_id = $1 
                AND r.created_at BETWEEN $2 AND $3
                GROUP BY l.category
                ORDER BY total_commission DESC
            """, user_id, start_date, end_date)
            
            return [dict(row) for row in rows]
    
    async def get_user_monthly_stats(
        self, 
        user_id: str, 
        start_date: datetime, 
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """סטטיסטיקות חודשיות"""
        async with self.get_connection() as conn:
            rows = await conn.fetch("""
                SELECT 
                    DATE_TRUNC('month', r.created_at) as month,
                    COUNT(*) as referral_count,
                    COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_count,
                    COALESCE(SUM(c.amount), 0) as commission_earned
                FROM referrals r
                LEFT JOIN commissions c ON r.id = c.referral_id
                WHERE r.referrer_id = $1 
                AND r.created_at BETWEEN $2 AND $3
                GROUP BY DATE_TRUNC('month', r.created_at)
                ORDER BY month DESC
            """, user_id, start_date, end_date)
            
            return [dict(row) for row in rows]
    
    # Audit and logging
    async def insert_referral_log(self, log_data: Dict[str, Any]):
        """הכנסת רישום ביקורת"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO referral_audit_logs (
                    referral_id, action, performed_by, timestamp, ip_address
                ) VALUES ($1, $2, $3, $4, $5)
            """,
                log_data["referral_id"],
                log_data["action"],
                log_data["performed_by"],
                log_data["timestamp"],
                log_data.get("ip_address")
            )
    
    async def log_error(self, error_message: str):
        """רישום שגיאה"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO error_logs (message, timestamp, service)
                VALUES ($1, NOW(), 'referrals-service')
            """, error_message)
    
    async def log_event(self, event_data: Dict[str, Any]):
        """רישום אירוע"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO system_events (
                    event_type, data, timestamp, service
                ) VALUES ($1, $2, $3, 'referrals-service')
            """,
                event_data.get("type"),
                json.dumps(event_data),
                event_data.get("timestamp", datetime.utcnow())
            )

# Global database instance
_database = DatabaseConnection()

def get_database() -> DatabaseConnection:
    """קבלת מופע מסד הנתונים"""
    return _database