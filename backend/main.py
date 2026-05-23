"""
SMARTMINER - AI-Powered Data Mining & Predictive Analysis Platform
Main FastAPI application entry point.
"""
 
import os
from contextlib import asynccontextmanager
 
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
 
from routes.upload import router as upload_router
from routes.process import router as process_router
 
 
# ---------------------------------------------------------------------------
# Lifespan: runs once on startup and once on shutdown
# ---------------------------------------------------------------------------
 
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create required directories on startup; clean up on shutdown."""
    os.makedirs("temp_uploads", exist_ok=True)
    print("✅ SMARTMINER backend started — temp_uploads directory ready.")
    yield
    print("🛑 SMARTMINER backend shutting down.")
 
 
# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------
 
def create_app() -> FastAPI:
    app = FastAPI(
        title="SMARTMINER API",
        description=(
            "Semi-Automated Intelligent Data Analysis System — "
            "Provides data mining, ML, and deep learning analysis "
            "over uploaded CSV datasets."
        ),
        version="1.0.0",
        docs_url="/docs",        # Swagger UI
        redoc_url="/redoc",      # ReDoc UI
        lifespan=lifespan,
    )
 
    # -----------------------------------------------------------------------
    # CORS — allow the React dev server (and production origin) to call the API
    # -----------------------------------------------------------------------
    allowed_origins = [
        "http://localhost:3000",   # React dev server (CRA / Vite default)
        "http://localhost:5173",   # Vite alternative port
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]
 
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],       # GET, POST, OPTIONS, etc.
        allow_headers=["*"],       # Content-Type, Authorization, etc.
    )
 
    # Compress large JSON responses (analysis results can be several KB)
    app.add_middleware(GZipMiddleware, minimum_size=500)
 
    # -----------------------------------------------------------------------
    # Routers
    # -----------------------------------------------------------------------
    app.include_router(
        upload_router,
        prefix="/api",
        tags=["Upload"],
    )
    app.include_router(
        process_router,
        prefix="/api",
        tags=["Process"],
    )
 
    # -----------------------------------------------------------------------
    # Root health-check endpoint
    # -----------------------------------------------------------------------
    @app.get("/", tags=["Health"])
    async def root():
        return {"status": "ok", "message": "SMARTMINER API is running."}
 
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "healthy", "version": app.version}
 
    # -----------------------------------------------------------------------
    # Global exception handler — returns clean JSON instead of HTML 500 pages
    # -----------------------------------------------------------------------
    @app.exception_handler(Exception)
    async def global_exception_handler(request, exc):
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_server_error",
                "detail": str(exc),
            },
        )
 
    return app
 
 
# ---------------------------------------------------------------------------
# App instance (imported by Uvicorn)
# ---------------------------------------------------------------------------
app = create_app()
 
 
# ---------------------------------------------------------------------------
# Dev entry-point  →  python main.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
 
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,          # Auto-reload on file changes (dev only)
        log_level="info",
    )