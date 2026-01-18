/**
 * VoiceFeedbackDisplay - Animated voice coaching feedback
 * 
 * Features:
 * - Typing animation for current message
 * - Glowing speaking indicator
 * - Message history with fade effect
 * - Premium glass morphism design
 */

import { useEffect, useState } from 'react';
import type { VoiceMessage, SessionStats } from '../hooks/useVoiceCoach';

interface VoiceFeedbackDisplayProps {
    isSpeaking: boolean;
    displayedText: string;
    currentMessage: string;
    messageHistory: VoiceMessage[];
    stats: SessionStats;
    voiceEnabled: boolean;
    onToggleVoice: () => void;
    onTestVoice: () => void;
}

export default function VoiceFeedbackDisplay({
    isSpeaking,
    displayedText,
    currentMessage,
    messageHistory,
    stats,
    voiceEnabled,
    onToggleVoice,
    onTestVoice
}: VoiceFeedbackDisplayProps) {
    const [showHistory, setShowHistory] = useState(false);

    // Determine message type color
    const getTypeColor = (type: VoiceMessage['type']) => {
        switch (type) {
            case 'warning': return 'text-red-400';
            case 'encouragement': return 'text-green-400';
            case 'summary': return 'text-amber-400';
            default: return 'text-accent-rust';
        }
    };

    const getTypeIcon = (type: VoiceMessage['type']) => {
        switch (type) {
            case 'warning': return '⚠️';
            case 'encouragement': return '✨';
            case 'summary': return '📊';
            default: return '🎯';
        }
    };

    return (
        <div className="relative overflow-hidden">
            {/* Main feedback card with glass morphism */}
            <div className="relative bg-gradient-to-br from-[rgba(20,25,40,0.95)] to-[rgba(30,35,50,0.9)] backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
                {/* Animated gradient border */}
                <div className="absolute inset-0 bg-gradient-to-r from-accent-rust/20 via-transparent to-accent-rust/20 animate-pulse opacity-50" />

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        {/* Speaking indicator with glow */}
                        <div className={`relative w-3 h-3 rounded-full transition-all duration-300 ${isSpeaking
                                ? 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.8)] animate-pulse'
                                : voiceEnabled
                                    ? 'bg-accent-rust shadow-[0_0_8px_rgba(205,127,50,0.5)]'
                                    : 'bg-gray-500'
                            }`}>
                            {isSpeaking && (
                                <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75" />
                            )}
                        </div>
                        <span className="font-display text-sm tracking-wider text-text-cream uppercase">
                            AI Coach
                        </span>
                        {isSpeaking && (
                            <span className="text-xs text-green-400 animate-pulse">Speaking...</span>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onTestVoice}
                            className="px-2 py-1 text-xs font-mono text-text-dim hover:text-accent-rust transition-colors"
                            title="Test voice"
                        >
                            🔊 Test
                        </button>
                        <button
                            onClick={onToggleVoice}
                            className={`px-3 py-1.5 text-xs font-mono rounded-lg transition-all duration-300 ${voiceEnabled
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                                    : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                                }`}
                        >
                            Voice {voiceEnabled ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>

                {/* Current message with typing effect */}
                <div className="px-4 py-4 min-h-[80px]">
                    {currentMessage ? (
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">
                                {getTypeIcon(messageHistory[messageHistory.length - 1]?.type || 'coaching')}
                            </span>
                            <div className="flex-1">
                                <p className={`font-display text-lg leading-relaxed ${getTypeColor(messageHistory[messageHistory.length - 1]?.type || 'coaching')
                                    }`}>
                                    {displayedText}
                                    {displayedText !== currentMessage && (
                                        <span className="inline-block w-0.5 h-5 ml-1 bg-current animate-blink" />
                                    )}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-dim">
                            <span className="font-mono text-sm">
                                {voiceEnabled
                                    ? '🎯 Waiting for hand detection...'
                                    : '🔇 Voice disabled - click to enable'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Stats bar */}
                <div className="px-4 py-2 border-t border-white/10 bg-black/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs font-mono text-text-dim">
                            <span className="flex items-center gap-1">
                                <span className="text-orange-400">⚡</span>
                                {stats.corrections} corrections
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="text-green-400">✓</span>
                                {stats.encouragements} praise
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs font-mono">
                            <span className="text-accent-rust">
                                Score: {stats.overallScore}%
                            </span>
                            <span className="text-green-400">
                                Streak: {Math.round(stats.currentStreak)}s
                            </span>
                        </div>
                    </div>

                    {/* Progress bar for score */}
                    <div className="mt-2 h-1.5 bg-black/30 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${stats.overallScore >= 80 ? 'bg-green-500' :
                                    stats.overallScore >= 60 ? 'bg-yellow-500' :
                                        stats.overallScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                            style={{ width: `${stats.overallScore}%` }}
                        />
                    </div>
                </div>

                {/* History toggle */}
                {messageHistory.length > 1 && (
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full px-4 py-2 text-xs font-mono text-text-dim text-center hover:bg-white/5 transition-colors border-t border-white/5"
                    >
                        {showHistory ? '▲ Hide History' : `▼ Show History (${messageHistory.length})`}
                    </button>
                )}

                {/* Message history */}
                {showHistory && (
                    <div className="px-4 py-2 border-t border-white/10 max-h-32 overflow-y-auto">
                        {messageHistory.slice().reverse().slice(1).map((msg, i) => (
                            <div
                                key={msg.timestamp}
                                className={`py-1 text-sm font-mono ${getTypeColor(msg.type)} opacity-${Math.max(30, 80 - i * 15)}`}
                            >
                                {getTypeIcon(msg.type)} {msg.text}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
