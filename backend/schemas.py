from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class MetricFrame(BaseModel):
    t: float = Field(..., description="Timestamp")
    angle: float = Field(..., description="Angle measurement")
    speed: float = Field(..., description="Speed measurement")
    jitter: float = Field(..., description="Jitter measurement")
    height: float = Field(..., description="Height measurement")
    grip: float = Field(..., description="Grip measurement")


class Event(BaseModel):
    t: float = Field(..., description="Event timestamp")
    type: str = Field(..., description="Event type")
    detail: Optional[str] = Field(None, description="Event detail")


class BaselineCreate(BaseModel):
    baseline_id: str = Field(default="default", description="Baseline identifier")
    metrics: List[MetricFrame] = Field(..., description="Baseline metrics")
    meta: Optional[Dict[str, Any]] = Field(None, description="Metadata")


class BaselineResponse(BaseModel):
    baseline_id: str = Field(..., description="Baseline identifier")
    metrics: List[MetricFrame] = Field(..., description="Baseline metrics")
    meta: Optional[Dict[str, Any]] = Field(None, description="Metadata")


class SessionCreate(BaseModel):
    metrics: List[MetricFrame] = Field(..., description="Session metrics")
    events: Optional[List[Event]] = Field(None, description="Session events")
    score: Optional[float] = Field(None, description="Session score")


class SessionResponse(BaseModel):
    session_id: str = Field(..., description="Session identifier")
    created_at: str = Field(..., description="ISO timestamp string")
    metrics: List[MetricFrame] = Field(..., description="Session metrics")
    events: List[Event] = Field(..., description="Session events")
    score: Optional[float] = Field(None, description="Session score")
