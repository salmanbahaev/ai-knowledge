"""Common data models and response schemas."""

from typing import Generic, TypeVar, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field

DataT = TypeVar('DataT')


class ApiResponse(BaseModel, Generic[DataT]):
    """Standard API response format."""
    
    data: DataT
    status: str = Field(default="success", description="Response status")
    message: Optional[str] = Field(default=None, description="Optional message")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ErrorResponse(BaseModel):
    """Error response format."""
    
    status: str = Field(default="error")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class HealthResponse(BaseModel):
    """Health check response."""
    
    status: str = Field(default="healthy")
    app_name: str
    version: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
