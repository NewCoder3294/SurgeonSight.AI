"""
Coaching Phrases - 100+ AI coaching phrases organized by category

Ported from TypeScript (useVoiceCoach.ts)
Provides intelligent coaching feedback for surgical training.
"""

import random
from typing import List, Literal

# Coaching phrase categories
PhraseCategory = Literal[
    "speed_too_fast",
    "speed_too_slow", 
    "speed_steady",
    "hand_stable",
    "hand_unstable",
    "hand_positioning",
    "hand_positioning_bad",
    "hand_movement",
    "hand_movement_bad",
    "encouragement"
]

COACHING_PHRASES = {
    # =============================================================
    # === SPEED METRICS ===
    # =============================================================
    
    # Speed: Too Fast - NEGATIVE (correction phrases)
    "speed_too_fast": [
        "Movement too fast. Slow down for precision.",
        "Rushing the motion. Control your tempo.",
        "Accelerating too quickly. Ease into movements.",
        "Speed exceeding optimal range. Decelerate.",
        "Pace needs reduction. Take it slower.",
        "Rapid movements detected. Prioritize control.",
        "Too quick. Surgical precision requires patience.",
        "Fast motion compromising accuracy. Slow down.",
        "Excessive velocity. Focus on deliberate movement.",
        "Hurried actions detected. Maintain composure.",
        "Speed creating instability. Reduce velocity.",
        "Moving too rapidly. Quality over speed.",
        "Quick movements risking precision. Slow pace.",
        "Tempo too aggressive. Adopt gentler pace.",
        "High-speed displacement. Reduce urgency.",
    ],
    
    # Speed: Too Slow - NEGATIVE (correction phrases)
    "speed_too_slow": [
        "Movement too slow. Increase efficiency.",
        "Velocity below optimal. Speed up slightly.",
        "Hand motion too cautious. More confidence.",
        "Sluggish movement detected. Pick up pace.",
        "Tempo needs increase. Move with purpose.",
        "Delayed motion. Increase fluidity.",
        "Too hesitant. Trust your technique.",
        "Slow pace affecting workflow. Accelerate.",
        "Movement lags. Maintain steady rhythm.",
        "Prolonged dwell time. Keep motion flowing.",
        "Delayed response. Sharpen reaction speed.",
        "Torpid movements. Inject more energy.",
    ],
    
    # Speed: Perfect/Steady - POSITIVE (40 phrases)
    "speed_steady": [
        "Steady speed. Maintain this pace.",
        "Perfect velocity. Well controlled.",
        "Excellent pacing throughout.",
        "Good rhythm. Keep it consistent.",
        "Optimal speed maintained. Outstanding.",
        "Beautiful tempo control. Surgical quality.",
        "Ideal movement rate. Continue.",
        "Speed is well calibrated. Great job.",
        "Smooth controlled motion. Professional.",
        "Pace is perfect. Expert level control.",
        "Velocity discipline excellent. Continue.",
        "Tempo stability remarkable. Very nice.",
        "Speed regulation excellent. Maintain.",
        "Perfect rhythm detected. Outstanding.",
        "Calibrated speed maintained. Brilliant.",
        "Smooth tempo execution. Very precise.",
        "Consistent motion rate. Professional.",
        "Perfect speed control demonstrated.",
        "Movement tempo ideal. Surgical quality.",
        "Optimized velocity tracking. Keep steady.",
    ],
    
    # =============================================================
    # === HAND DETECTION ===
    # =============================================================
    
    # Hand Stability - POSITIVE
    "hand_stable": [
        "Excellent hand stability. Keep it up.",
        "Hand perfectly still. Great control.",
        "Minimal tremor. Professional technique.",
        "Rock steady hands. Well done.",
        "Exceptional stability demonstrated.",
        "Hand motion controlled. Perfect form.",
        "Steady hand placement. Continue.",
        "Hand stability exceptional. Great work.",
        "Zero tremor detected. Outstanding.",
        "Perfect stillness achieved.",
    ],
    
    # Hand Stability - NEGATIVE (correction phrases)
    "hand_unstable": [
        "Hand tremor detected. Stabilize grip.",
        "Hand oscillation observed. Firm up.",
        "Hand wobble detected. Anchor wrist.",
        "Micro-tremors present. Breathe deeply.",
        "Hand shake needs attention. Steady.",
        "Unstable hand motion. Ground yourself.",
        "Vibration detected. Plant your elbow.",
        "Hand flutter observed. Relax muscles.",
        "Trembling detected. Focus on stillness.",
        "Shaky hand positioning. Ground yourself.",
    ],
    
    # Hand Positioning - POSITIVE
    "hand_positioning": [
        "Hand angle optimal. Good positioning.",
        "Proper hand alignment maintained.",
        "Hand pose correct. Keep this form.",
        "Perfect hand articulation. Well done.",
        "Ergonomic hand position achieved.",
        "Correct hand orientation. Excellent.",
        "Hand placement textbook perfect.",
        "Ideal hand geometry detected.",
        "Proper hand pose. Professional level.",
        "Perfect hand positioning detected.",
    ],
    
    # Hand Positioning - NEGATIVE (correction phrases)
    "hand_positioning_bad": [
        "Hand orientation off. Adjust 15 degrees.",
        "Hand tilt excessive. Level out.",
        "Hand rotation needed. Clockwise 10 degrees.",
        "Hand elevation too high. Lower slightly.",
        "Hand angle needs correction. Reposition.",
        "Suboptimal hand placement. Adjust.",
        "Hand geometry needs work. Realign.",
        "Hand pose suboptimal. Correct form.",
        "Hand position compromised. Reset.",
        "Hand orientation wrong. Correct angle.",
    ],
    
    # Hand Movement Quality - POSITIVE
    "hand_movement": [
        "Fluid hand movements. Excellent.",
        "Seamless hand transitions. Beautiful.",
        "Hand motion smooth. Professional.",
        "Controlled hand transition. Maintain.",
        "Hand movement efficiency high.",
        "Optimal hand motion pattern.",
        "Graceful hand control. Continue.",
        "Precise hand movements detected.",
    ],
    
    # Hand Movement Quality - NEGATIVE
    "hand_movement_bad": [
        "Jerky hand movement. Smooth it out.",
        "Erratic hand displacement. Control needed.",
        "Hand transitions choppy. Needs work.",
        "Abrupt hand motion. More fluid approach.",
        "Inconsistent hand movement. Standardize.",
        "Sudden hand shifts. Transition gently.",
        "Choppy hand motion. Aim for flow.",
        "Hand action too abrupt. Soften moves.",
    ],
    
    # =============================================================
    # === ENCOURAGEMENT ===
    # =============================================================
    
    "encouragement": [
        "Great job! Keep it up!",
        "Excellent technique!",
        "You're doing amazing!",
        "Perfect form achieved!",
        "Superb technique maintained!",
        "Excellent metrics across the board!",
        "Outstanding stability and control!",
        "Continue this excellent work!",
        "Professional level performance!",
        "Brilliant execution!",
    ]
}


