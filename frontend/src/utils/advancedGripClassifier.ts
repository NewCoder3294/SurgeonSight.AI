/**
 * Advanced Grip Classifier for Surgical Training
 * 
 * Uses ML-like feature extraction and weighted scoring to classify
 * surgical instrument grips with high accuracy:
 * - Pencil grip (precision)
 * - Power grip (force)
 * - Tripod grip (3-finger precision)
 * - Pinch grip (2-finger precision)
 * - Modified tripod (surgical variation)
 * - Needle driver grip
 */

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

// MediaPipe landmark indices
const LANDMARKS = {
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
 * Grip classification result
 */
export interface GripClassification {
  // Primary grip type
  type: GripType;
  
  // Confidence in classification (0-1)
  confidence: number;
  
  // Sub-type or variation
  variant?: string;
  
  // Detailed scores for each grip type
  scores: Record<GripType, number>;
  
  // Feature values used for classification
  features: GripFeatures;
  
  // Recommendations for improvement
  recommendations: string[];
  
  // Quality metrics
  quality: GripQuality;
}

export type GripType = 
  | 'pencil'
  | 'power'
  | 'tripod'
  | 'pinch'
  | 'modified_tripod'
  | 'needle_driver'
  | 'palm'
  | 'unknown';

/**
 * Features extracted for grip classification
 */
export interface GripFeatures {
  // Thumb-index distance (normalized)
  thumbIndexDistance: number;
  
  // Thumb-middle distance (normalized)
  thumbMiddleDistance: number;
  
  // Index finger flexion (0 = straight, 1 = fully flexed)
  indexFlexion: number;
  
  // Middle finger flexion
  middleFlexion: number;
  
  // Ring finger flexion
  ringFlexion: number;
  
  // Pinky finger flexion
  pinkyFlexion: number;
  
  // Thumb opposition (how opposed to palm)
  thumbOpposition: number;
  
  // Finger spread (index to pinky distance)
  fingerSpread: number;
  
  // Palm arch (curvature of MCP joints)
  palmArch: number;
  
  // Wrist angle from neutral
  wristAngle: number;
  
  // Thumb-palm angle
  thumbPalmAngle: number;
  
  // Hand openness (0 = closed fist, 1 = fully open)
  handOpenness: number;
  
  // Pinch configuration score
  pinchScore: number;
  
  // Tripod configuration score
  tripodScore: number;
  
  // Power grasp score
  powerScore: number;
}

/**
 * Grip quality metrics
 */
export interface GripQuality {
  // Overall quality score (0-100)
  overall: number;
  
  // Stability of grip (0-100)
  stability: number;
  
  // Precision potential (0-100)
  precision: number;
  
  // Force potential (0-100)
  force: number;
  
  // Fatigue risk (0-100, lower is better)
  fatigueRisk: number;
  
  // Ergonomic score (0-100)
  ergonomic: number;
}

/**
 * Calculate 3D distance between two landmarks
 */
function distance3D(a: HandLandmark, b: HandLandmark): number {
  return Math.sqrt(
    (b.x - a.x) ** 2 +
    (b.y - a.y) ** 2 +
    (b.z - a.z) ** 2
  );
}

/**
 * Calculate 2D distance (ignoring depth)
 */
function distance2D(a: HandLandmark, b: HandLandmark): number {
  return Math.sqrt(
    (b.x - a.x) ** 2 +
    (b.y - a.y) ** 2
  );
}

/**
 * Calculate angle between three points (vertex at middle point)
 */
function angle3Points(a: HandLandmark, b: HandLandmark, c: HandLandmark): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x ** 2 + v1.y ** 2 + v1.z ** 2);
  const mag2 = Math.sqrt(v2.x ** 2 + v2.y ** 2 + v2.z ** 2);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.acos(cosAngle) * (180 / Math.PI);
}

/**
 * Calculate finger flexion (0 = straight, 1 = fully flexed)
 */
