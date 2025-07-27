import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DocumentGenerator from './pages/DocumentGenerator';
import DocumentView from './pages/DocumentView';
import PromptLibrary from './pages/PromptLibrary';

function App() {
  const { user } = useAuthStore();

  if (!user) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/generate" element={<DocumentGenerator />} />
      <Route path="/document/:id" element={<DocumentView />} />
      <Route path="/prompts" element={<PromptLibrary />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;