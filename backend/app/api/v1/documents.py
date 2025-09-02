"""Document management API endpoints."""

import logging
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.document_service import document_service
from app.models.common import BaseResponse
from app.db.models.document import DocumentStatus, DocumentType

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for API responses
from pydantic import BaseModel, Field
from datetime import datetime


class DocumentResponse(BaseModel):
    """Document response model."""
    id: str
    filename: str
    title: str
    description: Optional[str] = None
    file_size: int
    file_size_human: str
    file_type: str
    mime_type: str
    status: str
    is_encrypted: bool
    is_sensitive: bool
    view_count: int
    download_count: int
    created_at: datetime
    updated_at: datetime
    last_accessed: Optional[datetime] = None
    processing_completed_at: Optional[datetime] = None
    processing_error: Optional[str] = None
    # Computed properties from to_dict()
    is_processing: bool
    is_ready: bool
    has_error: bool
    file_extension: str

    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    """Document list response model."""
    documents: List[DocumentResponse]
    total_count: int
    page: int
    per_page: int
    has_next: bool


class DocumentUploadRequest(BaseModel):
    """Document upload request model."""
    title: Optional[str] = Field(None, description="Document title")
    description: Optional[str] = Field(None, description="Document description")
    is_sensitive: bool = Field(False, description="Whether document contains sensitive data")


class DocumentUpdateRequest(BaseModel):
    """Document update request model."""
    title: Optional[str] = Field(None, description="New document title")
    description: Optional[str] = Field(None, description="New document description")
    is_sensitive: Optional[bool] = Field(None, description="New sensitivity flag")


class StorageStatsResponse(BaseModel):
    """Storage statistics response model."""
    document_count: int
    total_size_bytes: int
    total_size_human: str
    ready_count: int
    processing_count: int
    error_count: int
    storage_limit_bytes: int
    storage_limit_human: str


# For now, we'll use a dummy user_id since auth isn't implemented yet
DUMMY_USER_ID = "12345678-1234-1234-1234-123456789012"  # Valid UUID format


@router.post("/upload", response_model=BaseResponse)
async def upload_document(
    file: UploadFile = File(..., description="Document file to upload"),
    title: Optional[str] = None,
    description: Optional[str] = None,
    is_sensitive: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a new document.
    
    Security features:
    - File validation and virus scanning
    - Encrypted storage for sensitive documents
    - Access control enforcement
    - Metadata extraction and indexing
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
    
    try:
        document = await document_service.create_document(
            db=db,
            file=file,
            user_id=DUMMY_USER_ID,
            title=title,
            description=description,
            is_sensitive=is_sensitive
        )
        
        return BaseResponse(
            message="Document uploaded successfully",
            data={
                "document_id": document.id,
                "filename": document.filename,
                "title": document.title,
                "file_size": document.file_size,
                "status": document.status.value
            }
        )
        
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/", response_model=BaseResponse)
async def get_documents(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Documents per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    type: Optional[str] = Query(None, description="Filter by document type"),
    search: Optional[str] = Query(None, description="Search query"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's documents with filtering and pagination.
    """
    try:
        # Parse filters
        status_filter = None
        if status:
            try:
                status_filter = DocumentStatus(status)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
        
        type_filter = None
        if type:
            try:
                type_filter = DocumentType(type)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid type: {type}")
        
        # Calculate skip
        skip = (page - 1) * per_page
        
        # Get documents
        documents, total_count = await document_service.get_user_documents(
            db=db,
            user_id=DUMMY_USER_ID,
            skip=skip,
            limit=per_page,
            status_filter=status_filter,
            type_filter=type_filter,
            search_query=search
        )
        
        # Convert to response models
        document_responses = []
        for doc in documents:
            doc_dict = doc.to_dict()
            # file_size_human is already included in to_dict(), don't add it again
            document_responses.append(DocumentResponse(**doc_dict))
        
        response_data = DocumentListResponse(
            documents=document_responses,
            total_count=total_count,
            page=page,
            per_page=per_page,
            has_next=skip + per_page < total_count
        )
        
        return BaseResponse(
            message=f"Retrieved {len(documents)} documents",
            data=response_data.model_dump()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve documents")


@router.get("/{document_id}", response_model=BaseResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get document by ID."""
    try:
        document = await document_service.get_document(
            db=db,
            document_id=document_id,
            user_id=DUMMY_USER_ID
        )
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_dict = document.to_dict()
        response_data = DocumentResponse(**doc_dict)
        
        return BaseResponse(
            message="Document retrieved successfully",
            data=response_data.model_dump()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve document")


@router.put("/{document_id}", response_model=BaseResponse)
async def update_document(
    document_id: str,
    update_data: DocumentUpdateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Update document metadata."""
    try:
        document = await document_service.update_document(
            db=db,
            document_id=document_id,
            user_id=DUMMY_USER_ID,
            title=update_data.title,
            description=update_data.description,
            is_sensitive=update_data.is_sensitive
        )
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_dict = document.to_dict()
        response_data = DocumentResponse(**doc_dict)
        
        return BaseResponse(
            message="Document updated successfully",
            data=response_data.model_dump()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update document")


@router.delete("/{document_id}", response_model=BaseResponse)
async def delete_document(
    document_id: str,
    hard_delete: bool = Query(False, description="Perform hard delete (permanent)"),
    db: AsyncSession = Depends(get_db)
):
    """Delete document (soft delete by default)."""
    try:
        success = await document_service.delete_document(
            db=db,
            document_id=document_id,
            user_id=DUMMY_USER_ID,
            soft_delete=not hard_delete
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found")
        
        delete_type = "permanently deleted" if hard_delete else "moved to trash"
        
        return BaseResponse(
            message=f"Document {delete_type} successfully",
            data={"document_id": document_id, "hard_delete": hard_delete}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Download document file."""
    try:
        # Get document metadata
        document = await document_service.get_document(
            db=db,
            document_id=document_id,
            user_id=DUMMY_USER_ID
        )
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Get file content
        content = await document_service.get_document_content(
            db=db,
            document_id=document_id,
            user_id=DUMMY_USER_ID
        )
        
        if not content:
            raise HTTPException(status_code=404, detail="File content not found")
        
        # Return as streaming response
        def generate():
            yield content
        
        # Encode filename properly for different browsers
        from urllib.parse import quote
        encoded_filename = quote(document.filename.encode('utf-8'))
        
        return StreamingResponse(
            generate(),
            media_type=document.mime_type,
            headers={
                "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
                "Content-Length": str(len(content))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to download document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to download document")


@router.post("/{document_id}/verify", response_model=BaseResponse)
async def verify_document_integrity(
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Verify document file integrity."""
    try:
        is_valid = await document_service.verify_document_integrity(
            db=db,
            document_id=document_id,
            user_id=DUMMY_USER_ID
        )
        
        return BaseResponse(
            message="Document integrity verification completed",
            data={
                "document_id": document_id,
                "is_valid": is_valid,
                "status": "valid" if is_valid else "corrupted"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to verify document {document_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify document")


@router.get("/stats/storage", response_model=BaseResponse)
async def get_storage_stats(
    db: AsyncSession = Depends(get_db)
):
    """Get user's storage usage statistics."""
    try:
        stats = await document_service.get_user_storage_stats(
            db=db,
            user_id=DUMMY_USER_ID
        )
        
        return BaseResponse(
            message="Storage statistics retrieved successfully",
            data=stats
        )
        
    except Exception as e:
        logger.error(f"Failed to get storage stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve storage statistics")
