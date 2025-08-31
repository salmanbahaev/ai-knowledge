"""Application configuration settings."""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with production-ready database and security config."""
    
    # App Info
    APP_NAME: str = "AI Knowledge Graph Platform"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # CORS
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # Database Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_knowledge"
    )
    DB_ECHO: bool = os.getenv("DB_ECHO", "false").lower() == "true"
    DB_POOL_SIZE: int = int(os.getenv("DB_POOL_SIZE", "10"))
    DB_MAX_OVERFLOW: int = int(os.getenv("DB_MAX_OVERFLOW", "20"))
    DB_POOL_TIMEOUT: int = int(os.getenv("DB_POOL_TIMEOUT", "30"))
    DB_POOL_RECYCLE: int = int(os.getenv("DB_POOL_RECYCLE", "3600"))
    
    # Redis Configuration
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    REDIS_CACHE_TTL: int = int(os.getenv("REDIS_CACHE_TTL", "3600"))  # 1 hour
    REDIS_SESSION_TTL: int = int(os.getenv("REDIS_SESSION_TTL", "86400"))  # 24 hours
    
    # Security Configuration
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-super-secret-key-change-in-production")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "jwt-super-secret-key-change-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # File Upload Security
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
    MAX_FILES_PER_USER: int = int(os.getenv("MAX_FILES_PER_USER", "1000"))
    ALLOWED_FILE_TYPES: List[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
        "application/json"
    ]
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "100"))
    RATE_LIMIT_BURST: int = int(os.getenv("RATE_LIMIT_BURST", "200"))
    
    # Monitoring
    ENABLE_METRICS: bool = os.getenv("ENABLE_METRICS", "true").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    class Config:
        """Pydantic config."""
        env_file = ".env"
        case_sensitive = True


settings = Settings()
