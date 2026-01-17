import { useState, useRef, useEffect } from 'react';
import { RealtimeVision } from '@overshoot/sdk';
import CornerBrackets from './CornerBrackets';

interface ExpertAnalysisPayload {
  procedure: string;
  stats: {
    angle_mean: number;
    angle_std: number;
    angle_min: number;
    angle_max: number;
    speed_mean: number;
    speed_std: number;
    jitter_mean: number;
  };
  segments: Array<{
    t_start: number;
    t_end: number;
    type: string;
  }>;
}

interface ExpertVideoPanelProps {
  isAnalyzing: boolean;
  analysisComplete: boolean;
  onAnalysisStart: () => void;
  onAnalysisComplete: (payload: ExpertAnalysisPayload) => void;
  onNotesUpdate: (note: string) => void;
  onKeyPointsExtracted: (points: string[]) => void;
}

const OVERSHOOT_API_KEY = 'ovs_98bfb98aff5e49b4ec98f93e91ef455a';
const OVERSHOOT_API_URL = 'https://cluster1.overshoot.ai/api/v0.2';

const ANALYSIS_PROMPT = `You are an expert surgical instructor watching a training video. 
As you observe, provide concise observations about:
- Instrument handling technique
- Hand positioning and grip
- Incision angles and approach
- Procedural steps being demonstrated
- Any notable techniques or best practices

Keep each observation to 1-2 sentences. Focus on actionable teaching points.`;

