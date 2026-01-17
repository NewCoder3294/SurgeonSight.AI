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
    <div className="upload-panel">
      <CornerBrackets size="md" animated>
        <div className="upload-container">
          <div className="upload-tabs">
            <button
              className={`tab-btn ${inputType === 'file' ? 'active' : ''}`}
              onClick={() => setInputType('file')}
            >
              File Upload
            </button>
            <button
              className={`tab-btn ${inputType === 'url' ? 'active' : ''}`}
              onClick={() => setInputType('url')}
            >
              YouTube URL
            </button>
          </div>

          {inputType === 'file' && (
            <div
              className={`upload-zone ${videoFile ? 'has-file' : ''}`}
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
                <div className="file-preview">
                  <span className="file-icon">VIDEO_FILE</span>
                  <p>{videoFile.name}</p>
                  {isAnalyzing && (
                    <div className="loading-bar">
                      <div className="bar-fill"></div>
                    </div>
                  )}
                  {analysisComplete && (
                    <div className="status-badge success">ANALYSIS COMPLETE</div>
                  )}
                  <button
                    className="btn-text"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="upload-cta">
                  <span className="upload-icon">↑</span>
                  <p>Upload Surgical Procedure Video</p>
                  <span className="sub-text">MP4, MOV supported</span>
                </div>
              )}
            </div>
          )}

          {inputType === 'url' && (
            <div className="url-input-zone">
              {!youtubeUrl ? (
                <div className="url-form">
                  <input
                    type="text"
                    className="input-text"
                    placeholder="Paste YouTube URL here..."
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleUrlSubmit}
                    disabled={!inputUrl}
                  >
                    Analyze Video
                  </button>
                </div>
              ) : (
                <div className="video-embed">
                  <iframe
                    width="100%"
                    height="100%"
                    src={getEmbedUrl(youtubeUrl)}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                  {isAnalyzing && (
                    <div className="loading-bar">
                      <div className="bar-fill"></div>
                    </div>
                  )}
                  {analysisComplete && (
                    <div className="status-badge success">ANALYSIS COMPLETE</div>
                  )}
                  <button
                    className="btn-text"
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
