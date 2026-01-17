import { useState, useRef } from 'react';
import CornerBrackets from './CornerBrackets';
import ThemeToggle from './ThemeToggle';
import CoachingSession from './CoachingSession';
import './TrainingSession.css';

// Mock data for AI output
const MOCK_AI_NOTES = [
    "Incision made at 15 degrees relative to tissue plane.",
    "Hemostasis maintained throughout initial cut.",
    "Forceps grip indicates good stability.",
    "Retraction applied evenly, minimizing tissue trauma."
];

const MOCK_KEY_POINTS = [
    "Maintain constant tension on the suture",
    "Keep needle perpendicular to tissue",
    "Rotate wrist fully for smooth exit",
    "Watch spacing between sutures"
];

export default function TrainingSession() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [inputType, setInputType] = useState<'file' | 'url'>('file');
    const [inputUrl, setInputUrl] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisComplete, setAnalysisComplete] = useState(false);
    const [notes, setNotes] = useState<string[]>([]);
    const [keyPoints, setKeyPoints] = useState<string[]>([]);
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
        setIsAnalyzing(true);
        // Simulate AI processing time
        setTimeout(() => {
            setNotes(MOCK_AI_NOTES);
            setKeyPoints(MOCK_KEY_POINTS);
            setIsAnalyzing(false);
            setAnalysisComplete(true);
        }, 3000); // 3 seconds "processing"
    };

    return (
        <div className="training-page">
            {/* Header - Simplified */}
            <header className="training-header">
                <div className="logo-section">
                    <h1>SurgeonSight <span className="highlight">Training</span></h1>
                </div>
                <div className="header-controls">
                    <ThemeToggle />
                </div>
            </header>

            <main className="training-content">
                {/* Component 1: Video Analysis */}
                <section className={`analysis-module ${analysisComplete ? 'completed' : ''}`}>
                    <div className="section-header">
                        <CornerBrackets size="sm">
                            <h2>01. Procedure Analysis</h2>
                        </CornerBrackets>
                    </div>

                    <div className="analysis-grid">
                        {/* Left Column: AI Notes */}
                        <div className="notes-panel panel-glass">
                            <h3><span className="icon">◈</span> AI Observation Log</h3>
                            <div className="notes-content">
                                {isAnalyzing ? (
                                    <div className="typing-indicator">AI Analyzing video frames...</div>
                                ) : notes.length > 0 ? (
                                    <ul className="notes-list fa-ul">
                                        {notes.map((note, i) => (
                                            <li key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.2}s` }}>
                                                <span className="fa-li">›</span> {note}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="empty-state">Upload video to generate observations</div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Video Upload */}
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

                                    {/* File Upload Mode */}
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
                                                    {isAnalyzing && <div className="loading-bar"><div className="bar-fill"></div></div>}
                                                    {analysisComplete && <div className="status-badge success">ANALYSIS COMPLETE</div>}
                                                    <button className="btn-text" onClick={(e) => {
                                                        e.stopPropagation();
                                                        setVideoFile(null);
                                                        setAnalysisComplete(false);
                                                        setNotes([]);
                                                        setKeyPoints([]);
                                                    }}>Remove</button>
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

                                    {/* URL Mode */}
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
                                                    {isAnalyzing && <div className="loading-bar"><div className="bar-fill"></div></div>}
                                                    {analysisComplete && <div className="status-badge success">ANALYSIS COMPLETE</div>}
                                                    <button className="btn-text" onClick={() => {
                                                        setYoutubeUrl('');
                                                        setAnalysisComplete(false);
                                                        setNotes([]);
                                                        setKeyPoints([]);
                                                    }}>Change Video</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CornerBrackets>
                        </div>

                        {/* Bottom Row: Key Points */}
                        <div className="keypoints-panel panel-glass">
                            <h3><span className="icon">⚠</span> Critical Key Points</h3>
                            <div className="keypoints-content">
                                {analysisComplete ? (
                                    <div className="tags-container">
                                        {keyPoints.map((point, i) => (
                                            <span key={i} className="kp-tag animate-pop-in" style={{ animationDelay: `${i * 0.1}s` }}>
                                                {point}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state-small">Pending analysis...</div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <div className="connector-line"></div>

                {/* Component 2: Live Practice (Blurred until complete) */}
                <section className={`practice-module ${!analysisComplete ? 'locked blur-content' : 'unlocked'}`}>
                    <div className="section-header">
                        <CornerBrackets size="sm">
                            <h2>02. Live Reproduction</h2>
                        </CornerBrackets>
                    </div>

                    <div className="practice-container">
                        {!analysisComplete && (
                            <div className="lock-overlay">
                                <span className="lock-icon">🔒</span>
                                <p>Complete Analysis Phase to Unlock</p>
                            </div>
                        )}
                        {/* Reuse CoachingSession but stripped down via generic container styles or props if I add them */}
                        <CoachingSession embedded={true} />
                    </div>
                </section>
            </main>
        </div>
    );
}
