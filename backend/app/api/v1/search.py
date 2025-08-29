"""Search API endpoints."""

from fastapi import APIRouter, Query
from typing import Optional
from app.models.search import SearchQuery, SearchResponse, SearchResult

router = APIRouter()


@router.post("/", response_model=SearchResponse)
async def search_documents(query: SearchQuery):
    """Поиск по документам."""
    # Фейковые результаты поиска для демонстрации
    mock_results = [
        SearchResult(
            id="doc_1",
            title="Годовой отчет 2024",
            content="Документ содержит финансовый анализ и рыночную аналитику...",
            score=0.95,
            document_type="pdf",
            created_at="2024-01-15T10:00:00Z"
        ),
        SearchResult(
            id="doc_2", 
            title="Маркетинговая стратегия Q1",
            content="Стратегическое планирование маркетинговых инициатив первого квартала...",
            score=0.87,
            document_type="docx",
            created_at="2024-01-14T15:30:00Z"
        ),
        SearchResult(
            id="doc_3",
            title="Техническая документация",
            content="Архитектура системы и детали реализации...",
            score=0.72,
            document_type="md",
            created_at="2024-01-13T09:15:00Z"
        )
    ]
    
    # Filter results based on query
    filtered_results = [
        result for result in mock_results 
        if query.query.lower() in result.title.lower() or 
           query.query.lower() in result.content.lower()
    ]
    
    return SearchResponse(
        message="Поиск выполнен успешно",
        data={
            "query": query.query,
            "total_results": len(filtered_results),
            "results": filtered_results[:query.limit] if query.limit else filtered_results
        }
    )


@router.get("/suggestions")
async def get_search_suggestions(q: Optional[str] = Query(None, description="Префикс поискового запроса")):
    """Получить предложения для поиска на основе префикса запроса."""
    suggestions = [
        "годовой отчет",
        "маркетинговая стратегия", 
        "техническая документация",
        "финансовый анализ",
        "квартальный обзор",
        "план проекта",
        "планирование бюджета",
        "исследование рынка"
    ]
    
    if q:
        suggestions = [s for s in suggestions if q.lower() in s.lower()]
    
    return {
        "message": "Предложения для поиска получены успешно",
        "data": {
            "query": q,
            "suggestions": suggestions[:5]  # Ограничить до 5 предложений
        }
    }

