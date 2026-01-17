import { useRef, useState, useEffect, useCallback } from 'react';
import { classifyGrip, shouldTriggerFeedback } from '../utils/gripClassifier';

/**
 * Custom hook for MediaPipe hand detection
 * Handles loading, processing, and grip classification
 */
export function useHandDetection(videoRef, options = {}) {
    const {
        enabled = true,
        onGripChange = () => { },
        onHandsDetected = () => { },
        maxHands = 2,
        minDetectionConfidence = 0.7,
        minTrackingConfidence = 0.5
    } = options;

    const [isLoading, setIsLoading] = useState(true);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState(null);
    const [currentGrip, setCurrentGrip] = useState({ state: 'no_hand', confidence: 0 });
    const [hands, setHands] = useState([]);

    const handsRef = useRef(null);
    const cameraRef = useRef(null);
    const lastGripRef = useRef('no_hand');
    const lastFeedbackTimeRef = useRef(0);
    const animationFrameRef = useRef(null);

    // Initialize MediaPipe Hands
    useEffect(() => {
        if (!enabled) return;

        const initMediaPipe = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Dynamically import MediaPipe
                const { Hands } = await import('@mediapipe/hands');
                const { Camera } = await import('@mediapipe/camera_utils');

                // Create Hands instance
                const hands = new Hands({
                    locateFile: (file) =>
                        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
                });

                hands.setOptions({
                    maxNumHands: maxHands,
                    modelComplexity: 1,
                    minDetectionConfidence,
                    minTrackingConfidence
                });

                hands.onResults(handleResults);
                handsRef.current = hands;

                // Wait for video to be ready
                if (videoRef.current && videoRef.current.srcObject) {
                    const camera = new Camera(videoRef.current, {
                        onFrame: async () => {
                            if (handsRef.current && videoRef.current) {
                                await handsRef.current.send({ image: videoRef.current });
                            }
                        },
                        width: 640,
                        height: 480
                    });

                    await camera.start();
                    cameraRef.current = camera;
                }

                setIsReady(true);
                setIsLoading(false);
                console.log('✅ MediaPipe Hands initialized');

            } catch (err) {
                console.error('Failed to initialize MediaPipe:', err);
                setError(err.message);
                setIsLoading(false);
            }
        };

        // Small delay to ensure video is ready
        const timer = setTimeout(initMediaPipe, 500);

        return () => {
            clearTimeout(timer);
            if (cameraRef.current) {
                cameraRef.current.stop();
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [enabled, videoRef, maxHands, minDetectionConfidence, minTrackingConfidence]);

    // Handle MediaPipe results
    const handleResults = useCallback((results) => {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            setHands([]);
            const newGrip = { state: 'no_hand', confidence: 0, details: {} };
            setCurrentGrip(newGrip);
            onHandsDetected([]);
            return;
        }

        // Process detected hands
        const detectedHands = results.multiHandLandmarks.map((landmarks, index) => ({
            landmarks,
            handedness: results.multiHandedness?.[index]?.label || 'Unknown',
            score: results.multiHandedness?.[index]?.score || 0
        }));

        setHands(detectedHands);
        onHandsDetected(detectedHands);

        // Classify grip on first (dominant) hand
        const primaryHand = detectedHands[0];
        const gripResult = classifyGrip(primaryHand.landmarks);
        setCurrentGrip(gripResult);

        // Check if we should trigger feedback
        const now = Date.now();
        const timeSinceLastFeedback = now - lastFeedbackTimeRef.current;

        if (shouldTriggerFeedback(lastGripRef.current, gripResult.state, timeSinceLastFeedback)) {
            lastFeedbackTimeRef.current = now;
            onGripChange(gripResult, primaryHand.landmarks);
        }

        lastGripRef.current = gripResult.state;

    }, [onGripChange, onHandsDetected]);

    // Manual frame processing (alternative to Camera)
    const processFrame = useCallback(async () => {
        if (handsRef.current && videoRef.current && videoRef.current.readyState >= 2) {
            await handsRef.current.send({ image: videoRef.current });
        }
        animationFrameRef.current = requestAnimationFrame(processFrame);
    }, [videoRef]);

    return {
        isLoading,
        isReady,
        error,
        currentGrip,
        hands,
        processFrame
    };
}

/**
 * Simplified hook for demos - uses mock detection
 * Falls back to this if MediaPipe fails to load
 */
export function useMockHandDetection(options = {}) {
    const { onGripChange = () => { } } = options;
    const [currentGrip, setCurrentGrip] = useState({ state: 'correct', confidence: 0.8 });

    // Simulate random grip changes for demo
    useEffect(() => {
        const states = ['correct', 'palmed', 'angled', 'correct', 'correct', 'other_error'];

        const interval = setInterval(() => {
            const randomState = states[Math.floor(Math.random() * states.length)];
            const newGrip = { state: randomState, confidence: 0.7 + Math.random() * 0.3 };
            setCurrentGrip(newGrip);

            if (randomState !== 'correct') {
                onGripChange(newGrip, null);
            }
        }, 8000); // Every 8 seconds

        return () => clearInterval(interval);
    }, [onGripChange]);

    return {
        isLoading: false,
        isReady: true,
        error: null,
        currentGrip,
        hands: []
    };
}
