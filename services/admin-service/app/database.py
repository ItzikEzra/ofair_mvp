import asyncpg
import json
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
import uuid
import logging

from config import settings

logger = logging.getLogger(__name__)

class AdminDatabase:
    def __init__(self):
        self.pool = None
    
    async def connect(self):
        """Connect to database"""
        try:
            self.pool = await asyncpg.create_pool(
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD,
                database=settings.POSTGRES_DB,
                min_size=5,
                max_size=20,
                command_timeout=30
            )
            logger.info("Connected to admin database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from database"""
        if self.pool:
            await self.pool.close()
            logger.info("Disconnected from admin database")
    
    async def health_check(self):
        """Simple database health check"""
        async with self.pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
    
    # Admin user operations
    async def get_admin_by_id(self, admin_id: str) -> Optional[Dict[str, Any]]:
        """Get admin user by ID"""
        query = """
        SELECT 
            id, username, email, full_name, role, phone_number,
            is_active, permissions, notes, created_at, last_login,
            login_count, created_by, locked_until, failed_login_attempts
        FROM admin_users
        WHERE id = $1
        """
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, admin_id)
            if row:
                return {
                    **dict(row),
                    "permissions": json.loads(row["permissions"]) if row["permissions"] else []
                }
            return None
    
    async def get_admin_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get admin user by username"""
        query = """
        SELECT 
            id, username, email, full_name, role, phone_number,
            is_active, permissions, notes, created_at, last_login,
            login_count, created_by, locked_until, failed_login_attempts,
            password_hash
        FROM admin_users
        WHERE username = $1
        """
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, username.lower())
            if row:
                return {
                    **dict(row),
                    "permissions": json.loads(row["permissions"]) if row["permissions"] else []
                }
            return None
    
    async def create_admin_user(self, admin_data: Dict[str, Any]) -> str:
        """Create new admin user"""
        admin_id = str(uuid.uuid4())
        
        query = """
        INSERT INTO admin_users (
            id, username, email, full_name, role, phone_number,
            is_active, permissions, notes, password_hash, created_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
        """
        
        async with self.pool.acquire() as conn:
            return await conn.fetchval(
                query,
                admin_id,
                admin_data["username"].lower(),
                admin_data["email"],
                admin_data["full_name"],
                admin_data["role"],
                admin_data.get("phone_number"),
                admin_data.get("is_active", True),
                json.dumps(admin_data.get("permissions", [])),
                admin_data.get("notes"),
                admin_data["password_hash"],
                datetime.utcnow(),
                admin_data["created_by"]
            )
    
    async def update_admin_user(self, admin_id: str, update_data: Dict[str, Any]):
        """Update admin user"""
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in update_data.items():
            if key == "permissions":
                set_clauses.append(f"{key} = ${param_count}")
                values.append(json.dumps(value))
            else:
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
            param_count += 1
        
        if not set_clauses:
            return
        
        set_clauses.append(f"updated_at = ${param_count}")
        values.append(datetime.utcnow())
        param_count += 1
        
        query = f"""
        UPDATE admin_users
        SET {', '.join(set_clauses)}
        WHERE id = ${param_count}
        """
        values.append(admin_id)
        
        async with self.pool.acquire() as conn:
            await conn.execute(query, *values)
    
    async def update_admin_last_activity(self, admin_id: str):
        """Update admin last activity"""
        query = """
        UPDATE admin_users 
        SET last_login = $1
        WHERE id = $2
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(query, datetime.utcnow(), admin_id)
    
    async def increment_failed_login(self, admin_id: str):
        """Increment failed login attempts"""
        query = """
        UPDATE admin_users
        SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
            locked_until = CASE 
                WHEN COALESCE(failed_login_attempts, 0) + 1 >= $1 
                THEN $2 
                ELSE locked_until 
            END
        WHERE id = $3
        """
        
        lockout_until = datetime.utcnow() + timedelta(seconds=settings.ACCOUNT_LOCKOUT_DURATION)
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                settings.MAX_FAILED_LOGINS,
                lockout_until,
                admin_id
            )
    
    async def reset_failed_logins(self, admin_id: str):
        """Reset failed login attempts after successful login"""
        query = """
        UPDATE admin_users
        SET failed_login_attempts = 0,
            locked_until = NULL,
            login_count = COALESCE(login_count, 0) + 1
        WHERE id = $1
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(query, admin_id)
    
    # Session management
    async def create_admin_session(self, session_data: Dict[str, Any]) -> str:
        """Create admin session"""
        session_id = str(uuid.uuid4())
        
        query = """
        INSERT INTO admin_sessions (
            id, admin_id, ip_address, user_agent, created_at, expires_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
        """
        
        async with self.pool.acquire() as conn:
            return await conn.fetchval(
                query,
                session_id,
                session_data["admin_id"],
                session_data["ip_address"],
                session_data["user_agent"],
                session_data["created_at"],
                session_data["expires_at"],
                session_data["is_active"]
            )
    
    async def get_admin_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get admin session"""
        query = """
        SELECT id, admin_id, ip_address, user_agent, created_at, 
               expires_at, is_active, last_activity
        FROM admin_sessions
        WHERE id = $1
        """
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, session_id)
            return dict(row) if row else None
    
    async def update_session_activity(self, session_id: str):
        """Update session last activity"""
        query = """
        UPDATE admin_sessions
        SET last_activity = $1
        WHERE id = $2
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(query, datetime.utcnow(), session_id)
    
    async def expire_admin_session(self, session_id: str):
        """Expire admin session"""
        query = """
        UPDATE admin_sessions
        SET is_active = FALSE
        WHERE id = $1
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(query, session_id)
    
    async def terminate_admin_session(self, session_id: str):
        """Terminate specific admin session"""
        await self.expire_admin_session(session_id)
    
    async def terminate_all_admin_sessions(self, admin_id: str):
        """Terminate all sessions for admin"""
        query = """
        UPDATE admin_sessions
        SET is_active = FALSE
        WHERE admin_id = $1 AND is_active = TRUE
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(query, admin_id)
    
    # Dashboard statistics
    async def get_total_users(self) -> int:
        """Get total number of users across all services"""
        # This would normally call other services or access their databases
        # For now, return mock data
        return 15420
    
    async def get_active_users(self, days: int = 30) -> int:
        """Get active users in last N days"""
        return 8930
    
    async def get_total_leads(self) -> int:
        """Get total number of leads"""
        return 3280
    
    async def get_open_leads(self) -> int:
        """Get number of open leads"""
        return 450
    
    async def get_total_proposals(self) -> int:
        """Get total number of proposals"""
        return 12560
    
    async def get_pending_proposals(self) -> int:
        """Get number of pending proposals"""
        return 280
    
    async def get_total_revenue(self) -> float:
        """Get total platform revenue"""
        return 284750.80
    
    async def get_monthly_revenue(self, start_date: datetime) -> float:
        """Get revenue for current month"""
        return 45230.50
    
    async def get_conversion_rate(self, start_date: datetime) -> float:
        """Get lead to proposal conversion rate"""
        return 78.5
    
    async def get_avg_response_time(self, start_date: datetime) -> float:
        """Get average response time in hours"""
        return 2.3
    
    # System health
    async def get_database_stats(self) -> Dict[str, Any]:
        """Get database performance statistics"""
        query = """
        SELECT 
            (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
            (SELECT avg(mean_exec_time) FROM pg_stat_statements LIMIT 10) as avg_query_time
        """
        
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(query)
                return dict(row) if row else {}
        except Exception:
            # Fallback if pg_stat_statements not available
            return {"active_connections": 5, "avg_query_time": 25.5}
    
    # Alerts and monitoring
    async def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get active system alerts"""
        query = """
        SELECT id, type, title, description, severity, component, 
               status, created_at, metadata
        FROM system_alerts
        WHERE status = 'active'
        ORDER BY severity DESC, created_at DESC
        LIMIT 20
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query)
            return [
                {
                    **dict(row),
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else {}
                }
                for row in rows
            ]
    
    async def get_alerts_by_severity(self, severity: str) -> List[Dict[str, Any]]:
        """Get alerts by severity level"""
        query = """
        SELECT id, type, title, description, severity, component,
               status, created_at
        FROM system_alerts
        WHERE severity = $1 AND status = 'active'
        ORDER BY created_at DESC
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, severity)
            return [dict(row) for row in rows]
    
    async def get_system_error_rate(self, minutes: int = 60) -> float:
        """Get system error rate in last N minutes"""
        # This would normally check error logs
        # Return mock data for now
        return 1.2  # 1.2% error rate
    
    async def get_system_config(self, config_key: str) -> Optional[Dict[str, Any]]:
        """Get system configuration value"""
        query = """
        SELECT key, value, category, description, is_sensitive
        FROM system_configurations
        WHERE key = $1
        """
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, config_key)
            if row:
                return {
                    **dict(row),
                    "value": json.loads(row["value"]) if row["value"] else None
                }
            return None
    
    # Audit logging
    async def insert_audit_log(self, audit_data: Dict[str, Any]):
        """Insert audit log entry"""
        query = """
        INSERT INTO audit_logs (
            id, admin_id, user_id, event_type, action, resource_type,
            resource_id, description, ip_address, user_agent,
            timestamp, metadata, severity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        """
        
        log_id = str(uuid.uuid4())
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                log_id,
                audit_data.get("admin_id"),
                audit_data.get("user_id"),
                audit_data.get("event_type", "system"),
                audit_data["action"],
                audit_data["resource_type"],
                audit_data.get("resource_id"),
                audit_data.get("description", ""),
                audit_data.get("ip_address"),
                audit_data.get("user_agent"),
                audit_data["timestamp"],
                json.dumps(audit_data.get("metadata", {})),
                audit_data.get("severity", "info")
            )
    
    async def get_recent_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent audit log entries"""
        query = """
        SELECT 
            al.id, al.admin_id, al.user_id, al.event_type, al.action,
            al.resource_type, al.resource_id, al.description,
            al.timestamp, al.severity, al.metadata,
            au.username as admin_username,
            au.full_name as admin_name
        FROM audit_logs al
        LEFT JOIN admin_users au ON al.admin_id = au.id
        ORDER BY al.timestamp DESC
        LIMIT $1
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, limit)
            return [
                {
                    **dict(row),
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else {},
                    "user_name": row.get("admin_name") or "מערכת"
                }
                for row in rows
            ]
    
    async def search_audit_logs(self, search_params: Dict[str, Any]) -> Dict[str, Any]:
        """Search audit logs with filters"""
        conditions = []
        values = []
        param_count = 1
        
        # Build WHERE conditions
        if search_params.get("start_date"):
            conditions.append(f"al.timestamp >= ${param_count}")
            values.append(search_params["start_date"])
            param_count += 1
        
        if search_params.get("end_date"):
            conditions.append(f"al.timestamp <= ${param_count}")
            values.append(search_params["end_date"])
            param_count += 1
        
        if search_params.get("admin_id"):
            conditions.append(f"al.admin_id = ${param_count}")
            values.append(search_params["admin_id"])
            param_count += 1
        
        if search_params.get("event_types"):
            placeholders = ",".join([f"${param_count + i}" for i in range(len(search_params["event_types"]))])
            conditions.append(f"al.event_type IN ({placeholders})")
            values.extend(search_params["event_types"])
            param_count += len(search_params["event_types"])
        
        if search_params.get("severity"):
            conditions.append(f"al.severity = ${param_count}")
            values.append(search_params["severity"])
            param_count += 1
        
        if search_params.get("search_term"):
            conditions.append(f"(al.description ILIKE ${param_count} OR al.action ILIKE ${param_count})")
            values.append(f"%{search_params['search_term']}%")
            param_count += 1
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        # Get total count
        count_query = f"""
        SELECT COUNT(*)
        FROM audit_logs al
        {where_clause}
        """
        
        # Get paginated results
        page = search_params.get("page", 1)
        page_size = search_params.get("page_size", 50)
        offset = (page - 1) * page_size
        
        results_query = f"""
        SELECT 
            al.id, al.admin_id, al.user_id, al.event_type, al.action,
            al.resource_type, al.resource_id, al.description,
            al.timestamp, al.severity, al.metadata,
            au.username as admin_username,
            au.full_name as admin_name
        FROM audit_logs al
        LEFT JOIN admin_users au ON al.admin_id = au.id
        {where_clause}
        ORDER BY al.timestamp DESC
        LIMIT ${param_count} OFFSET ${param_count + 1}
        """
        values.extend([page_size, offset])
        
        async with self.pool.acquire() as conn:
            total_count = await conn.fetchval(count_query, *values[:-2])
            rows = await conn.fetch(results_query, *values)
            
            results = [
                {
                    **dict(row),
                    "metadata": json.loads(row["metadata"]) if row["metadata"] else {},
                    "user_name": row.get("admin_name") or "מערכת"
                }
                for row in rows
            ]
            
            return {
                "results": results,
                "total": total_count,
                "page": page,
                "page_size": page_size,
                "total_pages": (total_count + page_size - 1) // page_size
            }
    
    # Rate limiting support
    async def count_admin_actions(self, admin_id: str, action: str, since: datetime) -> int:
        """Count admin actions since given time"""
        query = """
        SELECT COUNT(*)
        FROM audit_logs
        WHERE admin_id = $1 AND action = $2 AND timestamp >= $3
        """
        
        async with self.pool.acquire() as conn:
            return await conn.fetchval(query, admin_id, action, since)
    
    # Analytics data
    async def get_user_analytics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get user analytics for date range"""
        # Mock data - would normally query other services
        return {
            "new_users": 245,
            "total_users": 15420,
            "active_users": 8930,
            "churn_rate": 2.1,
            "growth_rate": 12.5,
            "by_type": {
                "professionals": 8450,
                "customers": 6970
            }
        }
    
    async def get_lead_analytics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get lead analytics for date range"""
        return {
            "total_leads": 3280,
            "new_leads": 420,
            "conversion_rate": 78.5,
            "avg_response_time": 2.3,
            "by_category": {
                "בנייה ושיפוצים": 980,
                "אלקטריקאי": 650,
                "שרברבות": 520,
                "ניקיון": 380,
                "אחר": 750
            },
            "by_status": {
                "open": 450,
                "in_progress": 1200,
                "closed": 1430,
                "cancelled": 200
            }
        }
    
    async def get_revenue_analytics(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Get revenue analytics for date range"""
        return {
            "total_revenue": 284750.80,
            "monthly_revenue": 45230.50,
            "commission_revenue": 42180.30,
            "growth_rate": 18.5,
            "by_category": {
                "בנייה ושיפוצים": 125000.00,
                "אלקטריקאי": 78500.00,
                "שרברבות": 45200.00,
                "ניקיון": 22100.00,
                "אחר": 13950.80
            }
        }
    
    # 2FA support
    async def store_2fa_code(self, admin_id: str, code: str, expires_in_minutes: int = 5):
        """Store 2FA code"""
        expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
        
        query = """
        INSERT INTO admin_2fa_codes (admin_id, code, expires_at, created_at)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (admin_id) DO UPDATE SET
            code = EXCLUDED.code,
            expires_at = EXCLUDED.expires_at,
            created_at = EXCLUDED.created_at
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(query, admin_id, code, expires_at, datetime.utcnow())
    
    async def get_2fa_code(self, admin_id: str) -> Optional[Dict[str, Any]]:
        """Get stored 2FA code"""
        query = """
        SELECT code, expires_at
        FROM admin_2fa_codes
        WHERE admin_id = $1
        """
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, admin_id)
            return dict(row) if row else None
    
    async def remove_2fa_code(self, admin_id: str):
        """Remove used 2FA code"""
        query = "DELETE FROM admin_2fa_codes WHERE admin_id = $1"
        
        async with self.pool.acquire() as conn:
            await conn.execute(query, admin_id)
    
    # Security logging
    async def insert_security_log(self, security_data: Dict[str, Any]):
        """Insert security log entry"""
        query = """
        INSERT INTO security_logs (
            id, event_type, ip_address, user_agent, admin_id,
            timestamp, details, severity
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """
        
        log_id = str(uuid.uuid4())
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                log_id,
                security_data["event_type"],
                security_data["ip_address"],
                security_data.get("user_agent"),
                security_data.get("admin_id"),
                security_data["timestamp"],
                security_data.get("details", ""),
                security_data.get("severity", "medium")
            )

# Global database instance
_db_instance = None

def get_database() -> AdminDatabase:
    """Get database instance (singleton pattern)"""
    global _db_instance
    if _db_instance is None:
        _db_instance = AdminDatabase()
    return _db_instance