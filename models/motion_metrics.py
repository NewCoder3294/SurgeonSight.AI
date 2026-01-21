"""
Motion Metrics - Frame differencing for motion analysis

Ported from TypeScript (reproMetrics.ts)
Fast loop motion detection without heavy ML, using frame differencing.
"""

import math
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
import time


@dataclass
class MotionMetrics:
    """Motion metrics computed from frame differencing."""
    time: float  # Timestamp in milliseconds
    fps: float
    motion_mean: float  # Average pixel difference
    motion_max: float   # Maximum pixel difference
    jitter: float       # Standard deviation of differences
    presence_proxy: float  # 0-1, proxy for subject presence (motion indicates presence)


@dataclass
class MetricsWindow:
    """Rolling window of motion metrics for analysis."""
    metrics: List[MotionMetrics] = field(default_factory=list)
    max_size: int = 150  # ~5 seconds at ~30fps


def compute_frame_difference(
    prev_frame: List[int],
    current_frame: List[int],
    width: int,
    height: int
) -> Dict[str, float]:
    """
    Compute motion metrics from two grayscale frames using frame differencing.
    
    Args:
        prev_frame: Previous frame pixel data (RGBA or grayscale)
        current_frame: Current frame pixel data
        width: Frame width
        height: Frame height
    
    Returns:
        Dict with mean, max, and jitter values
    """
    if len(prev_frame) != len(current_frame):
        return {"mean": 0, "max": 0, "jitter": 0}
    
    pixel_count = width * height
    sum_diff = 0
    max_diff = 0
    diffs = []
    
    # Assume RGBA format (4 bytes per pixel)
    step = 4 if len(prev_frame) >= pixel_count * 4 else 1
    
    for i in range(0, len(prev_frame), step):
        if step == 4:
            # RGBA: compute grayscale
            prev_gray = (prev_frame[i] + prev_frame[i + 1] + prev_frame[i + 2]) / 3
            curr_gray = (current_frame[i] + current_frame[i + 1] + current_frame[i + 2]) / 3
        else:
            prev_gray = prev_frame[i]
            curr_gray = current_frame[i]
        
        diff = abs(curr_gray - prev_gray)
        sum_diff += diff
        max_diff = max(max_diff, diff)
        diffs.append(diff)
    
    mean = sum_diff / len(diffs) if diffs else 0
    
    # Compute jitter (standard deviation)
    if diffs:
        variance = sum((d - mean) ** 2 for d in diffs) / len(diffs)
        jitter = math.sqrt(variance)
    else:
        jitter = 0
    
    return {"mean": mean, "max": max_diff, "jitter": jitter}


def create_metrics_window(
    window_size_seconds: float = 5,
    target_fps: int = 30
) -> MetricsWindow:
    """Create a metrics window for rolling window analysis."""
    return MetricsWindow(
        metrics=[],
        max_size=int(window_size_seconds * target_fps)
    )


def add_metric(window: MetricsWindow, metric: MotionMetrics) -> None:
    """Add a metric to the window (maintains rolling window size)."""
    window.metrics.append(metric)
    
    # Keep only last N metrics (rolling window)
    if len(window.metrics) > window.max_size:
        window.metrics.pop(0)


def get_recent_metrics(window: MetricsWindow, seconds: float = 5) -> List[MotionMetrics]:
    """Get recent metrics from window (last N seconds)."""
    if not window.metrics:
        return []
    
    cutoff_time = window.metrics[-1].time - (seconds * 1000)
    return [m for m in window.metrics if m.time >= cutoff_time]


def compute_summary(window: MetricsWindow) -> Optional[Dict[str, Any]]:
    """
    Compute summary statistics from a metrics window.
    
    Returns:
        Dict with time_range, fps, motion stats, presence_proxy, and status_counts
    """
    if not window.metrics:
        return None
    
    recent = get_recent_metrics(window, 5)
    if not recent:
        return None
    
    # Compute averages
    motion_means = [m.motion_mean for m in recent]
    motion_maxs = [m.motion_max for m in recent]
    jitters = [m.jitter for m in recent]
    fpses = [m.fps for m in recent]
    
    motion_mean = sum(motion_means) / len(motion_means)
    motion_max = max(motion_maxs)
    jitter = sum(jitters) / len(jitters)
    fps = sum(fpses) / len(fpses)
    
    # Presence proxy: motion > threshold indicates presence
    presence_proxy = min(1, motion_mean / 50) if motion_mean > 5 else 0
    
    # Status counts (based on motion thresholds)
    on_track = 0
    warning = 0
    critical = 0
    
    for metric in recent:
        if metric.motion_mean < 10:
            critical += 1  # Too still (no movement)
        elif metric.motion_mean > 50:
            warning += 1   # Too much motion (jittery)
        else:
            on_track += 1
    
    return {
        "time_range": {
            "start": recent[0].time,
            "end": recent[-1].time
        },
        "fps": fps,
        "motion_mean": motion_mean,
        "motion_max": motion_max,
        "jitter": jitter,
        "presence_proxy": presence_proxy,
        "status_counts": {
            "on_track": on_track,
            "warning": warning,
            "critical": critical
        }
    }


def create_motion_metric(
    motion_mean: float,
    motion_max: float,
    jitter: float,
    fps: float = 30
) -> MotionMetrics:
    """Helper to create a MotionMetrics instance with current timestamp."""
    return MotionMetrics(
        time=time.time() * 1000,  # Convert to milliseconds
        fps=fps,
        motion_mean=motion_mean,
        motion_max=motion_max,
        jitter=jitter,
        presence_proxy=min(1, motion_mean / 50) if motion_mean > 5 else 0
    )
