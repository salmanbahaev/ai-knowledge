"""Create users and documents tables

Revision ID: b399384c8b54
Revises: 
Create Date: 2025-08-31 13:13:28.874510

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = 'b399384c8b54'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create users and documents tables with enterprise security features."""
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', UUID(as_uuid=False), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True, index=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('first_name', sa.String(100), nullable=False),
        sa.Column('last_name', sa.String(100), nullable=False),
        sa.Column('display_name', sa.String(200), nullable=True),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('is_verified', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_superuser', sa.Boolean(), default=False, nullable=False),
        sa.Column('failed_login_attempts', sa.Integer(), default=0, nullable=False),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_documents', sa.Integer(), default=0, nullable=False),
        sa.Column('storage_used', sa.Integer(), default=0, nullable=False),
        sa.Column('language', sa.String(10), default='en', nullable=False),
        sa.Column('timezone', sa.String(50), default='UTC', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes for users table
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_is_active', 'users', ['is_active'])
    op.create_index('ix_users_created_at', 'users', ['created_at'])
    
    # Create documents table
    op.create_table(
        'documents',
        sa.Column('id', UUID(as_uuid=False), primary_key=True),
        sa.Column('owner_id', UUID(as_uuid=False), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('title', sa.String(500), nullable=False, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('file_type', sa.Enum('pdf', 'word', 'excel', 'powerpoint', 'text', 'csv', 'json', 'other', name='documenttype'), nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('file_hash', sa.String(64), nullable=False, index=True),
        sa.Column('storage_path', sa.String(500), nullable=False),
        sa.Column('status', sa.Enum('uploading', 'processing', 'ready', 'error', 'deleted', name='documentstatus'), default='uploading', nullable=False, index=True),
        sa.Column('processing_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('content', sa.Text(), nullable=True),
        sa.Column('content_preview', sa.String(1000), nullable=True),
        sa.Column('file_metadata', JSONB(), nullable=True),
        sa.Column('is_searchable', sa.Boolean(), default=True, nullable=False),
        sa.Column('search_vector', sa.Text(), nullable=True),
        sa.Column('view_count', sa.Integer(), default=0, nullable=False),
        sa.Column('download_count', sa.Integer(), default=0, nullable=False),
        sa.Column('last_accessed', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_encrypted', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_sensitive', sa.Boolean(), default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    
    # Create indexes for documents table
    op.create_index('ix_documents_owner_id', 'documents', ['owner_id'])
    op.create_index('ix_documents_title', 'documents', ['title'])
    op.create_index('ix_documents_file_hash', 'documents', ['file_hash'])
    op.create_index('ix_documents_status', 'documents', ['status'])
    op.create_index('ix_documents_created_at', 'documents', ['created_at'])
    op.create_index('ix_documents_is_searchable', 'documents', ['is_searchable'])
    op.create_index('ix_documents_file_type', 'documents', ['file_type'])
    
    # Create compound indexes for common queries
    op.create_index('ix_documents_owner_status', 'documents', ['owner_id', 'status'])
    op.create_index('ix_documents_owner_searchable', 'documents', ['owner_id', 'is_searchable'])


def downgrade() -> None:
    """Drop users and documents tables."""
    
    # Drop indexes first
    op.drop_index('ix_documents_owner_searchable', table_name='documents')
    op.drop_index('ix_documents_owner_status', table_name='documents')
    op.drop_index('ix_documents_file_type', table_name='documents')
    op.drop_index('ix_documents_is_searchable', table_name='documents')
    op.drop_index('ix_documents_created_at', table_name='documents')
    op.drop_index('ix_documents_status', table_name='documents')
    op.drop_index('ix_documents_file_hash', table_name='documents')
    op.drop_index('ix_documents_title', table_name='documents')
    op.drop_index('ix_documents_owner_id', table_name='documents')
    
    op.drop_index('ix_users_created_at', table_name='users')
    op.drop_index('ix_users_is_active', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    
    # Drop tables
    op.drop_table('documents')
    op.drop_table('users')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS documentstatus")
    op.execute("DROP TYPE IF EXISTS documenttype")
