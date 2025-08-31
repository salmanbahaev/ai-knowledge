"""File validation and security services."""

import hashlib
import logging
import mimetypes
import os
from typing import Optional, Tuple, List
from pathlib import Path

import filetype
from fastapi import UploadFile, HTTPException

from app.core.config import settings

logger = logging.getLogger(__name__)


class FileValidationError(Exception):
    """Custom exception for file validation errors."""
    pass


class SecurityFileValidator:
    """
    Enterprise-grade file validation with security-first approach.
    
    Features:
    - File type validation
    - Size limits
    - Malware-like pattern detection
    - Content sniffing protection
    - File extension validation
    """
    
    def __init__(self):
        self.allowed_mime_types = set(settings.ALLOWED_FILE_TYPES)
        self.max_file_size = settings.MAX_FILE_SIZE
        
        # Dangerous file extensions that should never be allowed
        self.dangerous_extensions = {
            '.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.vbe',
            '.js', '.jar', '.jsp', '.php', '.asp', '.aspx', '.ps1', '.ps2',
            '.msi', '.msp', '.mst', '.dll', '.cpl', '.inf', '.reg', '.sys'
        }
        
        # Suspicious patterns in file content (basic malware detection)
        self.suspicious_patterns = [
            b'eval(',
            b'exec(',
            b'<script',
            b'javascript:',
            b'vbscript:',
            b'data:text/html',
            b'</script>',
            b'<iframe',
            b'<object',
            b'<embed',
        ]
    
    async def validate_upload_file(self, file: UploadFile) -> dict:
        """
        Comprehensive validation of uploaded file.
        
        Args:
            file: FastAPI UploadFile instance
            
        Returns:
            dict: Validation result with file metadata
            
        Raises:
            FileValidationError: If file fails validation
        """
        if not file:
            raise FileValidationError("No file provided")
        
        if not file.filename:
            raise FileValidationError("File must have a filename")
        
        # Read file content for analysis
        content = await file.read()
        await file.seek(0)  # Reset file pointer
        
        # Validate file size
        file_size = len(content)
        self._validate_file_size(file_size)
        
        # Validate filename and extension
        self._validate_filename(file.filename)
        
        # Detect actual file type
        detected_type = self._detect_file_type(content, file.filename)
        
        # Validate MIME type
        self._validate_mime_type(detected_type)
        
        # Scan for suspicious content
        self._scan_suspicious_content(content, file.filename)
        
        # Generate file hash
        file_hash = self._generate_file_hash(content)
        
        logger.info(f"File validation passed: {file.filename} ({detected_type})")
        
        return {
            "filename": file.filename,
            "size": file_size,
            "mime_type": detected_type,
            "hash": file_hash,
            "is_safe": True
        }
    
    def _validate_file_size(self, size: int) -> None:
        """Validate file size against limits."""
        if size == 0:
            raise FileValidationError("File is empty")
        
        if size > self.max_file_size:
            size_mb = size / (1024 * 1024)
            limit_mb = self.max_file_size / (1024 * 1024)
            raise FileValidationError(
                f"File too large: {size_mb:.1f}MB (max: {limit_mb:.1f}MB)"
            )
    
    def _validate_filename(self, filename: str) -> None:
        """Validate filename for security issues."""
        # Check for dangerous characters
        dangerous_chars = ['..', '/', '\\', ':', '*', '?', '"', '<', '>', '|', '\0']
        for char in dangerous_chars:
            if char in filename:
                raise FileValidationError(f"Filename contains dangerous character: {char}")
        
        # Check for extremely long filenames
        if len(filename) > 255:
            raise FileValidationError("Filename too long (max 255 characters)")
        
        # Check extension
        extension = Path(filename).suffix.lower()
        if extension in self.dangerous_extensions:
            raise FileValidationError(f"File type not allowed: {extension}")
        
        # Check for double extensions (e.g., file.txt.exe)
        parts = filename.split('.')
        if len(parts) > 2:
            for i in range(1, len(parts)):
                ext = '.' + parts[i].lower()
                if ext in self.dangerous_extensions:
                    raise FileValidationError(f"Suspicious double extension detected: {ext}")
    
    def _detect_file_type(self, content: bytes, filename: str) -> str:
        """
        Detect actual file type using multiple methods.
        
        This prevents content-type spoofing attacks.
        """
        # First, try to detect by file signature (magic bytes)
        file_type = filetype.guess(content)
        if file_type:
            detected_mime = file_type.mime
        else:
            # Fallback to filename-based detection
            detected_mime, _ = mimetypes.guess_type(filename)
            
        if not detected_mime:
            # If we can't detect the type, be conservative
            detected_mime = "application/octet-stream"
        
        return detected_mime
    
    def _validate_mime_type(self, mime_type: str) -> None:
        """Validate MIME type against allowed list."""
        if mime_type not in self.allowed_mime_types:
            raise FileValidationError(f"File type not allowed: {mime_type}")
    
    def _scan_suspicious_content(self, content: bytes, filename: str) -> None:
        """
        Basic malware/suspicious content detection.
        
        This is not a replacement for proper antivirus, but catches
        basic script injection attempts.
        """
        # Convert to lowercase for case-insensitive matching
        content_lower = content.lower()
        
        # Check for suspicious patterns
        for pattern in self.suspicious_patterns:
            if pattern in content_lower:
                logger.warning(f"Suspicious pattern detected in {filename}: {pattern}")
                raise FileValidationError("File contains suspicious content")
        
        # Check for excessive null bytes (potential binary exploitation)
        null_count = content.count(b'\x00')
        if null_count > len(content) * 0.3:  # More than 30% null bytes
            raise FileValidationError("File contains excessive null bytes")
        
        # Check for extremely long lines (potential buffer overflow attempt)
        lines = content.split(b'\n')
        for line in lines[:100]:  # Check first 100 lines
            if len(line) > 10000:  # 10KB per line is suspicious
                raise FileValidationError("File contains suspiciously long lines")
    
    def _generate_file_hash(self, content: bytes) -> str:
        """Generate SHA-256 hash of file content."""
        return hashlib.sha256(content).hexdigest()
    
    def get_safe_filename(self, filename: str) -> str:
        """
        Generate a safe filename by removing dangerous characters.
        
        Args:
            filename: Original filename
            
        Returns:
            str: Sanitized filename
        """
        # Keep only alphanumeric, dots, hyphens, underscores
        safe_chars = []
        for char in filename:
            if char.isalnum() or char in '.-_ ':
                safe_chars.append(char)
            else:
                safe_chars.append('_')
        
        safe_filename = ''.join(safe_chars)
        
        # Remove multiple consecutive dots or spaces
        while '..' in safe_filename:
            safe_filename = safe_filename.replace('..', '.')
        while '  ' in safe_filename:
            safe_filename = safe_filename.replace('  ', ' ')
        
        # Ensure filename is not empty
        if not safe_filename.strip():
            safe_filename = "unknown_file"
        
        return safe_filename.strip()


# Global validator instance
file_validator = SecurityFileValidator()


# Convenience functions for FastAPI dependencies
async def validate_file_upload(file: UploadFile) -> dict:
    """
    FastAPI dependency for file upload validation.
    
    Args:
        file: Uploaded file
        
    Returns:
        dict: File validation result
        
    Raises:
        HTTPException: If validation fails
    """
    try:
        return await file_validator.validate_upload_file(file)
    except FileValidationError as e:
        logger.warning(f"File validation failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error during file validation: {e}")
        raise HTTPException(
            status_code=500, 
            detail="File validation failed due to internal error"
        )


def get_file_info(content: bytes, filename: str) -> dict:
    """
    Get file information without full validation.
    
    Useful for analyzing existing files.
    """
    validator = SecurityFileValidator()
    
    return {
        "filename": filename,
        "size": len(content),
        "mime_type": validator._detect_file_type(content, filename),
        "hash": validator._generate_file_hash(content),
        "safe_filename": validator.get_safe_filename(filename)
    }
