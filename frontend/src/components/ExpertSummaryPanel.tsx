/**
 * ExpertSummaryPanel - Displays AI-generated analysis results for Part 1
 * 
 * States:
 * - Idle: "Upload video to generate observations"
 * - Analyzing: Shows structured rubric with placeholders + streaming LOG items + Key Concepts + Notable Moments
 * - Complete: Shows Overview (2 sentences), Key Concepts (4-8 chips, ≤8 words each), Notable Moments (0-4), filled rubric
 * - Error: Shows error message if analysis fails
 * 
 * Structured Rubric Sections (shown when analyzing):
 * - Instrument control
 * - Exposure & retraction
 * - Hemostasis
 * - Motion economy
 * - Tissue handling
 * - Safety checks
 * 
 * Throttling: Results are buffered and flushed every 3-5 seconds for paced UI updates
 * Deduplication: Aggressive (exact + near-duplicate >80% word overlap)
 */

import { useEffect, useMemo } from 'react';
import { parseOvershootOutput } from '../utils/noteProcessing';

interface ExpertSummaryPanelProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  streamingNotes: string[];
  analysisResult: {
    summary: string;
    keyConcepts: string[];
    notableMoments: Array<{ text: string; timestampMs: number; timestampSource?: 'code' | 'heuristic' }>;
    lowSignal?: boolean;
    scaffold?: string[];
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
  // Parse streaming notes to extract observation texts for Observation Log feed
  const logItems = useMemo(() => {
    const logs: string[] = [];
    for (const note of streamingNotes) {
      const parsed = parseOvershootOutput(note);
      logs.push(...parsed.observations.map(obs => obs.text));
    }
    return logs;
  }, [streamingNotes]);

  const hasLogs = logItems.length > 0;

  // Category configuration removed since rubric is hidden

  // Map log items to rubric categories - each item goes to ONE category (best match by scoring)
  // Rubric item categorization logic removed since rubric UI is hidden

  // Adaptive rubric calculation removed since rubric UI is hidden

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
    <div className="row-start-1 col-start-2 h-[600px] bg-bg-tertiary/30 border border-border-subtle relative flex flex-col">
      <div className="px-4 py-3 border-b border-border-subtle">
        <h3 className="text-sm tracking-widest text-text-muted uppercase m-0">Procedure Analysis</h3>
      </div>

      <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0 p-6">
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

        {/* State A: No video selected / Idle State */}
        {!error && !isAnalyzing && !analysisComplete && !hasLogs && !analysisResult && (
          <div className="text-text-muted italic text-center py-8">
            Upload video to generate observations
          </div>
        )}

        {/* State B: Analyzing but no results yet - Show minimal "Analyzing..." placeholder */}
        {isAnalyzing && !error && !hasLogs && !analysisResult && (
          <div className="text-text-muted italic text-center py-8 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-rust animate-pulse" />
            Analyzing...
          </div>
        )}

        {/* Observation Log - Show FIRST as soon as logs arrive, fill available space */}
        {hasLogs && !error && !analysisResult && (
          <div className="flex-1 flex flex-col min-h-0">
            <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono flex-shrink-0">
              Observation Log
            </h4>
            <div className="flex-1 space-y-2 overflow-y-auto min-h-0">
              {logItems.map((log, i) => (
                <div
                  key={i}
                  className="p-2 bg-bg-tertiary/50 border-l-2 border-accent-rust/50 rounded-r text-text-cream text-xs leading-relaxed"
                >
                  {log}
                </div>
              ))}
              {isAnalyzing && (
                <div className="text-text-muted italic text-xs flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-rust animate-pulse" />
                  Analyzing...
                </div>
              )}
            </div>
          </div>
        )}

        {/* State C: Analysis Complete - Show Overview, Observation Log, Analysis Rubric, Key Concepts, Notable Moments */}
        {/* State gating: Only render if we have meaningful data (not just empty arrays) */}
        {analysisResult && !error && (analysisResult.summary || analysisResult.keyConcepts.length > 0 || analysisResult.notableMoments.length > 0 || hasLogs) && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Overview - First section */}
            {analysisResult.summary && (
              <div className="flex-shrink-0">
                <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                  Overview
                </h4>
                <p className="text-text-cream text-sm leading-relaxed">
                  {analysisResult.summary}
                </p>
              </div>
            )}

            {/* Observation Log - Below Notable Moments if logs exist */}
            {/* Observation Log - HIDDEN as per user request */}
            {/* {hasLogs && (
              <div className="flex-shrink-0">
                <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono">
                  Observation Log
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {logItems.map((log, i) => (
                    <div
                      key={i}
                      className="p-2 bg-bg-tertiary/50 border-l-2 border-accent-rust/50 rounded-r text-text-cream text-xs leading-relaxed"
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )} */}

            {/* Structured Rubric - Compact */}
            {/* Structured Rubric - HIDDEN as per user request */}
            {/* <div className="flex-shrink-0">
              <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-3 font-mono">
                Analysis Rubric
              </h4>
              <div className="space-y-3">
                {rubricSections.map((section) => {
                  const items = rubricItems[section] || [];
                  const hasItems = items.length > 0;
                  const displayItems = items.slice(0, maxItemsPerSection);

                  // Only show section if it has items (no placeholders for empty sections)
                  if (!hasItems) return null;

                  return (
                    <div key={section} className="border-l-2 border-accent-rust/30 pl-3">
                      <h5 className="text-text-cream text-xs font-semibold mb-1.5">{section}</h5>
                      <ul className="space-y-1.5 list-none">
                        {displayItems.map((item, i) => (
                          <li key={i} className="text-text-cream/90 text-xs leading-relaxed pl-2 before:content-['•'] before:text-accent-rust before:font-bold before:mr-1.5">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}

              </div>
            </div> */}

            {/* Notable Moments - Hide for short videos (<=20s) or when timestamps are unreliable */}
            {/* Notable Moments - HIDDEN as per user request */}
            {/* {(() => {
              // Infer video duration: short videos (<6 items) correspond to <=20s videos (4s per item)
              const isShortVideo = logItems.length < 6;
              
              // Filter moments: require timestampMs > 1 second (1000ms), filter out junk timestamps
              const validMoments = analysisResult.notableMoments.filter(moment => {
                // Require timestampMs to exist and be > 1 second
                if (!moment.timestampMs || moment.timestampMs < 1000) {
                  return false;
                }
                // If timestampSource is 'heuristic', timestamps are unreliable - hide
                if (moment.timestampSource === 'heuristic') {
                  return false;
                }
                return true;
              });
              
              // Hide Notable Moments section entirely for short videos or when no valid moments
              if (isShortVideo || validMoments.length === 0) {
                return null;
              }

              // Format timestamp: mm:ss from timestampMs (milliseconds)
              const formatTimestamp = (timestampMs: number): string => {
                const totalSeconds = Math.floor(timestampMs / 1000);
                const mins = Math.floor(totalSeconds / 60);
                const secs = totalSeconds % 60;
                return `${mins}:${secs.toString().padStart(2, '0')}`;
              };

              return (
                <div className="flex-1 flex flex-col min-h-0">
                  <h4 className="text-accent-rust text-xs uppercase tracking-wider mb-2 font-mono flex-shrink-0">
                    Notable Moments
                  </h4>
                  <ul className="flex-1 space-y-1.5 list-none text-text-cream text-xs overflow-y-auto min-h-0">
                    {validMoments.map((moment, i) => {
                      const timeStr = formatTimestamp(moment.timestampMs);
                      return (
                        <li key={i} className="leading-relaxed pl-2 border-l-2 border-accent-rust/30">
                          {timeStr} – {moment.text}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()} */}
          </div>
        )}
      </div>
    </div >
  );
}
