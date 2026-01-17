import { useState, useRef } from 'react';
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
}

export default function ExpertVideoPanel({
  isAnalyzing,
  analysisComplete,
  onAnalysisStart,
  onAnalysisComplete,
}: ExpertVideoPanelProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [inputType, setInputType] = useState<'file' | 'url'>('file');
  const [inputUrl, setInputUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      startAnalysis();
    }
  };

  const handleUrlSubmit = () => {
    if (inputUrl) {
      setYoutubeUrl(inputUrl);
      startAnalysis();
    }
  };

  const getEmbedUrl = (url: string) => {
    try {
      const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
      return `https://www.youtube.com/embed/${videoId}`;
    } catch (e) {
      return url;
    }
  };

  const startAnalysis = () => {
    onAnalysisStart();
    
    // Simulate CV processing
    setTimeout(() => {
      // Generate mock expert analysis payload
      const mockPayload: ExpertAnalysisPayload = {
        procedure: 'straight_incision',
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
          { t_start: 5.2, t_end: 12.8, type: 'incision' },
          { t_start: 12.8, t_end: 18.5, type: 'hemostasis' },
          { t_start: 18.5, t_end: 25.0, type: 'closure' },
        ],
      };
      
      onAnalysisComplete(mockPayload);
    }, 3000);
  };

  const handleReset = () => {
    setVideoFile(null);
    setYoutubeUrl('');
    setInputUrl('');
  };

  return (
    <div className="row-start-1 col-start-1">
      <CornerBrackets size="md" animated>
        <div className="h-full flex flex-col bg-[rgba(0,0,0,0.3)] [data-theme='light']:bg-[rgba(0,0,0,0.05)]">
          <div className="flex border-b border-[rgba(255,255,255,0.1)] [data-theme='light']:border-border-accent">
            <button
              className={`flex-1 bg-transparent border-none px-4 py-4 text-text-muted cursor-pointer uppercase text-xs tracking-wider transition-all duration-200 hover:text-text-cream hover:bg-[rgba(255,255,255,0.05)] [data-theme='light']:hover:bg-[rgba(0,0,0,0.05)] ${inputType === 'file' ? 'text-accent-rust border-b-2 border-accent-rust bg-accent-rust-glow' : ''}`}
              onClick={() => setInputType('file')}
            >
              File Upload
            </button>
            <button
              className={`flex-1 bg-transparent border-none px-4 py-4 text-text-muted cursor-pointer uppercase text-xs tracking-wider transition-all duration-200 hover:text-text-cream hover:bg-[rgba(255,255,255,0.05)] [data-theme='light']:hover:bg-[rgba(0,0,0,0.05)] ${inputType === 'url' ? 'text-accent-rust border-b-2 border-accent-rust bg-accent-rust-glow' : ''}`}
              onClick={() => setInputType('url')}
            >
              YouTube URL
            </button>
          </div>

          {inputType === 'file' && (
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
          )}

          {inputType === 'url' && (
            <div className="flex-1 flex items-center justify-center p-8 min-h-[350px]">
              {!youtubeUrl ? (
                <div className="w-full max-w-[400px] flex flex-col gap-4">
                  <input
                    type="text"
                    className="w-full px-4 py-3 bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.1)] rounded text-text-cream text-base [data-theme='light']:bg-white [data-theme='light']:border-border-subtle"
                    placeholder="Paste YouTube URL here..."
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                  />
                  <button
                    className="px-6 py-3 font-display tracking-wider text-text-cream bg-accent-rust border-2 border-accent-rust transition-all duration-250 hover:bg-accent-rust-light hover:border-accent-rust-light disabled:opacity-50"
                    onClick={handleUrlSubmit}
                    disabled={!inputUrl}
                  >
                    Analyze Video
                  </button>
                </div>
              ) : (
                <div className="w-full h-full min-h-[400px] relative flex flex-col">
                  <iframe
                    width="100%"
                    height="100%"
                    className="flex-1 rounded bg-black"
                    src={getEmbedUrl(youtubeUrl)}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                  {isAnalyzing && (
                    <div className="w-[200px] h-1 bg-[rgba(255,255,255,0.1)] mx-auto my-4 rounded overflow-hidden [data-theme='light']:bg-[rgba(0,0,0,0.1)]">
                      <div className="h-full bg-accent-rust w-0 animate-[fillBar_3s_ease-out_forwards]" />
                    </div>
                  )}
                  {analysisComplete && (
                    <div className="mt-2 px-3 py-1 text-xs text-success border border-success uppercase text-center">ANALYSIS COMPLETE</div>
                  )}
                  <button
                    className="mt-2 bg-transparent border-none text-text-muted underline cursor-pointer text-xs hover:text-error self-center"
                    onClick={() => {
                      handleReset();
                    }}
                  >
                    Change Video
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </CornerBrackets>
    </div>
  );
}
