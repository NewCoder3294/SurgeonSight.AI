/**
 * useToolDetection - Detect surgical tools in video feed
 * 
 * Uses color and shape heuristics to detect common surgical tools:
 * - Scissors: Two elongated metallic blades in X pattern
 * - Scalpel/Knife: Single blade with handle
 * - Forceps: Two parallel prongs
 * 
 * Falls back to simple metallic object detection when specific tool
 * cannot be identified.
 */

import { useState, useCallback, useRef } from 'react';

export type ToolType = 'scissors' | 'scalpel' | 'forceps' | 'unknown_tool' | 'none';

export interface DetectedTool {
    type: ToolType;
    confidence: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
}

interface UseToolDetectionOptions {
    enabled?: boolean;
    targetFps?: number;
}

// Metallic color detection thresholds are handled in isMetallicPixel function

/**
 * Check if a pixel is metallic (silver/gray surgical tool color)
 */
function isMetallicPixel(r: number, g: number, b: number): boolean {
    // Check if within gray range (low saturation, medium-high value)
    const isGray = Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && Math.abs(r - b) < 30;
    const isBright = (r + g + b) / 3 > 120;
    const notTooBlack = (r + g + b) / 3 > 80;
    const notTooWhite = (r + g + b) / 3 < 240;

    return isGray && isBright && notTooBlack && notTooWhite;
}

/**
 * Analyze frame for metallic tool presence
 */
function analyzeFrame(imageData: ImageData): DetectedTool {
    const { data, width, height } = imageData;

    let metallicPixelCount = 0;
    let metallicMinX = width;
    let metallicMaxX = 0;
    let metallicMinY = height;
    let metallicMaxY = 0;

    // Sample every 4th pixel for performance
    for (let y = 0; y < height; y += 4) {
        for (let x = 0; x < width; x += 4) {
            const i = (y * width + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            if (isMetallicPixel(r, g, b)) {
                metallicPixelCount++;
                metallicMinX = Math.min(metallicMinX, x);
                metallicMaxX = Math.max(metallicMaxX, x);
                metallicMinY = Math.min(metallicMinY, y);
                metallicMaxY = Math.max(metallicMaxY, y);
            }
        }
    }

    // Calculate metallic coverage
    const totalSampled = (width / 4) * (height / 4);
    const metallicRatio = metallicPixelCount / totalSampled;

    // Minimum threshold for tool detection
    if (metallicRatio < 0.01) {
        return { type: 'none', confidence: 0 };
    }

    const boundingBox = {
        x: metallicMinX / width,
        y: metallicMinY / height,
        width: (metallicMaxX - metallicMinX) / width,
        height: (metallicMaxY - metallicMinY) / height
    };

    // Classify based on bounding box aspect ratio
    const aspectRatio = boundingBox.width / boundingBox.height;

    if (aspectRatio > 1.5 && aspectRatio < 4) {
        // Elongated horizontal - likely scissors or forceps
        if (metallicRatio > 0.02) {
            return { type: 'scissors', confidence: 0.6 + metallicRatio * 2, boundingBox };
        } else {
            return { type: 'forceps', confidence: 0.5 + metallicRatio * 2, boundingBox };
        }
    } else if (aspectRatio > 0.25 && aspectRatio < 1.5) {
        // More square-ish - could be scalpel handle
        return { type: 'scalpel', confidence: 0.5 + metallicRatio * 2, boundingBox };
    }

    // Unknown metallic object
    return { type: 'unknown_tool', confidence: 0.3 + metallicRatio * 2, boundingBox };
}

export function useToolDetection({
    enabled = true,
    targetFps = 5
}: UseToolDetectionOptions = {}) {
    const [detectedTool, setDetectedTool] = useState<DetectedTool>({ type: 'none', confidence: 0 });
    const lastDetectionTimeRef = useRef<number>(0);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    /**
     * Detect tools in a video frame
     */
    const detectTools = useCallback((videoElement: HTMLVideoElement) => {
        if (!enabled) return;

        const now = Date.now();
        const frameInterval = 1000 / targetFps;

        // Throttle detection
        if (now - lastDetectionTimeRef.current < frameInterval) return;
        lastDetectionTimeRef.current = now;

        // Create canvas if needed
        if (!canvasRef.current) {
            canvasRef.current = document.createElement('canvas');
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        // Downscale for performance
        const scale = 0.25;
        canvas.width = videoElement.videoWidth * scale;
        canvas.height = videoElement.videoHeight * scale;

        if (canvas.width < 10 || canvas.height < 10) return;

        // Draw and analyze frame
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const result = analyzeFrame(imageData);

        // Smooth transitions - only update if confidence is significant
        if (result.confidence > 0.4 || result.type !== detectedTool.type) {
            setDetectedTool(result);
        }
    }, [enabled, targetFps, detectedTool.type]);

    return {
        detectedTool,
        detectTools
    };
}

export default useToolDetection;
