import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/contexts/AuthContext';
import { BlueprintProvider } from '@/contexts/BlueprintContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import AuthPage from '@/pages/AuthPage';
import BlueprintIndex from '@/pages/BlueprintIndex';
import CameraPlotIndex from '@/pages/CameraPlotIndex';
import SharedRundown from '@/pages/SharedRundown';
import OptimizedRundownIndexContent from '@/components/OptimizedRundownIndexContent';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Toaster />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <OptimizedRundownIndexContent />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/blueprint/:id"
            element={
              <ProtectedRoute>
                <BlueprintProvider>
                  <BlueprintIndex />
                </BlueprintProvider>
              </ProtectedRoute>
            }
          />
          <Route 
            path="/camera-plot/:id"
            element={
              <ProtectedRoute>
                <CameraPlotIndex />
              </ProtectedRoute>
            }
          />
          <Route path="/shared/:id" element={<SharedRundown />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
