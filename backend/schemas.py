from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class BaselineCreate(BaseModel):
    metrics: List[Dict[str, Any]] = Field(..., description="Baseline metrics")
    meta: Optional[Dict[str, Any]] = Field(None, description="Metadata")


class BaselineResponse(BaseModel):
    baseline_id: str
    metrics: List[Dict[str, Any]]
    meta: Optional[Dict[str, Any]] = None


class SessionCreate(BaseModel):
    metrics: Optional[List[Dict[str, Any]]] = Field(None, description="Session metrics")
    events: Optional[List[Dict[str, Any]]] = Field(None, description="Session events")
    score: Optional[float] = Field(None, description="Session score")


class SessionResponse(BaseModel):
    session_id: str
    created_at: str
    metrics: List[Dict[str, Any]]
    events: List[Dict[str, Any]]
    score: Optional[float] = None
