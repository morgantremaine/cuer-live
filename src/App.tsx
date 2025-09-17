
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import AppUpdateNotification from "@/components/AppUpdateNotification";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useLoggerAuth } from "@/hooks/useLoggerAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AccountManagement from "./pages/AccountManagement";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import JoinTeam from "./pages/JoinTeam";
import NotFound from "./pages/NotFound";
import Help from "./pages/Help";
import Subscription from "./pages/Subscription";
import ProtectedRoute from "./components/ProtectedRoute";
import SharedRundown from "./pages/SharedRundown";
import ADView from "./pages/ADView";
import Teleprompter from "./pages/Teleprompter";
import Blueprint from "./pages/Blueprint";
import CameraPlotEditor from "./pages/CameraPlotEditor";
import RundownWithTabs from "./components/RundownWithTabs";
import LandingPage from "./components/LandingPage";
import Changelog from "./pages/Changelog";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DeleteTestUser from "./pages/DeleteTestUser";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  // Initialize logger auth sync
  useLoggerAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Landing page for non-authenticated users */}
      <Route 
        path="/" 
        element={user ? <Navigate to="/dashboard" replace /> : <LandingPage />} 
      />
      
      {/* Public routes */}
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/demo" element={<Index />} />
      <Route path="/shared/rundown/:id" element={<SharedRundown />} />
      <Route path="/ad-view/:id" element={<ADView />} />
      <Route path="/join-team/:token" element={<JoinTeam />} />
      <Route path="/help" element={<Help />} />
      <Route path="/changelog" element={<Changelog />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/delete-test-user" element={<DeleteTestUser />} />
      
      {/* Auth callback routes */}
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      
      {/* Protected routes - ALL require subscription except /subscription */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute requiresSubscription={true}>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/subscription" 
        element={
          <ProtectedRoute requiresSubscription={false}>
            <Subscription />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/account" 
        element={
          <ProtectedRoute requiresSubscription={true}>
            <AccountManagement />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/rundown" 
        element={
          <ProtectedRoute requiresSubscription={true}>
            <Index />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/rundown/:id" 
        element={
          <ProtectedRoute requiresSubscription={true}>
            <RundownWithTabs />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/rundown/:id/blueprint" 
        element={
          <ProtectedRoute requiresSubscription={true}>
            <RundownWithTabs />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/rundown/:id/camera-plot-editor" 
        element={
          <ProtectedRoute requiresSubscription={true}>
            <RundownWithTabs />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/rundown/:id/teleprompter" 
        element={
          <ProtectedRoute requiresSubscription={true}>
            <RundownWithTabs />
          </ProtectedRoute>
        } 
      />
      {/* Legacy routes for backward compatibility */}
      <Route 
        path="/blueprint/:id" 
        element={
          <ProtectedRoute requiresSubscription={true}>
            <RundownWithTabs />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/camera-plot-editor/:id" 
        element={
          <ProtectedRoute requiresSubscription={true}>
            <RundownWithTabs />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/teleprompter/:id" 
        element={
          <ProtectedRoute requiresSubscription={true}>
            <RundownWithTabs />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary fallbackTitle="Application Error">
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppUpdateNotification />
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
