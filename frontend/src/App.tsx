import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import LandingPage from './pages/LandingPage';
import CameraSetup from './components/CameraSetup';
import CoachingSession from './components/CoachingSession';
import TrainingSession from './pages/TrainingSession';

// Log API configuration status on startup (dev only)
import './utils/apiDiagnostics';

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-bg-primary">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/setup" element={<CameraSetup />} />
          {/* Standalone session route if needed, or we can replace it */}
          <Route path="/session" element={<CoachingSession />} />
          <Route path="/training" element={<TrainingSession />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;
