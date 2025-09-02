"""Secure document storage service with encryption and access control."""

import hashlib
import logging
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import BinaryIO, Optional, Tuple
from uuid import uuid4

from cryptography.fernet import Fernet
from fastapi import UploadFile

from app.core.config import settings

logger = logging.getLogger(__name__)


class DocumentStorageError(Exception):
    """Custom exception for document storage errors."""
    pass


class SecureDocumentStorage:
    """
    Enterprise-grade secure document storage with encryption.
    
    Features:
    - File encryption at rest
    - Secure file naming
    - Directory structure organization
    - Access control integration
    - File integrity verification
    """
    
    def __init__(self):
        self.storage_root = Path(settings.STORAGE_ROOT).resolve()
        
        # Ensure storage directories exist first
        self._initialize_storage_directories()
        
        # Then initialize encryption
        self.encryption_key = self._get_or_create_encryption_key()
        self.cipher_suite = Fernet(self.encryption_key)
    
    def _get_or_create_encryption_key(self) -> bytes:
        """Get or create encryption key for file encryption."""
        key_file = self.storage_root / ".encryption_key"
        
        if key_file.exists():
            with open(key_file, "rb") as f:
                return f.read()
        else:
            # Generate new key
            key = Fernet.generate_key()
            
            # Ensure storage root exists
            self.storage_root.mkdir(parents=True, exist_ok=True)
            
            # Save key securely
            with open(key_file, "wb") as f:
                f.write(key)
            
            # Set restrictive permissions (Unix-like systems)
            if hasattr(os, 'chmod'):
                os.chmod(key_file, 0o600)
            
            logger.info("Generated new encryption key for document storage")
            return key
    
    def _initialize_storage_directories(self) -> None:
        """Initialize storage directory structure."""
        directories = [
            self.storage_root,
            self.storage_root / "documents",
            self.storage_root / "temp",
            self.storage_root / "previews",
            self.storage_root / "chunks",
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Initialized storage directories at {self.storage_root}")
    
    def _generate_secure_filename(self, user_id: str, original_filename: str) -> str:
        """Generate secure filename to prevent path traversal attacks."""
        # Generate unique ID
        file_id = str(uuid4())
        
        # Get file extension safely
        extension = Path(original_filename).suffix.lower()
        if len(extension) > 10:  # Prevent extremely long extensions
            extension = extension[:10]
        
        # Create secure filename: user_id/year/month/uuid.ext
        now = datetime.utcnow()
        secure_path = f"{user_id[:8]}/{now.year}/{now.month:02d}/{file_id}{extension}"
        
        return secure_path
    
    def _get_storage_path(self, relative_path: str) -> Path:
        """Get full storage path from relative path."""
        return self.storage_root / "documents" / relative_path
    
    async def store_file(
        self, 
        file: UploadFile, 
        user_id: str, 
        encrypt: bool = True
    ) -> Tuple[str, str, int]:
        """
        Store file securely with optional encryption.
        
        Args:
            file: Uploaded file
            user_id: Owner user ID
            encrypt: Whether to encrypt file content
            
        Returns:
            Tuple of (storage_path, file_hash, file_size)
            
        Raises:
            DocumentStorageError: If storage fails
        """
        if not file or not file.filename:
            raise DocumentStorageError("No file provided")
        
        try:
            # Generate secure storage path
            relative_path = self._generate_secure_filename(user_id, file.filename)
            storage_path = self._get_storage_path(relative_path)
            
            # Ensure directory exists
            storage_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Read file content
            content = await file.read()
            await file.seek(0)  # Reset file pointer
            
            # Calculate hash before encryption
            file_hash = hashlib.sha256(content).hexdigest()
            original_size = len(content)
            
            # Encrypt content if requested
            if encrypt:
                content = self.cipher_suite.encrypt(content)
                logger.debug(f"File encrypted: {file.filename}")
            
            # Write to storage
            with open(storage_path, "wb") as f:
                f.write(content)
            
            # Set restrictive permissions
            if hasattr(os, 'chmod'):
                os.chmod(storage_path, 0o600)
            
            logger.info(f"File stored: {file.filename} -> {relative_path}")
            
            return relative_path, file_hash, original_size
            
        except Exception as e:
            logger.error(f"Failed to store file {file.filename}: {e}")
            raise DocumentStorageError(f"Storage failed: {str(e)}")
    
    def retrieve_file(self, storage_path: str, user_id: str, decrypt: bool = True) -> bytes:
        """
        Retrieve file content with decryption.
        
        Args:
            storage_path: Relative storage path
            user_id: Requesting user ID (for access control)
            decrypt: Whether to decrypt content
            
        Returns:
            File content bytes
            
        Raises:
            DocumentStorageError: If retrieval fails
        """
        try:
            full_path = self._get_storage_path(storage_path)
            
            # Check if file exists
            if not full_path.exists():
                raise DocumentStorageError(f"File not found: {storage_path}")
            
            # Basic access control - check if user owns the file
            # (This is basic - in production, you'd check database permissions)
            if not storage_path.startswith(user_id[:8]):
                raise DocumentStorageError("Access denied")
            
            # Read file content
            with open(full_path, "rb") as f:
                content = f.read()
            
            # Decrypt if needed
            if decrypt:
                try:
                    content = self.cipher_suite.decrypt(content)
                except Exception:
                    # If decryption fails, assume file is not encrypted
                    logger.warning(f"Failed to decrypt file {storage_path}, returning raw content")
            
            return content
            
        except DocumentStorageError:
            raise
        except Exception as e:
            logger.error(f"Failed to retrieve file {storage_path}: {e}")
            raise DocumentStorageError(f"Retrieval failed: {str(e)}")
    
    def delete_file(self, storage_path: str, user_id: str) -> bool:
        """
        Delete file from storage.
        
        Args:
            storage_path: Relative storage path
            user_id: Requesting user ID (for access control)
            
        Returns:
            True if successful
            
        Raises:
            DocumentStorageError: If deletion fails
        """
        try:
            full_path = self._get_storage_path(storage_path)
            
            # Check access control
            if not storage_path.startswith(user_id[:8]):
                raise DocumentStorageError("Access denied")
            
            # Delete file
            if full_path.exists():
                full_path.unlink()
                logger.info(f"File deleted: {storage_path}")
                
                # Clean up empty directories
                self._cleanup_empty_directories(full_path.parent)
                
                return True
            else:
                logger.warning(f"File not found for deletion: {storage_path}")
                return False
                
        except DocumentStorageError:
            raise
        except Exception as e:
            logger.error(f"Failed to delete file {storage_path}: {e}")
            raise DocumentStorageError(f"Deletion failed: {str(e)}")
    
    def _cleanup_empty_directories(self, directory: Path) -> None:
        """Clean up empty directories up to storage root."""
        try:
            # Only clean up if directory is empty and within our storage area
            if (directory.exists() and 
                not any(directory.iterdir()) and 
                self.storage_root in directory.parents):
                directory.rmdir()
                logger.debug(f"Cleaned up empty directory: {directory}")
                
                # Recursively clean parent directories
                self._cleanup_empty_directories(directory.parent)
        except Exception as e:
            logger.debug(f"Could not clean up directory {directory}: {e}")
    
    def verify_file_integrity(self, storage_path: str, expected_hash: str, user_id: str) -> bool:
        """
        Verify file integrity using hash comparison.
        
        Args:
            storage_path: Relative storage path
            expected_hash: Expected SHA-256 hash
            user_id: Requesting user ID
            
        Returns:
            True if file integrity is verified
        """
        try:
            content = self.retrieve_file(storage_path, user_id, decrypt=True)
            actual_hash = hashlib.sha256(content).hexdigest()
            
            is_valid = actual_hash == expected_hash
            if not is_valid:
                logger.warning(f"File integrity check failed for {storage_path}")
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Integrity verification failed for {storage_path}: {e}")
            return False
    
    def get_file_info(self, storage_path: str) -> dict:
        """
        Get file information without reading content.
        
        Args:
            storage_path: Relative storage path
            
        Returns:
            Dictionary with file information
        """
        try:
            full_path = self._get_storage_path(storage_path)
            
            if not full_path.exists():
                raise DocumentStorageError(f"File not found: {storage_path}")
            
            stat = full_path.stat()
            
            return {
                "exists": True,
                "size_on_disk": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime),
                "created": datetime.fromtimestamp(stat.st_ctime),
                "storage_path": str(full_path),
            }
            
        except Exception as e:
            logger.error(f"Failed to get file info for {storage_path}: {e}")
            return {"exists": False, "error": str(e)}
    
    def get_storage_stats(self) -> dict:
        """Get storage usage statistics."""
        try:
            total_size = 0
            file_count = 0
            
            documents_path = self.storage_root / "documents"
            if documents_path.exists():
                for file_path in documents_path.rglob("*"):
                    if file_path.is_file():
                        total_size += file_path.stat().st_size
                        file_count += 1
            
            return {
                "total_size_bytes": total_size,
                "total_size_human": self._format_size(total_size),
                "file_count": file_count,
                "storage_root": str(self.storage_root),
            }
            
        except Exception as e:
            logger.error(f"Failed to get storage stats: {e}")
            return {"error": str(e)}
    
    def _format_size(self, size_bytes: int) -> str:
        """Format size in human-readable format."""
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} PB"


# Global storage instance
document_storage = SecureDocumentStorage()


# Convenience functions
async def store_document(file: UploadFile, user_id: str, encrypt: bool = True) -> Tuple[str, str, int]:
    """Store document securely."""
    return await document_storage.store_file(file, user_id, encrypt)


def retrieve_document(storage_path: str, user_id: str) -> bytes:
    """Retrieve document content."""
    return document_storage.retrieve_file(storage_path, user_id)


def delete_document(storage_path: str, user_id: str) -> bool:
    """Delete document from storage."""
    return document_storage.delete_file(storage_path, user_id)
