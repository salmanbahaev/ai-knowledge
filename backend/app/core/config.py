"""Application configuration settings."""

import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # App Info
    APP_NAME: str = "AI Knowledge Graph Platform"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # CORS
    ALLOWED_HOSTS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    class Config:
        """Pydantic config."""
        env_file = ".env"


settings = Settings()
