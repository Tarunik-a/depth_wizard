from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.api.projects import router as projects_router
from app.sample_data.sample_generator import create_urban_demo_dataset
from app.storage.project_store import project_store

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Powered Single-View 3D Reconstruction & Elevation Analysis Backend API"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(projects_router, prefix=settings.API_PREFIX, tags=["Projects"])

# Mount static file directories for direct access
app.mount("/static", StaticFiles(directory=str(settings.STORAGE_DIR)), name="static")

@app.on_event("startup")
def startup_event():
    print(f"[{settings.PROJECT_NAME}] Starting server on {settings.HOST}:{settings.PORT}")
    # Ensure sample dataset exists
    if not project_store.get("demo-urban-terrain"):
        print("[Startup] Initializing built-in Urban Terrain Demo dataset...")
        try:
            create_urban_demo_dataset()
        except Exception as e:
            print(f"[Startup] Error generating sample dataset: {e}")

@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
        "endpoints": {
            "projects": f"{settings.API_PREFIX}/projects",
            "sample_dataset": f"{settings.API_PREFIX}/projects/demo-urban-terrain"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
