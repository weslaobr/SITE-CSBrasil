import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Config
    APP_NAME: str = "TropaCS Tracker"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Steam API
    STEAM_API_KEY: str
    
    # Storage
    DEMO_PATH: str = "./demos"
    
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

settings = Settings()

# Ensure demo directory exists
if not os.path.exists(settings.DEMO_PATH):
    os.makedirs(settings.DEMO_PATH)