function calculateFingerFlexion(
  mcp: HandLandmark,
  pip: HandLandmark,
  dip: HandLandmark,
  tip: HandLandmark
): number {
  // Calculate angles at each joint
  const pipAngle = angle3Points(mcp, pip, dip);
  const dipAngle = angle3Points(pip, dip, tip);
  
  // Straight finger: angles close to 180°
  // Fully bent: angles close to 60°
  const avgAngle = (pipAngle + dipAngle) / 2;
  
  // Normalize to 0-1 (straight to bent)
  return Math.max(0, Math.min(1, (180 - avgAngle) / 120));
}

/**
 * Calculate thumb opposition score (how much thumb is opposed)
 */
function calculateThumbOpposition(landmarks: HandLandmark[]): number {
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const thumbMcp = landmarks[LANDMARKS.THUMB_MCP];
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
  const pinkyMcp = landmarks[LANDMARKS.PINKY_MCP];
  
  // Vector across palm
  const palmVector = {
    x: pinkyMcp.x - indexMcp.x,
    y: pinkyMcp.y - indexMcp.y,
    z: pinkyMcp.z - indexMcp.z,
  };
  
  // Thumb direction
  const thumbVector = {
    x: thumbTip.x - thumbMcp.x,
    y: thumbTip.y - thumbMcp.y,
    z: thumbTip.z - thumbMcp.z,
  };
  
  // Calculate how much thumb points across palm
  const dot = palmVector.x * thumbVector.x + palmVector.y * thumbVector.y + palmVector.z * thumbVector.z;
  const mag1 = Math.sqrt(palmVector.x ** 2 + palmVector.y ** 2 + palmVector.z ** 2);
  const mag2 = Math.sqrt(thumbVector.x ** 2 + thumbVector.y ** 2 + thumbVector.z ** 2);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  const cosAngle = dot / (mag1 * mag2);
  
  // Opposition is highest when thumb points toward pinky side
  return Math.max(0, cosAngle);
}

/**
 * Calculate palm arch (curvature of MCP joints)
 */
function calculatePalmArch(landmarks: HandLandmark[]): number {
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
  const middleMcp = landmarks[LANDMARKS.MIDDLE_MCP];
  const ringMcp = landmarks[LANDMARKS.RING_MCP];
  const pinkyMcp = landmarks[LANDMARKS.PINKY_MCP];
  
  // Calculate the "curvature" of the MCP line
  // A flat palm has MCPs in a line, arched palm has curve
  const midpoint = {
    x: (indexMcp.x + pinkyMcp.x) / 2,
    y: (indexMcp.y + pinkyMcp.y) / 2,
    z: (indexMcp.z + pinkyMcp.z) / 2,
  };
  
  // Distance of middle MCPs from the line
  const middleDev = distance3D(middleMcp, midpoint);
  const ringDev = distance3D(ringMcp, midpoint);
  
  // Palm width for normalization
  const palmWidth = distance3D(indexMcp, pinkyMcp);
  if (palmWidth === 0) return 0;
  
  return (middleDev + ringDev) / (2 * palmWidth);
}

/**
 * Extract all features from landmarks
 */
