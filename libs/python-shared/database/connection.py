"""Database connection and session management."""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from ..config.settings import get_settings

settings = get_settings()

# Create engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=settings.debug,
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def set_rls_context(db: Session, user_id: str, professional_id: str = None) -> None:
    """Set Row Level Security context for the session."""
    if professional_id:
        db.execute(f"SELECT set_current_user_context('{user_id}', '{professional_id}')")
    else:
        db.execute(f"SELECT set_current_user_context('{user_id}')")
    db.commit()