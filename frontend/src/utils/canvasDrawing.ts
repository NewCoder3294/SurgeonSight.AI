
// Hand skeleton connections (MediaPipe format)
export const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],     // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],     // Index
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17]           // Palm
];

// Draw hand skeleton lines
export function drawHandSkeleton(ctx: any, landmarks: any, width: any, height: any, flipX: boolean = false) {
    // Scale drawing based on canvas width (baseline 1280px)
    const scale = Math.max(0.5, width / 1280);

    ctx.strokeStyle = 'rgba(0, 180, 216, 1.0)'; // Fully opaque cyan
    ctx.lineWidth = 6 * scale; // Very thick scaled

    HAND_CONNECTIONS.forEach(([start, end]) => {
        const p1 = landmarks[start];
        const p2 = landmarks[end];

        ctx.beginPath();
        const x1 = flipX ? (1 - p1.x) * width : p1.x * width;
        const x2 = flipX ? (1 - p2.x) * width : p2.x * width;

        ctx.moveTo(x1, p1.y * height);
        ctx.lineTo(x2, p2.y * height);
        ctx.stroke();
    });
}

// Draw angle arc and value near the wrist
export function drawAngleArc(ctx: any, landmarks: any, angle: number, width: number, height: number, flipX: boolean = false) {
    if (!landmarks || landmarks.length < 9) return;

    // Scale drawing based on canvas width (baseline 1280px)
    const scale = Math.max(0.5, width / 1280);

    const wrist = landmarks[0];  // Wrist
    const indexTip = landmarks[8]; // Index fingertip

    const wristX = flipX ? (1 - wrist.x) * width : wrist.x * width;
    const wristY = wrist.y * height;
    const indexX = flipX ? (1 - indexTip.x) * width : indexTip.x * width;
    const indexY = indexTip.y * height;

    // Draw angle arc
    const arcRadius = 40 * scale;
    const endAngle = Math.atan2(indexY - wristY, indexX - wristX);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(196, 92, 62, 0.8)'; // accent-rust
    ctx.lineWidth = 3 * scale;
    ctx.arc(wristX, wristY, arcRadius, 0, endAngle, endAngle < 0);
    ctx.stroke();

    // Draw horizontal reference line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1 * scale;
    ctx.setLineDash([5 * scale, 5 * scale]);
    ctx.moveTo(wristX, wristY);
    ctx.lineTo(wristX + 60 * scale, wristY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw angle line (wrist to index)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(196, 92, 62, 1)';
    ctx.lineWidth = 2 * scale;
    ctx.moveTo(wristX, wristY);
    ctx.lineTo(indexX, indexY);
    ctx.stroke();

    // Draw angle value label
    const labelX = wristX + 50 * scale;
    const labelY = wristY - 20 * scale;

    ctx.fillStyle = 'rgba(10, 15, 26, 0.8)';
    ctx.fillRect(labelX - 5 * scale, labelY - 14 * scale, 50 * scale, 20 * scale);

    ctx.font = `bold ${Math.round(14 * scale)}px monospace`;
    ctx.fillStyle = 'rgba(196, 92, 62, 1)';
    ctx.fillText(`${Math.abs(angle).toFixed(1)}°`, labelX, labelY);
}

// Draw hand landmark points
export function drawHandLandmarks(ctx: any, landmarks: any, width: any, height: any, flipX: boolean = false) {
    // Scale drawing based on canvas width (baseline 1280px)
    const scale = Math.max(0.5, width / 1280);

    landmarks.forEach((point: any, index: any) => {
        const x = flipX ? (1 - point.x) * width : point.x * width;
        const y = point.y * height;

        // Different colors for different parts
        if (index === 0) {
            // Wrist - larger
            ctx.fillStyle = 'rgba(0, 180, 216, 1)';
            ctx.beginPath();
            ctx.arc(x, y, 10 * scale, 0, 2 * Math.PI); // Larger wrist scaled
            ctx.fill();
        } else if ([4, 8, 12, 16, 20].includes(index)) {
            // Fingertips - emphasized
            ctx.fillStyle = 'rgba(34, 197, 94, 1)';
            ctx.beginPath();
            ctx.arc(x, y, 8 * scale, 0, 2 * Math.PI); // Larger fingertips scaled
            ctx.fill();
        } else {
            // Other joints
            ctx.fillStyle = 'rgba(0, 180, 216, 1)';
            ctx.beginPath();
            ctx.arc(x, y, 6 * scale, 0, 2 * Math.PI); // Larger joints scaled
            ctx.fill();
        }
    });
}

// Draw pinch angle arc between thumb and index finger
export function drawPinchAngle(ctx: any, landmarks: any, angle: number, width: number, height: number, flipX: boolean = false) {
    if (!landmarks || landmarks.length < 9) return;

    // Scale drawing based on canvas width (baseline 1280px)
    const scale = Math.max(0.5, width / 1280);

    const thumbTip = landmarks[4];  // Thumb tip
    const indexMcp = landmarks[5];  // Index MCP (base)
    const indexTip = landmarks[8];  // Index tip

    const thumbX = flipX ? (1 - thumbTip.x) * width : thumbTip.x * width;
    const thumbY = thumbTip.y * height;
    const mcpX = flipX ? (1 - indexMcp.x) * width : indexMcp.x * width;
    const mcpY = indexMcp.y * height;
    const indexX = flipX ? (1 - indexTip.x) * width : indexTip.x * width;
    const indexY = indexTip.y * height;

    // Draw arc at index MCP showing pinch angle
    const arcRadius = 30 * scale;
    const thumbAngle = Math.atan2(thumbY - mcpY, thumbX - mcpX);
    const indexAngle = Math.atan2(indexY - mcpY, indexX - mcpX);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)'; // Green for pinch
    ctx.lineWidth = 3 * scale;
    ctx.arc(mcpX, mcpY, arcRadius, Math.min(thumbAngle, indexAngle), Math.max(thumbAngle, indexAngle));
    ctx.stroke();

    // Draw lines to thumb and index
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.lineWidth = 1 * scale;
    ctx.setLineDash([3 * scale, 3 * scale]);
    ctx.moveTo(mcpX, mcpY);
    ctx.lineTo(thumbX, thumbY);
    ctx.moveTo(mcpX, mcpY);
    ctx.lineTo(indexX, indexY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw angle value label
    const labelX = mcpX - 60 * scale;
    const labelY = mcpY - 10 * scale;

    ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
    ctx.fillRect(labelX - 5 * scale, labelY - 14 * scale, 70 * scale, 20 * scale);

    ctx.font = `bold ${Math.round(12 * scale)}px monospace`;
    ctx.fillStyle = 'rgba(34, 197, 94, 1)';
    ctx.fillText(`Pinch ${angle.toFixed(0)}°`, labelX, labelY);
}

// Draw finger bend indicator on index finger
export function drawFingerBend(ctx: any, landmarks: any, bendPercent: number, width: number, height: number, flipX: boolean = false) {
    if (!landmarks || landmarks.length < 9) return;

    // Scale drawing based on canvas width (baseline 1280px)
    const scale = Math.max(0.5, width / 1280);

    const indexPip = landmarks[6];  // Index PIP (middle joint)
    const indexDip = landmarks[7];  // Index DIP

    const pipX = flipX ? (1 - indexPip.x) * width : indexPip.x * width;
    const pipY = indexPip.y * height;
    const dipX = flipX ? (1 - indexDip.x) * width : indexDip.x * width;
    const dipY = indexDip.y * height;

    // Position indicator between PIP and DIP
    const midX = (pipX + dipX) / 2;
    const midY = (pipY + dipY) / 2;

    // Draw bend percentage bar
    const barWidth = 40 * scale;
    const barHeight = 8 * scale;
    const barX = midX - barWidth / 2;
    const barY = midY - 25 * scale;

    // Background
    ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
    ctx.fillRect(barX - 5 * scale, barY - 18 * scale, barWidth + 50 * scale, 30 * scale);

    // Bar background
    ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Filled portion based on bend
    const fillColor = bendPercent > 60 ? 'rgba(239, 68, 68, 0.9)' :
        bendPercent > 30 ? 'rgba(251, 191, 36, 0.9)' :
            'rgba(34, 197, 94, 0.9)';
    ctx.fillStyle = fillColor;
    ctx.fillRect(barX, barY, (barWidth * bendPercent) / 100, barHeight);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Label
    ctx.font = `bold ${Math.round(10 * scale)}px monospace`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(`Bend ${bendPercent.toFixed(0)}%`, barX + barWidth + 5 * scale, barY + 7 * scale);

    // Connection line to finger
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.moveTo(midX, barY + barHeight);
    ctx.lineTo(midX, midY);
    ctx.stroke();
}
