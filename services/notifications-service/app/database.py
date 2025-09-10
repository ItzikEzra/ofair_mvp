import asyncpg
import json
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
import logging

from .config import settings

logger = logging.getLogger(__name__)

class NotificationsDatabase:
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
            logger.info("Connected to notifications database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise
    
    async def disconnect(self):
        """Disconnect from database"""
        if self.pool:
            await self.pool.close()
            logger.info("Disconnected from notifications database")
    
    # Notification operations
    async def insert_notification(self, notification_data: Dict[str, Any]) -> str:
        """Insert new notification record"""
        query = """
        INSERT INTO notifications (
            id, user_id, template_id, channels, priority, status,
            variables, scheduled_at, created_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
        """
        
        async with self.pool.acquire() as conn:
            return await conn.fetchval(
                query,
                notification_data["id"],
                notification_data["user_id"],
                notification_data["template_id"],
                json.dumps(notification_data["channels"]),
                notification_data["priority"],
                notification_data["status"],
                json.dumps(notification_data["variables"]),
                notification_data["scheduled_at"],
                notification_data["created_at"],
                notification_data["created_by"]
            )
    
    async def get_notification(self, notification_id: str) -> Optional[Dict[str, Any]]:
        """Get notification by ID"""
        query = """
        SELECT 
            id, user_id, template_id, channels, priority, status,
            variables, scheduled_at, sent_at, delivered_at, read_at,
            error_message, created_at, created_by
        FROM notifications
        WHERE id = $1
        """
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, notification_id)
            if row:
                return {
                    **dict(row),
                    "channels": json.loads(row["channels"]) if row["channels"] else [],
                    "variables": json.loads(row["variables"]) if row["variables"] else {}
                }
            return None
    
    async def update_notification(self, notification_id: str, update_data: Dict[str, Any]):
        """Update notification record"""
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in update_data.items():
            if key == "variables" and value:
                set_clauses.append(f"{key} = ${param_count}")
                values.append(json.dumps(value))
            else:
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
            param_count += 1
        
        if not set_clauses:
            return
        
        query = f"""
        UPDATE notifications
        SET {', '.join(set_clauses)}
        WHERE id = ${param_count}
        """
        values.append(notification_id)
        
        async with self.pool.acquire() as conn:
            await conn.execute(query, *values)
    
    async def get_user_notifications(
        self,
        user_id: str,
        status: Optional[str] = None,
        channels: Optional[List[str]] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get user's notifications with filtering"""
        conditions = ["user_id = $1"]
        params = [user_id]
        param_count = 2
        
        if status:
            conditions.append(f"status = ${param_count}")
            params.append(status)
            param_count += 1
        
        if channels:
            # Check if any of the requested channels exist in the channels JSON array
            channel_conditions = []
            for channel in channels:
                channel_conditions.append(f"channels::text LIKE '%{channel}%'")
            conditions.append(f"({' OR '.join(channel_conditions)})")
        
        where_clause = "WHERE " + " AND ".join(conditions)
        
        query = f"""
        SELECT 
            id, user_id, template_id, channels, priority, status,
            variables, scheduled_at, sent_at, delivered_at, read_at,
            error_message, created_at, created_by
        FROM notifications
        {where_clause}
        ORDER BY created_at DESC
        LIMIT ${param_count} OFFSET ${param_count + 1}
        """
        params.extend([limit, offset])
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            return [
                {
                    **dict(row),
                    "channels": json.loads(row["channels"]) if row["channels"] else [],
                    "variables": json.loads(row["variables"]) if row["variables"] else {}
                }
                for row in rows
            ]
    
    async def get_scheduled_notifications(self, before_time: datetime) -> List[Dict[str, Any]]:
        """Get notifications scheduled for delivery"""
        query = """
        SELECT 
            id, user_id, template_id, channels, priority, status,
            variables, scheduled_at, created_at, created_by
        FROM notifications
        WHERE status = 'pending'
          AND scheduled_at IS NOT NULL
          AND scheduled_at <= $1
        ORDER BY scheduled_at ASC
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, before_time)
            return [
                {
                    **dict(row),
                    "channels": json.loads(row["channels"]) if row["channels"] else [],
                    "variables": json.loads(row["variables"]) if row["variables"] else {}
                }
                for row in rows
            ]
    
    # Template operations
    async def insert_template(self, template_data: Dict[str, Any]) -> str:
        """Insert new template"""
        query = """
        INSERT INTO notification_templates (
            id, name, category, description, subject_template,
            content_template, html_template, variables, supported_channels,
            is_active, created_at, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
        """
        
        async with self.pool.acquire() as conn:
            return await conn.fetchval(
                query,
                template_data["id"],
                template_data["name"],
                template_data["category"],
                template_data["description"],
                template_data["subject_template"],
                template_data["content_template"],
                template_data["html_template"],
                json.dumps(template_data["variables"]),
                json.dumps(template_data["supported_channels"]),
                template_data["is_active"],
                template_data["created_at"],
                template_data["created_by"]
            )
    
    async def get_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Get template by ID"""
        query = """
        SELECT 
            id, name, category, description, subject_template,
            content_template, html_template, variables, supported_channels,
            is_active, created_at, created_by, updated_at, updated_by
        FROM notification_templates
        WHERE id = $1
        """
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, template_id)
            if row:
                return {
                    **dict(row),
                    "variables": json.loads(row["variables"]) if row["variables"] else [],
                    "supported_channels": json.loads(row["supported_channels"]) if row["supported_channels"] else []
                }
            return None
    
    async def get_templates(
        self,
        category: Optional[str] = None,
        active_only: bool = True
    ) -> List[Dict[str, Any]]:
        """Get templates with optional filtering"""
        conditions = []
        params = []
        param_count = 1
        
        if active_only:
            conditions.append("is_active = true")
        
        if category:
            conditions.append(f"category = ${param_count}")
            params.append(category)
            param_count += 1
        
        where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""
        
        query = f"""
        SELECT 
            id, name, category, description, subject_template,
            content_template, html_template, variables, supported_channels,
            is_active, created_at, created_by, updated_at, updated_by
        FROM notification_templates
        {where_clause}
        ORDER BY created_at DESC
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            return [
                {
                    **dict(row),
                    "variables": json.loads(row["variables"]) if row["variables"] else [],
                    "supported_channels": json.loads(row["supported_channels"]) if row["supported_channels"] else []
                }
                for row in rows
            ]
    
    async def update_template(self, template_id: str, update_data: Dict[str, Any]):
        """Update template"""
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in update_data.items():
            if key in ["variables", "supported_channels"] and value:
                set_clauses.append(f"{key} = ${param_count}")
                values.append(json.dumps(value))
            else:
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
            param_count += 1
        
        if not set_clauses:
            return
        
        query = f"""
        UPDATE notification_templates
        SET {', '.join(set_clauses)}
        WHERE id = ${param_count}
        """
        values.append(template_id)
        
        async with self.pool.acquire() as conn:
            await conn.execute(query, *values)
    
    # Delivery operations
    async def insert_notification_delivery(self, delivery_data: Dict[str, Any]) -> str:
        """Insert delivery record"""
        query = """
        INSERT INTO notification_deliveries (
            notification_id, channel, recipient, status, created_at
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        """
        
        async with self.pool.acquire() as conn:
            return await conn.fetchval(
                query,
                delivery_data["notification_id"],
                delivery_data["channel"],
                delivery_data["recipient"],
                delivery_data["status"],
                delivery_data["created_at"]
            )
    
    async def get_notification_deliveries(self, notification_id: str) -> List[Dict[str, Any]]:
        """Get delivery records for notification"""
        query = """
        SELECT 
            id, notification_id, channel, recipient, status,
            sent_at, delivered_at, error_message, external_id,
            cost, metadata, created_at
        FROM notification_deliveries
        WHERE notification_id = $1
        ORDER BY created_at ASC
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, notification_id)
            return [dict(row) for row in rows]
    
    async def update_notification_delivery(self, delivery_id: str, update_data: Dict[str, Any]):
        """Update delivery record"""
        set_clauses = []
        values = []
        param_count = 1
        
        for key, value in update_data.items():
            if key == "metadata" and value:
                set_clauses.append(f"{key} = ${param_count}")
                values.append(json.dumps(value))
            else:
                set_clauses.append(f"{key} = ${param_count}")
                values.append(value)
            param_count += 1
        
        if not set_clauses:
            return
        
        query = f"""
        UPDATE notification_deliveries
        SET {', '.join(set_clauses)}
        WHERE id = ${param_count}
        """
        values.append(delivery_id)
        
        async with self.pool.acquire() as conn:
            await conn.execute(query, *values)
    
    async def get_delivery_by_external_id(self, external_id: str) -> Optional[Dict[str, Any]]:
        """Get delivery by external ID"""
        query = """
        SELECT 
            id, notification_id, channel, recipient, status,
            sent_at, delivered_at, error_message, external_id,
            cost, metadata, created_at
        FROM notification_deliveries
        WHERE external_id = $1
        """
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, external_id)
            return dict(row) if row else None
    
    # Preferences operations
    async def insert_user_preferences(self, prefs_data: Dict[str, Any]):
        """Insert user preferences"""
        query = """
        INSERT INTO user_notification_preferences (
            user_id, preferences, last_updated
        ) VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO UPDATE SET
            preferences = EXCLUDED.preferences,
            last_updated = EXCLUDED.last_updated
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                prefs_data["user_id"],
                json.dumps(prefs_data["preferences"]),
                prefs_data["last_updated"]
            )
    
    async def get_user_preferences(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user preferences"""
        query = """
        SELECT user_id, preferences, last_updated
        FROM user_notification_preferences
        WHERE user_id = $1
        """
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, user_id)
            if row:
                return {
                    **dict(row),
                    "preferences": json.loads(row["preferences"]) if row["preferences"] else {}
                }
            return None
    
    async def update_user_preferences(self, user_id: str, update_data: Dict[str, Any]):
        """Update user preferences"""
        query = """
        UPDATE user_notification_preferences
        SET preferences = $1, last_updated = $2
        WHERE user_id = $3
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                json.dumps(update_data["preferences"]),
                update_data["last_updated"],
                user_id
            )
    
    async def delete_user_preferences(self, user_id: str):
        """Delete user preferences"""
        query = "DELETE FROM user_notification_preferences WHERE user_id = $1"
        
        async with self.pool.acquire() as conn:
            await conn.execute(query, user_id)
    
    # Statistics operations
    async def get_delivery_stats(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get delivery statistics"""
        query = """
        WITH notification_stats AS (
            SELECT 
                COUNT(*) as total_notifications,
                COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
                AVG(EXTRACT(EPOCH FROM (delivered_at - sent_at))) as avg_delivery_time
            FROM notifications
            WHERE created_at BETWEEN $1 AND $2
        ),
        channel_stats AS (
            SELECT 
                nd.channel,
                COUNT(*) as count,
                SUM(COALESCE(nd.cost, 0)) as total_cost
            FROM notification_deliveries nd
            JOIN notifications n ON nd.notification_id = n.id
            WHERE n.created_at BETWEEN $1 AND $2
            GROUP BY nd.channel
        ),
        status_stats AS (
            SELECT 
                status,
                COUNT(*) as count
            FROM notifications
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY status
        ),
        priority_stats AS (
            SELECT 
                priority,
                COUNT(*) as count
            FROM notifications
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY priority
        )
        SELECT 
            ns.total_notifications,
            ns.delivered_count,
            ns.failed_count,
            ns.avg_delivery_time,
            COALESCE(ns.delivered_count::float / NULLIF(ns.total_notifications, 0), 0) as delivery_rate,
            json_object_agg(cs.channel, json_build_object('count', cs.count, 'cost', cs.total_cost)) as by_channel,
            json_object_agg(ss.status, ss.count) as by_status,
            json_object_agg(ps.priority, ps.count) as by_priority
        FROM notification_stats ns
        LEFT JOIN channel_stats cs ON true
        LEFT JOIN status_stats ss ON true  
        LEFT JOIN priority_stats ps ON true
        GROUP BY ns.total_notifications, ns.delivered_count, ns.failed_count, ns.avg_delivery_time
        """
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, start_date, end_date)
            if row:
                return dict(row)
            return {}
    
    async def get_user_notification_stats(self, user_id: str) -> Dict[str, Any]:
        """Get user notification statistics"""
        query = """
        SELECT 
            COUNT(*) as total_notifications,
            COUNT(CASE WHEN status = 'delivered' AND read_at IS NULL THEN 1 END) as unread_notifications,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as last_30_days,
            COALESCE(COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END)::float / NULLIF(COUNT(CASE WHEN status = 'delivered' THEN 1 END), 0), 0) as read_rate
        FROM notifications
        WHERE user_id = $1
        """
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, user_id)
            return dict(row) if row else {}
    
    # Logging operations
    async def insert_notification_log(self, log_data: Dict[str, Any]):
        """Insert notification log entry"""
        query = """
        INSERT INTO notification_logs (
            notification_id, action, performed_by, timestamp
        ) VALUES ($1, $2, $3, $4)
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                log_data["notification_id"],
                log_data["action"],
                log_data["performed_by"],
                log_data["timestamp"]
            )
    
    async def insert_notification_error(self, error_data: Dict[str, Any]):
        """Insert notification error log"""
        query = """
        INSERT INTO notification_errors (
            user_id, template_id, error_message, context, timestamp
        ) VALUES ($1, $2, $3, $4, $5)
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                error_data["user_id"],
                error_data["template_id"],
                error_data["error_message"],
                error_data["context"],
                error_data["timestamp"]
            )
    
    async def insert_delivery_log(self, log_data: Dict[str, Any]):
        """Insert delivery log entry"""
        query = """
        INSERT INTO delivery_logs (
            notification_id, delivery_results, total_deliveries,
            successful_deliveries, failed_deliveries, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6)
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                log_data["notification_id"],
                json.dumps(log_data["delivery_results"]),
                log_data["total_deliveries"],
                log_data["successful_deliveries"],
                log_data["failed_deliveries"],
                log_data["timestamp"]
            )
    
    # Helper operations
    async def get_user_contact_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user contact information (would normally call users service)"""
        # This is a mock implementation - in reality would call users service API
        # For now return None to indicate we need to implement the service call
        return None
    
    async def get_user_push_tokens(self, user_id: str) -> List[str]:
        """Get user's push notification tokens"""
        query = """
        SELECT token FROM user_push_tokens 
        WHERE user_id = $1 AND is_active = true
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, user_id)
            return [row["token"] for row in rows]
    
    async def insert_in_app_notification(self, notification_data: Dict[str, Any]):
        """Insert in-app notification"""
        query = """
        INSERT INTO in_app_notifications (
            user_id, notification_id, title, content, is_read, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                notification_data["user_id"],
                notification_data["notification_id"],
                notification_data["title"],
                notification_data["content"],
                notification_data["is_read"],
                notification_data["created_at"]
            )
    
    async def insert_websocket_message(self, message_data: Dict[str, Any]):
        """Insert WebSocket message for later delivery"""
        query = """
        INSERT INTO websocket_messages (
            user_id, message, created_at
        ) VALUES ($1, $2, $3)
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                message_data["user_id"],
                message_data["message"],
                message_data["created_at"]
            )
    
    async def get_notification_delivery_results(self, notification_id: str) -> Dict[str, Dict[str, Any]]:
        """Get delivery results by channel"""
        query = """
        SELECT channel, status, sent_at, delivered_at, error_message, cost
        FROM notification_deliveries
        WHERE notification_id = $1
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, notification_id)
            
            results = {}
            for row in rows:
                results[row["channel"]] = {
                    "status": row["status"],
                    "sent_at": row["sent_at"],
                    "delivered_at": row["delivered_at"],
                    "error_message": row["error_message"],
                    "cost": row["cost"]
                }
            
            return results
    
    async def archive_old_deliveries(self, cutoff_date: datetime):
        """Archive old delivery records"""
        # Move to archive table
        archive_query = """
        INSERT INTO notification_deliveries_archive
        SELECT * FROM notification_deliveries
        WHERE created_at < $1
        """
        
        # Delete from main table
        delete_query = """
        DELETE FROM notification_deliveries
        WHERE created_at < $1
        """
        
        async with self.pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(archive_query, cutoff_date)
                deleted_count = await conn.fetchval(
                    f"WITH deleted AS ({delete_query} RETURNING id) SELECT COUNT(*) FROM deleted",
                    cutoff_date
                )
                
                logger.info(f"Archived {deleted_count} delivery records")
    
    # Additional helper methods for preferences service
    async def get_users_with_channel_enabled(self, channel: str) -> List[str]:
        """Get users who have specific channel enabled"""
        query = """
        SELECT user_id 
        FROM user_notification_preferences
        WHERE preferences->$1 = 'true'
        """
        
        channel_key = f"{channel}_enabled"
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, channel_key)
            return [row["user_id"] for row in rows]
    
    async def insert_preferences_log(self, log_data: Dict[str, Any]):
        """Insert preferences change log"""
        query = """
        INSERT INTO preference_logs (
            user_id, action, new_preferences, timestamp
        ) VALUES ($1, $2, $3, $4)
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                log_data["user_id"],
                log_data["action"],
                json.dumps(log_data["new_preferences"]),
                log_data["timestamp"]
            )
    
    async def insert_preferences_archive(self, archive_data: Dict[str, Any]):
        """Insert preferences archive for GDPR compliance"""
        query = """
        INSERT INTO user_preferences_archive (
            user_id, preferences_data, deleted_at
        ) VALUES ($1, $2, $3)
        """
        
        async with self.pool.acquire() as conn:
            await conn.execute(
                query,
                archive_data["user_id"],
                json.dumps(archive_data["preferences_data"]),
                archive_data["deleted_at"]
            )
    
    # Template usage statistics
    async def get_template_usage_stats(self, template_id: str, days: int) -> Dict[str, Any]:
        """Get template usage statistics"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        query = """
        WITH template_notifications AS (
            SELECT 
                n.*,
                AVG(EXTRACT(EPOCH FROM (n.sent_at - n.created_at))) OVER () as avg_processing_time
            FROM notifications n
            WHERE n.template_id = $1 
              AND n.created_at >= $2
        ),
        delivery_stats AS (
            SELECT 
                nd.status,
                nd.channel,
                COUNT(*) as count
            FROM notification_deliveries nd
            JOIN template_notifications tn ON nd.notification_id = tn.id
            GROUP BY nd.status, nd.channel
        )
        SELECT 
            COUNT(tn.id) as total_notifications,
            COUNT(CASE WHEN tn.status = 'delivered' THEN 1 END) as successful_deliveries,
            COUNT(CASE WHEN tn.status = 'failed' THEN 1 END) as failed_deliveries,
            COALESCE(COUNT(CASE WHEN tn.status = 'delivered' THEN 1 END)::float / NULLIF(COUNT(tn.id), 0), 0) as delivery_rate,
            COALESCE(MAX(tn.avg_processing_time), 0) as average_processing_time,
            COALESCE(
                json_object_agg(
                    ds.channel, 
                    json_build_object('status', ds.status, 'count', ds.count)
                ) FILTER (WHERE ds.channel IS NOT NULL), 
                '{}'::json
            ) as by_channel,
            COALESCE(
                json_object_agg(
                    ds.status, 
                    ds.count
                ) FILTER (WHERE ds.status IS NOT NULL),
                '{}'::json
            ) as by_status
        FROM template_notifications tn
        LEFT JOIN delivery_stats ds ON true
        """
        
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, template_id, cutoff_date)
            return dict(row) if row else {}
    
    async def get_template_categories_with_counts(self) -> Dict[str, int]:
        """Get template categories with counts"""
        query = """
        SELECT category, COUNT(*) as count
        FROM notification_templates
        WHERE is_active = true
        GROUP BY category
        ORDER BY category
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query)
            return {row["category"]: row["count"] for row in rows}


# Global database instance
_db_instance = None

def get_database() -> NotificationsDatabase:
    """Get database instance (singleton pattern)"""
    global _db_instance
    if _db_instance is None:
        _db_instance = NotificationsDatabase()
    return _db_instance