/**
 * useOvershootLive - Real-time AI analysis via Overshoot
 *
 * Analyzes webcam clips and returns technique observations.
 * Used alongside MediaPipe for AI-powered coaching during live practice.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { createOvershootVision, isOvershootConfigured } from '../services/overshoot';

export interface OvershootObservation {
  text: string;
  category: 'technique' | 'instrument' | 'safety' | 'efficiency' | 'general';
  timestamp: number;
  confidence: number;
  clipIndex: number;
}

export interface UseOvershootLiveOptions {
  enabled: boolean;
  onObservation: (observation: OvershootObservation) => void;
  onError?: (error: Error) => void;
}

export interface UseOvershootLiveReturn {
  analyzeClip: (file: File) => Promise<void>;
  isAnalyzing: boolean;
  isConfigured: boolean;
  error: string | null;
  lastObservation: OvershootObservation | null;
  observationCount: number;
  creditsExhausted: boolean;
}

// Live coaching prompt - requests actionable technique feedback
const LIVE_COACHING_PROMPT = `You are a surgical coach observing a live practice session. Analyze this short clip and provide ONE actionable observation about the trainee's technique.

OUTPUT FORMAT (JSON only, no markdown):
{
  "observation": "Single sentence with ACTION + TARGET + REASON",
  "category": "technique|instrument|safety|efficiency|general",
  "confidence": 0.0 to 1.0
}

OBSERVATION RULES:
- ONE observation only (the most important feedback)
- Must be actionable: what to change and why
- Focus on: hand position, grip, angle, steadiness, instrument handling, motion quality
- Be specific: "Lower wrist angle to 30 degrees for better control" not "Good technique"
- No generic praise without specific feedback
- If nothing notable, respond with: {"observation": "", "category": "general", "confidence": 0}

GOOD EXAMPLES:
- "Stabilize your wrist to reduce the tremor visible in your cutting motion"
- "Rotate the instrument 15 degrees clockwise for a cleaner approach angle"
- "Slow down the motion to maintain precision through the curve"

BAD EXAMPLES (avoid):
- "Good technique" (not actionable)
- "The hand is moving" (not helpful)
- "Continue practicing" (not specific)`;

// Parse Overshoot response into structured observation
function parseObservationResponse(
  text: string,
  clipIndex: number
): OvershootObservation | null {
  try {
    // Handle various response formats
    let jsonStr = text.trim();

    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    }

    // Try to find JSON object in response
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[OvershootLive] No JSON found in response:', text);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.observation || typeof parsed.observation !== 'string') {
      return null;
    }

    // Skip empty observations
    if (parsed.observation.trim() === '') {
      return null;
    }

    // Validate and normalize category
    const validCategories = ['technique', 'instrument', 'safety', 'efficiency', 'general'];
    const category = validCategories.includes(parsed.category)
      ? parsed.category
      : 'general';

    // Validate confidence
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;

    return {
      text: parsed.observation.trim(),
      category,
      timestamp: Date.now(),
      confidence,
      clipIndex,
    };
  } catch (err) {
    console.warn('[OvershootLive] Failed to parse response:', err, text);
    return null;
  }
}

export function useOvershootLive({
  enabled,
  onObservation,
  onError,
}: UseOvershootLiveOptions): UseOvershootLiveReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastObservation, setLastObservation] = useState<OvershootObservation | null>(null);
  const [observationCount, setObservationCount] = useState(0);
  const [creditsExhausted, setCreditsExhausted] = useState(false);

  const clipIndexRef = useRef(0);
  const onObservationRef = useRef(onObservation);
  const onErrorRef = useRef(onError);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep callback refs updated
  useEffect(() => {
    onObservationRef.current = onObservation;
    onErrorRef.current = onError;
  }, [onObservation, onError]);

  // Analyze a clip using Overshoot
  const analyzeClip = useCallback(async (file: File) => {
    // Skip if disabled, already analyzing, or credits exhausted
    if (!enabled || isAnalyzing || creditsExhausted) {
      return;
    }

    // Check configuration
    if (!isOvershootConfigured()) {
      console.log('[OvershootLive] Skipping - API key not configured');
      return;
    }

    const currentClipIndex = clipIndexRef.current++;
    setIsAnalyzing(true);
    setError(null);

    // Create abort controller for this analysis
    abortControllerRef.current = new AbortController();

    try {
      console.log(`[OvershootLive] Analyzing clip ${currentClipIndex} (${(file.size / 1024).toFixed(1)}KB)`);

      let resultReceived = false;

      const vision = createOvershootVision({
        prompt: LIVE_COACHING_PROMPT,
        file,
        processing: {
          clip_length_seconds: 2,
          delay_seconds: 0,
          fps: 10,
          sampling_ratio: 0.3,
        },
        onResult: (text: string) => {
          if (resultReceived) return; // Only process first result
          resultReceived = true;

          const observation = parseObservationResponse(text, currentClipIndex);
          if (observation) {
            console.log(`[OvershootLive] Observation: "${observation.text}" (${observation.category}, ${observation.confidence})`);
            setLastObservation(observation);
            setObservationCount((prev) => prev + 1);
            onObservationRef.current(observation);
          }
        },
        onError: (err: Error) => {
          console.error('[OvershootLive] API error:', err);

          // Check for credit exhaustion
          if (
            err.message.includes('402') ||
            err.message.includes('credits') ||
            err.message.includes('insufficient')
          ) {
            setCreditsExhausted(true);
            setError('Overshoot credits exhausted');
            onErrorRef.current?.(new Error('Overshoot credits exhausted. AI analysis disabled for this session.'));
          } else if (err.message.includes('401') || err.message.includes('unauthorized')) {
            setError('Invalid API key');
            onErrorRef.current?.(err);
          } else {
            setError(err.message);
            onErrorRef.current?.(err);
          }
        },
      });

      await vision.start();

      // Wait for analysis to complete (max 15 seconds for a short clip)
      await new Promise((resolve) => setTimeout(resolve, 10000));

      await vision.stop();

    } catch (err: any) {
      console.error('[OvershootLive] Analysis failed:', err);

      // Check for credit-related errors
      if (
        err.message?.includes('402') ||
        err.message?.includes('credits') ||
        err.message?.includes('insufficient')
      ) {
        setCreditsExhausted(true);
        setError('Overshoot credits exhausted');
      } else {
        setError(err.message || 'Analysis failed');
      }

      onErrorRef.current?.(err);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  }, [enabled, isAnalyzing, creditsExhausted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    analyzeClip,
    isAnalyzing,
    isConfigured: isOvershootConfigured(),
    error,
    lastObservation,
    observationCount,
    creditsExhausted,
  };
}

export default useOvershootLive;
