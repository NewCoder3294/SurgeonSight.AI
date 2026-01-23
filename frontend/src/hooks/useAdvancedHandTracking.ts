/**
 * useAdvancedHandTracking - State-of-the-art hand tracking with surgical metrics
 * 
 * Major improvements over basic MediaPipe hands:
 * - Kalman/One Euro filtering for smooth, stable tracking
 * - Advanced 3D angle calculations (pronation, supination, flexion)
 * - Real-time tremor analysis
 * - ML-like grip classification with quality scores
 * - Per-hand independent tracking with history
 * - Optimized for 60fps+ performance
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createLandmarkFilters, OneEuroFilter, AdaptiveKalmanFilter } from '../utils/kalmanFilter';
import { calculateSurgicalAngles, type SurgicalAngleMetrics } from '../utils/surgicalAngles';
import { TremorAnalyzer, type TremorAnalysis } from '../utils/tremorAnalysis';
import { classifyGrip, type GripClassification, type GripType } from '../utils/advancedGripClassifier';

// MediaPipe landmark indices
const WRIST = 0;
const _INDEX_TIP = 8;  // Reserved for future use
const MIDDLE_TIP = 12;

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

/**
 * Comprehensive hand metrics combining all analysis
 */
export interface AdvancedHandMetrics {
  // Basic metrics (compatible with existing code)
  scalpelAngle: number;
  pinchAngle: number;
  fingerBend: number;
  steadiness: number;
  speed: number;
  gripType: 'pencil' | 'power' | 'unknown';
  gripConfidence: number;
  
  // Advanced angle metrics
  angles: SurgicalAngleMetrics;
  
  // Tremor analysis
  tremor: TremorAnalysis;
  
  // Advanced grip classification
  grip: GripClassification;
  
  // Motion metrics
  velocity: { x: number; y: number; z: number; magnitude: number };
  acceleration: { x: number; y: number; z: number; magnitude: number };
  
  // Quality scores
  trackingQuality: number;  // 0-100, how confident we are in tracking
  dataQuality: number;      // 0-100, how clean the data is
}

export interface AdvancedHandData {
  landmarks: HandLandmark[];
  filteredLandmarks: HandLandmark[];  // Smoothed landmarks
  handedness: 'Left' | 'Right';
  metrics: AdvancedHandMetrics;
  rawConfidence: number;  // MediaPipe confidence
}

export interface UseAdvancedHandTrackingOptions {
  videoElement: HTMLVideoElement | null;
  enabled?: boolean;
  targetFps?: number;
  filterType?: 'kalman' | 'oneEuro' | 'adaptive';
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  targetGripType?: GripType;
  onHandsDetected?: (hands: AdvancedHandData[]) => void;
}

/**
 * Per-hand state for independent tracking
 */
interface HandState {
  landmarkFilters: Map<number, any>;
  tremorAnalyzer: TremorAnalyzer;
  angleFilter: AdaptiveKalmanFilter;
  speedFilter: OneEuroFilter;
  steadinessFilter: OneEuroFilter;
  prevLandmarks: HandLandmark[] | null;
  prevTimestamp: number;
  history: HandLandmark[][];
}

/**
 * Create initial state for a hand
 */
function createHandState(filterType: 'kalman' | 'oneEuro' | 'adaptive'): HandState {
  return {
    landmarkFilters: createLandmarkFilters(filterType),
    tremorAnalyzer: new TremorAnalyzer({ sampleRate: 60, windowSize: 128 }),
    angleFilter: new AdaptiveKalmanFilter(0, 0.02, 0.1),
    speedFilter: new OneEuroFilter(0, 1.0, 0.005),
    steadinessFilter: new OneEuroFilter(70, 0.5, 0.001),
    prevLandmarks: null,
    prevTimestamp: 0,
    history: [],
  };
}

/**
 * Calculate velocity from current and previous landmarks
 */
function calculateVelocity(
  current: HandLandmark[],
  prev: HandLandmark[] | null,
  dt: number
): { x: number; y: number; z: number; magnitude: number } {
  if (!prev || prev.length < 21 || dt === 0) {
    return { x: 0, y: 0, z: 0, magnitude: 0 };
  }
  
  const wristCurr = current[WRIST];
  const wristPrev = prev[WRIST];
  
  const vx = (wristCurr.x - wristPrev.x) / dt;
  const vy = (wristCurr.y - wristPrev.y) / dt;
  const vz = (wristCurr.z - wristPrev.z) / dt;
  
  return {
    x: vx,
    y: vy,
    z: vz,
    magnitude: Math.sqrt(vx * vx + vy * vy + vz * vz),
  };
}

/**
 * Calculate acceleration from velocity change
 */
