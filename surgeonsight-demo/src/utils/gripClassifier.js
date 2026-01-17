/**
 * Grip Classification Utility
 * Analyzes MediaPipe hand landmarks to determine grip type
 */

/**
 * Calculate distance between two 3D points
 */
function distance(p1, p2) {
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2) +
        Math.pow(p1.z - p2.z, 2)
    );
}

/**
 * Calculate angle between three points (in degrees)
 */
function calculateAngle(p1, p2, p3) {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: p1.z - p2.z };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };

    const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
    const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * MediaPipe Hand Landmark Indices:
 * 0: WRIST
 * 1-4: THUMB (CMC, MCP, IP, TIP)
 * 5-8: INDEX (MCP, PIP, DIP, TIP)
 * 9-12: MIDDLE (MCP, PIP, DIP, TIP)
 * 13-16: RING (MCP, PIP, DIP, TIP)
 * 17-20: PINKY (MCP, PIP, DIP, TIP)
 */

/**
 * Classify grip type based on hand landmarks
 * @param {Array} landmarks - 21 hand landmarks from MediaPipe
 * @returns {Object} - { state: string, confidence: number, details: object }
 */
export function classifyGrip(landmarks) {
    if (!landmarks || landmarks.length < 21) {
        return { state: 'no_hand', confidence: 0, details: {} };
    }

    // Key landmarks
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const thumbIP = landmarks[3];
    const indexTip = landmarks[8];
    const indexPIP = landmarks[6];
    const indexMCP = landmarks[5];
    const middleTip = landmarks[12];
    const middleMCP = landmarks[9];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    const pinkyMCP = landmarks[17];

    // Calculate key metrics
    const pinchDistance = distance(thumbTip, indexTip);
    const thumbIndexAngle = calculateAngle(thumbTip, indexMCP, indexTip);
    const fingerSpread = distance(indexTip, pinkyTip);
    const palmWidth = distance(indexMCP, pinkyMCP);
    const wristAngle = calculateAngle(wrist, indexMCP, pinkyMCP);

    // Normalize distances relative to palm width
    const normalizedPinch = pinchDistance / palmWidth;
    const normalizedSpread = fingerSpread / palmWidth;

    // Check if fingers are curled (fist/palm grip)
    const indexCurl = distance(indexTip, wrist) / distance(indexMCP, wrist);
    const middleCurl = distance(middleTip, wrist) / distance(middleMCP, wrist);
    const ringCurl = distance(ringTip, wrist) / distance(landmarks[13], wrist);
    const pinkyCurl = distance(pinkyTip, wrist) / distance(pinkyMCP, wrist);
    const avgCurl = (indexCurl + middleCurl + ringCurl + pinkyCurl) / 4;

    // Tremor detection (would need multiple frames for real detection)
    // For now, this is a placeholder
    const details = {
        pinchDistance: normalizedPinch.toFixed(3),
        fingerSpread: normalizedSpread.toFixed(3),
        avgCurl: avgCurl.toFixed(3),
        wristAngle: wristAngle.toFixed(1)
    };

    // Classification logic

    // CORRECT: Pencil grip - pinched fingers, relaxed other fingers
    if (normalizedPinch < 0.3 && avgCurl > 1.2 && wristAngle > 120) {
        return { state: 'correct', confidence: 0.85, details };
    }

    // PALMED: Fist grip - all fingers curled
    if (avgCurl < 0.9) {
        return { state: 'palmed', confidence: 0.8, details };
    }

    // ANGLED: Wrist at wrong angle
    if (wristAngle < 100) {
        return { state: 'angled', confidence: 0.7, details };
    }

    // TOO SPREAD: Fingers too far apart
    if (normalizedSpread > 1.5) {
        return { state: 'spread', confidence: 0.6, details };
    }

    // Default: needs adjustment
    return { state: 'other_error', confidence: 0.5, details };
}

/**
 * Get human-readable description of grip state
 */
export function getGripDescription(state) {
    const descriptions = {
        correct: 'Correct pencil grip',
        palmed: 'Palming the instrument',
        angled: 'Wrist angle needs adjustment',
        spread: 'Fingers too spread',
        tremor: 'Tremor detected',
        other_error: 'Grip needs adjustment',
        no_hand: 'No hand detected'
    };
    return descriptions[state] || 'Unknown state';
}

/**
 * Determine if state change warrants feedback
 */
export function shouldTriggerFeedback(prevState, newState, timeSinceLastFeedback) {
    // No feedback if no change
    if (prevState === newState) return false;

    // Always feedback on significant errors
    if (newState === 'palmed' || newState === 'tremor') return true;

    // Don't spam encouragement
    if (newState === 'correct' && timeSinceLastFeedback < 10000) return false;

    // Default cooldown of 3 seconds
    return timeSinceLastFeedback >= 3000;
}
