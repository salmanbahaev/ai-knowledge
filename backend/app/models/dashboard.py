"""Dashboard data models."""

from typing import List
from pydantic import BaseModel, Field


class StatCard(BaseModel):
    """Statistics card data."""
    
    title: str = Field(..., description="Statistic title")
    value: str = Field(..., description="Statistic value")
    change: str = Field(..., description="Change percentage")
    change_type: str = Field(..., description="positive or negative")
    icon: str = Field(..., description="Icon name")


class ActivityItem(BaseModel):
    """Recent activity item."""
    
    id: str = Field(..., description="Activity ID")
    action: str = Field(..., description="Action description")
    user: str = Field(..., description="User name")
    time: str = Field(..., description="Time description")
    type: str = Field(..., description="Activity type")


class DashboardData(BaseModel):
    """Dashboard data response."""
    
    stats: List[StatCard] = Field(..., description="Statistics cards")
    recent_activities: List[ActivityItem] = Field(..., description="Recent activities")
