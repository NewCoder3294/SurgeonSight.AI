/**
 * Hand3DVisualization - 3D hand skeleton with bend animation
 * 
 * Uses CSS 3D transforms to create an animated hand visualization
 * showing finger bend angles in real-time
 */

import { useEffect, useRef } from 'react';

interface SurgicalMetrics {
    scalpelAngle: number;
    pinchAngle: number;
    fingerBend: number;
    steadiness: number;
    speed: number;
    gripType: 'pencil' | 'power' | 'unknown';
    gripConfidence: number;
}

interface HandLandmark {
    x: number;
    y: number;
    z: number;
}

interface Hand3DVisualizationProps {
    metrics: SurgicalMetrics | null;
    landmarks?: HandLandmark[];
    handedness?: 'Left' | 'Right';
}

export default function Hand3DVisualization({
    metrics,
    landmarks,
    handedness = 'Right'
}: Hand3DVisualizationProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        // Clear canvas
        ctx.clearRect(0, 0, rect.width, rect.height);

        // Draw 3D-style hand skeleton
        draw3DHand(ctx, rect.width, rect.height, metrics, landmarks, handedness);
    }, [metrics, landmarks, handedness]);

    return (
        <div className="relative w-full h-full min-h-[200px] bg-bg-tertiary rounded border border-border-subtle overflow-hidden">
            {/* 3D perspective container */}
            <div
                className="absolute inset-0"
                style={{
                    perspective: '500px',
                    perspectiveOrigin: '50% 50%'
                }}
            >
                <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                    style={{
                        transform: 'rotateX(10deg) rotateY(-5deg)',
                        transformStyle: 'preserve-3d'
                    }}
                />
            </div>

            {/* Metrics overlay */}
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <span className="font-mono text-[0.6rem] text-text-dim uppercase">Finger Bend</span>
                    <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-bg-secondary rounded overflow-hidden">
                            <div
                                className="h-full transition-all duration-200"
                                style={{
                                    width: `${metrics?.fingerBend || 0}%`,
                                    backgroundColor: (metrics?.fingerBend || 0) > 60
                                        ? 'var(--error)'
                                        : (metrics?.fingerBend || 0) > 30
                                            ? 'var(--warning)'
                                            : 'var(--success)'
                                }}
                            />
                        </div>
                        <span className="font-mono text-sm text-text-cream">
                            {metrics?.fingerBend?.toFixed(0) || '--'}%
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-1 items-end">
                    <span className="font-mono text-[0.6rem] text-text-dim uppercase">Pinch Angle</span>
                    <span className="font-mono text-lg text-accent-rust">
                        {metrics?.pinchAngle?.toFixed(0) || '--'}°
                    </span>
                </div>
            </div>

            {/* Hand label */}
            <div className="absolute top-2 left-2">
                <span className="font-mono text-[0.55rem] tracking-wider text-text-dim uppercase bg-bg-secondary/80 px-1.5 py-0.5">
                    {handedness} Hand • 3D View
                </span>
            </div>
        </div>
    );
}

