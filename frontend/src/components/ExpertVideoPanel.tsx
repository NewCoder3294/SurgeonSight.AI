import { useState, useRef, useEffect } from 'react';
import { createOvershootVision, isOvershootConfigured, getApiKeyInfo, closeAllStreams, shouldWaitForStreamLimit, getStreamLimitCooldownRemaining } from '../services/overshoot';
import { parseOvershootOutput, conceptSignature } from '../utils/noteProcessing';
import { useMediaPipeHands } from '../hooks/useMediaPipeHands';
import { drawHandSkeleton, drawHandLandmarks, drawAngleArc, drawPinchAngle, drawFingerBend } from '../utils/canvasDrawing';

interface ExpertVideoPanelProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  onAnalysisStart: () => void;
  onAnalysisComplete: () => void;
  onNotesUpdate: (notes: string[]) => void;
  onAnalysisResult: (result: {
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
    };
  }) => void;
  onError?: (error: string) => void;
  onVideoUploaded?: () => void;
  onVideoUrlReady?: (url: string) => void; // Callback to provide expert video URL for Part 3
}

// Interface for per-hand accumulated metrics
interface HandMetricsAccumulator {
  angles: number[];
  steadiness: number[];
  speeds: number[];
  gripCounts: Record<string, number>;
}

// Interface for accumulated metrics (split by hand)
interface AccumulatedMetrics {
  left: HandMetricsAccumulator;
  right: HandMetricsAccumulator;
}

/**
 * Generate Overshoot Prompt - Structured JSON format with duration constraints
 * 
 * Returns a prompt that enforces strict JSON output with time-anchored observations.
 */
function generateAnalysisPrompt(durationMs: number): string {
  // Calculate max observations: ceil(duration/6s) = ceil(durationMs/6000)
  const maxObservations = Math.ceil(durationMs / 6000);

  return `You are a surgical instructor analyzing a procedure video. Output strict JSON only.

VIDEO CONTEXT:
- Duration: ${durationMs}ms (${(durationMs / 1000).toFixed(1)}s)
- Maximum observations: ${maxObservations} (one per 5-7s window)

OUTPUT FORMAT (JSON only, no markdown):
{
  "overview": "2-3 sentences max describing overall technique themes. Abstract, no specific finger mentions.",
  "observed_instruments": ["scissors", "needle driver", ...],
  "observed_materials": ["banana", "suture", ...],
  "observations": [
    {
      "text": "One sentence with action + target + reason clause (to/so that/because/to prevent)",
      "category": "instrument|exposure|tissue|safety|efficiency|technique",
      "start_ms": 0,
      "end_ms": 6000,
      "confidence": 0.0
    }
  ],
  "key_concepts": ["Verb-first ≤8 words", "..."],
  "notable_moments": [
    {
      "text": "Critical technique moment description",
      "timestamp_ms": 123000,
      "confidence": 0.0
    }
  ]
}

STRICT RULES:

0. CONTENT GROUNDING:
   - observed_instruments: List ONLY instruments you are confident appear in the video (e.g., "scissors", "forceps", "needle driver"). Do NOT invent tools.
   - observed_materials: List ONLY materials you are confident appear (e.g., "banana", "suture", "tissue").
   - In observations and notable_moments, you may ONLY mention instruments/materials from observed_instruments/observed_materials lists.
   - If unsure about a specific instrument, use generic terms: "instrument", "needle", "suture", "retractor" ONLY if clearly present.
   - DO NOT invent tools. Explicitly BAN mentioning: scalpel, trocar, laparoscope, suction, bipolar, cautery, stapler, etc. unless they appear in observed_instruments.
   - If video shows banana/scissors/suture training, do NOT mention scalpels or other surgical instruments not visible.

1. OBSERVATIONS:
   - Hard cap: Return at most ${durationMs <= 20000 ? Math.ceil(durationMs / 4000) : Math.ceil(durationMs / 6000)} observations TOTAL across all responses (${durationMs <= 20000 ? 'one per 4s window if duration <= 20s' : 'one per 6s window'}).
   - IMPORTANT: If you send multiple responses (as video is processed in clips), distribute observations across responses. Ideally return 1 observation per response, not chunks of multiple observations.
   - Each observations[i].text must be exactly ONE sentence only. No newline characters. No multiple sentences. If you have more to say, choose the single highest-signal sentence.
   - Each sentence must have: ACTION verb + TARGET (instrument/tissue/vessel/angle) + REASON clause ("to X", "so that Y", "because Z", "to prevent W")
   - Anchor time windows using start_ms/end_ms based on video progression
   - BAN rubric filler words: "observed", "appropriate", "effective", "good technique", "proper handling" UNLESS justified by a reason clause
   - NO repetition: Do not repeat the same concept unless severity escalates
   - Categories: "instrument" (grip/angle/control), "exposure" (retraction/visualization), "tissue" (dissection/handling), "safety" (risk/prevention), "efficiency" (motion economy), "technique" (hemostasis/cautery)

2. OVERVIEW: 5-8 sentences. Detailed, comprehensive paragraph describing the procedure technique, flow, and key actions. Be descriptive.

3. KEY_CONCEPTS: 4-8 items, ≤8 words each, verb-first. Extract from observations as teachable principles.

4. NOTABLE_MOMENTS: 0-4 items only. Include timestamp_ms ONLY if derivable from video progression. If uncertain, omit the moment entirely.

5. When uncertain: REDUCE output rather than hallucinate. Prefer fewer, accurate observations over speculation.

Output valid JSON only. No markdown, no code blocks, no trailing commas.`;
}

