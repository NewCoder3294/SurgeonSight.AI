import { useLocation, useNavigate } from 'react-router-dom';
import CornerBrackets from './CornerBrackets';
import { FloatingMetadata } from './MetadataDisplay';
import ThemeToggle from './ThemeToggle';
import './SessionSummary.css';

export default function SessionSummary() {
    const navigate = useNavigate();
    const location = useLocation();

    // Get data from navigation state or use defaults
    const { duration = 180, events = [] } = location.state || {};

    const corrections = events.filter(e => e.type === 'correction');
    const encouragements = events.filter(e => e.type === 'encouragement');

    // Calculate score (demo logic)
    const score = Math.min(100, Math.max(0,
        70 + (encouragements.length * 5) - (corrections.length * 3)
    ));

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getScoreLabel = (score) => {
        if (score >= 90) return 'EXCELLENT';
        if (score >= 75) return 'GOOD';
        if (score >= 60) return 'FAIR';
        return 'NEEDS WORK';
    };

    const getScoreClass = (score) => {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'fair';
        return 'needs-work';
    };

    return (
        <div className="session-summary">
            {/* Theme toggle */}
            <div className="theme-toggle-container">
                <ThemeToggle />
            </div>

            {/* Floating metadata */}
            <FloatingMetadata
                position="top-right"
                items={[
                    { label: 'Session ID', value: `SS-${Date.now().toString(36).toUpperCase()}` },
                    { label: 'Protocol', value: 'SUTURING-BASIC' },
                ]}
            />

            <main className="summary-content">
                {/* Header */}
                <header className="summary-header">
                    <span className="protocol-tag">[ SESSION COMPLETE ]</span>
                    <h1 className="summary-title">
                        <span className="title-line">Training</span>
                        <span className="title-line accent">Summary</span>
                    </h1>
                </header>

                {/* Score section */}
                <section className="score-section">
                    <CornerBrackets size="xl" animated>
                        <div className="score-display">
                            <div className="score-circle">
                                <span className="score-value">{score}</span>
                                <span className="score-max">/100</span>
                            </div>
                            <span className={`score-label ${getScoreClass(score)}`}>
                                {getScoreLabel(score)}
                            </span>
                        </div>
                    </CornerBrackets>
                </section>

                {/* Stats grid */}
                <section className="stats-section">
                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-icon">◷</span>
                            <div className="stat-content">
                                <span className="stat-value">{formatTime(duration)}</span>
                                <span className="stat-label">Duration</span>
                            </div>
                        </div>

                        <div className="stat-card">
                            <span className="stat-icon">◈</span>
                            <div className="stat-content">
                                <span className="stat-value">{events.length}</span>
                                <span className="stat-label">Total Feedback</span>
                            </div>
                        </div>

                        <div className="stat-card correction">
                            <span className="stat-icon">⚠</span>
                            <div className="stat-content">
                                <span className="stat-value">{corrections.length}</span>
                                <span className="stat-label">Corrections</span>
                            </div>
                        </div>

                        <div className="stat-card encouragement">
                            <span className="stat-icon">✓</span>
                            <div className="stat-content">
                                <span className="stat-value">{encouragements.length}</span>
                                <span className="stat-label">Encouragements</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Event timeline */}
                <section className="timeline-section">
                    <h3 className="section-title">Session Timeline</h3>

                    <div className="timeline">
                        <div className="timeline-event start">
                            <span className="event-time">00:00</span>
                            <div className="event-marker" />
                            <span className="event-message">Session started</span>
                        </div>

                        {events.map((event, index) => (
                            <div key={event.id || index} className={`timeline-event ${event.type}`}>
                                <span className="event-time">{formatTime(event.timestamp)}</span>
                                <div className="event-marker" />
                                <span className="event-message">{event.message}</span>
                            </div>
                        ))}

                        <div className="timeline-event end">
                            <span className="event-time">{formatTime(duration)}</span>
                            <div className="event-marker" />
                            <span className="event-message">Session ended</span>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="cta-section">
                    <CornerBrackets size="lg">
                        <button
                            className="btn btn-primary cta-button"
                            onClick={() => navigate('/')}
                        >
                            Practice Again
                        </button>
                    </CornerBrackets>

                    <button
                        className="btn btn-secondary secondary-btn"
                        onClick={() => navigate('/')}
                    >
                        Back to Home
                    </button>
                </section>
            </main>

            {/* Footer */}
            <footer className="summary-footer">
                <span className="mono">
                    "Because every surgeon deserves a coach."
                </span>
            </footer>
        </div>
    );
}
