from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from uuid import uuid4

from schemas import SessionCreate, SessionResponse
from store import SESSIONS

router = APIRouter()


@router.post("/session", response_model=SessionResponse, status_code=201)
async def create_session(session: SessionCreate):
    """Append a session report."""
    session_id = uuid4().hex
    session_data = SessionResponse(
        session_id=session_id,
        created_at=datetime.utcnow().isoformat(),
        metrics=session.metrics,
        events=session.events or [],
        score=session.score,
    )
    SESSIONS[session_id] = session_data.model_dump()
    return session_data


@router.get("/session/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str):
    """Get session by ID."""
    if session_id not in SESSIONS:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(**SESSIONS[session_id])


@router.get("/sessions", response_model=List[SessionResponse])
async def list_sessions():
    """List all sessions."""
    return [SessionResponse(**session) for session in SESSIONS.values()]
