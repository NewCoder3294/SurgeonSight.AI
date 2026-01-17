import { useState, useEffect } from 'react';
import { fetchExpertSummary } from '../api/summaryApi';

interface ExpertAnalysisPayload {
  procedure: string;
  stats: {
    angle_mean: number;
    angle_std: number;
    angle_min: number;
    angle_max: number;
    speed_mean: number;
    speed_std: number;
    jitter_mean: number;
  };
  segments: Array<{
    t_start: number;
    t_end: number;
    type: string;
  }>;
}

interface ExpertSummaryPanelProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  expertAnalysisPayload: ExpertAnalysisPayload | null;
  keyPoints: string[];
}

const MOCK_FALLBACK_SUMMARY =
  'Mock Summary: Expert demonstrates stable alignment and controlled speed. Targets: keep angle within ±4°, avoid speed spikes, minimize jitter.';

export default function ExpertSummaryPanel({
  isAnalyzing,
  analysisComplete,
  expertAnalysisPayload,
  keyPoints,
}: ExpertSummaryPanelProps) {
  const [summary, setSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<boolean>(false);

  useEffect(() => {
    if (analysisComplete && expertAnalysisPayload) {
      setIsLoadingSummary(true);
      setSummaryError(false);

      fetchExpertSummary(expertAnalysisPayload)
        .then((fetchedSummary) => {
          setSummary(fetchedSummary);
          setIsLoadingSummary(false);
        })
        .catch((error) => {
          console.error('Failed to fetch summary:', error);
          setSummary(MOCK_FALLBACK_SUMMARY);
          setSummaryError(true);
          setIsLoadingSummary(false);
        });
    } else {
      setSummary('');
      setIsLoadingSummary(false);
      setSummaryError(false);
    }
  }, [analysisComplete, expertAnalysisPayload]);

  const isLoading = isAnalyzing || isLoadingSummary;

  return (
    <div className="row-start-1 col-start-2 min-h-[400px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 relative overflow-hidden [data-theme='light']:bg-[rgba(0,0,0,0.03)] [data-theme='light']:border-border-subtle">
      <h3 className="mt-0 mb-4 text-accent-rust text-sm uppercase tracking-wider flex items-center gap-2">
        <span>◈</span> AI Observation Log
      </h3>
      <div className="flex-1">
        {isLoading ? (
          <div className="text-text-muted italic text-center py-8">
            {isAnalyzing ? 'AI Analyzing video frames...' : 'Generating summary...'}
          </div>
        ) : summary ? (
          <div className="leading-relaxed">
            <p className="m-0 text-text-cream">{summary}</p>
            {summaryError && (
              <div className="mt-4 p-2 bg-[rgba(255,100,100,0.1)] border border-[rgba(255,100,100,0.3)] rounded text-text-muted">
                <small className="text-xs">Note: Using fallback summary (backend unavailable)</small>
              </div>
            )}
          </div>
        ) : (
          <div className="text-text-muted italic text-center py-8">Upload video to generate observations</div>
        )}
      </div>

      {keyPoints.length > 0 && (
        <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.1)] [data-theme='light']:border-border-subtle">
          <h4 className="text-sm mb-2 text-accent-rust">
            Critical Key Points
          </h4>
          <div className="flex flex-wrap gap-3">
            {keyPoints.map((point, i) => (
              <span
                key={i}
                className="bg-[rgba(0,180,216,0.1)] text-accent-rust px-3 py-1.5 rounded text-sm border border-accent-rust-glow"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {point}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
