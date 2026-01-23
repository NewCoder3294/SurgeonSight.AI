/**
 * Advanced Tremor Analysis System
 * 
 * Sophisticated tremor detection for surgical training:
 * - Frequency analysis (FFT-based)
 * - Amplitude measurement
 * - Tremor classification (physiological, intention, etc.)
 * - Jerk analysis for smoothness
 */

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

export interface TremorSample {
  timestamp: number;
  x: number;
  y: number;
  z: number;
}

export interface TremorAnalysis {
  // Overall tremor severity (0-100, 0 = perfectly still)
  severity: number;
  
  // Tremor frequency in Hz (typical hand tremor: 8-12 Hz)
  dominantFrequency: number;
  
  // Tremor amplitude in normalized units
  amplitude: number;
  
  // Classification
  type: 'none' | 'physiological' | 'intention' | 'postural' | 'unknown';
  
  // Confidence in classification (0-1)
  confidence: number;
  
  // Smoothness score (0-100, 100 = perfectly smooth motion)
  smoothness: number;
  
  // Jerk metric (rate of acceleration change, lower = smoother)
  jerk: number;
  
  // Steadiness when at rest (0-100)
  restingSteadiness: number;
  
  // Steadiness during motion (0-100)
  motionSteadiness: number;
}

export interface TremorAnalyzerConfig {
  sampleRate: number;      // Expected samples per second (e.g., 60 for 60fps)
  windowSize: number;      // Number of samples for analysis window
  historySize: number;     // Total history to maintain
  sensitivityScale: number; // Multiply tremor values (higher = more sensitive)
}

const DEFAULT_CONFIG: TremorAnalyzerConfig = {
  sampleRate: 60,
  windowSize: 128,  // ~2 seconds at 60fps
  historySize: 256, // ~4 seconds at 60fps
  sensitivityScale: 1.0,
};

/**
 * Simple FFT implementation for frequency analysis
 */
function fft(signal: number[]): { frequency: number; magnitude: number }[] {
  const n = signal.length;
  
  // Pad to power of 2 if necessary
  const paddedLength = Math.pow(2, Math.ceil(Math.log2(n)));
  const paddedSignal = [...signal];
  while (paddedSignal.length < paddedLength) {
    paddedSignal.push(0);
  }
  
  // Simple DFT (not optimized FFT, but sufficient for small windows)
  const results: { frequency: number; magnitude: number }[] = [];
  
  for (let k = 0; k < paddedLength / 2; k++) {
    let realSum = 0;
    let imagSum = 0;
    
    for (let n = 0; n < paddedLength; n++) {
      const angle = (2 * Math.PI * k * n) / paddedLength;
      realSum += paddedSignal[n] * Math.cos(angle);
      imagSum -= paddedSignal[n] * Math.sin(angle);
    }
    
    const magnitude = Math.sqrt(realSum * realSum + imagSum * imagSum) / paddedLength;
    const frequency = k * (DEFAULT_CONFIG.sampleRate / paddedLength);
    
    results.push({ frequency, magnitude });
  }
  
  return results;
}

/**
 * Apply Hanning window to reduce spectral leakage
 */
function applyHanningWindow(signal: number[]): number[] {
  const n = signal.length;
  return signal.map((val, i) => {
    const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    return val * window;
  });
}

/**
 * Calculate derivative (velocity) from position samples
 */
function calculateVelocity(samples: TremorSample[]): TremorSample[] {
  const velocities: TremorSample[] = [];
  
  for (let i = 1; i < samples.length; i++) {
    const dt = Math.max(1, samples[i].timestamp - samples[i - 1].timestamp) / 1000;
    velocities.push({
      timestamp: samples[i].timestamp,
      x: (samples[i].x - samples[i - 1].x) / dt,
      y: (samples[i].y - samples[i - 1].y) / dt,
      z: (samples[i].z - samples[i - 1].z) / dt,
    });
  }
  
  return velocities;
}

/**
 * Calculate acceleration from velocity samples
 */
