/**
 * OvershootInsightsPanel - Real-time AI analysis from Overshoot
 * 
 * Displays AI-generated insights during surgical technique practice sessions.
 */

import { useState, useEffect, useRef } from 'react';
import type { OvershootObservation } from '../hooks/useOvershootLive';

interface OvershootInsightsPanelProps {
  isConfigured: boolean;
  isAnalyzing: boolean;
  creditsExhausted: boolean;
  lastObservation: OvershootObservation | null;
  observationCount: number;
  error: string | null;
  observationHistory?: OvershootObservation[];
  demoMode?: boolean;
}

// Demo observations to showcase Overshoot capabilities
const DEMO_OBSERVATIONS: OvershootObservation[] = [
  {
    text: "Right wrist angle at 55° - adjust to 40-45° range for optimal blade control during incision",
    category: "technique",
    timestamp: Date.now(),
    confidence: 0.92,
    clipIndex: 0,
    metricType: "angle",
    correctionMagnitude: "moderate",
    hand: "right",
  },
  {
    text: "Excellent pencil grip maintained - index finger positioned correctly on instrument shaft",
    category: "technique",
    timestamp: Date.now() + 5000,
    confidence: 0.88,
    clipIndex: 1,
    metricType: "grip",
    hand: "right",
  },
  {
    text: "Minor tremor detected in left hand - anchor pinky finger on surface for additional stability",
    category: "safety",
    timestamp: Date.now() + 10000,
    confidence: 0.85,
    clipIndex: 2,
    metricType: "steadiness",
    correctionMagnitude: "minor",
    hand: "left",
    tremorSeverity: "mild",
  },
  {
    text: "Smooth tissue retraction technique - maintain consistent counter-traction angle",
    category: "efficiency",
    timestamp: Date.now() + 15000,
    confidence: 0.9,
    clipIndex: 3,
    metricType: "coordination",
    hand: "both",
  },
];

// Category colors (simplified)
const CATEGORY_COLORS: Record<string, string> = {
  technique: 'text-blue-400',
  instrument: 'text-purple-400',
  safety: 'text-red-400',
  efficiency: 'text-yellow-400',
  ergonomics: 'text-green-400',
  timing: 'text-cyan-400',
  general: 'text-text-muted',
};

