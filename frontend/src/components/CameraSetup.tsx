import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CornerBrackets from './CornerBrackets';
import { FloatingMetadata } from './MetadataDisplay';
import ThemeToggle from './ThemeToggle';

export default function CameraSetup() {
    const navigate = useNavigate();
    const videoRef = useRef<any>(null);
    const [hasPermission, setHasPermission] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
                videoRef.current.srcObject.getTracks().forEach((track: any) => track.stop());
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
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="flex justify-between items-center px-8 py-4 border-b border-border-subtle">
                <button 
                    className="font-mono text-xs tracking-wider text-text-muted bg-transparent border-none cursor-pointer px-4 py-2 transition-colors duration-150 hover:text-accent-rust" 
                    onClick={() => navigate('/')}
                >
                    ← Back
                </button>
                <h2 className="text-2xl tracking-wider">Camera Setup</h2>
                <ThemeToggle />
            </header>

            {/* Floating metadata */}
            <FloatingMetadata
                position="bottom-right"
                items={[
                    { label: 'Resolution', value: '1280 × 720' },
                    { label: 'FPS', value: '30' },
                    { label: 'Status', value: hasPermission ? 'READY' : 'PENDING' },
                ]}
            />

            <main className="flex-1 p-12 flex items-center justify-center">
                <div className="grid grid-cols-[1fr_320px] gap-12 max-w-[1200px] w-full max-[900px]:grid-cols-1 max-[900px]:gap-8">
                    {/* Video preview */}
                    <div className="flex justify-center items-center">
                        <CornerBrackets size="xl" animated={hasPermission}>
                            <div className="w-full max-w-[720px] aspect-video bg-bg-secondary border border-border-subtle relative overflow-hidden">
                                {isLoading && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 border-2 border-border-subtle border-t-accent-rust rounded-full animate-spin" />
                                        <span className="font-mono text-xs tracking-wider text-text-muted uppercase">Initializing Camera...</span>
                                    </div>
                                )}

                                {error && (
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4 text-center p-8">
                                        <span className="text-4xl text-error">⚠</span>
                                        <span className="font-mono text-xs text-error tracking-wider">{error}</span>
                                    </div>
                                )}

                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover -scale-x-100 ${hasPermission ? 'block' : 'hidden'}`}
                                />

                                {hasPermission && (
                                    <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                                        <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent-rust-glow via-accent-rust via-accent-rust-glow to-transparent opacity-40 animate-scan-down" />
                                    </div>
                                )}
                            </div>
                        </CornerBrackets>
                    </div>

                    {/* Sidebar */}
                    <div className="flex flex-col gap-12 max-[900px]:max-w-[400px] max-[900px]:mx-auto">
                        <div className="flex flex-col gap-6">
                            <h3 className="text-base tracking-widest mb-6 pb-2 border-b border-border-subtle">Pre-Flight Check</h3>

                            <div className="flex flex-col gap-4">
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

                        <div className="mt-auto">
                            <CornerBrackets size="md">
                                <button
                                    className={`w-full px-8 py-6 text-xl font-display tracking-wider text-text-cream bg-accent-rust border-2 border-accent-rust transition-all duration-250 hover:bg-accent-rust-light hover:border-accent-rust-light disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none ${!allChecked ? 'disabled' : ''}`}
                                    onClick={handleBeginSession}
                                    disabled={!allChecked}
                                >
                                    Begin Session
                                </button>
                            </CornerBrackets>

                            {!allChecked && (
                                <p className="font-mono text-xs tracking-wider text-text-dim text-center mt-2 uppercase">Complete all checks to begin</p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

function ChecklistItem({ checked, label, description }: any) {
    return (
        <div className={`flex gap-4 p-4 bg-bg-secondary border transition-all duration-250 ${checked ? 'border-accent-rust' : 'border-border-subtle'}`}>
            <div className={`w-6 h-6 border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${checked ? 'border-accent-rust bg-accent-rust' : 'border-border-accent'}`}>
                {checked && <span className="text-text-cream text-sm font-bold">✓</span>}
            </div>
            <div className="flex flex-col gap-0.5">
                <span className="font-display text-sm tracking-wider text-text-cream">{label}</span>
                <span className="font-mono text-xs tracking-wider text-text-dim uppercase">{description}</span>
            </div>
        </div>
    );
}
