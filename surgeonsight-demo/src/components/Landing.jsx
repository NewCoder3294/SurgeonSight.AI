import { useNavigate } from 'react-router-dom';
import CornerBrackets from './CornerBrackets';
import { FloatingMetadata } from './MetadataDisplay';
import ThemeToggle from './ThemeToggle';
import SponsorLogos from './SponsorLogos';
import './Landing.css';

export default function Landing() {
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
        <div className="landing">
            {/* Theme toggle */}
            <div className="theme-toggle-container">
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
            <main className="landing-content">
                <div className="hero-section">
                    {/* Pre-header - centered */}
                    <div className="pre-header animate-fade-in">
                        <span className="protocol-tag">[ NEXHACKS 2026 ]</span>
                    </div>

                    {/* Main headline */}
                    <h1 className="hero-title animate-fade-in-up">
                        <span className="title-line">Your AI</span>
                        <span className="title-line accent">Surgical</span>
                        <span className="title-line">Coach</span>
                    </h1>

                    {/* Subtext */}
                    <p className="hero-subtitle animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        Real-time feedback. Any language. Just a webcam.
                    </p>

                    {/* CTA */}
                    <div className="cta-container animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                        <CornerBrackets size="lg" animated>
                            <button
                                className="btn btn-primary cta-button"
                                onClick={() => navigate('/setup')}
                            >
                                Start Practice Session
                            </button>
                        </CornerBrackets>
                    </div>



                    {/* Features grid */}
                    <div className="features-grid animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                        <div className="feature-item">
                            <span className="feature-icon">◈</span>
                            <span className="feature-text">Computer Vision Analysis</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">◈</span>
                            <span className="feature-text">Voice Feedback &lt;500ms</span>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">◈</span>
                            <span className="feature-text">Realtime Feedback</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* Bottom metadata bar */}
            <footer className="landing-footer">
                <div className="footer-content">
                    <div className="version-info">
                        <span className="mono">SurgeonSight v1.0</span>
                    </div>
                </div>
            </footer>

            {/* Decorative elements */}
            <div className="grid-overlay" />

            {/* Dynamic backdrop - Medtech/AGI Theme */}
            <div className="dynamic-backdrop">
                {/* Floating orbs */}
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />
                <div className="orb orb-4" />

                {/* Horizontal scan lines */}
                <div className="floating-line line-1" />
                <div className="floating-line line-2" />
                <div className="floating-line line-3" />
                <div className="floating-line line-4" />
                <div className="floating-line line-5" />

                {/* Pulse rings */}
                <div className="pulse-ring ring-1" />
                <div className="pulse-ring ring-2" />
                <div className="pulse-ring ring-3" />

                {/* DNA Helix */}
                <div className="dna-helix">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="dna-strand" style={{ animationDelay: `${i * 0.15}s` }}>
                            <span className="dna-node left" />
                            <span className="dna-bridge" />
                            <span className="dna-node right" />
                        </div>
                    ))}
                </div>

                {/* EKG Heartbeat Lines */}
                <div className="ekg-container ekg-1">
                    <svg className="ekg-line" viewBox="0 0 400 60" preserveAspectRatio="none">
                        <path className="ekg-path" d="M0,30 L80,30 L90,30 L100,10 L110,50 L120,20 L130,40 L140,30 L200,30 L210,30 L220,5 L230,55 L240,15 L250,45 L260,30 L400,30" />
                    </svg>
                </div>
                <div className="ekg-container ekg-2">
                    <svg className="ekg-line" viewBox="0 0 400 60" preserveAspectRatio="none">
                        <path className="ekg-path" d="M0,30 L80,30 L90,30 L100,10 L110,50 L120,20 L130,40 L140,30 L200,30 L210,30 L220,5 L230,55 L240,15 L250,45 L260,30 L400,30" />
                    </svg>
                </div>

                {/* Neural Network Nodes */}
                <div className="neural-network">
                    {[...Array(15)].map((_, i) => (
                        <div
                            key={i}
                            className="neural-node"
                            style={{
                                left: `${10 + (i % 5) * 20}%`,
                                top: `${20 + Math.floor(i / 5) * 25}%`,
                                animationDelay: `${i * 0.3}s`
                            }}
                        />
                    ))}
                    {/* Neural connections */}
                    <svg className="neural-connections" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line x1="10" y1="20" x2="30" y2="45" className="neural-line" style={{ animationDelay: '0s' }} />
                        <line x1="30" y1="20" x2="50" y2="45" className="neural-line" style={{ animationDelay: '0.5s' }} />
                        <line x1="50" y1="20" x2="70" y2="45" className="neural-line" style={{ animationDelay: '1s' }} />
                        <line x1="70" y1="20" x2="90" y2="45" className="neural-line" style={{ animationDelay: '1.5s' }} />
                        <line x1="30" y1="45" x2="50" y2="70" className="neural-line" style={{ animationDelay: '2s' }} />
                        <line x1="50" y1="45" x2="70" y2="70" className="neural-line" style={{ animationDelay: '2.5s' }} />
                    </svg>
                </div>

                {/* Data Streams */}
                <div className="data-stream stream-1">
                    <span className="data-bit" />
                    <span className="data-bit" />
                    <span className="data-bit" />
                    <span className="data-bit" />
                    <span className="data-bit" />
                </div>
                <div className="data-stream stream-2">
                    <span className="data-bit" />
                    <span className="data-bit" />
                    <span className="data-bit" />
                    <span className="data-bit" />
                </div>
                <div className="data-stream stream-3">
                    <span className="data-bit" />
                    <span className="data-bit" />
                    <span className="data-bit" />
                    <span className="data-bit" />
                    <span className="data-bit" />
                    <span className="data-bit" />
                </div>

                {/* Hexagonal Grid */}
                <div className="hex-grid">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="hex-cell" style={{ animationDelay: `${i * 0.4}s` }} />
                    ))}
                </div>

                {/* Floating particles */}
                <div className="particles">
                    {[...Array(20)].map((_, i) => (
                        <span
                            key={i}
                            className="particle"
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