function calculateAcceleration(
  currentVelocity: { x: number; y: number; z: number },
  prevVelocity: { x: number; y: number; z: number } | null,
  dt: number
): { x: number; y: number; z: number; magnitude: number } {
  if (!prevVelocity || dt === 0) {
    return { x: 0, y: 0, z: 0, magnitude: 0 };
  }
  
  const ax = (currentVelocity.x - prevVelocity.x) / dt;
  const ay = (currentVelocity.y - prevVelocity.y) / dt;
  const az = (currentVelocity.z - prevVelocity.z) / dt;
  
  return {
    x: ax,
    y: ay,
    z: az,
    magnitude: Math.sqrt(ax * ax + ay * ay + az * az),
  };
}

/**
 * Calculate steadiness from history using variance
 */
function calculateSteadiness(current: HandLandmark[], history: HandLandmark[][]): number {
  if (history.length < 5) return 70;
  
  const allWrists = [...history.slice(-10).map(h => h[WRIST]), current[WRIST]];
  
  const avgX = allWrists.reduce((s, p) => s + p.x, 0) / allWrists.length;
  const avgY = allWrists.reduce((s, p) => s + p.y, 0) / allWrists.length;
  
  const variance = allWrists.reduce((s, p) => 
    s + (p.x - avgX) ** 2 + (p.y - avgY) ** 2, 0
  ) / allWrists.length;
  
  // Normalize by hand size
  const handSize = Math.sqrt(
    (current[MIDDLE_TIP].x - current[WRIST].x) ** 2 +
    (current[MIDDLE_TIP].y - current[WRIST].y) ** 2
  ) || 0.1;
  
  const normalizedJitter = Math.sqrt(variance) / handSize;
  
  return Math.max(0, Math.min(100, 100 - normalizedJitter * 500));
}

/**
 * Calculate tracking quality based on landmark positions
 */
function calculateTrackingQuality(landmarks: HandLandmark[]): number {
  let validPoints = 0;
  let depthVariance = 0;
  const zValues: number[] = [];
  
  for (const lm of landmarks) {
    if (lm.x >= 0 && lm.x <= 1 && lm.y >= 0 && lm.y <= 1) {
      validPoints++;
    }
    zValues.push(lm.z);
  }
  
  // Check depth consistency
  const avgZ = zValues.reduce((a, b) => a + b, 0) / zValues.length;
  depthVariance = zValues.reduce((s, z) => s + (z - avgZ) ** 2, 0) / zValues.length;
  
  // Quality based on valid points and depth consistency
  const pointsScore = (validPoints / 21) * 60;
  const depthScore = Math.max(0, 40 - depthVariance * 1000);
  
  return Math.min(100, pointsScore + depthScore);
}

/**
 * Convert advanced grip type to simple type for backward compatibility
 */
function toSimpleGripType(gripType: GripType): 'pencil' | 'power' | 'unknown' {
  if (gripType === 'pencil' || gripType === 'tripod' || gripType === 'modified_tripod' || gripType === 'pinch') {
    return 'pencil';
  }
  if (gripType === 'power' || gripType === 'palm') {
    return 'power';
  }
  return 'unknown';
}

