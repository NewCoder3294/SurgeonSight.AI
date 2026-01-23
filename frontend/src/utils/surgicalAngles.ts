/**
 * Advanced Surgical Angle Measurement System
 * 
 * Provides precise 3D angle calculations specifically designed for surgical
 * training applications. Includes:
 * - Wrist flexion/extension angles
 * - Pronation/supination detection
 * - Scalpel/instrument holding angles
 * - Finger aperture for precision grips
 * - Wrist deviation (radial/ulnar)
 */

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

// MediaPipe landmark indices
export const LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

/**
 * Comprehensive surgical angle metrics
 */
export interface SurgicalAngleMetrics {
  // Primary scalpel holding angle (0° = horizontal, positive = tip up, negative = tip down)
  scalpelAngle: number;
  
  // Wrist flexion/extension (-90° to +90°, 0° = neutral)
  // Positive = flexion (palm toward forearm), Negative = extension (back of hand toward forearm)
  wristFlexion: number;
  
  // Wrist pronation/supination (-90° to +90°, 0° = neutral thumb-up position)
  // Positive = pronation (palm down), Negative = supination (palm up)
  wristPronation: number;
  
  // Radial/ulnar deviation (-30° to +30°, 0° = neutral)
  // Positive = radial (thumb side), Negative = ulnar (pinky side)
  wristDeviation: number;
  
  // Thumb-index aperture angle (angle between thumb and index finger)
  pinchAperture: number;
  
  // Index finger flexion (0° = straight, 180° = fully flexed)
  indexFlexion: number;
  
  // Thumb opposition angle (how opposed thumb is to fingers)
  thumbOpposition: number;
  
  // Roll angle of hand (rotation around forearm axis)
  handRoll: number;
  
  // Pitch angle of hand (tilt forward/backward)
  handPitch: number;
  
  // Instrument axis angle (angle of imaginary instrument held between thumb-index)
  instrumentAxis: number;
  
  // Confidence in angle measurements (0-1)
  confidence: number;
}

/**
 * Create a 3D vector from two landmarks
 */
function createVector(from: HandLandmark, to: HandLandmark): Vector3D {
  return {
    x: to.x - from.x,
    y: to.y - from.y,
    z: to.z - from.z,
  };
}

/**
 * Calculate dot product of two vectors
 */
