"""
Surgical Metrics - Core calculations for hand tracking analysis

Ported from TypeScript (useMediaPipeHands.ts)
Calculates angles, steadiness, speed, and finger bend from MediaPipe landmarks.
"""

import math
from dataclasses import dataclass
from typing import List, Optional, Literal

# MediaPipe landmark indices
WRIST = 0
THUMB_TIP = 4
INDEX_MCP = 5
INDEX_PIP = 6
INDEX_DIP = 7
INDEX_TIP = 8
MIDDLE_TIP = 12
RING_TIP = 16
PINKY_MCP = 17
PINKY_TIP = 20


@dataclass
class HandLandmark:
    """3D hand landmark from MediaPipe."""
    x: float
    y: float
    z: float


@dataclass
class SurgicalMetrics:
    """Surgical performance metrics calculated from hand landmarks."""
    scalpel_angle: float      # Degrees from horizontal
    pinch_angle: float        # Angle between thumb and index finger
    finger_bend: float        # Index finger bend percentage (0=straight, 100=fully bent)
    steadiness: float         # 0-100 (100 = perfectly still)
    speed: float              # Motion speed in inches/second
    grip_type: Literal['pencil', 'power', 'unknown']
    grip_confidence: float    # 0-1


def ema_smooth(current: float, previous: Optional[float], alpha: float = 0.3) -> float:
    """
    Exponential Moving Average for smoothing metrics.
    
    Args:
        current: Current value
        previous: Previous smoothed value (None for first value)
        alpha: Smoothing factor (0.2-0.4 recommended, higher = more responsive)
    
    Returns:
        Smoothed value
    """
    if previous is None:
        return current
    return alpha * current + (1 - alpha) * previous


def calculate_distance(p1: HandLandmark, p2: HandLandmark) -> float:
    """Calculate 3D Euclidean distance between two landmarks."""
    return math.sqrt(
        (p2.x - p1.x) ** 2 +
        (p2.y - p1.y) ** 2 +
        (p2.z - p1.z) ** 2
    )


def calculate_angle(p1: HandLandmark, p2: HandLandmark) -> float:
    """
    Calculate angle between two points in degrees.
    Returns angle from horizontal (0° = pointing right).
    """
    dx = p2.x - p1.x
    dy = p2.y - p1.y
    radians = math.atan2(dy, dx)
    return math.degrees(radians)


def calculate_angle_3points(p1: HandLandmark, p2: HandLandmark, p3: HandLandmark) -> float:
    """
    Calculate angle between three points (vertex at p2) in degrees.
    
    Args:
        p1: First point
        p2: Vertex point
        p3: Third point
    
    Returns:
        Angle in degrees (0-180)
    """
    v1 = {"x": p1.x - p2.x, "y": p1.y - p2.y}
    v2 = {"x": p3.x - p2.x, "y": p3.y - p2.y}
    
    dot = v1["x"] * v2["x"] + v1["y"] * v2["y"]
    mag1 = math.sqrt(v1["x"] ** 2 + v1["y"] ** 2)
    mag2 = math.sqrt(v2["x"] ** 2 + v2["y"] ** 2)
    
    if mag1 == 0 or mag2 == 0:
        return 0
    
    cos_angle = max(-1, min(1, dot / (mag1 * mag2)))
    return math.degrees(math.acos(cos_angle))


def calculate_finger_bend(landmarks: List[HandLandmark]) -> float:
    """
    Calculate index finger bend (0 = straight, 100 = fully bent).
    
    Uses angles at PIP and DIP joints to determine bend.
    """
    if len(landmarks) < 21:
        return 0
    
    mcp = landmarks[INDEX_MCP]
    pip = landmarks[INDEX_PIP]
    dip = landmarks[INDEX_DIP]
    tip = landmarks[INDEX_TIP]
    
    # Calculate angles at PIP and DIP joints
    pip_angle = calculate_angle_3points(mcp, pip, dip)
    dip_angle = calculate_angle_3points(pip, dip, tip)
    
    # Straight finger = ~180°, bent = smaller angle
    # Convert to percentage (180° = 0%, 60° = 100%)
    avg_angle = (pip_angle + dip_angle) / 2
    bend_percent = max(0, min(100, (180 - avg_angle) / 1.2))
    
    return bend_percent


