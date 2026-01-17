import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import CornerBrackets from './CornerBrackets';
import { FloatingMetadata } from './MetadataDisplay';
import FeedbackDisplay from './FeedbackDisplay';
import VideoFeed from './VideoFeed';
import ThemeToggle from './ThemeToggle';
import { useWebSocket, useVoiceFeedback } from '../hooks/useSession';
import { useMockHandDetection } from '../hooks/useHandDetection';
import { startSession, endSession } from '../utils/api';
import './CoachingSession.css';

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

    const corrections = feedbackHistory.filter(f => f.type === 'correction').length;
    const encouragements = feedbackHistory.filter(f => f.type === 'encouragement').length;

    return (
        <div className="coaching-session">
            {/* Header */}
            {!embedded && (
                <header className="session-header">
                    <div className="header-left">
                        <h2 className="session-title">SurgeonSight AI</h2>
                        <div className="status-indicator">
                            <span className={`status-dot ${isAnalyzing ? 'active' : 'success'}`} />
                            <span className="status-text">
                                {isAnalyzing ? 'Analyzing' : 'Detected'}
                            </span>
                        </div>
                        {/* Connection status */}
                        <div className={`connection-status ${backendConnected ? 'connected' : 'offline'}`}>
                            {backendConnected ? '● LIVE' : '○ DEMO'}
                        </div>
                    </div>

                    <div className="header-center">
                        <div className="session-timer">
                            <span className="timer-label">Session Time</span>
                            <span className="timer-value">{formatTime(sessionTime)}</span>
                        </div>
                    </div>

                    <div className="header-right">
                        <ThemeToggle />
                        <button className="btn btn-danger end-btn" onClick={handleEndSession}>
                            End Session
                        </button>
                    </div>
                </header>
            )}

            {/* Main content */}
            <main className="session-content">
                <div className="session-layout">
                    {/* Video feed */}
                    <div className="video-section">
                        <CornerBrackets size="xl" animated>
                            <VideoFeed
                                ref={videoFeedRef}
                                detectionBox={detectionBox}
                                hands={hands}
                                gripState={currentGrip || mockGrip}
                            />
                        </CornerBrackets>

                        {/* Floating stats */}
                        <FloatingMetadata
                            position="bottom-left"
                            items={[
                                { label: 'Corrections', value: corrections.toString() },
                                { label: 'Encouragements', value: encouragements.toString() },
                            ]}
                        />
                    </div>

                    {/* Sidebar */}
                    <aside className="session-sidebar">
                        {/* Current feedback */}
                        <div className="feedback-section">
                            <h3 className="section-title">Current Feedback</h3>
                            <FeedbackDisplay feedback={currentFeedback} />
                            {isSpeaking && (
                                <div className="speaking-indicator">
                                    <span className="speaking-dot" />
                                    Speaking...
                                </div>
                            )}
                        </div>

                        {/* Session stats */}
                        <div className="stats-section">
                            <h3 className="section-title">Session Stats</h3>
                            <div className="stats-grid">
                                <div className="stat-item">
                                    <span className="stat-value">{formatTime(sessionTime)}</span>
                                    <span className="stat-label">Duration</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">{feedbackHistory.length}</span>
                                    <span className="stat-label">Total Feedback</span>
                                </div>
                                <div className="stat-item correction">
                                    <span className="stat-value">{corrections}</span>
                                    <span className="stat-label">Corrections</span>
                                </div>
                                <div className="stat-item encouragement">
                                    <span className="stat-value">{encouragements}</span>
                                    <span className="stat-label">Encouragements</span>
                                </div>
                            </div>
                        </div>

                        {/* Recent history */}
                        <div className="history-section">
                            <h3 className="section-title">Recent</h3>
                            <div className="history-list">
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

                        {/* Manual trigger for demo */}
                        <button
                            className="btn btn-secondary trigger-btn"
                            onClick={triggerDemoFeedback}
                            disabled={feedbackIndex >= DEMO_FEEDBACK.length}
                        >
                            {backendConnected ? 'Force Feedback' : 'Simulate Feedback'}
                        </button>
                    </aside>
                </div>
            </main>
        </div>
    );
}
