from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from baseline import router as baseline_router
from session import router as session_router
from summary import router as summary_router
from store import BASELINE, SESSIONS

app = FastAPI(title="SurgeonSight API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(baseline_router)
app.include_router(session_router)
app.include_router(summary_router)


@app.get("/health")
async def health():
    return {"status": "healthy", "baselines": len(BASELINE), "sessions": len(SESSIONS)}


# LiveKit token endpoint
import os
from dotenv import load_dotenv

load_dotenv()

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

