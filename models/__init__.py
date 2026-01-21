"""
Models Package - ML/CV/AI algorithms for SurgeonSight

This package contains all machine learning, computer vision,
and AI-related algorithms for surgical training analysis.
"""

from .surgical_metrics import (
    calculate_angle,
    calculate_angle_3points,
    calculate_finger_bend,
    calculate_distance,
    calculate_steadiness,
    calculate_speed,
    ema_smooth,
    HandLandmark,
    SurgicalMetrics,
)

from .grip_classifier import (
    classify_grip,
    get_grip_description,
    should_trigger_feedback,
    GripResult,
)

from .motion_metrics import (
    compute_frame_difference,
    create_metrics_window,
    add_metric,
    get_recent_metrics,
    compute_summary,
    MotionMetrics,
    MetricsWindow,
)

from .feedback_generator import (
    FeedbackGenerator,
    Feedback,
    FeedbackStatus,
)

from .coaching_phrases import (
    COACHING_PHRASES,
    get_coaching_phrase,
)

from .expert_baseline import (
    ExpertMetrics,
    compare_to_expert,
    generate_recommendation,
)

__all__ = [
    # Surgical Metrics
    "calculate_angle",
    "calculate_angle_3points", 
    "calculate_finger_bend",
    "calculate_distance",
    "calculate_steadiness",
    "calculate_speed",
    "ema_smooth",
    "HandLandmark",
    "SurgicalMetrics",
    # Grip Classifier
    "classify_grip",
    "get_grip_description",
    "should_trigger_feedback",
    "GripResult",
    # Motion Metrics
    "compute_frame_difference",
    "create_metrics_window",
    "add_metric",
    "get_recent_metrics",
    "compute_summary",
    "MotionMetrics",
    "MetricsWindow",
    # Feedback Generator
    "FeedbackGenerator",
    "Feedback",
    "FeedbackStatus",
    # Coaching Phrases
    "COACHING_PHRASES",
    "get_coaching_phrase",
    # Expert Baseline
    "ExpertMetrics",
    "compare_to_expert",
    "generate_recommendation",
]
