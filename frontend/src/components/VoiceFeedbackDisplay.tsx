/**
 * VoiceFeedbackDisplay - Animated voice coaching feedback
 * 
 * Features:
 * - Typing animation for current message
 * - Glowing speaking indicator
 * - Message history with fade effect
 * - Premium glass morphism design
 */

import { useState } from 'react';
import type { VoiceMessage, SessionStats } from '../hooks/useVoiceCoach';

interface VoiceFeedbackDisplayProps {

    displayedText: string;
    currentMessage: string;
    messageHistory: VoiceMessage[];
    stats: SessionStats;
    voiceEnabled: boolean;
}

export default function VoiceFeedbackDisplay({

    displayedText,
    currentMessage,
    messageHistory,
    stats,
    voiceEnabled,
}: VoiceFeedbackDisplayProps) {
    const [showHistory, setShowHistory] = useState(false);

    // Determine message type color - using brighter colors for better contrast
    const getTypeColor = (type: VoiceMessage['type']) => {
        switch (type) {
            case 'warning': return 'text-red-300 drop-shadow-[0_0_8px_rgba(252,165,165,0.6)]';
            case 'encouragement': return 'text-green-300 drop-shadow-[0_0_8px_rgba(134,239,172,0.6)]';
            case 'summary': return 'text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.6)]';
            case 'ai_observation': return 'text-purple-300 drop-shadow-[0_0_8px_rgba(196,181,253,0.6)]';
            default: return 'text-orange-300 drop-shadow-[0_0_8px_rgba(253,186,116,0.6)]';
        }
    };

    const getTypeIcon = (_type: VoiceMessage['type']) => {
        return null;
    };

    return (
        <div className="bg-bg-secondary border border-border-subtle overflow-hidden">
            {/* Header - matching other panels with full-width border */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                    <h3 className="text-xs tracking-widest text-text-muted uppercase">AI Coach</h3>
                </div>
            </div>

            {/* Content wrapper with padding */}
            <div className="p-4">
                {/* Current message with typing effect */}
                <div className="bg-bg-tertiary border border-border-subtle rounded p-3 min-h-[60px] mb-3">
                    {currentMessage ? (
                        <div className="flex items-start gap-2">
                            <span className="text-lg">
                                {getTypeIcon(messageHistory[messageHistory.length - 1]?.type || 'coaching')}
                            </span>
                            <p className="font-mono text-sm leading-relaxed text-gray-900">
                                {displayedText}
                                {displayedText !== currentMessage && (
                                    <span className="inline-block w-0.5 h-4 ml-1 bg-current animate-blink" />
                                )}
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-text-muted">
                            <span className="font-mono text-xs">
                                {voiceEnabled
                                    ? 'Waiting for hand detection...'
                                    : 'Voice disabled'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Stats bar */}
                <div className="mb-2">
                    <div className="bg-bg-tertiary p-2 border border-border-subtle rounded text-center">
                        <span className="font-mono text-[0.6rem] text-text-dim uppercase block mb-1">Score</span>
                        <span className={`font-mono text-lg text-gray-900`}>
                            {stats.overallScore}%
                        </span>
                    </div>
                </div>

                {/* Progress bar for score */}
                <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 rounded-full ${stats.overallScore >= 80 ? 'bg-success' :
                            stats.overallScore >= 60 ? 'bg-warning' :
                                stats.overallScore >= 40 ? 'bg-accent-rust' : 'bg-error'
                            }`}
                        style={{ width: `${stats.overallScore}%` }}
                    />
                </div>

                {/* Compact stats */}
                <div className="flex items-center justify-between mt-2 text-[0.6rem] font-mono text-text-dim">
                    <span>{stats.corrections} corrections</span>
                    <span>{stats.encouragements} praise</span>
                </div>

                {/* History toggle */}
                {messageHistory.length > 1 && (
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="w-full mt-2 py-1 text-[0.6rem] font-mono text-text-dim text-center hover:text-text-muted transition-colors border-t border-border-subtle"
                    >
                        {showHistory ? '▲ Hide History' : `▼ Show History (${messageHistory.length})`}
                    </button>
                )}

                {/* Message history */}
                {showHistory && (
                    <div className="mt-2 pt-2 border-t border-border-subtle max-h-24 overflow-y-auto">
                        {messageHistory.slice().reverse().slice(1).map((msg, i) => (
                            <div
                                key={msg.timestamp}
                                className={`py-0.5 text-xs font-mono ${getTypeColor(msg.type)} opacity-${Math.max(30, 80 - i * 15)}`}
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
