"""Database connection and operations for Auth Service."""

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
        """Build database connection string"""
        # Use DATABASE_URL if available (Docker), otherwise build from parts
        database_url = os.getenv('DATABASE_URL')
        if database_url:
            return database_url

        return (
            f"postgresql://{os.getenv('POSTGRES_USER', 'ofair_user')}:"
            f"{os.getenv('POSTGRES_PASSWORD', 'ofair_pass')}@"
            f"{os.getenv('POSTGRES_HOST', 'localhost')}:"
            f"{os.getenv('POSTGRES_PORT', '5432')}/"
            f"{os.getenv('POSTGRES_DB', 'ofair_mvp')}"
        )

    async def initialize_pool(self):
        """Initialize database connection pool"""
        self.pool = await asyncpg.create_pool(
            self.connection_string,
            min_size=5,
            max_size=20,
            command_timeout=60
        )

    async def close_pool(self):
        """Close database connection pool"""
        if self.pool:
            await self.pool.close()

    @asynccontextmanager
    async def get_connection(self):
        """Get database connection from pool"""
        if not self.pool:
            await self.initialize_pool()

        async with self.pool.acquire() as connection:
            yield connection

    async def check_user_exists(self, phone: str) -> bool:
        """Check if user exists in database by phone number"""
        user_data = await self.get_user_by_phone(phone)
        return user_data is not None

    async def check_professional_exists(self, phone: str) -> bool:
        """Check if user exists and has professional role"""
        user_data = await self.get_user_by_phone(phone)
        if not user_data:
            return False

        return user_data.get('role') == 'professional' and user_data.get('status') == 'active'

    async def get_user_by_phone(self, phone: str) -> dict:
        """Get user data by phone number with role and profile information"""
        try:
            async with self.get_connection() as conn:
                # Query users table with joined profile data
                try:
                    result = await conn.fetchrow(
                        """
                        SELECT
                            u.id as user_id,
                            u.phone,
                            u.email,
                            u.name,
                            u.role,
                            u.status,
                            u.profile_data,
                            u.created_at,
                            u.last_login,
                            pp.id as professional_profile_id,
                            pp.business_name,
                            pp.specialties,
                            pp.verified as professional_verified,
                            cp.id as customer_profile_id,
                            cp.city,
                            cp.address
                        FROM users u
                        LEFT JOIN professional_profiles pp ON u.id = pp.user_id
                        LEFT JOIN customer_profiles cp ON u.id = cp.user_id
                        WHERE u.phone = $1 AND u.status = 'active'
                        """,
                        phone
                    )

                    if result:
                        return dict(result)

                except Exception as e:
                    print(f"New users table not found, trying legacy tables: {e}")

                    # Fallback to legacy professionals table
                    try:
                        result = await conn.fetchval(
                            """
                            SELECT EXISTS(
                                SELECT 1 FROM professionals
                                WHERE phone = $1 AND status = 'active'
                            )
                            """,
                            phone
                        )
                        if result:
                            return {
                                'phone': phone,
                                'role': 'professional',
                                'status': 'active',
                                'legacy': True
                            }
                    except Exception:
                        pass

                return None
        except Exception as e:
            print(f"Database connection error: {e}")
            return None

# Global database instance
db = DatabaseConnection()