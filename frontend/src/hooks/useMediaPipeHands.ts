/**
 * useMediaPipeHands - Real-time hand tracking with surgical metrics
 * 
 * Uses MediaPipe HandLandmarker to detect hands and calculate:
 * - Scalpel angle (index finger to wrist)
 * - Hand steadiness (jitter from position variance)
 * - Grip classification (pencil vs power)
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// MediaPipe landmark indices
const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_DIP = 7;
const INDEX_TIP = 8;
const MIDDLE_TIP = 12;
const RING_TIP = 16;
const PINKY_TIP = 20;

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
}

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

// Classify grip type based on finger positions
function classifyGrip(landmarks: HandLandmark[]): { type: 'pencil' | 'power' | 'unknown'; confidence: number } {
    if (landmarks.length < 21) {
        return { type: 'unknown', confidence: 0 };
    }

    const wrist = landmarks[WRIST];
    const thumbTip = landmarks[THUMB_TIP];
    const indexTip = landmarks[INDEX_TIP];
    const middleTip = landmarks[MIDDLE_TIP];
    const ringTip = landmarks[RING_TIP];
    const pinkyTip = landmarks[PINKY_TIP];

    // Pencil grip: thumb and index close together, other fingers curled
    const thumbIndexDist = distance(thumbTip, indexTip);
    const indexMiddleDist = distance(indexTip, middleTip);
    const wristToIndex = distance(wrist, indexTip);

    // Normalize distances by hand size
    const handSize = wristToIndex;
    const normalizedThumbIndex = thumbIndexDist / handSize;
    const normalizedIndexMiddle = indexMiddleDist / handSize;

    // Check ring and pinky curl (distance from wrist relative to index)
    const ringDist = distance(wrist, ringTip) / handSize;
    const pinkyDist = distance(wrist, pinkyTip) / handSize;

    // Pencil grip characteristics
    if (normalizedThumbIndex < 0.3 && ringDist < 0.6 && pinkyDist < 0.6) {
        return { type: 'pencil', confidence: 0.8 };
    }

    // Power grip: all fingers grouped together
    if (normalizedThumbIndex < 0.4 && normalizedIndexMiddle < 0.2) {
        return { type: 'power', confidence: 0.7 };
    }

    return { type: 'unknown', confidence: 0.3 };
}

// Calculate steadiness from position history
function calculateSteadiness(current: HandLandmark[], history: HandLandmark[][]): number {
    if (history.length < 3) return 50; // Not enough data

    const wristHistory = history.map(h => h[WRIST]).concat([current[WRIST]]);

    // Calculate variance of wrist position
    const avgX = wristHistory.reduce((sum, p) => sum + p.x, 0) / wristHistory.length;
    const avgY = wristHistory.reduce((sum, p) => sum + p.y, 0) / wristHistory.length;

    const variance = wristHistory.reduce((sum, p) => {
        return sum + Math.pow(p.x - avgX, 2) + Math.pow(p.y - avgY, 2);
    }, 0) / wristHistory.length;

    // Convert to 0-100 scale (lower variance = higher steadiness)
    const steadiness = Math.max(0, Math.min(100, 100 - variance * 50000));
    return steadiness;
}

// Calculate motion speed
function calculateSpeed(current: HandLandmark[], prev: HandLandmark[] | null): number {
    if (!prev || prev.length < 21) return 0;

    const currentWrist = current[WRIST];
    const prevWrist = prev[WRIST];

    const speed = Math.sqrt(
        Math.pow(currentWrist.x - prevWrist.x, 2) +
        Math.pow(currentWrist.y - prevWrist.y, 2)
    ) * 100; // Scale for readability

    return speed;
}

export function useMediaPipeHands({
    videoElement,
    enabled = true,
    targetFps = 15,
    onHandsDetected
}: UseMediaPipeHandsOptions) {
    const [hands, setHands] = useState<HandData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handLandmarkerRef = useRef<any>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastFrameTimeRef = useRef<number>(0);
    const landmarkHistoryRef = useRef<HandLandmark[][]>([]);
    const prevLandmarksRef = useRef<HandLandmark[] | null>(null);

    // Initialize MediaPipe
    useEffect(() => {
        if (!enabled) return;

        const initMediaPipe = async () => {
            try {
                setIsLoading(true);

                // Dynamic import to handle SSR
                const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

                const vision = await FilesetResolver.forVisionTasks(
                    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
                );

                const handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                        delegate: 'GPU'
                    },
                    runningMode: 'VIDEO',
                    numHands: 2,
                    minHandDetectionConfidence: 0.5,
                    minHandPresenceConfidence: 0.5,
                    minTrackingConfidence: 0.5
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
                    // Use original landmark coordinates - the canvas already has CSS -scale-x-100
                    // applied which handles the mirroring visually. No need to flip in code.
                    const mirroredLandmarks: HandLandmark[] = landmarks.map((lm: any) => ({
                        x: lm.x,  // Keep original X - CSS transform handles mirroring
                        y: lm.y,
                        z: lm.z
                    }));

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

                    const grip = classifyGrip(landmarks);
                    const steadiness = calculateSteadiness(landmarks, landmarkHistoryRef.current);
                    const speed = calculateSpeed(landmarks, prevLandmarksRef.current);

                    // Update history (keep last 10 frames)
                    landmarkHistoryRef.current.push([...landmarks]);
                    if (landmarkHistoryRef.current.length > 10) {
                        landmarkHistoryRef.current.shift();
                    }
                    prevLandmarksRef.current = [...landmarks];

                    // Swap handedness since the video is mirrored
                    // MediaPipe detects the hand in un-mirrored space, but display is mirrored
                    const detectedHandedness = results.handednesses?.[index]?.[0]?.categoryName || 'Right';
                    const mirroredHandedness: 'Left' | 'Right' = detectedHandedness === 'Left' ? 'Right' : 'Left';

                    return {
                        landmarks: mirroredLandmarks,  // Use mirrored landmarks for display
                        handedness: mirroredHandedness,  // Swap handedness to match visual
                        metrics: {
                            scalpelAngle: Math.abs(scalpelAngle),
                            pinchAngle,
                            fingerBend,
                            steadiness,
                            speed,
                            gripType: grip.type,
                            gripConfidence: grip.confidence
                        }
                    };
                });

                setHands(processedHands);
                onHandsDetected?.(processedHands);
            } else {
                setHands([]);
                onHandsDetected?.([]);  // Notify parent that hands are gone so overlay clears
            }
        } catch (err) {
            // Silently handle frame processing errors
        }

        animationFrameRef.current = requestAnimationFrame(processFrame);
    }, [videoElement, targetFps, onHandsDetected]);

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
