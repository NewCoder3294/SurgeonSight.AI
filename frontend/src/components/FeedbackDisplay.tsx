import './FeedbackDisplay.css';

export default function FeedbackDisplay({ feedback }) {
    if (!feedback) {
        return (
            <div className="feedback-display empty">
                <div className="feedback-placeholder">
                    <span className="placeholder-icon">◈</span>
                    <span className="placeholder-text">Awaiting Analysis...</span>
                </div>
            </div>
        );
    }

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`feedback-display ${feedback.type}`}>
            <div className="feedback-header">
                <span className={`feedback-type ${feedback.type}`}>
                    {feedback.type === 'correction' ? '⚠' : '✓'} {feedback.type}
                </span>
                <span className="feedback-time">{formatTime(feedback.timestamp)}</span>
            </div>

            <p className="feedback-message">{feedback.message}</p>

            <div className="feedback-visual">
                <div className="waveform">
                    {[...Array(20)].map((_, i) => (
                        <span
                            key={i}
                            className="wave-bar"
                            style={{
                                height: `${20 + Math.random() * 60}%`,
                                animationDelay: `${i * 0.05}s`
                            }}
                        />
                    ))}
                </div>
                <span className="audio-label">Voice Feedback Active</span>
            </div>
        </div>
    );
}
