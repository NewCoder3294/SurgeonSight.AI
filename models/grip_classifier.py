"""
Grip Classifier - Analyzes hand landmarks to determine grip type

Ported from TypeScript (gripClassifier.ts)
Classifies surgical instrument grip as pencil, power, or unknown.
"""

import math
from typing import List, TypedDict, Literal, Any

# Try to import from surgical_metrics, fallback to inline if circular
try:
    from .surgical_metrics import HandLandmark, calculate_distance
except ImportError:
    from dataclasses import dataclass
    
    @dataclass
    class HandLandmark:
        x: float
        y: float
        z: float
    
    def calculate_distance(p1: HandLandmark, p2: HandLandmark) -> float:
        return math.sqrt(
            (p2.x - p1.x) ** 2 +
            (p2.y - p1.y) ** 2 +
            (p2.z - p1.z) ** 2
        )


class GripResult(TypedDict):
    """Result of grip classification."""
    type: Literal['pencil', 'power', 'unknown']
    confidence: float
    details: dict


# MediaPipe landmark indices
WRIST = 0
THUMB_TIP = 4
INDEX_MCP = 5
INDEX_TIP = 8
MIDDLE_TIP = 12
RING_TIP = 16
PINKY_MCP = 17
PINKY_TIP = 20


def _calculate_angle_3points(p1: Any, p2: Any, p3: Any) -> float:
    """Calculate angle between three points (vertex at p2)."""
    v1 = {"x": p1.x - p2.x, "y": p1.y - p2.y, "z": getattr(p1, 'z', 0) - getattr(p2, 'z', 0)}
    v2 = {"x": p3.x - p2.x, "y": p3.y - p2.y, "z": getattr(p3, 'z', 0) - getattr(p2, 'z', 0)}
    
    dot = v1["x"] * v2["x"] + v1["y"] * v2["y"] + v1["z"] * v2["z"]
    mag1 = math.sqrt(v1["x"] ** 2 + v1["y"] ** 2 + v1["z"] ** 2)
    mag2 = math.sqrt(v2["x"] ** 2 + v2["y"] ** 2 + v2["z"] ** 2)
    
    if mag1 == 0 or mag2 == 0:
        return 0
    
    cos_angle = max(-1, min(1, dot / (mag1 * mag2)))
    return math.degrees(math.acos(cos_angle))


def classify_grip(landmarks: List[HandLandmark]) -> GripResult:
    """
    Classify grip type based on hand landmarks.
    
    Args:
        landmarks: 21 hand landmarks from MediaPipe
    
    Returns:
        GripResult with type, confidence, and details
    
    Grip Types:
        - pencil: Thumb and index close, other fingers curled (surgical precision grip)
        - power: All fingers grouped, thumb wrapped (force grip)
        - unknown: Cannot determine grip type
    """
    if not landmarks or len(landmarks) < 21:
        return {"type": "unknown", "confidence": 0, "details": {}}
    
    # Key landmarks
    wrist = landmarks[WRIST]
    thumb_tip = landmarks[THUMB_TIP]
    index_tip = landmarks[INDEX_TIP]
    index_mcp = landmarks[INDEX_MCP]
    middle_tip = landmarks[MIDDLE_TIP]
    ring_tip = landmarks[RING_TIP]
    pinky_tip = landmarks[PINKY_TIP]
    pinky_mcp = landmarks[PINKY_MCP]
    
    # Calculate key metrics
    pinch_distance = calculate_distance(thumb_tip, index_tip)
    finger_spread = calculate_distance(index_tip, pinky_tip)
    palm_width = calculate_distance(index_mcp, pinky_mcp)
    wrist_angle = _calculate_angle_3points(wrist, index_mcp, pinky_mcp)
    
    # Normalize distances relative to palm width
    if palm_width == 0:
        return {"type": "unknown", "confidence": 0, "details": {}}
    
    normalized_pinch = pinch_distance / palm_width
    normalized_spread = finger_spread / palm_width
    
    # Check if fingers are curled (fist/palm grip)
    index_curl = calculate_distance(index_tip, wrist) / calculate_distance(index_mcp, wrist)
    middle_curl = calculate_distance(middle_tip, wrist) / calculate_distance(landmarks[9], wrist)  # MIDDLE_MCP
    ring_curl = calculate_distance(ring_tip, wrist) / calculate_distance(landmarks[13], wrist)  # RING_MCP
    pinky_curl = calculate_distance(pinky_tip, wrist) / calculate_distance(pinky_mcp, wrist)
    avg_curl = (index_curl + middle_curl + ring_curl + pinky_curl) / 4
    
    details = {
        "pinchDistance": round(normalized_pinch, 3),
        "fingerSpread": round(normalized_spread, 3),
        "avgCurl": round(avg_curl, 3),
        "wristAngle": round(wrist_angle, 1)
    }
    
    # Classification logic
    
    # PENCIL GRIP: Thumb and index close, other fingers curled, good wrist angle
    if normalized_pinch < 0.3 and avg_curl > 1.2 and wrist_angle > 120:
        return {"type": "pencil", "confidence": 0.85, "details": details}
    
    # POWER GRIP: All fingers curled into fist
    if avg_curl < 0.9:
        return {"type": "power", "confidence": 0.8, "details": details}
    
    # ANGLED: Wrist at wrong angle (could indicate improper grip)
    if wrist_angle < 100:
        return {"type": "unknown", "confidence": 0.5, "details": details}
    
    # Default: unknown grip
    return {"type": "unknown", "confidence": 0.3, "details": details}


def get_grip_description(state: str) -> str:
    """Get human-readable description of grip state."""
    descriptions = {
        "pencil": "Correct pencil grip",
        "power": "Palming the instrument",
        "unknown": "Grip needs adjustment",
    }
    return descriptions.get(state, "Unknown state")


def should_trigger_feedback(
    prev_state: str,
    new_state: str,
    time_since_last_feedback_ms: int
) -> bool:
    """
    Determine if state change warrants feedback.
    
    Args:
        prev_state: Previous grip state
        new_state: New grip state  
        time_since_last_feedback_ms: Milliseconds since last feedback
    
    Returns:
        True if feedback should be triggered
    """
    # No feedback if no change
    if prev_state == new_state:
        return False
    
    # Always feedback on significant errors
    if new_state == "power":
        return True
    
    # Don't spam encouragement
    if new_state == "pencil" and time_since_last_feedback_ms < 10000:
        return False
    
    # Default cooldown of 3 seconds
    return time_since_last_feedback_ms >= 3000
