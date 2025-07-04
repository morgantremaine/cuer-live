import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import TeamSettings from './pages/TeamSettings';
import Rundown from './pages/Rundown';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThemeProvider } from './context/ThemeContext';
import Changelog from './pages/Changelog';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/team-settings/:teamId"
                element={
                  <PrivateRoute>
                    <TeamSettings />
                  </PrivateRoute>
                }
              />
              <Route
                path="/rundown/:rundownId"
                element={
                  <PrivateRoute>
                    <Rundown />
                  </PrivateRoute>
                }
              />
              <Route path="/changelog" element={<Changelog />} />
            </Routes>
          </Router>
          <ToastContainer position="bottom-right" />
        </AuthProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
