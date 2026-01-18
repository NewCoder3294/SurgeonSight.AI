import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface SurgicalMetrics {
    scalpelAngle: number;
    pinchAngle: number;
    fingerBend: number;
    steadiness: number;
    speed: number;
    gripType: 'pencil' | 'power' | 'unknown';
    gripConfidence: number;
}

interface VideoFeedProps {
    detectionBox?: any;
    hands?: any[];
    gripState?: any;
    showLandmarks?: boolean;
    showSkeleton?: boolean;
    showMetrics?: boolean;
    metrics?: SurgicalMetrics | null;
}

/**
 * VideoFeed component with hand detection overlay support
 * Displays webcam feed with optional hand landmark visualization
 */
const VideoFeed = forwardRef(function VideoFeed({
    detectionBox,
    hands = [],
    gripState = null,
    showLandmarks = true,
    showSkeleton = true,
    showMetrics = true,
    metrics = null
}: VideoFeedProps, ref: any) {
    const videoRef = useRef<any>(null);
    const canvasRef = useRef<any>(null);

    // Expose video ref to parent
    useImperativeHandle(ref, () => ({
        getVideoElement: () => videoRef.current,
        getCanvasElement: () => canvasRef.current
    }));

    useEffect(() => {
        initCamera();
        return () => {
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach((track: any) => track.stop());
            }
        };
    }, []);

    // Draw hand landmarks when hands data changes
    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Match canvas size to video
        if (videoRef.current) {
            canvas.width = videoRef.current.videoWidth || 640;
            canvas.height = videoRef.current.videoHeight || 480;
        }

        // Clear previous drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw each hand
        hands.forEach((hand: any) => {
            const landmarks = hand.landmarks || hand;
            const handMetrics = hand.metrics || metrics;

            if (showSkeleton && landmarks.length > 0) {
                drawHandSkeleton(ctx, landmarks, canvas.width, canvas.height);
            }
            if (showLandmarks && landmarks.length > 0) {
                drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height);
            }
            if (showMetrics && handMetrics && landmarks.length > 0) {
                drawAngleArc(ctx, landmarks, handMetrics.scalpelAngle, canvas.width, canvas.height);
                drawPinchAngle(ctx, landmarks, handMetrics.pinchAngle, canvas.width, canvas.height);
                drawFingerBend(ctx, landmarks, handMetrics.fingerBend, canvas.width, canvas.height);
            }
        });
    }, [hands, showLandmarks, showSkeleton, showMetrics, metrics]);

    const initCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                },
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Camera error:', err);
        }
    };

    // Get grip state color
    const getGripColor = (state: any) => {
        switch (state) {
            case 'correct': return 'var(--success)';
            case 'palmed': case 'angled': case 'tremor': return 'var(--error)';
            case 'other_error': return 'var(--warning)';
            default: return 'var(--text-muted)';
        }
    };

    return (
        <div className="w-full aspect-video bg-bg-secondary relative overflow-hidden">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
            />

            {/* Canvas for hand landmark overlay */}
            <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none -scale-x-100"
            />

            {/* Overlay effects */}
            <div className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none">
                {/* Corner targeting reticle */}
                <div className="absolute top-5 left-5 w-10 h-10 border-t border-l border-accent-rust opacity-60" />
                <div className="absolute top-5 right-5 w-10 h-10 border-t border-r border-accent-rust opacity-60" />
                <div className="absolute bottom-10 left-5 w-10 h-10 border-b border-l border-accent-rust opacity-60" />
                <div className="absolute bottom-10 right-5 w-10 h-10 border-b border-r border-accent-rust opacity-60" />

                {/* Scan line */}
                <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent-rust-glow via-accent-rust via-accent-rust-glow to-transparent opacity-30 animate-scan-down" />

                {/* Grid overlay */}
                <div className="absolute top-0 left-0 right-0 bottom-0 bg-[linear-gradient(rgba(196,92,62,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(196,92,62,0.05)_1px,transparent_1px)] bg-[length:60px_60px]" />

                {/* Detection box (legacy support) */}
                {detectionBox && (
                    <div
                        className="absolute border-2 border-accent-rust bg-[rgba(196,92,62,0.1)] animate-pulse-box flex flex-col justify-end p-1"
                        style={{
                            left: `${detectionBox.x}%`,
                            top: `${detectionBox.y}%`,
                            width: `${detectionBox.width}%`,
                            height: `${detectionBox.height}%`,
                        }}
                    >
                        <span className="font-mono text-[0.55rem] tracking-wider text-accent-rust bg-[rgba(10,10,10,0.8)] px-1 py-0.5 self-start [data-theme='light']:bg-[rgba(255,255,255,0.9)]">HAND DETECTED</span>
                        <span className="font-mono text-[0.5rem] tracking-wider text-text-dim bg-[rgba(10,10,10,0.8)] px-1 py-0.5 self-start mt-0.5 [data-theme='light']:bg-[rgba(255,255,255,0.9)]">CONF: 0.{Math.floor(75 + Math.random() * 20)}</span>
                    </div>
                )}

                {/* Grip state indicator */}
                {gripState && (
                    <div className="absolute top-5 right-5 p-2 bg-[rgba(10,15,26,0.9)] border-2 backdrop-blur-sm flex flex-col gap-0.5 [data-theme='light']:bg-[rgba(248,250,252,0.95)]" style={{ borderColor: getGripColor(gripState.state) }}>
                        <span className="font-display text-base tracking-wider" style={{ color: getGripColor(gripState.state) }}>
                            {gripState.state.toUpperCase().replace('_', ' ')}
                        </span>
                        <span className="font-mono text-[0.5rem] tracking-wider text-text-dim">
                            CONF: {(gripState.confidence * 100).toFixed(0)}%
                        </span>
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div className="absolute bottom-0 left-0 right-0 flex gap-4 px-2 py-1 bg-[rgba(10,10,10,0.7)] backdrop-blur-sm [data-theme='light']:bg-[rgba(255,255,255,0.8)]">
                <span className="font-mono text-xs tracking-wider text-text-dim uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-error animate-blink" />
                    REC
                </span>
                <span className="font-mono text-xs tracking-wider text-text-dim uppercase">720p</span>
                <span className="font-mono text-xs tracking-wider text-text-dim uppercase">30FPS</span>
                {hands.length > 0 && (
                    <span className="font-mono text-xs tracking-wider text-success uppercase">
                        {hands.length} HAND{hands.length > 1 ? 'S' : ''}
                    </span>
                )}
            </div>
        </div>
    );
});

