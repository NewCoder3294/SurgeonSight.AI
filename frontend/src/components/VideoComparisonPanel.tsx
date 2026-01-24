import { useState, useRef, useEffect, useCallback } from 'react';
import { createOvershootVision, isOvershootConfigured, closeAllStreams, shouldWaitForStreamLimit, getStreamLimitCooldownRemaining, clearStreamLimitCooldown } from '../services/overshoot';

interface ComparisonFeedback {
  strengths: string[];
  improvements: string[];
  overallScore: number;
  summary: string;
  detailedComparison: {
    category: string;
    expertNote: string;
    studentNote: string;
    verdict: 'match' | 'partial' | 'needs_work';
  }[];
}

interface VideoComparisonPanelProps {
  expertVideoUrl: string | null;
  studentVideoUrl: string | null;
  expertKeyConcepts?: string[];
  onComparisonComplete?: (feedback: ComparisonFeedback) => void;
}

// Comparison analysis prompt for Overshoot
const COMPARISON_PROMPT = `You are an expert surgical instructor comparing a student's practice session to an expert reference video.

TASK: Analyze what the student did WELL and what they should IMPROVE upon.

OUTPUT FORMAT (JSON only, no markdown):
{
  "strengths": [
    "Specific positive observation about student technique (2-4 items)"
  ],
  "improvements": [
    "Specific actionable improvement with reason (2-4 items)"
  ],
  "overall_score": 0-100,
  "summary": "2-3 sentence overall assessment",
  "detailed_comparison": [
    {
      "category": "grip|angle|steadiness|speed|coordination|instrument_handling",
      "expert_note": "What the expert demonstrated",
      "student_note": "What the student showed",
      "verdict": "match|partial|needs_work"
    }
  ]
}

ANALYSIS CRITERIA:
1. GRIP TECHNIQUE - Pencil grip, tripod grip, power grip appropriateness
2. WRIST ANGLES - Optimal 30-45° range, pronation/supination
3. HAND STEADINESS - Tremor, micro-movements, stability
4. MOVEMENT SPEED - Controlled, deliberate movements
5. BIMANUAL COORDINATION - Both hands working together
6. INSTRUMENT HANDLING - Proper tool manipulation

RULES:
- Be specific with observations, cite visible evidence
- Strengths should be genuinely positive, not filler
- Improvements should be actionable with clear "how to fix"
- Score 70+ for good technique, 50-70 for average, below 50 needs work
- If student video shows no clear activity, note it but don't fabricate`;

