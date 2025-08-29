"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.api.v1.router import api_router
from app.models.common import ErrorResponse

# Create FastAPI application
app = FastAPI(
    title="AI Платформа Управления Знаниями",
    version=settings.APP_VERSION,
    description="Умная платформа для управления знаниями с поиском по документам, ИИ-ассистентом и графом связей",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
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


