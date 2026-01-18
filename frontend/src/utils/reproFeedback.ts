/**
 * Reproduction Feedback - Generate feedback from motion metrics
 * 
 * Fast loop: Emit ONE feedback update per second max, with strong deduplication.
 * Feedback based on motion metrics thresholds.
 */

export type FeedbackStatus = 'ON_TRACK' | 'WARNING' | 'CRITICAL';

export interface Feedback {
  status: FeedbackStatus;
  text: string; // <= 12 words
  timestamp: number;
}

// Feedback templates by status
const FEEDBACK_TEMPLATES: Record<FeedbackStatus, string[]> = {
  ON_TRACK: [
    'Motion looks steady and controlled.',
    'Good movement control detected.',
    'Stable motion pattern maintained.',
    'Movement quality is consistent.',
  ],
  WARNING: [
    'Motion is slightly jittery, try to stabilize.',
    'Movement detected but could be smoother.',
    'Reduce hand tremor for better control.',
    'Slight instability detected, focus on steadiness.',
  ],
  CRITICAL: [
    'Motion too still, begin movement exercise.',
    'No significant movement detected, start practicing.',
    'Movement appears frozen, resume activity.',
    'Motion level very low, initiate practice sequence.',
  ],
};

/**
 * Generate feedback from motion metrics with deduplication
 */
export class FeedbackGenerator {
  private lastFeedback: Feedback | null = null;
  private lastEmitTime: number = 0;
  private minIntervalMs: number = 1000; // Emit at most once per second
  private seenTexts: Set<string> = new Set();
  private maxSeenSize: number = 10; // Keep last 10 feedback texts for dedupe

  /**
   * Generate feedback from current metrics
   * Returns null if:
   * - Not enough time has passed since last emit
   * - Generated feedback is duplicate
   */
  generate(metrics: {
    motionMean: number;
    motionMax: number;
    jitter: number;
    presenceProxy: number;
  }): Feedback | null {
    const now = Date.now();

    // Throttle: emit at most once per second
    if (now - this.lastEmitTime < this.minIntervalMs) {
      return null;
    }

    // Determine status from metrics
    let status: FeedbackStatus;
    if (metrics.motionMean < 10) {
      status = 'CRITICAL'; // Too still
    } else if (metrics.motionMean > 50 || metrics.jitter > 30) {
      status = 'WARNING'; // Too jittery
    } else {
      status = 'ON_TRACK'; // Good motion
    }

    // Select random template for this status
    const templates = FEEDBACK_TEMPLATES[status];
    const text = templates[Math.floor(Math.random() * templates.length)];

    // Normalize for deduplication (lowercase, remove punctuation)
    const normalized = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Skip if exact duplicate
    if (this.seenTexts.has(normalized)) {
      return null;
    }

    // Skip if same status and very similar text (near-duplicate)
    if (this.lastFeedback && this.lastFeedback.status === status) {
      const lastNormalized = this.lastFeedback.text
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // If same status and very similar wording, skip
      if (normalized === lastNormalized || 
          (normalized.split(' ').length <= 12 && lastNormalized.split(' ').length <= 12 &&
           normalized.includes(lastNormalized.substring(0, 20)) || 
           lastNormalized.includes(normalized.substring(0, 20)))) {
        return null;
      }
    }

    // Track seen texts (keep rolling window)
    this.seenTexts.add(normalized);
    if (this.seenTexts.size > this.maxSeenSize) {
      const first = Array.from(this.seenTexts)[0];
      this.seenTexts.delete(first);
    }

    const feedback: Feedback = {
      status,
      text,
      timestamp: now,
    };

    this.lastFeedback = feedback;
    this.lastEmitTime = now;

    return feedback;
  }

  /**
   * Reset generator state
   */
  reset(): void {
    this.lastFeedback = null;
    this.lastEmitTime = 0;
    this.seenTexts.clear();
  }
}
