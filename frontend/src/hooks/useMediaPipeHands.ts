/**
 * useMediaPipeHands - Real-time hand tracking with surgical metrics
 * 
 * UPGRADED VERSION with advanced filtering and analysis:
 * - One Euro / Kalman filtering for smooth, stable tracking
 * - Advanced 3D angle calculations (pronation, supination, flexion)
 * - Real-time tremor analysis
 * - ML-like grip classification with quality scores
 * 
 * Maintains backward compatibility with existing code.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { OneEuroFilter } from '../utils/kalmanFilter';
import { calculateSurgicalAngles } from '../utils/surgicalAngles';
import { TremorAnalyzer } from '../utils/tremorAnalysis';
import { classifyGrip as advancedClassifyGrip } from '../utils/advancedGripClassifier';

// MediaPipe landmark indices
const WRIST = 0;

const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_DIP = 7;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_TIP = 20;

// One Euro Filter for smooth, responsive filtering
class MetricFilter {
    private filter: OneEuroFilter;

    constructor(initialValue: number = 0, minCutoff: number = 1.0, beta: number = 0.007) {
        this.filter = new OneEuroFilter(initialValue, minCutoff, beta);
    }

    update(value: number): number {
        return this.filter.update(value);
    }

    reset(value: number): void {
        this.filter.reset(value);
    }
}

// Legacy EMA for backward compatibility fallback
function ema(current: number, previous: number | null, alpha = 0.3): number {
    if (previous === null) return current;
    return alpha * current + (1 - alpha) * previous;
}

export interface HandLandmark {
    x: number;
    y: number;
    z: number;
}

export interface SurgicalMetrics {
    scalpelAngle: number;      // Degrees from horizontal
    pinchAngle: number;        // Angle between thumb and index finger
    fingerBend: number;        // Index finger bend percentage (0=straight, 100=fully bent)
    steadiness: number;        // 0-100 (100 = perfectly still)
    speed: number;             // Motion speed in normalized units
    gripType: 'pencil' | 'power' | 'unknown';
    gripConfidence: number;    // 0-1

    // Advanced metrics (new)
    wristPronation?: number;   // Pronation/supination angle
    wristFlexion?: number;     // Flexion/extension angle
    tremorSeverity?: number;   // 0-100 tremor severity
    gripQuality?: number;      // 0-100 grip quality score
    trackingConfidence?: number; // 0-1 confidence in tracking
}

export interface HandData {
    landmarks: HandLandmark[];
    handedness: 'Left' | 'Right';
    metrics: SurgicalMetrics;
}

interface UseMediaPipeHandsOptions {
    videoElement: HTMLVideoElement | null;
    enabled?: boolean;
    targetFps?: number;
    onHandsDetected?: (hands: HandData[]) => void;
    // Advanced options (new)
    useAdvancedFiltering?: boolean;   // Use One Euro / Kalman filtering
    useAdvancedGrip?: boolean;        // Use ML-like grip classification
    useTremorAnalysis?: boolean;      // Enable tremor detection
}

// Type for the callback ref
type HandsDetectedCallback = (hands: HandData[]) => void;

// Calculate angle between two vectors in degrees
function calculateAngle(p1: HandLandmark, p2: HandLandmark): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const radians = Math.atan2(dy, dx);
    return radians * (180 / Math.PI);
}

// Calculate angle between three points (vertex at p2)
function calculateAngle3Points(p1: HandLandmark, p2: HandLandmark, p3: HandLandmark): number {
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    const dot = v1.x * v2.x + v1.y * v2.y;
    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

    if (mag1 === 0 || mag2 === 0) return 0;

    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    return Math.acos(cosAngle) * (180 / Math.PI);
}

// Calculate finger bend (0 = straight, 100 = fully bent)
function calculateFingerBend(landmarks: HandLandmark[]): number {
    const mcp = landmarks[INDEX_MCP];
    const pip = landmarks[INDEX_PIP];
    const dip = landmarks[INDEX_DIP];
    const tip = landmarks[INDEX_TIP];

    // Calculate angles at PIP and DIP joints
    const pipAngle = calculateAngle3Points(mcp, pip, dip);
    const dipAngle = calculateAngle3Points(pip, dip, tip);

    // Straight finger = ~180°, bent = smaller angle
    // Convert to percentage (180° = 0%, 60° = 100%)
    const avgAngle = (pipAngle + dipAngle) / 2;
    const bendPercent = Math.max(0, Math.min(100, (180 - avgAngle) / 1.2));

    return bendPercent;
}

// Calculate distance between two points
function distance(p1: HandLandmark, p2: HandLandmark): number {
    return Math.sqrt(
        Math.pow(p2.x - p1.x, 2) +
        Math.pow(p2.y - p1.y, 2) +
        Math.pow(p2.z - p1.z, 2)
    );
}

// Classify grip type based on finger positions with adaptive thresholds
function classifyGrip(landmarks: HandLandmark[]): { type: 'pencil' | 'power' | 'unknown'; confidence: number } {
    if (landmarks.length < 21) {
        return { type: 'unknown', confidence: 0 };
    }

    const wrist = landmarks[WRIST];
    const thumbTip = landmarks[THUMB_TIP];
    const indexTip = landmarks[INDEX_TIP];
    const indexMcp = landmarks[INDEX_MCP];
    const middleTip = landmarks[MIDDLE_TIP];
    const ringTip = landmarks[RING_TIP];
    const pinkyTip = landmarks[PINKY_TIP];
    const pinkyMcp = landmarks[PINKY_MCP];

    // Calculate adaptive thresholds based on palm width
    const palmWidth = distance(indexMcp, pinkyMcp);
    const wristToIndex = distance(wrist, indexTip);
    const handSize = wristToIndex;

    // Pencil grip: thumb and index close together, other fingers curled
    const thumbIndexDist = distance(thumbTip, indexTip);
    const indexMiddleDist = distance(indexTip, middleTip);

    // Normalize distances by hand size
    const normalizedThumbIndex = thumbIndexDist / handSize;
    const normalizedIndexMiddle = indexMiddleDist / handSize;

    // Adaptive thresholds based on palm width
    const pencilThreshold = palmWidth * 0.6;  // ~60% of palm width
    const curlThreshold = palmWidth * 1.2;    // Curled fingers closer to wrist

    // Check ring and pinky curl (distance from wrist relative to index)
    const ringDist = distance(wrist, ringTip);
    const pinkyDist = distance(wrist, pinkyTip);

    // Pencil grip: thumb-index pinch + other fingers curled
    if (thumbIndexDist < pencilThreshold && ringDist < curlThreshold && pinkyDist < curlThreshold) {
        // Calculate confidence based on how well it matches pencil grip
        const pinchScore = 1 - (thumbIndexDist / pencilThreshold);
        const curlScore = 1 - ((ringDist + pinkyDist) / (2 * curlThreshold));
        const confidence = Math.min(0.95, 0.6 + (pinchScore + curlScore) * 0.2);
        return { type: 'pencil', confidence };
    }

    // Power grip: all fingers grouped together, thumb wrapped
    if (normalizedThumbIndex < 0.4 && normalizedIndexMiddle < 0.25) {
        const groupScore = 1 - normalizedIndexMiddle / 0.25;
        const confidence = Math.min(0.9, 0.5 + groupScore * 0.3);
        return { type: 'power', confidence };
    }

    return { type: 'unknown', confidence: 0.3 };
}

// Calculate steadiness from position history, normalized by hand size
function calculateSteadiness(current: HandLandmark[], history: HandLandmark[][]): number {
    if (history.length < 3) return 70; // Not enough data, assume moderate steadiness

    const wristHistory = history.map(h => h[WRIST]).concat([current[WRIST]]);

    // Calculate variance of wrist position
    const avgX = wristHistory.reduce((sum, p) => sum + p.x, 0) / wristHistory.length;
    const avgY = wristHistory.reduce((sum, p) => sum + p.y, 0) / wristHistory.length;

    const variance = wristHistory.reduce((sum, p) => {
        return sum + Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2);
    }, 0) / wristHistory.length;

    // Calculate standard deviation and normalize by hand size
    const stdDev = Math.sqrt(variance);
    const handSize = distance(current[WRIST], current[INDEX_TIP]);

    // Avoid division by zero
    if (handSize < 0.01) return 50;

    // Normalized jitter: stdDev relative to hand size
    // A perfectly still hand has ~0 jitter, shaky hand has higher values
    const normalizedJitter = (stdDev / handSize) * 100;

    // Map to 0-100 steadiness scale
    // jitter of 0 = 100% steady, jitter of 50+ = 0% steady (forgiving scale)
    const steadiness = Math.max(0, Math.min(100, 100 - normalizedJitter * 2));
    return steadiness;
}

// Calculate motion speed in inches per second (estimated)
// Assumes typical webcam setup: hand ~2ft from camera, occupying ~30% of 640px frame
// Hand width ~3.5in maps to ~192px, so 1 normalized unit ≈ 6.5 inches
function calculateSpeed(current: HandLandmark[], prev: HandLandmark[] | null): number {
    if (!prev || prev.length < 21) return 0;

    const currentWrist = current[WRIST];
    const prevWrist = prev[WRIST];

    // Calculate normalized distance moved
    const normalizedDist = Math.sqrt(
        Math.pow(currentWrist.x - prevWrist.x, 2) +
        Math.pow(currentWrist.y - prevWrist.y, 2)
    );

    // Convert to inches: multiply by ~6.5 (estimated inches per normalized unit)
    // At 15 FPS, multiply by 15 to get inches/second
    const inchesPerFrame = normalizedDist * 6.5;
    const inchesPerSecond = inchesPerFrame * 15;  // Assuming ~15 FPS target

    return inchesPerSecond;
}

export function useMediaPipeHands({
    videoElement,
    enabled = true,
    targetFps = 60, // Default to 60fps for high-speed tracking (was 30)
    onHandsDetected,
    useAdvancedFiltering = true,  // Default to advanced filtering
    useAdvancedGrip = true,       // Default to advanced grip
    useTremorAnalysis = true      // Default to tremor analysis
}: UseMediaPipeHandsOptions) {
    const [hands, setHands] = useState<HandData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handLandmarkerRef = useRef<any>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);

    // Ref for callback to prevent infinite re-renders
    const onHandsDetectedRef = useRef<HandsDetectedCallback | undefined>(onHandsDetected);

    // Keep ref updated with latest callback
    useEffect(() => {
        onHandsDetectedRef.current = onHandsDetected;
    }, [onHandsDetected]);

    // Per-hand tracking using Maps keyed by handedness
    const landmarkHistoryRef = useRef<Map<string, HandLandmark[][]>>(new Map());
    const prevLandmarksRef = useRef<Map<string, HandLandmark[]>>(new Map());
    const prevMetricsRef = useRef<Map<string, SurgicalMetrics>>(new Map());

    // Advanced filtering per-hand (new)
    const angleFiltersRef = useRef<Map<string, MetricFilter>>(new Map());
    const steadinessFiltersRef = useRef<Map<string, MetricFilter>>(new Map());
    const speedFiltersRef = useRef<Map<string, MetricFilter>>(new Map());
    const tremorAnalyzersRef = useRef<Map<string, TremorAnalyzer>>(new Map());

    // Helper to get or create per-hand filters
    const getFilters = useCallback((handedness: string) => {
        if (!angleFiltersRef.current.has(handedness)) {
            angleFiltersRef.current.set(handedness, new MetricFilter(0, 1.5, 0.01));
        }
        if (!steadinessFiltersRef.current.has(handedness)) {
            steadinessFiltersRef.current.set(handedness, new MetricFilter(70, 0.5, 0.001));
        }
        if (!speedFiltersRef.current.has(handedness)) {
            speedFiltersRef.current.set(handedness, new MetricFilter(0, 1.0, 0.005));
        }
        if (!tremorAnalyzersRef.current.has(handedness)) {
            tremorAnalyzersRef.current.set(handedness, new TremorAnalyzer({ sampleRate: 60 }));
        }
        return {
            angle: angleFiltersRef.current.get(handedness)!,
            steadiness: steadinessFiltersRef.current.get(handedness)!,
            speed: speedFiltersRef.current.get(handedness)!,
            tremor: tremorAnalyzersRef.current.get(handedness)!,
        };
    }, []);

    // Initialize MediaPipe
    useEffect(() => {
        if (!enabled) return;

        const initMediaPipe = async () => {
            try {
                setIsLoading(true);

                // Dynamic import to handle SSR
                const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

                const vision = await FilesetResolver.forVisionTasks(
                    // Use specific version to match package.json and avoid mismatch
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
                );

                const handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                        delegate: 'GPU'
                    },
                    runningMode: 'VIDEO',
                    numHands: 2,
                    minHandDetectionConfidence: 0.7,  // Higher = fewer false positives
                    minHandPresenceConfidence: 0.6,
                    minTrackingConfidence: 0.3        // Lower = maintains tracking better during fast motion
                });

                handLandmarkerRef.current = handLandmarker;
                setIsLoading(false);
                console.log('✅ MediaPipe HandLandmarker initialized');
            } catch (err: any) {
                console.error('MediaPipe init error:', err);
                setError(err.message);
                setIsLoading(false);
            }
        };

        initMediaPipe();

        return () => {
            if (handLandmarkerRef.current) {
                handLandmarkerRef.current.close();
            }
        };
    }, [enabled]);

    // Process video frames
    const processFrame = useCallback((timestamp: number) => {
        if (!handLandmarkerRef.current || !videoElement) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
        }

        // Throttle to target FPS
        const frameInterval = 1000 / targetFps;
        if (timestamp - lastFrameTimeRef.current < frameInterval) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
        }
        lastFrameTimeRef.current = timestamp;

        // Check if video is ready
        if (videoElement.readyState < 2) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
            return;
        }

        try {
            const results = handLandmarkerRef.current.detectForVideo(videoElement, timestamp);

            if (results.landmarks && results.landmarks.length > 0) {
                const processedHands: HandData[] = results.landmarks.map((landmarks: any[], index: number) => {
                    // Get handedness first so we can use it as key for per-hand tracking
                    const handedness: 'Left' | 'Right' =
                        (results.handednesses?.[index]?.[0]?.categoryName as 'Left' | 'Right') || 'Right';

                    // Use original landmark coordinates - the canvas already has CSS -scale-x-100
                    // applied which handles the mirroring visually. No need to flip in code.
                    const mirroredLandmarks: HandLandmark[] = landmarks.map((lm: any) => ({
                        x: lm.x,  // Keep original X - CSS transform handles mirroring
                        y: lm.y,
                        z: lm.z
                    }));

                    // Get per-hand history and previous data
                    const handHistory = landmarkHistoryRef.current.get(handedness) || [];
                    const prevLandmarks = prevLandmarksRef.current.get(handedness) || null;
                    const prevMetrics = prevMetricsRef.current.get(handedness) || null;

                    // Get or create per-hand filters
                    const filters = getFilters(handedness);

                    // Calculate surgical metrics using original landmarks (for accurate angle math)
                    // Calculate surgical metrics using original landmarks (for accurate angle math)
                    const scalpelAngle = calculateAngle(landmarks[WRIST], landmarks[INDEX_TIP]);

                    // Calculate pinch angle (thumb tip to index MCP to index tip)
                    const pinchAngle = calculateAngle3Points(
                        landmarks[THUMB_TIP],
                        landmarks[INDEX_MCP],
                        landmarks[INDEX_TIP]
                    );

                    // Calculate finger bend
                    const fingerBend = calculateFingerBend(landmarks);

                    // Use advanced or basic grip classification
                    let grip: { type: 'pencil' | 'power' | 'unknown'; confidence: number };
                    let gripQuality = 50;

                    if (useAdvancedGrip) {
                        const advancedGrip = advancedClassifyGrip(landmarks);
                        // Convert advanced grip type to basic type for backward compatibility
                        const basicType = advancedGrip.type === 'pencil' || advancedGrip.type === 'tripod' ||
                            advancedGrip.type === 'modified_tripod' || advancedGrip.type === 'pinch'
                            ? 'pencil' : advancedGrip.type === 'power' || advancedGrip.type === 'palm'
                                ? 'power' : 'unknown';
                        grip = { type: basicType, confidence: advancedGrip.confidence };
                        gripQuality = advancedGrip.quality.overall;
                    } else {
                        grip = classifyGrip(landmarks);
                    }

                    const steadiness = calculateSteadiness(landmarks, handHistory);
                    const speed = calculateSpeed(landmarks, prevLandmarks);

                    // Calculate advanced angles if available
                    let advancedAngles: { wristPronation?: number; wristFlexion?: number; confidence?: number } = {};
                    try {
                        const surgicalAngles = calculateSurgicalAngles(landmarks);
                        advancedAngles = {
                            wristPronation: surgicalAngles.wristPronation,
                            wristFlexion: surgicalAngles.wristFlexion,
                            confidence: surgicalAngles.confidence,
                        };
                    } catch (e) {
                        // Graceful fallback if advanced angles fail
                    }

                    // Tremor analysis if enabled
                    let tremorSeverity = 0;
                    if (useTremorAnalysis) {
                        filters.tremor.addSample(landmarks[WRIST], timestamp);
                        const tremorResult = filters.tremor.analyze();
                        tremorSeverity = tremorResult.severity;
                    }

                    // Update per-hand history (keep last 10 frames)
                    handHistory.push([...landmarks]);
                    if (handHistory.length > 10) {
                        handHistory.shift();
                    }
                    landmarkHistoryRef.current.set(handedness, handHistory);
                    prevLandmarksRef.current.set(handedness, [...landmarks]);

                    // Apply advanced filtering or legacy EMA
                    let smoothedMetrics: SurgicalMetrics;

                    if (useAdvancedFiltering) {
                        // Use One Euro filtering for smooth, responsive tracking
                        smoothedMetrics = {
                            scalpelAngle: filters.angle.update(Math.abs(scalpelAngle)),
                            pinchAngle: ema(pinchAngle, prevMetrics?.pinchAngle ?? null, 0.8),
                            fingerBend: ema(fingerBend, prevMetrics?.fingerBend ?? null, 0.8),
                            steadiness: filters.steadiness.update(steadiness),
                            speed: filters.speed.update(speed),
                            gripType: grip.type,
                            gripConfidence: grip.confidence,
                            // Advanced metrics
                            wristPronation: advancedAngles.wristPronation,
                            wristFlexion: advancedAngles.wristFlexion,
                            tremorSeverity: tremorSeverity,
                            gripQuality: gripQuality,
                            trackingConfidence: advancedAngles.confidence,
                        };
                    } else {
                        // Legacy EMA smoothing
                        smoothedMetrics = {
                            scalpelAngle: ema(Math.abs(scalpelAngle), prevMetrics?.scalpelAngle ?? null, 0.8),
                            pinchAngle: ema(pinchAngle, prevMetrics?.pinchAngle ?? null, 0.8),
                            fingerBend: ema(fingerBend, prevMetrics?.fingerBend ?? null, 0.8),
                            steadiness: ema(steadiness, prevMetrics?.steadiness ?? null, 0.6),
                            speed: ema(speed, prevMetrics?.speed ?? null, 0.8),
                            gripType: grip.type,
                            gripConfidence: grip.confidence
                        };
                    }

                    // Store for next frame (per-hand)
                    prevMetricsRef.current.set(handedness, smoothedMetrics);

                    return {
                        landmarks: mirroredLandmarks,  // Use mirrored landmarks for display
                        handedness: handedness,  // Use handedness directly from MediaPipe
                        metrics: smoothedMetrics
                    };
                });

                setHands(processedHands);
                onHandsDetectedRef.current?.(processedHands);
            } else {
                setHands([]);
                onHandsDetectedRef.current?.([]);  // Notify parent that hands are gone so overlay clears
            }
        } catch (err) {
            // Silently handle frame processing errors
        }

        animationFrameRef.current = requestAnimationFrame(processFrame);
    }, [videoElement, targetFps]); // Removed onHandsDetected - using ref instead to prevent infinite loops

    // Start/stop processing loop
    useEffect(() => {
        if (!enabled || isLoading || !videoElement) return;

        animationFrameRef.current = requestAnimationFrame(processFrame);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [enabled, isLoading, videoElement, processFrame]);

    return {
        hands,
        isLoading,
        error
    };
}

export default useMediaPipeHands;
