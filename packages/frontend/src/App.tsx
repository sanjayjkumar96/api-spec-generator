import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Components
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import CreateJob from './pages/CreateJob'
import JobResults from './pages/JobResults'
import { AuthProvider } from './contexts/AuthContext'
import { PWAInstaller } from './components/PWAInstaller'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="create" element={<CreateJob />} />
                <Route path="jobs/:jobId" element={<JobResults />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <PWAInstaller />
          </div>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App