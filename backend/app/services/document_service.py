"""Document management service with CRUD operations."""

import logging
from datetime import datetime
from typing import List, Optional, Tuple
from uuid import uuid4

from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_, func
from sqlalchemy.orm import selectinload

from app.db.models.document import Document, DocumentStatus, DocumentType
from app.db.models.user import User
from app.services.document_storage import document_storage
from app.services.file_validation import validate_file_upload
from app.core.config import settings

logger = logging.getLogger(__name__)


class DocumentService:
    """
    Enterprise-grade document management service.
    
    Features:
    - Secure file upload with validation
    - Document CRUD operations
    - Access control enforcement
    - Metadata management
    - File storage integration
    """
    
    def __init__(self):
        self.storage = document_storage
    
    async def create_document(
        self,
        db: AsyncSession,
        file: UploadFile,
        user_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        is_sensitive: bool = False
    ) -> Document:
        """
        Create new document with file upload.
        
        Args:
            db: Database session
            file: Uploaded file
            user_id: Owner user ID
            title: Document title (optional, defaults to filename)
            description: Document description
            is_sensitive: Whether document contains sensitive data
            
        Returns:
            Created document
            
        Raises:
            HTTPException: If creation fails
        """
        try:
            # Validate file first
            validation_result = await validate_file_upload(file)
            
            # Determine document type
            doc_type = self._determine_document_type(validation_result["mime_type"])
            
            # Store file securely
            storage_path, file_hash, file_size = await self.storage.store_file(
                file, 
                user_id, 
                encrypt=settings.ENABLE_FILE_ENCRYPTION or is_sensitive
            )
            
            # Create document record
            document = Document(
                id=str(uuid4()),
                owner_id=user_id,
                filename=validation_result["filename"],
                title=title or validation_result["filename"],
                description=description,
                file_size=file_size,
                file_type=doc_type,
                mime_type=validation_result["mime_type"],
                file_hash=file_hash,
                storage_path=storage_path,
                status=DocumentStatus.READY,  # Will be PROCESSING when we add text extraction
                is_encrypted=settings.ENABLE_FILE_ENCRYPTION or is_sensitive,
                is_sensitive=is_sensitive,
                processing_completed_at=datetime.utcnow()
            )
            
            # Save to database
            db.add(document)
            await db.commit()
            await db.refresh(document)
            
            logger.info(f"Document created: {document.id} ({document.filename})")
            return document
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to create document: {e}")
            raise HTTPException(status_code=500, detail=f"Document creation failed: {str(e)}")
    
    async def get_document(
        self,
        db: AsyncSession,
        document_id: str,
        user_id: str,
        include_content: bool = False
    ) -> Optional[Document]:
        """
        Get document by ID with access control.
        
        Args:
            db: Database session
            document_id: Document ID
            user_id: Requesting user ID
            include_content: Whether to include extracted content
            
        Returns:
            Document if found and accessible, None otherwise
        """
        try:
            query = select(Document).where(
                and_(
                    Document.id == document_id,
                    Document.owner_id == user_id,
                    Document.status != DocumentStatus.DELETED
                )
            )
            
            # Remove the selectinload for now as it may cause greenlet issues
            # if include_content:
            #     query = query.options(selectinload(Document.owner))
            
            result = await db.execute(query)
            document = result.scalar_one_or_none()
            
            # Don't update statistics for now to avoid greenlet issues
            # if document:
            #     # Update access statistics
            #     document.increment_view_count()
            #     try:
            #         await db.commit()
            #     except Exception as e:
            #         logger.warning(f"Failed to update view count: {e}")
            #         # Don't fail the request if we can't update stats
            
            return document
            
        except Exception as e:
            logger.error(f"Failed to get document {document_id}: {e}")
            return None
    
    async def get_user_documents(
        self,
        db: AsyncSession,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        status_filter: Optional[DocumentStatus] = None,
        type_filter: Optional[DocumentType] = None,
        search_query: Optional[str] = None
    ) -> Tuple[List[Document], int]:
        """
        Get user's documents with filtering and pagination.
        
        Args:
            db: Database session
            user_id: User ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            status_filter: Filter by document status
            type_filter: Filter by document type
            search_query: Search in title and description
            
        Returns:
            Tuple of (documents, total_count)
        """
        try:
            # Build query conditions
            conditions = [
                Document.owner_id == user_id,
                Document.status != DocumentStatus.DELETED
            ]
            
            if status_filter:
                conditions.append(Document.status == status_filter)
            
            if type_filter:
                conditions.append(Document.file_type == type_filter)
            
            if search_query:
                search_term = f"%{search_query}%"
                conditions.append(
                    Document.title.ilike(search_term) |
                    Document.description.ilike(search_term) |
                    Document.filename.ilike(search_term)
                )
            
            # Get total count
            count_query = select(func.count(Document.id)).where(and_(*conditions))
            count_result = await db.execute(count_query)
            total_count = count_result.scalar()
            
            # Get documents
            query = (
                select(Document)
                .where(and_(*conditions))
                .order_by(Document.created_at.desc())
                .offset(skip)
                .limit(limit)
            )
            
            result = await db.execute(query)
            documents = result.scalars().all()
            
            return list(documents), total_count
            
        except Exception as e:
            logger.error(f"Failed to get user documents: {e}")
            return [], 0
    
    async def update_document(
        self,
        db: AsyncSession,
        document_id: str,
        user_id: str,
        title: Optional[str] = None,
        description: Optional[str] = None,
        is_sensitive: Optional[bool] = None
    ) -> Optional[Document]:
        """
        Update document metadata.
        
        Args:
            db: Database session
            document_id: Document ID
            user_id: Owner user ID
            title: New title
            description: New description
            is_sensitive: New sensitivity flag
            
        Returns:
            Updated document or None if not found
        """
        try:
            # Check if document exists and user has access
            document = await self.get_document(db, document_id, user_id)
            if not document:
                return None
            
            # Update fields
            if title is not None:
                document.title = title
            if description is not None:
                document.description = description
            if is_sensitive is not None:
                document.is_sensitive = is_sensitive
            
            document.updated_at = datetime.utcnow()
            
            await db.commit()
            try:
                await db.refresh(document)
            except Exception as e:
                logger.warning(f"Failed to refresh document after update: {e}")
                # Document is still updated, just return without refresh
            
            logger.info(f"Document updated: {document_id}")
            return document
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to update document {document_id}: {e}")
            return None
    
    async def delete_document(
        self,
        db: AsyncSession,
        document_id: str,
        user_id: str,
        soft_delete: bool = True
    ) -> bool:
        """
        Delete document (soft or hard delete).
        
        Args:
            db: Database session
            document_id: Document ID
            user_id: Owner user ID
            soft_delete: Whether to perform soft delete (recommended)
            
        Returns:
            True if successful
        """
        try:
            # Check if document exists and user has access
            document = await self.get_document(db, document_id, user_id)
            if not document:
                return False
            
            if soft_delete:
                # Soft delete - mark as deleted
                document.status = DocumentStatus.DELETED
                document.updated_at = datetime.utcnow()
                await db.commit()
                
                logger.info(f"Document soft deleted: {document_id}")
            else:
                # Hard delete - remove from database and storage
                storage_path = document.storage_path
                
                # Delete from database first
                await db.delete(document)
                await db.commit()
                
                # Delete from storage
                try:
                    self.storage.delete_file(storage_path, user_id)
                except Exception as e:
                    logger.warning(f"Failed to delete file from storage: {e}")
                
                logger.info(f"Document hard deleted: {document_id}")
            
            return True
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to delete document {document_id}: {e}")
            return False
    
    async def get_document_content(
        self,
        db: AsyncSession,
        document_id: str,
        user_id: str
    ) -> Optional[bytes]:
        """
        Get document file content.
        
        Args:
            db: Database session
            document_id: Document ID
            user_id: Requesting user ID
            
        Returns:
            File content bytes or None if not accessible
        """
        try:
            # Check access
            document = await self.get_document(db, document_id, user_id)
            if not document:
                return None
            
            # Retrieve file content
            content = self.storage.retrieve_file(document.storage_path, user_id)
            
            # Update download statistics
            document.increment_download_count()
            try:
                await db.commit()
            except Exception as e:
                logger.warning(f"Failed to update download count: {e}")
                # Don't fail the request if we can't update stats
            
            return content
            
        except Exception as e:
            logger.error(f"Failed to get document content {document_id}: {e}")
            return None
    
    async def verify_document_integrity(
        self,
        db: AsyncSession,
        document_id: str,
        user_id: str
    ) -> bool:
        """
        Verify document file integrity.
        
        Args:
            db: Database session
            document_id: Document ID
            user_id: Owner user ID
            
        Returns:
            True if integrity is verified
        """
        try:
            document = await self.get_document(db, document_id, user_id)
            if not document:
                return False
            
            return self.storage.verify_file_integrity(
                document.storage_path,
                document.file_hash,
                user_id
            )
            
        except Exception as e:
            logger.error(f"Failed to verify document integrity {document_id}: {e}")
            return False
    
    async def get_user_storage_stats(
        self,
        db: AsyncSession,
        user_id: str
    ) -> dict:
        """
        Get user's storage usage statistics.
        
        Args:
            db: Database session
            user_id: User ID
            
        Returns:
            Storage statistics
        """
        try:
            # Get document counts and sizes
            query = (
                select(
                    func.count(Document.id).label("document_count"),
                    func.sum(Document.file_size).label("total_size"),
                    func.count(Document.id).filter(Document.status == DocumentStatus.READY).label("ready_count"),
                    func.count(Document.id).filter(Document.status == DocumentStatus.PROCESSING).label("processing_count"),
                    func.count(Document.id).filter(Document.status == DocumentStatus.ERROR).label("error_count")
                )
                .where(
                    and_(
                        Document.owner_id == user_id,
                        Document.status != DocumentStatus.DELETED
                    )
                )
            )
            
            result = await db.execute(query)
            stats = result.first()
            
            return {
                "document_count": stats.document_count or 0,
                "total_size_bytes": stats.total_size or 0,
                "total_size_human": self._format_size(stats.total_size or 0),
                "ready_count": stats.ready_count or 0,
                "processing_count": stats.processing_count or 0,
                "error_count": stats.error_count or 0,
                "storage_limit_bytes": settings.MAX_FILE_SIZE * settings.MAX_FILES_PER_USER,
                "storage_limit_human": self._format_size(settings.MAX_FILE_SIZE * settings.MAX_FILES_PER_USER)
            }
            
        except Exception as e:
            logger.error(f"Failed to get storage stats for user {user_id}: {e}")
            return {}
    
    def _determine_document_type(self, mime_type: str) -> DocumentType:
        """Determine document type from MIME type."""
        type_mapping = {
            "application/pdf": DocumentType.PDF,
            "application/msword": DocumentType.WORD,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DocumentType.WORD,
            "application/vnd.ms-excel": DocumentType.EXCEL,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": DocumentType.EXCEL,
            "application/vnd.ms-powerpoint": DocumentType.POWERPOINT,
            "application/vnd.openxmlformats-officedocument.presentationml.presentation": DocumentType.POWERPOINT,
            "text/plain": DocumentType.TEXT,
            "text/csv": DocumentType.CSV,
            "application/json": DocumentType.JSON,
        }
        
        return type_mapping.get(mime_type, DocumentType.OTHER)
    
    def _format_size(self, size_bytes: int) -> str:
        """Format size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} PB"


# Global service instance
document_service = DocumentService()
