/**
 * Kalman Filter Implementation for Hand Tracking
 * 
 * Provides smooth, predictive filtering for noisy hand landmark data.
 * Much more stable than simple EMA for surgical tracking applications.
 */

export interface KalmanState {
  x: number;  // State estimate
  P: number;  // Estimate covariance
  Q: number;  // Process noise covariance
  R: number;  // Measurement noise covariance
  K: number;  // Kalman gain (stored for debugging)
}

/**
 * 1D Kalman Filter for scalar values (angles, positions, etc.)
 */
export class KalmanFilter1D {
  private state: KalmanState;

  constructor(
    initialValue: number = 0,
    processNoise: number = 0.01,
    measurementNoise: number = 0.1
  ) {
    this.state = {
      x: initialValue,
      P: 1,
      Q: processNoise,
      R: measurementNoise,
      K: 0,
    };
  }

  /**
   * Update the filter with a new measurement
   * @returns Filtered (smoothed) value
   */
  update(measurement: number): number {
    // Prediction step
    const xPrior = this.state.x;
    const PPrior = this.state.P + this.state.Q;

    // Update step
    this.state.K = PPrior / (PPrior + this.state.R);
    this.state.x = xPrior + this.state.K * (measurement - xPrior);
    this.state.P = (1 - this.state.K) * PPrior;

    return this.state.x;
  }

  /**
   * Get current state estimate without new measurement
   */
  getValue(): number {
    return this.state.x;
  }

  /**
   * Reset filter to a specific value
   */
  reset(value: number): void {
    this.state.x = value;
    this.state.P = 1;
    this.state.K = 0;
  }

  /**
   * Adjust noise parameters dynamically (useful for adaptive filtering)
   */
  setNoiseParameters(processNoise?: number, measurementNoise?: number): void {
    if (processNoise !== undefined) this.state.Q = processNoise;
    if (measurementNoise !== undefined) this.state.R = measurementNoise;
  }
}

/**
 * 3D Kalman Filter for landmark positions
 */
export class KalmanFilter3D {
  private xFilter: KalmanFilter1D;
  private yFilter: KalmanFilter1D;
  private zFilter: KalmanFilter1D;

  constructor(
    initialX: number = 0,
    initialY: number = 0,
    initialZ: number = 0,
    processNoise: number = 0.005,
    measurementNoise: number = 0.05
  ) {
    this.xFilter = new KalmanFilter1D(initialX, processNoise, measurementNoise);
    this.yFilter = new KalmanFilter1D(initialY, processNoise, measurementNoise);
    this.zFilter = new KalmanFilter1D(initialZ, processNoise, measurementNoise);
  }

  update(x: number, y: number, z: number): { x: number; y: number; z: number } {
    return {
      x: this.xFilter.update(x),
      y: this.yFilter.update(y),
      z: this.zFilter.update(z),
    };
  }

  getValue(): { x: number; y: number; z: number } {
    return {
      x: this.xFilter.getValue(),
      y: this.yFilter.getValue(),
      z: this.zFilter.getValue(),
    };
  }

  reset(x: number, y: number, z: number): void {
    this.xFilter.reset(x);
    this.yFilter.reset(y);
    this.zFilter.reset(z);
  }
}

/**
 * Adaptive Kalman Filter that adjusts noise based on motion velocity
 * Better for surgical tracking where sometimes you need fast response,
 * sometimes high stability
 */
export class AdaptiveKalmanFilter {
  private filter: KalmanFilter1D;
  private velocityHistory: number[] = [];
  private lastValue: number = 0;
  private lastTimestamp: number = 0;
  
  private readonly baseProcessNoise: number;
  private readonly baseMeasurementNoise: number;
  private readonly velocityWindow: number = 5;

  constructor(
    initialValue: number = 0,
    baseProcessNoise: number = 0.01,
    baseMeasurementNoise: number = 0.1
  ) {
    this.baseProcessNoise = baseProcessNoise;
    this.baseMeasurementNoise = baseMeasurementNoise;
    this.filter = new KalmanFilter1D(initialValue, baseProcessNoise, baseMeasurementNoise);
    this.lastValue = initialValue;
    this.lastTimestamp = Date.now();
  }