function calculateAcceleration(velocities: TremorSample[]): TremorSample[] {
  const accelerations: TremorSample[] = [];
  
  for (let i = 1; i < velocities.length; i++) {
    const dt = Math.max(1, velocities[i].timestamp - velocities[i - 1].timestamp) / 1000;
    accelerations.push({
      timestamp: velocities[i].timestamp,
      x: (velocities[i].x - velocities[i - 1].x) / dt,
      y: (velocities[i].y - velocities[i - 1].y) / dt,
      z: (velocities[i].z - velocities[i - 1].z) / dt,
    });
  }
  
  return accelerations;
}

/**
 * Calculate jerk from acceleration samples
 */
function calculateJerk(accelerations: TremorSample[]): TremorSample[] {
  const jerks: TremorSample[] = [];
  
  for (let i = 1; i < accelerations.length; i++) {
    const dt = Math.max(1, accelerations[i].timestamp - accelerations[i - 1].timestamp) / 1000;
    jerks.push({
      timestamp: accelerations[i].timestamp,
      x: (accelerations[i].x - accelerations[i - 1].x) / dt,
      y: (accelerations[i].y - accelerations[i - 1].y) / dt,
      z: (accelerations[i].z - accelerations[i - 1].z) / dt,
    });
  }
  
  return jerks;
}

/**
 * Calculate smoothness metric from jerk
 * Based on the dimensionless jerk metric used in motor control research
 */
function calculateSmoothness(jerks: TremorSample[], duration: number): number {
  if (jerks.length === 0 || duration === 0) return 100;
  
  // Sum of squared jerk magnitude
  let jerkSquaredSum = 0;
  for (const jerk of jerks) {
    const magnitude = Math.sqrt(jerk.x * jerk.x + jerk.y * jerk.y + jerk.z * jerk.z);
    jerkSquaredSum += magnitude * magnitude;
  }
  
  // Normalize by duration
  const normalizedJerk = jerkSquaredSum / jerks.length;
  
  // Convert to smoothness score (0-100)
  // Lower jerk = higher smoothness
  const smoothness = Math.max(0, 100 - normalizedJerk * 10000);
  
  return smoothness;
}

/**
 * Detect if hand is relatively at rest (minimal intentional movement)
 */
function detectRestingState(velocities: TremorSample[]): boolean {
  if (velocities.length < 10) return false;
  
  // Calculate average velocity magnitude
  let totalVelocity = 0;
  for (const v of velocities) {
    totalVelocity += Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }
  const avgVelocity = totalVelocity / velocities.length;
  
  // If average velocity is below threshold, consider at rest
  return avgVelocity < 0.5; // Threshold in normalized units/second
}

/**
 * Classify tremor type based on frequency and context
 */
function classifyTremor(
  frequency: number,
  amplitude: number,
  isResting: boolean
): { type: TremorAnalysis['type']; confidence: number } {
  if (amplitude < 0.002) {
    return { type: 'none', confidence: 0.9 };
  }
  
  // Physiological tremor: 8-12 Hz, low amplitude
  if (frequency >= 8 && frequency <= 12 && amplitude < 0.01) {
    return { type: 'physiological', confidence: 0.8 };
  }
  
  // Intention tremor: 3-5 Hz, appears during movement
  if (!isResting && frequency >= 3 && frequency <= 5) {
    return { type: 'intention', confidence: 0.7 };
  }
  
  // Postural tremor: 4-8 Hz, appears when holding position
  if (isResting && frequency >= 4 && frequency <= 8) {
    return { type: 'postural', confidence: 0.7 };
  }
  
  return { type: 'unknown', confidence: 0.5 };
}

/**
 * TremorAnalyzer class for continuous tremor monitoring
 */
export class TremorAnalyzer {
  private config: TremorAnalyzerConfig;
  private sampleHistory: TremorSample[] = [];
  private lastAnalysis: TremorAnalysis | null = null;
  private analysisInterval: number = 200; // ms between full analyses
  private lastAnalysisTime: number = 0;

