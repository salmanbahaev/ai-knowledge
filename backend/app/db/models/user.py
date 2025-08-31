"""User model for authentication and authorization."""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import String, Boolean, Integer, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.models.base import Base


class User(Base):
    """User model with security-first design."""
    
    __tablename__ = "users"
    
    # Primary key - UUID for security
    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        primary_key=True,
        default=lambda: str(uuid4()),
        doc="Unique user identifier"
    )
    
    # Authentication fields
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        doc="User email address (unique)"
    )
    
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Bcrypt hashed password"
    )
    
    # Profile information
    first_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        doc="User first name"
    )
    
    last_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        doc="User last name"
    )
    
    display_name: Mapped[Optional[str]] = mapped_column(
        String(200),
        nullable=True,
        doc="Display name (optional)"
    )
    
    # Account status
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Account active status"
    )
    
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Email verification status"
    )
    
    is_superuser: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Superuser privileges"
    )
    
    # Security fields
    failed_login_attempts: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Failed login attempts counter"
    )
    
    locked_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Account lock expiration time"
    )
    
    last_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        doc="Last successful login timestamp"
    )
    
    # Usage statistics
    total_documents: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Total documents uploaded"
    )
    
    storage_used: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
        doc="Storage used in bytes"
    )
    
    # Preferences
    language: Mapped[str] = mapped_column(
        String(10),
        default="en",
        nullable=False,
        doc="User interface language"
    )
    
    timezone: Mapped[str] = mapped_column(
        String(50),
        default="UTC",
        nullable=False,
        doc="User timezone"
    )
    
    # Relationships
    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="owner",
        cascade="all, delete-orphan",
        doc="Documents owned by user"
    )
    
    @property
    def full_name(self) -> str:
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}".strip()
    
    @property
    def is_locked(self) -> bool:
        """Check if account is currently locked."""
        if self.locked_until is None:
            return False
        return datetime.utcnow() < self.locked_until
    
    def lock_account(self, duration_minutes: int = 15) -> None:
        """Lock account for specified duration."""
        from datetime import timedelta
        self.locked_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
        self.failed_login_attempts += 1
    
    def unlock_account(self) -> None:
        """Unlock account and reset failed attempts."""
        self.locked_until = None
        self.failed_login_attempts = 0
    
    def can_upload_file(self, file_size: int) -> bool:
        """Check if user can upload file of given size."""
        from app.core.config import settings
        
        # Check individual file size
        if file_size > settings.MAX_FILE_SIZE:
            return False
        
        # Check total storage limit (future implementation)
        # For now, allow uploads
        return True
    
    def to_dict(self, include_sensitive: bool = False) -> dict:
        """Convert user to dictionary, optionally excluding sensitive data."""
        data = super().to_dict()
        
        if not include_sensitive:
            # Remove sensitive fields
            sensitive_fields = [
                'password_hash', 
                'failed_login_attempts', 
                'locked_until'
            ]
            for field in sensitive_fields:
                data.pop(field, None)
        
        # Add computed properties
        data['full_name'] = self.full_name
        data['is_locked'] = self.is_locked
        
        return data
    
    def __repr__(self) -> str:
        """String representation of user."""
        return f"<User(id={self.id}, email={self.email}, active={self.is_active})>"
