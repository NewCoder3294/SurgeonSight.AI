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
  category: 'technique' | 'instrument' | 'safety' | 'efficiency' | 'ergonomics' | 'timing' | 'general';
  timestamp: number;
  confidence: number;
  clipIndex: number;
  // Enhanced metadata
  metricType?: 'angle' | 'steadiness' | 'speed' | 'grip' | 'position' | 'coordination';
  correctionMagnitude?: 'minor' | 'moderate' | 'significant';
  hand?: 'left' | 'right' | 'both' | 'none';
  // Specific values when available
  currentAngle?: number;
  targetAngle?: number;
  tremorSeverity?: 'none' | 'mild' | 'moderate' | 'severe';
  currentGrip?: string;
  recommendedGrip?: string;
}

export type PromptType = 'default' | 'angles' | 'steadiness' | 'grip';

export interface UseOvershootLiveOptions {
  enabled: boolean;
  onObservation: (observation: OvershootObservation) => void;
  onError?: (error: Error) => void;
  promptType?: PromptType;  // Which analysis focus to use
  adaptivePrompts?: boolean; // Automatically rotate through prompt types
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

// Advanced surgical coaching prompt with specific metrics focus
const LIVE_COACHING_PROMPT = `You are an expert surgical coach with decades of experience observing and training surgeons. Analyze this practice clip and provide ONE highly specific, actionable observation.

OUTPUT FORMAT (JSON only, no markdown):
{
  "observation": "Precise ACTION + specific MEASUREMENT + clear REASON",
  "category": "technique|instrument|safety|efficiency|ergonomics|timing",
  "confidence": 0.0 to 1.0,
  "metric_type": "angle|steadiness|speed|grip|position|coordination",
  "correction_magnitude": "minor|moderate|significant",
  "hand": "left|right|both|none"
}

CRITICAL ANALYSIS PRIORITIES:

1. WRIST ANGLES (most important for precision):
   - Optimal scalpel angle: 30-45° from horizontal
   - Pronation/supination affects blade control
   - Wrist flexion impacts reach and visibility
   Example: "Right wrist: Pronate 15° to achieve optimal blade-tissue angle of 40°"

2. HAND STEADINESS (tremor & stability):
   - Detect micro-tremors (8-12Hz physiological)
   - Identify intention tremor during movements
   - Note postural instability
   Example: "Left hand: 4mm oscillation detected; anchor pinky on patient surface for stability"

3. GRIP TECHNIQUE:
   - Pencil grip: Index-thumb pinch, others relaxed
   - Power grip: Full hand engagement
   - Tripod: Thumb, index, middle engaged
   Example: "Switch to modified pencil grip; current power grip limits fine motor control"

4. MOTION QUALITY:
   - Speed: Too fast causes tissue trauma
   - Jerk: Smooth acceleration preferred
   - Path efficiency: Direct vs wandering
   Example: "Reduce approach speed by 40%; current 8cm/s exceeds safe 5cm/s for this depth"

5. BIMANUAL COORDINATION:
   - Independent hand control
   - Support hand positioning
   - Counter-tension technique
   Example: "Left hand mirrors right unnecessarily; hold left stationary for counter-tension"

6. ERGONOMICS:
   - Elbow position (avoid fatigue)
   - Forearm rotation range
   - Grip pressure
   Example: "Excessive grip pressure causing tremor; reduce force by ~30%"

RESPONSE RULES:
- ONE observation only (most critical issue)
- Include specific numbers/degrees when possible
- Reference which hand explicitly
- Explain the surgical rationale briefly
- Empty observation if technique is ideal

FORBIDDEN:
- Generic praise ("Good job", "Nice work")
- Vague corrections ("Be more careful", "Improve steadiness")
- Multiple observations in one response`;

// Prompt variants for different analysis contexts
export const COACHING_PROMPTS = {
  default: LIVE_COACHING_PROMPT,

  // Focus on angles and positioning
  angles: `You are analyzing hand angles in a surgical practice session. Focus ONLY on wrist angles, pronation/supination, and blade orientation.

OUTPUT FORMAT (JSON only):
{
  "observation": "Specific angle correction with target value",
  "category": "technique",
  "confidence": 0.0 to 1.0,
  "current_angle": number or null,
  "target_angle": number or null,
  "hand": "left|right|both"
}

ANALYSIS:
- Measure wrist angle relative to horizontal
- Note pronation (palm down) vs supination (palm up)
- Assess blade-to-tissue approach angle
- Identify any awkward wrist positions

Example: "Right wrist at 65° - reduce to 40-45° range for optimal blade control"`,

  // Focus on steadiness and tremor
  steadiness: `You are analyzing hand stability in a surgical practice session. Focus ONLY on tremor, steadiness, and motion quality.

OUTPUT FORMAT (JSON only):
{
  "observation": "Specific steadiness feedback with improvement technique",
  "category": "technique",
  "confidence": 0.0 to 1.0,
  "tremor_severity": "none|mild|moderate|severe",
  "tremor_type": "physiological|intention|postural|unknown",
  "hand": "left|right|both"
}

ANALYSIS:
- Detect visible oscillations or jitter
- Assess motion smoothness during movements
- Note any sudden jerks or corrections
- Identify causes (fatigue, grip, position)

Example: "Moderate 8Hz tremor in right hand - anchor wrist on surface, reduce grip pressure"`,

  // Focus on grip technique
  grip: `You are analyzing instrument grip in a surgical practice session. Focus ONLY on grip type, finger positioning, and hand mechanics.

OUTPUT FORMAT (JSON only):
{
  "observation": "Specific grip correction with proper technique",
  "category": "technique",
  "confidence": 0.0 to 1.0,
  "current_grip": "pencil|tripod|power|palm|unknown",
  "recommended_grip": "pencil|tripod|power",
  "hand": "left|right|both"
}

ANALYSIS:
- Identify current grip pattern
- Assess thumb-index-middle positioning
- Note ring/pinky finger placement
- Evaluate grip pressure indicators

Example: "Palming the scalpel with right hand - transition to pencil grip with ring/pinky anchored"`
};

// Parse Overshoot response into structured observation with enhanced metadata
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
      // Fallback: treat entire text as observation if it's not empty
      if (text.trim().length > 10 && !text.includes('{')) {
        return {
          text: text.trim(),
          category: 'general',
          timestamp: Date.now(),
          confidence: 0.4,
          clipIndex,
        };
      }
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.observation || typeof parsed.observation !== 'string') {
      return null;
    }

    // Skip empty observations
    if (parsed.observation.trim() === '' || parsed.observation.trim().toLowerCase() === 'none') {
      return null;
    }

    // Validate and normalize category
    const validCategories = ['technique', 'instrument', 'safety', 'efficiency', 'ergonomics', 'timing', 'general'];
    const category = validCategories.includes(parsed.category)
      ? parsed.category
      : 'general';

    // Validate confidence
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;

    // Extract enhanced metadata
    const metricTypes = ['angle', 'steadiness', 'speed', 'grip', 'position', 'coordination'];
    const metricType = metricTypes.includes(parsed.metric_type) ? parsed.metric_type : undefined;

    const magnitudes = ['minor', 'moderate', 'significant'];
    const correctionMagnitude = magnitudes.includes(parsed.correction_magnitude)
      ? parsed.correction_magnitude
      : undefined;

    const hands = ['left', 'right', 'both', 'none'];
    const hand = hands.includes(parsed.hand) ? parsed.hand : undefined;

    // Build observation object
    const observation: OvershootObservation = {
      text: parsed.observation.trim(),
      category,
      timestamp: Date.now(),
      confidence,
      clipIndex,
      metricType,
      correctionMagnitude,
      hand,
    };

    // Extract angle values if present
    if (typeof parsed.current_angle === 'number') {
      observation.currentAngle = parsed.current_angle;
    }
    if (typeof parsed.target_angle === 'number') {
      observation.targetAngle = parsed.target_angle;
    }

    // Extract tremor info if present
    const tremorLevels = ['none', 'mild', 'moderate', 'severe'];
    if (tremorLevels.includes(parsed.tremor_severity)) {
      observation.tremorSeverity = parsed.tremor_severity;
    }

    // Extract grip info if present
    if (parsed.current_grip) {
      observation.currentGrip = parsed.current_grip;
    }
    if (parsed.recommended_grip) {
      observation.recommendedGrip = parsed.recommended_grip;
    }

    console.log('[OvershootLive] Parsed observation:', {
      text: observation.text.substring(0, 50) + '...',
      category: observation.category,
      metricType: observation.metricType,
      hand: observation.hand,
      confidence: observation.confidence,
    });

    return observation;
  } catch (err) {
    console.warn('[OvershootLive] Failed to parse response:', err, text);

    // Attempt graceful fallback for plain text responses
    if (text.length > 10 && text.length < 500) {
      return {
        text: text.trim(),
        category: 'general',
        timestamp: Date.now(),
        confidence: 0.3,
        clipIndex,
      };
    }

    return null;
  }
}

