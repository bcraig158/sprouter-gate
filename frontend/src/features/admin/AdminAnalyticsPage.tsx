import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Removed unused interfaces

interface AnalyticsData {
  totalLogins: number;
  studentLogins: number;
  volunteerLogins: number;
  totalShowSelections: number;
  totalPurchases: number;
  totalRevenue: number;
  showBreakdown: {
    [key: string]: {
      selections: number;
      purchases: number;
      conversion_rate: number;
      revenue: number;
    };
  };
  recentActivity: Array<{
    activity_type: string;
    activity_details: string;
    activity_timestamp: string;
    user_id: string;
    user_type: string;
  }>;
  topUsers: Array<{
    user_id: string;
    user_type: string;
    identifier: string;
    name: string;
    total_selections: number;
    total_purchase_intents: number;
    total_purchases: number;
    total_sprouter_successes: number;
    total_spent: number;
    last_activity: string;
  }>;
  limitViolations: Array<any>;
  timeframe: string;
  enhancedAnalytics?: {
    loginFrequency: { [userId: string]: any };
    userSessions: { [userId: string]: any };
    domainActivity: { [domain: string]: any };
    timePatterns: { [hour: string]: number };
    eventInteractions: { [eventKey: string]: any };
    userEventPatterns: { [userId: string]: any };
    checkoutAttempts: { [userId: string]: any };
    summary: {
      totalUniqueUsers: number;
      totalLogins: number;
      averageLoginsPerUser: number;
      mostActiveUsers: Array<[string, any]>;
      domainBreakdown: Array<{ domain: string; totalLogins: number; uniqueUsers: number }>;
      peakHours: Array<[string, number]>;
      eventEngagement: Array<{ eventKey: string; totalViews: number; uniqueUsers: number; averageViewsPerUser: number }>;
      sameNightCheckouts: Array<{ userId: string; sameNightDates: string[]; totalSameNightAttempts: number }>;
    };
  };
}