export function useAdvancedHandTracking({
  videoElement,
  enabled = true,
  targetFps = 60,
  filterType = 'oneEuro',
  minDetectionConfidence = 0.7,
  minTrackingConfidence = 0.3,
  targetGripType,
  onHandsDetected,
}: UseAdvancedHandTrackingOptions) {
  const [hands, setHands] = useState<AdvancedHandData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  
  const handLandmarkerRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef<number>(0);
  
  // Per-hand state
  const handStatesRef = useRef<Map<string, HandState>>(new Map());
  const prevVelocityRef = useRef<Map<string, { x: number; y: number; z: number }>>(new Map());
  
  // Get or create hand state
  const getHandState = useCallback((handedness: string): HandState => {
    if (!handStatesRef.current.has(handedness)) {
      handStatesRef.current.set(handedness, createHandState(filterType));
    }
    return handStatesRef.current.get(handedness)!;
  }, [filterType]);
  
  // Initialize MediaPipe
  useEffect(() => {
    if (!enabled) return;
    
    const initMediaPipe = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const { HandLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: minDetectionConfidence,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: minTrackingConfidence,
        });
        
        handLandmarkerRef.current = handLandmarker;
        setIsLoading(false);
        console.log('✅ Advanced Hand Tracking initialized (MediaPipe + Filters)');
      } catch (err: any) {
        console.error('Failed to initialize advanced hand tracking:', err);
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
  }, [enabled, minDetectionConfidence, minTrackingConfidence]);
  
  // Process video frames
  const processFrame = useCallback((timestamp: number) => {
    if (!handLandmarkerRef.current || !videoElement) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    // FPS limiting
    const frameInterval = 1000 / targetFps;
    if (timestamp - lastFrameTimeRef.current < frameInterval) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    const dt = (timestamp - lastFrameTimeRef.current) / 1000;
    lastFrameTimeRef.current = timestamp;
    
    // FPS calculation
    frameCountRef.current++;
    if (timestamp - fpsTimerRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      fpsTimerRef.current = timestamp;
    }
    
    // Check video readiness
    if (videoElement.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    try {
      const results = handLandmarkerRef.current.detectForVideo(videoElement, timestamp);
      
      if (results.landmarks && results.landmarks.length > 0) {
        const processedHands: AdvancedHandData[] = results.landmarks.map(
          (rawLandmarks: any[], index: number) => {
            const handedness: 'Left' | 'Right' = 
              (results.handednesses?.[index]?.[0]?.categoryName as 'Left' | 'Right') || 'Right';
            const rawConfidence = results.handednesses?.[index]?.[0]?.score || 0.5;
            
            // Get hand state
            const state = getHandState(handedness);
            
            // Convert raw landmarks
            const landmarks: HandLandmark[] = rawLandmarks.map((lm: any) => ({
              x: lm.x,
              y: lm.y,
              z: lm.z,
            }));
            
            // Apply filtering to each landmark
            const filteredLandmarks: HandLandmark[] = landmarks.map((lm, idx) => {
              const filter = state.landmarkFilters.get(idx);
              if (filter) {
                return filter.update(lm.x, lm.y, lm.z);
              }
              return lm;
            });
            
            // Add sample to tremor analyzer (use wrist)
            state.tremorAnalyzer.addSample(filteredLandmarks[WRIST], timestamp);
            
            // Calculate velocity
            const velocity = calculateVelocity(filteredLandmarks, state.prevLandmarks, dt);
            const prevVelocity = prevVelocityRef.current.get(handedness) || null;
            const acceleration = calculateAcceleration(velocity, prevVelocity, dt);
            prevVelocityRef.current.set(handedness, velocity);
            
            // Calculate all metrics
            const angles = calculateSurgicalAngles(filteredLandmarks);
            const tremor = state.tremorAnalyzer.analyze();
            const grip = classifyGrip(filteredLandmarks, targetGripType);
            const steadinessRaw = calculateSteadiness(filteredLandmarks, state.history);
            const trackingQuality = calculateTrackingQuality(filteredLandmarks);
            
            // Apply smoothing to derived metrics
            const smoothedAngle = state.angleFilter.update(Math.abs(angles.scalpelAngle));
            const smoothedSpeed = state.speedFilter.update(velocity.magnitude * 6.5 * targetFps);
            const smoothedSteadiness = state.steadinessFilter.update(steadinessRaw);
            
            // Update history
            state.history.push([...filteredLandmarks]);
            if (state.history.length > 30) {
              state.history.shift();
            }
            state.prevLandmarks = [...filteredLandmarks];
            state.prevTimestamp = timestamp;
            
            // Calculate legacy finger bend
            const fingerBend = (filteredLandmarks[6].y - filteredLandmarks[8].y) > 0 
              ? angles.indexFlexion 
              : 100 - angles.indexFlexion;
            
            // Compile metrics
            const metrics: AdvancedHandMetrics = {
              // Legacy compatible
              scalpelAngle: smoothedAngle,
              pinchAngle: angles.pinchAperture,
              fingerBend: Math.max(0, Math.min(100, fingerBend)),
              steadiness: smoothedSteadiness,
              speed: smoothedSpeed,
              gripType: toSimpleGripType(grip.type),
              gripConfidence: grip.confidence,
              
              // Advanced
              angles,
              tremor,
              grip,
              velocity,
              acceleration,
              trackingQuality,
              dataQuality: Math.min(100, trackingQuality + angles.confidence * 20),
            };
            
            return {
              landmarks,
              filteredLandmarks,
              handedness,
              metrics,
              rawConfidence,
            };
          }
        );
        
        setHands(processedHands);
        onHandsDetected?.(processedHands);
      } else {
        setHands([]);
        onHandsDetected?.([]);
      }
    } catch (err) {
      // Silent error handling for frame processing
    }
    
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [videoElement, targetFps, getHandState, targetGripType, onHandsDetected]);
  
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
  
  // Reset hand states when filter type changes
  useEffect(() => {
    handStatesRef.current.clear();
  }, [filterType]);
  
  return {
    hands,
    isLoading,
    error,
    fps,
  };
}

export default useAdvancedHandTracking;
