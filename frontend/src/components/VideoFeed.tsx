import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import './VideoFeed.css';

/**
 * VideoFeed component with hand detection overlay support
 * Displays webcam feed with optional hand landmark visualization
 */
const VideoFeed = forwardRef(function VideoFeed({
    detectionBox,
    hands = [],
    gripState = null,
    showLandmarks = true,
    showSkeleton = true
}: any, ref: any) {
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
        if (!canvasRef.current || !hands.length) return;

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
            if (showSkeleton) {
                drawHandSkeleton(ctx, hand.landmarks, canvas.width, canvas.height);
            }
            if (showLandmarks) {
                drawHandLandmarks(ctx, hand.landmarks, canvas.width, canvas.height);
            }
        });
    }, [hands, showLandmarks, showSkeleton]);

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
        <div className="video-feed">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="video-element"
            />

            {/* Canvas for hand landmark overlay */}
            <canvas
                ref={canvasRef}
                className="landmark-canvas"
            />

            {/* Overlay effects */}
            <div className="video-overlay">
                {/* Corner targeting reticle */}
                <div className="reticle reticle-tl" />
                <div className="reticle reticle-tr" />
                <div className="reticle reticle-bl" />
                <div className="reticle reticle-br" />

                {/* Grid overlay */}
                <div className="grid-lines" />

                {/* Detection box (legacy support) */}
                {detectionBox && (
                    <div
                        className="detection-box"
                        style={{
                            left: `${detectionBox.x}%`,
                            top: `${detectionBox.y}%`,
                            width: `${detectionBox.width}%`,
                            height: `${detectionBox.height}%`,
                        }}
                    >
                        <span className="detection-label">HAND DETECTED</span>
                        <span className="detection-confidence">CONF: 0.{Math.floor(75 + Math.random() * 20)}</span>
                    </div>
                )}

                {/* Grip state indicator */}
                {gripState && (
                    <div className="grip-indicator" style={{ borderColor: getGripColor(gripState.state) }}>
                        <span className="grip-label" style={{ color: getGripColor(gripState.state) }}>
                            {gripState.state.toUpperCase().replace('_', ' ')}
                        </span>
                        <span className="grip-confidence">
                            CONF: {(gripState.confidence * 100).toFixed(0)}%
                        </span>
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div className="video-status-bar">
                <span className="status-item">
                    <span className="status-dot recording" />
                    REC
                </span>
                <span className="status-item">720p</span>
                <span className="status-item">30FPS</span>
                {hands.length > 0 && (
                    <span className="status-item" style={{ color: 'var(--success)' }}>
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

export default VideoFeed;