export function useOvershootLive({
  enabled,
  onObservation,
  onError,
  promptType = 'default',
  adaptivePrompts = false,
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

  // For adaptive prompts, rotate through types
  const _promptRotationRef = useRef<PromptType[]>(['default', 'angles', 'steadiness', 'grip']);
  const currentPromptIndexRef = useRef(0);

  // Get current prompt based on settings
  const getCurrentPrompt = useCallback(() => {
    if (adaptivePrompts) {
      const prompts: PromptType[] = ['default', 'angles', 'steadiness', 'grip'];
      const idx = currentPromptIndexRef.current % prompts.length;
      currentPromptIndexRef.current++;
      const selectedType = prompts[idx];
      return COACHING_PROMPTS[selectedType] || COACHING_PROMPTS.default;
    }
    return COACHING_PROMPTS[promptType] || COACHING_PROMPTS.default;
  }, [adaptivePrompts, promptType]);

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

      const currentPrompt = getCurrentPrompt();
      console.log(`[OvershootLive] Using prompt type: ${adaptivePrompts ? 'adaptive' : promptType}`);

      // Use SDK-recommended default parameters to avoid validation errors
      // The API requires: clip_length_seconds >= delay_seconds, fps 1-120, sampling_ratio 0-1
      const vision = createOvershootVision({
        prompt: currentPrompt,
        file,
        processing: {
          clip_length_seconds: 4,
          delay_seconds: 2,
          fps: 15, // Keep FPS reasonable
        },
        onResult: (text: string) => {
          if (resultReceived) return;
          resultReceived = true;

          const observation = parseObservationResponse(text, currentClipIndex);
          if (observation) {
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

      // Wait for analysis to complete
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
