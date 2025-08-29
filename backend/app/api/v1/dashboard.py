"""Dashboard API endpoints."""

from fastapi import APIRouter
from app.models.dashboard import DashboardStats, DashboardResponse

router = APIRouter()


@router.get("/stats", response_model=DashboardResponse)
async def get_dashboard_stats():
    """Получить статистику панели управления."""
    stats = DashboardStats(
        total_documents=42,
        total_searches=156,
        total_chats=23,
        active_users=8
    )
    
    return DashboardResponse(
        message="Статистика панели управления получена успешно",
        data=stats
    )


@router.get("/recent-activity")
async def get_recent_activity():
    """Получить последнюю активность пользователей."""
    return {
        "message": "Последняя активность получена успешно",
        "data": [
            {
                "id": 1,
                "type": "document_upload",
                "title": "Годовой отчет 2024.pdf",
                "timestamp": "2024-01-15T10:30:00Z"
            },
            {
                "id": 2,
                "type": "search_query", 
                "title": "анализ квартальной выручки",
                "timestamp": "2024-01-15T09:45:00Z"
            },
            {
                "id": 3,
                "type": "chat_session",
                "title": "Обсуждение рыночных трендов",
                "timestamp": "2024-01-15T08:20:00Z"
            }
        ]
    }

