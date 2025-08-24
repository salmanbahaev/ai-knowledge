"""Health check endpoints."""

from fastapi import APIRouter

from app.core.config import settings
from app.models.common import HealthResponse

router = APIRouter()


@router.get("/", response_model=HealthResponse, tags=["health"])
async def health_check() -> HealthResponse:
    """
    Health check endpoint.
    
    Returns the current status of the application.
    """
    return HealthResponse(
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION
    )
