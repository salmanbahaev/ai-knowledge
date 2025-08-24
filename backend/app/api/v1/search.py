"""Search endpoints."""

import time
from typing import List
from fastapi import APIRouter, Query

from app.models.common import ApiResponse
from app.models.search import SearchRequest, SearchResponse, SearchResult

router = APIRouter()

# Mock search data for demonstration
MOCK_DOCUMENTS = [
    SearchResult(
        id="1",
        title="Company Vacation Policy 2024",
        type="pdf",
        content="Our vacation policy allows employees to take up to 25 days of paid time off per year. Vacation requests must be submitted at least 2 weeks in advance...",
        author="HR Department",
        date="2024-01-15",
        tags=["HR", "Policy", "Benefits"],
        score=0.95
    ),
    SearchResult(
        id="2",
        title="Q3 Financial Report",
        type="docx",
        content="The third quarter showed significant growth in our core business segments. Revenue increased by 15% compared to the previous quarter...",
        author="Finance Team",
        date="2024-01-10",
        tags=["Finance", "Quarterly", "Report"],
        score=0.88
    ),
    SearchResult(
        id="3",
        title="Project Alpha Requirements",
        type="docx",
        content="Project Alpha aims to revolutionize our customer service platform. The key requirements include real-time chat, AI-powered responses...",
        author="Product Team",
        date="2024-01-08",
        tags=["Project", "Requirements", "Development"],
        score=0.82
    ),
    SearchResult(
        id="4",
        title="Employee Onboarding Guide",
        type="pdf",
        content="Welcome to our company! This guide will help new employees get started with their first week, including IT setup, HR paperwork...",
        author="HR Department",
        date="2024-01-05",
        tags=["HR", "Onboarding", "Guide"],
        score=0.75
    ),
    SearchResult(
        id="5",
        title="Security Best Practices",
        type="docx",
        content="This document outlines security best practices for all employees. Topics include password management, email security, and data protection...",
        author="IT Security",
        date="2024-01-03",
        tags=["Security", "IT", "Guidelines"],
        score=0.68
    )
]


def filter_documents(query: str, type_filter: str = None) -> List[SearchResult]:
    """Filter documents based on search query and type."""
    results = []
    query_lower = query.lower()
    
    for doc in MOCK_DOCUMENTS:
        # Simple text matching
        if (query_lower in doc.title.lower() or 
            query_lower in doc.content.lower() or 
            any(query_lower in tag.lower() for tag in doc.tags)):
            
            # Apply type filter if specified
            if type_filter is None or doc.type == type_filter:
                results.append(doc)
    
    # Sort by relevance score (descending)
    results.sort(key=lambda x: x.score, reverse=True)
    return results


@router.get("/", response_model=ApiResponse[SearchResponse], tags=["search"])
async def search_documents(
    q: str = Query(..., description="Search query"),
    type_filter: str = Query(None, description="Filter by document type"),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
    offset: int = Query(0, ge=0, description="Pagination offset")
) -> ApiResponse[SearchResponse]:
    """
    Search documents using hybrid search.
    
    Performs full-text search across document titles, content, and tags.
    Returns paginated results with relevance scoring.
    """
    start_time = time.time()
    
    # Filter documents based on query
    filtered_results = filter_documents(q, type_filter)
    
    # Apply pagination
    total = len(filtered_results)
    paginated_results = filtered_results[offset:offset + limit]
    
    search_time = time.time() - start_time
    
    search_response = SearchResponse(
        results=paginated_results,
        total=total,
        query=q,
        took=round(search_time, 3)
    )
    
    return ApiResponse(
        data=search_response,
        message=f"Found {total} results for '{q}'"
    )


@router.post("/", response_model=ApiResponse[SearchResponse], tags=["search"])
async def advanced_search(request: SearchRequest) -> ApiResponse[SearchResponse]:
    """
    Advanced search with request body.
    
    Accepts a SearchRequest object for more complex search parameters.
    """
    start_time = time.time()
    
    # Filter documents based on query
    filtered_results = filter_documents(request.query, request.type_filter)
    
    # Apply pagination
    total = len(filtered_results)
    paginated_results = filtered_results[request.offset:request.offset + request.limit]
    
    search_time = time.time() - start_time
    
    search_response = SearchResponse(
        results=paginated_results,
        total=total,
        query=request.query,
        took=round(search_time, 3)
    )
    
    return ApiResponse(
        data=search_response,
        message=f"Found {total} results for '{request.query}'"
    )
