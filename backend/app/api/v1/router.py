"""API v1 router configuration."""

from fastapi import APIRouter

from app.api.v1 import health, dashboard, search

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(health.router, prefix="/health", tags=["🩺 Состояние системы"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["📊 Панель управления"])
api_router.include_router(search.router, prefix="/search", tags=["🔍 Поиск"])





