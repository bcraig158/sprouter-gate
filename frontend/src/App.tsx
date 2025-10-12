import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './features/auth/LoginPage';
import VolunteerLoginPage from './features/auth/VolunteerLoginPage';
import SelectPage from './features/select/SelectPage';
import VolunteerSelectPage from './features/select/VolunteerSelectPage';
import PurchasePage from './features/purchase/PurchasePage';
import StatusPage from './features/status/StatusPage';
import AdminAnalyticsPage from './features/admin/AdminAnalyticsPage';
import ProtectedRoute from './components/ProtectedRoute';
import sessionTracker from './services/sessionTracking';

function App() {
  // Initialize global session tracking for anonymous users
  React.useEffect(() => {
    // Start tracking anonymous sessions immediately
    const anonymousSessionId = `anonymous_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionTracker.initialize('anonymous', 'student', anonymousSessionId);
    
    // Track initial page view
    sessionTracker.trackPageView(window.location.pathname);
    
    console.log('Global session tracking initialized');
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/volunteer-login" element={<VolunteerLoginPage />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          
          {/* Protected routes with Layout */}
          <Route path="/select" element={
            <ProtectedRoute>
              <Layout showBackButton maxWidth="full">
                <SelectPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/volunteer-select" element={
            <ProtectedRoute>
              <Layout showBackButton maxWidth="full">
                <VolunteerSelectPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/purchase/:eventKey" element={
            <ProtectedRoute>
              <PurchasePage />
            </ProtectedRoute>
          } />
          
          <Route path="/status" element={
            <ProtectedRoute>
              <Layout showBackButton maxWidth="lg">
                <StatusPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin-analytics" element={
            <ProtectedRoute requireAdmin={true}>
              <AdminAnalyticsPage />
            </ProtectedRoute>
          } />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;