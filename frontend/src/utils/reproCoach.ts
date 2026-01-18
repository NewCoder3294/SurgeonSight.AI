/**
 * Reproduction Coach - Slow Loop Coaching Summary
 * 
 * Every 5-8 seconds, summarize metrics window into coaching paragraph.
 * Currently mocked; will integrate Gemini API later.
 */

export interface CoachSummary {
  text: string; // 2-3 sentences
  timestamp: number;
}

export interface MetricsSummary {
  time_range: { start: number; end: number };
  fps: number;
  motion_mean: number;
  motion_max: number;
  jitter: number;
  presence_proxy: number;
  status_counts: { on_track: number; warning: number; critical: number };
}

/**
 * TODO: Replace this mock with Gemini API integration
 * 
 * Future implementation:
 * 1. Send metrics summary to Gemini API endpoint
 * 2. Prompt: "Generate 2-3 sentence coaching feedback for surgical training based on these motion metrics: {metrics}"
 * 3. Return structured coaching paragraph
 * 
 * Example Gemini integration:
 * ```typescript
 * async function generateCoachSummary(metrics: MetricsSummary): Promise<CoachSummary> {
 *   const response = await fetch('/api/coach/summary', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(metrics),
 *   });
 *   const data = await response.json();
 *   return { text: data.summary, timestamp: Date.now() };
 * }
 * ```
 */
export async function generateCoachSummary(metrics: MetricsSummary): Promise<CoachSummary> {
  // Mock implementation - simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  // Generate mock coaching based on metrics
  const { motion_mean, motion_max, jitter, status_counts } = metrics;
  
  const onTrackPct = status_counts.on_track / (status_counts.on_track + status_counts.warning + status_counts.critical) * 100;
  
  let text = '';
  
  if (onTrackPct > 60) {
    text = 'Your motion control has been consistently good over the past interval. Movement patterns show stable execution with minimal jitter. Continue maintaining this steady approach to build muscle memory.';
  } else if (onTrackPct > 30) {
    text = 'Motion analysis shows mixed performance with periods of stability and some instability. Focus on smoothing transitions between movements. Practice controlled, deliberate motions to reduce variability.';
  } else {
    text = 'The current interval shows high motion variability or limited activity. Increase movement range and focus on controlled, steady practice. Building consistent motion patterns is key to surgical skill development.';
  }

  return {
    text,
    timestamp: Date.now(),
  };
}
