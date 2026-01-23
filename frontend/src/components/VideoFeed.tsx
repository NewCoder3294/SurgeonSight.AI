import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { drawHandSkeleton, drawHandLandmarks, drawAngleArc, drawPinchAngle, drawFingerBend } from '../utils/canvasDrawing';

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
    hands?: any[];
    gripState?: any;
    showLandmarks?: boolean;
    showSkeleton?: boolean;
    showMetrics?: boolean;
    metrics?: SurgicalMetrics | null;
    expertAngleTarget?: number; // Expert baseline angle for comparison
    detectedTool?: { type: string; confidence: number }; // Detected surgical tool
    onStreamReady?: (stream: MediaStream) => void;
}

/**
 * VideoFeed component with hand detection overlay support
 * Displays webcam feed with optional hand landmark visualization
 */
const VideoFeed = forwardRef(function VideoFeed({
    hands = [],
    gripState = null,
    showLandmarks = true,
    showSkeleton = true,
    showMetrics = true,
    metrics = null,
    expertAngleTarget: _expertAngleTarget,
    detectedTool,
    onStreamReady
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
        // Canvas has CSS -scale-x-100 to match video mirror, so draw at original positions
        hands.forEach((hand: any) => {
            const landmarks = hand.landmarks || hand;
            const handMetrics = hand.metrics || metrics;

            if (showSkeleton && landmarks.length > 0) {
                drawHandSkeleton(ctx, landmarks, canvas.width, canvas.height, false);
            }
            if (showLandmarks && landmarks.length > 0) {
                drawHandLandmarks(ctx, landmarks, canvas.width, canvas.height, false);
            }
            if (showMetrics && handMetrics && landmarks.length > 0) {
                drawAngleArc(ctx, landmarks, handMetrics.scalpelAngle, canvas.width, canvas.height, false);
                drawPinchAngle(ctx, landmarks, handMetrics.pinchAngle, canvas.width, canvas.height, false);
                drawFingerBend(ctx, landmarks, handMetrics.fingerBend, canvas.width, canvas.height, false);
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

            if (onStreamReady) {
                onStreamReady(stream);
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

            {/* Canvas for hand landmark overlay - mirrored to match video */}
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


                {/* Grip state indicator */}
                {gripState && (
                    <div className="absolute top-5 right-5 p-3 bg-[rgba(10,15,26,0.95)] border-4 backdrop-blur-md flex flex-col gap-1 [data-theme='light']:bg-[rgba(248,250,252,0.95)]" style={{ borderColor: getGripColor(gripState.state) }}>
                        <span className="font-display text-2xl tracking-widest font-bold shadow-black drop-shadow-md" style={{ color: getGripColor(gripState.state) }}>
                            {gripState.state.toUpperCase().replace('_', ' ')}
                        </span>
                        <span className="font-mono text-xs tracking-wider text-text-muted font-bold">
                            CONF: {(gripState.confidence * 100).toFixed(0)}%
                        </span>
                    </div>
                )}
            </div>



            {/* Detected Tool Indicator */}
            {detectedTool && detectedTool.type !== 'none' && detectedTool.confidence > 0.4 && (
                <div className="absolute top-5 right-48 p-3 bg-[rgba(10,15,26,0.95)] border-2 border-accent-rust backdrop-blur-md shadow-lg [data-theme='light']:bg-[rgba(248,250,252,0.95)]">
                    <div className="flex flex-col gap-1">
                        <span className="font-mono text-xs tracking-widest text-text-muted uppercase font-bold">Tool Detected</span>
                        <span className="font-display text-xl tracking-wider text-accent-rust uppercase font-bold">
                            {detectedTool.type.replace('_', ' ')}
                        </span>
                        <span className="font-mono text-xs tracking-wider text-text-muted">
                            CONF: {(detectedTool.confidence * 100).toFixed(0)}%
                        </span>
                    </div>
                </div>
            )}

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
                {detectedTool && detectedTool.type !== 'none' && (
                    <span className="font-mono text-xs tracking-wider text-accent-rust uppercase">
                        🔧 {detectedTool.type.replace('_', ' ')}
                    </span>
                )}
            </div>
        </div>
    );
});

export default VideoFeed;
