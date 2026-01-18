/**
 * useObjectDetection - Real-time object detection with TensorFlow.js COCO-SSD
 * 
 * Detects objects in video feed including:
 * - banana (for surgical training with food items)
 * - scissors
 * - knife
 * - person (for hand detection supplementation)
 * 
 * Provides bounding boxes, confidence scores, and spatial relationships
 * for contextual voice coaching.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// Objects we specifically care about for surgical training
const RELEVANT_CLASSES = ['banana', 'scissors', 'knife', 'person', 'fork', 'spoon', 'apple', 'orange'];

export interface DetectedObject {
    class: string;
    confidence: number;
    bbox: {
        x: number;      // normalized 0-1
        y: number;      // normalized 0-1
        width: number;  // normalized 0-1
        height: number; // normalized 0-1
        centerX: number;
        centerY: number;
    };
    color: string;  // Color for visualization
}

export interface SpatialRelation {
    handPosition: { x: number; y: number } | null;
    nearestObject: DetectedObject | null;
    direction: 'left' | 'right' | 'above' | 'below' | 'at' | null;
    distance: number; // normalized distance
    angleToObject: number; // degrees from hand to object
}

interface UseObjectDetectionOptions {
    videoElement: HTMLVideoElement | null;
    enabled?: boolean;
    targetFps?: number;
    onObjectsDetected?: (objects: DetectedObject[], spatial: SpatialRelation) => void;
}

// Assign colors to different object types
function getObjectColor(className: string): string {
    switch (className) {
        case 'banana': return 'rgba(255, 220, 0, 0.8)';
        case 'scissors': return 'rgba(0, 150, 255, 0.8)';
        case 'knife': return 'rgba(255, 60, 60, 0.8)';
        case 'person': return 'rgba(0, 255, 150, 0.8)';
        case 'fork': return 'rgba(180, 180, 180, 0.8)';
        case 'spoon': return 'rgba(200, 180, 160, 0.8)';
        default: return 'rgba(196, 92, 62, 0.8)';
    }
}

// Calculate spatial relationship between hand and objects
function calculateSpatialRelation(
    handPosition: { x: number; y: number } | null,
    objects: DetectedObject[]
): SpatialRelation {
    if (!handPosition || objects.length === 0) {
        return {
            handPosition,
            nearestObject: null,
            direction: null,
            distance: 0,
            angleToObject: 0
        };
    }

    // Find nearest object to hand
    let nearestObject: DetectedObject | null = null;
    let minDistance = Infinity;

    for (const obj of objects) {
        const dx = obj.bbox.centerX - handPosition.x;
        const dy = obj.bbox.centerY - handPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < minDistance) {
            minDistance = distance;
            nearestObject = obj;
        }
    }

    if (!nearestObject) {
        return {
            handPosition,
            nearestObject: null,
            direction: null,
            distance: 0,
            angleToObject: 0
        };
    }

    // Calculate direction from hand to object
    const dx = nearestObject.bbox.centerX - handPosition.x;
    const dy = nearestObject.bbox.centerY - handPosition.y;

    let direction: 'left' | 'right' | 'above' | 'below' | 'at';

    if (minDistance < 0.1) {
        direction = 'at';
    } else if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? 'right' : 'left';
    } else {
        direction = dy > 0 ? 'below' : 'above';
    }

    // Calculate angle from hand to object (in degrees)
    const angleToObject = Math.atan2(dy, dx) * (180 / Math.PI);

    return {
        handPosition,
        nearestObject,
        direction,
        distance: minDistance,
        angleToObject
    };
}

export function useObjectDetection({
    videoElement,
    enabled = true,
    targetFps = 5,
    onObjectsDetected
}: UseObjectDetectionOptions) {
    const [isLoading, setIsLoading] = useState(true);
    const [isModelReady, setIsModelReady] = useState(false);
    const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
    const [spatialRelation, setSpatialRelation] = useState<SpatialRelation>({
        handPosition: null,
        nearestObject: null,
        direction: null,
        distance: 0,
        angleToObject: 0
    });
    const [error, setError] = useState<string | null>(null);

    const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastDetectionTimeRef = useRef<number>(0);
    const handPositionRef = useRef<{ x: number; y: number } | null>(null);

    // Load COCO-SSD model
    useEffect(() => {
        if (!enabled) return;

        let isMounted = true;

        const loadModel = async () => {
            try {
                console.log('🔧 Loading TensorFlow.js COCO-SSD model...');
                setIsLoading(true);

                // Set backend to webgl for better performance
                await tf.setBackend('webgl');
                await tf.ready();

                const model = await cocoSsd.load({
                    base: 'lite_mobilenet_v2' // Faster model for real-time detection
                });

                if (isMounted) {
                    modelRef.current = model;
                    setIsModelReady(true);
                    setIsLoading(false);
                    console.log('✅ COCO-SSD model loaded successfully');
                }
            } catch (err: any) {
                console.error('❌ Failed to load COCO-SSD:', err);
                if (isMounted) {
                    setError(err.message);
                    setIsLoading(false);
                }
            }
        };

        loadModel();

        return () => {
            isMounted = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [enabled]);

    // Update hand position (called from MediaPipe detection)
    const updateHandPosition = useCallback((position: { x: number; y: number } | null) => {
        handPositionRef.current = position;
    }, []);

    // Run detection loop
    useEffect(() => {
        if (!enabled || !isModelReady || !videoElement || !modelRef.current) return;

        const frameInterval = 1000 / targetFps;

        const detect = async () => {
            const now = Date.now();

            // Throttle detection
            if (now - lastDetectionTimeRef.current < frameInterval) {
                animationFrameRef.current = requestAnimationFrame(detect);
                return;
            }

            lastDetectionTimeRef.current = now;

            if (videoElement.readyState < 2) {
                animationFrameRef.current = requestAnimationFrame(detect);
                return;
            }

            try {
                const predictions = await modelRef.current!.detect(videoElement);

                // Filter and transform predictions
                const objects: DetectedObject[] = predictions
                    .filter(pred => RELEVANT_CLASSES.includes(pred.class) && pred.score > 0.3)
                    .map(pred => {
                        const [x, y, width, height] = pred.bbox;
                        const videoWidth = videoElement.videoWidth || 640;
                        const videoHeight = videoElement.videoHeight || 480;

                        return {
                            class: pred.class,
                            confidence: pred.score,
                            bbox: {
                                x: x / videoWidth,
                                y: y / videoHeight,
                                width: width / videoWidth,
                                height: height / videoHeight,
                                centerX: (x + width / 2) / videoWidth,
                                centerY: (y + height / 2) / videoHeight
                            },
                            color: getObjectColor(pred.class)
                        };
                    });

                // Calculate spatial relations
                const spatial = calculateSpatialRelation(handPositionRef.current, objects);

                setDetectedObjects(objects);
                setSpatialRelation(spatial);
                onObjectsDetected?.(objects, spatial);

            } catch (err) {
                console.error('Detection error:', err);
            }

            animationFrameRef.current = requestAnimationFrame(detect);
        };

        detect();

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [enabled, isModelReady, videoElement, targetFps, onObjectsDetected]);

    return {
        isLoading,
        isModelReady,
        detectedObjects,
        spatialRelation,
        error,
        updateHandPosition
    };
}

export default useObjectDetection;
