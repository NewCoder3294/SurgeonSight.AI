import sys
import os
from pathlib import Path

# Add parent directory to path so we can import from sibling 'models' folder
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from baseline import router as baseline_router
from session import router as session_router
from summary import router as summary_router
from models.api import router as models_router
from store import BASELINE, SESSIONS

# Environment configuration
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "").split(",") if os.getenv("ALLOWED_ORIGINS") else []

# Default origins for development
DEFAULT_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Combine with production origins from environment
cors_origins = DEFAULT_ORIGINS + [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

# In production, you might want to be more restrictive
if ENVIRONMENT == "production" and ALLOWED_ORIGINS:
    cors_origins = [origin.strip() for origin in ALLOWED_ORIGINS if origin.strip()]

app = FastAPI(
    title="SurgeonSight API",
    version="1.0.0",
    docs_url="/docs" if ENVIRONMENT != "production" else None,  # Disable docs in production
    redoc_url="/redoc" if ENVIRONMENT != "production" else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(baseline_router)
app.include_router(session_router)
app.include_router(summary_router)
app.include_router(models_router)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "environment": ENVIRONMENT,
        "baselines": len(BASELINE),
        "sessions": len(SESSIONS)
    }


# LiveKit configuration
LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY", "")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET", "")
LIVEKIT_URL = os.getenv("LIVEKIT_URL", "")


@app.get("/api/livekit-token")
async def get_livekit_token(room: str = "surgeonsight-coaching", identity: str = "user"):
    """Generate a LiveKit access token for the client to join a room."""
    if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
        return {
            "error": "LiveKit credentials not configured",
            "message": "Please add LIVEKIT_API_KEY and LIVEKIT_API_SECRET to backend/.env"
        }
    
    try:
        from livekit import api
        
        token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET) \
            .with_identity(identity) \
            .with_name(f"User-{identity}") \
            .with_grants(api.VideoGrants(
                room_join=True,
                room=room,
            ))
        
        return {
            "token": token.to_jwt(),
            "url": LIVEKIT_URL,
            "room": room,
            "identity": identity
        }
    except ImportError:
        return {
            "error": "livekit-api package not installed",
            "message": "Run: pip install livekit-api"
        }
    except Exception as e:
        return {
            "error": str(e),
            "message": "Failed to generate LiveKit token"
        }

