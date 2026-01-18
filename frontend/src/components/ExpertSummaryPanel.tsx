/**
 * ExpertSummaryPanel - Displays AI-generated analysis results
 * 
 * States:
 * - Idle: "Upload video to generate observations"
 * - Analyzing: Shows streaming notes as they arrive
 * - Complete: Shows final summary, key concepts, and notable moments
 * - Error: Shows error message if analysis fails
 */

import { useEffect } from 'react';

interface ExpertSummaryPanelProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  streamingNotes: string[];
  analysisResult: {
    summary: string;
    keyConcepts: string[];
    notableMoments: string[];
  } | null;
  error: string | null;
}

export default function ExpertSummaryPanel({
  isAnalyzing,
  analysisComplete,
  streamingNotes,
  analysisResult,
  error,
}: ExpertSummaryPanelProps) {
  const hasNotes = streamingNotes.length > 0;

  // Debug: Load checkOvershootConfig for console debugging
  useEffect(() => {
    if (typeof window !== 'undefined' && error) {
      import('../utils/debugOvershoot').then(({ checkOvershootConfig }) => {
        (window as any).checkOvershootConfig = checkOvershootConfig;
        console.log('💡 Run checkOvershootConfig() in console to debug API key configuration');
      });
    }
  }, [error]);

  return (
    <div className="row-start-1 col-start-2 min-h-[400px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 relative overflow-hidden [data-theme='light']:bg-[rgba(0,0,0,0.03)] [data-theme='light']:border-border-subtle">
      <h3 className="mt-0 mb-4 text-accent-rust text-sm uppercase tracking-wider flex items-center gap-2">
        <span>◈</span> AI Observation Log
      </h3>

      <div className="flex-1 flex flex-col gap-4">
        {/* Error State */}
        {error && (
          <div className="p-4 bg-error/10 border border-error/30 rounded text-error text-sm">
            <p className="font-mono text-xs uppercase mb-1">Analysis Error</p>
            <p>{error}</p>
            {error.toLowerCase().includes('not found') && (
              <div className="mt-3 p-2 bg-error/5 border border-error/20 rounded text-xs">
                <p className="font-mono uppercase mb-1">Troubleshooting "Not Found" Error:</p>
                <ul className="list-disc list-inside space-y-1 text-error/90">
                  <li>API key may be invalid or expired</li>
                  <li>Check browser console (F12) for detailed error logs</li>
                  <li>Verify key starts with <code className="font-mono">ovs_</code></li>
                  <li>Ensure .env file is in <code className="font-mono">frontend/</code> directory</li>
                  <li>Restart dev server after changing .env: <code className="font-mono">npm run dev</code></li>
                </ul>
                <p className="mt-2 text-error/80">
                  💡 Open browser console and run: <code className="font-mono bg-error/10 px-1">checkOvershootConfig()</code>
                </p>
              </div>
            )}
            {!error.toLowerCase().includes('not found') && (
              <p className="mt-2 text-xs text-error/80">
                Make sure VITE_OVERSHOOT_API_KEY is set in your .env file.
              </p>
            )}
          </div>
        )}

        {/* Idle State */}
        {!error && !isAnalyzing && !analysisComplete && !hasNotes && (
          <div className="text-text-muted italic text-center py-8">
            Upload video to generate observations
          </div>
        )}

        {/* Analyzing State - Show Streaming Notes */}
        {isAnalyzing && hasNotes && (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {streamingNotes.map((note, i) => (
              <div
                key={i}
                className="p-3 bg-[rgba(255,255,255,0.02)] border-l-2 border-accent-rust rounded-r text-text-cream text-sm leading-relaxed animate-fade-in"
              >
                {note}
              </div>
            ))}
            <div className="text-text-muted italic text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-rust animate-pulse" />
              Analyzing...
            </div>
          </div>
        )}

        {/* Analyzing State - No Notes Yet */}
        {isAnalyzing && !hasNotes && !error && (
          <div className="text-text-muted italic text-center py-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-accent-rust animate-pulse" />
              AI Analyzing video frames...
            </div>
            <p className="text-xs">Processing video and generating observations...</p>
          </div>
        )}

        {/* Complete State - Show Final Summary */}
        {analysisComplete && analysisResult && (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {/* Summary Section */}
            {analysisResult.summary && (
              <div>
                <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                  Summary
                </h4>
                <p className="text-text-cream text-sm leading-relaxed">
                  {analysisResult.summary}
                </p>
              </div>
            )}

            {/* Key Concepts */}
            {analysisResult.keyConcepts.length > 0 && (
              <div>
                <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                  Key Concepts
                </h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.keyConcepts.map((concept, i) => (
                    <span
                      key={i}
                      className="bg-[rgba(0,180,216,0.1)] text-accent-rust px-3 py-1.5 rounded text-sm border border-accent-rust-glow"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notable Moments */}
            {analysisResult.notableMoments.length > 0 && (
              <div>
                <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                  Notable Moments
                </h4>
                <ul className="space-y-1 list-disc list-inside text-text-cream text-sm">
                  {analysisResult.notableMoments.map((moment, i) => (
                    <li key={i} className="leading-relaxed">
                      {moment}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Show all notes if no structured data extracted */}
            {!analysisResult.summary && streamingNotes.length > 0 && (
              <div>
                <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                  Observations
                </h4>
                <div className="space-y-2">
                  {streamingNotes.map((note, i) => (
                    <p key={i} className="text-text-cream text-sm leading-relaxed">
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