  update(measurement: number): number {
    const now = Date.now();
    const dt = Math.max(1, now - this.lastTimestamp) / 1000;
    
    // Calculate instantaneous velocity
    const velocity = Math.abs(measurement - this.lastValue) / dt;
    this.velocityHistory.push(velocity);
    if (this.velocityHistory.length > this.velocityWindow) {
      this.velocityHistory.shift();
    }

    // Calculate average velocity
    const avgVelocity = this.velocityHistory.reduce((a, b) => a + b, 0) / this.velocityHistory.length;

    // Adaptive noise: high velocity = trust measurements more (less smoothing)
    // low velocity = trust filter more (more smoothing for stability)
    const velocityFactor = Math.min(5, avgVelocity / 10); // Normalize velocity
    const adaptiveProcess = this.baseProcessNoise * (1 + velocityFactor * 2);
    const adaptiveMeasurement = this.baseMeasurementNoise / (1 + velocityFactor);

    this.filter.setNoiseParameters(adaptiveProcess, adaptiveMeasurement);
    
    this.lastValue = measurement;
    this.lastTimestamp = now;

    return this.filter.update(measurement);
  }

  getValue(): number {
    return this.filter.getValue();
  }

  reset(value: number): void {
    this.filter.reset(value);
    this.lastValue = value;
    this.velocityHistory = [];
  }
}

/**
 * One Euro Filter - Better for low-latency, responsive tracking
 * Combines low-pass filter with adaptive cutoff based on speed
 * Ideal for real-time surgical tracking where latency matters
 */
export class OneEuroFilter {
  private x: number;
  private dx: number;
  private lastTimestamp: number;
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  constructor(
    initialValue: number = 0,
    minCutoff: number = 1.0,  // Minimum cutoff frequency
    beta: number = 0.007,     // Speed coefficient
    dCutoff: number = 1.0     // Derivative cutoff frequency
  ) {
    this.x = initialValue;
    this.dx = 0;
    this.lastTimestamp = Date.now();
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private smoothingFactor(rate: number, cutoff: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau * rate);
  }

  update(value: number): number {
    const now = Date.now();
    const dt = Math.max(1, now - this.lastTimestamp) / 1000;
    const rate = 1.0 / dt;

    // Estimate derivative
    const edx = (value - this.x) * rate;
    const adx = this.smoothingFactor(rate, this.dCutoff);
    this.dx = adx * edx + (1 - adx) * this.dx;

    // Adaptive cutoff based on derivative (speed)
    const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);

    // Filter the value
    const alpha = this.smoothingFactor(rate, cutoff);
    this.x = alpha * value + (1 - alpha) * this.x;

    this.lastTimestamp = now;
    return this.x;
  }

  getValue(): number {
    return this.x;
  }

  reset(value: number): void {
    this.x = value;
    this.dx = 0;
    this.lastTimestamp = Date.now();
  }
}

/**
 * Create a set of filters for all 21 hand landmarks
 */
export function createLandmarkFilters(
  filterType: 'kalman' | 'oneEuro' | 'adaptive' = 'oneEuro'
): Map<number, KalmanFilter3D | { update: (x: number, y: number, z: number) => { x: number; y: number; z: number }; reset: (x: number, y: number, z: number) => void }> {
  const filters = new Map();
  
  for (let i = 0; i < 21; i++) {
    if (filterType === 'kalman') {
      filters.set(i, new KalmanFilter3D(0, 0, 0, 0.005, 0.05));
    } else if (filterType === 'adaptive') {
      // Wrap adaptive kalman for 3D
      const xFilter = new AdaptiveKalmanFilter(0, 0.005, 0.05);
      const yFilter = new AdaptiveKalmanFilter(0, 0.005, 0.05);
      const zFilter = new AdaptiveKalmanFilter(0, 0.005, 0.05);
      filters.set(i, {
        update: (x: number, y: number, z: number) => ({
          x: xFilter.update(x),
          y: yFilter.update(y),
          z: zFilter.update(z),
        }),
        reset: (x: number, y: number, z: number) => {
          xFilter.reset(x);
          yFilter.reset(y);
          zFilter.reset(z);
        }
      });
    } else {
      // One Euro Filter (default - best for real-time)
      const xFilter = new OneEuroFilter(0, 1.5, 0.01, 1.0);
      const yFilter = new OneEuroFilter(0, 1.5, 0.01, 1.0);
      const zFilter = new OneEuroFilter(0, 1.5, 0.01, 1.0);
      filters.set(i, {
        update: (x: number, y: number, z: number) => ({
          x: xFilter.update(x),
          y: yFilter.update(y),
          z: zFilter.update(z),
        }),
        reset: (x: number, y: number, z: number) => {
          xFilter.reset(x);
          yFilter.reset(y);
          zFilter.reset(z);
        }
      });
    }
  }
  
  return filters;
}
