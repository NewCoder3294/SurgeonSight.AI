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
    <div className="notes-panel panel-glass">
      <h3>
        <span className="icon">◈</span> AI Observation Log
      </h3>
      <div className="notes-content">
        {isLoading ? (
          <div className="typing-indicator">
            {isAnalyzing ? 'AI Analyzing video frames...' : 'Generating summary...'}
          </div>
        ) : summary ? (
          <div className="summary-text">
            <p>{summary}</p>
            {summaryError && (
              <div className="summary-error-note">
                <small>Note: Using fallback summary (backend unavailable)</small>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">Upload video to generate observations</div>
        )}
      </div>

      {keyPoints.length > 0 && (
        <div className="keypoints-section" style={{ marginTop: '1.5rem' }}>
          <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--accent-rust)' }}>
            Critical Key Points
          </h4>
          <div className="tags-container">
            {keyPoints.map((point, i) => (
              <span
                key={i}
                className="kp-tag animate-pop-in"
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
