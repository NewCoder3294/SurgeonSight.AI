import { useState, useRef, useEffect } from 'react';
import CornerBrackets from './CornerBrackets';
import { createOvershootVision, isOvershootConfigured, getApiKeyInfo } from '../services/overshoot';
import { deduplicateNotes } from '../utils/noteProcessing';

interface ExpertVideoPanelProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  onAnalysisStart: () => void;
  onAnalysisComplete: () => void;
  onNotesUpdate: (notes: string[]) => void;
  onAnalysisResult: (result: { summary: string; keyConcepts: string[]; notableMoments: string[] }) => void;
  onError?: (error: string) => void;
}

const ANALYSIS_PROMPT = `You are an expert surgical instructor watching a training video. 
As you observe, provide concise observations about:
- Instrument handling technique
- Hand positioning and grip
- Incision angles and approach
- Procedural steps being demonstrated
- Any notable techniques or best practices

Keep each observation to 1-2 sentences. Focus on actionable teaching points.
Avoid repeating the same observation multiple times.`;

export default function ExpertVideoPanel({
  isAnalyzing,
  analysisComplete,
  onAnalysisStart,
  onAnalysisComplete,
  onNotesUpdate,
  onAnalysisResult,
  onError,
}: ExpertVideoPanelProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const visionInstanceRef = useRef<ReturnType<typeof createOvershootVision> | null>(null);
  const notesAccumulatorRef = useRef<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoEndedCleanupRef = useRef<(() => void) | null>(null);

  // Cleanup video URL on unmount
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create video preview URL
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setVideoFile(file);
      setError(null);
    }
  };

  // Auto-start analysis when video file is set (if configured)
  useEffect(() => {
    if (videoFile && !isAnalyzing && !analysisComplete) {
      // Small delay to ensure video element is ready
      const timer = setTimeout(() => {
        startAnalysis();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoFile]); // Only depend on videoFile - isAnalyzing/analysisComplete are managed by callbacks

  const startAnalysis = async () => {
    if (!videoFile) return;

    // Check if Overshoot is configured
    if (!isOvershootConfigured()) {
      const errorMsg = 'Overshoot API key not configured. Please set VITE_OVERSHOOT_API_KEY in .env file.';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Debug: Log API key info (safe - only shows prefix)
    const keyInfo = getApiKeyInfo();
    console.log('[Debug] Overshoot API Key Status:', keyInfo);
    if (keyInfo.format === 'invalid') {
      console.warn('[Debug] API key format may be incorrect. Expected: ovs_...');
    }

    try {
      onAnalysisStart();
      notesAccumulatorRef.current = [];
      setError(null);

      const vision = createOvershootVision({
        prompt: ANALYSIS_PROMPT,
        file: videoFile,
        processing: {
          clip_length_seconds: 2,
          delay_seconds: 2,
          fps: 15,
          sampling_ratio: 0.2,
        },
        onResult: (text: string) => {
          notesAccumulatorRef.current.push(text);
          // Send deduplicated notes array to parent
          const deduped = deduplicateNotes(notesAccumulatorRef.current);
          onNotesUpdate(deduped);
        },
        onError: (err: Error) => {
          console.error('Overshoot error:', err);
          const errorMsg = `Analysis error: ${err.message}`;
          setError(errorMsg);
          onError?.(errorMsg);
        },
      });

      visionInstanceRef.current = vision;
      await vision.start();

      // Fallback timeout: complete after 60 seconds max (or video duration + buffer)
      const videoDuration = videoRef.current?.duration;
      const validDuration = videoDuration && !isNaN(videoDuration) && isFinite(videoDuration) ? videoDuration : 60;
      const maxTime = Math.min((validDuration + 10) * 1000, 90000); // Max 90 seconds

      timeoutRef.current = setTimeout(() => {
        if (!analysisComplete) {
          completeAnalysis();
        }
      }, maxTime);

      // Set up video ended listener
      const videoEl = videoRef.current;
      if (videoEl) {
        const handleEnded = () => {
          completeAnalysis();
        };
        videoEl.addEventListener('ended', handleEnded);

        // Store cleanup function
        videoEndedCleanupRef.current = () => {
          videoEl.removeEventListener('ended', handleEnded);
        };
      }

    } catch (error: any) {
      console.error('Failed to start Overshoot analysis:', error);
      const errorMsg = error.message || 'Failed to start video analysis';
      setError(errorMsg);
      onError?.(errorMsg);
      onAnalysisComplete();
    }
  };

  const completeAnalysis = async () => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Cleanup video ended listener if exists
    if (videoEndedCleanupRef.current) {
      videoEndedCleanupRef.current();
      videoEndedCleanupRef.current = null;
    }

    // Stop vision instance
    if (visionInstanceRef.current) {
      try {
        await visionInstanceRef.current.stop();
      } catch (e) {
        console.log('Vision stop error (ignored):', e);
      }
      visionInstanceRef.current = null;
    }

    // Process accumulated notes
    const { extractSummary, extractKeyConcepts, extractNotableMoments } = await import('../utils/noteProcessing');
    const dedupedNotes = deduplicateNotes(notesAccumulatorRef.current);

    // Send final deduplicated notes (ensure parent has latest state)
    onNotesUpdate(dedupedNotes);

    // Extract final summary and key concepts from deduplicated notes
    const summary = extractSummary(dedupedNotes);
    const keyConcepts = extractKeyConcepts(dedupedNotes);
    const notableMoments = extractNotableMoments(dedupedNotes);

    // Send structured results to parent
    onAnalysisResult({
      summary,
      keyConcepts,
      notableMoments,
    });

    // Mark analysis as complete
    onAnalysisComplete();
  };

  const handleReset = () => {
    // Clean up
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (videoEndedCleanupRef.current) {
      videoEndedCleanupRef.current();
      videoEndedCleanupRef.current = null;
    }
    if (visionInstanceRef.current) {
      visionInstanceRef.current.stop().catch(() => { });
      visionInstanceRef.current = null;
    }
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    setVideoFile(null);
    setVideoUrl('');
    setError(null);
    notesAccumulatorRef.current = [];
  };

  return (
    <div className="row-start-1 col-start-1">
      <CornerBrackets size="md" animated>
        <div className="h-full flex flex-col bg-[rgba(0,0,0,0.3)] [data-theme='light']:bg-[rgba(0,0,0,0.05)]">
          <div className="flex border-b border-[rgba(255,255,255,0.1)] [data-theme='light']:border-border-accent">
            <div className="flex-1 bg-transparent px-4 py-4 text-accent-rust uppercase text-xs tracking-wider border-b-2 border-accent-rust bg-accent-rust-glow">
              Video Upload & Analysis
            </div>
          </div>

          {videoFile && videoUrl ? (
            <div className="flex-1 flex flex-col min-h-[400px]">
              {/* Video Preview */}
              <div className="relative flex-1 bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="w-full h-full object-contain"
                />
                {isAnalyzing && (
                  <div className="absolute top-2 left-2 bg-bg-primary/90 px-2 py-1 rounded border border-accent-rust">
                    <span className="font-mono text-xs text-accent-rust uppercase">Analyzing...</span>
                  </div>
                )}
                {analysisComplete && (
                  <div className="absolute top-2 left-2 bg-bg-primary/90 px-2 py-1 rounded border border-success">
                    <span className="font-mono text-xs text-success uppercase">Analysis Complete</span>
                  </div>
                )}
              </div>

              {/* File info and controls */}
              <div className="p-4 border-t border-[rgba(255,255,255,0.1)] flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-text-cream text-sm truncate" title={videoFile.name}>{videoFile.name}</p>
                  <p className="text-text-dim text-xs">{(videoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  className="ml-4 px-3 py-1 text-xs font-mono text-text-muted hover:text-error underline transition-colors"
                  onClick={handleReset}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              className="h-full min-h-[400px] flex items-center justify-center cursor-pointer transition-all duration-300 border border-dashed border-[rgba(255,255,255,0.1)] [data-theme='light']:bg-[rgba(0,0,0,0.05)] [data-theme='light']:border-border-accent hover:bg-[rgba(0,180,216,0.05)] hover:border-accent-rust"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="video/*"
                hidden
              />
              <div className="text-center">
                <span className="text-5xl block mb-4 text-accent-rust">↑</span>
                <p className="text-text-cream mb-1">Upload Surgical Procedure Video</p>
                <span className="text-xs text-text-dim">MP4, MOV supported</span>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-4 bg-error/10 border border-error/30 text-error text-sm">
              <p className="font-mono text-xs uppercase mb-1">Error</p>
              <p>{error}</p>
            </div>
          )}
        </div>
      </CornerBrackets>
    </div>
  );
}