  constructor(config: Partial<TremorAnalyzerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a new position sample
   */
  addSample(landmark: HandLandmark, timestamp: number = Date.now()): void {
    this.sampleHistory.push({
      timestamp,
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
    });

    // Trim history to configured size
    while (this.sampleHistory.length > this.config.historySize) {
      this.sampleHistory.shift();
    }
  }

  /**
   * Perform tremor analysis on current history
   */
  analyze(): TremorAnalysis {
    const now = Date.now();
    
    // Return cached result if within interval
    if (this.lastAnalysis && now - this.lastAnalysisTime < this.analysisInterval) {
      return this.lastAnalysis;
    }

    if (this.sampleHistory.length < this.config.windowSize) {
      // Not enough data
      return {
        severity: 0,
        dominantFrequency: 0,
        amplitude: 0,
        type: 'none',
        confidence: 0,
        smoothness: 100,
        jerk: 0,
        restingSteadiness: 100,
        motionSteadiness: 100,
      };
    }

    // Get analysis window
    const window = this.sampleHistory.slice(-this.config.windowSize);
    
    // Calculate derivatives
    const velocities = calculateVelocity(window);
    const accelerations = calculateAcceleration(velocities);
    const jerks = calculateJerk(accelerations);
    
    // Detect if at rest
    const isResting = detectRestingState(velocities);
    
    // Extract position signals for FFT
    const xSignal = window.map(s => s.x);
    const ySignal = window.map(s => s.y);
    
    // Apply windowing and detrend (remove DC component)
    const xMean = xSignal.reduce((a, b) => a + b, 0) / xSignal.length;
    const yMean = ySignal.reduce((a, b) => a + b, 0) / ySignal.length;
    const xDetrended = applyHanningWindow(xSignal.map(x => x - xMean));
    const yDetrended = applyHanningWindow(ySignal.map(y => y - yMean));
    
    // Perform FFT
    const xSpectrum = fft(xDetrended);
    const ySpectrum = fft(yDetrended);
    
    // Find dominant frequency in tremor range (3-20 Hz)
    let maxMagnitude = 0;
    let dominantFrequency = 0;
    let totalAmplitude = 0;
    
    for (let i = 0; i < xSpectrum.length; i++) {
      const freq = xSpectrum[i].frequency;
      if (freq >= 3 && freq <= 20) {
        const combinedMagnitude = xSpectrum[i].magnitude + ySpectrum[i].magnitude;
        totalAmplitude += combinedMagnitude;
        
        if (combinedMagnitude > maxMagnitude) {
          maxMagnitude = combinedMagnitude;
          dominantFrequency = freq;
        }
      }
    }
    
    // Calculate amplitude
    const amplitude = maxMagnitude * this.config.sensitivityScale;
    
    // Calculate smoothness
    const duration = (window[window.length - 1].timestamp - window[0].timestamp) / 1000;
    const smoothness = calculateSmoothness(jerks, duration);
    
    // Calculate jerk metric (average jerk magnitude)
    let avgJerk = 0;
    if (jerks.length > 0) {
      for (const j of jerks) {
        avgJerk += Math.sqrt(j.x * j.x + j.y * j.y + j.z * j.z);
      }
      avgJerk /= jerks.length;
    }
    
    // Calculate steadiness scores
    let positionVariance = 0;
    for (const sample of window) {
      const dx = sample.x - (window[0].x + window[window.length - 1].x) / 2;
      const dy = sample.y - (window[0].y + window[window.length - 1].y) / 2;
      positionVariance += dx * dx + dy * dy;
    }
    positionVariance /= window.length;
    
    const restingSteadiness = isResting 
      ? Math.max(0, 100 - positionVariance * 50000)
      : 50;
    
    const motionSteadiness = !isResting
      ? Math.max(0, 100 - avgJerk * 1000)
      : 50;
    
    // Classify tremor
    const classification = classifyTremor(dominantFrequency, amplitude, isResting);
    
    // Calculate overall severity (0-100)
    const severity = Math.min(100, amplitude * 5000 + (100 - smoothness) / 2);
    
    const analysis: TremorAnalysis = {
      severity: Math.max(0, Math.min(100, severity)),
      dominantFrequency,
      amplitude,
      type: classification.type,
      confidence: classification.confidence,
      smoothness: Math.max(0, Math.min(100, smoothness)),
      jerk: avgJerk,
      restingSteadiness: Math.max(0, Math.min(100, restingSteadiness)),
      motionSteadiness: Math.max(0, Math.min(100, motionSteadiness)),
    };
    
    this.lastAnalysis = analysis;
    this.lastAnalysisTime = now;
    
    return analysis;
  }

  /**
   * Get a quick steadiness score without full analysis
   * Useful for high-frequency updates
   */
  getQuickSteadiness(): number {
    if (this.sampleHistory.length < 10) return 70;
    
    const recent = this.sampleHistory.slice(-10);
    
    // Calculate variance
    let variance = 0;
    const midX = (recent[0].x + recent[recent.length - 1].x) / 2;
    const midY = (recent[0].y + recent[recent.length - 1].y) / 2;
    
    for (const sample of recent) {
      variance += (sample.x - midX) ** 2 + (sample.y - midY) ** 2;
    }
    variance /= recent.length;
    
    return Math.max(0, Math.min(100, 100 - variance * 50000));
  }

  /**
   * Reset the analyzer
   */
  reset(): void {
    this.sampleHistory = [];
    this.lastAnalysis = null;
    this.lastAnalysisTime = 0;
  }

  /**
   * Get current sample count
   */
  getSampleCount(): number {
    return this.sampleHistory.length;
  }
}

/**
 * Create a set of tremor analyzers for multiple landmarks
 */
export function createMultiLandmarkAnalyzer(
  landmarkIndices: number[],
  config?: Partial<TremorAnalyzerConfig>
): Map<number, TremorAnalyzer> {
  const analyzers = new Map<number, TremorAnalyzer>();
  
  for (const idx of landmarkIndices) {
    analyzers.set(idx, new TremorAnalyzer(config));
  }
  
  return analyzers;
}

/**
 * Aggregate tremor analysis from multiple landmarks
 */
export function aggregateTremorAnalyses(analyses: TremorAnalysis[]): TremorAnalysis {
  if (analyses.length === 0) {
    return {
      severity: 0,
      dominantFrequency: 0,
      amplitude: 0,
      type: 'none',
      confidence: 0,
      smoothness: 100,
      jerk: 0,
      restingSteadiness: 100,
      motionSteadiness: 100,
    };
  }
  
  // Weighted average based on confidence
  let totalWeight = 0;
  let weightedSeverity = 0;
  let weightedFrequency = 0;
  let weightedAmplitude = 0;
  let weightedSmoothness = 0;
  let weightedJerk = 0;
  let weightedRestingSteadiness = 0;
  let weightedMotionSteadiness = 0;
  
  for (const analysis of analyses) {
    const weight = analysis.confidence || 0.1;
    totalWeight += weight;
    weightedSeverity += analysis.severity * weight;
    weightedFrequency += analysis.dominantFrequency * weight;
    weightedAmplitude += analysis.amplitude * weight;
    weightedSmoothness += analysis.smoothness * weight;
    weightedJerk += analysis.jerk * weight;
    weightedRestingSteadiness += analysis.restingSteadiness * weight;
    weightedMotionSteadiness += analysis.motionSteadiness * weight;
  }
  
  // Find most common type
  const typeCounts: Record<string, number> = {};
  for (const analysis of analyses) {
    typeCounts[analysis.type] = (typeCounts[analysis.type] || 0) + 1;
  }
  let dominantType: TremorAnalysis['type'] = 'none';
  let maxCount = 0;
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantType = type as TremorAnalysis['type'];
    }
  }
  
  return {
    severity: weightedSeverity / totalWeight,
    dominantFrequency: weightedFrequency / totalWeight,
    amplitude: weightedAmplitude / totalWeight,
    type: dominantType,
    confidence: totalWeight / analyses.length,
    smoothness: weightedSmoothness / totalWeight,
    jerk: weightedJerk / totalWeight,
    restingSteadiness: weightedRestingSteadiness / totalWeight,
    motionSteadiness: weightedMotionSteadiness / totalWeight,
  };
}