function dot(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Calculate cross product of two vectors
 */
function cross(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * Calculate magnitude of a vector
 */
function magnitude(v: Vector3D): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

/**
 * Normalize a vector
 */
function normalize(v: Vector3D): Vector3D {
  const mag = magnitude(v);
  if (mag === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

/**
 * Calculate angle between two vectors in degrees
 */
function angleBetweenVectors(a: Vector3D, b: Vector3D): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  
  const cosAngle = Math.max(-1, Math.min(1, dot(a, b) / (magA * magB)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Calculate signed angle between two vectors around an axis
 */
function signedAngle(a: Vector3D, b: Vector3D, axis: Vector3D): number {
  const unsignedAngle = angleBetweenVectors(a, b);
  const crossProduct = cross(a, b);
  const sign = dot(crossProduct, axis) >= 0 ? 1 : -1;
  return unsignedAngle * sign;
}

/**
 * Calculate 2D angle from horizontal (in degrees)
 * For consistent measurement across both hands, left hand X coordinates are mirrored
 */
function angle2DFromHorizontal(from: HandLandmark, to: HandLandmark, handedness: 'Left' | 'Right' = 'Right'): number {
  // For left hand, mirror X coordinates so angle is measured consistently with right hand
  const dx = handedness === 'Left' 
    ? (from.x - to.x)   // Flip direction for left hand
    : (to.x - from.x);  // Normal direction for right hand
  const dy = to.y - from.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

/**
 * Calculate 3D angle from horizontal plane
 * @internal Reserved for future 3D angle calculations
 */
function _angle3DFromHorizontal(from: HandLandmark, to: HandLandmark): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  
  // Project onto horizontal plane and measure elevation
  const horizontalDist = Math.sqrt(dx * dx + dy * dy);
  return Math.atan2(dz, horizontalDist) * (180 / Math.PI);
}

/**
 * Estimate the palm normal vector (perpendicular to palm surface)
 */
function calculatePalmNormal(landmarks: HandLandmark[]): Vector3D {
  const wrist = landmarks[LANDMARKS.WRIST];
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
  const pinkyMcp = landmarks[LANDMARKS.PINKY_MCP];
  
  // Vector from wrist to index MCP
  const wristToIndex = createVector(wrist, indexMcp);
  
  // Vector from wrist to pinky MCP  
  const wristToPinky = createVector(wrist, pinkyMcp);
  
  // Palm normal is cross product
  const normal = cross(wristToIndex, wristToPinky);
  return normalize(normal);
}

/**
 * Calculate the forward direction of the hand (finger pointing direction)
 */
function calculateHandForward(landmarks: HandLandmark[]): Vector3D {
  const wrist = landmarks[LANDMARKS.WRIST];
  const _middleMcp = landmarks[LANDMARKS.MIDDLE_MCP];  // Available for refined calculation
  const middleTip = landmarks[LANDMARKS.MIDDLE_TIP];
  
  // Primary forward direction from wrist to middle fingertip
  const forward = createVector(wrist, middleTip);
  return normalize(forward);
}

/**
 * Calculate hand "up" vector (from palm to back of hand)
 * @internal Reserved for future posture analysis
 */
function _calculateHandUp(landmarks: HandLandmark[]): Vector3D {
  const palmNormal = calculatePalmNormal(landmarks);
  // Palm normal points from palm to back of hand
  return palmNormal;
}

/**
 * Calculate wrist flexion/extension angle
 * Uses the angle between forearm (approximated) and hand
 */
function calculateWristFlexion(landmarks: HandLandmark[]): number {
  const wrist = landmarks[LANDMARKS.WRIST];
  const middleMcp = landmarks[LANDMARKS.MIDDLE_MCP];
  
  // Approximate forearm direction as pointing toward camera (negative Z)
  // In a real application, you'd want forearm landmarks
  const _forearmDir: Vector3D = { x: 0, y: 0, z: -1 };  // Reserved for improved calculation
  
  // Hand direction from wrist to middle MCP
  const handDir = createVector(wrist, middleMcp);
  const normalizedHand = normalize(handDir);
  
  // Calculate flexion as deviation from forearm axis
  // Project hand direction onto Y-Z plane for flexion
  const flexionAngle = Math.atan2(normalizedHand.y, -normalizedHand.z) * (180 / Math.PI);
  
  return Math.max(-90, Math.min(90, flexionAngle));
}

/**
 * Calculate wrist pronation/supination
 * Based on palm facing direction relative to gravity
 */
function calculateWristPronation(landmarks: HandLandmark[]): number {
  const palmNormal = calculatePalmNormal(landmarks);
  
  // Reference "up" vector (against gravity)
  const _upVector: Vector3D = { x: 0, y: -1, z: 0 };  // Reserved for gravity reference
  
  // Forward vector (hand pointing direction)
  const handForward = calculateHandForward(landmarks);
  
  // Calculate pronation as the signed angle of palm normal around hand forward axis
  // When palm faces down (normal points up), it's pronation
  // When palm faces up (normal points down), it's supination
  const pronationAngle = signedAngle(
    { x: 0, y: -1, z: 0 }, // reference up
    palmNormal,
    handForward
  );
  
  return Math.max(-90, Math.min(90, pronationAngle));
}

/**
 * Calculate radial/ulnar deviation
 */
function calculateWristDeviation(landmarks: HandLandmark[]): number {
  const wrist = landmarks[LANDMARKS.WRIST];
  const middleMcp = landmarks[LANDMARKS.MIDDLE_MCP];
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
  const pinkyMcp = landmarks[LANDMARKS.PINKY_MCP];
  
  // Calculate the centerline of the palm
  const palmCenter = {
    x: (indexMcp.x + pinkyMcp.x) / 2,
    y: (indexMcp.y + pinkyMcp.y) / 2,
    z: (indexMcp.z + pinkyMcp.z) / 2,
  };
  
  // Vector from wrist to palm center (should be straight if no deviation)
  const _wristToPalm = createVector(wrist, palmCenter);  // Reserved for 3D analysis
  
  // Vector from wrist to middle MCP
  const _wristToMiddle = createVector(wrist, middleMcp);  // Reserved for 3D analysis
  
  // Calculate lateral deviation
  // Positive = radial (toward thumb), Negative = ulnar (toward pinky)
  const lateralAngle = angle2DFromHorizontal(wrist, middleMcp);
  const baselineAngle = angle2DFromHorizontal(wrist, palmCenter);
  
  const deviation = lateralAngle - baselineAngle;
  return Math.max(-30, Math.min(30, deviation));
}

/**
 * Calculate thumb-index pinch aperture
 */
function calculatePinchAperture(landmarks: HandLandmark[]): number {
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const indexTip = landmarks[LANDMARKS.INDEX_TIP];
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
  
  // Vector from index MCP to thumb tip
  const mcpToThumb = createVector(indexMcp, thumbTip);
  
  // Vector from index MCP to index tip
  const mcpToIndex = createVector(indexMcp, indexTip);
  
  return angleBetweenVectors(mcpToThumb, mcpToIndex);
}

/**
 * Calculate index finger flexion (all joints combined)
 */
function calculateIndexFlexion(landmarks: HandLandmark[]): number {
  const mcp = landmarks[LANDMARKS.INDEX_MCP];
  const pip = landmarks[LANDMARKS.INDEX_PIP];
  const dip = landmarks[LANDMARKS.INDEX_DIP];
  const tip = landmarks[LANDMARKS.INDEX_TIP];
  
  // Calculate angles at each joint
  const mcpToPip = createVector(mcp, pip);
  const pipToDip = createVector(pip, dip);
  const dipToTip = createVector(dip, tip);
  
  const pipAngle = 180 - angleBetweenVectors(mcpToPip, pipToDip);
  const dipAngle = 180 - angleBetweenVectors(pipToDip, dipToTip);
  
  // Combined flexion
  return pipAngle + dipAngle;
}

/**
 * Calculate thumb opposition (how opposed thumb is to fingers)
 */
function calculateThumbOpposition(landmarks: HandLandmark[]): number {
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const thumbMcp = landmarks[LANDMARKS.THUMB_MCP];
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
  const pinkyMcp = landmarks[LANDMARKS.PINKY_MCP];
  
  // Calculate palm plane (reserved for 3D opposition analysis)
  const _palmNormal = calculatePalmNormal(landmarks);
  
  // Thumb direction from MCP to tip
  const thumbDir = createVector(thumbMcp, thumbTip);
  const normalizedThumb = normalize(thumbDir);
  
  // Opposition is how much thumb points across palm (toward pinky side)
  const palmLateral = createVector(indexMcp, pinkyMcp);
  const normalizedLateral = normalize(palmLateral);
  
  // Angle between thumb direction and lateral palm direction
  const opposition = angleBetweenVectors(normalizedThumb, normalizedLateral);
  
  return opposition;
}

/**
 * Calculate hand roll angle (rotation around forward axis)
 */
function calculateHandRoll(landmarks: HandLandmark[]): number {
  const palmNormal = calculatePalmNormal(landmarks);
  
  // Reference: upward direction
  const upRef: Vector3D = { x: 0, y: -1, z: 0 };
  
  // Project palm normal onto vertical plane perpendicular to forward
  const handForward = calculateHandForward(landmarks);
  
  // Calculate roll as angle between palm normal and up vector, around forward axis
  const rollAngle = signedAngle(upRef, palmNormal, handForward);
  
  return rollAngle;
}

/**
 * Calculate hand pitch (forward tilt)
 */
function calculateHandPitch(landmarks: HandLandmark[]): number {
  const handForward = calculateHandForward(landmarks);
  
  // Pitch is the angle from horizontal plane
  const horizontalMag = Math.sqrt(handForward.x * handForward.x + handForward.z * handForward.z);
  const pitch = Math.atan2(handForward.y, horizontalMag) * (180 / Math.PI);
  
  return pitch;
}

/**
 * Calculate instrument axis angle (the angle of a held instrument)
 * This is the angle of the imaginary line between thumb tip and index tip
 */
function calculateInstrumentAxis(landmarks: HandLandmark[], handedness: 'Left' | 'Right' = 'Right'): number {
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const indexTip = landmarks[LANDMARKS.INDEX_TIP];
  
  // 2D angle from horizontal in the view plane
  return angle2DFromHorizontal(thumbTip, indexTip, handedness);
}

/**
 * Calculate confidence in the angle measurements based on landmark visibility
 */
function calculateConfidence(landmarks: HandLandmark[]): number {
  if (!landmarks || landmarks.length < 21) return 0;
  
  // Check for reasonable landmark positions
  let validPoints = 0;
  for (const lm of landmarks) {
    if (lm.x >= 0 && lm.x <= 1 && lm.y >= 0 && lm.y <= 1) {
      validPoints++;
    }
  }
  
  // Check for reasonable hand proportions
  const wrist = landmarks[LANDMARKS.WRIST];
  const middleTip = landmarks[LANDMARKS.MIDDLE_TIP];
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
  const pinkyMcp = landmarks[LANDMARKS.PINKY_MCP];
  
  const handLength = magnitude(createVector(wrist, middleTip));
  const palmWidth = magnitude(createVector(indexMcp, pinkyMcp));
  
  // Hand should have reasonable proportions
  const proportionValid = handLength > 0.05 && palmWidth > 0.02 && handLength / palmWidth > 1.5 && handLength / palmWidth < 4;
  
  let confidence = validPoints / 21;
  if (proportionValid) {
    confidence = Math.min(1, confidence + 0.1);
  } else {
    confidence = Math.max(0, confidence - 0.2);
  }
  
  return confidence;
}

/**
 * Calculate all surgical angle metrics from landmarks
 * @param landmarks - Array of 21 hand landmarks from MediaPipe
 * @param handedness - 'Left' or 'Right' hand for consistent angle measurement
 */
export function calculateSurgicalAngles(landmarks: HandLandmark[], handedness: 'Left' | 'Right' = 'Right'): SurgicalAngleMetrics {
  if (!landmarks || landmarks.length < 21) {
    return {
      scalpelAngle: 0,
      wristFlexion: 0,
      wristPronation: 0,
      wristDeviation: 0,
      pinchAperture: 0,
      indexFlexion: 0,
      thumbOpposition: 0,
      handRoll: 0,
      handPitch: 0,
      instrumentAxis: 0,
      confidence: 0,
    };
  }

  const wrist = landmarks[LANDMARKS.WRIST];
  const indexTip = landmarks[LANDMARKS.INDEX_TIP];

  return {
    // Primary scalpel angle (2D angle from wrist to index tip)
    // Pass handedness for consistent measurement across both hands
    scalpelAngle: angle2DFromHorizontal(wrist, indexTip, handedness),
    
    // Wrist angles
    wristFlexion: calculateWristFlexion(landmarks),
    wristPronation: calculateWristPronation(landmarks),
    wristDeviation: calculateWristDeviation(landmarks),
    
    // Grip metrics
    pinchAperture: calculatePinchAperture(landmarks),
    indexFlexion: calculateIndexFlexion(landmarks),
    thumbOpposition: calculateThumbOpposition(landmarks),
    
    // Hand orientation
    handRoll: calculateHandRoll(landmarks),
    handPitch: calculateHandPitch(landmarks),
    
    // Instrument angle (pass handedness for consistent measurement)
    instrumentAxis: calculateInstrumentAxis(landmarks, handedness),
    
    // Confidence
    confidence: calculateConfidence(landmarks),
  };
}

/**
 * Get a normalized scalpel angle that's always positive and relative to a reference
 * This is more intuitive for UI display
 */
export function getNormalizedScalpelAngle(rawAngle: number): number {
  // Convert to 0-180 range where 0 is horizontal pointing right, 90 is pointing up
  let normalized = rawAngle;
  if (normalized < -180) normalized += 360;
  if (normalized > 180) normalized -= 360;
  return Math.abs(normalized);
}

/**
 * Calculate the difference between current angle and target
 * Returns both the raw difference and a direction hint
 */
export function calculateAngleDifference(
  current: number,
  target: number
): { diff: number; direction: 'clockwise' | 'counterclockwise' | 'on_target' } {
  let diff = current - target;
  
  // Normalize to -180 to 180 range
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  
  const absDiff = Math.abs(diff);
  
  if (absDiff < 5) {
    return { diff: absDiff, direction: 'on_target' };
  }
  
  return {
    diff: absDiff,
    direction: diff > 0 ? 'counterclockwise' : 'clockwise',
  };
}

/**
 * Check if angles are within surgical tolerance
 */
export function isWithinSurgicalTolerance(
  current: SurgicalAngleMetrics,
  target: Partial<SurgicalAngleMetrics>,
  tolerances: Partial<Record<keyof SurgicalAngleMetrics, number>> = {}
): Record<keyof Omit<SurgicalAngleMetrics, 'confidence'>, boolean> {
  const defaultTolerance = 15;
  
  return {
    scalpelAngle: Math.abs(current.scalpelAngle - (target.scalpelAngle ?? 0)) <= (tolerances.scalpelAngle ?? defaultTolerance),
    wristFlexion: Math.abs(current.wristFlexion - (target.wristFlexion ?? 0)) <= (tolerances.wristFlexion ?? 20),
    wristPronation: Math.abs(current.wristPronation - (target.wristPronation ?? 0)) <= (tolerances.wristPronation ?? 20),
    wristDeviation: Math.abs(current.wristDeviation - (target.wristDeviation ?? 0)) <= (tolerances.wristDeviation ?? 10),
    pinchAperture: Math.abs(current.pinchAperture - (target.pinchAperture ?? 30)) <= (tolerances.pinchAperture ?? 15),
    indexFlexion: Math.abs(current.indexFlexion - (target.indexFlexion ?? 45)) <= (tolerances.indexFlexion ?? 20),
    thumbOpposition: Math.abs(current.thumbOpposition - (target.thumbOpposition ?? 60)) <= (tolerances.thumbOpposition ?? 20),
    handRoll: Math.abs(current.handRoll - (target.handRoll ?? 0)) <= (tolerances.handRoll ?? 30),
    handPitch: Math.abs(current.handPitch - (target.handPitch ?? 0)) <= (tolerances.handPitch ?? 20),
    instrumentAxis: Math.abs(current.instrumentAxis - (target.instrumentAxis ?? 0)) <= (tolerances.instrumentAxis ?? 15),
  };
}
