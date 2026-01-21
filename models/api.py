"""
Models API - FastAPI router exposing ML models as REST endpoints

Provides API access to:
- Grip classification
- Surgical metrics calculation
- Feedback generation
- Coaching phrases
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal

from .surgical_metrics import (
    HandLandmark,
    compute_surgical_metrics,
    calculate_angle,
    calculate_distance,
    calculate_steadiness,
    calculate_speed,
)
from .grip_classifier import classify_grip, get_grip_description
from .feedback_generator import FeedbackGenerator, FeedbackStatus
from .coaching_phrases import (
    get_coaching_phrase,
    get_all_phrases,
    get_speed_feedback,
    get_steadiness_feedback,
    COACHING_PHRASES,
)
from .expert_baseline import (
    ExpertMetrics,
    compare_to_expert,
    generate_recommendation,
)

router = APIRouter(prefix="/models", tags=["models"])

# Create a shared feedback generator instance
_feedback_generator = FeedbackGenerator()


# ==========================================
# Request/Response Models
# ==========================================

class LandmarkInput(BaseModel):
    """Single hand landmark input."""
    x: float = Field(..., ge=0, le=1)
    y: float = Field(..., ge=0, le=1)
    z: float = Field(default=0)


class GripClassifyRequest(BaseModel):
    """Request to classify grip from landmarks."""
    landmarks: List[LandmarkInput] = Field(..., min_length=21, max_length=21)


class GripClassifyResponse(BaseModel):
    """Grip classification result."""
    type: Literal['pencil', 'power', 'unknown']
    confidence: float
    details: Dict[str, Any]
    description: str


class MetricsRequest(BaseModel):
    """Request to calculate surgical metrics."""
    landmarks: List[LandmarkInput] = Field(..., min_length=21, max_length=21)
    prev_landmarks: Optional[List[LandmarkInput]] = None
    fps: float = Field(default=15, ge=1, le=60)


class MetricsResponse(BaseModel):
    """Surgical metrics response."""
    scalpel_angle: float
    pinch_angle: float
    finger_bend: float
    steadiness: float
    speed: float
    grip_type: str
    grip_confidence: float


class FeedbackRequest(BaseModel):
    """Request for coaching feedback."""
    motion_mean: float = Field(..., ge=0)
    motion_max: float = Field(..., ge=0)
    jitter: float = Field(..., ge=0)
    presence_proxy: float = Field(default=0.5, ge=0, le=1)


class FeedbackResponse(BaseModel):
    """Feedback generation response."""
    status: Optional[str] = None
    text: Optional[str] = None
    timestamp: Optional[float] = None
    generated: bool


class ExpertCompareRequest(BaseModel):
    """Request to compare metrics against expert baseline."""
    current_angle: float
    current_steadiness: float = Field(..., ge=0, le=100)
    current_speed: float = Field(..., ge=0)
    current_grip: str = Field(default="unknown")
    expert_angle_target: float = Field(default=45)
    expert_angle_tolerance: float = Field(default=15)
    expert_steadiness_target: float = Field(default=70)
    expert_speed_optimal: float = Field(default=50)
    expert_grip_type: str = Field(default="pencil")


class ExpertCompareResponse(BaseModel):
    """Expert comparison result."""
    angle_diff: float
    angle_status: str
    steadiness_status: str
    speed_status: str
    grip_match: bool
    overall_score: float
    recommendations: List[str]
    primary_recommendation: str


# ==========================================
# Endpoints
# ==========================================

@router.post("/classify-grip", response_model=GripClassifyResponse)
async def classify_grip_endpoint(request: GripClassifyRequest):
    """
    Classify grip type from 21 hand landmarks.
    
    Returns grip type (pencil, power, unknown), confidence, and details.
    """
    # Convert to HandLandmark objects
    landmarks = [
        HandLandmark(x=lm.x, y=lm.y, z=lm.z)
        for lm in request.landmarks
    ]
    
    result = classify_grip(landmarks)
    description = get_grip_description(result["type"])
    
    return GripClassifyResponse(
        type=result["type"],
        confidence=result["confidence"],
        details=result["details"],
        description=description
    )


@router.post("/calculate-metrics", response_model=MetricsResponse)
async def calculate_metrics_endpoint(request: MetricsRequest):
    """
    Calculate surgical metrics from hand landmarks.
    
    Returns scalpel angle, pinch angle, finger bend, steadiness, speed, and grip info.
    """
    landmarks = [
        HandLandmark(x=lm.x, y=lm.y, z=lm.z)
        for lm in request.landmarks
    ]
    
    prev_landmarks = None
    if request.prev_landmarks:
        prev_landmarks = [
            HandLandmark(x=lm.x, y=lm.y, z=lm.z)
            for lm in request.prev_landmarks
        ]
    
    metrics = compute_surgical_metrics(
        landmarks=landmarks,
        prev_landmarks=prev_landmarks,
        fps=request.fps
    )
    
    return MetricsResponse(
        scalpel_angle=metrics.scalpel_angle,
        pinch_angle=metrics.pinch_angle,
        finger_bend=metrics.finger_bend,
        steadiness=metrics.steadiness,
        speed=metrics.speed,
        grip_type=metrics.grip_type,
        grip_confidence=metrics.grip_confidence
    )


@router.post("/generate-feedback", response_model=FeedbackResponse)
async def generate_feedback_endpoint(request: FeedbackRequest):
    """
    Generate coaching feedback based on motion metrics.
    
    Returns feedback with status, text, and timestamp.
    May return generated=false if throttled or duplicate.
    """
    feedback = _feedback_generator.generate(
        motion_mean=request.motion_mean,
        motion_max=request.motion_max,
        jitter=request.jitter,
        presence_proxy=request.presence_proxy
    )
    
    if feedback:
        return FeedbackResponse(
            status=feedback.status.value,
            text=feedback.text,
            timestamp=feedback.timestamp,
            generated=True
        )
    
    return FeedbackResponse(generated=False)


@router.post("/reset-feedback")
async def reset_feedback_endpoint():
    """Reset the feedback generator state."""
    _feedback_generator.reset()
    return {"status": "reset"}


@router.get("/coaching-phrases/{category}")
async def get_phrases_endpoint(category: str):
    """
    Get all coaching phrases for a category.
    
    Categories: speed_too_fast, speed_too_slow, speed_steady,
                hand_stable, hand_unstable, hand_positioning,
                hand_positioning_bad, hand_movement, hand_movement_bad,
                encouragement
    """
    if category not in COACHING_PHRASES:
        raise HTTPException(
            status_code=404,
            detail=f"Category '{category}' not found. Available: {list(COACHING_PHRASES.keys())}"
        )
    
    return {
        "category": category,
        "phrases": COACHING_PHRASES[category],
        "count": len(COACHING_PHRASES[category])
    }


@router.get("/coaching-phrases")
async def list_categories_endpoint():
    """List all available coaching phrase categories."""
    return {
        "categories": list(COACHING_PHRASES.keys()),
        "total_phrases": sum(len(p) for p in COACHING_PHRASES.values())
    }


@router.post("/compare-expert", response_model=ExpertCompareResponse)
async def compare_expert_endpoint(request: ExpertCompareRequest):
    """
    Compare trainee metrics against expert baseline.
    
    Returns comparison result with score and recommendations.
    """
    expert = ExpertMetrics(
        angle_target=request.expert_angle_target,
        angle_tolerance=request.expert_angle_tolerance,
        steadiness_target=request.expert_steadiness_target,
        speed_optimal=request.expert_speed_optimal,
        expected_grip_type=request.expert_grip_type
    )
    
    result = compare_to_expert(
        current_angle=request.current_angle,
        current_steadiness=request.current_steadiness,
        current_speed=request.current_speed,
        current_grip=request.current_grip,
        expert=expert
    )
    
    return ExpertCompareResponse(
        angle_diff=result.angle_diff,
        angle_status=result.angle_status,
        steadiness_status=result.steadiness_status,
        speed_status=result.speed_status,
        grip_match=result.grip_match,
        overall_score=result.overall_score,
        recommendations=result.recommendations,
        primary_recommendation=generate_recommendation(result)
    )


@router.get("/health")
async def models_health():
    """Check models API health."""
    return {
        "status": "healthy",
        "modules": [
            "surgical_metrics",
            "grip_classifier",
            "motion_metrics",
            "feedback_generator",
            "coaching_phrases",
            "expert_baseline"
        ]
    }
