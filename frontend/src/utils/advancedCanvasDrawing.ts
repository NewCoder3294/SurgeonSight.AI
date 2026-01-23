/**
 * Advanced Canvas Drawing for Surgical Hand Tracking
 * 
 * Beautiful, informative visualizations for:
 * - Hand skeleton with anatomical accuracy
 * - Real-time angle measurements with arcs
 * - Tremor visualization
 * - Grip quality indicators
 * - Motion trails
 * - Status overlays
 */

import type { SurgicalAngleMetrics } from './surgicalAngles';
import type { TremorAnalysis } from './tremorAnalysis';
import type { GripClassification } from './advancedGripClassifier';

export interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

// MediaPipe hand connections with anatomical grouping
export const HAND_CONNECTIONS = {
  thumb: [[0, 1], [1, 2], [2, 3], [3, 4]],
  index: [[0, 5], [5, 6], [6, 7], [7, 8]],
  middle: [[0, 9], [9, 10], [10, 11], [11, 12]],
  ring: [[0, 13], [13, 14], [14, 15], [15, 16]],
  pinky: [[0, 17], [17, 18], [18, 19], [19, 20]],
  palm: [[5, 9], [9, 13], [13, 17]],
} as const;

// Color palette
const COLORS = {
  primary: 'rgba(0, 180, 216, 1)',       // Cyan
  secondary: 'rgba(34, 197, 94, 1)',      // Green
  accent: 'rgba(196, 92, 62, 1)',         // Rust/Orange
  warning: 'rgba(251, 191, 36, 1)',       // Amber
  error: 'rgba(239, 68, 68, 1)',          // Red
  success: 'rgba(34, 197, 94, 1)',        // Green
  muted: 'rgba(148, 163, 184, 1)',        // Slate
  bg: 'rgba(10, 15, 26, 0.85)',           // Dark bg
  bgLight: 'rgba(248, 250, 252, 0.85)',   // Light bg
};

interface DrawingContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
  flipX: boolean;
}

/**
 * Get scaled X coordinate (with optional flip)
 */
function getX(ctx: DrawingContext, x: number): number {
  return ctx.flipX ? (1 - x) * ctx.width : x * ctx.width;
}

/**
 * Get scaled Y coordinate
 */
function getY(ctx: DrawingContext, y: number): number {
  return y * ctx.height;
}

/**
 * Draw a rounded rectangle
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw hand skeleton with gradient colors based on depth
 */
export function drawAdvancedSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmark[],
  width: number,
  height: number,
  flipX: boolean = false,
  options: {
    showDepth?: boolean;
    lineWidth?: number;
    jointSize?: number;
    tipSize?: number;
    glowEffect?: boolean;
  } = {}
): void {
  const {
    showDepth = true,
    lineWidth = 4,
    jointSize = 5,
    tipSize = 7,
    glowEffect = true,
  } = options;

  const scale = Math.max(0.5, width / 1280);
  const context: DrawingContext = { ctx, width, height, scale, flipX };

  // Calculate depth range for color mapping
  const zValues = landmarks.map(lm => lm.z);
  const minZ = Math.min(...zValues);
  const maxZ = Math.max(...zValues);
  const zRange = maxZ - minZ || 0.1;

  // Glow effect
  if (glowEffect) {
    ctx.shadowColor = COLORS.primary;
    ctx.shadowBlur = 10 * scale;
  }

  // Draw connections grouped by finger
  const fingerColors: Record<string, string> = {
    thumb: 'rgba(196, 92, 62, 1)',    // Rust
    index: 'rgba(0, 180, 216, 1)',    // Cyan
    middle: 'rgba(34, 197, 94, 1)',   // Green
    ring: 'rgba(251, 191, 36, 1)',    // Amber
    pinky: 'rgba(168, 85, 247, 1)',   // Purple
    palm: 'rgba(100, 116, 139, 0.8)', // Slate
  };

  for (const [finger, connections] of Object.entries(HAND_CONNECTIONS)) {
    ctx.strokeStyle = fingerColors[finger] || COLORS.primary;
    ctx.lineWidth = lineWidth * scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const [start, end] of connections) {
      const p1 = landmarks[start];
      const p2 = landmarks[end];

      // Depth-based opacity if enabled
      if (showDepth) {
        const avgZ = (p1.z + p2.z) / 2;
        const depthFactor = 1 - ((avgZ - minZ) / zRange) * 0.5;
        ctx.globalAlpha = Math.max(0.5, depthFactor);
      }

      ctx.beginPath();
      ctx.moveTo(getX(context, p1.x), getY(context, p1.y));
      ctx.lineTo(getX(context, p2.x), getY(context, p2.y));
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Draw joints with different sizes
  landmarks.forEach((point, index) => {
    const x = getX(context, point.x);
    const y = getY(context, point.y);

    // Fingertips are larger
    const isTip = [4, 8, 12, 16, 20].includes(index);
    const isWrist = index === 0;
    const radius = (isTip ? tipSize : isWrist ? tipSize * 1.2 : jointSize) * scale;

    // Depth-based size variation
    if (showDepth) {
      const depthFactor = 1 - ((point.z - minZ) / zRange) * 0.3;
      ctx.globalAlpha = Math.max(0.6, depthFactor);
    }

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);

    if (isTip) {
      ctx.fillStyle = COLORS.secondary;
    } else if (isWrist) {
      ctx.fillStyle = COLORS.primary;
    } else {
      ctx.fillStyle = COLORS.primary;
    }

    ctx.fill();

    // White border for visibility
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
  });

  ctx.globalAlpha = 1;
}

