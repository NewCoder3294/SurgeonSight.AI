import { useState, useRef, useEffect } from 'react';
import CornerBrackets from './CornerBrackets';
import { createOvershootVision, isOvershootConfigured, getApiKeyInfo } from '../services/overshoot';
import { deduplicateNotes, parseOvershootOutput, isNearDuplicate, hasNewContentTokens } from '../utils/noteProcessing';

interface ExpertVideoPanelProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  onAnalysisStart: () => void;
  onAnalysisComplete: () => void;
  onNotesUpdate: (notes: string[]) => void;
  onAnalysisResult: (result: { summary: string; keyConcepts: string[]; notableMoments: string[] }) => void;
  onError?: (error: string) => void;
}

/**
 * Overshoot Prompt - Strict format for Part 1
 * 
 * Outputs ONLY:
 * - LOG: <one sentence, <=16 words>
 * - MOMENT: <optional time> <one sentence, 8-18 words>
 * 
 * Throttling: Overshoot results are buffered in queue and flushed to UI every 3500ms.
 * On each flush, the best candidate is selected (longest unique or latest non-empty).
 * See flushResults() function where THROTTLE_INTERVAL_MS is set (currently 3500ms).
 */
const ANALYSIS_PROMPT = `You are an expert surgical instructor observing a procedure video.
STRICT RULES:
- Output at most ONE item every 3–5 seconds.
- Each item must be ONE sentence, <=16 words.
- Use surgical/technical terms (grip, retraction, exposure, force modulation, angle control, wrist stability, tissue handling).
- Do NOT restate previous observations. Output only when a new technique point appears.
- Do NOT invent timestamps. Only include time if it is clearly known; otherwise omit.
- No markdown, no bullets, no numbering.

FORMAT:
LOG: <one sentence, <=16 words>
MOMENT: <optional time> <one sentence, 8–18 words>

Begin.`;

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
  // Store notes with optional timestamps (attached from video.currentTime in code, not from model)
  const notesAccumulatorRef = useRef<Array<{ text: string; timestamp?: number }>>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoEndedCleanupRef = useRef<(() => void) | null>(null);
  
  // Throttling: Queue incoming Overshoot messages and flush to UI on interval
  // THROTTLE_INTERVAL_MS: Controls how often we flush (currently 3500ms = ~3.5 seconds)
  // To tune: Change this value to adjust pacing (lower = faster updates, higher = slower)
  const THROTTLE_INTERVAL_MS = 3500;
  const messageQueueRef = useRef<string[]>([]);
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const acceptedNotesRef = useRef<string[]>([]); // Track last ~15 accepted notes for dedupe

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
          // Queue incoming messages for throttled processing
          // Parse to extract LOG items (ignore MOMENT items in streaming, they'll be extracted on completion)
          const parsed = parseOvershootOutput(text);
          messageQueueRef.current.push(...parsed.logs);
        },
        onError: (err: Error) => {
          console.error('Overshoot error:', err);
          const errorMsg = `Analysis error: ${err.message}`;
          setError(errorMsg);
          onError?.(errorMsg);
        },
      });

      visionInstanceRef.current = vision;
      
      // Initialize flush interval: flush queue and pick best candidate every THROTTLE_INTERVAL_MS
      // See THROTTLE_INTERVAL_MS constant above to tune the pacing
      flushIntervalRef.current = setInterval(() => {
        flushResults();
      }, THROTTLE_INTERVAL_MS);
      
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

  /**
   * Flush queued messages: pick the best candidate and add to accumulator if it passes filters
   * 
   * Strategy:
   * 1. Filter queue: remove empty/invalid messages
   * 2. Dedupe: remove exact duplicates and near-duplicates (Jaccard >= 0.75)
   * 3. Template dedupe: require at least 2 new content tokens vs last accepted
   * 4. Pick best candidate: longest unique message (most informative)
   * 5. If candidate passes, append to accumulator and update UI
   * 6. Clear queue for next interval
   * 
   * Throttle interval is controlled by THROTTLE_INTERVAL_MS constant (currently 3500ms)
   */
  const flushResults = () => {
    if (messageQueueRef.current.length === 0) return;
    
    // Filter: keep only non-empty LOG items
    const candidates = messageQueueRef.current
      .map(msg => msg.trim())
      .filter(msg => msg.length > 0);
    
    if (candidates.length === 0) {
      messageQueueRef.current = [];
      return;
    }
    
    // Pick best candidate: longest unique message (most informative)
    // Sort by length descending, then pick first that passes filters
    const sortedCandidates = [...candidates].sort((a, b) => b.length - a.length);
    
    let selectedCandidate: string | null = null;
    
    for (const candidate of sortedCandidates) {
      // Check exact duplicate against accumulator
      const normalizedCandidate = candidate.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const isExactDuplicate = notesAccumulatorRef.current.some(note => {
        const normalizedNote = note.text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
        return normalizedNote === normalizedCandidate;
      });
      
      if (isExactDuplicate) continue;
      
      // Check near-duplicate using Jaccard similarity (>= 0.75 threshold)
      if (isNearDuplicate(candidate, acceptedNotesRef.current, 15)) {
        continue;
      }
      
      // Template dedupe: require at least 2 new content tokens
      const lastAccepted = acceptedNotesRef.current.length > 0 
        ? acceptedNotesRef.current[acceptedNotesRef.current.length - 1] 
        : null;
      if (!hasNewContentTokens(candidate, lastAccepted)) {
        continue;
      }
      
      // Candidate passed all filters
      selectedCandidate = candidate;
      break;
    }
    
    // If we found a valid candidate, add it to accumulator with timestamp
    if (selectedCandidate) {
      // Capture video.currentTime when logging (code-attached timestamp, trusted)
      const videoEl = videoRef.current;
      const timestamp = videoEl && !isNaN(videoEl.currentTime) && isFinite(videoEl.currentTime) 
        ? videoEl.currentTime 
        : undefined;
      
      const noteWithTimestamp: { text: string; timestamp?: number } = {
        text: selectedCandidate,
        timestamp,
      };
      
      notesAccumulatorRef.current.push(noteWithTimestamp);
      
      // Track in accepted notes (keep last 15 for dedupe lookback - text only for dedupe)
      acceptedNotesRef.current.push(selectedCandidate);
      if (acceptedNotesRef.current.length > 15) {
        acceptedNotesRef.current.shift();
      }
      
      // Update parent with current state (extract text for UI)
      const noteTexts = notesAccumulatorRef.current.map(n => n.text);
      const deduped = deduplicateNotes(noteTexts);
      onNotesUpdate(deduped);
    }
    
    // Clear queue for next interval
    messageQueueRef.current = [];
  };

  const completeAnalysis = async () => {
    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Clear flush interval
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }

    // Flush any remaining buffered results
    flushResults();

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

    // Process accumulated notes (generate Overview at completion only)
    const { extractSummary, extractKeyConcepts, extractNotableMoments, deduplicateNotes } = await import('../utils/noteProcessing');
    
    // Extract text for deduplication and summary/key concepts extraction
    const noteTexts = notesAccumulatorRef.current.map(n => n.text);
    const dedupedNoteTexts = deduplicateNotes(noteTexts);

    // Send final deduplicated notes (text only for UI streaming log)
    onNotesUpdate(dedupedNoteTexts);

    // Extract final summary, key concepts, and notable moments at completion
    // Overview: abstract themes only, not verbatim log sentences
    const summary = extractSummary(dedupedNoteTexts);
    const keyConcepts = extractKeyConcepts(dedupedNoteTexts);
    
    // Notable moments: use notes with code-attached timestamps (not model-provided)
    const notableMoments = extractNotableMoments(notesAccumulatorRef.current);

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
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
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
    messageQueueRef.current = [];
    acceptedNotesRef.current = [];
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
            <div className="flex-1 flex flex-col min-h-[400px] max-h-[600px]">
              {/* Video Preview */}
              <div className="relative flex-1 bg-black min-h-0">
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
