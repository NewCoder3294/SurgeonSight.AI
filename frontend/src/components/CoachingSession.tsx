import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CornerBrackets from './CornerBrackets';
import FeedbackDisplay from './FeedbackDisplay';
import VideoFeed from './VideoFeed';
import ThemeToggle from './ThemeToggle';
import Hand3DVisualization from './Hand3DVisualization';
import VoiceFeedbackDisplay from './VoiceFeedbackDisplay';
import SessionSummaryModal from './SessionSummaryModal';
import { useWebSocket, useVoiceFeedback } from '../hooks/useSession';
import { useMockHandDetection } from '../hooks/useHandDetection';
import { useVoiceCoach } from '../hooks/useVoiceCoach';
import { startSession, endSession } from '../utils/api';
import { createMetricsWindow, addMetric, computeFrameDifference } from '../utils/reproMetrics';
import type { MotionMetrics } from '../utils/reproMetrics';
import { FeedbackGenerator } from '../utils/reproFeedback';
import { useMediaPipeHands, type HandData, type SurgicalMetrics } from '../hooks/useMediaPipeHands';
import type { ExpertMetrics } from '../hooks/useExpertBaseline';

// Demo feedback messages (fallback when backend not available)
const DEMO_FEEDBACK = [
    { type: 'correction', message: "Try the pencil grip—thumb and index finger only." },
    { type: 'encouragement', message: "Good grip position. Keep it steady." },
    { type: 'correction', message: "Loosen your grip. Less tension." },
    { type: 'encouragement', message: "Nice angle. Well done." },
    { type: 'correction', message: "Rotate wrist clockwise slightly." },
    { type: 'encouragement', message: "Smooth motion. Excellent." },
    { type: 'correction', message: "Anchor your hand for stability." },
    { type: 'encouragement', message: "Great control there." },
    { type: 'correction', message: "Slower, more controlled movements." },
    { type: 'encouragement', message: "That's the technique." },
];

interface CoachingSessionProps {
    embedded?: boolean;
    expertMetrics?: ExpertMetrics; // Expert baseline for comparison
}

