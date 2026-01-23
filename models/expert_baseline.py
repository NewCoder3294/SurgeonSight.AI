"""
Expert Baseline - Expert comparison and recommendation logic

Ported from TypeScript (useExpertBaseline.ts)
Compares trainee performance to expert baselines and generates recommendations.
"""

from dataclasses import dataclass
from typing import Optional, Dict, Any, List, Literal


@dataclass
class ExpertMetrics:
    """Expert baseline metrics for comparison."""
    angle_target: float  # Target angle in degrees
    angle_tolerance: float = 15  # Acceptable deviation
    steadiness_target: float = 70  # Minimum acceptable steadiness
    speed_optimal: float = 50  # Optimal speed value
    speed_tolerance: float = 15  # Acceptable speed deviation
    expected_grip_type: Literal['pencil', 'power', 'unknown'] = 'pencil'
    
    @classmethod
    def default(cls) -> 'ExpertMetrics':
        """Create default expert metrics."""
        return cls(
            angle_target=45,
            angle_tolerance=20,
            steadiness_target=85,
            speed_optimal=1,
            speed_tolerance=0.5,
            expected_grip_type='pencil'
        )


@dataclass
class ComparisonResult:
    """Result of comparing trainee to expert baseline."""
    angle_diff: float
    angle_status: Literal['good', 'warning', 'critical']
    steadiness_status: Literal['good', 'warning', 'critical']
    speed_status: Literal['good', 'too_slow', 'too_fast']
    grip_match: bool
    overall_score: float  # 0-100
    recommendations: List[str]


def compare_to_expert(
    current_angle: float,
    current_steadiness: float,
    current_speed: float,
    current_grip: str,
    expert: ExpertMetrics
) -> ComparisonResult:
    """
    Compare trainee's current metrics to expert baseline.
    
    Args:
        current_angle: Trainee's current scalpel angle
        current_steadiness: Trainee's current steadiness (0-100)
        current_speed: Trainee's current speed
        current_grip: Trainee's current grip type
        expert: Expert baseline metrics
    
    Returns:
        ComparisonResult with status and recommendations
    """
    recommendations = []
    
    # Angle comparison
    angle_diff = abs(current_angle - expert.angle_target)
    if angle_diff <= expert.angle_tolerance * 0.5:
        angle_status = 'good'
    elif angle_diff <= expert.angle_tolerance:
        angle_status = 'warning'
        recommendations.append(f"Adjust angle by {angle_diff:.1f}° toward {expert.angle_target}°")
    else:
        angle_status = 'critical'
        recommendations.append(f"Angle off by {angle_diff:.1f}°. Target: {expert.angle_target}°")
    
    # Steadiness comparison
    if current_steadiness >= expert.steadiness_target:
        steadiness_status = 'good'
    elif current_steadiness >= expert.steadiness_target * 0.8:
        steadiness_status = 'warning'
        recommendations.append("Steadiness could improve. Focus on stability.")
    else:
        steadiness_status = 'critical'
        recommendations.append("Hand too shaky. Plant elbow and breathe.")
    
    # Speed comparison
    speed_diff = current_speed - expert.speed_optimal
    if abs(speed_diff) <= expert.speed_tolerance:
        speed_status = 'good'
    elif speed_diff < 0:
        speed_status = 'too_slow'
        recommendations.append("Movement too slow. Increase pace slightly.")
    else:
        speed_status = 'too_fast'
        recommendations.append("Moving too fast. Slow down for precision.")
    
    # Grip comparison
    grip_match = current_grip == expert.expected_grip_type
    if not grip_match and expert.expected_grip_type != 'unknown':
        recommendations.append(f"Switch to {expert.expected_grip_type} grip.")
    
    # Calculate overall score (0-100)
    score = 100
    
    # Angle penalty (up to 5 points - relaxed for demo)
    angle_penalty = min(5, (angle_diff / expert.angle_tolerance) * 5)
    score -= angle_penalty
    
    # Steadiness penalty (up to 5 points - relaxed for demo)
    if current_steadiness < expert.steadiness_target:
        steadiness_penalty = min(5, ((expert.steadiness_target - current_steadiness) / expert.steadiness_target) * 5)
        score -= steadiness_penalty
    
    # Speed penalty (up to 2 points - relaxed for demo)
    speed_penalty = min(2, (abs(speed_diff) / expert.speed_tolerance) * 2)
    score -= speed_penalty
    
    # Grip penalty (20 points if wrong)
    if not grip_match and expert.expected_grip_type != 'unknown':
        score -= 20
    
    score = max(0, score)
    
    return ComparisonResult(
        angle_diff=angle_diff,
        angle_status=angle_status,
        steadiness_status=steadiness_status,
        speed_status=speed_status,
        grip_match=grip_match,
        overall_score=score,
        recommendations=recommendations
    )


def generate_recommendation(comparison: ComparisonResult) -> str:
    """
    Generate a single, prioritized recommendation from comparison.
    
    Returns the most important recommendation based on severity.
    """
    if not comparison.recommendations:
        if comparison.overall_score >= 90:
            return "Excellent technique! Maintain this performance."
        elif comparison.overall_score >= 75:
            return "Good technique. Minor improvements possible."
        else:
            return "Keep practicing. Focus on fundamentals."
    
    # Return first (most important) recommendation
    return comparison.recommendations[0]


def create_expert_from_video(
    video_stats: Dict[str, Any]
) -> ExpertMetrics:
    """
    Create expert baseline from analyzed video statistics.
    
    Args:
        video_stats: Statistics extracted from expert video analysis
    
    Returns:
        ExpertMetrics based on video analysis
    """
    return ExpertMetrics(
        angle_target=video_stats.get("avg_angle", 45),
        angle_tolerance=video_stats.get("angle_std", 15) or 15,
        steadiness_target=video_stats.get("avg_steadiness", 70),
        speed_optimal=video_stats.get("avg_speed", 50),
        speed_tolerance=video_stats.get("speed_std", 15) or 15,
        expected_grip_type=video_stats.get("primary_grip", "pencil")
    )
