"""Database connection and session management."""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session
from ..config.settings import get_settings

settings = get_settings()

# Create synchronous engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.debug,
)

# Create async engine for async services
async_engine = create_async_engine(
    settings.database_url.replace('postgresql://', 'postgresql+asyncpg://'),
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.debug,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def get_db() -> Generator[Session, None, None]:
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_db_engine(database_url: str = None):
    """Get database engine - for compatibility with services."""
    if database_url:
        return create_engine(
            database_url,
            pool_pre_ping=True,
            pool_recycle=300,
            echo=settings.debug,
        )
    return engine


async def get_async_session() -> Generator[AsyncSession, None, None]:
    """Get async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def set_rls_context(db: Session, user_id: str, professional_id: str = None) -> None:
    """Set Row Level Security context for the session."""
    if professional_id:
        db.execute(f"SELECT set_current_user_context('{user_id}', '{professional_id}')")
    else:
        db.execute(f"SELECT set_current_user_context('{user_id}')")
    db.commit()