def get_coaching_phrase(category: PhraseCategory) -> str:
    """
    Get a random coaching phrase for the given category.
    
    Args:
        category: Category of phrase to retrieve
    
    Returns:
        Random phrase from the category
    """
    phrases = COACHING_PHRASES.get(category, [])
    if not phrases:
        return "Continue practicing."
    return random.choice(phrases)


def get_all_phrases(category: PhraseCategory) -> List[str]:
    """Get all phrases for a category."""
    return COACHING_PHRASES.get(category, [])


def get_speed_feedback(speed: float, optimal_min: float = 3, optimal_max: float = 8) -> str:
    """
    Get appropriate speed feedback phrase.
    
    Args:
        speed: Current speed in in/s
        optimal_min: Minimum optimal speed
        optimal_max: Maximum optimal speed
    
    Returns:
        Coaching phrase for the speed condition
    """
    if speed < optimal_min:
        return get_coaching_phrase("speed_too_slow")
    elif speed > optimal_max:
        return get_coaching_phrase("speed_too_fast")
    else:
        return get_coaching_phrase("speed_steady")


def get_steadiness_feedback(steadiness: float, threshold: float = 70) -> str:
    """
    Get appropriate steadiness feedback phrase.
    
    Args:
        steadiness: Steadiness value (0-100)
        threshold: Threshold for "stable" classification
    
    Returns:
        Coaching phrase for the steadiness condition
    """
    if steadiness >= threshold:
        return get_coaching_phrase("hand_stable")
    else:
        return get_coaching_phrase("hand_unstable")
