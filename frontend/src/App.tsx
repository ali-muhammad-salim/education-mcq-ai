import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import UploadPage from './pages/UploadPage';
import MCQViewer from './pages/MCQViewer';
import ReviewPage from './pages/ReviewPage';
import TrainingDataPage from './pages/TrainingDataPage';
import FineTuningPage from './pages/FineTuningPage';
import BoardManagementPage from './pages/BoardManagementPage';
import { Database, Upload, CheckSquare, Settings, CheckCircle, BookOpen } from 'lucide-react';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <nav className="sidebar">
          <h2>MCQ AI Admin</h2>
          <ul>
            <li>
              <Link to="/"><Upload size={18} /> Upload Data</Link>
            </li>
            <li>
              <Link to="/mcqs"><Database size={18} /> View MCQs</Link>
            </li>
            <li>
              <Link to="/review"><CheckSquare size={18} /> Review Queue</Link>
            </li>
            <li>
              <Link to="/training-data"><CheckCircle size={18} /> Approved Data</Link>
            </li>
            <li>
              <Link to="/boards"><BookOpen size={18} /> Syllabus & Boards</Link>
            </li>
            <li>
              <Link to="/fine-tuning"><Settings size={18} /> Fine-Tuning</Link>
            </li>
          </ul>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/mcqs" element={<MCQViewer />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/training-data" element={<TrainingDataPage />} />
            <Route path="/boards" element={<BoardManagementPage />} />
            <Route path="/fine-tuning" element={<FineTuningPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
