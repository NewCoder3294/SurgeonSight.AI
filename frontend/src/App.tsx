import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Landing from './components/Landing';
import CameraSetup from './components/CameraSetup';
import CoachingSession from './components/CoachingSession';
import TrainingSession from './components/TrainingSession';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<Landing />} />
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
