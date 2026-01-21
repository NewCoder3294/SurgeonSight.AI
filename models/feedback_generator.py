"""
Feedback Generator - Intelligent feedback generation with deduplication

Ported from TypeScript (reproFeedback.ts)
Generates coaching feedback based on motion metrics with throttling and deduplication.
"""

import random
import time
from dataclasses import dataclass
from typing import Optional, Set, Dict, Literal
from enum import Enum


class FeedbackStatus(str, Enum):
    """Status levels for feedback messages."""
    ON_TRACK = "ON_TRACK"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


@dataclass
class Feedback:
    """A feedback message with status and timestamp."""
    status: FeedbackStatus
    text: str  # <= 12 words
    timestamp: float  # Milliseconds


# Feedback templates by status
FEEDBACK_TEMPLATES: Dict[FeedbackStatus, list] = {
    FeedbackStatus.ON_TRACK: [
        "Motion looks steady and controlled.",
        "Good movement control detected.",
        "Stable motion pattern maintained.",
        "Movement quality is consistent.",
        "Excellent steadiness. Keep it up.",
        "Precision movement detected.",
        "Well-controlled motion pattern.",
        "Steady technique observed.",
    ],
    FeedbackStatus.WARNING: [
        "Motion is slightly jittery, try to stabilize.",
        "Movement detected but could be smoother.",
        "Reduce hand tremor for better control.",
        "Slight instability detected, focus on steadiness.",
        "Minor oscillation detected. Firm up grip.",
        "Motion variance higher than optimal.",
        "Some jitter present. Breathe and relax.",
        "Movement could be more controlled.",
    ],
    FeedbackStatus.CRITICAL: [
        "Motion too still, begin movement exercise.",
        "No significant movement detected, start practicing.",
        "Movement appears frozen, resume activity.",
        "Motion level very low, initiate practice sequence.",
        "Hand not detected. Position in frame.",
        "Minimal activity detected. Begin exercise.",
        "Static position detected. Resume movement.",
        "Practice needs to begin. Start moving.",
    ]
}


class FeedbackGenerator:
    """
    Generate feedback from motion metrics with deduplication.
    
    Features:
        - Throttled output (max 1 message per second)
        - Exact duplicate detection
        - Near-duplicate detection for same status
        - Rolling window of seen texts
    """
    
    def __init__(self, min_interval_ms: int = 1000, max_seen_size: int = 10):
        """
        Initialize the feedback generator.
        
        Args:
            min_interval_ms: Minimum time between feedback messages
            max_seen_size: Maximum size of seen texts cache for deduplication
        """
        self.last_feedback: Optional[Feedback] = None
        self.last_emit_time: float = 0
        self.min_interval_ms = min_interval_ms
        self.seen_texts: Set[str] = set()
        self.max_seen_size = max_seen_size
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text for deduplication comparison."""
        import re
        return re.sub(r'[^\w\s]', ' ', text.lower()).strip()
    
    def generate(
        self,
        motion_mean: float,
        motion_max: float,
        jitter: float,
        presence_proxy: float
    ) -> Optional[Feedback]:
        """
        Generate feedback from current metrics.
        
        Args:
            motion_mean: Average motion value
            motion_max: Maximum motion value
            jitter: Motion jitter/variance
            presence_proxy: Presence indicator (0-1)
        
        Returns:
            Feedback object or None if throttled/duplicate
        """
        now = time.time() * 1000  # Milliseconds
        
        # Throttle: emit at most once per interval
        if now - self.last_emit_time < self.min_interval_ms:
            return None
        
        # Determine status from metrics
        if motion_mean < 10:
            status = FeedbackStatus.CRITICAL  # Too still
        elif motion_mean > 50 or jitter > 30:
            status = FeedbackStatus.WARNING   # Too jittery
        else:
            status = FeedbackStatus.ON_TRACK  # Good motion
        
        # Select random template for this status
        templates = FEEDBACK_TEMPLATES[status]
        text = random.choice(templates)
        
        # Normalize for deduplication
        normalized = self._normalize_text(text)
        
        # Skip if exact duplicate
        if normalized in self.seen_texts:
            return None
        
        # Skip if same status with similar text
        if self.last_feedback and self.last_feedback.status == status:
            last_normalized = self._normalize_text(self.last_feedback.text)
            if normalized == last_normalized:
                return None
            # Check for near-duplicate (shares first 20 chars)
            if len(normalized) > 20 and len(last_normalized) > 20:
                if normalized[:20] in last_normalized or last_normalized[:20] in normalized:
                    return None
        
        # Track seen texts (rolling window)
        self.seen_texts.add(normalized)
        if len(self.seen_texts) > self.max_seen_size:
            # Remove oldest (arbitrary since set, but keeps size bounded)
            self.seen_texts.pop()
        
        feedback = Feedback(
            status=status,
            text=text,
            timestamp=now
        )
        
        self.last_feedback = feedback
        self.last_emit_time = now
        
        return feedback
    
    def generate_from_metrics(
        self,
        metrics: Dict
    ) -> Optional[Feedback]:
        """
        Generate feedback from a metrics dictionary.
        
        Args:
            metrics: Dict with motion_mean, motion_max, jitter, presence_proxy
        """
        return self.generate(
            motion_mean=metrics.get("motion_mean", 0),
            motion_max=metrics.get("motion_max", 0),
            jitter=metrics.get("jitter", 0),
            presence_proxy=metrics.get("presence_proxy", 0)
        )
    
    def reset(self) -> None:
        """Reset generator state."""
        self.last_feedback = None
        self.last_emit_time = 0
        self.seen_texts.clear()
