"""Document model for file storage and metadata."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import uuid4

from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base


class DocumentStatus(str, Enum):
    """Document processing status."""
    UPLOADING = "uploading"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"
    DELETED = "deleted"


class DocumentType(str, Enum):
    """Document type classification."""
    PDF = "pdf"
    WORD = "word"
    EXCEL = "excel"
    POWERPOINT = "powerpoint"
    TEXT = "text"
    CSV = "csv"
    JSON = "json"
    OTHER = "other"


class Document(Base):
    """Document model with security and processing metadata."""
    
    __tablename__ = "documents"
    
    # Primary key - UUID for security
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
        doc="Unique document identifier"
    )
    
    # Ownership
    owner_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Document owner user ID"
    )
    
    # File information
    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Original filename"
    )
    
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        index=True,
        doc="Document title (searchable)"
    )
    
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Document description"
    )
    
    # File metadata
    file_size: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="File size in bytes"
    )
    
    file_type: Mapped[DocumentType] = mapped_column(
        SQLEnum(DocumentType),
        nullable=False,
        doc="Document type classification"
    )
    
    mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        doc="MIME type of the file"
    )
    
    file_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
        doc="SHA-256 hash of file content"
    )
    
    # Storage information
    storage_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="File storage path"
    )
    
    # Processing status
    status: Mapped[DocumentStatus] = mapped_column(
        SQLEnum(DocumentStatus),
        default=DocumentStatus.UPLOADING,
        nullable=False,
        index=True,
        doc="Document processing status"
    )
    
    processing_started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Processing start timestamp"
    )
    
    processing_completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Processing completion timestamp"
    )
    
    processing_error: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Processing error message"
    )
    
    # Extracted content
    content: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Extracted text content"
    )
    
    content_preview: Mapped[Optional[str]] = mapped_column(
        String(1000),
        nullable=True,
        doc="Content preview for search results"
    )
    
    # Metadata extracted from file
    file_metadata: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        doc="Document metadata (author, creation date, etc.)"
    )
    
    # Search and indexing
    is_searchable: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Whether document is included in search"
    )
    
    search_vector: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Full-text search vector"
    )
    
    # Statistics
    view_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of times document was viewed"
    )
    
    download_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Number of times document was downloaded"
    )
    
    last_accessed: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Last access timestamp"
    )
    
    # Security flags
    is_encrypted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Whether file content is encrypted"
    )
    
    is_sensitive: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Whether document contains sensitive data"
    )
    
    # Relationships
    owner: Mapped["User"] = relationship(
        "User",
        back_populates="documents",
        doc="Document owner"
    )
    
    @property
    def file_size_human(self) -> str:
        """Get human-readable file size."""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"
    
    @property
    def is_processing(self) -> bool:
        """Check if document is currently being processed."""
        return self.status in [DocumentStatus.UPLOADING, DocumentStatus.PROCESSING]
    
    @property
    def is_ready(self) -> bool:
        """Check if document is ready for use."""
        return self.status == DocumentStatus.READY
    
    @property
    def has_error(self) -> bool:
        """Check if document processing failed."""
        return self.status == DocumentStatus.ERROR
    
    def get_file_extension(self) -> str:
        """Get file extension from filename."""
        return self.filename.split('.')[-1].lower() if '.' in self.filename else ''
    
    def mark_as_processing(self) -> None:
        """Mark document as being processed."""
        self.status = DocumentStatus.PROCESSING
        self.processing_started_at = datetime.utcnow()
    
    def mark_as_ready(self) -> None:
        """Mark document as ready for use."""
        self.status = DocumentStatus.READY
        self.processing_completed_at = datetime.utcnow()
        self.processing_error = None
    
    def mark_as_error(self, error_message: str) -> None:
        """Mark document processing as failed."""
        self.status = DocumentStatus.ERROR
        self.processing_completed_at = datetime.utcnow()
        self.processing_error = error_message
    
    def increment_view_count(self) -> None:
        """Increment view count and update last accessed."""
        self.view_count += 1
        self.last_accessed = datetime.utcnow()
    
    def increment_download_count(self) -> None:
        """Increment download count."""
        self.download_count += 1
    
    def can_be_accessed_by(self, user_id: str) -> bool:
        """Check if user can access this document."""
        # For now, only owner can access
        # Future: implement sharing permissions
        return self.owner_id == user_id
    
    def to_dict(self, include_content: bool = False) -> dict:
        """Convert document to dictionary."""
        data = super().to_dict()
        
        # Add computed properties
        data['file_size_human'] = self.file_size_human
        data['is_processing'] = self.is_processing
        data['is_ready'] = self.is_ready
        data['has_error'] = self.has_error
        data['file_extension'] = self.get_file_extension()
        
        # Optionally exclude large content field
        if not include_content:
            data.pop('content', None)
            data.pop('search_vector', None)
        
        return data
    
    def __repr__(self) -> str:
        """String representation of document."""
        return f"<Document(id={self.id}, title={self.title}, status={self.status})>"