// Hand skeleton connections (MediaPipe format)
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],     // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8],     // Index
    [0, 9], [9, 10], [10, 11], [11, 12], // Middle
    [0, 13], [13, 14], [14, 15], [15, 16], // Ring
    [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    [5, 9], [9, 13], [13, 17]           // Palm
];

// Draw hand skeleton lines
function drawHandSkeleton(ctx: any, landmarks: any, width: any, height: any) {
    ctx.strokeStyle = 'rgba(0, 180, 216, 0.6)';
    ctx.lineWidth = 2;

    HAND_CONNECTIONS.forEach(([start, end]) => {
        const p1 = landmarks[start];
        const p2 = landmarks[end];

        ctx.beginPath();
        ctx.moveTo(p1.x * width, p1.y * height);
        ctx.lineTo(p2.x * width, p2.y * height);
        ctx.stroke();
    });
}

// Draw angle arc and value near the wrist
function drawAngleArc(ctx: any, landmarks: any, angle: number, width: number, height: number) {
    if (!landmarks || landmarks.length < 9) return;

    const wrist = landmarks[0];  // Wrist
    const indexTip = landmarks[8]; // Index fingertip

    const wristX = wrist.x * width;
    const wristY = wrist.y * height;
    const indexX = indexTip.x * width;
    const indexY = indexTip.y * height;

    // Draw angle arc
    const arcRadius = 40;
    const endAngle = Math.atan2(indexY - wristY, indexX - wristX);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(196, 92, 62, 0.8)'; // accent-rust
    ctx.lineWidth = 3;
    ctx.arc(wristX, wristY, arcRadius, 0, endAngle, endAngle < 0);
    ctx.stroke();

    // Draw horizontal reference line
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.moveTo(wristX, wristY);
    ctx.lineTo(wristX + 60, wristY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw angle line (wrist to index)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(196, 92, 62, 1)';
    ctx.lineWidth = 2;
    ctx.moveTo(wristX, wristY);
    ctx.lineTo(indexX, indexY);
    ctx.stroke();

    // Draw angle value label
    const labelX = wristX + 50;
    const labelY = wristY - 20;

    ctx.fillStyle = 'rgba(10, 15, 26, 0.8)';
    ctx.fillRect(labelX - 5, labelY - 14, 50, 20);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = 'rgba(196, 92, 62, 1)';
    ctx.fillText(`${Math.abs(angle).toFixed(1)}°`, labelX, labelY);
}

// Draw hand landmark points
function drawHandLandmarks(ctx: any, landmarks: any, width: any, height: any) {
    landmarks.forEach((point: any, index: any) => {
        const x = point.x * width;
        const y = point.y * height;

        // Different colors for different parts
        if (index === 0) {
            // Wrist - larger
            ctx.fillStyle = 'rgba(0, 180, 216, 1)';
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fill();
        } else if ([4, 8, 12, 16, 20].includes(index)) {
            // Fingertips - emphasized
            ctx.fillStyle = 'rgba(34, 197, 94, 1)';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
        } else {
            // Other joints
            ctx.fillStyle = 'rgba(0, 180, 216, 0.8)';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
}

// Draw pinch angle arc between thumb and index finger
function drawPinchAngle(ctx: any, landmarks: any, angle: number, width: number, height: number) {
    if (!landmarks || landmarks.length < 9) return;

    const thumbTip = landmarks[4];  // Thumb tip
    const indexMcp = landmarks[5];  // Index MCP (base)
    const indexTip = landmarks[8];  // Index tip

    const thumbX = thumbTip.x * width;
    const thumbY = thumbTip.y * height;
    const mcpX = indexMcp.x * width;
    const mcpY = indexMcp.y * height;
    const indexX = indexTip.x * width;
    const indexY = indexTip.y * height;

    // Draw arc at index MCP showing pinch angle
    const arcRadius = 30;
    const thumbAngle = Math.atan2(thumbY - mcpY, thumbX - mcpX);
    const indexAngle = Math.atan2(indexY - mcpY, indexX - mcpX);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)'; // Green for pinch
    ctx.lineWidth = 3;
    ctx.arc(mcpX, mcpY, arcRadius, Math.min(thumbAngle, indexAngle), Math.max(thumbAngle, indexAngle));
    ctx.stroke();

    // Draw lines to thumb and index
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.moveTo(mcpX, mcpY);
    ctx.lineTo(thumbX, thumbY);
    ctx.moveTo(mcpX, mcpY);
    ctx.lineTo(indexX, indexY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw angle value label
    const labelX = mcpX - 60;
    const labelY = mcpY - 10;

    ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
    ctx.fillRect(labelX - 5, labelY - 14, 70, 20);

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = 'rgba(34, 197, 94, 1)';
    ctx.fillText(`Pinch ${angle.toFixed(0)}°`, labelX, labelY);
}

// Draw finger bend indicator on index finger
function drawFingerBend(ctx: any, landmarks: any, bendPercent: number, width: number, height: number) {
    if (!landmarks || landmarks.length < 9) return;

    const indexPip = landmarks[6];  // Index PIP (middle joint)
    const indexDip = landmarks[7];  // Index DIP

    const pipX = indexPip.x * width;
    const pipY = indexPip.y * height;
    const dipX = indexDip.x * width;
    const dipY = indexDip.y * height;

    // Position indicator between PIP and DIP
    const midX = (pipX + dipX) / 2;
    const midY = (pipY + dipY) / 2;

    // Draw bend percentage bar
    const barWidth = 40;
    const barHeight = 8;
    const barX = midX - barWidth / 2;
    const barY = midY - 25;

    // Background
    ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
    ctx.fillRect(barX - 5, barY - 18, barWidth + 50, 30);

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
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Label
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(`Bend ${bendPercent.toFixed(0)}%`, barX + barWidth + 5, barY + 7);

    // Connection line to finger
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.moveTo(midX, barY + barHeight);
    ctx.lineTo(midX, midY);
    ctx.stroke();
}

export default VideoFeed;
