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
import ReactMarkdown from 'react-markdown';

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
  showSummarySection?: boolean; // If false, hides the summary/concepts/moments section
  summaryOnly?: boolean; // If true, only shows the summary section (no observation log header/streaming)
}

export default function ExpertSummaryPanel({
  isAnalyzing,
  analysisComplete,
  streamingNotes,
  analysisResult,
  error,
  showSummarySection = true,
  summaryOnly = false,
}: ExpertSummaryPanelProps) {
  const hasNotes = streamingNotes.length > 0;

  // Summary-only mode: show the summary section with idle/analyzing/complete states
  if (summaryOnly) {
    // Idle state - no analysis started
    if (!isAnalyzing && !analysisComplete) {
      return (
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 [data-theme='light']:bg-[rgba(0,0,0,0.03)] [data-theme='light']:border-border-subtle">
          <h3 className="mt-0 mb-4 text-accent-rust text-sm uppercase tracking-wider flex items-center gap-2">
            <span>◈</span> Analysis Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overview Placeholder */}
            <div>
              <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                Overview
              </h4>
              <p className="text-text-muted text-sm italic">
                Upload video to generate summary...
              </p>
            </div>

            {/* Key Concepts Placeholder */}
            <div>
              <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                Key Concepts
              </h4>
              <p className="text-text-muted text-sm italic">
                Concepts will appear here...
              </p>
            </div>

            {/* Notable Moments Placeholder */}
            <div>
              <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                Notable Moments
              </h4>
              <p className="text-text-muted text-sm italic">
                Notable moments will appear here...
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Analyzing state - show loading animation
    if (isAnalyzing) {
      return (
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 [data-theme='light']:bg-[rgba(0,0,0,0.03)] [data-theme='light']:border-border-subtle">
          <h3 className="mt-0 mb-4 text-accent-rust text-sm uppercase tracking-wider flex items-center gap-2">
            <span>◈</span> Analysis Summary
            <span className="w-2 h-2 rounded-full bg-accent-rust animate-pulse ml-2" />
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overview - Analyzing */}
            <div>
              <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                Overview
              </h4>
              <div className="space-y-2">
                <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded animate-pulse w-full" />
                <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded animate-pulse w-4/5" />
                <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded animate-pulse w-3/5" />
              </div>
            </div>

            {/* Key Concepts - Analyzing */}
            <div>
              <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                Key Concepts
              </h4>
              <div className="flex flex-wrap gap-2">
                <div className="h-7 bg-[rgba(255,255,255,0.05)] rounded animate-pulse w-20" />
                <div className="h-7 bg-[rgba(255,255,255,0.05)] rounded animate-pulse w-24" />
                <div className="h-7 bg-[rgba(255,255,255,0.05)] rounded animate-pulse w-16" />
              </div>
            </div>

            {/* Notable Moments - Analyzing */}
            <div>
              <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                Notable Moments
              </h4>
              <div className="space-y-2">
                <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded animate-pulse w-full" />
                <div className="h-3 bg-[rgba(255,255,255,0.05)] rounded animate-pulse w-4/5" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Complete state - show actual results
    if (analysisComplete && analysisResult) {
      return (
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 [data-theme='light']:bg-[rgba(0,0,0,0.03)] [data-theme='light']:border-border-subtle">
          <h3 className="mt-0 mb-4 text-accent-rust text-sm uppercase tracking-wider flex items-center gap-2">
            <span>◈</span> Analysis Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Summary */}
            <div>
              <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                Overview
              </h4>
              {analysisResult.summary ? (
                <p className="text-text-cream text-sm leading-relaxed">
                  {analysisResult.summary}
                </p>
              ) : (
                <p className="text-text-muted text-sm italic">No summary available</p>
              )}
            </div>

            {/* Key Concepts */}
            <div>
              <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                Key Concepts
              </h4>
              {analysisResult.keyConcepts.length > 0 ? (
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
              ) : (
                <p className="text-text-muted text-sm italic">No key concepts identified</p>
              )}
            </div>

            {/* Notable Moments */}
            <div>
              <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                Notable Moments
              </h4>
              {analysisResult.notableMoments.length > 0 ? (
                <ul className="space-y-1 list-disc list-inside text-text-cream text-sm">
                  {analysisResult.notableMoments.map((moment, i) => (
                    <li key={i} className="leading-relaxed">
                      {moment}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-text-muted text-sm italic">No notable moments identified</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Fallback for edge cases
    return null;
  }

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
    <div className="row-start-1 col-start-2 h-full min-h-[400px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 relative flex flex-col [data-theme='light']:bg-[rgba(0,0,0,0.03)] [data-theme='light']:border-border-subtle">
      <h3 className="mt-0 mb-4 text-accent-rust text-sm uppercase tracking-wider flex items-center gap-2 flex-shrink-0">
        <span>◈</span> AI Observation Log
      </h3>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
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
          <div className="space-y-3">
            {streamingNotes.map((note, i) => (
              <div
                key={i}
                className="p-3 bg-[rgba(255,255,255,0.02)] border-l-2 border-accent-rust rounded-r text-text-cream text-sm leading-relaxed animate-fade-in prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_ul]:m-0 [&_li]:m-0"
              >
                <ReactMarkdown>{note}</ReactMarkdown>
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

        {/* Complete State - Show Final Summary (only if showSummarySection is true) */}
        {showSummarySection && analysisComplete && analysisResult && (
          <div className="space-y-4">
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