export default function OvershootInsightsPanel({
  isConfigured,
  isAnalyzing,
  creditsExhausted,
  lastObservation,
  observationCount,
  error,
  demoMode = false,
}: OvershootInsightsPanelProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Demo mode state
  const [demoIndex, setDemoIndex] = useState(0);
  const [showingDemo, setShowingDemo] = useState(false);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Auto-cycle through demo observations when not configured and demoMode is enabled
  useEffect(() => {
    if (demoMode && !isConfigured && !creditsExhausted) {
      setShowingDemo(true);
      
      demoIntervalRef.current = setInterval(() => {
        setDemoIndex(prev => (prev + 1) % DEMO_OBSERVATIONS.length);
      }, 8000);
      
      return () => {
        if (demoIntervalRef.current) {
          clearInterval(demoIntervalRef.current);
        }
      };
    } else {
      setShowingDemo(false);
    }
  }, [demoMode, isConfigured, creditsExhausted]);
  
  const effectiveObservation = showingDemo ? DEMO_OBSERVATIONS[demoIndex] : lastObservation;
  const effectiveCount = showingDemo ? demoIndex + 1 : observationCount;

  // Typing animation
  useEffect(() => {
    if (effectiveObservation?.text) {
      setIsTyping(true);
      setDisplayedText('');
      
      let index = 0;
      const text = effectiveObservation.text;
      
      if (typingRef.current) clearInterval(typingRef.current);
      
      typingRef.current = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1));
          index++;
        } else {
          setIsTyping(false);
          if (typingRef.current) clearInterval(typingRef.current);
        }
      }, 20);
    }
    
    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
    };
  }, [effectiveObservation?.text, effectiveObservation?.clipIndex, demoIndex]);

  const categoryColor = effectiveObservation 
    ? CATEGORY_COLORS[effectiveObservation.category] || CATEGORY_COLORS.general
    : CATEGORY_COLORS.general;

  return (
    <div className="bg-bg-secondary border border-border-subtle overflow-hidden h-full flex flex-col">
      {/* Header - matching other panels */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border-subtle">
        <h3 className="text-xs tracking-widest text-text-muted uppercase">Overshoot AI</h3>
        {/* Status indicator */}
        {isAnalyzing && (
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[0.6rem] font-mono text-green-400 uppercase">Live</span>
          </div>
        )}
        {showingDemo && !isConfigured && (
          <span className="text-[0.6rem] font-mono text-accent-rust uppercase">Demo</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        {!isConfigured && !showingDemo ? (
          /* Not Configured State */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="text-3xl mb-3">🔌</span>
            <p className="text-sm text-text-cream mb-1">Connect Overshoot</p>
            <p className="text-xs text-text-muted mb-4">
              Set VITE_OVERSHOOT_API_KEY
            </p>
            <button
              onClick={() => setShowingDemo(true)}
              className="px-3 py-1.5 text-xs font-mono bg-bg-tertiary border border-border-subtle text-text-muted hover:text-text-cream transition-colors"
            >
              View Demo
            </button>
          </div>
        ) : creditsExhausted ? (
          /* Credits Exhausted */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="text-3xl mb-3">💳</span>
            <p className="text-sm text-red-400 mb-1">Credits Exhausted</p>
            <p className="text-xs text-text-muted">Visit overshoot.ai to add more</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="text-3xl mb-3">⚠️</span>
            <p className="text-sm text-yellow-400 mb-1">Analysis Error</p>
            <p className="text-xs text-text-muted">{error}</p>
          </div>
        ) : effectiveObservation ? (
          /* Active Analysis */
          <div className="flex-1 flex flex-col">
            {/* Demo badge */}
            {showingDemo && !isConfigured && (
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.6rem] text-text-dim uppercase">Demo Mode</span>
                <button
                  onClick={() => setShowingDemo(false)}
                  className="text-[0.6rem] text-text-dim hover:text-text-muted"
                >
                  ✕
                </button>
              </div>
            )}
            
            {/* Current Insight */}
            <div className="bg-bg-tertiary border border-border-subtle p-3 mb-3 min-h-[80px]">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-mono uppercase tracking-wider ${categoryColor}`}>
                  {effectiveObservation.category}
                </span>
                {effectiveObservation.confidence >= 0.8 && (
                  <span className="text-[0.55rem] px-1.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20">
                    High Confidence
                  </span>
                )}
              </div>
              <p className="font-mono text-sm text-gray-900 leading-relaxed">
                {displayedText}
                {isTyping && <span className="inline-block w-0.5 h-4 ml-0.5 bg-accent-rust animate-blink" />}
              </p>
              
              {/* Metadata tags */}
              {(effectiveObservation.hand || effectiveObservation.metricType) && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {effectiveObservation.hand && effectiveObservation.hand !== 'none' && (
                    <span className="text-[0.55rem] px-1.5 py-0.5 bg-bg-secondary text-text-dim uppercase border border-border-subtle">
                      {effectiveObservation.hand} hand
                    </span>
                  )}
                  {effectiveObservation.metricType && (
                    <span className="text-[0.55rem] px-1.5 py-0.5 bg-bg-secondary text-text-dim uppercase border border-border-subtle">
                      {effectiveObservation.metricType}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mt-auto">
              <div className="bg-bg-tertiary p-2 border border-border-subtle text-center">
                <span className="font-mono text-[0.6rem] text-text-dim uppercase block mb-0.5">Insights</span>
                <span className="font-mono text-xl text-gray-900">{effectiveCount}</span>
              </div>
              <div className="bg-bg-tertiary p-2 border border-border-subtle text-center">
                <span className="font-mono text-[0.6rem] text-text-dim uppercase block mb-0.5">Confidence</span>
                <span className="font-mono text-xl text-gray-900">
                  {Math.round((effectiveObservation.confidence || 0) * 100)}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Waiting State */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <span className="text-3xl mb-3">👁️</span>
            <p className="text-sm text-text-cream mb-1">
              {isAnalyzing ? 'Analyzing...' : 'Waiting for Video'}
            </p>
            <p className="text-xs text-text-muted">
              Real-time AI analysis
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
