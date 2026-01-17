import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CornerBrackets from './CornerBrackets';
import FeedbackDisplay from './FeedbackDisplay';
import VideoFeed from './VideoFeed';
import ThemeToggle from './ThemeToggle';
import { useWebSocket, useVoiceFeedback } from '../hooks/useSession';
import { useMockHandDetection } from '../hooks/useHandDetection';
import { startSession, endSession } from '../utils/api';

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

export default function CoachingSession({ embedded = false }: { embedded?: boolean }) {
    const navigate = useNavigate();
    const videoFeedRef = useRef(null);

    // Session state
    const [sessionId, setSessionId] = useState(null);
    const [sessionTime, setSessionTime] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(true);
    const [currentFeedback, setCurrentFeedback] = useState<any>(null);
    const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);
    const [detectionBox, setDetectionBox] = useState<any>(null);
    const [hands] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-unused-vars
    const [currentGrip] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
    const [backendConnected, setBackendConnected] = useState(false);

    // Demo mode state
    const [feedbackIndex, setFeedbackIndex] = useState(0);

    const timerRef = useRef<any>(null);
    const feedbackTimeoutRef = useRef<any>(null);

    // Voice feedback hook
    const { playFeedback, speakWithWebSpeech, isSpeaking } = useVoiceFeedback();

    // Handle incoming feedback from backend
    const handleBackendFeedback = useCallback((data: any) => {
        const feedback = {
            type: data.category,
            message: data.message,
            timestamp: data.timestamp,
            id: Date.now(),
        };

        setCurrentFeedback(feedback);
        setFeedbackHistory(prev => [...prev, feedback]);
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

    // Mock hand detection (used when MediaPipe not available)
    const { currentGrip: mockGrip } = useMockHandDetection({
        onGripChange: (grip: any) => {
            if (!backendConnected) {
                // Use demo mode feedback
                triggerDemoFeedback();
            } else {
                sendGripState(grip, null);
            }
        }
    });

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

        const feedback = {
            ...DEMO_FEEDBACK[feedbackIndex],
            timestamp: sessionTime,
            id: Date.now(),
        };

        setCurrentFeedback(feedback);
        setFeedbackHistory(prev => [...prev, feedback]);
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

    // Demo mode: Periodic feedback (when backend not connected)
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

        // Just show an alert or console log for now, as user requested removing summary
        console.log("Session Ended", { duration: sessionTime, events: feedbackHistory });

        // If embedded, maybe notify parent? For now, we'll just stop here.
        if (!embedded) {
            navigate('/'); // Go back to landing if standalone
        }
    };

    const corrections = feedbackHistory.filter((f: any) => f.type === 'correction').length;
    const encouragements = feedbackHistory.filter((f: any) => f.type === 'encouragement').length;

    return (
        <div className="min-h-screen flex flex-col bg-bg-primary">
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
            <main className="flex-1 p-6 flex max-[1000px]:flex-col">
                <div className="grid grid-cols-[1fr_340px] gap-6 w-full max-w-[1400px] mx-auto max-[1000px]:grid-cols-1">
                    {/* Video feed */}
                    <div className="relative flex flex-col">
                        <CornerBrackets size="xl" animated>
                            <VideoFeed
                                ref={videoFeedRef}
                                detectionBox={detectionBox}
                                hands={hands}
                                gripState={currentGrip || mockGrip}
                            />
                        </CornerBrackets>
                    </div>

                    {/* Sidebar */}
                    <aside className="flex flex-col gap-6 max-[1000px]:flex-row max-[1000px]:flex-wrap max-[1000px]:[&>*]:flex-1 max-[1000px]:[&>*]:min-w-[200px]">
                        {/* Current feedback */}
                        <div className="bg-bg-secondary border border-border-subtle p-4">
                            <h3 className="text-sm tracking-widest mb-4 pb-1 border-b border-border-subtle text-text-muted">Current Feedback</h3>
                            <FeedbackDisplay feedback={currentFeedback} />
                            {isSpeaking && (
                                <div className="flex items-center gap-2 mt-2 px-1 py-0.5 bg-bg-tertiary font-mono text-xs tracking-wider text-accent-rust">
                                    <span className="w-2 h-2 rounded-full bg-accent-rust animate-pulse" />
                                    Speaking...
                                </div>
                            )}
                        </div>

                        {/* Session stats */}
                        <div className="bg-bg-secondary border border-border-subtle p-4">
                            <h3 className="text-sm tracking-widest mb-4 pb-1 border-b border-border-subtle text-text-muted">Session Stats</h3>
                            <div className="grid grid-cols-2 gap-1">
                                <div className="flex flex-col justify-center gap-0 p-1 bg-bg-primary border border-border-subtle min-h-[50px]">
                                    <span className="font-display text-xl tracking-wider text-text-cream leading-tight">{formatTime(sessionTime)}</span>
                                    <span className="font-mono text-[0.55rem] tracking-wider uppercase text-text-dim">Duration</span>
                                </div>
                                <div className="flex flex-col justify-center gap-0 p-1 bg-bg-primary border border-border-subtle min-h-[50px]">
                                    <span className="font-display text-xl tracking-wider text-text-cream leading-tight">{feedbackHistory.length}</span>
                                    <span className="font-mono text-[0.55rem] tracking-wider uppercase text-text-dim">Total Feedback</span>
                                </div>
                                <div className="flex flex-col justify-center gap-0 p-1 bg-bg-primary border border-border-subtle min-h-[50px]">
                                    <span className="font-display text-xl tracking-wider text-accent-rust leading-tight">{corrections}</span>
                                    <span className="font-mono text-[0.55rem] tracking-wider uppercase text-text-dim">Corrections</span>
                                </div>
                                <div className="flex flex-col justify-center gap-0 p-1 bg-bg-primary border border-border-subtle min-h-[50px]">
                                    <span className="font-display text-xl tracking-wider text-success leading-tight">{encouragements}</span>
                                    <span className="font-mono text-[0.55rem] tracking-wider uppercase text-text-dim">Encouragements</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent history */}
                        <div className="bg-bg-secondary border border-border-subtle p-4 flex-1 min-h-[200px] flex flex-col max-[1000px]:min-h-[150px]">
                            <h3 className="text-sm tracking-widest mb-4 pb-1 border-b border-border-subtle text-text-muted">Recent</h3>
                            <div className="flex-1 overflow-y-auto flex flex-col gap-1">
                                {feedbackHistory.slice(-5).reverse().map((item: any) => (
                                    <div key={item.id} className={`flex gap-2 p-2 bg-bg-primary border-l-2 animate-[slideInLeft_0.3s_ease] ${item.type === 'correction' ? 'border-l-accent-rust' : item.type === 'encouragement' ? 'border-l-success' : 'border-l-border-subtle'}`}>
                                        <span className="font-mono text-xs text-text-dim min-w-[40px]">{formatTime(item.timestamp)}</span>
                                        <span className="font-body text-xs text-text-muted leading-snug">{item.message}</span>
                                    </div>
                                ))}
                                {feedbackHistory.length === 0 && (
                                    <div className="flex items-center justify-center h-full font-mono text-xs text-text-dim uppercase tracking-wider">
                                        <span>No feedback yet...</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Manual trigger for demo */}
                        <button
                            className="mt-auto px-4 py-2 text-xs font-display tracking-wider text-text-cream bg-transparent border border-border-subtle transition-all duration-250 hover:border-accent-rust hover:text-accent-rust disabled:opacity-30 disabled:cursor-not-allowed"
                            onClick={triggerDemoFeedback}
                            disabled={feedbackIndex >= DEMO_FEEDBACK.length}
                        >
                            {backendConnected ? 'Force Feedback' : 'Simulate Feedback'}
                        </button>
                    </aside>

                    {/* Recent history - Full Width Bottom */}
                    <div className="history-section full-width">
                        <h3 className="section-title">Recent Activity</h3>
                        <div className="history-list horizontal">
                            {feedbackHistory.slice(-5).reverse().map((item: any) => (
                                <div key={item.id} className={`history-item ${item.type}`}>
                                    <span className="history-time">{formatTime(item.timestamp)}</span>
                                    <span className="history-message">{item.message}</span>
                                </div>
                            ))}
                            {feedbackHistory.length === 0 && (
                                <div className="history-empty">
                                    <span>No feedback yet...</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
