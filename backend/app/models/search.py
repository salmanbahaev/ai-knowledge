"""Search data models."""

from typing import List, Optional
from pydantic import BaseModel, Field


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
    type: str = Field(..., description="Result type")
    content: str = Field(..., description="Result content preview")
    author: str = Field(..., description="Author name")
    date: str = Field(..., description="Creation/modification date")
    tags: List[str] = Field(default_factory=list, description="Associated tags")
    score: float = Field(default=1.0, ge=0.0, le=1.0, description="Relevance score")


class SearchResponse(BaseModel):
    """Search response model."""
    
    results: List[SearchResult] = Field(..., description="Search results")
    total: int = Field(..., ge=0, description="Total number of results")
    query: str = Field(..., description="Original search query")
    took: float = Field(..., ge=0, description="Search time in seconds")
