import { useState } from 'react';
import CornerBrackets from './CornerBrackets';
import ThemeToggle from './ThemeToggle';
import CoachingSession from './CoachingSession';
import ExpertVideoPanel from './ExpertVideoPanel';
import ExpertSummaryPanel from './ExpertSummaryPanel';
import './TrainingSession.css';

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

const MOCK_KEY_POINTS = [
  'Maintain constant tension on the suture',
  'Keep needle perpendicular to tissue',
  'Rotate wrist fully for smooth exit',
  'Watch spacing between sutures',
];

export default function TrainingSession() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [expertAnalysisPayload, setExpertAnalysisPayload] =
    useState<ExpertAnalysisPayload | null>(null);

  const handleAnalysisStart = () => {
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setExpertAnalysisPayload(null);
  };

  const handleAnalysisComplete = (payload: ExpertAnalysisPayload) => {
    setExpertAnalysisPayload(payload);
    setIsAnalyzing(false);
    setAnalysisComplete(true);
  };

  return (
    <div className="training-page">
      <header className="training-header">
        <div className="logo-section">
          <h1>
            SurgeonSight <span className="highlight">Training</span>
          </h1>
        </div>
        <div className="header-controls">
          <ThemeToggle />
        </div>
      </header>

      <main className="training-content">
        <section className={`analysis-module ${analysisComplete ? 'completed' : ''}`}>
          <div className="section-header">
            <CornerBrackets size="sm">
              <h2>01. Procedure Analysis</h2>
            </CornerBrackets>
          </div>

          <div className="analysis-grid">
            {/* Left: Video Panel */}
            <ExpertVideoPanel
              isAnalyzing={isAnalyzing}
              analysisComplete={analysisComplete}
              onAnalysisStart={handleAnalysisStart}
              onAnalysisComplete={handleAnalysisComplete}
            />

            {/* Right: Summary Panel */}
            <ExpertSummaryPanel
              isAnalyzing={isAnalyzing}
              analysisComplete={analysisComplete}
              expertAnalysisPayload={expertAnalysisPayload}
              keyPoints={analysisComplete ? MOCK_KEY_POINTS : []}
            />
          </div>
        </section>

        <div className="connector-line"></div>

        <section
          className={`practice-module ${
            !analysisComplete ? 'locked blur-content' : 'unlocked'
          }`}
        >
          <div className="section-header">
            <CornerBrackets size="sm">
              <h2>02. Live Reproduction</h2>
            </CornerBrackets>
          </div>

          <div className="practice-container">
            {!analysisComplete && (
              <div className="lock-overlay">
                <span className="lock-icon">🔒</span>
                <p>Complete Analysis Phase to Unlock</p>
              </div>
            )}
            <CoachingSession embedded={true} />
          </div>
        </section>
      </main>
    </div>
  );
}