export default function ExpertVideoPanel({
  isAnalyzing,
  analysisComplete,
  onAnalysisStart,
  onAnalysisComplete,
  onNotesUpdate,
  onAnalysisResult,
  onError,
  onVideoUploaded,
  onVideoUrlReady,
}: ExpertVideoPanelProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visionInstanceRef = useRef<ReturnType<typeof createOvershootVision> | null>(null);
  // Store notes with timestamps (attached from video.currentTime in code, not from model)
  // Format: { text: string, timestamp: number, type: 'LOG' | 'MOMENT' }
  const notesAccumulatorRef = useRef<Array<{ text: string; timestamp: number; type: 'LOG' | 'MOMENT' }>>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoEndedCleanupRef = useRef<(() => void) | null>(null);

  // Store structured data from JSON responses (overview, keyConcepts, lowSignal, scaffold, observedInstruments, observedMaterials)
  const structuredDataRef = useRef<{
    overview?: string;
    keyConcepts?: string[];
    lowSignal?: boolean;
    scaffold?: string[];
    observedInstruments?: string[];
    observedMaterials?: string[];
    lastUpdateTime: number;
  }>({ lastUpdateTime: 0 });

  // Accumulate metrics for expert baseline
  const metricsAccumulatorRef = useRef<AccumulatedMetrics>({
    left: { angles: [], steadiness: [], speeds: [], gripCounts: { pencil: 0, power: 0, unknown: 0 } },
    right: { angles: [], steadiness: [], speeds: [], gripCounts: { pencil: 0, power: 0, unknown: 0 } }
  });

  // Throttling: Queue incoming Overshoot messages and flush to UI on interval
  // MIN_TIME_BETWEEN_NOTES_MS: Minimum time (3-5 seconds) between accepting new notes
  // To tune throttling: Adjust MIN_TIME_BETWEEN_NOTES_MS (higher = more sparse, lower = more frequent)
  const MIN_TIME_BETWEEN_NOTES_MS = 4000; // 4 seconds (target: 3-5 seconds)
  const FLUSH_INTERVAL_MS = 1000; // Check queue every 1 second, but only accept if enough time passed
  const messageQueueRef = useRef<string[]>([]); // Queue of observation texts for throttling
  const momentsQueueRef = useRef<Array<{ text: string; timestamp: number | null }>>([]); // Queue of notable moments
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAcceptedTimeRef = useRef<number>(0); // Track when last note was accepted for throttling
  const seenObservationSignaturesRef = useRef<Set<string>>(new Set()); // Track concept signatures for deduplication

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      // Stop any active vision instance
      if (visionInstanceRef.current) {
        visionInstanceRef.current.stop().catch(() => {});
        visionInstanceRef.current = null;
      }
      // Clear any intervals
      if (flushIntervalRef.current) {
        clearInterval(flushIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Hand tracking for uploaded video
  const { hands: detectedHands, isLoading: isHandTrackingLoading } = useMediaPipeHands({
    videoElement: videoRef.current,
    enabled: !!videoUrl, // Enable tracking when video is loaded
    targetFps: 60 // Higher FPS for smooth video playback
  });

  // Accumulate metrics when hands are detected during analysis
  useEffect(() => {
    if (isAnalyzing && detectedHands.length > 0) {
      detectedHands.forEach(hand => {
        // Only collect valid metrics if handedness is known
        if (hand.metrics && (hand.handedness === 'Left' || hand.handedness === 'Right')) {
          const target = hand.handedness === 'Left' ? metricsAccumulatorRef.current.left : metricsAccumulatorRef.current.right;

          target.angles.push(hand.metrics.scalpelAngle);
          target.steadiness.push(hand.metrics.steadiness);
          target.speeds.push(hand.metrics.speed);

          const grip = hand.metrics.gripType || 'unknown';
          target.gripCounts[grip] = (target.gripCounts[grip] || 0) + 1;
        }
      });
    }
  }, [detectedHands, isAnalyzing]);

  // Draw hand overlays
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas size to video
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detectedHands.forEach((hand: any) => {
      const landmarks = hand.landmarks;
      const metrics = hand.metrics;

      // Draw skeleton
      drawHandSkeleton(ctx, landmarks, canvas.width, canvas.height, false); // No flip for uploaded video
      drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height, false);

      // Draw metrics if available
      if (metrics) {
        drawAngleArc(ctx, landmarks, metrics.scalpelAngle, canvas.width, canvas.height, false);
        drawPinchAngle(ctx, landmarks, metrics.pinchAngle, canvas.width, canvas.height, false);
        drawFingerBend(ctx, landmarks, metrics.fingerBend, canvas.width, canvas.height, false);
      }
    });
  }, [detectedHands]);

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
      // Notify parent that video was uploaded
      onVideoUploaded?.();
      // Provide video URL for Part 3 comparison
      onVideoUrlReady?.(url);
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

    // Check for stream limit cooldown
    if (shouldWaitForStreamLimit()) {
      const remaining = getStreamLimitCooldownRemaining();
      const errorMsg = `Stream limit reached. Please wait ${remaining} seconds and try again.`;
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Close all existing streams before starting new analysis
    try {
      await closeAllStreams();
      // Give server a moment to release streams
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (e) {
      console.warn('[ExpertVideoPanel] Error closing streams:', e);
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
      messageQueueRef.current = [];
      momentsQueueRef.current = [];
      seenObservationSignaturesRef.current.clear();
      // Reset metrics accumulator
      metricsAccumulatorRef.current = {
        left: { angles: [], steadiness: [], speeds: [], gripCounts: { pencil: 0, power: 0, unknown: 0 } },
        right: { angles: [], steadiness: [], speeds: [], gripCounts: { pencil: 0, power: 0, unknown: 0 } }
      };
      structuredDataRef.current = { lastUpdateTime: 0 };
      setError(null);

      // Auto-play video for MediaPipe tracking (muted)
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.play().catch(e => console.log("Auto-play blocked:", e));
      }

      // Get video duration for prompt (default to 60s if not available)
      const videoDurationMs = videoRef.current?.duration
        ? Math.floor((videoRef.current.duration || 60) * 1000)
        : 60000;
      const analysisPrompt = generateAnalysisPrompt(videoDurationMs);

      const vision = createOvershootVision({
        prompt: analysisPrompt,
        file: videoFile,
        processing: {
          clip_length_seconds: 2,
          delay_seconds: 2,
          fps: 15,
          sampling_ratio: 0.2,
        },
        onResult: (text: string) => {
          // Parse structured JSON or legacy format
          const parsed = parseOvershootOutput(text);

          // Filter observations by concept signature - only enqueue new concepts
          const newObservations: string[] = [];
          for (const obs of parsed.observations) {
            const signature = conceptSignature(obs.text);
            if (!seenObservationSignaturesRef.current.has(signature)) {
              seenObservationSignaturesRef.current.add(signature);
              newObservations.push(obs.text);
            }
          }

          // Queue only new observation texts for throttled processing
          messageQueueRef.current.push(...newObservations);

          // Queue notable moments (convert timestampMs to seconds for compatibility)
          if (parsed.notableMoments && parsed.notableMoments.length > 0) {
            momentsQueueRef.current.push(...parsed.notableMoments.map(m => ({
              text: m.text,
              timestamp: m.timestampMs / 1000 // Convert milliseconds to seconds
            })));
          }

          // Store structured data (overview, keyConcepts, lowSignal, scaffold, observedInstruments, observedMaterials) from JSON
          if (parsed.overview || (parsed.keyConcepts && parsed.keyConcepts.length > 0) || parsed.lowSignal || parsed.observedInstruments || parsed.observedMaterials) {
            structuredDataRef.current = {
              overview: parsed.overview || structuredDataRef.current.overview,
              keyConcepts: parsed.keyConcepts || structuredDataRef.current.keyConcepts,
              lowSignal: parsed.lowSignal !== undefined ? parsed.lowSignal : structuredDataRef.current.lowSignal,
              scaffold: parsed.scaffold || structuredDataRef.current.scaffold,
              observedInstruments: parsed.observedInstruments || structuredDataRef.current.observedInstruments,
              observedMaterials: parsed.observedMaterials || structuredDataRef.current.observedMaterials,
              lastUpdateTime: Date.now()
            };
          }
        },
        onError: (err: Error) => {
          console.error('Overshoot error:', err);
          const errorMsg = `Analysis error: ${err.message}`;
          setError(errorMsg);
          onError?.(errorMsg);
          // Stop analysis on error - clear intervals and mark as complete
          if (flushIntervalRef.current) {
            clearInterval(flushIntervalRef.current);
            flushIntervalRef.current = null;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          onAnalysisComplete();
        },
      });

      visionInstanceRef.current = vision;

      // Initialize flush interval: check queue every FLUSH_INTERVAL_MS
      // Notes are only accepted if MIN_TIME_BETWEEN_NOTES_MS has passed since last acceptance
      flushIntervalRef.current = setInterval(() => {
        flushResults();
      }, FLUSH_INTERVAL_MS);

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
   * Helper: Calculate statistics (mean, std dev) from array
   */
  const calculateStats = (values: number[]) => {
    if (values.length === 0) return { mean: 0, std: 0, min: 0, max: 0 };

    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    return {
      mean,
      std,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  };

  /**
   * Helper: Normalize text for comparison (lowercase, remove punctuation, collapse whitespace)
   */
  const normalizeText = (s: string): string => {
    return s
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  /**
   * Helper: Extract first meaningful token (skip articles like "a", "the", "an")
   * Returns the first word that is not an article
   */
  const firstToken = (s: string): string => {
    const articles = new Set(['a', 'an', 'the']);
    const tokens = s.trim().split(/\s+/);
    for (const token of tokens) {
      const cleaned = token.toLowerCase().replace(/[^\w]/g, '');
      if (cleaned && !articles.has(cleaned)) {
        return cleaned;
      }
    }
    // Fallback: return first token if no meaningful token found
    return tokens[0]?.toLowerCase().replace(/[^\w]/g, '') || '';
  };

  /**
   * Helper: Compute concept signature (normalize + remove stopwords)
   * Used for concept-level deduplication in flushResults
   */
  const computeConceptSignature = (s: string): string => {
    const stopwords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'being', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
      'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there', 'here',
      'during', 'while', 'when', 'where', 'which', 'who', 'what', 'how', 'why']);

    const normalized = normalizeText(s);
    const tokens = normalized.split(/\s+/).filter(token => token.length > 2 && !stopwords.has(token));
    return tokens.join(' ');
  };

  /**
   * Flush queued messages: add to accumulator if throttling allows
   * 
   * Strategy:
   * 1. Check throttling: Only accept if MIN_TIME_BETWEEN_NOTES_MS has passed since last acceptance
   * 2. Apply strict anti-repetition: concept-level dedupe + consecutive start-word constraint
   * 3. Accept ONLY ONE observation per interval (prevents chunks)
   * 4. If all candidates rejected, accept NONE (wait for next interval)
   * 
   * Throttling is enforced by MIN_TIME_BETWEEN_NOTES_MS (currently 4000ms = 4 seconds)
   */
  const flushResults = () => {
    if (messageQueueRef.current.length === 0) return;

    // Throttling: Only accept new notes if enough time has passed
    const now = Date.now();
    const timeSinceLastAccepted = now - lastAcceptedTimeRef.current;
    if (timeSinceLastAccepted < MIN_TIME_BETWEEN_NOTES_MS) {
      // Not enough time has passed, skip this flush
      return;
    }

    // Filter: keep only non-empty messages, but preserve original for removal
    const candidatePairs = messageQueueRef.current
      .map((msg, idx) => ({ original: msg, trimmed: msg.trim(), index: idx }))
      .filter(pair => pair.trimmed.length > 0);

    if (candidatePairs.length === 0) {
      messageQueueRef.current = [];
      return;
    }

    // Get existing accepted notes for deduplication checks
    const existingNotes = notesAccumulatorRef.current.map(n => n.text);
    const existingSignatures = new Set(existingNotes.map(computeConceptSignature).filter(sig => sig.length > 0));
    const lastAcceptedFirstToken = existingNotes.length > 0 ? firstToken(existingNotes[existingNotes.length - 1]) : null;

    // Filter candidates: reject duplicates and consecutive start-word matches
    const validCandidates = candidatePairs.filter(pair => {
      const text = pair.trimmed;
      const sig = computeConceptSignature(text);

      // Reject if concept signature already exists (concept-level dedupe)
      if (sig && existingSignatures.has(sig)) {
        return false;
      }

      // Reject if starts with same token as last accepted (consecutive start-word constraint)
      const candidateFirstToken = firstToken(text);
      if (lastAcceptedFirstToken && candidateFirstToken === lastAcceptedFirstToken) {
        return false;
      }

      return true;
    });

    // If all candidates were rejected, accept NONE (wait for next interval)
    if (validCandidates.length === 0) {
      // Remove all rejected candidates from queue to prevent infinite loop
      messageQueueRef.current = [];
      console.log("[flush] all candidates rejected (duplicates/consecutive), remaining queue cleared");
      return;
    }

    // Rank valid candidates deterministically: prefer longer, more specific observations with concrete instruments
    const rankCandidate = (text: string): number => {
      let rank = 0;
      const lower = text.toLowerCase();

      // Prefer longer text (more specific)
      rank += text.length;

      // Prefer concrete instruments/materials (forceps, scissors, suture, needle driver)
      const concreteTerms = ['forceps', 'scissors', 'suture', 'needle driver', 'needledriver', 'retractor', 'banana'];
      for (const term of concreteTerms) {
        if (lower.includes(term)) {
          rank += 100; // Significant boost for concrete terms
        }
      }

      return rank;
    };

    // Select ONLY ONE best candidate from valid candidates
    let bestPair = validCandidates[0];
    let bestRank = rankCandidate(bestPair.trimmed);

    for (const pair of validCandidates) {
      const rank = rankCandidate(pair.trimmed);
      if (rank > bestRank) {
        bestRank = rank;
        bestPair = pair;
      }
    }

    // Add ONLY the selected candidate to accumulator (use trimmed version)
    const noteWithTimestamp: { text: string; timestamp: number; type: 'LOG' | 'MOMENT' } = {
      text: bestPair.trimmed,
      timestamp: 0, // Placeholder - not used for observations, only for legacy moment extraction
      type: 'LOG',
    };

    notesAccumulatorRef.current.push(noteWithTimestamp);

    // Remove ONLY the accepted candidate from queue using original index (leave others for future intervals)
    messageQueueRef.current.splice(bestPair.index, 1);

    // Debug log
    console.log("[flush] accepted 1 of", candidatePairs.length, "valid:", validCandidates.length, "remaining", messageQueueRef.current.length);

    // Update throttling timestamp
    lastAcceptedTimeRef.current = now;

    // Update parent with current state (extract text for UI - already deduplicated by signature)
    const noteTexts = notesAccumulatorRef.current.map(n => n.text);
    onNotesUpdate(noteTexts);

    // DO NOT clear the whole queue - leave remaining messages for future intervals
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

    // Pause video when analysis completes
    if (videoRef.current) {
      videoRef.current.pause();
    }

    // Process accumulated code metrics for BOTH hands
    const processHandStats = (accumulator: HandMetricsAccumulator) => {
      const angleStats = calculateStats(accumulator.angles);
      const steadinessStats = calculateStats(accumulator.steadiness);
      const speedStats = calculateStats(accumulator.speeds);

      // Determine dominant grip
      let dominantGrip = 'pencil';
      let maxCount = 0;
      Object.entries(accumulator.gripCounts).forEach(([grip, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominantGrip = grip;
        }
      });

      return {
        angleTarget: Math.round(angleStats.mean) || 45,
        angleTolerance: Math.round(angleStats.std * 2) || 15,
        steadinessTarget: Math.round(steadinessStats.mean) || 85,
        expectationGripType: dominantGrip,
        speedOptimal: speedStats.mean || 1.0,
        speedTolerance: speedStats.std * 2 || 0.5
      };
    };

    const leftStats = processHandStats(metricsAccumulatorRef.current.left);
    const rightStats = processHandStats(metricsAccumulatorRef.current.right);

    // Create expert metrics object (composite)
    const expertStats = {
      // Legacy support (defaults to Right hand if available, else Left)
      angleTarget: rightStats.angleTarget || leftStats.angleTarget,
      angleTolerance: rightStats.angleTolerance || leftStats.angleTolerance,
      steadinessTarget: rightStats.steadinessTarget || leftStats.steadinessTarget,
      expectationGripType: rightStats.expectationGripType || leftStats.expectationGripType,
      speedOptimal: rightStats.speedOptimal || leftStats.speedOptimal,
      speedTolerance: rightStats.speedTolerance || leftStats.speedTolerance,

      // New separate stats
      leftHand: leftStats,
      rightHand: rightStats,

      // Pass textual context for AI coaching
      contextElements: [
        ...(structuredDataRef.current.keyConcepts || []),
        ...(structuredDataRef.current.overview ? [structuredDataRef.current.overview] : []),
        ...(notesAccumulatorRef.current.map(n => n.text).slice(0, 5)) // Top 5 observations
      ].filter(Boolean)
    };

    console.log("Calculated Expert Stats:", expertStats);

    // Process accumulated notes (generate Overview at completion only)
    const { extractSummary, extractKeyConcepts, extractNotableMoments, deduplicateNotes, thinObservationsDeterministic } = await import('../utils/noteProcessing');

    // Extract text for deduplication
    const noteTexts = notesAccumulatorRef.current.map(n => n.text);
    const dedupedNoteTexts = deduplicateNotes(noteTexts);

    // Apply final thinning: convert to Observations, thin deterministically, then extract text
    const videoDurationMs = videoRef.current?.duration
      ? Math.floor((videoRef.current.duration || 60) * 1000)
      : 60000;

    // Convert to Observation objects for thinning
    const accumulatedObservations = dedupedNoteTexts.map(text => ({
      text,
      category: 'general' as const,
    }));

    // Apply deterministic thinning to final accumulated list
    const thinnedFinal = thinObservationsDeterministic(accumulatedObservations, videoDurationMs);
    const finalNoteTexts = thinnedFinal.map(obs => obs.text);

    // Send final thinned notes (text only for UI streaming log)
    onNotesUpdate(finalNoteTexts);

    // Check for low signal: if < 3 observations after deduplication + thinning, set lowSignal flag
    let lowSignal = structuredDataRef.current.lowSignal || false;
    let scaffold = structuredDataRef.current.scaffold;

    if (finalNoteTexts.length < 3) {
      lowSignal = true;
      // Generate scaffold if not already provided from parsed output
      if (!scaffold) {
        scaffold = [
          'Focus areas to review: exposure stability',
          'Focus areas to review: instrument angle',
          'Focus areas to review: traction-countertraction',
          'Focus areas to review: hemostasis technique',
          'Focus areas to review: motion economy',
          'Focus areas to review: tissue handling'
        ];
      }
    }

    // Extract final summary, key concepts, and notable moments at completion
    // Prefer structured data from JSON if available, otherwise fall back to extraction
    // Use finalNoteTexts (thinned) for extraction to avoid processing too many observations
    const { buildOverview } = await import('../utils/noteProcessing');
    const rawOverview = structuredDataRef.current.overview || extractSummary(finalNoteTexts);
    // Use buildOverview to enhance overview with observed instruments/materials and duration context
    const summary = buildOverview(
      rawOverview,
      structuredDataRef.current.observedInstruments,
      structuredDataRef.current.observedMaterials,
      videoDurationMs
    );
    const existingKeyConcepts = structuredDataRef.current.keyConcepts && structuredDataRef.current.keyConcepts.length > 0
      ? structuredDataRef.current.keyConcepts
      : extractKeyConcepts(finalNoteTexts);

    // Add 1-2 bank concepts to supplement existing concepts
    // Use video filename as seed for deterministic selection
    const videoIdSeed = (videoFile?.name) || 'default';
    const isShortVideo = videoDurationMs <= 20000 || finalNoteTexts.length <= 4;
    const bankConceptCount = isShortVideo ? 1 : 2;

    const { pickBankConcepts } = await import('../utils/noteProcessing');
    const bankConcepts = pickBankConcepts({
      existingConcepts: existingKeyConcepts,
      observedInstruments: structuredDataRef.current.observedInstruments || [],
      observedMaterials: structuredDataRef.current.observedMaterials || [],
      videoIdSeed,
      count: bankConceptCount
    });

    // Combine existing + bank concepts, cap at 8 total
    const finalKeyConcepts = [...existingKeyConcepts, ...bankConcepts].slice(0, 8);

    // Notable moments: merge queued moments with notes (prioritize queued moments from JSON)
    // Only include timestamps if they're > 1 second and not fake (code-attached timestamps are trusted)
    const allNotableMoments: Array<{ text: string; timestamp: number }> = [];

    // Add moments from queue (from JSON notable_moments field) - only if timestamp is valid
    for (const moment of momentsQueueRef.current) {
      if (moment.text && moment.timestamp !== null && moment.timestamp > 1) {
        allNotableMoments.push({ text: moment.text, timestamp: moment.timestamp });
      }
    }

    // Add moments from accumulator (code-attached timestamps are trusted)
    const extractedMoments = extractNotableMoments(notesAccumulatorRef.current);

    // Format extracted moments (they come as "MM:SS – text" strings)
    for (const momentStr of extractedMoments) {
      const match = momentStr.match(/^(\d+:\d+)\s*[–-]\s*(.+)$/);
      if (match) {
        const [mins, secs] = match[1].split(':').map(Number);
        const timestamp = mins * 60 + secs;
        if (timestamp > 1) {
          allNotableMoments.push({ text: match[2], timestamp });
        }
      }
    }

    // Deduplicate by both text and timestamp (avoid duplicate timestamps, keep only distinct moments)
    const seen = new Set<string>();
    const seenTimestamps = new Set<number>();
    const distinctMoments = allNotableMoments.filter(m => {
      const normalized = m.text.toLowerCase().trim();
      // Skip if duplicate text or duplicate timestamp (only one moment per timestamp)
      if (seen.has(normalized) || seenTimestamps.has(m.timestamp)) return false;
      seen.add(normalized);
      seenTimestamps.add(m.timestamp);
      return true;
    });

    // Sort by timestamp (chronological) and take top 4 truly distinct moments
    const sortedMoments = distinctMoments
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 4);

    // Convert to structured format with timestampMs (milliseconds) and source
    // Moments from JSON queue have trusted timestamps from Overshoot
    // Moments from accumulator (extracted) have timestamps from legacy extraction (less reliable)
    const structuredMoments = sortedMoments.map(m => {
      // Check if this moment came from JSON queue (has text matching a queued moment)
      const fromJSON = momentsQueueRef.current.some(qm => qm.text === m.text && qm.timestamp === m.timestamp);
      return {
        text: m.text,
        timestampMs: m.timestamp * 1000, // Convert seconds to milliseconds
        timestampSource: fromJSON ? 'code' as const : 'code' as const // All trusted for now - JSON moments are preferred
      };
    });

    // Send structured results to parent
    onAnalysisResult({
      summary,
      keyConcepts: finalKeyConcepts,
      notableMoments: structuredMoments,
      lowSignal,
      scaffold,
      expertStats // Pass the calculated stats
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
    momentsQueueRef.current = [];
    lastAcceptedTimeRef.current = 0;
    seenObservationSignaturesRef.current.clear();
    structuredDataRef.current = { lastUpdateTime: 0 };
  };

  return (
    <div className="row-start-1 col-start-1">
      <div className="h-full flex flex-col bg-bg-tertiary/30 border border-border-subtle">
        <div className="px-4 py-3 border-b border-border-subtle">
          <h3 className="text-sm tracking-widest text-text-muted uppercase m-0">Video Upload & Analysis</h3>
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
                crossOrigin="anonymous"
              />

              {/* Hand Tracking Canvas Overlay */}
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ objectFit: 'contain' }}
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

              {/* Hand Tracking Loading Indicator */}
              {isHandTrackingLoading && videoUrl && (
                <div className="absolute bottom-2 right-2 bg-black/50 px-2 py-1 rounded">
                  <span className="font-mono text-xs text-text-dim">Loading Hand Model...</span>
                </div>
              )}
            </div>

            {/* File info and controls */}
            <div className="p-4 border-t border-border-subtle flex items-center justify-between">
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
            className="h-full min-h-[400px] flex items-center justify-center cursor-pointer transition-all duration-300 bg-bg-tertiary/30 hover:bg-accent-rust/5"
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
            <p className="font-mono text-xs uppercase mb-1">Analysis Error</p>
            <p>{error}</p>
            <p className="text-text-muted text-xs mt-2">Make sure VITE_OVERSHOOT_API_KEY is set in your .env file.</p>
            {error.includes('Stream limit') && (
              <button
                onClick={() => {
                  setError(null);
                  // Wait a moment then retry
                  setTimeout(() => startAnalysis(), 2000);
                }}
                className="mt-3 px-4 py-2 bg-accent-teal text-white text-xs font-mono uppercase tracking-wider hover:bg-accent-teal/80 transition-colors"
              >
                Retry Analysis
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
