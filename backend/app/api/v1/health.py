"""Health check endpoints with database and cache monitoring."""

import time
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.database import check_database_health
from app.core.cache import check_redis_health


class ServiceHealth(BaseModel):
    """Individual service health status."""
    status: str = Field(..., description="Service status (healthy/error)")
    message: str = Field(..., description="Status message")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional details")


class DetailedHealthResponse(BaseModel):
    """Comprehensive health check response."""
    status: str = Field(..., description="Overall service status")
    timestamp: datetime = Field(..., description="Check timestamp")
    version: str = Field(..., description="Application version")
    environment: str = Field(..., description="Environment")
    services: Dict[str, ServiceHealth] = Field(..., description="Individual service statuses")
    uptime_seconds: float = Field(..., description="Application uptime in seconds")


router = APIRouter()

# Track application start time for uptime calculation
_start_time = time.time()


@router.get("/", response_model=DetailedHealthResponse, tags=["health"])
async def health_check() -> DetailedHealthResponse:
    """
    Комплексная проверка состояния всех сервисов платформы.
    
    Проверяет:
    - Состояние приложения
    - Подключение к базе данных
    - Подключение к Redis cache
    - Время работы системы
    
    Returns:
        DetailedHealthResponse: Детальный статус всех компонентов
    """
    services = {}
    overall_status = "healthy"
    
    # Check database health
    try:
        db_health = await check_database_health()
        services["database"] = ServiceHealth(
            status=db_health["status"],
            message=db_health["message"],
            details={k: v for k, v in db_health.items() if k not in ["status", "message"]}
        )
        if db_health["status"] != "healthy":
            overall_status = "degraded"
    except Exception as e:
        services["database"] = ServiceHealth(
            status="error",
            message=f"Database check failed: {str(e)}",
            details={}
        )
        overall_status = "error"
    
    # Check Redis health
    try:
        redis_health = await check_redis_health()
        services["cache"] = ServiceHealth(
            status=redis_health["status"],
            message=redis_health["message"],
            details={k: v for k, v in redis_health.items() if k not in ["status", "message"]}
        )
        if redis_health["status"] != "healthy":
            overall_status = "degraded" if overall_status == "healthy" else "error"
    except Exception as e:
        services["cache"] = ServiceHealth(
            status="error",
            message=f"Redis check failed: {str(e)}",
            details={}
        )
        overall_status = "error"
    
    # Application health
    services["application"] = ServiceHealth(
        status="healthy",
        message="Application is running normally",
        details={
            "debug_mode": settings.DEBUG,
            "log_level": settings.LOG_LEVEL,
        }
    )
    
    # Calculate uptime
    uptime = time.time() - _start_time
    
    return DetailedHealthResponse(
        status=overall_status,
        timestamp=datetime.utcnow(),
        version=settings.APP_VERSION,
        environment="development" if settings.DEBUG else "production",
        services=services,
        uptime_seconds=uptime
    )


@router.get("/database", response_model=ServiceHealth, tags=["health"])
async def database_health() -> ServiceHealth:
    """
    Детальная проверка состояния базы данных.
    
    Returns:
        ServiceHealth: Статус базы данных с деталями
    """
    try:
        health = await check_database_health()
        return ServiceHealth(
            status=health["status"],
            message=health["message"],
            details={k: v for k, v in health.items() if k not in ["status", "message"]}
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Database health check failed: {str(e)}"
        )


@router.get("/cache", response_model=ServiceHealth, tags=["health"])
async def cache_health() -> ServiceHealth:
    """
    Детальная проверка состояния Redis cache.
    
    Returns:
        ServiceHealth: Статус кеша с деталями
    """
    try:
        health = await check_redis_health()
        return ServiceHealth(
            status=health["status"],
            message=health["message"],
            details={k: v for k, v in health.items() if k not in ["status", "message"]}
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Cache health check failed: {str(e)}"
        )

