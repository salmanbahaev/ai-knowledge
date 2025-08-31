"""Main FastAPI application with database and cache initialization."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_database, close_database
from app.core.cache import init_redis, close_redis
from app.api.v1.router import api_router
from app.models.common import ErrorResponse

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events for startup and shutdown."""
    # Startup
    logger.info("Starting AI Knowledge Platform...")
    
    try:
        # Initialize database
        await init_database()
        logger.info("Database initialized successfully")
        
        # Initialize Redis cache
        await init_redis()
        logger.info("Redis cache initialized successfully")
        
        logger.info("Application startup completed")
        
    except Exception as e:
        logger.error(f"Failed to initialize application: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Knowledge Platform...")
    
    try:
        # Close Redis connections
        await close_redis()
        logger.info("Redis connections closed")
        
        # Close database connections
        await close_database()
        logger.info("Database connections closed")
        
        logger.info("Application shutdown completed")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Create FastAPI application
app = FastAPI(
    title="AI Платформа Управления Знаниями",
    version=settings.APP_VERSION,
    description="Умная платформа для управления знаниями с поиском по документам, ИИ-ассистентом и графом связей",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,  # Add lifespan events
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_HOSTS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors."""
    error_response = ErrorResponse(
        message="Internal server error occurred",
        details={"error": str(exc)} if settings.DEBUG else None
    )
    return JSONResponse(
        status_code=500,
        content=error_response.dict()
    )


@app.get("/", tags=["Главная"])
async def root():
    """Главная страница API с базовой информацией о приложении."""
    return {
        "app": "AI Платформа Управления Знаниями",
        "version": settings.APP_VERSION,
        "status": "работает",
        "docs": "/docs" if settings.DEBUG else "отключена"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )





