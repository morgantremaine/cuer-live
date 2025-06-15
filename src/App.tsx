
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import { useAuth } from '@/hooks/useAuth';
import { AuthProvider } from '@/hooks/useAuth';
import { BlueprintProvider } from '@/contexts/BlueprintContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Blueprint from '@/pages/Blueprint';
import CameraPlotEditor from '@/pages/CameraPlotEditor';
import SharedRundown from '@/pages/SharedRundown';
import OptimizedRundownIndexContent from '@/components/OptimizedRundownIndexContent';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Toaster />
          <Routes>
            <Route path="/auth" element={<Login />} />
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
                    <Blueprint />
                  </BlueprintProvider>
                </ProtectedRoute>
              }
            />
            <Route 
              path="/camera-plot/:id"
              element={
                <ProtectedRoute>
                  <CameraPlotEditor />
                </ProtectedRoute>
              }
            />
            <Route path="/shared/:id" element={<SharedRundown />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
