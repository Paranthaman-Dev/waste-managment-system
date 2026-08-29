"""Application configuration using pydantic BaseSettings.
Loads environment variables from a .env file if present.
"""

from pydantic_settings import BaseSettings
from pydantic import Field

from pathlib import Path

class Settings(BaseSettings):
    # Core settings
    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    JWT_SECRET_KEY: str = Field(..., env="JWT_SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # Cookie names for auth (optional, can be overridden)
    ACCESS_COOKIE_NAME: str = "access_token"
    REFRESH_COOKIE_NAME: str = "refresh_token"
    # Optional upload directory
    UPLOAD_DIR: str = "uploads"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Export a singleton instance that can be imported throughout the project
settings = Settings()
