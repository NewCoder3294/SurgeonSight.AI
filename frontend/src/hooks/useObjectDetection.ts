/**
 * useObjectDetection - Real-time object detection placeholder
 * 
 * NOTE: This hook is currently disabled. To enable, install TensorFlow:
 * npm install @tensorflow/tfjs @tensorflow-models/coco-ssd
 * 
 * Then uncomment the implementation below.
 */

import { useState } from 'react';

export interface DetectedObject {
    class: string;
    confidence: number;
    bbox: {
        x: number;
        y: number;
        width: number;
        height: number;
        centerX: number;
        centerY: number;
    };
}

export interface UseObjectDetectionOptions {
    videoElement: HTMLVideoElement | null;
    enabled?: boolean;
    targetFps?: number;
    confidenceThreshold?: number;
    onObjectsDetected?: (objects: DetectedObject[]) => void;
}

export interface UseObjectDetectionReturn {
    objects: DetectedObject[];
    isLoading: boolean;
    error: string | null;
    fps: number;
}

/**
 * Placeholder hook - TensorFlow dependencies not installed
 * Returns empty state. Install TensorFlow to enable object detection.
 */
export function useObjectDetection(_options: UseObjectDetectionOptions): UseObjectDetectionReturn {
    const [objects] = useState<DetectedObject[]>([]);
    const [isLoading] = useState(false);
    const [error] = useState<string | null>('TensorFlow not installed - object detection disabled');
    const [fps] = useState(0);

    return {
        objects,
        isLoading,
        error,
        fps
    };
}

export default useObjectDetection;
