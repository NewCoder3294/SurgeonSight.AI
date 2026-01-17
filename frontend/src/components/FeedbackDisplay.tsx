export default function FeedbackDisplay({ feedback }: any) {
    if (!feedback) {
        return (
            <div className="bg-bg-primary border border-l-[3px] border-l-border-subtle p-4 min-h-[140px] flex flex-col animate-[feedbackIn_0.3s_ease]">
                <div className="flex flex-col items-center justify-center flex-1 gap-2">
                    <span className="text-2xl text-text-dim">◈</span>
                    <span className="font-mono text-xs tracking-wider uppercase text-text-dim">Awaiting Analysis...</span>
                </div>
            </div>
        );
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const borderClass = feedback.type === 'correction' ? 'border-l-[3px] border-l-accent-rust' : 
                       feedback.type === 'encouragement' ? 'border-l-[3px] border-l-success' : 
                       'border-l-[3px] border-l-border-subtle';

    const typeColorClass = feedback.type === 'correction' ? 'text-accent-rust border-accent-rust' : 
                          feedback.type === 'encouragement' ? 'text-success border-success' : '';

    return (
        <div className={`bg-bg-primary border ${borderClass} p-4 min-h-[140px] flex flex-col animate-[feedbackIn_0.3s_ease]`}>
            <div className="flex justify-between items-center mb-2">
                <span className={`font-mono text-xs tracking-wider uppercase px-1.5 py-0.5 bg-bg-tertiary border ${typeColorClass}`}>
                    {feedback.type === 'correction' ? '⚠' : '✓'} {feedback.type}
                </span>
                <span className="font-mono text-xs text-text-dim tracking-wider">{formatTime(feedback.timestamp)}</span>
            </div>

            <p className="font-body text-[0.95rem] text-text-cream leading-relaxed flex-1 flex items-center">{feedback.message}</p>

            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border-subtle">
                <div className="flex items-center gap-0.5 h-5 flex-1">
                    {[...Array(20)].map((_, i) => (
                        <span
                            key={i}
                            className="w-[3px] bg-accent-rust animate-[wavePulse_1s_ease-in-out_infinite]"
                            style={{
                                height: `${20 + Math.random() * 60}%`,
                                animationDelay: `${i * 0.05}s`
                            }}
                        />
                    ))}
                </div>
                <span className="font-mono text-[0.5rem] tracking-wider uppercase text-text-dim">Voice Feedback Active</span>
            </div>
        </div>
    );
}
