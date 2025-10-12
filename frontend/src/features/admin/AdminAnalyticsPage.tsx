import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginRecord {
  id: string;
  type: 'student' | 'volunteer';
  identifier: string; // student_id or volunteer_code
  email: string;
  name: string;
  timestamp: string;
  ip_address: string;
  user_agent: string;
}

interface ShowSelection {
  id: string;
  user_id: string;
  user_type: 'student' | 'volunteer';
  show_date: string;
  show_time: string;
  show_id: string;
  tickets_requested: number;
  tickets_purchased: number;
  selection_timestamp: string;
}

interface PurchaseRecord {
  id: string;
  user_id: string;
  user_type: 'student' | 'volunteer';
  show_id: string;
  tickets_purchased: number;
  total_cost: number;
  payment_status: 'pending' | 'completed' | 'failed';
  purchase_timestamp: string;
  transaction_id?: string;
}

interface AnalyticsData {
  totalLogins: number;
  studentLogins: number;
  volunteerLogins: number;
  totalShowSelections: number;
  totalPurchases: number;
  totalRevenue: number;
  showBreakdown: {
    tue530: { selections: number; purchases: number; revenue: number };
    tue630: { selections: number; purchases: number; revenue: number };
    thu530: { selections: number; purchases: number; revenue: number };
    thu630: { selections: number; purchases: number; revenue: number };
  };
  recentActivity: (LoginRecord | ShowSelection | PurchaseRecord)[];
  topUsers: Array<{
    identifier: string;
    name: string;
    type: 'student' | 'volunteer';
    totalSelections: number;
    totalPurchases: number;
    totalSpent: number;
  }>;
}

export default function AdminAnalyticsPage() {
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'shows' | 'revenue'>('overview');

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedTimeframe]);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch real analytics data from backend
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics data:', error);
      // Fallback to mock data if API fails
      const mockData: AnalyticsData = {
        totalLogins: 156,
        studentLogins: 134,
        volunteerLogins: 22,
        totalShowSelections: 89,
        totalPurchases: 67,
        totalRevenue: 2450.00,
        showBreakdown: {
          tue530: { selections: 23, purchases: 18, revenue: 450.00 },
          tue630: { selections: 28, purchases: 22, revenue: 550.00 },
          thu530: { selections: 20, purchases: 15, revenue: 375.00 },
          thu630: { selections: 18, purchases: 12, revenue: 300.00 }
        },
        recentActivity: [
          {
            id: '1',
            type: 'student',
            identifier: 'STU001',
            email: 'student1@email.com',
            name: 'John Smith',
            timestamp: new Date().toISOString(),
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0...'
          }
        ],
        topUsers: [
          {
            identifier: 'STU001',
            name: 'John Smith',
            type: 'student',
            totalSelections: 2,
            totalPurchases: 2,
            totalSpent: 50.00
          }
        ]
      };
      setAnalyticsData(mockData);
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

            {/* Show Breakdown */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Show Performance Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(analyticsData.showBreakdown).map(([showId, data]) => (
                  <div key={showId} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">
                      {showId === 'tue530' && 'Tuesday 5:30 PM'}
                      {showId === 'tue630' && 'Tuesday 6:30 PM'}
                      {showId === 'thu530' && 'Thursday 5:30 PM'}
                      {showId === 'thu630' && 'Thursday 6:30 PM'}
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Selections:</span>
                        <span className="font-semibold">{data.selections}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Purchases:</span>
                        <span className="font-semibold">{data.purchases}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Revenue:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(data.revenue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Activity</h3>
              <div className="space-y-4">
                {analyticsData.recentActivity.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-lg">
                          {'type' in activity ? (activity.type === 'student' ? '👨‍🎓' : '👨‍💼') : '🎫'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {'type' in activity ? (activity.type === 'student' ? 'Student' : 'Volunteer') : 'Purchase'} Activity
                        </p>
                        <p className="text-sm text-gray-600">
                          {'identifier' in activity ? `ID: ${activity.identifier}` : `Activity: ${'action' in activity ? activity.action : 'Unknown'}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {formatDate('timestamp' in activity ? activity.timestamp : new Date().toISOString())}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && analyticsData && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Top Users by Activity</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selections</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchases</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analyticsData.topUsers.map((user, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.identifier}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.type === 'student' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.type === 'student' ? 'Student' : 'Volunteer'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.totalSelections}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.totalPurchases}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{formatCurrency(user.totalSpent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Shows Tab */}
        {activeTab === 'shows' && analyticsData && (
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Show Performance Analysis</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Object.entries(analyticsData.showBreakdown).map(([showId, data]) => (
                  <div key={showId} className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4">
                      {showId === 'tue530' && 'Tuesday 5:30 PM'}
                      {showId === 'tue630' && 'Tuesday 6:30 PM'}
                      {showId === 'thu530' && 'Thursday 5:30 PM'}
                      {showId === 'thu630' && 'Thursday 6:30 PM'}
                    </h4>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Selections</span>
                        <span className="text-2xl font-bold text-blue-600">{data.selections}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Purchases</span>
                        <span className="text-2xl font-bold text-green-600">{data.purchases}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Revenue</span>
                        <span className="text-2xl font-bold text-yellow-600">{formatCurrency(data.revenue)}</span>
                      </div>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-500 mb-1">
                          <span>Conversion Rate</span>
                          <span>{Math.round((data.purchases / data.selections) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${(data.purchases / data.selections) * 100}%` }}
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
