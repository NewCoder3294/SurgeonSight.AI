import { useState } from 'react';
import CornerBrackets from '../components/CornerBrackets';
import ThemeToggle from '../components/ThemeToggle';
import CoachingSession from '../components/CoachingSession';
import ExpertVideoPanel from '../components/ExpertVideoPanel';
import ExpertSummaryPanel from '../components/ExpertSummaryPanel';

export default function TrainingSession() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [streamingNotes, setStreamingNotes] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string;
    keyConcepts: string[];
    notableMoments: string[];
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const handleAnalysisStart = () => {
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setStreamingNotes([]);
    setAnalysisResult(null);
    setAnalysisError(null);
  };

  const handleNotesUpdate = (notes: string[]) => {
    // Notes are already deduplicated from ExpertVideoPanel
    setStreamingNotes(notes);
  };

  const handleAnalysisResult = (result: {
    summary: string;
    keyConcepts: string[];
    notableMoments: string[];
  }) => {
    setAnalysisResult(result);
  };

  const handleAnalysisComplete = () => {
    setIsAnalyzing(false);
    setAnalysisComplete(true);
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-cream relative pb-16 [data-theme='light']:text-text-cream">
      <header className="flex justify-between items-center px-8 py-4 border-b border-border-subtle bg-[rgba(0,0,0,0.4)] backdrop-blur-sm relative z-[100] [data-theme='light']:bg-[rgba(255,255,255,0.8)]">
        <div className="flex items-center">
          <h1>
            SurgeonSight <span className="text-accent-rust">Training</span>
          </h1>
        </div>
        <div className="flex items-center">
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-8">
        <section className={analysisComplete ? 'completed' : ''}>
          <div className="[&>div]:p-2 [&>div]:text-xl [&>div]:bg-gradient-to-r [&>div]:from-[rgba(255,255,255,0.05)] [&>div]:to-transparent [data-theme='light']:[&>div]:bg-gradient-to-r [data-theme='light']:[&>div]:from-[rgba(0,0,0,0.05)] [data-theme='light']:[&>div]:to-transparent">
            <CornerBrackets size="sm">
              <h2 className="text-text-cream m-0 py-2 px-4 text-xl bg-gradient-to-r from-[rgba(255,255,255,0.05)] to-transparent [data-theme='light']:from-[rgba(0,0,0,0.05)]">01. Procedure Analysis</h2>
            </CornerBrackets>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-6">
            {/* Left: Video Panel */}
            <ExpertVideoPanel
              isAnalyzing={isAnalyzing}
              analysisComplete={analysisComplete}
              onAnalysisStart={handleAnalysisStart}
              onAnalysisComplete={handleAnalysisComplete}
              onNotesUpdate={handleNotesUpdate}
              onAnalysisResult={handleAnalysisResult}
              onError={setAnalysisError}
            />

            {/* Right: AI Observation Log (streaming notes only) */}
            <ExpertSummaryPanel
              isAnalyzing={isAnalyzing}
              analysisComplete={analysisComplete}
              streamingNotes={streamingNotes}
              analysisResult={analysisResult}
              error={analysisError}
              showSummarySection={false}
            />
          </div>

          {/* Full-width Summary Section Below - always visible */}
          <div className="mt-6">
            <ExpertSummaryPanel
              isAnalyzing={isAnalyzing}
              analysisComplete={analysisComplete}
              streamingNotes={streamingNotes}
              analysisResult={analysisResult}
              error={null}
              showSummarySection={true}
              summaryOnly={true}
            />
          </div>
        </section>

        <div className="w-0.5 h-16 bg-gradient-to-b from-accent-rust to-transparent mx-auto opacity-30"></div>

        <section
          className={`relative mt-16 transition-all duration-500 ${!analysisComplete ? 'opacity-50 pointer-events-none blur-lg' : ''
            }`}
        >
          <div className="[&>div]:p-2 [&>div]:text-xl [&>div]:bg-gradient-to-r [&>div]:from-[rgba(255,255,255,0.05)] [&>div]:to-transparent [data-theme='light']:[&>div]:bg-gradient-to-r [data-theme='light']:[&>div]:from-[rgba(0,0,0,0.05)] [data-theme='light']:[&>div]:to-transparent">
            <CornerBrackets size="sm">
              <h2 className="text-text-cream m-0 py-2 px-4 text-xl bg-gradient-to-r from-[rgba(255,255,255,0.05)] to-transparent [data-theme='light']:from-[rgba(0,0,0,0.05)]">02. Live Reproduction</h2>
            </CornerBrackets>
          </div>

          <div className="relative min-h-[600px] transition-all duration-500">
            {!analysisComplete && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center bg-[rgba(10,10,15,0.9)] px-12 py-8 rounded-lg border border-accent-rust shadow-[0_0_30px_rgba(0,180,216,0.2)] text-white">
                <span className="text-4xl mb-4">🔒</span>
                <p>Complete Analysis Phase to Unlock</p>
              </div>
            )}
            <div className={!analysisComplete ? 'blur-[10px] opacity-40' : ''}>
              <CoachingSession embedded={true} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
