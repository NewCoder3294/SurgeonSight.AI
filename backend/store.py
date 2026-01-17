from typing import Dict, Any, Optional, List
from uuid import uuid4
from datetime import datetime

EXPERT_REFERENCE_ID_DEFAULT = "expert"
MAX_SESSIONS = 200

_expert_reference: Optional[Dict[str, Any]] = None
_sessions: Dict[str, Dict[str, Any]] = {}


def save_expert(reference: dict) -> None:
    """Save expert reference (overwrites existing)."""
    global _expert_reference
    _expert_reference = reference.copy()


def get_expert() -> Optional[Dict[str, Any]]:
    """Get expert reference."""
    return _expert_reference.copy() if _expert_reference else None


def clear_expert() -> None:
    """Clear expert reference."""
    global _expert_reference
    _expert_reference = None


def create_session(session: dict) -> str:
    """Create a new session and return session_id."""
    global _sessions
    
    session_id = uuid4().hex
    session_data = session.copy()
    session_data["session_id"] = session_id
    session_data["created_at"] = datetime.utcnow().isoformat()
    
    _sessions[session_id] = session_data
    
    if len(_sessions) > MAX_SESSIONS:
        sorted_sessions = sorted(
            _sessions.items(),
            key=lambda x: x[1].get("created_at", ""),
            reverse=True
        )
        _sessions = dict(sorted_sessions[:MAX_SESSIONS])
    
    return session_id


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Get session by ID."""
    session = _sessions.get(session_id)
    return session.copy() if session else None


def list_sessions() -> List[Dict[str, Any]]:
    """List all sessions sorted by created_at desc."""
    sorted_items = sorted(
        _sessions.items(),
        key=lambda x: x[1].get("created_at", ""),
        reverse=True
    )
    return [item[1].copy() for item in sorted_items]


def clear_sessions() -> None:
    """Clear all sessions."""
    global _sessions
    _sessions = {}