export default function AdminAnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [activeTab, setActiveTab] = useState<'overview' | 'enhanced' | 'users' | 'shows' | 'revenue'>('overview');

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
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && user && user.isAdmin) {
      fetchAnalyticsData();
    }
  }, [selectedTimeframe, authLoading, user]);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch enhanced analytics data from backend
      const response = await fetch(`/api/analytics?timeframe=${selectedTimeframe}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      // Show empty state instead of mock data
      const emptyData: AnalyticsData = {
        totalLogins: 0,
        studentLogins: 0,
        volunteerLogins: 0,
        totalShowSelections: 0,
        totalPurchases: 0,
        totalRevenue: 0,
        showBreakdown: {
          'tue-530': { selections: 0, purchases: 0, revenue: 0, conversion_rate: 0 },
          'tue-630': { selections: 0, purchases: 0, revenue: 0, conversion_rate: 0 },
          'thu-530': { selections: 0, purchases: 0, revenue: 0, conversion_rate: 0 },
          'thu-630': { selections: 0, purchases: 0, revenue: 0, conversion_rate: 0 }
        },
        recentActivity: [],
        topUsers: [],
        limitViolations: [],
        timeframe: selectedTimeframe
      };
      setAnalyticsData(emptyData);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Analytics Dashboard</h1>
              <p className="text-gray-600 mt-1">Starstruck Dance Show 2025 - Real-time Analytics</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
              <button
                onClick={() => navigate('/volunteer-login')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'enhanced', label: 'Enhanced Analytics', icon: '🔍' },
              { id: 'users', label: 'Users', icon: '👥' },
              { id: 'shows', label: 'Shows', icon: '🎭' },
              { id: 'revenue', label: 'Revenue', icon: '💰' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border-2 border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && analyticsData && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Logins</p>
                    <p className="text-3xl font-bold text-gray-900">{analyticsData.totalLogins}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <span className="text-green-600 font-medium">Students: {analyticsData.studentLogins}</span>
                  <span className="text-gray-300 mx-2">|</span>
                  <span className="text-blue-600 font-medium">Volunteers: {analyticsData.volunteerLogins}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Show Selections</p>
                    <p className="text-3xl font-bold text-gray-900">{analyticsData.totalShowSelections}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎭</span>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  Across all show times
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                    <p className="text-3xl font-bold text-gray-900">{analyticsData.totalPurchases}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎫</span>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  Completed transactions
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(analyticsData.totalRevenue)}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  From ticket sales
                </div>
              </div>
            </div>

            {/* Enhanced Show Breakdown */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Enhanced Show Performance Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(analyticsData.showBreakdown).map(([showId, data]) => (
                  <div key={showId} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">
                      {showId === 'tue-530' && 'Tuesday 5:30 PM'}
                      {showId === 'tue-630' && 'Tuesday 6:30 PM'}
                      {showId === 'thu-530' && 'Thursday 5:30 PM'}
                      {showId === 'thu-630' && 'Thursday 6:30 PM'}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Selections:</span>
                        <span className="font-semibold">{data.selections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conversion Rate:</span>
                        <span className="font-semibold text-blue-600">{data.conversion_rate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed Purchases:</span>
                        <span className="font-semibold text-green-600">{data.purchases}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Revenue:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(data.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conversion Rate:</span>
                        <span className="font-semibold text-orange-600">{data.conversion_rate}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Volunteer vs Student Analytics */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Volunteer vs Student Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Student Analytics */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                    <span className="mr-2">👨‍🎓</span>
                    Student Analytics
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Total Logins:</span>
                      <span className="font-semibold text-blue-800">{analyticsData.studentLogins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Daily Purchase Limit:</span>
                      <span className="font-semibold text-blue-800">2 tickets</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">User Type:</span>
                      <span className="font-semibold text-blue-800">Students</span>
                    </div>
                    <div className="text-sm text-blue-600 mt-4">
                      Students can purchase up to 2 tickets per day with their Student ID
                    </div>
                  </div>
                </div>

                {/* Volunteer Analytics */}
                <div className="bg-green-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                    <span className="mr-2">👨‍💼</span>
                    Volunteer Analytics
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-green-700">Total Logins:</span>
                      <span className="font-semibold text-green-800">{analyticsData.volunteerLogins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Daily Purchase Limit:</span>
                      <span className="font-semibold text-green-800">4 tickets</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">User Type:</span>
                      <span className="font-semibold text-green-800">Volunteers</span>
                    </div>
                    <div className="text-sm text-green-600 mt-4">
                      Volunteers can purchase up to 4 tickets per day with their volunteer code
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Recent Activity */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Enhanced Activity Timeline</h3>
              <div className="space-y-4">
                {analyticsData.recentActivity.slice(0, 15).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        activity.activity_type === 'login' ? 'bg-blue-100' :
                        activity.activity_type === 'show_selection' ? 'bg-green-100' :
                        activity.activity_type === 'purchase_intent' ? 'bg-yellow-100' :
                        activity.activity_type === 'purchase_completed' ? 'bg-purple-100' :
                        activity.activity_type === 'sprouter_success' ? 'bg-pink-100' :
                        'bg-gray-100'
                      }`}>
                        <span className="text-lg">
                          {activity.activity_type === 'login' ? '👤' :
                           activity.activity_type === 'show_selection' ? '🎭' :
                           activity.activity_type === 'purchase_intent' ? '🛒' :
                           activity.activity_type === 'purchase_completed' ? '✅' :
                           activity.activity_type === 'sprouter_success' ? '🎫' :
                           '📊'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {activity.activity_type.replace('_', ' ').toUpperCase()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {activity.activity_details}
                        </p>
                        <p className="text-xs text-gray-500">
                          User: {activity.user_id} ({activity.user_type})
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {formatDate(activity.activity_timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Analytics Tab */}
        {activeTab === 'enhanced' && analyticsData && analyticsData.enhancedAnalytics && (
          <div className="space-y-8">
            {/* User Behavior Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📊</span>
                  Login Frequency Analysis
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Unique Users:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {analyticsData.enhancedAnalytics.summary.totalUniqueUsers}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Logins per User:</span>
                    <span className="text-xl font-semibold text-green-600">
                      {analyticsData.enhancedAnalytics.summary.averageLoginsPerUser.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Most Active Users:</h4>
                    <div className="space-y-2">
                      {analyticsData.enhancedAnalytics.summary.mostActiveUsers.slice(0, 5).map(([userId, data]) => (
                        <div key={userId} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                          <span className="text-sm font-medium">{userId}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">{data.totalLogins} logins</span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              {data.domains.length} domains
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🌐</span>
                  Domain Activity
                </h3>
                <div className="space-y-3">
                  {analyticsData.enhancedAnalytics.summary.domainBreakdown.map((domain) => (
                    <div key={domain.domain} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                      <span className="font-medium text-gray-800">{domain.domain}</span>
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-gray-600">{domain.totalLogins} logins</span>
                        <span className="text-sm text-blue-600">{domain.uniqueUsers} users</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Peak Hours Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">⏰</span>
                Peak Activity Hours
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {analyticsData.enhancedAnalytics.summary.peakHours.map(([hour, count]) => (
                  <div key={hour} className="text-center bg-blue-50 p-3 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{count}</div>
                    <div className="text-sm text-gray-600">{hour}:00</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Event Engagement Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🎭</span>
                Event Engagement Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analyticsData.enhancedAnalytics.summary.eventEngagement.map((event) => (
                  <div key={event.eventKey} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-800">
                        {event.eventKey === 'tue-530' && 'Tuesday 5:30 PM'}
                        {event.eventKey === 'tue-630' && 'Tuesday 6:30 PM'}
                        {event.eventKey === 'thu-530' && 'Thursday 5:30 PM'}
                        {event.eventKey === 'thu-630' && 'Thursday 6:30 PM'}
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Views:</span>
                        <span className="font-semibold">{event.totalViews}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Users:</span>
                        <span className="font-semibold">{event.uniqueUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg/User:</span>
                        <span className="font-semibold">{event.averageViewsPerUser.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Same-Night Checkout Analysis */}
            {analyticsData.enhancedAnalytics.summary.sameNightCheckouts.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🛒</span>
                  Same-Night Checkout Attempts
                </h3>
                <div className="space-y-3">
                  {analyticsData.enhancedAnalytics.summary.sameNightCheckouts.map((checkout) => (
                    <div key={checkout.userId} className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-800">{checkout.userId}</h4>
                          <p className="text-sm text-gray-600">
                            Attempted checkout on {checkout.sameNightDates.length} different nights
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-bold text-yellow-600">
                            {checkout.totalSameNightAttempts}
                          </span>
                          <p className="text-xs text-gray-500">total attempts</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Users Tab */}
        {activeTab === 'users' && analyticsData && (
          <div className="space-y-8">
            {/* User Type Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">👨‍🎓</span>
                  Student Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Students:</span>
                    <span className="font-semibold text-blue-600">{analyticsData.studentLogins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Limit:</span>
                    <span className="font-semibold text-blue-600">2 tickets</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Login Method:</span>
                    <span className="font-semibold text-blue-600">Student ID</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">👨‍💼</span>
                  Volunteer Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Volunteers:</span>
                    <span className="font-semibold text-green-600">{analyticsData.volunteerLogins}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Limit:</span>
                    <span className="font-semibold text-green-600">4 tickets</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Login Method:</span>
                    <span className="font-semibold text-green-600">Code + Email</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Enhanced User Analytics</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selections</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intents</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchases</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Successes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analyticsData.topUsers.map((user, index) => (
                      <tr key={index} className={user.user_type === 'volunteer' ? 'bg-green-50' : 'bg-blue-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name || 'Unknown'}</div>
                            <div className="text-sm text-gray-500">{user.identifier}</div>
                            <div className="text-xs text-gray-400">{user.user_id}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.user_type === 'student' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.user_type === 'student' ? 'Student' : 'Volunteer'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.total_selections}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{user.total_purchase_intents}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{user.total_purchases}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">{user.total_sprouter_successes}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatCurrency(user.total_spent)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(user.last_activity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Limit Violations */}
            {analyticsData.limitViolations.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Daily Purchase Limit Violations</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tickets Purchased</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analyticsData.limitViolations.map((violation, index) => (
                        <tr key={index} className="bg-red-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{violation.user_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              violation.user_type === 'student' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {violation.user_type === 'student' ? 'Student' : 'Volunteer'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{violation.purchase_date}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{violation.total_tickets_purchased}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Limit Exceeded
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Shows Tab */}
        {activeTab === 'shows' && analyticsData && (
          <div className="space-y-8">
            {/* Volunteer vs Student Show Preferences */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Volunteer vs Student Show Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-blue-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
                    <span className="mr-2">👨‍🎓</span>
                    Student Show Selections
                  </h4>
                  <div className="space-y-3">
                    <div className="text-sm text-blue-700">
                      Students typically select shows based on:
                    </div>
                    <ul className="text-sm text-blue-600 space-y-1 ml-4">
                      <li>• Family schedule compatibility</li>
                      <li>• Transportation availability</li>
                      <li>• Sibling coordination</li>
                      <li>• Academic commitments</li>
                    </ul>
                    <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                      <div className="text-sm font-semibold text-blue-800">Student Purchase Limit: 2 tickets/day</div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                    <span className="mr-2">👨‍💼</span>
                    Volunteer Show Selections
                  </h4>
                  <div className="space-y-3">
                    <div className="text-sm text-green-700">
                      Volunteers typically select shows based on:
                    </div>
                    <ul className="text-sm text-green-600 space-y-1 ml-4">
                      <li>• Work schedule flexibility</li>
                      <li>• Multiple family members</li>
                      <li>• Extended family coordination</li>
                      <li>• Community involvement</li>
                    </ul>
                    <div className="mt-4 p-3 bg-green-100 rounded-lg">
                      <div className="text-sm font-semibold text-green-800">Volunteer Purchase Limit: 4 tickets/day</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Show Performance Analysis</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Object.entries(analyticsData.showBreakdown).map(([eventKey, data]) => (
                  <div key={eventKey} className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">
                      {eventKey === 'tue-530' && 'Tuesday 5:30 PM'}
                      {eventKey === 'tue-630' && 'Tuesday 6:30 PM'}
                      {eventKey === 'thu-530' && 'Thursday 5:30 PM'}
                      {eventKey === 'thu-630' && 'Thursday 6:30 PM'}
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Sprouter Embed Views</span>
                        <span className="text-2xl font-bold text-blue-600">{data.selections}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Completed Purchases</span>
                        <span className="text-2xl font-bold text-green-600">{data.purchases}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Revenue</span>
                        <span className="text-2xl font-bold text-yellow-600">{formatCurrency(data.revenue)}</span>
                      </div>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-500 mb-1">
                          <span>Conversion Rate</span>
                          <span>{data.conversion_rate}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${data.conversion_rate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && analyticsData && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Revenue Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-green-800 mb-2">Total Revenue</h4>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(analyticsData.totalRevenue)}</p>
                  <p className="text-sm text-green-600 mt-1">From {analyticsData.totalPurchases} purchases</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-blue-800 mb-2">Average Order Value</h4>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatCurrency(analyticsData.totalRevenue / analyticsData.totalPurchases)}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">Per purchase</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-purple-800 mb-2">Conversion Rate</h4>
                  <p className="text-3xl font-bold text-purple-600">
                    {Math.round((analyticsData.totalPurchases / analyticsData.totalShowSelections) * 100)}%
                  </p>
                  <p className="text-sm text-purple-600 mt-1">Selections to purchases</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
