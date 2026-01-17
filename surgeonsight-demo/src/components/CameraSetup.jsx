import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CornerBrackets from './CornerBrackets';
import { FloatingMetadata } from './MetadataDisplay';
import ThemeToggle from './ThemeToggle';
import './CameraSetup.css';

export default function CameraSetup() {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [checklist, setChecklist] = useState({
        lighting: false,
        hands: false,
        instrument: false,
    });

    useEffect(() => {
        initCamera();
        return () => {
            // Cleanup camera on unmount
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const initCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setHasPermission(true);
            setIsLoading(false);

            // Auto-check items after a delay for demo effect
            setTimeout(() => setChecklist(prev => ({ ...prev, lighting: true })), 800);
            setTimeout(() => setChecklist(prev => ({ ...prev, hands: true })), 1600);
            setTimeout(() => setChecklist(prev => ({ ...prev, instrument: true })), 2400);

        } catch (err) {
            setError('Camera access denied. Please grant permission and refresh.');
            setIsLoading(false);
        }
    };

    const allChecked = Object.values(checklist).every(Boolean);

    const handleBeginSession = () => {
        // Store stream in sessionStorage or pass via context
        navigate('/session');
    };

    return (
        <div className="camera-setup">
            {/* Header */}
            <header className="setup-header">
                <button className="back-btn" onClick={() => navigate('/')}>
                    ← Back
                </button>
                <h2 className="setup-title">Camera Setup</h2>
                <ThemeToggle />
            </header>

            {/* Floating metadata */}
            <FloatingMetadata
                position="top-right"
                items={[
                    { label: 'Resolution', value: '1280 × 720' },
                    { label: 'FPS', value: '30' },
                    { label: 'Status', value: hasPermission ? 'READY' : 'PENDING' },
                ]}
            />

            <main className="setup-content">
                <div className="setup-layout">
                    {/* Video preview */}
                    <div className="video-preview-container">
                        <CornerBrackets size="xl" animated={hasPermission}>
                            <div className="video-preview">
                                {isLoading && (
                                    <div className="loading-state">
                                        <div className="loading-spinner" />
                                        <span className="loading-text">Initializing Camera...</span>
                                    </div>
                                )}

                                {error && (
                                    <div className="error-state">
                                        <span className="error-icon">⚠</span>
                                        <span className="error-text">{error}</span>
                                    </div>
                                )}

                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={hasPermission ? 'visible' : 'hidden'}
                                />

                                {hasPermission && (
                                    <div className="video-overlay">
                                        <div className="scan-line" />
                                    </div>
                                )}
                            </div>
                        </CornerBrackets>
                    </div>

                    {/* Sidebar */}
                    <div className="setup-sidebar">
                        <div className="checklist-section">
                            <h3 className="section-title">Pre-Flight Check</h3>

                            <div className="checklist">
                                <ChecklistItem
                                    checked={checklist.lighting}
                                    label="Good Lighting"
                                    description="Ensure your hands are well-lit"
                                />
                                <ChecklistItem
                                    checked={checklist.hands}
                                    label="Hands Visible"
                                    description="Position hands in frame"
                                />
                                <ChecklistItem
                                    checked={checklist.instrument}
                                    label="Instrument Ready"
                                    description="Suture kit in position"
                                />
                            </div>
                        </div>

                        <div className="cta-section">
                            <CornerBrackets size="md">
                                <button
                                    className={`btn btn-primary begin-btn ${!allChecked ? 'disabled' : ''}`}
                                    onClick={handleBeginSession}
                                    disabled={!allChecked}
                                >
                                    Begin Session
                                </button>
                            </CornerBrackets>

                            {!allChecked && (
                                <p className="cta-hint">Complete all checks to begin</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function ChecklistItem({ checked, label, description }) {
    return (
        <div className={`checklist-item ${checked ? 'checked' : ''}`}>
            <div className="checkbox">
                {checked && <span className="check-mark">✓</span>}
            </div>
            <div className="item-content">
                <span className="item-label">{label}</span>
                <span className="item-description">{description}</span>
            </div>
        </div>
    );
}