export default function ExpertVideoPanel({
  isAnalyzing,
  analysisComplete,
  onAnalysisStart,
  onAnalysisComplete,
  onNotesUpdate,
  onKeyPointsExtracted,
}: ExpertVideoPanelProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visionRef = useRef<RealtimeVision | null>(null);
  const notesAccumulatorRef = useRef<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
    }
  };

  // Start analysis when video file is set
  useEffect(() => {
    if (videoFile) {
      startFileAnalysis();
    }
  }, [videoFile]);

  const startFileAnalysis = async () => {
    if (!videoFile) return;

    console.log('Starting Overshoot analysis for file:', videoFile.name);
    onAnalysisStart();
    notesAccumulatorRef.current = [];

    // Show initial status
    onNotesUpdate(`Starting AI analysis of "${videoFile.name}"...`);

    try {
      const vision = new RealtimeVision({
        apiUrl: OVERSHOOT_API_URL,
        apiKey: OVERSHOOT_API_KEY,
        prompt: ANALYSIS_PROMPT,
        source: { type: 'video', file: videoFile },
        processing: {
          clip_length_seconds: 2,  // 2 second windows for more context
          delay_seconds: 2,        // Get results every 2 seconds
          fps: 15,                 // Lower FPS for file processing
          sampling_ratio: 0.2,     // Sample 20% of frames
        },
        onResult: (result: any) => {
          console.log('Overshoot result received:', result);
          const note = result.result || result.text || result.message || (typeof result === 'string' ? result : JSON.stringify(result));
          if (note && note.trim() && note !== '{}') {
            notesAccumulatorRef.current.push(note);
            onNotesUpdate(note);
          }
        },
        onError: (error: any) => {
          console.error('Overshoot onError:', error);
          onNotesUpdate(`API Error: ${error.message || error}`);
        },
      });

      visionRef.current = vision;
      console.log('Starting vision.start()...');
      onNotesUpdate('Connecting to Overshoot AI...');
      await vision.start();
      console.log('vision.start() completed');
      onNotesUpdate('Processing video frames...');

      // Fallback timeout - complete analysis after 15 seconds if no results
      setTimeout(() => {
        if (!analysisComplete) {
          console.log('Fallback timeout triggered - completing analysis');
          if (notesAccumulatorRef.current.length === 0) {
            onNotesUpdate('Analysis complete - no observations generated from this video segment.');
          }
          completeAnalysis();
        }
      }, 15000); // 15 second timeout for demo

    } catch (error: any) {
      console.error('Overshoot analysis error:', error);
      onNotesUpdate(`Error: ${error.message || 'Failed to analyze video. Check console for details.'}`);
      // Fallback to completing with whatever notes we have
      setTimeout(() => completeAnalysis(), 2000);
    }
  };

  const completeAnalysis = async () => {
    // Stop the vision instance
    if (visionRef.current) {
      try {
        await visionRef.current.stop();
      } catch (e) {
        console.log('Vision already stopped');
      }
      visionRef.current = null;
    }

    // Extract key points from accumulated notes
    const allNotes = notesAccumulatorRef.current.join(' ');
    const keyPoints = extractKeyPoints(allNotes);
    onKeyPointsExtracted(keyPoints);

    // Generate mock payload for backwards compatibility
    const payload: ExpertAnalysisPayload = {
      procedure: 'surgical_technique',
      stats: {
        angle_mean: 15.2,
        angle_std: 2.8,
        angle_min: 10.5,
        angle_max: 22.1,
        speed_mean: 4.3,
        speed_std: 0.9,
        jitter_mean: 0.15,
      },
      segments: [
        { t_start: 0.0, t_end: 5.2, type: 'approach' },
        { t_start: 5.2, t_end: 12.8, type: 'procedure' },
        { t_start: 12.8, t_end: 18.5, type: 'technique' },
      ],
    };

    onAnalysisComplete(payload);
  };

  const extractKeyPoints = (text: string): string[] => {
    // Simple extraction: split by sentences and take key ones
    // In production, this could use another AI call
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const keyPoints: string[] = [];

    // Take up to 5 unique key points
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (trimmed && !keyPoints.includes(trimmed) && keyPoints.length < 5) {
        keyPoints.push(trimmed);
      }
    }

    // If no key points extracted, provide defaults
    if (keyPoints.length === 0) {
      return [
        'Maintain steady hand positioning',
        'Focus on controlled movements',
        'Observe proper technique angles',
      ];
    }

    return keyPoints;
  };

  const handleReset = () => {
    setVideoFile(null);
  };

  return (
    <div className="row-start-1 col-start-1">
      <CornerBrackets size="md" animated>
        <div className="h-full flex flex-col bg-[rgba(0,0,0,0.3)] [data-theme='light']:bg-[rgba(0,0,0,0.05)]">
          <div className="flex border-b border-[rgba(255,255,255,0.1)] [data-theme='light']:border-border-accent">
            <div className="flex-1 bg-transparent px-4 py-4 text-accent-rust uppercase text-xs tracking-wider border-b-2 border-accent-rust bg-accent-rust-glow">
              File Upload
            </div>
          </div>

          <div
            className={`h-full min-h-[400px] flex items-center justify-center cursor-pointer transition-all duration-300 border border-dashed border-[rgba(255,255,255,0.1)] [data-theme='light']:bg-[rgba(0,0,0,0.05)] [data-theme='light']:border-border-accent hover:bg-[rgba(0,180,216,0.05)] hover:border-accent-rust`}
            onClick={() => !videoFile && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="video/*"
              hidden
            />
            {videoFile ? (
              <div className="text-center">
                <span className="text-accent-rust">VIDEO_FILE</span>
                <p>{videoFile.name}</p>
                {isAnalyzing && (
                  <div className="w-[200px] h-1 bg-[rgba(255,255,255,0.1)] mx-auto my-4 rounded overflow-hidden [data-theme='light']:bg-[rgba(0,0,0,0.1)]">
                    <div className="h-full bg-accent-rust w-0 animate-[fillBar_3s_ease-out_forwards]" />
                  </div>
                )}
                {analysisComplete && (
                  <div className="mt-2 px-3 py-1 text-xs text-success border border-success uppercase">ANALYSIS COMPLETE</div>
                )}
                <button
                  className="mt-2 bg-transparent border-none text-text-muted underline cursor-pointer text-xs hover:text-error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="text-center">
                <span className="text-5xl block mb-4 text-accent-rust">↑</span>
                <p>Upload Surgical Procedure Video</p>
                <span className="text-xs text-text-dim">MP4, MOV supported</span>
              </div>
            )}
          </div>
        </div>
      </CornerBrackets>
    </div>
  );
}
