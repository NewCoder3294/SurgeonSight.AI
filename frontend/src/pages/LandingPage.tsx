import { useNavigate } from 'react-router-dom';
import CornerBrackets from '../components/CornerBrackets';
import { FloatingMetadata } from '../components/MetadataDisplay';
import ThemeToggle from '../components/ThemeToggle';

export default function LandingPage() {
    const navigate = useNavigate();

    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    }).toUpperCase();

    const currentTime = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-bg-primary">
            {/* Theme toggle */}
            <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100]">
                <ThemeToggle />
            </div>
            {/* Floating metadata overlays */}
            <FloatingMetadata
                position="top-left"
                items={[
                    { label: 'System Status', value: 'Online' },
                    { label: 'Protocol', value: 'SURGICAL-v1.0' },
                ]}
            />

            <FloatingMetadata
                position="top-right"
                items={[
                    { label: 'Location', value: '40.7128° N, 74.0060° W' },
                    { label: 'Date', value: currentDate },
                    { label: 'Time', value: currentTime },
                ]}
            />

            {/* Main content */}
            <main className="flex-1 flex items-center justify-center px-8 py-24 relative z-[1] max-[768px]:py-12 max-[768px]:px-4">
                <div className="text-center max-w-[1000px]">
                    {/* Pre-header - centered */}
                    <div className="flex items-center justify-center gap-4 mb-8 animate-fade-in">
                        <span className="font-mono text-xs tracking-widest text-accent-rust px-1 py-0.5 border border-border-subtle">[ NEXHACKS 2026 ]</span>
                    </div>

                    {/* Main headline */}
                    <h1 className="mb-8 leading-tight animate-fade-in-up">
                        <span className="block text-[clamp(4rem,15vw,12rem)] text-text-cream drop-shadow-[0_0_60px_rgba(245,240,232,0.1)]">Your AI</span>
                        <span className="block text-[clamp(4rem,15vw,12rem)] text-accent-rust drop-shadow-[0_0_80px_var(--accent-rust-glow)]">Surgical</span>
                        <span className="block text-[clamp(4rem,15vw,12rem)] text-text-cream drop-shadow-[0_0_60px_rgba(245,240,232,0.1)]">Coach</span>
                    </h1>

                    {/* Subtext */}
                    <p className="font-mono text-sm tracking-widest text-text-muted mb-12 uppercase animate-fade-in-up max-[768px]:text-xs max-[768px]:tracking-wider" style={{ animationDelay: '0.2s' }}>
                        Real-time feedback. Any language. Just a webcam.
                    </p>

                    {/* CTA */}
                    <div className="inline-block mb-24 animate-fade-in-up max-[768px]:mb-16" style={{ animationDelay: '0.4s' }}>
                        <CornerBrackets size="lg" animated>
                            <button
                                className="px-12 py-6 text-2xl font-display tracking-widest text-text-cream bg-accent-rust border-2 border-accent-rust transition-all duration-250 hover:bg-accent-rust-light hover:border-accent-rust-light hover:shadow-[0_0_25px_var(--accent-rust-glow)] hover:-translate-y-0.5 max-[768px]:px-8 max-[768px]:py-4 max-[768px]:text-base"
                                onClick={() => navigate('/training')}
                            >
                                Start Practice Session
                            </button>
                        </CornerBrackets>
                    </div>

                    {/* Features grid */}
                    <div className="flex justify-center gap-12 flex-wrap animate-fade-in-up max-[768px]:flex-col max-[768px]:gap-4" style={{ animationDelay: '0.6s' }}>
                        <div className="flex items-center gap-2">
                            <span className="text-accent-rust text-xs">◈</span>
                            <span className="font-mono text-xs tracking-wider text-text-muted uppercase">Computer Vision Analysis</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-accent-rust text-xs">◈</span>
                            <span className="font-mono text-xs tracking-wider text-text-muted uppercase">Voice Feedback &lt;500ms</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-accent-rust text-xs">◈</span>
                            <span className="font-mono text-xs tracking-wider text-text-muted uppercase">Realtime Feedback</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom metadata bar */}
            <footer className="px-8 py-6 border-t border-border-subtle relative z-[1]">
                <div className="flex justify-between items-center max-w-[1200px] mx-auto max-[768px]:flex-col max-[768px]:gap-4 max-[768px]:text-center">
                    <div className="text-text-dim">
                        <span className="font-mono">SurgeonSight v1.0</span>
                    </div>
                </div>
            </footer>

            {/* Decorative elements */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 bg-[image:linear-gradient(var(--accent-rust)_1px,transparent_1px),linear-gradient(90deg,var(--accent-rust)_1px,transparent_1px)] bg-[size:100px_100px] [data-theme='light']:opacity-[0.02]" />

            {/* Dynamic backdrop - Medtech/AGI Theme */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden [data-theme='light']:opacity-60">
                {/* Floating orbs */}
                <div className="absolute w-[600px] h-[600px] -top-[200px] -right-[100px] rounded-full blur-[80px] opacity-15 bg-[radial-gradient(circle,var(--accent-rust)_0%,transparent_70%)] animate-float1 [data-theme='light']:blur-[100px] [data-theme='light']:opacity-20" />
                <div className="absolute w-[400px] h-[400px] -bottom-[100px] -left-[100px] rounded-full blur-[80px] opacity-15 bg-[radial-gradient(circle,var(--accent-rust-dark)_0%,transparent_70%)] animate-float2 [data-theme='light']:blur-[100px] [data-theme='light']:opacity-20" />
                <div className="absolute w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px] opacity-15 bg-[radial-gradient(circle,rgba(245,240,232,0.3)_0%,transparent_70%)] animate-float3 [data-theme='light']:blur-[100px] [data-theme='light']:opacity-20" />
                <div className="absolute w-[200px] h-[200px] top-[60%] right-[30%] rounded-full blur-[60px] opacity-15 bg-[radial-gradient(circle,rgba(196,92,62,0.4)_0%,transparent_70%)] animate-float4 [data-theme='light']:blur-[100px] [data-theme='light']:opacity-20" />

                {/* Horizontal scan lines */}
                <div className="absolute h-px w-[200px] top-[20%] -left-[200px] opacity-30 bg-gradient-to-r from-transparent via-accent-rust-glow via-accent-rust to-transparent animate-lineFloat1 [data-theme='light']:opacity-20" />
                <div className="absolute h-px w-[150px] top-[60%] -left-[150px] opacity-30 bg-gradient-to-r from-transparent via-accent-rust-glow via-accent-rust to-transparent animate-lineFloat2 [data-theme='light']:opacity-20" style={{ animationDelay: '3s' }} />
                <div className="absolute h-px w-[100px] top-[40%] -left-[100px] opacity-30 bg-gradient-to-r from-transparent via-accent-rust-glow via-accent-rust to-transparent animate-lineFloat3 [data-theme='light']:opacity-20" style={{ animationDelay: '6s' }} />
                <div className="absolute h-px w-[180px] top-[80%] -left-[180px] opacity-30 bg-gradient-to-r from-transparent via-accent-rust-glow via-accent-rust to-transparent animate-lineFloat1 [data-theme='light']:opacity-20" style={{ animationDelay: '2s' }} />
                <div className="absolute h-px w-[120px] top-[15%] -left-[120px] opacity-30 bg-gradient-to-r from-transparent via-accent-rust-glow via-accent-rust to-transparent animate-lineFloat2 [data-theme='light']:opacity-20" style={{ animationDelay: '4s' }} />

                {/* Pulse rings */}
                <div className="absolute w-[100px] h-[100px] top-[30%] right-[15%] border border-accent-rust rounded-full opacity-0 animate-pulseRing [data-theme='light']:border-accent-rust-dark" />
                <div className="absolute w-[80px] h-[80px] bottom-[25%] left-[10%] border border-accent-rust rounded-full opacity-0 animate-pulseRing [data-theme='light']:border-accent-rust-dark" style={{ animationDelay: '2s', animationDuration: '5s' }} />
                <div className="absolute w-[120px] h-[120px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-accent-rust rounded-full opacity-0 animate-pulseRing [data-theme='light']:border-accent-rust-dark" style={{ animationDelay: '1s', animationDuration: '6s' }} />

                {/* DNA Helix */}
                <div className="absolute right-[5%] top-[20%] h-[60%] flex flex-col gap-3 opacity-15 [data-theme='light']:opacity-10">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="flex items-center gap-1 animate-dnaWave" style={{ animationDelay: `${i * 0.15}s` }}>
                            <span className="w-2 h-2 rounded-full bg-accent-rust shadow-[0_0_10px_var(--accent-rust-glow)] animate-dnaNodeLeft" />
                            <span className="w-[30px] h-0.5 bg-gradient-to-r from-accent-rust via-text-dim to-accent-rust opacity-50" />
                            <span className="w-2 h-2 rounded-full bg-accent-rust shadow-[0_0_10px_var(--accent-rust-glow)] animate-dnaNodeRight" />
                        </div>
                    ))}
                </div>

                {/* EKG Heartbeat Lines */}
                <div className="absolute w-[300px] h-10 bottom-[30%] left-[5%] overflow-hidden opacity-25 [data-theme='light']:opacity-15">
                    <svg className="w-[200%] h-full animate-ekgPulse" viewBox="0 0 400 60" preserveAspectRatio="none">
                        <path className="fill-none stroke-accent-rust stroke-2 stroke-linecap-round stroke-linejoin-round drop-shadow-[0_0_4px_var(--accent-rust-glow)]" d="M0,30 L80,30 L90,30 L100,10 L110,50 L120,20 L130,40 L140,30 L200,30 L210,30 L220,5 L230,55 L240,15 L250,45 L260,30 L400,30" />
                    </svg>
                </div>
                <div className="absolute w-[300px] h-10 top-[15%] right-[20%] overflow-hidden opacity-25 -scale-x-100 [data-theme='light']:opacity-15">
                    <svg className="w-[200%] h-full animate-ekgPulse" viewBox="0 0 400 60" preserveAspectRatio="none">
                        <path className="fill-none stroke-accent-rust stroke-2 stroke-linecap-round stroke-linejoin-round drop-shadow-[0_0_4px_var(--accent-rust-glow)]" d="M0,30 L80,30 L90,30 L100,10 L110,50 L120,20 L130,40 L140,30 L200,30 L210,30 L220,5 L230,55 L240,15 L250,45 L260,30 L400,30" />
                    </svg>
                </div>

                {/* Neural Network Nodes */}
                <div className="absolute left-[3%] top-[15%] w-[25%] h-[50%] opacity-12 [data-theme='light']:opacity-8">
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2.5 h-2.5 bg-accent-rust rounded-full shadow-[0_0_15px_var(--accent-rust-glow)] animate-neuralPulse"
                            style={{
                                left: `${10 + (i % 5) * 20}%`,
                                top: `${20 + Math.floor(i / 5) * 25}%`,
                                animationDelay: `${i * 0.3}s`
                            }}
                        />
                    ))}
                    <svg className="absolute w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line x1="10" y1="20" x2="30" y2="45" className="stroke-accent-rust stroke-[0.5] opacity-0 animate-neuralFire" style={{ animationDelay: '0s' }} />
                        <line x1="30" y1="20" x2="50" y2="45" className="stroke-accent-rust stroke-[0.5] opacity-0 animate-neuralFire" style={{ animationDelay: '0.5s' }} />
                        <line x1="50" y1="20" x2="70" y2="45" className="stroke-accent-rust stroke-[0.5] opacity-0 animate-neuralFire" style={{ animationDelay: '1s' }} />
                        <line x1="70" y1="20" x2="90" y2="45" className="stroke-accent-rust stroke-[0.5] opacity-0 animate-neuralFire" style={{ animationDelay: '1.5s' }} />
                        <line x1="30" y1="45" x2="50" y2="70" className="stroke-accent-rust stroke-[0.5] opacity-0 animate-neuralFire" style={{ animationDelay: '2s' }} />
                        <line x1="50" y1="45" x2="70" y2="70" className="stroke-accent-rust stroke-[0.5] opacity-0 animate-neuralFire" style={{ animationDelay: '2.5s' }} />
                    </svg>
                </div>

                {/* Data Streams */}
                <div className="absolute right-[12%] top-[10%] flex flex-col gap-5 animate-dataStreamFloat">
                    {[...Array(5)].map((_, i) => (
                        <span key={i} className="w-0.5 h-4 bg-gradient-to-b from-transparent via-accent-rust to-transparent opacity-0 animate-dataBitFall" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                </div>
                <div className="absolute left-[8%] bottom-[20%] flex flex-col gap-5 animate-dataStreamFloatReverse" style={{ animationDelay: '3s' }}>
                    {[...Array(4)].map((_, i) => (
                        <span key={i} className="w-0.5 h-4 bg-gradient-to-b from-transparent via-accent-rust to-transparent opacity-0 animate-dataBitFall" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                </div>
                <div className="absolute right-[25%] bottom-[35%] flex flex-col gap-5 animate-dataStreamFloat" style={{ animationDelay: '6s' }}>
                    {[...Array(6)].map((_, i) => (
                        <span key={i} className="w-0.5 h-4 bg-gradient-to-b from-transparent via-accent-rust to-transparent opacity-0 animate-dataBitFall" style={{ animationDelay: `${i * 0.2}s` }} />
                    ))}
                </div>

                {/* Hexagonal Grid */}
                <div className="absolute bottom-[10%] right-[8%] grid grid-cols-4 gap-2 opacity-10 -rotate-[15deg] [data-theme='light']:opacity-8" style={{ width: 'auto' }}>
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="w-10 h-[46px] bg-transparent relative animate-hexPulse" style={{ animationDelay: `${i * 0.4}s`, clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', border: '1px solid var(--accent-rust)' }} />
                    ))}
                </div>

                {/* Floating particles */}
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                        <span
                            key={i}
                            className="absolute w-0.5 h-0.5 bg-accent-rust rounded-full bottom-[-10px] opacity-0 animate-particleRise [data-theme='light']:bg-accent-rust-dark"
                            style={{
                                left: `${Math.random() * 100}%`,
                                animationDuration: `${8 + Math.random() * 12}s`,
                                animationDelay: `${Math.random() * 5}s`
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}