export default function CoachingSession({ embedded = false, expertMetrics }: CoachingSessionProps) {
    const navigate = useNavigate();
    const videoFeedRef = useRef(null);

    // Session state
    const [sessionId, setSessionId] = useState(null);
    const [sessionTime, setSessionTime] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [currentFeedback, setCurrentFeedback] = useState<any>(null);
    const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);
    const [detectionBox, setDetectionBox] = useState<any>(null);
    const [backendConnected, setBackendConnected] = useState(false);
    const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
    const [currentMetrics, setCurrentMetrics] = useState<SurgicalMetrics | null>(null);
    const [detectedHands, setDetectedHands] = useState<HandData[]>([]);
    const [showSummary, setShowSummary] = useState(false);
    const [sessionSummary, setSessionSummary] = useState<any>(null);

    // Demo mode state
    const [feedbackIndex, setFeedbackIndex] = useState(0);

    const timerRef = useRef<any>(null);
    const feedbackTimeoutRef = useRef<any>(null);

    // Motion metrics state
    const metricsWindowRef = useRef(createMetricsWindow(5, 30));
    const feedbackGeneratorRef = useRef(new FeedbackGenerator());
    const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const prevFrameRef = useRef<ImageData | null>(null);
    const frameIntervalRef = useRef<any>(null);
    const lastFrameTimeRef = useRef<number>(0);

    // Voice feedback hook (legacy - keep for fallback)
    const { playFeedback, speakWithWebSpeech, isSpeaking } = useVoiceFeedback();

    // NEW: Mind-blowing voice coach with typing animation
    const voiceCoach = useVoiceCoach();

    // Handle incoming feedback from backend
    const handleBackendFeedback = useCallback((data: any) => {
        // Map backend category to status (or infer from message tone)
        let status: 'ON_TRACK' | 'WARNING' | 'CRITICAL' = 'ON_TRACK';
        if (data.category === 'correction' || data.category === 'warning') {
            status = 'WARNING';
        } else if (data.category === 'critical' || data.category === 'error') {
            status = 'CRITICAL';
        }

        const feedback = {
            status,
            message: data.message,
            timestamp: data.timestamp,
            id: Date.now(),
        };

        setCurrentFeedback(feedback);
        setFeedbackHistory(prev => [...prev.slice(-4), feedback]); // Keep last 5 for minimal trail
        setIsAnalyzing(false);
        setTimeout(() => setIsAnalyzing(true), 500);

        // Play voice feedback
        playFeedback(data);

        // Clear feedback after delay
        if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = setTimeout(() => {
            setCurrentFeedback(null);
        }, 4000);
    }, [playFeedback]);

    // WebSocket connection
    const { isConnected, connect, sendGripState } = useWebSocket(sessionId, {
        onFeedback: handleBackendFeedback
    });

    // Real MediaPipe hand detection
    const { isLoading: mediaPipeLoading } = useMediaPipeHands({
        videoElement,
        enabled: true,
        targetFps: 15,
        onHandsDetected: (hands) => {
            setDetectedHands(hands);
            if (hands.length > 0) {
                const metrics = hands[0].metrics;
                setCurrentMetrics(metrics);
                setIsAnalyzing(false);
                setTimeout(() => setIsAnalyzing(true), 200);

                // Use the new voice coach for intelligent coaching with expert comparison
                if (expertMetrics && voiceCoach.voiceEnabled) {
                    voiceCoach.coachOnMetrics(
                        {
                            scalpelAngle: metrics.scalpelAngle,
                            steadiness: metrics.steadiness,
                            gripType: metrics.gripType,
                            speed: metrics.speed,
                            handDetected: true // Hand is detected since we're in this callback
                        },
                        {
                            angleTarget: expertMetrics.angleTarget,
                            angleTolerance: expertMetrics.angleTolerance || 15,
                            steadinessTarget: expertMetrics.steadinessTarget || 70,
                            expectedGripType: expertMetrics.expectedGripType || 'unknown',
                            speedOptimal: 50,
                            speedTolerance: 15
                        }
                    );
                } else if (voiceCoach.voiceEnabled) {
                    // No expert baseline - use mock AI coaching based on current metrics
                    // This uses the coachOnMetrics with default targets to generate intelligent feedback
                    voiceCoach.coachOnMetrics(
                        {
                            scalpelAngle: metrics.scalpelAngle,
                            steadiness: metrics.steadiness,
                            gripType: metrics.gripType,
                            speed: metrics.speed,
                            handDetected: true
                        },
                        {
                            angleTarget: 45, // Default target angle
                            angleTolerance: 20, // More lenient without expert baseline
                            steadinessTarget: 70,
                            expectedGripType: 'pencil',
                            speedOptimal: 50,
                            speedTolerance: 20 // More lenient tolerance
                        }
                    );
                }
            }
        }
    });

    // Mock hand detection (fallback when MediaPipe not available)
    const { currentGrip: mockGrip } = useMockHandDetection({
        onGripChange: (grip: any) => {
            if (!backendConnected && detectedHands.length === 0) {
                triggerDemoFeedback();
            } else {
                sendGripState(grip, null);
            }
        }
    });

    // Get video element reference when component mounts
    useEffect(() => {
        if (videoFeedRef.current) {
            const videoEl = (videoFeedRef.current as any)?.getVideoElement?.();
            if (videoEl) setVideoElement(videoEl);
        }
    }, [videoFeedRef.current]);

    // Initialize session
    useEffect(() => {
        const initSession = async () => {
            try {
                const session = await startSession();
                setSessionId(session.sessionId);

                // Try to connect WebSocket
                if (session.sessionId) {
                    setTimeout(() => {
                        connect();
                    }, 500);
                }
            } catch (error) {
                console.log('Backend not available, using demo mode');
            }
        };

        initSession();

        return () => {
            // Cleanup will happen via hook
        };
    }, []);

    // Track WebSocket connection status
    useEffect(() => {
        setBackendConnected(isConnected);
    }, [isConnected]);

    // Format time as MM:SS
    const formatTime = (seconds: any) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Demo mode feedback trigger
    const triggerDemoFeedback = useCallback(() => {
        if (feedbackIndex >= DEMO_FEEDBACK.length) return;

        const demoFeedback = DEMO_FEEDBACK[feedbackIndex];
        // Map demo type to status
        const status: 'ON_TRACK' | 'WARNING' | 'CRITICAL' =
            demoFeedback.type === 'correction' ? 'WARNING' : 'ON_TRACK';

        const feedback = {
            status,
            message: demoFeedback.message,
            timestamp: sessionTime,
            id: Date.now(),
        };

        setCurrentFeedback(feedback);
        setFeedbackHistory(prev => [...prev.slice(-4), feedback]); // Keep last 5 for minimal trail
        setFeedbackIndex(prev => prev + 1);
        setIsAnalyzing(false);
        setTimeout(() => setIsAnalyzing(true), 500);

        // Show detection box briefly
        setDetectionBox({
            x: 30 + Math.random() * 20,
            y: 30 + Math.random() * 20,
            width: 30 + Math.random() * 10,
            height: 40 + Math.random() * 10,
        });

        setTimeout(() => setDetectionBox(null), 2000);

        // Speak feedback using Web Speech API
        speakWithWebSpeech(feedback.message);

        // Clear feedback after delay
        if (feedbackTimeoutRef.current) {
            clearTimeout(feedbackTimeoutRef.current);
        }
        feedbackTimeoutRef.current = setTimeout(() => {
            setCurrentFeedback(null);
        }, 4000);
    }, [feedbackIndex, sessionTime, speakWithWebSpeech]);

    // Session timer
    useEffect(() => {
        timerRef.current = setInterval(() => {
            setSessionTime(prev => prev + 1);
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
        };
    }, []);

    // Fast loop: Frame differencing for motion metrics (runs continuously when video is available)
    useEffect(() => {
        if (!videoFeedRef.current) return;

        const videoEl = (videoFeedRef.current as any)?.getVideoElement?.();
        if (!videoEl) return;

        // Create hidden canvas for frame capture
        const canvas = document.createElement('canvas');
        canvas.width = 160; // Downscaled for performance
        canvas.height = 120;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        frameCanvasRef.current = canvas;

        let frameCount = 0;
        const targetFps = 10; // Sample at 10fps for performance
        const frameIntervalMs = 1000 / targetFps;

        const processFrame = () => {
            if (!videoEl || videoEl.readyState < 2) return; // Not enough data

            const videoWidth = videoEl.videoWidth;
            const videoHeight = videoEl.videoHeight;
            if (!videoWidth || !videoHeight) return;

            // Draw video frame to canvas (grayscale, downscaled)
            ctx.drawImage(videoEl, 0, 0, videoWidth, videoHeight, 0, 0, canvas.width, canvas.height);
            const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);

            if (prevFrameRef.current) {
                // Compute frame difference
                const { mean, max, jitter } = computeFrameDifference(
                    prevFrameRef.current,
                    currentFrame,
                    canvas.width,
                    canvas.height
                );

                // Compute FPS (simple counter-based)
                const now = Date.now();
                const fps = frameCount > 0 && lastFrameTimeRef.current > 0
                    ? 1000 / (now - lastFrameTimeRef.current)
                    : targetFps;
                lastFrameTimeRef.current = now;
                frameCount++;

                // Create metric
                const metric: MotionMetrics = {
                    time: now,
                    fps,
                    motionMean: mean,
                    motionMax: max,
                    jitter,
                    presenceProxy: mean > 5 ? Math.min(1, mean / 50) : 0,
                };

                // Add to rolling window
                addMetric(metricsWindowRef.current, metric);

                // Fast loop: Generate feedback from metrics (max once per second)
                const feedback = feedbackGeneratorRef.current.generate({
                    motionMean: mean,
                    motionMax: max,
                    jitter,
                    presenceProxy: metric.presenceProxy,
                });

                if (feedback) {
                    // Pass status directly to UI (ON_TRACK, WARNING, CRITICAL)
                    const uiFeedback = {
                        status: feedback.status, // ON_TRACK, WARNING, or CRITICAL
                        message: feedback.text,
                        timestamp: feedback.timestamp / 1000, // Convert to seconds
                        id: feedback.timestamp,
                    };

                    setCurrentFeedback(uiFeedback);
                    setFeedbackHistory(prev => [...prev.slice(-4), uiFeedback]); // Keep last 5 for minimal trail

                    // Speak feedback
                    speakWithWebSpeech(feedback.text);
                }
            }

            prevFrameRef.current = currentFrame;
        };

        // Start frame processing loop (every ~100ms = 10fps)
        frameIntervalRef.current = setInterval(processFrame, frameIntervalMs);

        return () => {
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
            }
        };
    }, [videoFeedRef, speakWithWebSpeech]);

    // Coach summary removed - Part 2 focuses on single concise feedback only

    // Demo mode: Periodic feedback (when backend not connected) - keep as fallback
    useEffect(() => {
        if (!backendConnected && sessionTime > 0 && sessionTime % 8 === 0 && feedbackIndex < DEMO_FEEDBACK.length) {
            triggerDemoFeedback();
        }
    }, [sessionTime, backendConnected, feedbackIndex, triggerDemoFeedback]);

    const handleEndSession = async () => {
        // Try to end session on backend
        if (sessionId) {
            try {
                await endSession(sessionId);
            } catch (error) {
                console.log('Backend end session failed, using local data');
            }
        }

        // Generate and speak the summary
        const summary = voiceCoach.speakSummary();
        setSessionSummary({
            ...summary,
            duration: sessionTime
        });
        setShowSummary(true);

        console.log("Session Ended", { duration: sessionTime, events: feedbackHistory, summary });
    };

    return (
        <div className="h-full flex flex-col bg-bg-primary">
            {/* Header */}
            {!embedded && (
                <header className="flex justify-between items-center px-8 py-4 border-b border-border-subtle bg-bg-secondary max-[600px]:flex-wrap max-[600px]:gap-2">
                    <div className="flex items-center gap-6 max-[600px]:order-2">
                        <h2 className="text-xl tracking-wider">SurgeonSight AI</h2>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-accent-rust animate-pulse' : 'bg-success'}`} />
                            <span className="font-mono text-xs tracking-wider uppercase text-text-muted">
                                {isAnalyzing ? 'Analyzing' : 'Detected'}
                            </span>
                        </div>
                        {/* Connection status */}
                        <div className={`font-mono text-xs tracking-wider px-1 py-0.5 border ${backendConnected ? 'text-success border-success' : 'text-text-dim border-border-subtle'}`}>
                            {backendConnected ? '● LIVE' : '○ DEMO'}
                        </div>
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 max-[600px]:static max-[600px]:transform-none max-[600px]:order-1 max-[600px]:w-full max-[600px]:flex max-[600px]:justify-center">
                        <div className="flex flex-col items-center gap-0.5">
                            <span className="font-mono text-[0.55rem] tracking-widest uppercase text-text-dim">Session Time</span>
                            <span className="font-mono text-2xl tracking-wider text-accent-rust">{formatTime(sessionTime)}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 max-[600px]:order-3">
                        <ThemeToggle />
                        <button className="px-6 py-2 text-sm font-display tracking-wider text-text-cream bg-error border-2 border-error transition-all duration-250 hover:bg-error/80 hover:border-error/80 whitespace-nowrap" onClick={handleEndSession}>
                            End Session
                        </button>
                    </div>
                </header>
            )}

            {/* Main content */}
            <main className="flex-1 flex flex-col gap-6 p-6 max-[1000px]:gap-4 max-[1000px]:p-4">
                {/* Top: Video feed with hand tracking overlay - Full width */}
                <div className="relative flex flex-col bg-black/20 rounded-lg overflow-hidden border border-white/5 aspect-video max-h-[60vh]">
                    <CornerBrackets size="xl" animated>
                        <VideoFeed
                            ref={videoFeedRef}
                            detectionBox={detectionBox}
                            hands={detectedHands}
                            gripState={mockGrip}
                            showMetrics={true}
                            metrics={currentMetrics}
                            expertAngleTarget={expertMetrics?.angleTarget}
                        />
                    </CornerBrackets>
                    {mediaPipeLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <span className="font-mono text-sm text-accent-rust animate-pulse">Loading MediaPipe...</span>
                        </div>
                    )}
                </div>

                {/* Bottom: Three-column layout for Metrics, 3D View, and AI Coach */}
                <div className="grid grid-cols-3 gap-4 max-[1000px]:grid-cols-1">
                    {/* Surgical Metrics */}
                    <div className="bg-bg-secondary border border-border-subtle overflow-hidden">
                        <h3 className="text-xs tracking-widest px-4 pt-4 pb-2 border-b border-border-subtle text-text-muted uppercase">Surgical Metrics</h3>
                        <div className="p-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-bg-tertiary p-3 border border-border-subtle rounded">
                                    <span className="font-mono text-[0.6rem] text-text-dim uppercase block mb-1">Angle</span>
                                    <span className="font-mono text-2xl text-accent-rust">
                                        {currentMetrics ? `${currentMetrics.scalpelAngle.toFixed(1)}°` : '--'}
                                    </span>
                                </div>
                                <div className="bg-bg-tertiary p-3 border border-border-subtle rounded">
                                    <span className="font-mono text-[0.6rem] text-text-dim uppercase block mb-1">Steadiness</span>
                                    <span className={`font-mono text-2xl ${currentMetrics && currentMetrics.steadiness > 70 ? 'text-success' : 'text-warning'}`}>
                                        {currentMetrics ? `${currentMetrics.steadiness.toFixed(0)}%` : '--'}
                                    </span>
                                </div>
                                <div className="bg-bg-tertiary p-3 border border-border-subtle rounded">
                                    <span className="font-mono text-[0.6rem] text-text-dim uppercase block mb-1">Grip Type</span>
                                    <span className={`font-mono text-lg uppercase ${currentMetrics?.gripType === 'pencil' ? 'text-success' : currentMetrics?.gripType === 'power' ? 'text-warning' : 'text-text-dim'}`}>
                                        {currentMetrics?.gripType || '--'}
                                    </span>
                                </div>
                                <div className="bg-bg-tertiary p-3 border border-border-subtle rounded">
                                    <span className="font-mono text-[0.6rem] text-text-dim uppercase block mb-1">Speed</span>
                                    <span className="font-mono text-2xl text-text-cream">
                                        {currentMetrics ? currentMetrics.speed.toFixed(1) : '--'}
                                    </span>
                                </div>
                            </div>
                            <div className="px-4 pb-4 text-center">
                                <span className={`font-mono text-xs ${detectedHands.length > 0 ? 'text-success' : 'text-text-dim'}`}>
                                    {detectedHands.length > 0 ? `✓ ${detectedHands.length} hand(s) detected` : '○ Waiting for hand...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 3D Hand Visualization */}
                    <div className="bg-bg-secondary border border-border-subtle overflow-hidden">
                        <h3 className="text-xs tracking-widest px-4 pt-4 pb-2 border-b border-border-subtle text-text-muted uppercase">3D Hand View</h3>
                        <div className="p-4">
                            <Hand3DVisualization
                                metrics={currentMetrics}
                                hands={detectedHands.map(hand => ({
                                    landmarks: hand.landmarks,
                                    handedness: hand.handedness,
                                    metrics: hand.metrics
                                }))}
                            />
                        </div>
                    </div>

                    {/* AI Coach Voice Feedback */}
                    <VoiceFeedbackDisplay
                        isSpeaking={voiceCoach.isSpeaking}
                        displayedText={voiceCoach.displayedText}
                        currentMessage={voiceCoach.currentMessage}
                        messageHistory={voiceCoach.messageHistory}
                        stats={voiceCoach.stats}
                        voiceEnabled={voiceCoach.voiceEnabled}
                        onToggleVoice={voiceCoach.toggleVoice}
                        onTestVoice={voiceCoach.testVoice}
                    />
                </div>
            </main>

            {/* Session Summary Modal */}
            <SessionSummaryModal
                isOpen={showSummary}
                onClose={() => setShowSummary(false)}
                summary={sessionSummary}
                onPlayAgain={() => {
                    setShowSummary(false);
                    voiceCoach.resetStats();
                    setSessionTime(0);
                }}
            />
        </div>
    );
}