function extractFeatures(landmarks: HandLandmark[]): GripFeatures {
  if (!landmarks || landmarks.length < 21) {
    return getDefaultFeatures();
  }
  
  const wrist = landmarks[LANDMARKS.WRIST];
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const indexTip = landmarks[LANDMARKS.INDEX_TIP];
  const middleTip = landmarks[LANDMARKS.MIDDLE_TIP];
  const ringTip = landmarks[LANDMARKS.RING_TIP];
  const pinkyTip = landmarks[LANDMARKS.PINKY_TIP];
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
  const pinkyMcp = landmarks[LANDMARKS.PINKY_MCP];
  
  // Palm size for normalization
  const palmWidth = distance3D(indexMcp, pinkyMcp);
  const handLength = distance3D(wrist, middleTip);
  const normalizer = (palmWidth + handLength) / 2 || 1;
  
  // Calculate finger flexions
  const indexFlexion = calculateFingerFlexion(
    landmarks[LANDMARKS.INDEX_MCP],
    landmarks[LANDMARKS.INDEX_PIP],
    landmarks[LANDMARKS.INDEX_DIP],
    landmarks[LANDMARKS.INDEX_TIP]
  );
  
  const middleFlexion = calculateFingerFlexion(
    landmarks[LANDMARKS.MIDDLE_MCP],
    landmarks[LANDMARKS.MIDDLE_PIP],
    landmarks[LANDMARKS.MIDDLE_DIP],
    landmarks[LANDMARKS.MIDDLE_TIP]
  );
  
  const ringFlexion = calculateFingerFlexion(
    landmarks[LANDMARKS.RING_MCP],
    landmarks[LANDMARKS.RING_PIP],
    landmarks[LANDMARKS.RING_DIP],
    landmarks[LANDMARKS.RING_TIP]
  );
  
  const pinkyFlexion = calculateFingerFlexion(
    landmarks[LANDMARKS.PINKY_MCP],
    landmarks[LANDMARKS.PINKY_PIP],
    landmarks[LANDMARKS.PINKY_DIP],
    landmarks[LANDMARKS.PINKY_TIP]
  );
  
  // Calculate distances
  const thumbIndexDistance = distance3D(thumbTip, indexTip) / normalizer;
  const thumbMiddleDistance = distance3D(thumbTip, middleTip) / normalizer;
  const fingerSpread = distance3D(indexTip, pinkyTip) / normalizer;
  
  // Thumb opposition
  const thumbOpposition = calculateThumbOpposition(landmarks);
  
  // Palm arch
  const palmArch = calculatePalmArch(landmarks);
  
  // Wrist angle
  const wristAngle = angle3Points(
    landmarks[LANDMARKS.MIDDLE_MCP],
    wrist,
    { x: wrist.x, y: wrist.y + 0.1, z: wrist.z } // Point below wrist
  );
  
  // Thumb-palm angle
  const thumbPalmAngle = angle3Points(
    landmarks[LANDMARKS.THUMB_TIP],
    landmarks[LANDMARKS.THUMB_CMC],
    wrist
  );
  
  // Hand openness (average of inverse flexions)
  const handOpenness = 1 - (indexFlexion + middleFlexion + ringFlexion + pinkyFlexion) / 4;
  
  // Calculate composite scores
  const pinchScore = calculatePinchScore(thumbIndexDistance, indexFlexion, thumbOpposition);
  const tripodScore = calculateTripodScore(thumbIndexDistance, thumbMiddleDistance, indexFlexion, middleFlexion);
  const powerScore = calculatePowerScore(indexFlexion, middleFlexion, ringFlexion, pinkyFlexion, palmArch);
  
  return {
    thumbIndexDistance,
    thumbMiddleDistance,
    indexFlexion,
    middleFlexion,
    ringFlexion,
    pinkyFlexion,
    thumbOpposition,
    fingerSpread,
    palmArch,
    wristAngle,
    thumbPalmAngle,
    handOpenness,
    pinchScore,
    tripodScore,
    powerScore,
  };
}

function getDefaultFeatures(): GripFeatures {
  return {
    thumbIndexDistance: 0.5,
    thumbMiddleDistance: 0.5,
    indexFlexion: 0.5,
    middleFlexion: 0.5,
    ringFlexion: 0.5,
    pinkyFlexion: 0.5,
    thumbOpposition: 0.5,
    fingerSpread: 0.5,
    palmArch: 0.5,
    wristAngle: 0,
    thumbPalmAngle: 90,
    handOpenness: 0.5,
    pinchScore: 0,
    tripodScore: 0,
    powerScore: 0,
  };
}

/**
 * Calculate pinch configuration score
 */
function calculatePinchScore(
  thumbIndexDist: number,
  indexFlexion: number,
  thumbOpposition: number
): number {
  // Ideal pinch: close thumb-index, moderate flexion, good opposition
  const distScore = Math.max(0, 1 - thumbIndexDist * 3);
  const flexScore = 1 - Math.abs(indexFlexion - 0.3);
  const oppScore = thumbOpposition;
  
  return (distScore * 0.5 + flexScore * 0.3 + oppScore * 0.2);
}

/**
 * Calculate tripod configuration score
 */
function calculateTripodScore(
  thumbIndexDist: number,
  thumbMiddleDist: number,
  indexFlexion: number,
  middleFlexion: number
): number {
  // Ideal tripod: thumb near index and middle, moderate flexion
  const distScore = Math.max(0, 1 - (thumbIndexDist + thumbMiddleDist) * 1.5);
  const flexScore = 1 - Math.abs((indexFlexion + middleFlexion) / 2 - 0.4);
  
  return (distScore * 0.6 + flexScore * 0.4);
}

