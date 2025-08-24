"""Dashboard endpoints."""

from fastapi import APIRouter

from app.models.common import ApiResponse
from app.models.dashboard import DashboardData, StatCard, ActivityItem

router = APIRouter()

# Mock data for demonstration
MOCK_STATS = [
    StatCard(
        title="Total Documents",
        value="1,234",
        change="+12% from last month",
        change_type="positive",
        icon="FileText"
    ),
    StatCard(
        title="Active Users",
        value="89",
        change="+5% from last month",
        change_type="positive",
        icon="Users"
    ),
    StatCard(
        title="AI Conversations",
        value="456",
        change="+23% from last month",
        change_type="positive",
        icon="MessageCircle"
    ),
    StatCard(
        title="Search Queries",
        value="2,890",
        change="-8% from last month",
        change_type="negative",
        icon="TrendingUp"
    )
]

MOCK_ACTIVITIES = [
    ActivityItem(
        id="1",
        action="Uploaded \"Company Handbook.pdf\"",
        user="John Doe",
        time="2 minutes ago",
        type="upload"
    ),
    ActivityItem(
        id="2",
        action="Searched for \"vacation policy\"",
        user="Jane Smith",
        time="5 minutes ago",
        type="search"
    ),
    ActivityItem(
        id="3",
        action="Asked AI about project deadlines",
        user="Mike Johnson",
        time="10 minutes ago",
        type="chat"
    ),
    ActivityItem(
        id="4",
        action="Viewed \"Q3 Report.docx\"",
        user="Sarah Wilson",
        time="15 minutes ago",
        type="view"
    )
]


@router.get("/stats", response_model=ApiResponse[DashboardData], tags=["dashboard"])
async def get_dashboard_stats() -> ApiResponse[DashboardData]:
    """
    Get dashboard statistics and recent activities.
    
    Returns mock data for demonstration purposes.
    """
    dashboard_data = DashboardData(
        stats=MOCK_STATS,
        recent_activities=MOCK_ACTIVITIES
    )
    
    return ApiResponse(
        data=dashboard_data,
        message="Dashboard data retrieved successfully"
    )
