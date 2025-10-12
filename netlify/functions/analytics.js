// Analytics API for Netlify Functions
const secureStorage = require('./secureStorage');

exports.handler = async (event, context) => {
  try {
    const { httpMethod, path, headers, body } = event;
    
    // Extract the route
    let route = path;
    if (path.startsWith('/.netlify/functions/analytics')) {
      route = path.replace('/.netlify/functions/analytics', '');
    } else if (path.startsWith('/api/analytics')) {
      route = path.replace('/api/analytics', '');
    }
    route = route || '/';
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Content-Type': 'application/json'
    };
    
    // Handle preflight requests
    if (httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }
    
    // Get analytics data
    if (route === '/' && httpMethod === 'GET') {
      const { timeframe = 'all' } = event.queryStringParameters || {};
      
      try {
        // Load analytics data from secure storage
        const analyticsData = await secureStorage.loadData();
        
        // Calculate time-based filtering
        const now = new Date();
        let timeFilter = null;
        
        switch (timeframe) {
          case '24h':
            timeFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            timeFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            timeFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            timeFilter = null;
        }
        
        // Get login data from secureStorage format
        let filteredLogins = analyticsData.userLogins || [];
        if (timeFilter) {
          filteredLogins = filteredLogins.filter(login => {
            const loginTime = new Date(login.login_timestamp);
            return loginTime >= timeFilter;
          });
        }
        
        console.log(`📊 Analytics: Found ${filteredLogins.length} logins for timeframe ${timeframe}`);
        
        // Calculate metrics
        const totalLogins = filteredLogins.length;
        const studentLogins = filteredLogins.filter(login => login.user_type === 'student').length;
        const volunteerLogins = filteredLogins.filter(login => login.user_type === 'volunteer').length;
        
        // Get active users (last 24 hours)
        const activeUsersFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const activeUsers = filteredLogins.filter(login => 
          new Date(login.login_timestamp) >= activeUsersFilter
        );
        
        // Get recent activity
        const recentActivity = filteredLogins
          .sort((a, b) => new Date(b.login_timestamp) - new Date(a.login_timestamp))
          .slice(0, 20)
          .map(login => ({
            activity_type: 'login',
            activity_details: `${login.user_type} login: ${login.identifier}`,
            activity_timestamp: login.login_timestamp,
            user_id: login.user_id,
            user_type: login.user_type
          }));
        
        // Get active users list
        const activeUsersList = activeUsers
          .sort((a, b) => new Date(b.login_timestamp) - new Date(a.login_timestamp))
          .map(user => ({
            user_id: user.user_id,
            user_type: user.user_type,
            identifier: user.identifier,
            login_timestamp: user.login_timestamp,
            time_ago: Math.floor((now - new Date(user.login_timestamp)) / (1000 * 60)) // minutes ago
          }));
        
        // Get show selections and purchases data
        const showSelections = analyticsData.showSelections || [];
        const purchases = analyticsData.purchases || [];
        
        // Filter show selections by timeframe
        let filteredSelections = showSelections;
        if (timeFilter) {
          filteredSelections = showSelections.filter(selection => {
            const selectionTime = new Date(selection.timestamp || selection.selection_timestamp);
            return selectionTime >= timeFilter;
          });
        }
        
        // Filter purchases by timeframe
        let filteredPurchases = purchases;
        if (timeFilter) {
          filteredPurchases = purchases.filter(purchase => {
            const purchaseTime = new Date(purchase.timestamp || purchase.purchase_timestamp);
            return purchaseTime >= timeFilter;
          });
        }
        
        // Calculate show breakdown from actual data
        const showBreakdown = {
          'tue-530': { 
            selections: filteredSelections.filter(s => s.event_key?.includes('tue-530')).length,
            purchases: filteredPurchases.filter(p => p.event_key?.includes('tue-530')).length,
            revenue: filteredPurchases.filter(p => p.event_key?.includes('tue-530')).reduce((sum, p) => sum + (p.metadata?.total_cost || 0), 0),
            conversion_rate: 0
          },
          'tue-630': { 
            selections: filteredSelections.filter(s => s.event_key?.includes('tue-630')).length,
            purchases: filteredPurchases.filter(p => p.event_key?.includes('tue-630')).length,
            revenue: filteredPurchases.filter(p => p.event_key?.includes('tue-630')).reduce((sum, p) => sum + (p.metadata?.total_cost || 0), 0),
            conversion_rate: 0
          },
          'thu-530': { 
            selections: filteredSelections.filter(s => s.event_key?.includes('thu-530')).length,
            purchases: filteredPurchases.filter(p => p.event_key?.includes('thu-530')).length,
            revenue: filteredPurchases.filter(p => p.event_key?.includes('thu-530')).reduce((sum, p) => sum + (p.metadata?.total_cost || 0), 0),
            conversion_rate: 0
          },
          'thu-630': { 
            selections: filteredSelections.filter(s => s.event_key?.includes('thu-630')).length,
            purchases: filteredPurchases.filter(p => p.event_key?.includes('thu-630')).length,
            revenue: filteredPurchases.filter(p => p.event_key?.includes('thu-630')).reduce((sum, p) => sum + (p.metadata?.total_cost || 0), 0),
            conversion_rate: 0
          }
        };
        
        // Calculate conversion rates
        Object.keys(showBreakdown).forEach(showId => {
          const show = showBreakdown[showId];
          if (show.selections > 0) {
            show.conversion_rate = Math.round((show.purchases / show.selections) * 100);
          }
        });
        
        // Get top users
        const userStats = {};
        filteredLogins.forEach(login => {
          if (!userStats[login.user_id]) {
            userStats[login.user_id] = {
              user_id: login.user_id,
              user_type: login.user_type,
              identifier: login.identifier,
              name: login.name || '',
              total_selections: 0,
              total_purchase_intents: 0,
              total_purchases: 0,
              total_sprouter_successes: 0,
              total_spent: 0,
              last_activity: login.login_timestamp
            };
          }
        });
        
        const topUsers = Object.values(userStats)
          .sort((a, b) => new Date(b.last_activity) - new Date(a.last_activity))
          .slice(0, 20);
        
        // Calculate totals from actual data
        const totalShowSelections = filteredSelections.length;
        const totalPurchases = filteredPurchases.length;
        const totalRevenue = filteredPurchases.reduce((sum, purchase) => sum + (purchase.metadata?.total_cost || 0), 0);
        
        const response = {
          totalLogins,
          studentLogins,
          volunteerLogins,
          totalShowSelections,
          totalPurchases,
          totalRevenue,
          activeUsers: activeUsers.length,
          activeStudentUsers: activeUsers.filter(u => u.user_type === 'student').length,
          activeVolunteerUsers: activeUsers.filter(u => u.user_type === 'volunteer').length,
          activeUsersList,
          showBreakdown,
          recentActivity,
          topUsers,
          limitViolations: [],
          timeframe
        };
        
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify(response)
        };
        
      } catch (error) {
        console.error('Analytics error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ 
            error: 'Failed to load analytics data',
            details: error.message 
          })
        };
      }
    }
    
    // Default response
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Analytics endpoint not found' })
    };
    
  } catch (error) {
    console.error('Analytics handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      })
    };
  }
};
