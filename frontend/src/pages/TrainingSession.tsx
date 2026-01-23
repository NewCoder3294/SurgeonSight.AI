import { useState, useEffect, useRef } from 'react';
import ThemeToggle from '../components/ThemeToggle';
import CoachingSession from '../components/CoachingSession';
import ExpertVideoPanel from '../components/ExpertVideoPanel';
import ExpertSummaryPanel from '../components/ExpertSummaryPanel';
import KeyConceptsFooter from '../components/KeyConceptsFooter';

export default function TrainingSession() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [streamingNotes, setStreamingNotes] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<{
    summary: string;
    keyConcepts: string[];
    notableMoments: Array<{ text: string; timestampMs: number; timestampSource?: 'code' | 'heuristic' }>;
    lowSignal?: boolean;
    scaffold?: string[];
    expertStats?: {
      angleTarget: number;
      angleTolerance: number;
      steadinessTarget: number;
      expectationGripType: string;
      speedOptimal: number;
      speedTolerance: number;
      contextElements?: string[];
      leftHand?: any;
      rightHand?: any;
    };
  } | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Refs for scrolling
  const videoPanelRef = useRef<HTMLDivElement>(null);
  const livePracticeSectionRef = useRef<HTMLElement>(null);
  const ctaButtonRef = useRef<HTMLDivElement>(null);
  const analysisTitleRef = useRef<HTMLHeadingElement>(null);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
    notableMoments: Array<{ text: string; timestampMs: number; timestampSource?: 'code' | 'heuristic' }>;
    lowSignal?: boolean;
    scaffold?: string[];
    expertStats?: {
      angleTarget: number;
      angleTolerance: number;
      steadinessTarget: number;
      expectationGripType: string;
      speedOptimal: number;
      speedTolerance: number;
      contextElements?: string[];
      leftHand?: any;
      rightHand?: any;
    };
  }) => {
    setAnalysisResult(result);
  };

  const handleAnalysisComplete = () => {
    setIsAnalyzing(false);
    setAnalysisComplete(true);
  };

  // Scroll past title when video is uploaded
  const handleVideoUploaded = () => {
    if (analysisTitleRef.current) {
      analysisTitleRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Scroll to Live Practice section
  const scrollToLivePractice = () => {
    if (livePracticeSectionRef.current) {
      livePracticeSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-cream relative pb-16">
      <header className="flex justify-between items-center px-8 py-4 border-b border-border-subtle bg-bg-secondary/80 backdrop-blur-sm relative z-[100]">
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
          <div className="flex items-center gap-4 mb-6">
            <div className="w-1.5 h-8 bg-accent-rust"></div>
            <h2 ref={analysisTitleRef} className="text-2xl tracking-wider text-text-cream uppercase m-0">01. Expert Video Analysis</h2>
          </div>

          <div ref={videoPanelRef} className="grid grid-cols-2 gap-6 mt-6">
            {/* Left: Video Panel */}
            <ExpertVideoPanel
              isAnalyzing={isAnalyzing}
              analysisComplete={analysisComplete}
              onAnalysisStart={handleAnalysisStart}
              onAnalysisComplete={handleAnalysisComplete}
              onNotesUpdate={handleNotesUpdate}
              onAnalysisResult={handleAnalysisResult}
              onError={setAnalysisError}
              onVideoUploaded={handleVideoUploaded}

            />

            {/* Right: Summary Panel */}
            <ExpertSummaryPanel
              isAnalyzing={isAnalyzing}
              analysisComplete={analysisComplete}
              streamingNotes={streamingNotes}
              analysisResult={analysisResult}
              error={analysisError}
            />
          </div>

          {/* Key Concepts Footer - Renders below both panels, only after successful Overshoot parsing */}

          {/* Key Concepts Section - Full width standalone box (Now inside the main section) */}
          <div className="mt-6">
            <div className="bg-bg-tertiary/30 border border-border-subtle">
              <div className="px-4 py-3 border-b border-border-subtle">
                <h3 className="text-sm tracking-widest text-text-muted uppercase m-0">Key Concepts</h3>
              </div>
              <div className="p-6">
                {!analysisResult || (!analysisResult.keyConcepts.length && !(analysisResult.lowSignal && analysisResult.scaffold)) ? (
                  <p className="text-text-muted italic text-sm">Upload video to generate key concepts.</p>
                ) : (
                  <KeyConceptsFooter
                    keyConcepts={analysisResult.keyConcepts || []}
                    lowSignal={analysisResult.lowSignal}
                    scaffold={analysisResult.scaffold}
                    embedded={false}
                  />
                )}
              </div>
            </div>
          </div>

          {/* CTA Button - appears when analysis is complete */}
          {analysisComplete && (
            <div ref={ctaButtonRef} className="flex justify-center mt-8">
              <button
                onClick={scrollToLivePractice}
                className="px-8 py-4 bg-accent-rust text-text-cream font-display text-lg tracking-wider uppercase border-2 border-accent-rust transition-all duration-300 hover:bg-accent-rust/80 hover:scale-105 flex items-center gap-3"
              >
                Start Live Practice
                <span className="text-xl">→</span>
              </button>
            </div>
          )}
        </section>

        <div className="w-0.5 h-32 bg-gradient-to-b from-accent-rust to-transparent mx-auto opacity-30"></div>

        <section
          ref={livePracticeSectionRef}
          className="relative mt-16 transition-all duration-500"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-1.5 h-8 bg-accent-rust"></div>
            <h2 className="text-2xl tracking-wider text-text-cream uppercase m-0">02. Live Practice Session</h2>
          </div>

          <div className="relative min-h-[400px] transition-all duration-500 mt-6">
            <CoachingSession
              embedded={true}
              expertMetrics={analysisResult?.expertStats ? {
                angleTarget: analysisResult.expertStats.angleTarget,
                angleTolerance: analysisResult.expertStats.angleTolerance,
                angleMin: analysisResult.expertStats.angleTarget - analysisResult.expertStats.angleTolerance,
                angleMax: analysisResult.expertStats.angleTarget + analysisResult.expertStats.angleTolerance,
                steadinessTarget: analysisResult.expertStats.steadinessTarget,
                expectedGripType: (analysisResult.expertStats.expectationGripType as any) || 'unknown',
                leftHand: analysisResult.expertStats.leftHand,
                rightHand: analysisResult.expertStats.rightHand,
                techniqueContext: analysisResult.expertStats.contextElements,
                techniqueNotes: analysisResult.keyConcepts,
                notableMoments: analysisResult.notableMoments.map(m => ({
                  time: m.timestampMs / 1000,
                  note: m.text
                }))
              } : undefined}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