def calculate_steadiness(current: List[HandLandmark], history: List[List[HandLandmark]]) -> float:
    """
    Calculate hand steadiness from position history (0-100, 100 = perfectly still).
    
    Uses variance of wrist position normalized by hand size.
    """
    if len(history) < 3:
        return 70  # Not enough data, assume moderate steadiness
    
    wrist_history = [h[WRIST] for h in history] + [current[WRIST]]
    
    # Calculate average position
    avg_x = sum(p.x for p in wrist_history) / len(wrist_history)
    avg_y = sum(p.y for p in wrist_history) / len(wrist_history)
    
    # Calculate variance
    variance = sum(
        (p.x - avg_x) ** 2 + (p.y - avg_y) ** 2
        for p in wrist_history
    ) / len(wrist_history)
    
    # Standard deviation normalized by hand size
    std_dev = math.sqrt(variance)
    hand_size = calculate_distance(current[WRIST], current[INDEX_TIP])
    
    if hand_size < 0.01:
        return 50
    
    # Normalized jitter
    normalized_jitter = (std_dev / hand_size) * 100
    
    # Map to 0-100 steadiness scale
    # relaxed sensitivity: multiplier reduced from 1.2 to 0.4 (DEMO MODE)
    steadiness = max(0, min(100, 100 - normalized_jitter * 0.4))
    return steadiness


def calculate_speed(
    current: List[HandLandmark],
    prev: Optional[List[HandLandmark]],
    fps: float = 15
) -> float:
    """
    Calculate motion speed in inches per second (estimated).
    
    Args:
        current: Current frame landmarks
        prev: Previous frame landmarks
        fps: Frames per second (default 15)
    
    Returns:
        Speed in inches/second
    
    Note: Assumes typical webcam setup (hand ~2ft from camera).
    """
    if prev is None or len(prev) < 21:
        return 0
    
    current_wrist = current[WRIST]
    prev_wrist = prev[WRIST]
    
    # Calculate normalized distance moved
    normalized_dist = math.sqrt(
        (current_wrist.x - prev_wrist.x) ** 2 +
        (current_wrist.y - prev_wrist.y) ** 2
    )
    
    # Convert to inches: multiply by ~0.5 (recalibrated)
    # At given FPS, multiply by fps to get inches/second
    inches_per_frame = normalized_dist * 0.5
    inches_per_second = inches_per_frame * fps
    
    return inches_per_second


def compute_surgical_metrics(
    landmarks: List[HandLandmark],
    prev_landmarks: Optional[List[HandLandmark]] = None,
    history: Optional[List[List[HandLandmark]]] = None,
    prev_metrics: Optional[SurgicalMetrics] = None,
    fps: float = 15
) -> SurgicalMetrics:
    """
    Compute all surgical metrics from hand landmarks.
    
    This is the main entry point that calculates all metrics at once.
    """
    from .grip_classifier import classify_grip
    
    if len(landmarks) < 21:
        return SurgicalMetrics(
            scalpel_angle=0,
            pinch_angle=0,
            finger_bend=0,
            steadiness=50,
            speed=0,
            grip_type='unknown',
            grip_confidence=0
        )
    
    history = history or []
    
    # Calculate raw metrics
    scalpel_angle = calculate_angle(landmarks[WRIST], landmarks[INDEX_TIP])
    pinch_angle = calculate_angle_3points(
        landmarks[THUMB_TIP],
        landmarks[INDEX_MCP],
        landmarks[INDEX_TIP]
    )
    finger_bend = calculate_finger_bend(landmarks)
    steadiness = calculate_steadiness(landmarks, history)
    speed = calculate_speed(landmarks, prev_landmarks, fps)
    
    # Classify grip
    grip_result = classify_grip(landmarks)
    
    # Apply EMA smoothing
    return SurgicalMetrics(
        scalpel_angle=ema_smooth(abs(scalpel_angle), prev_metrics.scalpel_angle if prev_metrics else None, 0.4),
        pinch_angle=ema_smooth(pinch_angle, prev_metrics.pinch_angle if prev_metrics else None, 0.3),
        finger_bend=ema_smooth(finger_bend, prev_metrics.finger_bend if prev_metrics else None, 0.3),
        steadiness=ema_smooth(steadiness, prev_metrics.steadiness if prev_metrics else None, 0.2),
        speed=ema_smooth(speed, prev_metrics.speed if prev_metrics else None, 0.3),
        grip_type=grip_result["type"],
        grip_confidence=grip_result["confidence"]
    )