/**
 * Draw scalpel/instrument angle with arc and measurement
 */
export function drawScalpelAngle(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmark[],
  angle: number,
  targetAngle: number | null,
  tolerance: number,
  width: number,
  height: number,
  flipX: boolean = false
): void {
  const scale = Math.max(0.5, width / 1280);
  const context: DrawingContext = { ctx, width, height, scale, flipX };

  const wrist = landmarks[0];
  const indexTip = landmarks[8];

  const wristX = getX(context, wrist.x);
  const wristY = getY(context, wrist.y);
  const indexX = getX(context, indexTip.x);
  const indexY = getY(context, indexTip.y);

  // Determine if on target
  const isOnTarget = targetAngle !== null && Math.abs(angle - targetAngle) <= tolerance;
  const statusColor = isOnTarget ? COLORS.success : COLORS.accent;

  // Draw angle arc
  const arcRadius = 45 * scale;
  const endAngle = Math.atan2(indexY - wristY, indexX - wristX);

  // Arc background
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 15 * scale;
  ctx.arc(wristX, wristY, arcRadius, 0, 2 * Math.PI);
  ctx.stroke();

  // Actual angle arc
  ctx.beginPath();
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 4 * scale;
  ctx.arc(wristX, wristY, arcRadius, 0, endAngle, endAngle < 0);
  ctx.stroke();

  // Target angle indicator (if provided)
  if (targetAngle !== null) {
    const targetRad = (targetAngle * Math.PI) / 180;
    const targetX = wristX + Math.cos(targetRad) * (arcRadius + 10 * scale);
    const targetY = wristY + Math.sin(targetRad) * (arcRadius + 10 * scale);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'; // Blue for target
    ctx.setLineDash([4 * scale, 4 * scale]);
    ctx.lineWidth = 2 * scale;
    ctx.moveTo(wristX, wristY);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Reference line (horizontal)
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1 * scale;
  ctx.setLineDash([5 * scale, 5 * scale]);
  ctx.moveTo(wristX, wristY);
  ctx.lineTo(wristX + 70 * scale, wristY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Angle line (wrist to index)
  ctx.beginPath();
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 2.5 * scale;
  ctx.moveTo(wristX, wristY);
  ctx.lineTo(indexX, indexY);
  ctx.stroke();

  // Angle label with background
  const labelX = wristX + 55 * scale;
  const labelY = wristY - 25 * scale;

  drawRoundedRect(ctx, labelX - 5 * scale, labelY - 16 * scale, 60 * scale, 24 * scale, 4 * scale);
  ctx.fillStyle = COLORS.bg;
  ctx.fill();
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  ctx.font = `bold ${Math.round(14 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = statusColor;
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.abs(angle).toFixed(1)}°`, labelX, labelY);
}

/**
 * Draw pinch aperture angle
 */
export function drawPinchAperture(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmark[],
  aperture: number,
  width: number,
  height: number,
  flipX: boolean = false
): void {
  const scale = Math.max(0.5, width / 1280);
  const context: DrawingContext = { ctx, width, height, scale, flipX };

  const thumbTip = landmarks[4];
  const indexMcp = landmarks[5];
  const indexTip = landmarks[8];

  const thumbX = getX(context, thumbTip.x);
  const thumbY = getY(context, thumbTip.y);
  const mcpX = getX(context, indexMcp.x);
  const mcpY = getY(context, indexMcp.y);
  const indexX = getX(context, indexTip.x);
  const indexY = getY(context, indexTip.y);

  // Draw arc at MCP
  const arcRadius = 25 * scale;
  const thumbAngle = Math.atan2(thumbY - mcpY, thumbX - mcpX);
  const indexAngle = Math.atan2(indexY - mcpY, indexX - mcpX);

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.7)';
  ctx.lineWidth = 3 * scale;
  ctx.arc(mcpX, mcpY, arcRadius, Math.min(thumbAngle, indexAngle), Math.max(thumbAngle, indexAngle));
  ctx.stroke();

  // Dashed lines to thumb and index
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
  ctx.lineWidth = 1.5 * scale;
  ctx.setLineDash([3 * scale, 3 * scale]);
  ctx.moveTo(mcpX, mcpY);
  ctx.lineTo(thumbX, thumbY);
  ctx.moveTo(mcpX, mcpY);
  ctx.lineTo(indexX, indexY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Label
  const labelX = mcpX - 75 * scale;
  const labelY = mcpY - 15 * scale;

  drawRoundedRect(ctx, labelX - 5 * scale, labelY - 14 * scale, 80 * scale, 22 * scale, 4 * scale);
  ctx.fillStyle = COLORS.bg;
  ctx.fill();

  ctx.font = `bold ${Math.round(11 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = COLORS.secondary;
  ctx.textAlign = 'left';
  ctx.fillText(`Pinch ${aperture.toFixed(0)}°`, labelX, labelY);
}

/**
 * Draw tremor indicator
 */
export function drawTremorIndicator(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmark[],
  tremor: TremorAnalysis,
  width: number,
  height: number,
  flipX: boolean = false
): void {
  const scale = Math.max(0.5, width / 1280);
  const context: DrawingContext = { ctx, width, height, scale, flipX };

  const wrist = landmarks[0];
  const x = getX(context, wrist.x);
  const y = getY(context, wrist.y) + 60 * scale;

  // Background
  const boxWidth = 100 * scale;
  const boxHeight = 50 * scale;

  drawRoundedRect(ctx, x - boxWidth / 2, y, boxWidth, boxHeight, 6 * scale);
  ctx.fillStyle = COLORS.bg;
  ctx.fill();

  // Severity color
  let severityColor = COLORS.success;
  if (tremor.severity > 30) severityColor = COLORS.warning;
  if (tremor.severity > 60) severityColor = COLORS.error;

  ctx.strokeStyle = severityColor;
  ctx.lineWidth = 2 * scale;
  ctx.stroke();

  // Title
  ctx.font = `${Math.round(9 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = 'center';
  ctx.fillText('TREMOR', x, y + 12 * scale);

  // Severity bar
  const barY = y + 20 * scale;
  const barWidth = 80 * scale;
  const barHeight = 6 * scale;

  // Bar background
  ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
  drawRoundedRect(ctx, x - barWidth / 2, barY, barWidth, barHeight, 3 * scale);
  ctx.fill();

  // Bar fill
  ctx.fillStyle = severityColor;
  const fillWidth = (tremor.severity / 100) * barWidth;
  drawRoundedRect(ctx, x - barWidth / 2, barY, fillWidth, barHeight, 3 * scale);
  ctx.fill();

  // Value
  ctx.font = `bold ${Math.round(11 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = severityColor;
  ctx.fillText(`${tremor.severity.toFixed(0)}%`, x, y + 42 * scale);
}

/**
 * Draw grip classification badge
 */
export function drawGripBadge(
  ctx: CanvasRenderingContext2D,
  grip: GripClassification,
  x: number,
  y: number,
  scale: number
): void {
  // Determine color based on grip quality
  let bgColor = 'rgba(100, 116, 139, 0.9)';
  let textColor = '#fff';

  if (grip.quality.overall >= 80) {
    bgColor = 'rgba(34, 197, 94, 0.9)';
  } else if (grip.quality.overall >= 60) {
    bgColor = 'rgba(251, 191, 36, 0.9)';
  } else if (grip.quality.overall >= 40) {
    bgColor = 'rgba(239, 68, 68, 0.9)';
  }

  const text = grip.type.toUpperCase().replace('_', ' ');
  const padding = 8 * scale;
  const fontSize = Math.round(12 * scale);

  ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
  const textWidth = ctx.measureText(text).width;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = fontSize + padding * 1.5;

  // Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 6 * scale;
  ctx.shadowOffsetY = 2 * scale;

  // Background
  drawRoundedRect(ctx, x, y, boxWidth, boxHeight, 4 * scale);
  ctx.fillStyle = bgColor;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // Text
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padding, y + boxHeight / 2);

  // Confidence indicator (small dot)
  const dotRadius = 4 * scale;
  const dotX = x + boxWidth - padding - dotRadius;
  const dotY = y + boxHeight / 2;

  ctx.beginPath();
  ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
  ctx.fillStyle = grip.confidence > 0.7 ? COLORS.success : 
                  grip.confidence > 0.4 ? COLORS.warning : COLORS.error;
  ctx.fill();
}

/**
 * Draw motion trail for landmark history
 */
export function drawMotionTrail(
  ctx: CanvasRenderingContext2D,
  history: HandLandmark[][],
  landmarkIndex: number,
  width: number,
  height: number,
  flipX: boolean = false,
  options: {
    color?: string;
    maxPoints?: number;
    lineWidth?: number;
  } = {}
): void {
  const {
    color = 'rgba(0, 180, 216, 0.5)',
    maxPoints = 20,
    lineWidth = 2,
  } = options;

  if (history.length < 2) return;

  const scale = Math.max(0.5, width / 1280);
  const context: DrawingContext = { ctx, width, height, scale, flipX };

  const points = history.slice(-maxPoints).map(frame => frame[landmarkIndex]);

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const x = getX(context, point.x);
    const y = getY(context, point.y);

    // Fade out older points
    const alpha = (i / points.length) * 0.8;
    ctx.globalAlpha = alpha;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
  ctx.globalAlpha = 1;
}

/**
 * Draw comprehensive metrics HUD
 */
export function drawMetricsHUD(
  ctx: CanvasRenderingContext2D,
  metrics: {
    angles: SurgicalAngleMetrics;
    tremor: TremorAnalysis;
    grip: GripClassification;
    steadiness: number;
    speed: number;
  },
  handedness: 'Left' | 'Right',
  width: number,
  height: number,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'top-right'
): void {
  const scale = Math.max(0.5, width / 1280);
  const padding = 12 * scale;
  const boxWidth = 140 * scale;
  const boxHeight = 180 * scale;

  // Position
  let x = position.includes('right') ? width - boxWidth - padding : padding;
  let y = position.includes('bottom') ? height - boxHeight - padding : padding;

  // Background
  ctx.save();
  drawRoundedRect(ctx, x, y, boxWidth, boxHeight, 8 * scale);
  ctx.fillStyle = COLORS.bg;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  // Title
  ctx.font = `bold ${Math.round(10 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = 'left';
  ctx.fillText(`${handedness.toUpperCase()} HAND`, x + padding, y + 18 * scale);

  // Metrics
  const rowHeight = 22 * scale;
  let rowY = y + 35 * scale;

  const drawMetricRow = (label: string, value: string, color: string) => {
    ctx.font = `${Math.round(9 * scale)}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(label, x + padding, rowY);

    ctx.font = `bold ${Math.round(11 * scale)}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.fillText(value, x + boxWidth - padding, rowY);
    ctx.textAlign = 'left';

    rowY += rowHeight;
  };

  // Angle
  const angleColor = metrics.angles.confidence > 0.7 ? COLORS.primary : COLORS.warning;
  drawMetricRow('Angle', `${Math.abs(metrics.angles.scalpelAngle).toFixed(1)}°`, angleColor);

  // Steadiness
  const steadyColor = metrics.steadiness > 70 ? COLORS.success : 
                      metrics.steadiness > 40 ? COLORS.warning : COLORS.error;
  drawMetricRow('Steady', `${metrics.steadiness.toFixed(0)}%`, steadyColor);

  // Speed
  drawMetricRow('Speed', `${metrics.speed.toFixed(1)} in/s`, COLORS.primary);

  // Tremor
  const tremorColor = metrics.tremor.severity < 30 ? COLORS.success :
                      metrics.tremor.severity < 60 ? COLORS.warning : COLORS.error;
  drawMetricRow('Tremor', `${metrics.tremor.severity.toFixed(0)}%`, tremorColor);

  // Grip
  drawMetricRow('Grip', metrics.grip.type.replace('_', ' '), 
    metrics.grip.confidence > 0.6 ? COLORS.secondary : COLORS.warning);

  // Quality bar
  rowY += 5 * scale;
  const barWidth = boxWidth - padding * 2;
  const barHeight = 8 * scale;

  ctx.font = `${Math.round(8 * scale)}px 'JetBrains Mono', monospace`;
  ctx.fillStyle = COLORS.muted;
  ctx.fillText('Quality', x + padding, rowY);

  rowY += 10 * scale;

  // Bar background
  drawRoundedRect(ctx, x + padding, rowY, barWidth, barHeight, 4 * scale);
  ctx.fillStyle = 'rgba(100, 116, 139, 0.3)';
  ctx.fill();

  // Bar fill
  const qualityColor = metrics.grip.quality.overall > 70 ? COLORS.success :
                       metrics.grip.quality.overall > 40 ? COLORS.warning : COLORS.error;
  const fillWidth = (metrics.grip.quality.overall / 100) * barWidth;
  drawRoundedRect(ctx, x + padding, rowY, fillWidth, barHeight, 4 * scale);
  ctx.fillStyle = qualityColor;
  ctx.fill();

  ctx.restore();
}

/**
 * Draw all hand overlays
 */
export function drawAllOverlays(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmark[],
  filteredLandmarks: HandLandmark[],
  metrics: {
    angles: SurgicalAngleMetrics;
    tremor: TremorAnalysis;
    grip: GripClassification;
    steadiness: number;
    speed: number;
    scalpelAngle: number;
    pinchAngle: number;
  },
  handedness: 'Left' | 'Right',
  width: number,
  height: number,
  flipX: boolean = false,
  options: {
    showSkeleton?: boolean;
    showAngles?: boolean;
    showTremor?: boolean;
    showGripBadge?: boolean;
    showHUD?: boolean;
    targetAngle?: number;
    angleTolerance?: number;
    history?: HandLandmark[][];
    showMotionTrail?: boolean;
  } = {}
): void {
  const {
    showSkeleton = true,
    showAngles = true,
    showTremor = true,
    showGripBadge = true,
    showHUD = false,
    targetAngle = null,
    angleTolerance = 15,
    history = [],
    showMotionTrail = false,
  } = options;

  // Motion trail (behind skeleton)
  if (showMotionTrail && history.length > 5) {
    drawMotionTrail(ctx, history, 8, width, height, flipX, {
      color: handedness === 'Left' ? 'rgba(168, 85, 247, 0.4)' : 'rgba(0, 180, 216, 0.4)',
    });
  }

  // Skeleton
  if (showSkeleton) {
    drawAdvancedSkeleton(ctx, filteredLandmarks, width, height, flipX, {
      glowEffect: true,
      showDepth: true,
    });
  }

  // Angles
  if (showAngles) {
    drawScalpelAngle(
      ctx, filteredLandmarks, metrics.scalpelAngle,
      targetAngle, angleTolerance, width, height, flipX
    );
    drawPinchAperture(
      ctx, filteredLandmarks, metrics.pinchAngle,
      width, height, flipX
    );
  }

  // Tremor indicator
  if (showTremor && metrics.tremor.severity > 10) {
    drawTremorIndicator(ctx, filteredLandmarks, metrics.tremor, width, height, flipX);
  }

  // Grip badge
  if (showGripBadge) {
    const scale = Math.max(0.5, width / 1280);
    const context: DrawingContext = { ctx, width, height, scale, flipX };
    const wrist = filteredLandmarks[0];
    const badgeX = getX(context, wrist.x) - 50 * scale;
    const badgeY = getY(context, wrist.y) - 30 * scale;
    drawGripBadge(ctx, metrics.grip, badgeX, badgeY, scale);
  }

  // Full HUD
  if (showHUD) {
    const position = handedness === 'Left' ? 'top-left' : 'top-right';
    drawMetricsHUD(ctx, metrics, handedness, width, height, position as any);
  }
}
