import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function AdminAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Check if user is authenticated and is admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
        return;
      }
      if (!user.isAdmin) {
        navigate('/select');
        return;
      }
      // Redirect to new live analytics
      navigate('/live-analytics');
    }
  }, [user, authLoading, navigate]);

  // Loading state while redirecting
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to live analytics...</p>
        </div>
      </div>
    );
  }

  return null; // This component just redirects
}