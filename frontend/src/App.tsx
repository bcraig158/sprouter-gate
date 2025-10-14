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
import eventTracker from './services/eventTracking';

function App() {
  // Initialize global session tracking - NON-BLOCKING
  React.useEffect(() => {
    // Use setTimeout to ensure this doesn't block initial render
    const initializeAnalytics = async () => {
      try {
        // Check if user is already logged in and restore session
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        const sessionId = localStorage.getItem('sessionId');
        
        if (token && user && sessionId) {
          try {
            const userData = JSON.parse(user);
            console.log('Restoring session for user:', userData);
            
            // Initialize session tracking - NON-BLOCKING
            sessionTracker.initialize(
              userData.household_id || userData.student_id,
              userData.type === 'volunteer' ? 'volunteer' : 'student',
              sessionId
            );
            
            // Initialize event tracking - NON-BLOCKING
            eventTracker.setUser(
              userData.household_id || userData.student_id,
              userData.type === 'volunteer' ? 'volunteer' : 'student'
            );
            
            console.log('Session tracking restored successfully');
          } catch (error) {
            console.warn('Failed to restore session (non-blocking):', error);
            // DON'T clear user data on analytics errors - only clear on auth errors
            // Only clear if it's a JSON parse error or invalid token
            if (error instanceof SyntaxError) {
              console.warn('Invalid user data format, clearing session');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('sessionId');
            }
          }
        } else {
          console.log('No existing session found');
        }
      } catch (error) {
        console.error('Analytics initialization error (non-blocking):', error);
        // Don't block the app for analytics errors
      }
    };

    // Run analytics initialization asynchronously
    setTimeout(initializeAnalytics, 100);
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