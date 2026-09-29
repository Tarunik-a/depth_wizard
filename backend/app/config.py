import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "DEPTHWIZARD"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent
    STORAGE_DIR: Path = BASE_DIR / "data"
    PROJECTS_DIR: Path = STORAGE_DIR / "projects"
    UPLOADS_DIR: Path = STORAGE_DIR / "uploads"
    SAMPLES_DIR: Path = STORAGE_DIR / "samples"
    
    # ML settings
    MODEL_NAME: str = "depth-anything/Depth-Anything-V2-Small-hf"
    USE_GPU: bool = True
    MAX_IMAGE_DIM: int = 1024
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
settings.SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
