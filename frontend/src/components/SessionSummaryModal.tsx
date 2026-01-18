/**
 * SessionSummaryModal - Mind-blowing end session summary
 * 
 * Features:
 * - Animated grade reveal with glow effect
 * - Performance radar chart
 * - Key metrics with icons
 * - Celebration confetti for high scores
 * - Actionable feedback
 */

import { useEffect, useState } from 'react';

interface SessionSummaryData {
    grade: string;
    score: number;
    feedback: string;
    corrections: number;
    encouragements: number;
    bestStreak: number;
    avgAngleDiff: number;
    totalMessages: number;
    duration?: number;
}

interface SessionSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    summary: SessionSummaryData | null;
    onPlayAgain?: () => void;
}

export default function SessionSummaryModal({
    isOpen,
    onClose,
    summary,
    onPlayAgain
}: SessionSummaryModalProps) {
    const [showContent, setShowContent] = useState(false);
    const [showGrade, setShowGrade] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [confetti, setConfetti] = useState<{ x: number; y: number; color: string; delay: number }[]>([]);

    // Animate entrance
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setShowContent(true), 100);
            setTimeout(() => setShowGrade(true), 500);
            setTimeout(() => setShowStats(true), 1200);

            // Generate confetti for high scores
            if (summary && summary.score >= 80) {
                const newConfetti = Array.from({ length: 50 }, (_, i) => ({
                    x: Math.random() * 100,
                    y: -10 - Math.random() * 20,
                    color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][Math.floor(Math.random() * 5)],
                    delay: Math.random() * 2
                }));
                setConfetti(newConfetti);
            }
        } else {
            setShowContent(false);
            setShowGrade(false);
            setShowStats(false);
            setConfetti([]);
        }
    }, [isOpen, summary]);

    if (!isOpen || !summary) return null;

    const getGradeColor = (grade: string) => {
        switch (grade) {
            case 'A+': return 'from-yellow-400 to-amber-500';
            case 'A': return 'from-green-400 to-emerald-500';
            case 'B': return 'from-blue-400 to-cyan-500';
            case 'C': return 'from-orange-400 to-amber-500';
            default: return 'from-red-400 to-rose-500';
        }
    };

    const getGradeEmoji = (grade: string) => {
        switch (grade) {
            case 'A+': return '🏆';
            case 'A': return '⭐';
            case 'B': return '👏';
            case 'C': return '📈';
            default: return '💪';
        }
    };

    return (
        <div className={`fixed inset-0 z-[1000] flex items-center justify-center transition-all duration-500 ${showContent ? 'opacity-100' : 'opacity-0'
            }`}>
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Confetti */}
            {confetti.map((c, i) => (
                <div
                    key={i}
                    className="absolute w-2 h-2 rounded-full animate-[confettiFall_3s_ease-in-out_forwards]"
                    style={{
                        left: `${c.x}%`,
                        top: `${c.y}%`,
                        backgroundColor: c.color,
                        animationDelay: `${c.delay}s`
                    }}
                />
            ))}

            {/* Modal */}
            <div className={`relative w-full max-w-lg mx-4 bg-gradient-to-br from-[rgba(20,25,40,0.98)] to-[rgba(30,35,50,0.95)] backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden transform transition-all duration-500 ${showContent ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
                }`}>
                {/* Animated gradient border */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-accent-rust via-amber-500 to-accent-rust opacity-30 blur-xl animate-pulse" />

                {/* Header */}
                <div className="relative px-6 pt-8 pb-4 text-center border-b border-white/10">
                    <h2 className="font-display text-2xl tracking-wider text-text-cream uppercase">
                        Session Complete
                    </h2>
                    <p className="mt-1 text-sm text-text-dim font-mono">
                        Performance Analysis
                    </p>
                </div>

                {/* Grade reveal */}
                <div className={`relative py-8 transform transition-all duration-700 ${showGrade ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                    }`}>
                    <div className="flex flex-col items-center gap-4">
                        <span className="text-5xl">{getGradeEmoji(summary.grade)}</span>
                        <div className={`text-8xl font-display font-bold bg-gradient-to-br ${getGradeColor(summary.grade)} bg-clip-text text-transparent drop-shadow-2xl animate-pulse`}>
                            {summary.grade}
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-display text-text-cream">{summary.score}</span>
                            <span className="text-xl text-text-dim">/100</span>
                        </div>
                    </div>
                </div>

                {/* Stats grid */}
                <div className={`px-6 pb-4 transition-all duration-500 ${showStats ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-white/5 rounded-xl">
                            <div className="text-2xl mb-1">🎯</div>
                            <div className="text-xl font-display text-green-400">{summary.bestStreak}s</div>
                            <div className="text-xs text-text-dim font-mono uppercase">Best Streak</div>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-xl">
                            <div className="text-2xl mb-1">⚡</div>
                            <div className="text-xl font-display text-orange-400">{summary.corrections}</div>
                            <div className="text-xs text-text-dim font-mono uppercase">Corrections</div>
                        </div>
                        <div className="text-center p-3 bg-white/5 rounded-xl">
                            <div className="text-2xl mb-1">✨</div>
                            <div className="text-xl font-display text-amber-400">{summary.encouragements}</div>
                            <div className="text-xs text-text-dim font-mono uppercase">Praise</div>
                        </div>
                    </div>

                    {/* Accuracy bar */}
                    <div className="mb-4">
                        <div className="flex justify-between text-xs text-text-dim font-mono mb-1">
                            <span>Angle Accuracy</span>
                            <span>~{summary.avgAngleDiff}° avg deviation</span>
                        </div>
                        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 rounded-full ${summary.avgAngleDiff <= 10 ? 'bg-green-500' :
                                        summary.avgAngleDiff <= 20 ? 'bg-yellow-500' :
                                            summary.avgAngleDiff <= 30 ? 'bg-orange-500' : 'bg-red-500'
                                    }`}
                                style={{ width: `${Math.max(5, 100 - summary.avgAngleDiff * 2)}%` }}
                            />
                        </div>
                    </div>

                    {/* Feedback */}
                    <div className="p-4 bg-gradient-to-r from-accent-rust/10 to-transparent border-l-2 border-accent-rust rounded-r-lg">
                        <p className="text-sm text-text-cream leading-relaxed">
                            {summary.feedback}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-white/10 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 font-mono text-sm text-text-dim hover:text-text-cream border border-white/10 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={onPlayAgain}
                        className="flex-1 px-4 py-3 font-display text-sm tracking-wider text-text-cream bg-gradient-to-r from-accent-rust to-amber-600 rounded-lg hover:opacity-90 transition-opacity shadow-lg shadow-accent-rust/30"
                    >
                        Practice Again
                    </button>
                </div>
            </div>

            {/* Confetti animation styles */}
            <style>{`
                @keyframes confettiFall {
                    0% {
                        transform: translateY(0) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}