/**
 * Calculate power grasp score
 */
function calculatePowerScore(
  indexFlexion: number,
  middleFlexion: number,
  ringFlexion: number,
  pinkyFlexion: number,
  palmArch: number
): number {
  // Ideal power grip: high flexion in all fingers, arched palm
  const avgFlexion = (indexFlexion + middleFlexion + ringFlexion + pinkyFlexion) / 4;
  const archBonus = Math.min(1, palmArch * 2);
  
  return avgFlexion * 0.8 + archBonus * 0.2;
}

/**
 * Score each grip type based on features
 */
function scoreGripTypes(features: GripFeatures): Record<GripType, number> {
  const scores: Record<GripType, number> = {
    pencil: 0,
    power: 0,
    tripod: 0,
    pinch: 0,
    modified_tripod: 0,
    needle_driver: 0,
    palm: 0,
    unknown: 0.1, // Base unknown score
  };
  
  // PENCIL GRIP
  // - Close thumb-index distance
  // - Moderate index flexion
  // - Ring and pinky curled
  scores.pencil = 
    (features.pinchScore * 0.3) +
    (features.thumbIndexDistance < 0.2 ? 0.3 : 0) +
    (features.indexFlexion > 0.2 && features.indexFlexion < 0.5 ? 0.2 : 0) +
    (features.ringFlexion > 0.5 ? 0.1 : 0) +
    (features.pinkyFlexion > 0.5 ? 0.1 : 0);
  
  // POWER GRIP
  // - All fingers flexed
  // - Thumb wrapped
  // - High palm arch
  scores.power =
    (features.powerScore * 0.4) +
    (features.indexFlexion > 0.6 ? 0.15 : 0) +
    (features.middleFlexion > 0.6 ? 0.15 : 0) +
    (features.ringFlexion > 0.6 ? 0.1 : 0) +
    (features.pinkyFlexion > 0.6 ? 0.1 : 0) +
    (features.thumbOpposition > 0.3 ? 0.1 : 0);
  
  // TRIPOD GRIP
  // - Thumb, index, middle close together
  // - Ring and pinky can be extended or curled
  scores.tripod =
    (features.tripodScore * 0.4) +
    (features.thumbIndexDistance < 0.25 ? 0.2 : 0) +
    (features.thumbMiddleDistance < 0.3 ? 0.2 : 0) +
    (features.indexFlexion > 0.2 && features.indexFlexion < 0.6 ? 0.1 : 0) +
    (features.middleFlexion > 0.2 && features.middleFlexion < 0.6 ? 0.1 : 0);
  
  // PINCH GRIP (pure 2-finger)
  // - Very close thumb-index
  // - Other fingers extended
  scores.pinch =
    (features.pinchScore * 0.3) +
    (features.thumbIndexDistance < 0.15 ? 0.3 : 0) +
    (features.middleFlexion < 0.3 ? 0.1 : 0) +
    (features.ringFlexion < 0.3 ? 0.1 : 0) +
    (features.pinkyFlexion < 0.3 ? 0.1 : 0) +
    (features.thumbOpposition > 0.4 ? 0.1 : 0);
  
  // MODIFIED TRIPOD (surgical variation)
  // - Like tripod but with more specific angles
  scores.modified_tripod =
    (features.tripodScore * 0.3) +
    (features.thumbIndexDistance < 0.2 && features.thumbIndexDistance > 0.1 ? 0.2 : 0) +
    (features.thumbMiddleDistance < 0.25 && features.thumbMiddleDistance > 0.1 ? 0.2 : 0) +
    (features.wristAngle > 10 && features.wristAngle < 40 ? 0.15 : 0) +
    (features.ringFlexion > 0.4 ? 0.08 : 0) +
    (features.pinkyFlexion > 0.4 ? 0.07 : 0);
  
  // NEEDLE DRIVER GRIP
  // - Thumb through one ring, fingers through other
  // - Specific finger configuration
  scores.needle_driver =
    (features.indexFlexion > 0.4 && features.indexFlexion < 0.7 ? 0.2 : 0) +
    (features.middleFlexion > 0.4 && features.middleFlexion < 0.7 ? 0.2 : 0) +
    (features.thumbPalmAngle > 60 && features.thumbPalmAngle < 120 ? 0.2 : 0) +
    (features.ringFlexion > 0.3 ? 0.2 : 0) +
    (features.fingerSpread < 0.4 ? 0.2 : 0);
  
  // PALM GRIP (full palm contact)
  // - Very high flexion
  // - Minimal finger spread
  scores.palm =
    (features.powerScore > 0.7 ? 0.3 : 0) +
    (features.handOpenness < 0.2 ? 0.3 : 0) +
    (features.fingerSpread < 0.3 ? 0.2 : 0) +
    (features.palmArch > 0.3 ? 0.2 : 0);
  
  return scores;
}

