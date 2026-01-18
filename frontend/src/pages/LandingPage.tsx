import { useNavigate } from 'react-router-dom';
import CornerBrackets from '../components/CornerBrackets';
import ThemeToggle from '../components/ThemeToggle';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="h-screen flex flex-col relative overflow-hidden bg-bg-primary">
            {/* Stationary theme toggle - top right within layout */}
            <div className="absolute top-6 right-8 z-10">
                <ThemeToggle />
            </div>

            {/* Main content - centered hero */}
            <main className="flex-1 flex items-center justify-center px-8 relative z-[1]">
                <div className="text-center max-w-[1000px]">
                    {/* Main headline */}
                    <h1 className="mb-6 leading-tight animate-fade-in-up">
                        <span className="block text-[clamp(2.5rem,10vw,7rem)] text-text-cream drop-shadow-[0_0_60px_rgba(245,240,232,0.1)]">Your AI</span>
                        <span className="block text-[clamp(2.5rem,10vw,7rem)] text-accent-rust drop-shadow-[0_0_80px_var(--accent-rust-glow)]">Surgical</span>
                        <span className="block text-[clamp(2.5rem,10vw,7rem)] text-text-cream drop-shadow-[0_0_60px_rgba(245,240,232,0.1)]">Coach</span>
                    </h1>

                    {/* Value proposition - one line */}
                    <p className="font-mono text-sm tracking-widest text-text-muted mb-10 uppercase animate-fade-in-up max-[768px]:text-xs max-[768px]:tracking-wider" style={{ animationDelay: '0.2s' }}>
                        Real-time feedback. Any language. Just a webcam.
                    </p>

                    {/* Primary CTA - decisive and anchored */}
                    <div className="inline-block mb-12 animate-fade-in-up max-[768px]:mb-8" style={{ animationDelay: '0.4s' }}>
                        <CornerBrackets size="lg" animated>
                            <button
                                className="px-12 py-6 text-2xl font-display tracking-widest text-text-cream bg-accent-rust border-2 border-accent-rust transition-all duration-250 hover:bg-accent-rust-light hover:border-accent-rust-light hover:shadow-[0_0_30px_var(--accent-rust-glow)] hover:-translate-y-0.5 max-[768px]:px-8 max-[768px]:py-4 max-[768px]:text-lg"
                                onClick={() => navigate('/training')}
                            >
                                Start Practice Session
                            </button>
                        </CornerBrackets>
                    </div>

                    {/* Minimal feature indicators */}
                    <div className="flex justify-center gap-10 flex-wrap animate-fade-in-up max-[768px]:flex-col max-[768px]:gap-3" style={{ animationDelay: '0.6s' }}>
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

            {/* Subtle grid overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0 bg-[image:linear-gradient(var(--accent-rust)_1px,transparent_1px),linear-gradient(90deg,var(--accent-rust)_1px,transparent_1px)] bg-[size:80px_80px]" />

            {/* Medical-themed ambient backdrop */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                {/* Soft floating orbs */}
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />

                {/* EKG Heartbeat Lines */}
                <div className="ekg-container ekg-left">
                    <svg className="ekg-line" viewBox="0 0 400 60" preserveAspectRatio="none">
                        <path d="M0,30 L80,30 L90,30 L100,10 L110,50 L120,20 L130,40 L140,30 L200,30 L210,30 L220,5 L230,55 L240,15 L250,45 L260,30 L400,30" />
                    </svg>
                </div>
                <div className="ekg-container ekg-right">
                    <svg className="ekg-line" viewBox="0 0 400 60" preserveAspectRatio="none">
                        <path d="M0,30 L80,30 L90,30 L100,10 L110,50 L120,20 L130,40 L140,30 L200,30 L210,30 L220,5 L230,55 L240,15 L250,45 L260,30 L400,30" />
                    </svg>
                </div>

                {/* DNA Helix */}
                <div className="dna-helix">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="dna-strand" style={{ animationDelay: `${i * 0.2}s` }}>
                            <span className="dna-node dna-node-left" />
                            <span className="dna-connector" />
                            <span className="dna-node dna-node-right" />
                        </div>
                    ))}
                </div>

                {/* Pulse Rings */}
                <div className="pulse-ring pulse-ring-1" />
                <div className="pulse-ring pulse-ring-2" />
                <div className="pulse-ring pulse-ring-3" />

                {/* Surgical Crosshair */}
                <div className="crosshair crosshair-1">
                    <div className="crosshair-h" />
                    <div className="crosshair-v" />
                    <div className="crosshair-circle" />
                </div>
                <div className="crosshair crosshair-2">
                    <div className="crosshair-h" />
                    <div className="crosshair-v" />
                    <div className="crosshair-circle" />
                </div>

                {/* Floating Medical Particles */}
                <div className="particles">
                    {[...Array(15)].map((_, i) => (
                        <span
                            key={i}
                            className="particle"
                            style={{
                                left: `${5 + (i * 6.5)}%`,
                                animationDuration: `${10 + Math.random() * 8}s`,
                                animationDelay: `${i * 0.5}s`
                            }}
                        />
                    ))}
                </div>

                {/* Vital Signs Monitor Lines */}
                <div className="vital-line vital-line-1" />
                <div className="vital-line vital-line-2" />
                <div className="vital-line vital-line-3" />

                {/* Molecular Structure */}
                <div className="molecule molecule-1">
                    <div className="atom atom-center" />
                    <div className="atom atom-orbit atom-1" />
                    <div className="atom atom-orbit atom-2" />
                    <div className="atom atom-orbit atom-3" />
                    <div className="bond bond-1" />
                    <div className="bond bond-2" />
                    <div className="bond bond-3" />
                </div>
                <div className="molecule molecule-2">
                    <div className="atom atom-center" />
                    <div className="atom atom-orbit atom-1" />
                    <div className="atom atom-orbit atom-2" />
                    <div className="bond bond-1" />
                    <div className="bond bond-2" />
                </div>
            </div>

            {/* Medical animation styles */}
            <style>{`
                /* Floating Orbs */
                .orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(80px);
                    opacity: 0.12;
                    background: radial-gradient(circle, var(--accent-rust) 0%, transparent 70%);
                }
                .orb-1 {
                    width: 500px; height: 500px;
                    top: -150px; right: -100px;
                    animation: float1 18s ease-in-out infinite;
                }
                .orb-2 {
                    width: 400px; height: 400px;
                    bottom: -100px; left: -100px;
                    background: radial-gradient(circle, var(--accent-rust-dark) 0%, transparent 70%);
                    animation: float2 22s ease-in-out infinite;
                }
                .orb-3 {
                    width: 300px; height: 300px;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    opacity: 0.08;
                    animation: float3 25s ease-in-out infinite;
                }

                /* EKG Lines */
                .ekg-container {
                    position: absolute;
                    width: 300px;
                    height: 50px;
                    overflow: hidden;
                    opacity: 0.2;
                }
                .ekg-left {
                    bottom: 25%;
                    left: 5%;
                }
                .ekg-right {
                    top: 20%;
                    right: 5%;
                    transform: scaleX(-1);
                }
                .ekg-line {
                    width: 200%;
                    height: 100%;
                    animation: ekgPulse 4s linear infinite;
                }
                .ekg-line path {
                    fill: none;
                    stroke: var(--accent-rust);
                    stroke-width: 2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    filter: drop-shadow(0 0 4px var(--accent-rust-glow));
                }

                /* DNA Helix */
                .dna-helix {
                    position: absolute;
                    right: 8%;
                    top: 20%;
                    height: 55%;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    opacity: 0.15;
                }
                .dna-strand {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    animation: dnaWave 3s ease-in-out infinite;
                }
                .dna-node {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--accent-rust);
                    box-shadow: 0 0 10px var(--accent-rust-glow);
                }
                .dna-node-left { animation: dnaNodeLeft 3s ease-in-out infinite; }
                .dna-node-right { animation: dnaNodeRight 3s ease-in-out infinite; }
                .dna-connector {
                    width: 30px;
                    height: 2px;
                    background: linear-gradient(to right, var(--accent-rust), var(--text-dim), var(--accent-rust));
                    opacity: 0.5;
                }

                /* Pulse Rings */
                .pulse-ring {
                    position: absolute;
                    border: 1px solid var(--accent-rust);
                    border-radius: 50%;
                    opacity: 0;
                }
                .pulse-ring-1 {
                    width: 120px; height: 120px;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    animation: pulseRing 6s ease-out infinite;
                }
                .pulse-ring-2 {
                    width: 80px; height: 80px;
                    top: 30%; left: 15%;
                    animation: pulseRing 7s ease-out infinite 2s;
                }
                .pulse-ring-3 {
                    width: 100px; height: 100px;
                    bottom: 25%; right: 20%;
                    animation: pulseRing 5s ease-out infinite 1s;
                }

                /* Surgical Crosshairs */
                .crosshair {
                    position: absolute;
                    width: 60px;
                    height: 60px;
                    opacity: 0.15;
                }
                .crosshair-1 {
                    top: 35%;
                    left: 12%;
                    animation: crosshairFloat 8s ease-in-out infinite;
                }
                .crosshair-2 {
                    bottom: 30%;
                    right: 15%;
                    animation: crosshairFloat 10s ease-in-out infinite 3s;
                }
                .crosshair-h, .crosshair-v {
                    position: absolute;
                    background: var(--accent-rust);
                }
                .crosshair-h {
                    width: 100%;
                    height: 1px;
                    top: 50%;
                }
                .crosshair-v {
                    width: 1px;
                    height: 100%;
                    left: 50%;
                }
                .crosshair-circle {
                    position: absolute;
                    width: 40px;
                    height: 40px;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    border: 1px solid var(--accent-rust);
                    border-radius: 50%;
                }

                /* Floating Particles */
                .particles {
                    position: absolute;
                    inset: 0;
                    overflow: hidden;
                }
                .particle {
                    position: absolute;
                    width: 3px;
                    height: 3px;
                    background: var(--accent-rust);
                    border-radius: 50%;
                    bottom: -10px;
                    opacity: 0;
                    animation: particleRise 12s ease-out infinite;
                }

                /* Vital Sign Lines */
                .vital-line {
                    position: absolute;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, var(--accent-rust), transparent);
                    opacity: 0.2;
                }
                .vital-line-1 {
                    width: 150px;
                    top: 15%;
                    left: -150px;
                    animation: vitalScan 12s linear infinite;
                }
                .vital-line-2 {
                    width: 100px;
                    top: 45%;
                    left: -100px;
                    animation: vitalScan 15s linear infinite 4s;
                }
                .vital-line-3 {
                    width: 120px;
                    top: 75%;
                    left: -120px;
                    animation: vitalScan 10s linear infinite 8s;
                }

                /* Molecular Structure */
                .molecule {
                    position: absolute;
                    opacity: 0.12;
                }
                .molecule-1 {
                    width: 80px;
                    height: 80px;
                    left: 8%;
                    top: 25%;
                    animation: moleculeFloat 15s ease-in-out infinite;
                }
                .molecule-2 {
                    width: 60px;
                    height: 60px;
                    right: 25%;
                    bottom: 15%;
                    animation: moleculeFloat 18s ease-in-out infinite 5s;
                }
                .atom {
                    position: absolute;
                    border-radius: 50%;
                    background: var(--accent-rust);
                    box-shadow: 0 0 8px var(--accent-rust-glow);
                }
                .atom-center {
                    width: 12px;
                    height: 12px;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                }
                .atom-orbit {
                    width: 8px;
                    height: 8px;
                }
                .atom-1 { top: 0; left: 50%; transform: translateX(-50%); animation: atomPulse 2s ease-in-out infinite; }
                .atom-2 { bottom: 10%; left: 10%; animation: atomPulse 2s ease-in-out infinite 0.5s; }
                .atom-3 { bottom: 10%; right: 10%; animation: atomPulse 2s ease-in-out infinite 1s; }
                .bond {
                    position: absolute;
                    height: 1px;
                    background: var(--accent-rust);
                    opacity: 0.5;
                    top: 50%;
                    left: 50%;
                    transform-origin: left center;
                }
                .bond-1 { width: 30px; transform: rotate(-90deg) translateY(-50%); }
                .bond-2 { width: 30px; transform: rotate(150deg) translateY(-50%); }
                .bond-3 { width: 30px; transform: rotate(30deg) translateY(-50%); }

                /* Keyframe Animations */
                @keyframes float1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-30px, 25px) scale(1.05); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(25px, -30px) scale(1.03); }
                }
                @keyframes float3 {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.08; }
                    50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.12; }
                }
                @keyframes ekgPulse {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes dnaWave {
                    0%, 100% { transform: translateX(0); }
                    50% { transform: translateX(8px); }
                }
                @keyframes dnaNodeLeft {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.3); }
                }
                @keyframes dnaNodeRight {
                    0%, 100% { transform: scale(1.3); }
                    50% { transform: scale(1); }
                }
                @keyframes pulseRing {
                    0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.4; }
                    100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
                }
                @keyframes crosshairFloat {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.15; }
                    25% { opacity: 0.25; }
                    50% { transform: translate(10px, -10px) rotate(5deg); opacity: 0.15; }
                    75% { opacity: 0.25; }
                }
                @keyframes particleRise {
                    0% { transform: translateY(0) scale(0); opacity: 0; }
                    10% { opacity: 0.6; transform: scale(1); }
                    90% { opacity: 0.3; }
                    100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
                }
                @keyframes vitalScan {
                    0% { left: -150px; opacity: 0; }
                    10% { opacity: 0.25; }
                    90% { opacity: 0.25; }
                    100% { left: 100%; opacity: 0; }
                }
                @keyframes moleculeFloat {
                    0%, 100% { transform: translate(0, 0) rotate(0deg); }
                    25% { transform: translate(5px, -8px) rotate(10deg); }
                    50% { transform: translate(-5px, -5px) rotate(-5deg); }
                    75% { transform: translate(-8px, 5px) rotate(5deg); }
                }
                @keyframes atomPulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                }

                /* Light Mode Overrides - More prominent animations */
                [data-theme="light"] .orb {
                    opacity: 0.25;
                    filter: blur(100px);
                }
                [data-theme="light"] .orb-3 {
                    opacity: 0.18;
                }
                [data-theme="light"] .ekg-container {
                    opacity: 0.4;
                }
                [data-theme="light"] .ekg-line path {
                    stroke: var(--accent-rust-dark);
                    stroke-width: 2.5;
                }
                [data-theme="light"] .dna-helix {
                    opacity: 0.3;
                }
                [data-theme="light"] .dna-node {
                    background: var(--accent-rust-dark);
                    box-shadow: 0 0 12px var(--accent-rust-glow);
                }
                [data-theme="light"] .crosshair {
                    opacity: 0.3;
                }
                [data-theme="light"] .crosshair-h,
                [data-theme="light"] .crosshair-v {
                    background: var(--accent-rust-dark);
                }
                [data-theme="light"] .crosshair-circle {
                    border-color: var(--accent-rust-dark);
                    border-width: 2px;
                }
                [data-theme="light"] .pulse-ring {
                    border-color: var(--accent-rust-dark);
                    border-width: 2px;
                }
                [data-theme="light"] .molecule {
                    opacity: 0.25;
                }
                [data-theme="light"] .atom {
                    background: var(--accent-rust-dark);
                    box-shadow: 0 0 12px var(--accent-rust-glow);
                }
                [data-theme="light"] .bond {
                    background: var(--accent-rust-dark);
                    opacity: 0.7;
                }
                [data-theme="light"] .particle {
                    background: var(--accent-rust-dark);
                    width: 4px;
                    height: 4px;
                }
                [data-theme="light"] .vital-line {
                    opacity: 0.35;
                    background: linear-gradient(90deg, transparent, var(--accent-rust-dark), transparent);
                }
            `}</style>
        </div>
    );
}