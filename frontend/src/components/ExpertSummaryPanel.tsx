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
  streamingNotes: string[];
  keyPoints: string[];
}

export default function ExpertSummaryPanel({
  isAnalyzing,
  streamingNotes,
  keyPoints,
}: ExpertSummaryPanelProps) {
  const hasNotes = streamingNotes.length > 0;

  return (
    <div className="row-start-1 col-start-2 min-h-[400px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-lg p-6 relative overflow-hidden [data-theme='light']:bg-[rgba(0,0,0,0.03)] [data-theme='light']:border-border-subtle">
      <h3 className="mt-0 mb-4 text-accent-rust text-sm uppercase tracking-wider flex items-center gap-2">
        <span>◈</span> AI Observation Log
      </h3>
      <div className="flex-1 max-h-[250px] overflow-y-auto">
        {isAnalyzing && !hasNotes ? (
          <div className="text-text-muted italic text-center py-8">
            AI Analyzing video frames...
          </div>
        ) : hasNotes ? (
          <div className="space-y-3">
            {streamingNotes.map((note, i) => (
              <div
                key={i}
                className="p-3 bg-[rgba(255,255,255,0.02)] border-l-2 border-accent-rust rounded-r text-text-cream text-sm leading-relaxed animate-fade-in"
              >
                {note}
              </div>
            ))}
            {isAnalyzing && (
              <div className="text-text-muted italic text-sm">
                Analyzing...
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