/**
 * Calculate grip quality metrics
 */
function calculateGripQuality(features: GripFeatures, gripType: GripType): GripQuality {
  // Base quality varies by grip type
  const baseQuality: Record<GripType, { precision: number; force: number }> = {
    pencil: { precision: 90, force: 40 },
    power: { precision: 30, force: 90 },
    tripod: { precision: 85, force: 50 },
    pinch: { precision: 95, force: 25 },
    modified_tripod: { precision: 88, force: 45 },
    needle_driver: { precision: 80, force: 60 },
    palm: { precision: 20, force: 95 },
    unknown: { precision: 50, force: 50 },
  };
  
  const base = baseQuality[gripType];
  
  // Adjust precision based on finger control
  const precisionMod = 1 - Math.abs(features.indexFlexion - 0.3) * 0.3;
  const precision = Math.min(100, base.precision * precisionMod);
  
  // Adjust force based on grip strength indicators
  const forceMod = features.powerScore * 0.5 + 0.5;
  const force = Math.min(100, base.force * forceMod);
  
  // Stability based on consistency of grip configuration
  const stability = Math.min(100, 
    (1 - Math.abs(features.indexFlexion - features.middleFlexion)) * 50 +
    features.thumbOpposition * 30 +
    (features.palmArch > 0.1 ? 20 : 0)
  );
  
  // Fatigue risk - higher for extreme positions
  const fatigueRisk = Math.min(100,
    Math.abs(features.wristAngle - 15) * 2 + // Deviation from neutral wrist
    (features.indexFlexion > 0.8 ? 30 : 0) + // Extreme flexion
    (features.handOpenness < 0.1 || features.handOpenness > 0.9 ? 20 : 0) // Extreme positions
  );
  
  // Ergonomic score - inverse of fatigue risk with bonus for good positions
  const ergonomic = Math.max(0, Math.min(100,
    100 - fatigueRisk +
    (features.wristAngle > 10 && features.wristAngle < 30 ? 15 : 0) + // Good wrist angle
    (features.thumbOpposition > 0.3 && features.thumbOpposition < 0.7 ? 10 : 0) // Good thumb position
  ));
  
  // Overall quality
  const overall = (precision * 0.3 + force * 0.2 + stability * 0.25 + ergonomic * 0.25);
  
  return {
    overall: Math.round(overall),
    stability: Math.round(stability),
    precision: Math.round(precision),
    force: Math.round(force),
    fatigueRisk: Math.round(fatigueRisk),
    ergonomic: Math.round(ergonomic),
  };
}

/**
 * Generate recommendations for grip improvement
 */
