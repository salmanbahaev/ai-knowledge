"""Search data models."""

from typing import List, Optional
from pydantic import BaseModel, Field


class SearchQuery(BaseModel):
    """Search query model."""
    
    query: str = Field(..., min_length=1, description="Search query")
    limit: Optional[int] = Field(default=10, ge=1, le=100, description="Number of results")


class SearchRequest(BaseModel):
    """Search request model."""
    
    query: str = Field(..., min_length=1, description="Search query")
    type_filter: Optional[str] = Field(default=None, description="Filter by type")
    limit: int = Field(default=20, ge=1, le=100, description="Number of results")
    offset: int = Field(default=0, ge=0, description="Pagination offset")


class SearchResult(BaseModel):
    """Search result item."""
    
    id: str = Field(..., description="Result ID")
    title: str = Field(..., description="Result title")
    content: str = Field(..., description="Result content preview")
    score: float = Field(default=1.0, ge=0.0, le=1.0, description="Relevance score")
    document_type: str = Field(..., description="Document type")
    created_at: str = Field(..., description="Creation date")


class SearchResponse(BaseModel):
    """Search response model."""
    
    message: str = Field(..., description="Response message")
    data: dict = Field(..., description="Search results data")


class SearchResponseDetailed(BaseModel):
    """Detailed search response model."""
    
    results: List[SearchResult] = Field(..., description="Search results")
    total: int = Field(..., ge=0, description="Total number of results")
    query: str = Field(..., description="Original search query")
    took: float = Field(..., ge=0, description="Search time in seconds")

