import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Landing from './components/Landing';
import CameraSetup from './components/CameraSetup';
import CoachingSession from './components/CoachingSession';
import SessionSummary from './components/SessionSummary';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="app">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/setup" element={<CameraSetup />} />
            <Route path="/session" element={<CoachingSession />} />
            <Route path="/summary" element={<SessionSummary />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