function generateRecommendations(
  features: GripFeatures,
  gripType: GripType,
  targetGrip?: GripType
): string[] {
  const recommendations: string[] = [];
  
  // Wrist position recommendations
  if (features.wristAngle > 45) {
    recommendations.push('Reduce wrist extension - current angle is too high');
  } else if (features.wristAngle < 5) {
    recommendations.push('Add slight wrist extension for better control');
  }
  
  // Grip-specific recommendations
  if (targetGrip === 'pencil' || (targetGrip === undefined && gripType === 'pencil')) {
    if (features.thumbIndexDistance > 0.25) {
      recommendations.push('Bring thumb closer to index finger for pencil grip');
    }
    if (features.ringFlexion < 0.4) {
      recommendations.push('Curl ring and pinky fingers more');
    }
    if (features.indexFlexion > 0.6) {
      recommendations.push('Relax index finger slightly - too much flexion');
    }
  }
  
  if (targetGrip === 'tripod' || (targetGrip === undefined && gripType === 'tripod')) {
    if (features.thumbMiddleDistance > 0.3) {
      recommendations.push('Engage middle finger closer to thumb');
    }
    if (features.indexFlexion > 0.7 || features.middleFlexion > 0.7) {
      recommendations.push('Relax grip - fingers too tense');
    }
  }
  
  // General recommendations
  if (features.handOpenness < 0.15) {
    recommendations.push('Grip is too tight - relax hand slightly');
  }
  
  if (features.thumbOpposition < 0.2) {
    recommendations.push('Oppose thumb more for better control');
  }
  
  // Fatigue prevention
  if (features.indexFlexion > 0.8 && features.middleFlexion > 0.8) {
    recommendations.push('Excessive flexion may cause fatigue - consider loosening grip');
  }
  
  return recommendations.slice(0, 3); // Max 3 recommendations
}

/**
 * Main grip classification function
 */
export function classifyGrip(
  landmarks: HandLandmark[],
  targetGrip?: GripType
): GripClassification {
  if (!landmarks || landmarks.length < 21) {
    return {
      type: 'unknown',
      confidence: 0,
      scores: {
        pencil: 0,
        power: 0,
        tripod: 0,
        pinch: 0,
        modified_tripod: 0,
        needle_driver: 0,
        palm: 0,
        unknown: 1,
      },
      features: getDefaultFeatures(),
      recommendations: ['Position hand in camera view'],
      quality: {
        overall: 0,
        stability: 0,
        precision: 0,
        force: 0,
        fatigueRisk: 0,
        ergonomic: 0,
      },
    };
  }
  
  // Extract features
  const features = extractFeatures(landmarks);
  
  // Score each grip type
  const scores = scoreGripTypes(features);
  
  // Find best match
  let bestType: GripType = 'unknown';
  let bestScore = 0;
  
  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type as GripType;
    }
  }
  
  // Normalize scores to sum to 1
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const normalizedScores: Record<GripType, number> = {} as Record<GripType, number>;
  for (const [type, score] of Object.entries(scores)) {
    normalizedScores[type as GripType] = totalScore > 0 ? score / totalScore : 0;
  }
  
  // Calculate confidence (how much better is best vs second best)
  const sortedScores = Object.values(scores).sort((a, b) => b - a);
  const confidence = sortedScores[0] > 0 
    ? Math.min(1, (sortedScores[0] - sortedScores[1]) / sortedScores[0] + 0.3)
    : 0;
  
  // Calculate quality
  const quality = calculateGripQuality(features, bestType);
  
  // Generate recommendations
  const recommendations = generateRecommendations(features, bestType, targetGrip);
  
  // Determine variant
  let variant: string | undefined;
  if (bestType === 'pencil' && features.ringFlexion > 0.7 && features.pinkyFlexion > 0.7) {
    variant = 'dynamic';
  } else if (bestType === 'tripod' && features.thumbOpposition > 0.6) {
    variant = 'lateral';
  }
  
  return {
    type: bestType,
    confidence: Math.min(1, Math.max(0, confidence)),
    variant,
    scores: normalizedScores,
    features,
    recommendations,
    quality,
  };
}

/**
 * Check if grip matches a target grip type
 */
export function matchesTargetGrip(
  classification: GripClassification,
  targetGrip: GripType,
  minConfidence: number = 0.5
): boolean {
  return classification.type === targetGrip && classification.confidence >= minConfidence;
}

/**
 * Get human-readable description of grip
 */
export function getGripDescription(classification: GripClassification): string {
  const descriptions: Record<GripType, string> = {
    pencil: 'Pencil grip (precision)',
    power: 'Power grip (force)',
    tripod: 'Tripod grip (3-finger)',
    pinch: 'Pinch grip (2-finger)',
    modified_tripod: 'Modified tripod (surgical)',
    needle_driver: 'Needle driver grip',
    palm: 'Palm grip',
    unknown: 'Unrecognized grip',
  };
  
  let desc = descriptions[classification.type];
  
  if (classification.variant) {
    desc += ` - ${classification.variant} variant`;
  }
  
  return desc;
}
