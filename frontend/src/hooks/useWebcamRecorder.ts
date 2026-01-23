/**
 * useWebcamRecorder - Periodic clip recording from webcam stream
 *
 * Records short video clips at regular intervals using MediaRecorder API.
 * Used for sending clips to Overshoot for real-time AI analysis.
 */

import { useRef, useEffect, useCallback, useState } from 'react';

export interface UseWebcamRecorderOptions {
  stream: MediaStream | null;
  clipDurationMs: number;       // Duration of each clip (e.g., 5000ms)
  intervalMs: number;           // Time between clip starts (e.g., 10000ms)
  onClipReady: (file: File) => void;
  enabled: boolean;
  mimeType?: string;            // Defaults to 'video/webm'
}

export interface UseWebcamRecorderReturn {
  isRecording: boolean;
  clipCount: number;
  error: string | null;
  forceCapture: () => void;     // Manually trigger a clip capture
}

// Get supported MIME type for MediaRecorder
function getSupportedMimeType(): string {
  const types = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }

  return 'video/webm'; // Fallback
}

export function useWebcamRecorder({
  stream,
  clipDurationMs,
  intervalMs,
  onClipReady,
  enabled,
  mimeType,
}: UseWebcamRecorderOptions): UseWebcamRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [clipCount, setClipCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onClipReadyRef = useRef(onClipReady);

  // Keep callback ref updated
  useEffect(() => {
    onClipReadyRef.current = onClipReady;
  }, [onClipReady]);

  // Start recording a clip
  const startRecording = useCallback(() => {
    if (!stream || mediaRecorderRef.current?.state === 'recording') {
      return;
    }

    try {
      const resolvedMimeType = mimeType || getSupportedMimeType();
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: resolvedMimeType,
        videoBitsPerSecond: 1000000, // 1 Mbps - balance quality and size
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        setIsRecording(false);

        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: resolvedMimeType });
          const timestamp = Date.now();
          const extension = resolvedMimeType.includes('mp4') ? 'mp4' : 'webm';
          const file = new File([blob], `clip_${timestamp}.${extension}`, {
            type: resolvedMimeType,
            lastModified: timestamp,
          });

          setClipCount((prev) => prev + 1);
          onClipReadyRef.current(file);
        }

        chunksRef.current = [];
      };

      recorder.onerror = (event: Event) => {
        console.error('[WebcamRecorder] Recording error:', event);
        setError('Recording failed');
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      // Stop recording after clip duration
      recordingTimeoutRef.current = setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, clipDurationMs);

    } catch (err: any) {
      console.error('[WebcamRecorder] Failed to start recording:', err);
      setError(err.message || 'Failed to start recording');
    }
  }, [stream, clipDurationMs, mimeType]);

  // Force capture a clip immediately
  const forceCapture = useCallback(() => {
    if (enabled && stream) {
      startRecording();
    }
  }, [enabled, stream, startRecording]);

  // Set up interval for periodic recording
  useEffect(() => {
    if (!enabled || !stream) {
      // Clean up if disabled
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    // Start first recording after a short delay
    const initialDelay = setTimeout(() => {
      startRecording();
    }, 2000); // Wait 2 seconds before first clip

    // Set up interval for subsequent recordings
    intervalIdRef.current = setInterval(() => {
      startRecording();
    }, intervalMs);

    return () => {
      clearTimeout(initialDelay);
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [enabled, stream, intervalMs, startRecording]);

  return {
    isRecording,
    clipCount,
    error,
    forceCapture,
  };
}

export default useWebcamRecorder;
