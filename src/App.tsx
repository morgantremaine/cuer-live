
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import Blueprint from '@/pages/Blueprint';
import CameraPlotEditor from '@/pages/CameraPlotEditor';
import Teleprompter from '@/pages/Teleprompter';
import SharedRundown from '@/pages/SharedRundown';
import ResetPassword from '@/pages/ResetPassword';
import AuthCallback from '@/pages/AuthCallback';
import JoinTeam from '@/pages/JoinTeam';
import AccountManagement from '@/pages/AccountManagement';
import Help from '@/pages/Help';
import NotFound from '@/pages/NotFound';
import ProtectedRoute from '@/components/ProtectedRoute';
import RealtimeConnectionProvider from '@/components/RealtimeConnectionProvider';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RealtimeConnectionProvider isConnected={false} isProcessingUpdate={false}>
          <Router>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/join/:token" element={<JoinTeam />} />
              <Route path="/shared/:id" element={<SharedRundown />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/blueprint/:id" element={
                <ProtectedRoute>
                  <Blueprint />
                </ProtectedRoute>
              } />
              <Route path="/cameraplot/:id" element={
                <ProtectedRoute>
                  <CameraPlotEditor />
                </ProtectedRoute>
              } />
              <Route path="/teleprompter/:rundownId" element={<Teleprompter />} />
              <Route path="/account" element={
                <ProtectedRoute>
                  <AccountManagement />
                </ProtectedRoute>
              } />
              <Route path="/help" element={<Help />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Toaster />
          </Router>
        </RealtimeConnectionProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
