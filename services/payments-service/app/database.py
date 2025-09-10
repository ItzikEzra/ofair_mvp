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
    
    # Commission operations
    async def insert_commission(self, commission_data: Dict[str, Any]):
        """הכנסת עמלה חדשה"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO commissions (
                    id, professional_id, job_id, job_value, commission_type,
                    commission_rate, commission_amount, referrer_id, referrer_share_amount,
                    platform_amount, status, recorded_at, recorded_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            """, 
                commission_data["id"],
                commission_data["professional_id"],
                commission_data["job_id"],
                commission_data["job_value"],
                commission_data["commission_type"],
                commission_data["commission_rate"],
                commission_data["commission_amount"],
                commission_data.get("referrer_id"),
                commission_data.get("referrer_share_amount"),
                commission_data["platform_amount"],
                commission_data["status"],
                commission_data["recorded_at"],
                commission_data["recorded_by"]
            )
    
    async def get_commission(self, commission_id: str) -> Optional[Dict[str, Any]]:
        """קבלת עמלה"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM commissions WHERE id = $1", commission_id
            )
            return dict(row) if row else None
    
    async def get_commission_by_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """קבלת עמלה לפי עבודה"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM commissions WHERE job_id = $1", job_id
            )
            return dict(row) if row else None
    
    async def update_commission(self, commission_id: str, update_data: Dict[str, Any]):
        """עדכון עמלה"""
        async with self.get_connection() as conn:
            set_clauses = []
            values = []
            param_count = 1
            
            for key, value in update_data.items():
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
                param_count += 1
            
            values.append(commission_id)
            
            query = f"""
                UPDATE commissions 
                SET {', '.join(set_clauses)}
                WHERE id = ${param_count}
            """
            
            await conn.execute(query, *values)
    
    async def get_professional_commissions(
        self,
        professional_id: str,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """קבלת עמלות המקצוען"""
        async with self.get_connection() as conn:
            where_clauses = ["professional_id = $1"]
            params = [professional_id]
            param_count = 2
            
            if status:
                where_clauses.append(f"status = ${param_count}")
                params.append(status)
                param_count += 1
            
            if start_date:
                where_clauses.append(f"recorded_at >= ${param_count}")
                params.append(start_date)
                param_count += 1
            
            if end_date:
                where_clauses.append(f"recorded_at <= ${param_count}")
                params.append(end_date)
                param_count += 1
            
            params.extend([limit, offset])
            
            query = f"""
                SELECT * FROM commissions 
                WHERE {' AND '.join(where_clauses)}
                ORDER BY recorded_at DESC
                LIMIT ${param_count} OFFSET ${param_count + 1}
            """
            
            rows = await conn.fetch(query, *params)
            return [dict(row) for row in rows]
    
    # Balance operations
    async def get_professional_balance(self, professional_id: str) -> Optional[Dict[str, Any]]:
        """קבלת יתרת מקצוען"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM professional_balances WHERE professional_id = $1",
                professional_id
            )
            return dict(row) if row else None
    
    async def create_professional_balance(self, balance_data: Dict[str, Any]):
        """יצירת יתרה חדשה"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO professional_balances (
                    professional_id, outstanding_commissions, pending_revenue_shares,
                    net_balance, last_updated, autopay_enabled, autopay_payment_method_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
                balance_data["professional_id"],
                balance_data["outstanding_commissions"],
                balance_data["pending_revenue_shares"],
                balance_data["net_balance"],
                balance_data["last_updated"],
                balance_data.get("autopay_enabled", False),
                balance_data.get("autopay_payment_method_id")
            )
    
    async def update_professional_balance(self, professional_id: str, update_data: Dict[str, Any]):
        """עדכון יתרת מקצוען"""
        async with self.get_connection() as conn:
            set_clauses = []
            values = []
            param_count = 1
            
            for key, value in update_data.items():
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
                param_count += 1
            
            values.append(professional_id)
            
            query = f"""
                UPDATE professional_balances 
                SET {', '.join(set_clauses)}
                WHERE professional_id = ${param_count}
            """
            
            await conn.execute(query, *values)
    
    async def calculate_outstanding_commissions(self, professional_id: str):
        """חישוב עמלות שטרם שולמו"""
        async with self.get_connection() as conn:
            result = await conn.fetchval("""
                SELECT COALESCE(SUM(commission_amount), 0)
                FROM commissions
                WHERE professional_id = $1 AND status IN ('recorded', 'invoiced')
            """, professional_id)
            return result or 0
    
    async def calculate_pending_revenue_shares(self, professional_id: str):
        """חישוב חלקי הכנסה בהמתנה"""
        async with self.get_connection() as conn:
            # This would calculate revenue shares owed TO the professional
            # from referrals they made
            result = await conn.fetchval("""
                SELECT COALESCE(SUM(referrer_share_amount), 0)
                FROM commissions
                WHERE referrer_id = $1 AND status = 'paid'
                AND referrer_share_amount NOT IN (
                    SELECT amount FROM payouts 
                    WHERE professional_id = $1 AND status = 'completed'
                )
            """, professional_id)
            return result or 0
    
    # Invoice operations
    async def insert_invoice(self, invoice_data: Dict[str, Any]):
        """הכנסת חשבונית"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO invoices (
                    id, professional_id, invoice_number, month, year,
                    issue_date, due_date, status, subtotal, vat_rate,
                    vat_amount, total_amount, created_by, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            """,
                invoice_data["id"],
                invoice_data["professional_id"],
                invoice_data["invoice_number"],
                invoice_data["month"],
                invoice_data["year"],
                invoice_data["issue_date"],
                invoice_data["due_date"],
                invoice_data["status"],
                invoice_data["subtotal"],
                invoice_data["vat_rate"],
                invoice_data["vat_amount"],
                invoice_data["total_amount"],
                invoice_data["created_by"],
                invoice_data["created_at"]
            )
    
    async def get_invoice(self, invoice_id: str) -> Optional[Dict[str, Any]]:
        """קבלת חשבונית"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM invoices WHERE id = $1", invoice_id
            )
            return dict(row) if row else None
    
    async def get_monthly_invoice_count(self, year: int, month: int) -> int:
        """קבלת מספר חשבוניות לחודש"""
        async with self.get_connection() as conn:
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM invoices WHERE year = $1 AND month = $2",
                year, month
            )
            return count or 0
    
    # Payment operations
    async def insert_payment(self, payment_data: Dict[str, Any]):
        """הכנסת תשלום"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO payments (
                    id, invoice_id, professional_id, amount, payment_method,
                    gateway_provider, status, processed_at, processed_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
                payment_data["id"],
                payment_data["invoice_id"],
                payment_data["professional_id"],
                payment_data["amount"],
                payment_data["payment_method"],
                payment_data["gateway_provider"],
                payment_data["status"],
                payment_data["processed_at"],
                payment_data["processed_by"]
            )
    
    async def update_payment(self, payment_id: str, update_data: Dict[str, Any]):
        """עדכון תשלום"""
        async with self.get_connection() as conn:
            set_clauses = []
            values = []
            param_count = 1
            
            for key, value in update_data.items():
                if key == "gateway_response" and isinstance(value, dict):
                    value = json.dumps(value)
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
                param_count += 1
            
            values.append(payment_id)
            
            query = f"""
                UPDATE payments 
                SET {', '.join(set_clauses)}
                WHERE id = ${param_count}
            """
            
            await conn.execute(query, *values)
    
    async def get_payment(self, payment_id: str) -> Optional[Dict[str, Any]]:
        """קבלת תשלום"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM payments WHERE id = $1", payment_id
            )
            return dict(row) if row else None
    
    # External data operations
    async def get_professional_info(self, professional_id: str) -> Dict[str, Any]:
        """קבלת מידע מקצוען"""
        async with self.get_connection() as conn:
            row = await conn.fetchrow("""
                SELECT u.full_name as name, u.phone_number, p.profession, p.company_name
                FROM users u
                JOIN professionals p ON u.id = p.user_id
                WHERE u.id = $1
            """, professional_id)
            
            return dict(row) if row else {}
    
    # Logging operations
    async def insert_commission_log(self, log_data: Dict[str, Any]):
        """רישום פעולת עמלה"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO commission_audit_logs (
                    commission_id, action, performed_by, timestamp, ip_address
                ) VALUES ($1, $2, $3, $4, $5)
            """,
                log_data["commission_id"],
                log_data["action"],
                log_data["performed_by"],
                log_data["timestamp"],
                log_data.get("ip_address")
            )
    
    async def insert_balance_log(self, log_data: Dict[str, Any]):
        """רישום עדכון יתרה"""
        async with self.get_connection() as conn:
            await conn.execute("""
                INSERT INTO balance_audit_logs (
                    professional_id, action, outstanding_commissions,
                    pending_revenue_shares, net_balance, timestamp
                ) VALUES ($1, $2, $3, $4, $5, $6)
            """,
                log_data["professional_id"],
                log_data["action"],
                log_data["outstanding_commissions"],
                log_data["pending_revenue_shares"],
                log_data["net_balance"],
                log_data["timestamp"]
            )

# Global database instance
_database = DatabaseConnection()

def get_database() -> DatabaseConnection:
    """קבלת מופע מסד הנתונים"""
    return _database