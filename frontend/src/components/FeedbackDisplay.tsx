export default function FeedbackDisplay({ feedback }: any) {
    if (!feedback) {
        return (
            <div className="bg-bg-primary border border-l-[3px] border-l-border-subtle p-6 min-h-[200px] flex flex-col animate-[feedbackIn_0.3s_ease]">
                <div className="flex flex-col items-center justify-center flex-1 gap-2">
                    <span className="text-3xl text-text-dim opacity-50">◈</span>
                    <span className="font-mono text-xs tracking-wider uppercase text-text-dim">Awaiting feedback...</span>
                </div>
            </div>
        );
    }

    // Support both legacy type (correction/encouragement) and new status (ON_TRACK/WARNING/CRITICAL)
    const status = feedback.status || (feedback.type === 'correction' ? 'WARNING' : 'ON_TRACK');
    
    // Map status to display labels
    const statusLabels: Record<string, { label: string; color: string; borderColor: string; icon: string }> = {
        'ON_TRACK': { label: 'ON TRACK', color: 'text-success border-success', borderColor: 'border-l-success', icon: '✓' },
        'WARNING': { label: 'ADJUST', color: 'text-accent-rust border-accent-rust', borderColor: 'border-l-accent-rust', icon: '⚠' },
        'CRITICAL': { label: 'CRITICAL', color: 'text-error border-error', borderColor: 'border-l-error', icon: '⚡' },
    };

    const statusConfig = statusLabels[status] || statusLabels['ON_TRACK'];

    return (
        <div className={`bg-bg-primary border ${statusConfig.borderColor} border-l-[4px] p-6 min-h-[200px] flex flex-col animate-[feedbackIn_0.3s_ease]`}>
            <div className="flex justify-between items-center mb-4">
                <span className={`font-mono text-xs tracking-wider uppercase px-2 py-1 bg-bg-tertiary border ${statusConfig.color}`}>
                    {statusConfig.icon} {statusConfig.label}
                </span>
            </div>

            <p className="font-body text-base text-text-cream leading-relaxed flex-1 flex items-center">
                {feedback.message || feedback.text}
            </p>
        </div>
    );
}
