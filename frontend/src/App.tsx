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
import LiveAnalyticsPage from './features/admin/LiveAnalyticsPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {

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
          
          <Route path="/live-analytics" element={
            <ProtectedRoute requireAdmin={true}>
              <LiveAnalyticsPage />
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