export default function VideoComparisonPanel({
  expertVideoUrl,
  studentVideoUrl,
  expertKeyConcepts = [],
  onComparisonComplete,
}: VideoComparisonPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<ComparisonFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  
  // Individual video states
  const [expertPlaying, setExpertPlaying] = useState(false);
  const [studentPlaying, setStudentPlaying] = useState(false);
  const [expertProgress, setExpertProgress] = useState(0);
  const [studentProgress, setStudentProgress] = useState(0);

  const expertVideoRef = useRef<HTMLVideoElement>(null);
  const studentVideoRef = useRef<HTMLVideoElement>(null);

  // Toggle expert video playback
  const toggleExpertPlayback = useCallback(() => {
    const video = expertVideoRef.current;
    if (!video) return;

    if (expertPlaying) {
      video.pause();
      setExpertPlaying(false);
    } else {
      video.play();
      setExpertPlaying(true);
    }
  }, [expertPlaying]);

  // Toggle student video playback
  const toggleStudentPlayback = useCallback(() => {
    const video = studentVideoRef.current;
    if (!video) return;

    if (studentPlaying) {
      video.pause();
      setStudentPlaying(false);
    } else {
      video.play();
      setStudentPlaying(true);
    }
  }, [studentPlaying]);

  // Update progress bars
  useEffect(() => {
    const expertVideo = expertVideoRef.current;
    const studentVideo = studentVideoRef.current;

    const updateExpertProgress = () => {
      if (expertVideo && expertVideo.duration) {
        setExpertProgress((expertVideo.currentTime / expertVideo.duration) * 100);
      }
    };

    const updateStudentProgress = () => {
      if (studentVideo && studentVideo.duration) {
        setStudentProgress((studentVideo.currentTime / studentVideo.duration) * 100);
      }
    };

    expertVideo?.addEventListener('timeupdate', updateExpertProgress);
    studentVideo?.addEventListener('timeupdate', updateStudentProgress);

    return () => {
      expertVideo?.removeEventListener('timeupdate', updateExpertProgress);
      studentVideo?.removeEventListener('timeupdate', updateStudentProgress);
    };
  }, []);

  // Handle video ended
  useEffect(() => {
    const expertVideo = expertVideoRef.current;
    const studentVideo = studentVideoRef.current;

    const handleExpertEnded = () => {
      setExpertPlaying(false);
      setExpertProgress(100);
    };

    const handleStudentEnded = () => {
      setStudentPlaying(false);
      setStudentProgress(100);
    };

    expertVideo?.addEventListener('ended', handleExpertEnded);
    studentVideo?.addEventListener('ended', handleStudentEnded);

    return () => {
      expertVideo?.removeEventListener('ended', handleExpertEnded);
      studentVideo?.removeEventListener('ended', handleStudentEnded);
    };
  }, []);

  // Seek expert video
  const handleExpertSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const video = expertVideoRef.current;

    if (video && video.duration) {
      video.currentTime = percent * video.duration;
      setExpertProgress(percent * 100);
    }
  }, []);

  // Seek student video
  const handleStudentSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const video = studentVideoRef.current;

    if (video && video.duration) {
      video.currentTime = percent * video.duration;
      setStudentProgress(percent * 100);
    }
  }, []);

  // Check and update cooldown timer
  useEffect(() => {
    const checkCooldown = () => {
      if (shouldWaitForStreamLimit()) {
        setCooldownRemaining(getStreamLimitCooldownRemaining());
      } else {
        setCooldownRemaining(0);
      }
    };
    
    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Analyze comparison with Overshoot
  const analyzeComparison = useCallback(async () => {
    if (!studentVideoUrl || !isOvershootConfigured()) {
      setError('Student video or Overshoot API not available');
      return;
    }

    // Check for cooldown from stream limit
    if (shouldWaitForStreamLimit()) {
      const remaining = getStreamLimitCooldownRemaining();
      setError(`Stream limit reached. Please wait ${remaining} seconds before trying again.`);
      setCooldownRemaining(remaining);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setComparisonResult(null);
    clearStreamLimitCooldown(); // Clear any previous cooldown

    try {
      // Close any existing streams to avoid hitting the limit
      await closeAllStreams();
      
      // Small delay to allow streams to close on server
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Fetch student video as blob
      const response = await fetch(studentVideoUrl);
      const blob = await response.blob();
      const file = new File([blob], 'student_recording.webm', { type: blob.type });

      // Build enhanced prompt with expert context
      let enhancedPrompt = COMPARISON_PROMPT;
      if (expertKeyConcepts.length > 0) {
        enhancedPrompt += `\n\nEXPERT KEY CONCEPTS TO LOOK FOR:\n${expertKeyConcepts.map(c => `- ${c}`).join('\n')}`;
      }

      let resultReceived = false;

      const vision = createOvershootVision({
        prompt: enhancedPrompt,
        file,
        processing: {
          clip_length_seconds: 8,
          delay_seconds: 3,
          fps: 10,
        },
        onResult: (text: string) => {
          if (resultReceived) return;
          resultReceived = true;

          try {
            // Parse JSON response
            let jsonStr = text.trim();
            if (jsonStr.startsWith('```')) {
              jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
            }

            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error('No valid JSON in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            const feedback: ComparisonFeedback = {
              strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
              improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
              overallScore: typeof parsed.overall_score === 'number' ? parsed.overall_score : 50,
              summary: parsed.summary || 'Analysis complete.',
              detailedComparison: Array.isArray(parsed.detailed_comparison)
                ? parsed.detailed_comparison.map((d: any) => ({
                    category: d.category || 'technique',
                    expertNote: d.expert_note || '',
                    studentNote: d.student_note || '',
                    verdict: ['match', 'partial', 'needs_work'].includes(d.verdict) ? d.verdict : 'partial',
                  }))
                : [],
            };

            setComparisonResult(feedback);
            setAnalysisComplete(true);
            onComparisonComplete?.(feedback);
          } catch (parseErr) {
            console.error('[VideoComparison] Parse error:', parseErr);
            setError('Failed to parse analysis results');
          }
        },
        onError: (err: Error) => {
          console.error('[VideoComparison] Overshoot error:', err);
          setError(err.message);
        },
      });

      await vision.start();
      await new Promise((resolve) => setTimeout(resolve, 15000)); // Wait for analysis
      await vision.stop();

    } catch (err: any) {
      console.error('[VideoComparison] Analysis failed:', err);
      setError(err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [studentVideoUrl, expertKeyConcepts, onComparisonComplete]);

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-accent-teal';
    if (score >= 40) return 'text-warning';
    return 'text-error';
  };

  // Get verdict badge
  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'match':
        return <span className="px-2 py-0.5 text-xs font-mono bg-success/20 text-success border border-success/30">MATCH</span>;
      case 'partial':
        return <span className="px-2 py-0.5 text-xs font-mono bg-accent-teal/20 text-accent-teal border border-accent-teal/30">PARTIAL</span>;
      case 'needs_work':
        return <span className="px-2 py-0.5 text-xs font-mono bg-error/20 text-error border border-error/30">NEEDS WORK</span>;
      default:
        return null;
    }
  };

  const hasVideos = expertVideoUrl && studentVideoUrl;
  const canAnalyze = hasVideos && isOvershootConfigured() && !isAnalyzing;

  return (
    <div className="space-y-6">
      {/* Side-by-side Video Players */}
      <div className="grid grid-cols-2 gap-6">
        {/* Expert Video */}
        <div className="bg-bg-tertiary/30 border border-border-subtle">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <h3 className="text-sm tracking-widest text-text-muted uppercase m-0">Expert Reference</h3>
            <span className="text-xs font-mono text-accent-teal">INSTRUCTOR</span>
          </div>
          <div className="aspect-video bg-black relative group">
            {expertVideoUrl ? (
              <>
                <video
                  ref={expertVideoRef}
                  src={expertVideoUrl}
                  className="w-full h-full object-contain"
                  playsInline
                  muted
                />
                {/* Play/Pause overlay */}
                <div 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={toggleExpertPlayback}
                >
                  <div className="w-16 h-16 rounded-full bg-accent-teal/90 flex items-center justify-center">
                    <span className="text-2xl text-white">{expertPlaying ? '❚❚' : '▶'}</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 cursor-pointer"
                  onClick={handleExpertSeek}
                >
                  <div 
                    className="h-full bg-accent-teal transition-all"
                    style={{ width: `${expertProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-text-muted text-sm">No expert video available</p>
              </div>
            )}
          </div>
        </div>

        {/* Student Video */}
        <div className="bg-bg-tertiary/30 border border-border-subtle">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <h3 className="text-sm tracking-widest text-text-muted uppercase m-0">Your Recording</h3>
            <span className="text-xs font-mono text-accent-rust">STUDENT</span>
          </div>
          <div className="aspect-video bg-black relative group">
            {studentVideoUrl ? (
              <>
                <video
                  ref={studentVideoRef}
                  src={studentVideoUrl}
                  className="w-full h-full object-contain"
                  playsInline
                  muted
                />
                {/* Play/Pause overlay */}
                <div 
                  className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={toggleStudentPlayback}
                >
                  <div className="w-16 h-16 rounded-full bg-accent-rust/90 flex items-center justify-center">
                    <span className="text-2xl text-white">{studentPlaying ? '❚❚' : '▶'}</span>
                  </div>
                </div>
                {/* Progress bar */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 cursor-pointer"
                  onClick={handleStudentSeek}
                >
                  <div 
                    className="h-full bg-accent-rust transition-all"
                    style={{ width: `${studentProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-text-muted text-sm">Complete Part 2 to record your session</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Individual video controls are now on each video panel */}

      {/* Analyze Button */}
      <div className="flex justify-center flex-col items-center gap-2">
        {canAnalyze && cooldownRemaining === 0 ? (
          <button
            onClick={analyzeComparison}
            className="px-8 py-4 font-display text-lg tracking-wider uppercase border-2 transition-all duration-300 flex items-center gap-3 bg-accent-teal border-accent-teal hover:bg-accent-teal/80 hover:scale-105 shadow-lg"
            style={{ color: '#000000' }}
          >
            {isAnalyzing ? (
              <>
                <span 
                  className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" 
                  style={{ borderColor: '#000000', borderTopColor: 'transparent' }}
                />
                <span style={{ color: '#000000', fontWeight: 'bold' }}>Analyzing Performance...</span>
              </>
            ) : analysisComplete ? (
              <>
                <span style={{ color: '#000000', fontWeight: 'bold' }}>✓</span>
                <span style={{ color: '#000000', fontWeight: 'bold' }}>Re-analyze Comparison</span>
              </>
            ) : (
              <span style={{ color: '#000000', fontWeight: 'bold' }}>Analyze & Compare</span>
            )}
          </button>
        ) : cooldownRemaining > 0 ? (
          <button
            disabled
            className="px-8 py-4 font-display text-lg tracking-wider uppercase border-2 transition-all duration-300 flex items-center gap-3 cursor-not-allowed"
            style={{
              backgroundColor: '#f59e0b',
              color: '#000000',
              borderColor: '#d97706',
            }}
          >
            <span style={{ color: '#000000', fontWeight: 'bold' }}>Wait {cooldownRemaining}s</span>
          </button>
        ) : (
          <div 
            className="px-8 py-4 font-display text-lg tracking-wider uppercase border-2 transition-all duration-300 flex items-center gap-3 cursor-not-allowed font-bold select-none"
            style={{
              backgroundColor: '#6b7280',
              borderColor: '#4b5563',
            }}
          >
            <span style={{ color: '#000000', fontWeight: 'bold' }}>Analyze & Compare</span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-error/10 border border-error/30 p-4">
          <p className="text-error text-sm font-mono">{error}</p>
        </div>
      )}

      {/* Analysis Results */}
      {comparisonResult && (
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="bg-bg-tertiary/30 border border-border-subtle p-6 text-center">
            <div className="text-xs font-mono text-text-muted uppercase tracking-widest mb-2">Performance Score</div>
            <div className={`text-6xl font-display font-bold ${getScoreColor(comparisonResult.overallScore)}`}>
              {comparisonResult.overallScore}
            </div>
            <div className="text-xs font-mono text-text-muted mt-2">/ 100</div>
            <p className="text-text-cream mt-4 max-w-xl mx-auto">{comparisonResult.summary}</p>
          </div>

          {/* Strengths & Improvements Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="bg-bg-tertiary/30 border border-success/30">
              <div className="px-4 py-3 border-b border-success/30 bg-success/5">
                <h3 className="text-sm tracking-widest text-success uppercase m-0 flex items-center gap-2">
                  <span>✓</span> What You Did Well
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {comparisonResult.strengths.length > 0 ? (
                  comparisonResult.strengths.map((strength, idx) => (
                    <div key={idx} className="flex gap-3">
                      <span className="text-success font-mono">+</span>
                      <p className="text-text-cream text-sm">{strength}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-text-muted text-sm italic">No specific strengths identified</p>
                )}
              </div>
            </div>

            {/* Improvements */}
            <div className="bg-bg-tertiary/30 border border-accent-rust/30">
              <div className="px-4 py-3 border-b border-accent-rust/30 bg-accent-rust/5">
                <h3 className="text-sm tracking-widest text-accent-rust uppercase m-0 flex items-center gap-2">
                  <span>↑</span> Areas to Improve
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {comparisonResult.improvements.length > 0 ? (
                  comparisonResult.improvements.map((improvement, idx) => (
                    <div key={idx} className="flex gap-3">
                      <span className="text-accent-rust font-mono">→</span>
                      <p className="text-text-cream text-sm">{improvement}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-text-muted text-sm italic">No specific improvements needed</p>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Comparison Table */}
          {comparisonResult.detailedComparison.length > 0 && (
            <div className="bg-bg-tertiary/30 border border-border-subtle">
              <div className="px-4 py-3 border-b border-border-subtle">
                <h3 className="text-sm tracking-widest text-text-muted uppercase m-0">Detailed Comparison</h3>
              </div>
              <div className="divide-y divide-border-subtle">
                {comparisonResult.detailedComparison.map((item, idx) => (
                  <div key={idx} className="p-4 grid grid-cols-[120px_1fr_1fr_100px] gap-4 items-start">
                    <div className="text-xs font-mono text-accent-teal uppercase">{item.category}</div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">Expert</div>
                      <p className="text-sm text-text-cream">{item.expertNote || '—'}</p>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">Student</div>
                      <p className="text-sm text-text-cream">{item.studentNote || '—'}</p>
                    </div>
                    <div className="text-right">{getVerdictBadge(item.verdict)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initial State - No Analysis Yet */}
      {!comparisonResult && !isAnalyzing && !error && (
        <div className="bg-bg-tertiary/30 border border-border-subtle p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-2 border-border-subtle flex items-center justify-center">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h4 className="text-text-cream font-display text-lg mb-2">Ready to Compare</h4>
          <p className="text-text-muted text-sm max-w-md mx-auto">
            {hasVideos
              ? 'Click "Analyze & Compare" to get AI-powered feedback on your technique compared to the expert.'
              : 'Complete Parts 1 and 2 to enable performance comparison.'}
          </p>
        </div>
      )}
    </div>
  );
}
