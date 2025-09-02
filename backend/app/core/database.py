"""Database configuration and session management."""

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
    AsyncEngine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import event

from app.core.config import settings

logger = logging.getLogger(__name__)

# Create declarative base for all models
Base = declarative_base()

# Global database engine instance
engine: AsyncEngine | None = None
SessionLocal: async_sessionmaker[AsyncSession] | None = None


def create_database_engine() -> AsyncEngine:
    """
    Create optimized database engine with connection pooling.
    
    Returns:
        AsyncEngine: Configured SQLAlchemy async engine
    """
    return create_async_engine(
        settings.DATABASE_URL,
        # Connection Pool Configuration (Enterprise Grade)
        # Note: QueuePool is default for async engines, no need to specify
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_pre_ping=True,  # Validate connections before use
        
        # Performance & Debugging
        echo=settings.DB_ECHO,
        echo_pool=settings.DEBUG,
        future=True,  # Use SQLAlchemy 2.0 style
        
        # Connection arguments for PostgreSQL optimization
        connect_args={
            "command_timeout": 60,
            "server_settings": {
                "application_name": settings.APP_NAME,
                "jit": "off",  # Disable JIT for consistent performance
            },
        },
    )


async def init_database() -> None:
    """Initialize database engine and session factory."""
    global engine, SessionLocal
    
    try:
        logger.info("Initializing database connection...")
        
        # Create async engine
        engine = create_database_engine()
        
        # Create session factory
        SessionLocal = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,  # Keep objects usable after commit
            autoflush=True,
            autocommit=False,
        )
        
        # Test connection
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
            
        logger.info("Database connection established successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def get_database_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency to provide database session for FastAPI endpoints.
    
    Yields:
        AsyncSession: Database session with automatic cleanup
    """
    if SessionLocal is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def close_database() -> None:
    """Close database connections gracefully."""
    global engine
    
    if engine is not None:
        logger.info("Closing database connections...")
        await engine.dispose()
        engine = None
        logger.info("Database connections closed")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for database sessions.
    
    Yields:
        AsyncSession: Database session
    """
    global SessionLocal
    
    if SessionLocal is None:
        await init_database()
    
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Database health check
async def check_database_health() -> dict:
    """
    Check database connection health.
    
    Returns:
        dict: Health status information
    """
    if engine is None:
        return {"status": "error", "message": "Database not initialized"}
    
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT 1 as health_check"))
            row = result.fetchone()
            
        # Get safe pool info for async engine
        pool_info = {}
        try:
            pool_info["pool_size"] = engine.pool.size()
            pool_info["checked_out"] = engine.pool.checkedout()
        except AttributeError:
            # Some pool attributes may not be available for async pools
            pool_info["pool_type"] = "async"
            
        return {
            "status": "healthy",
            "message": "Database connection is working",
            **pool_info
        }
        
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return {
            "status": "error", 
            "message": f"Database health check failed: {str(e)}"
        }


# Import text for raw SQL queries
from sqlalchemy import text

# Note: Event listeners for async engines are not supported yet
# Connection monitoring can be added later via sync_engine if needed
