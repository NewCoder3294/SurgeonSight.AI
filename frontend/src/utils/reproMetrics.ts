/**
 * Reproduction Metrics - Frame Differencing for Motion Analysis
 * 
 * Fast loop: Compute simple motion metrics from camera frames without heavy ML.
 * Uses frame differencing (grayscale, downscaled) to detect motion.
 */

export interface MotionMetrics {
  time: number;
  fps: number;
  motionMean: number;
  motionMax: number;
  jitter: number;
  presenceProxy: number; // 0-1, proxy for subject presence (motion indicates presence)
}

export interface MetricsWindow {
  metrics: MotionMetrics[];
  maxSize: number; // Rolling window size (~5 seconds at ~30fps = ~150 frames)
}

/**
 * Compute motion metrics from two grayscale frames using frame differencing
 */
export function computeFrameDifference(
  prevFrame: ImageData,
  currentFrame: ImageData,
  width: number,
  height: number
): { mean: number; max: number; jitter: number } {
  if (prevFrame.data.length !== currentFrame.data.length) {
    return { mean: 0, max: 0, jitter: 0 };
  }

  const pixelCount = width * height;
  let sumDiff = 0;
  let maxDiff = 0;
  const diffs: number[] = [];

  // Compare grayscale pixels (frame differencing)
  for (let i = 0; i < prevFrame.data.length; i += 4) {
    // Grayscale: average of RGB channels
    const prevGray = (prevFrame.data[i] + prevFrame.data[i + 1] + prevFrame.data[i + 2]) / 3;
    const currGray = (currentFrame.data[i] + currentFrame.data[i + 1] + currentFrame.data[i + 2]) / 3;
    
    const diff = Math.abs(currGray - prevGray);
    sumDiff += diff;
    maxDiff = Math.max(maxDiff, diff);
    diffs.push(diff);
  }

  const mean = sumDiff / pixelCount;

  // Compute jitter (standard deviation of differences)
  const variance = diffs.reduce((acc, diff) => acc + Math.pow(diff - mean, 2), 0) / pixelCount;
  const jitter = Math.sqrt(variance);

  return { mean, max: maxDiff, jitter };
}

/**
 * Create a metrics window for rolling window analysis
 */
export function createMetricsWindow(windowSizeSeconds: number = 5, targetFps: number = 30): MetricsWindow {
  return {
    metrics: [],
    maxSize: Math.floor(windowSizeSeconds * targetFps),
  };
}

/**
 * Add a metric to the window (maintains rolling window size)
 */
export function addMetric(window: MetricsWindow, metric: MotionMetrics): void {
  window.metrics.push(metric);
  
  // Keep only last N metrics (rolling window)
  if (window.metrics.length > window.maxSize) {
    window.metrics.shift();
  }
}

/**
 * Get recent metrics from window (last N seconds)
 */
export function getRecentMetrics(window: MetricsWindow, seconds: number = 5): MotionMetrics[] {
  if (window.metrics.length === 0) return [];
  
  const cutoffTime = window.metrics[window.metrics.length - 1].time - (seconds * 1000);
  return window.metrics.filter(m => m.time >= cutoffTime);
}

/**
 * Compute summary statistics from a metrics window
 */
export function computeSummary(window: MetricsWindow): {
  time_range: { start: number; end: number };
  fps: number;
  motion_mean: number;
  motion_max: number;
  jitter: number;
  presence_proxy: number;
  status_counts: { on_track: number; warning: number; critical: number };
} | null {
  if (window.metrics.length === 0) return null;

  const recent = getRecentMetrics(window, 5);
  if (recent.length === 0) return null;

  // Compute averages
  const motionMeans = recent.map(m => m.motionMean);
  const motionMaxs = recent.map(m => m.motionMax);
  const jitters = recent.map(m => m.jitter);
  const fpses = recent.map(m => m.fps);

  const motion_mean = motionMeans.reduce((a, b) => a + b, 0) / motionMeans.length;
  const motion_max = Math.max(...motionMaxs);
  const jitter = jitters.reduce((a, b) => a + b, 0) / jitters.length;
  const fps = fpses.reduce((a, b) => a + b, 0) / fpses.length;

  // Presence proxy: motion > threshold indicates presence
  const presence_proxy = motion_mean > 5 ? Math.min(1, motion_mean / 50) : 0;

  // Status counts (based on motion thresholds)
  let on_track = 0;
  let warning = 0;
  let critical = 0;
  
  for (const metric of recent) {
    if (metric.motionMean < 10) {
      critical++; // Too still (no movement)
    } else if (metric.motionMean > 50) {
      warning++; // Too much motion (jittery)
    } else {
      on_track++;
    }
  }

  return {
    time_range: {
      start: recent[0].time,
      end: recent[recent.length - 1].time,
    },
    fps,
    motion_mean,
    motion_max,
    jitter,
    presence_proxy,
    status_counts: { on_track, warning, critical },
  };
}
