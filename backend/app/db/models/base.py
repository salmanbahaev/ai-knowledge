"""Base model for all database entities."""

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all database models with common fields."""
    
    # Common timestamp fields for all models
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        doc="Record creation timestamp"
    )
    
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        doc="Record last update timestamp"
    )
    
    def to_dict(self) -> dict[str, Any]:
        """Convert model instance to dictionary."""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
    
    def __repr__(self) -> str:
        """String representation of the model."""
        class_name = self.__class__.__name__
        
        # Try to get an ID field for representation
        id_field = None
        for column in self.__table__.columns:
            if column.name in ['id', 'uuid', 'user_id']:
                id_field = getattr(self, column.name, None)
                break
        
        if id_field:
            return f"<{class_name}(id={id_field})>"
        else:
            return f"<{class_name}()>"
