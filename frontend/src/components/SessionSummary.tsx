import { useLocation, useNavigate } from 'react-router-dom';
import CornerBrackets from './CornerBrackets';
import { FloatingMetadata } from './MetadataDisplay';
import ThemeToggle from './ThemeToggle';

export default function SessionSummary() {
    const navigate = useNavigate();
    const location = useLocation();

    // Get data from navigation state or use defaults
    const { duration = 180, events = [] } = (location.state || {}) as any;

    const corrections = events.filter((e: any) => e.type === 'correction');
    const encouragements = events.filter((e: any) => e.type === 'encouragement');

    // Calculate score (demo logic)
    const score = Math.min(100, Math.max(0,
        70 + (encouragements.length * 5) - (corrections.length * 3)
    ));

    const formatTime = (seconds: any) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getScoreLabel = (score: any) => {
        if (score >= 90) return 'EXCELLENT';
        if (score >= 75) return 'GOOD';
        if (score >= 60) return 'FAIR';
        return 'NEEDS WORK';
    };

    const getScoreClass = (score: any) => {
        if (score >= 90) return 'text-success';
        if (score >= 75) return 'text-accent-rust';
        if (score >= 60) return 'text-warning';
        return 'text-error';
    };

    return (
        <div className="min-h-screen flex flex-col relative">
            {/* Theme toggle */}
            <div className="fixed top-6 left-6 z-[100]">
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

            <main className="flex-1 max-w-[800px] mx-auto py-12 px-8 w-full">
                {/* Header */}
                <header className="text-center mb-12">
                    <span className="font-mono text-xs tracking-[0.3em] text-success px-2 py-1 border border-success inline-block mb-6">[ SESSION COMPLETE ]</span>
                    <h1 className="leading-[0.95]">
                        <span className="block text-[clamp(3rem,10vw,6rem)] text-text-cream">Training</span>
                        <span className="block text-[clamp(3rem,10vw,6rem)] text-accent-rust">Summary</span>
                    </h1>
                </header>

                {/* Score section */}
                <section className="flex justify-center mb-12">
                    <CornerBrackets size="xl" animated>
                        <div className="flex flex-col items-center gap-4 p-12">
                            <div className="flex items-baseline gap-1">
                                <span className="font-display text-[6rem] tracking-[0.02em] text-text-cream leading-none">{score}</span>
                                <span className="font-mono text-2xl text-text-dim">/100</span>
                            </div>
                            <span className={`font-display text-2xl tracking-[0.3em] ${getScoreClass(score)}`}>
                                {getScoreLabel(score)}
                            </span>
                        </div>
                    </CornerBrackets>
                </section>

                {/* Stats grid */}
                <section className="mb-12">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-bg-secondary border border-border-subtle p-6 flex flex-col items-center gap-2 text-center">
                            <span className="text-xl text-text-muted">◷</span>
                            <div className="flex flex-col gap-0.5">
                                <span className="font-display text-3xl tracking-wider text-text-cream">{formatTime(duration)}</span>
                                <span className="font-mono text-[0.55rem] tracking-wider uppercase text-text-dim">Duration</span>
                            </div>
                        </div>

                        <div className="bg-bg-secondary border border-border-subtle p-6 flex flex-col items-center gap-2 text-center">
                            <span className="text-xl text-text-muted">◈</span>
                            <div className="flex flex-col gap-0.5">
                                <span className="font-display text-3xl tracking-wider text-text-cream">{events.length}</span>
                                <span className="font-mono text-[0.55rem] tracking-wider uppercase text-text-dim">Total Feedback</span>
                            </div>
                        </div>

                        <div className="bg-bg-secondary border border-border-subtle p-6 flex flex-col items-center gap-2 text-center">
                            <span className="text-xl text-accent-rust">⚠</span>
                            <div className="flex flex-col gap-0.5">
                                <span className="font-display text-3xl tracking-wider text-accent-rust">{corrections.length}</span>
                                <span className="font-mono text-[0.55rem] tracking-wider uppercase text-text-dim">Corrections</span>
                            </div>
                        </div>

                        <div className="bg-bg-secondary border border-border-subtle p-6 flex flex-col items-center gap-2 text-center">
                            <span className="text-xl text-success">✓</span>
                            <div className="flex flex-col gap-0.5">
                                <span className="font-display text-3xl tracking-wider text-success">{encouragements.length}</span>
                                <span className="font-mono text-[0.55rem] tracking-wider uppercase text-text-dim">Encouragements</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Event timeline */}
                <section className="mb-12">
                    <h3 className="text-base tracking-widest mb-6 pb-2 border-b border-border-subtle text-text-muted">Session Timeline</h3>

                    <div className="flex flex-col gap-0 relative pl-[60px] max-[480px]:pl-10">
                        <div className="absolute left-[55px] top-2 bottom-2 w-px bg-border-subtle max-[480px]:left-[35px]" />
                        <div className="flex items-start gap-4 py-2 relative">
                            <span className="font-mono text-xs text-text-dim tracking-wider absolute left-[-60px] w-[45px] text-right max-[480px]:left-[-40px] max-[480px]:w-[30px] max-[480px]:text-[0.55rem]">00:00</span>
                            <div className="w-2.5 h-2.5 rounded-full bg-border-accent border-2 border-bg-primary absolute left-[-5px] z-[1] max-[480px]:left-[-8px]" />
                            <span className="font-mono text-xs tracking-wider uppercase text-text-dim pl-4">Session started</span>
                        </div>

                        {events.map((event: any, index: any) => (
                            <div key={event.id || index} className="flex items-start gap-4 py-2 relative">
                                <span className="font-mono text-xs text-text-dim tracking-wider absolute left-[-60px] w-[45px] text-right max-[480px]:left-[-40px] max-[480px]:w-[30px] max-[480px]:text-[0.55rem]">{formatTime(event.timestamp)}</span>
                                <div className={`w-2.5 h-2.5 rounded-full border-2 border-bg-primary absolute left-[-5px] z-[1] max-[480px]:left-[-8px] ${event.type === 'correction' ? 'bg-accent-rust shadow-[0_0_8px_var(--accent-rust-glow)]' : event.type === 'encouragement' ? 'bg-success shadow-[0_0_8px_rgba(74,159,110,0.4)]' : 'bg-border-accent'}`} />
                                <span className="font-body text-sm text-text-muted leading-snug pl-4">{event.message}</span>
                            </div>
                        ))}

                        <div className="flex items-start gap-4 py-2 relative">
                            <span className="font-mono text-xs text-text-dim tracking-wider absolute left-[-60px] w-[45px] text-right max-[480px]:left-[-40px] max-[480px]:w-[30px] max-[480px]:text-[0.55rem]">{formatTime(duration)}</span>
                            <div className="w-2.5 h-2.5 rounded-full bg-text-dim border-2 border-bg-primary absolute left-[-5px] z-[1] max-[480px]:left-[-8px]" />
                            <span className="font-mono text-xs tracking-wider uppercase text-text-dim pl-4">Session ended</span>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="flex flex-col items-center gap-4">
                    <CornerBrackets size="lg">
                        <button
                            className="px-12 py-6 text-xl font-display tracking-wider text-text-cream bg-accent-rust border-2 border-accent-rust transition-all duration-250 hover:bg-accent-rust-light hover:border-accent-rust-light"
                            onClick={() => navigate('/')}
                        >
                            Practice Again
                        </button>
                    </CornerBrackets>

                    <button
                        className="px-6 py-2 text-sm font-display tracking-wider text-text-cream bg-transparent border border-border-subtle transition-all duration-250 hover:border-accent-rust hover:text-accent-rust"
                        onClick={() => navigate('/')}
                    >
                        Back to Home
                    </button>
                </section>
            </main>

            {/* Footer */}
            <footer className="px-8 py-6 text-center border-t border-border-subtle">
                <span className="font-mono text-text-dim italic">
                    "Because every surgeon deserves a coach."
                </span>
            </footer>
        </div>
    );
}