// Draw 3D-style hand skeleton on canvas
function draw3DHand(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    metrics: SurgicalMetrics | null,
    landmarks?: HandLandmark[],
    _handedness?: string  // Reserved for future mirror mode
) {
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) * 0.35;

    // Default hand positions (normalized -1 to 1)
    const defaultPositions = generateDefaultHand(metrics?.fingerBend || 0, metrics?.pinchAngle || 45);

    // Use landmarks if available, otherwise use default
    const points = landmarks && landmarks.length >= 21
        ? landmarks.map(l => ({
            x: (l.x - 0.5) * 2,
            y: (l.y - 0.5) * 2,
            z: l.z * 2
        }))
        : defaultPositions;

    // Apply 3D projection
    const projected = points.map(p => ({
        x: centerX + p.x * scale * (1 + p.z * 0.3),
        y: centerY + p.y * scale * (1 + p.z * 0.3),
        z: p.z
    }));

    // Draw palm
    ctx.fillStyle = 'rgba(0, 180, 216, 0.1)';
    ctx.beginPath();
    ctx.moveTo(projected[0].x, projected[0].y);
    [5, 9, 13, 17, 0].forEach(i => {
        ctx.lineTo(projected[i].x, projected[i].y);
    });
    ctx.fill();

    // Draw connections with 3D depth effect
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],     // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],     // Index
        [0, 9], [9, 10], [10, 11], [11, 12], // Middle
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
        [5, 9], [9, 13], [13, 17]           // Palm
    ];

    connections.forEach(([start, end]) => {
        const p1 = projected[start];
        const p2 = projected[end];
        const avgZ = (p1.z + p2.z) / 2;

        // Depth-based opacity and width
        const opacity = 0.4 + (avgZ + 1) * 0.3;
        const lineWidth = 1.5 + (avgZ + 1) * 0.75;

        ctx.strokeStyle = `rgba(0, 180, 216, ${opacity})`;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    });

    // Draw joints with 3D depth effect
    projected.forEach((point, index) => {
        const depth = (point.z + 1) / 2;
        const radius = 2 + depth * 3;

        // Fingertips are highlighted
        const isTip = [4, 8, 12, 16, 20].includes(index);
        const isWrist = index === 0;

        if (isTip) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
        } else if (isWrist) {
            ctx.fillStyle = 'rgba(196, 92, 62, 0.9)';
        } else {
            ctx.fillStyle = `rgba(0, 180, 216, ${0.5 + depth * 0.5})`;
        }

        ctx.beginPath();
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Highlight ring for tips
        if (isTip) {
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius + 3, 0, Math.PI * 2);
            ctx.stroke();
        }
    });

    // Draw pinch angle arc if thumb and index are close
    if (metrics && metrics.pinchAngle < 60) {
        const thumb = projected[4];
        const index = projected[8];
        const mcp = projected[5];

        ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(thumb.x, thumb.y);
        ctx.lineTo(mcp.x, mcp.y);
        ctx.lineTo(index.x, index.y);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// Generate default hand positions based on metrics
function generateDefaultHand(fingerBend: number, pinchAngle: number): { x: number; y: number; z: number }[] {
    const bendRad = (fingerBend / 100) * (Math.PI / 4); // Max 45 degrees bend

    // Base hand skeleton (normalized coordinates)
    const points: { x: number; y: number; z: number }[] = [];

    // Wrist
    points.push({ x: 0, y: 0.4, z: 0 });

    // Thumb (curved based on pinch angle)
    points.push({ x: -0.3, y: 0.25, z: 0.1 });
    points.push({ x: -0.4, y: 0.1, z: 0.15 });
    points.push({ x: -0.45, y: -0.05, z: 0.1 });
    points.push({ x: -0.4 + (1 - pinchAngle / 90) * 0.2, y: -0.15 + (1 - pinchAngle / 90) * 0.1, z: 0.05 });

    // Index finger (bent based on fingerBend)
    points.push({ x: -0.15, y: 0.1, z: 0 });
    points.push({ x: -0.18, y: -0.15 + bendRad * 0.3, z: -0.05 - bendRad * 0.1 });
    points.push({ x: -0.18, y: -0.35 + bendRad * 0.5, z: -0.1 - bendRad * 0.15 });
    points.push({ x: -0.15, y: -0.5 + bendRad * 0.7, z: -0.15 - bendRad * 0.2 });

    // Middle finger
    points.push({ x: 0, y: 0.05, z: 0 });
    points.push({ x: 0, y: -0.2 + bendRad * 0.2, z: -0.05 });
    points.push({ x: 0, y: -0.4 + bendRad * 0.4, z: -0.1 });
    points.push({ x: 0, y: -0.55 + bendRad * 0.6, z: -0.15 });

    // Ring finger
    points.push({ x: 0.15, y: 0.08, z: 0 });
    points.push({ x: 0.18, y: -0.15 + bendRad * 0.25, z: -0.05 });
    points.push({ x: 0.18, y: -0.35 + bendRad * 0.45, z: -0.1 });
    points.push({ x: 0.15, y: -0.48 + bendRad * 0.6, z: -0.12 });

    // Pinky finger
    points.push({ x: 0.3, y: 0.15, z: 0.05 });
    points.push({ x: 0.35, y: -0.05 + bendRad * 0.2, z: 0 });
    points.push({ x: 0.35, y: -0.2 + bendRad * 0.35, z: -0.05 });
    points.push({ x: 0.32, y: -0.32 + bendRad * 0.5, z: -0.08 });

    return points;
}
