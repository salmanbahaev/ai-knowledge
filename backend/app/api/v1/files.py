"""File upload and management API endpoints."""

import logging
from typing import List
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse

from app.services.file_validation import validate_file_upload, FileValidationError
from app.models.common import BaseResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload", response_model=BaseResponse)
async def upload_files(
    files: List[UploadFile] = File(..., description="Files to upload")
):
    """
    Upload and validate multiple files.
    
    Security features:
    - File type validation
    - Size limits enforcement
    - Malware pattern detection
    - Filename sanitization
    - Content sniffing protection
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    if len(files) > 10:  # Max 10 files per request
        raise HTTPException(status_code=400, detail="Too many files (max 10 per request)")
    
    validated_files = []
    total_size = 0
    
    for file in files:
        try:
            # Validate each file
            validation_result = await validate_file_upload(file)
            validated_files.append(validation_result)
            total_size += validation_result["size"]
            
            logger.info(f"File validated: {file.filename} ({validation_result['size']} bytes)")
            
        except Exception as e:
            logger.error(f"File validation failed for {file.filename}: {e}")
            raise
    
    # Check total upload size
    max_total_size = 50 * 1024 * 1024  # 50MB total
    if total_size > max_total_size:
        raise HTTPException(
            status_code=400, 
            detail=f"Total upload size too large: {total_size / (1024*1024):.1f}MB (max: 50MB)"
        )
    
    return BaseResponse(
        message=f"Successfully validated {len(validated_files)} files",
        data={
            "files": validated_files,
            "total_size": total_size,
            "total_files": len(validated_files)
        }
    )


@router.post("/validate", response_model=BaseResponse)
async def validate_files_only(
    files: List[UploadFile] = File(..., description="Files to validate")
):
    """
    Validate files without storing them.
    
    Useful for pre-upload validation on frontend.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    validation_results = []
    
    for file in files:
        try:
            result = await validate_file_upload(file)
            validation_results.append({
                "filename": result["filename"],
                "size": result["size"],
                "mime_type": result["mime_type"],
                "is_safe": result["is_safe"],
                "status": "valid"
            })
        except FileValidationError as e:
            validation_results.append({
                "filename": file.filename or "unknown",
                "status": "invalid",
                "error": str(e)
            })
        except Exception as e:
            logger.error(f"Unexpected validation error for {file.filename}: {e}")
            validation_results.append({
                "filename": file.filename or "unknown", 
                "status": "error",
                "error": "Internal validation error"
            })
    
    valid_count = sum(1 for r in validation_results if r["status"] == "valid")
    
    return BaseResponse(
        message=f"Validation complete: {valid_count}/{len(validation_results)} files valid",
        data={
            "results": validation_results,
            "summary": {
                "total": len(validation_results),
                "valid": valid_count,
                "invalid": len(validation_results) - valid_count
            }
        }
    )


@router.get("/allowed-types")
async def get_allowed_file_types():
    """Get list of allowed file types and size limits."""
    from app.core.config import settings
    
    return BaseResponse(
        message="File upload configuration",
        data={
            "allowed_mime_types": settings.ALLOWED_FILE_TYPES,
            "max_file_size": settings.MAX_FILE_SIZE,
            "max_file_size_mb": settings.MAX_FILE_SIZE / (1024 * 1024),
            "max_files_per_user": settings.MAX_FILES_PER_USER,
            "allowed_extensions": [
                ".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".csv", ".json"
            ]
        }
    )


@router.post("/check-security")
async def security_check_file(
    file: UploadFile = File(..., description="File to security check")
):
    """
    Perform enhanced security check on a single file.
    
    Returns detailed security analysis.
    """
    try:
        from app.services.file_validation import file_validator
        
        # Read file content
        content = await file.read()
        await file.seek(0)
        
        # Perform security analysis
        validation_result = await validate_file_upload(file)
        
        # Additional security checks
        security_info = {
            "filename_safe": file_validator.get_safe_filename(file.filename or "unknown"),
            "content_analysis": {
                "size": len(content),
                "has_null_bytes": b'\x00' in content,
                "null_byte_percentage": (content.count(b'\x00') / len(content) * 100) if content else 0,
                "line_count": len(content.split(b'\n')) if content else 0,
                "max_line_length": max(len(line) for line in content.split(b'\n')) if content else 0
            },
            "risk_assessment": "low"  # Could be enhanced with ML models
        }
        
        return BaseResponse(
            message="Security check completed",
            data={
                "validation": validation_result,
                "security": security_info
            }
        )
        
    except Exception as e:
        logger.error(f"Security check failed for {file.filename}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
